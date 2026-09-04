from __future__ import annotations
import pytest
import numpy as np
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

def test_naive_model():
    y = np.array([5.0, 10.0, 15.0, 20.0])
    model = NaiveModel().fit(y)
    preds, lower, upper = model.predict(horizon=5)
    assert len(preds) == 5
    assert np.all(preds == 20.0)
    assert np.all(lower <= preds)
    assert np.all(upper >= preds)
    assert np.all(lower >= 0.0)

def test_seasonal_naive_model():
    # 2 weeks of repeating weekly cycle: [1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5, 6, 7]
    cycle = np.array([10.0, 20.0, 15.0, 25.0, 30.0, 50.0, 45.0])
    y = np.tile(cycle, 2)
    model = SeasonalNaiveModel(m=7).fit(y)
    preds, lower, upper = model.predict(horizon=7)
    assert len(preds) == 7
    assert np.array_equal(preds, cycle)
    assert np.all(lower <= preds)
    assert np.all(upper >= preds)

def test_sma_model():
    y = np.array([10.0, 20.0, 30.0, 40.0])
    model = SimpleMovingAverageModel(window=2).fit(y)
    preds, lower, upper = model.predict(horizon=3)
    # Average of last 2: (30 + 40)/2 = 35.0
    assert np.all(preds == 35.0)

def test_exp_smoothing_ses():
    y = np.array([10.0, 10.0, 10.0, 10.0, 10.0])
    model = SimpleExpSmoothingModel(alpha=0.3).fit(y)
    preds, lower, upper = model.predict(horizon=4)
    assert pytest.approx(preds[0], 0.01) == 10.0

def test_holt_linear_trend():
    # Upward linear trend
    y = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
    model = HoltLinearTrendModel().fit(y)
    preds, lower, upper = model.predict(horizon=3)
    assert preds[0] > 50.0
    assert preds[1] > preds[0]
    assert preds[2] > preds[1]

def test_holt_winters_weekly():
    # 3 weeks with clear Sunday spike
    base_cycle = np.array([5.0, 5.0, 6.0, 5.0, 8.0, 12.0, 25.0])
    y = np.tile(base_cycle, 3)
    model = HoltWintersModel(m=7).fit(y)
    preds, lower, upper = model.predict(horizon=7)
    assert len(preds) == 7
    # Day 7 (Sunday) must be the highest prediction in the cycle
    assert np.argmax(preds) == 6
    assert preds[6] > preds[0]

def test_croston_models():
    # Intermittent demand: 10 units every 3 days
    y = np.array([10.0, 0.0, 0.0, 10.0, 0.0, 0.0, 10.0, 0.0, 0.0])
    croston = CrostonClassicalModel(alpha=0.1).fit(y)
    sba = CrostonSBAModel(alpha=0.1).fit(y)
    
    preds_c, _, _ = croston.predict(horizon=3)
    preds_sba, _, _ = sba.predict(horizon=3)
    
    assert preds_c[0] > 0.0
    # SBA debiased prediction should be slightly lower than classical Croston
    assert preds_sba[0] < preds_c[0]
