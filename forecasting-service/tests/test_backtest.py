from __future__ import annotations
import pytest
import pandas as pd
import numpy as np
from app.core.preprocess import preprocess_series
from app.core.backtest import run_rolling_origin_cv
from app.schemas import HistoryPoint

def test_backtest_zero_leakage_and_folds():
    # 60 days of mock history
    dates = pd.date_range("2026-01-01", periods=60, freq="D")
    history = [HistoryPoint(date=d.strftime("%Y-%m-%d"), qty=float(10 + (i % 7))) for i, d in enumerate(dates)]
    
    df, stats, warnings = preprocess_series(history)
    agg_wape, fold_details, candidates = run_rolling_origin_cv(df, stats, horizon_days=14, n_splits=3)
    
    # 3 folds
    assert len(fold_details) > 0
    # Every fold must satisfy train_end < test_start chronologically
    for fold in fold_details:
        assert pd.to_datetime(fold["train_end"]) < pd.to_datetime(fold["test_start"])
        assert fold["wape"] >= 0.0

    # Aggregated WAPE exists for candidate models
    assert "Seasonal Naive (Weekly)" in agg_wape
    assert "Naive (Last Value)" in agg_wape
    assert agg_wape["Seasonal Naive (Weekly)"] < agg_wape["Naive (Last Value)"]
