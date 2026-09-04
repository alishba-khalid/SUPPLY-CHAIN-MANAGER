from __future__ import annotations
import pytest
from app.core.selection import select_winning_model
from app.models import SimpleMovingAverageModel, CrostonSBAModel, HoltWintersModel

def test_intermittent_routing():
    agg_wape = {
        "Naive (Last Value)": 0.45,
        "SMA (7d)": 0.40,
        "Croston (SBA Debiased)": 0.38,
        "Croston (Classical)": 0.39,
    }
    stats = {
        "is_intermittent": True,
        "zero_share": 0.60,
        "adi": 2.5,
        "n_obs": 60,
    }
    candidates = [CrostonSBAModel(), SimpleMovingAverageModel(7)]
    _, winner_name, reason = select_winning_model(agg_wape, stats, candidates)
    
    assert winner_name == "Croston (SBA Debiased)"
    assert "intermittent demand profile" in reason

def test_parsimony_tie_break():
    # If SMA and Holt Linear are within 1.5% WAPE, SMA (simpler) should win
    agg_wape = {
        "SMA (14d)": 0.205,
        "Holt Linear Trend": 0.200,
    }
    stats = {
        "is_intermittent": False,
        "zero_share": 0.0,
        "adi": 1.0,
        "n_obs": 40,
    }
    candidates = [SimpleMovingAverageModel(14), HoltWintersModel(7)]
    _, winner_name, _ = select_winning_model(agg_wape, stats, candidates)
    assert winner_name == "SMA (14d)"
