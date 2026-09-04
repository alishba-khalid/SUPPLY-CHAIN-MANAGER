from __future__ import annotations
import pytest
import numpy as np
from app.core.metrics import (
    calculate_wape,
    calculate_mape,
    calculate_bias,
    calculate_bias_pct,
    calculate_rmse,
    calculate_mase,
    calculate_all_metrics,
)

def test_wape_standard_and_zero_division():
    actuals = np.array([10.0, 20.0, 30.0])
    predictions = np.array([12.0, 18.0, 33.0])
    # Total error: |10-12| + |20-18| + |30-33| = 2 + 2 + 3 = 7. Total actual: 60. WAPE = 7/60 ≈ 0.1167
    wape = calculate_wape(actuals, predictions)
    assert pytest.approx(wape, 0.001) == 7.0 / 60.0

    # All zeros
    assert calculate_wape(np.array([0, 0]), np.array([0, 0])) == 0.0
    assert calculate_wape(np.array([0, 0]), np.array([5, 5])) == 1.0

def test_mape_zero_handling():
    actuals = np.array([0.0, 10.0, 20.0])
    predictions = np.array([5.0, 12.0, 18.0])
    # Zeros should be skipped without throwing ZeroDivisionError
    mape = calculate_mape(actuals, predictions)
    # Evaluated on 10 and 20: (|10-12|/10 + |20-18|/20)/2 = (0.2 + 0.1)/2 = 0.15
    assert pytest.approx(mape, 0.001) == 0.15

    # All zeros returns None
    assert calculate_mape(np.array([0.0, 0.0]), np.array([5.0, 5.0])) is None

def test_signed_bias():
    actuals = np.array([10.0, 20.0, 30.0])
    predictions = np.array([15.0, 25.0, 35.0])
    # Overforecasting by +5 on average
    assert calculate_bias(actuals, predictions) == 5.0
    # Bias pct: (15 / 60) * 100 = 25%
    assert calculate_bias_pct(actuals, predictions) == 25.0

    # Underforecasting
    predictions_under = np.array([5.0, 15.0, 25.0])
    assert calculate_bias(actuals, predictions_under) == -5.0
    assert calculate_bias_pct(actuals, predictions_under) == -25.0

def test_rmse():
    actuals = np.array([10.0, 20.0])
    predictions = np.array([13.0, 16.0])
    # Errors: 3 and -4. Squared: 9 + 16 = 25. Mean: 12.5. Sqrt: 3.5355
    rmse = calculate_rmse(actuals, predictions)
    assert pytest.approx(rmse, 0.001) == np.sqrt(12.5)

def test_mase():
    history = np.array([10.0, 12.0, 14.0, 16.0, 18.0])  # in-sample diffs: [2, 2, 2, 2] -> mean = 2.0
    actuals = np.array([20.0, 22.0])
    # Perfect forecast
    perfect_preds = np.array([20.0, 22.0])
    assert calculate_mase(actuals, perfect_preds, history) == 0.0

    # Errors of 1.0 each -> MASE = 1.0 / 2.0 = 0.5 (model is 2x better than naive)
    good_preds = np.array([21.0, 23.0])
    assert calculate_mase(actuals, good_preds, history) == 0.5
