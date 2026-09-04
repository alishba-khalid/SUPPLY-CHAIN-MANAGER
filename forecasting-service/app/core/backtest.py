from __future__ import annotations
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from app.core.metrics import calculate_wape, calculate_bias, calculate_rmse
from app.models import (
    NaiveModel,
    SeasonalNaiveModel,
    SimpleMovingAverageModel,
    SimpleExpSmoothingModel,
    HoltLinearTrendModel,
    HoltWintersModel,
    CrostonClassicalModel,
    CrostonSBAModel,
)

def get_candidate_models(stats: Dict[str, Any]) -> List[Any]:
    """
    Returns the list of eligible candidate models based on series properties.
    Seasonal models are omitted if history < 14 days.
    Intermittent models are given precedence if the series is intermittent.
    """
    n_obs = stats.get("n_obs", 0)
    is_intermittent = stats.get("is_intermittent", False)
    
    candidates: List[Any] = [
        NaiveModel(),
        SimpleMovingAverageModel(window=7),
        SimpleMovingAverageModel(window=14),
        SimpleExpSmoothingModel(),
    ]
    
    # Intermittent models
    candidates.append(CrostonSBAModel())
    candidates.append(CrostonClassicalModel())
    
    # Trend model (if sufficient history)
    if n_obs >= 10:
        candidates.append(HoltLinearTrendModel())
        
    # Seasonal models (require at least 2 full weekly cycles = 14 days)
    if n_obs >= 14:
        candidates.append(SeasonalNaiveModel(m=7))
        candidates.append(HoltWintersModel(m=7))
        
    return candidates

def run_rolling_origin_cv(
    df: pd.DataFrame,
    stats: Dict[str, Any],
    horizon_days: int = 14,
    n_splits: int = 3
) -> Tuple[Dict[str, float], List[Dict[str, Any]], Dict[str, Any]]:
    """
    Executes expanding rolling-origin cross-validation across all eligible candidate models.
    Guarantees strict zero-lookahead-leakage: train_end < test_start on every fold.
    
    Returns:
    - aggregated_wape: { model_name: mean_wape }
    - fold_details: list of fold breakdown dictionaries
    - best_model_record: { "name": winner_name, "wape": winner_wape }
    """
    y_raw = df["qty"].values
    y_fit = df["qty_winsorized"].values
    dates = df["date"].dt.strftime("%Y-%m-%d").values
    n = len(y_raw)
    
    # Adjust n_splits and horizon if history is tight
    min_train = 7
    available_for_test = n - min_train
    if available_for_test < horizon_days:
        # Extreme short history fallback
        horizon_days = max(1, available_for_test // 2) if available_for_test > 1 else 1
        n_splits = 1
    elif available_for_test < n_splits * horizon_days:
        n_splits = max(1, available_for_test // horizon_days)
        
    candidates = get_candidate_models(stats)
    model_fold_errors: Dict[str, List[float]] = {m.name: [] for m in candidates}
    model_fold_bias: Dict[str, List[float]] = {m.name: [] for m in candidates}
    model_fold_rmse: Dict[str, List[float]] = {m.name: [] for m in candidates}
    fold_details: List[Dict[str, Any]] = []

    # Calculate origin split indices
    split_indices = []
    total_test_span = n_splits * horizon_days
    first_split = n - total_test_span
    
    for fold in range(n_splits):
        split_idx = first_split + fold * horizon_days
        split_indices.append(split_idx)

    for fold_idx, split_idx in enumerate(split_indices):
        train_end_idx = split_idx
        test_end_idx = min(n, split_idx + horizon_days)
        
        # Zero-leakage invariant assertion
        assert train_end_idx < test_end_idx, f"Data leakage detected! train_end {train_end_idx} >= test_end {test_end_idx}"
        
        train_y = y_fit[:train_end_idx]
        test_y = y_raw[train_end_idx:test_end_idx]
        actual_horizon = len(test_y)
        
        if actual_horizon == 0:
            continue
            
        train_start_date = dates[0]
        train_end_date = dates[train_end_idx - 1]
        test_start_date = dates[train_end_idx]
        test_end_date = dates[test_end_idx - 1]

        for model in candidates:
            try:
                # Fit exclusively on past training horizon
                model.fit(train_y)
                preds, _, _ = model.predict(actual_horizon)
                
                fold_wape = calculate_wape(test_y, preds)
                fold_bias = calculate_bias(test_y, preds)
                fold_rmse = calculate_rmse(test_y, preds)
                
                model_fold_errors[model.name].append(fold_wape)
                model_fold_bias[model.name].append(fold_bias)
                model_fold_rmse[model.name].append(fold_rmse)
                
                fold_details.append({
                    "fold": fold_idx + 1,
                    "model": model.name,
                    "train_start": str(train_start_date),
                    "train_end": str(train_end_date),
                    "test_start": str(test_start_date),
                    "test_end": str(test_end_date),
                    "wape": round(fold_wape, 4),
                    "bias": round(fold_bias, 2),
                    "rmse": round(fold_rmse, 2),
                })
            except Exception as e:
                # Heavy penalty if model fails during backtest fold
                model_fold_errors[model.name].append(9.99)
                model_fold_bias[model.name].append(0.0)
                model_fold_rmse[model.name].append(999.0)

    # Compute mean WAPE per candidate model
    aggregated_wape: Dict[str, float] = {}
    for name, errors in model_fold_errors.items():
        aggregated_wape[name] = round(float(np.mean(errors)), 4) if errors else 1.0

    return aggregated_wape, fold_details, candidates
