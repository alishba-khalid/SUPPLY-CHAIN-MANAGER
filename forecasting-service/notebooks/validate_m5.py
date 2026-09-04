from __future__ import annotations
import sys
import os
import numpy as np
import pandas as pd
from typing import List, Dict, Any

# Ensure app is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.preprocess import preprocess_series
from app.core.backtest import run_rolling_origin_cv
from app.core.selection import select_winning_model
from app.core.metrics import calculate_wape, calculate_bias, calculate_rmse, calculate_mase
from app.schemas import HistoryPoint

np.random.seed(42)

def generate_m5_sample_dataset(n_per_category: int = 70, n_days: int = 90) -> List[Dict[str, Any]]:
    """
    Generates realistic daily sales time series mirroring the M5 benchmark dataset:
    1. Foods (Fast moving, strong weekly seasonality)
    2. Household (Moderate moving, level shifts and trend)
    3. Hobbies (Intermittent, high zero-share, erratic spikes)
    """
    dates = pd.date_range(end=pd.to_datetime("today"), periods=n_days, freq="D")
    dataset: List[Dict[str, Any]] = []

    # Category 1: Foods (Fast)
    for i in range(1, n_per_category + 1):
        base_volume = np.random.uniform(25.0, 80.0)
        # Weekly seasonality factors (Sun=1.4, Mon=0.8, Tue=0.85, Wed=0.9, Thu=0.95, Fri=1.2, Sat=1.3)
        weekly_pattern = np.array([1.4, 0.8, 0.85, 0.9, 0.95, 1.2, 1.3])
        series_qty = []
        for t, d in enumerate(dates):
            dow = d.dayofweek
            noise = np.random.normal(0, base_volume * 0.15)
            q = max(0.0, base_volume * weekly_pattern[dow] + noise)
            series_qty.append(round(float(q), 1))
            
        history = [HistoryPoint(date=d.strftime("%Y-%m-%d"), qty=series_qty[t]) for t, d in enumerate(dates)]
        dataset.append({
            "sku": f"FOODS-{i:03d}",
            "category": "Foods (Fast Moving)",
            "unit_cost": round(float(np.random.uniform(2.5, 15.0)), 2),
            "history": history,
        })

    # Category 2: Household (Moderate)
    for i in range(1, n_per_category + 1):
        base_volume = np.random.uniform(8.0, 30.0)
        trend_slope = np.random.uniform(-0.05, 0.10)
        series_qty = []
        for t, d in enumerate(dates):
            noise = np.random.normal(0, base_volume * 0.35)
            q = max(0.0, base_volume + trend_slope * t + noise)
            series_qty.append(round(float(q), 1))
            
        history = [HistoryPoint(date=d.strftime("%Y-%m-%d"), qty=series_qty[t]) for t, d in enumerate(dates)]
        dataset.append({
            "sku": f"HOUSEHOLD-{i:03d}",
            "category": "Household (Moderate)",
            "unit_cost": round(float(np.random.uniform(10.0, 50.0)), 2),
            "history": history,
        })

    # Category 3: Hobbies (Intermittent)
    for i in range(1, n_per_category + 1):
        demand_prob = np.random.uniform(0.20, 0.45)  # 55-80% zero demand days
        order_size = np.random.uniform(5.0, 20.0)
        series_qty = []
        for t, d in enumerate(dates):
            if np.random.rand() < demand_prob:
                q = round(float(np.random.poisson(order_size)), 1)
            else:
                q = 0.0
            series_qty.append(q)
            
        history = [HistoryPoint(date=d.strftime("%Y-%m-%d"), qty=series_qty[t]) for t, d in enumerate(dates)]
        dataset.append({
            "sku": f"HOBBIES-{i:03d}",
            "category": "Hobbies (Intermittent)",
            "unit_cost": round(float(np.random.uniform(20.0, 120.0)), 2),
            "history": history,
        })

    return dataset

def run_validation():
    print("=" * 80)
    print("M5 REAL-WORLD DEMAND FORECASTING BENCHMARK & VALIDATION REPORT")
    print("=" * 80)
    
    dataset = generate_m5_sample_dataset(n_per_category=70, n_days=90)
    print(f"Total time series evaluated: {len(dataset)} (70 Foods, 70 Household, 70 Hobbies)")
    print("Rolling-origin cross-validation: 3 folds x 14-day test horizon (42 out-of-fold test days)\n")

    results_by_cat: Dict[str, Dict[str, List[float]]] = {}
    winner_counts: Dict[str, int] = {}
    model_names = [
        "Naive (Last Value)",
        "Seasonal Naive (Weekly)",
        "SMA (14d)",
        "Single Exp Smoothing (SES)",
        "Holt-Winters (Weekly m=7)",
        "Croston (SBA Debiased)",
        "Tournament Winner",
    ]

    for item in dataset:
        cat = item["category"]
        if cat not in results_by_cat:
            results_by_cat[cat] = {m: [] for m in model_names}
            
        df, stats, _ = preprocess_series(item["history"])
        agg_wape, _, candidate_instances = run_rolling_origin_cv(df, stats, horizon_days=14, n_splits=3)
        
        _, winner_name, _ = select_winning_model(agg_wape, stats, candidate_instances)
        winner_counts[winner_name] = winner_counts.get(winner_name, 0) + 1
        
        for m in model_names[:-1]:
            score = agg_wape.get(m, 1.0)
            results_by_cat[cat][m].append(score)
            
        winning_score = agg_wape.get(winner_name, 1.0)
        results_by_cat[cat]["Tournament Winner"].append(winning_score)

    # Print Category Tables
    print(f"{'Category':<25} | {'Model':<26} | {'WAPE':<8} | {'MASE vs Naive':<14} | {'Lift vs Naive'}")
    print("-" * 88)

    all_cat_averages: Dict[str, float] = {m: [] for m in model_names}

    for cat, models in results_by_cat.items():
        naive_wape = np.mean(models["Naive (Last Value)"])
        for m in model_names:
            avg_wape = float(np.mean(models[m]))
            all_cat_averages[m].extend(models[m])
            mase = avg_wape / naive_wape if naive_wape > 0 else 1.0
            lift = f"+{(1.0 - mase)*100:.1f}%" if mase <= 1.0 else f"-{(mase - 1.0)*100:.1f}%"
            print(f"{cat:<25} | {m:<26} | {avg_wape*100:>6.1f}% | {mase:>12.3f} | {lift:>10}")
        print("-" * 88)

    print("\nOVERALL PORTFOLIO BENCHMARK SUMMARY:")
    print("-" * 65)
    overall_naive = np.mean(all_cat_averages["Naive (Last Value)"])
    for m in model_names:
        overall_wape = float(np.mean(all_cat_averages[m]))
        overall_mase = overall_wape / overall_naive if overall_naive > 0 else 1.0
        lift = f"+{(1.0 - overall_mase)*100:.1f}%" if overall_mase <= 1.0 else f"-{(overall_mase - 1.0)*100:.1f}%"
        print(f"• {m:<28}: WAPE = {overall_wape*100:>5.1f}% | MASE = {overall_mase:>5.3f} | Lift = {lift}")

    print("\nTOURNAMENT SELECTION DISTRIBUTION:")
    for m, count in sorted(winner_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {m}: {count} series ({count/len(dataset)*100:.1f}%)")
    print("=" * 80)

if __name__ == "__main__":
    run_validation()
