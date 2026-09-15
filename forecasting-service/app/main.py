import os
import time
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np

from app.schemas import (
    ForecastRequest,
    ForecastResponse,
    SeriesForecastResult,
    ForecastPoint,
    AccuracyMetrics,
    PortfolioSummary,
    BacktestRequest,
    BacktestResponse,
    BacktestSeriesResult,
    BacktestFoldDetail,
)
from app.core.preprocess import preprocess_series
from app.core.backtest import run_rolling_origin_cv
from app.core.selection import select_winning_model
from app.core.segmentation import classify_portfolio_abc_xyz
from app.core.metrics import calculate_all_metrics

START_TIME = time.time()
FORECAST_SERVICE_SECRET = os.environ.get("FORECAST_SERVICE_SECRET")

# Vercel sets these automatically for a build triggered by a git push — they
# are absent for a deploy pushed from a local directory. That absence is
# itself a useful signal: GET /health returning null here means whatever is
# running did NOT come from the repo, which is exactly the drift this field
# exists to catch.
GIT_COMMIT_SHA = os.environ.get("VERCEL_GIT_COMMIT_SHA")
GIT_COMMIT_REF = os.environ.get("VERCEL_GIT_COMMIT_REF")

def verify_secret(x_forecast_secret: str | None = Header(None, alias="X-Forecast-Secret")):
    if FORECAST_SERVICE_SECRET and x_forecast_secret != FORECAST_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Forecast-Secret header")

app = FastAPI(
    title="Supply Chain Demand Forecasting Service",
    description="Statistical demand forecasting microservice with tournament model selection, 80% prediction intervals, and 3x3 ABC/XYZ matrix classification.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "forecasting-service",
        "version": "1.0.0",
        "commit_sha": GIT_COMMIT_SHA,
        "commit_ref": GIT_COMMIT_REF,
        "instance_started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(START_TIME)),
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "available_models": [
            "Naive (Last Value)",
            "Seasonal Naive (Weekly)",
            "SMA (7d)",
            "SMA (14d)",
            "Single Exp Smoothing (SES)",
            "Holt Linear Trend",
            "Holt-Winters (Weekly m=7)",
            "Croston (Classical)",
            "Croston (SBA Debiased)",
        ],
    }

@app.post("/forecast", response_model=ForecastResponse, dependencies=[Depends(verify_secret)])
def generate_forecast(payload: ForecastRequest) -> ForecastResponse:
    if not payload.series:
        raise HTTPException(status_code=400, detail="No series provided in request payload.")

    results: List[SeriesForecastResult] = []
    series_stats_map: Dict[str, Dict[str, Any]] = {}
    preprocessed_dfs: Dict[str, pd.DataFrame] = {}
    preprocessed_warnings: Dict[str, List[str]] = {}

    # Step 1: Preprocess all series
    for s in payload.series:
        key = f"{s.sku}::{s.warehouse}"
        df, stats, warnings = preprocess_series(s.history)
        series_stats_map[key] = stats
        preprocessed_dfs[key] = df
        preprocessed_warnings[key] = warnings

    # Step 2: Classify portfolio into ABC/XYZ matrix
    classification_map = classify_portfolio_abc_xyz(payload.series, series_stats_map)

    method_distribution: Dict[str, int] = {}
    abc_distribution: Dict[str, int] = {"A": 0, "B": 0, "C": 0}
    xyz_distribution: Dict[str, int] = {"X": 0, "Y": 0, "Z": 0}
    total_wape_weighted: float = 0.0
    total_bias_weighted: float = 0.0
    total_mase_weighted: float = 0.0
    total_series_count = len(payload.series)

    # Step 3: Run tournament selection & generate forecasts
    for s in payload.series:
        key = f"{s.sku}::{s.warehouse}"
        df = preprocessed_dfs[key]
        stats = series_stats_map[key]
        warnings = list(preprocessed_warnings[key])

        if len(df) == 0:
            # Empty fallback
            empty_metrics = AccuracyMetrics(wape=1.0, mape=None, bias=0.0, bias_pct=0.0, rmse=0.0, mase=1.0)
            abc, xyz, policy = classification_map.get(key, ("C", "Z", "No history available."))
            results.append(SeriesForecastResult(
                sku=s.sku,
                warehouse=s.warehouse,
                method_selected="SMA (14d)",
                method_reason="Insufficient data; returned flat zero projection.",
                forecast=[
                    ForecastPoint(date=(pd.to_datetime("today") + pd.Timedelta(days=i)).strftime("%Y-%m-%d"), qty=0.0, lower_80=0.0, upper_80=0.0)
                    for i in range(1, s.horizon_days + 1)
                ],
                accuracy=empty_metrics,
                abc_class=abc,
                xyz_class=xyz,
                policy_hint=policy,
                warnings=warnings + ["Empty history; zero forecast returned."],
            ))
            continue

        # Run rolling-origin tournament
        agg_wape, _, candidate_instances = run_rolling_origin_cv(
            df=df,
            stats=stats,
            horizon_days=min(14, s.horizon_days),
            n_splits=3,
        )

        # Select winning model
        winning_model, winner_name, method_reason = select_winning_model(
            aggregated_wape=agg_wape,
            stats=stats,
            candidate_instances=candidate_instances,
        )

        # Refit winning model on full history (winsorized series)
        y_fit = df["qty_winsorized"].values
        y_raw = df["qty"].values
        winning_model.fit(y_fit)

        # Generate point forecasts and 80% prediction intervals (z = 1.28 for 80% interval)
        point_preds, lower_bounds, upper_bounds = winning_model.predict(
            horizon=s.horizon_days,
            z=1.28,
        )

        # Project forward dates
        last_date = df["date"].max()
        forecast_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=s.horizon_days, freq="D")
        
        forecast_points = [
            ForecastPoint(
                date=d.strftime("%Y-%m-%d"),
                qty=round(float(point_preds[i]), 2),
                lower_80=round(float(max(0.0, lower_bounds[i])), 2),
                upper_80=round(float(upper_bounds[i]), 2),
            )
            for i, d in enumerate(forecast_dates)
        ]

        # Evaluate model accuracy metrics against raw history
        # For in-sample / tournament accuracy, evaluate one-step fitted residuals
        fitted_preds = []
        for t in range(len(y_raw)):
            if t == 0:
                fitted_preds.append(y_raw[0])
            else:
                import copy
                m_temp = copy.deepcopy(winning_model)
                m_temp.fit(y_fit[:t])
                p, _, _ = m_temp.predict(1)
                fitted_preds.append(p[0])
                
        fitted_arr = np.array(fitted_preds)
        metrics_dict = calculate_all_metrics(y_raw, fitted_arr, y_raw)
        
        # Override WAPE with tournament out-of-fold WAPE for defensible cross-validated accuracy
        oof_wape = agg_wape.get(winner_name, metrics_dict["wape"])
        metrics_dict["wape"] = oof_wape

        abc, xyz, policy = classification_map.get(key, ("B", "Y", "Standard replenishment review."))

        # Tally distributions
        method_distribution[winner_name] = method_distribution.get(winner_name, 0) + 1
        abc_distribution[abc] += 1
        xyz_distribution[xyz] += 1
        total_wape_weighted += oof_wape
        total_bias_weighted += metrics_dict["bias"]
        total_mase_weighted += metrics_dict["mase"]

        results.append(SeriesForecastResult(
            sku=s.sku,
            warehouse=s.warehouse,
            method_selected=winner_name,
            method_reason=method_reason,
            forecast=forecast_points,
            accuracy=AccuracyMetrics(**metrics_dict),
            abc_class=abc,
            xyz_class=xyz,
            policy_hint=policy,
            warnings=warnings,
        ))

    summary = PortfolioSummary(
        total_series=total_series_count,
        portfolio_wape=round(total_wape_weighted / max(1, total_series_count), 4),
        portfolio_bias=round(total_bias_weighted / max(1, total_series_count), 2),
        portfolio_mase=round(total_mase_weighted / max(1, total_series_count), 3),
        method_distribution=method_distribution,
        abc_distribution=abc_distribution,
        xyz_distribution=xyz_distribution,
    )

    return ForecastResponse(
        status="ok",
        version="1.0.0",
        summary=summary,
        results=results,
    )

@app.post("/backtest", response_model=BacktestResponse, dependencies=[Depends(verify_secret)])
def execute_backtest(payload: BacktestRequest) -> BacktestResponse:
    if not payload.series:
        raise HTTPException(status_code=400, detail="No series provided in request payload.")

    series_results: List[BacktestSeriesResult] = []

    for s in payload.series:
        df, stats, _ = preprocess_series(s.history)
        if len(df) == 0:
            continue

        agg_wape, fold_details, candidate_instances = run_rolling_origin_cv(
            df=df,
            stats=stats,
            horizon_days=payload.horizon_days,
            n_splits=payload.n_splits,
        )

        _, winner_name, _ = select_winning_model(
            aggregated_wape=agg_wape,
            stats=stats,
            candidate_instances=candidate_instances,
        )

        folds = [
            BacktestFoldDetail(**f) for f in fold_details
        ]

        series_results.append(BacktestSeriesResult(
            sku=s.sku,
            warehouse=s.warehouse,
            folds=folds,
            candidate_wape=agg_wape,
            winning_model=winner_name,
            winning_wape=agg_wape.get(winner_name, 1.0),
        ))

    return BacktestResponse(
        status="ok",
        results=series_results,
    )
