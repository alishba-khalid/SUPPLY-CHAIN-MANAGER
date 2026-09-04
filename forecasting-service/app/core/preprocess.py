from __future__ import annotations
import pandas as pd
import numpy as np
from typing import List, Tuple, Dict, Any
from app.schemas import HistoryPoint

def preprocess_series(history: List[HistoryPoint]) -> Tuple[pd.DataFrame, Dict[str, Any], List[str]]:
    """
    Standardizes a history time series:
    1. Parses dates and sorts chronologically.
    2. Enforces daily continuity (reindexing missing dates with 0.0).
    3. Computes demand characteristics (zero share, ADI, CV2).
    4. Computes winsorized values for robust model fitting.
    5. Returns warnings for short or pathological history.
    """
    warnings: List[str] = []
    if not history:
        return pd.DataFrame(columns=["date", "qty", "qty_winsorized"]), {
            "n_obs": 0, "zero_share": 1.0, "adi": 1.0, "cv2": 0.0, "is_intermittent": True
        }, ["Empty history provided."]

    # Convert to DataFrame
    df = pd.DataFrame([{"date": pd.to_datetime(p.date), "qty": max(0.0, float(p.qty))} for p in history])
    df = df.groupby("date", as_index=False)["qty"].sum().sort_values("date")
    
    # Enforce continuous daily index
    min_date = df["date"].min()
    max_date = df["date"].max()
    full_idx = pd.date_range(start=min_date, end=max_date, freq="D")
    
    if len(full_idx) > len(df):
        df = df.set_index("date").reindex(full_idx, fill_value=0.0).rename_axis("date").reset_index()
        warnings.append(f"Filled {len(full_idx) - len(history)} missing dates with zero demand.")

    n_obs = len(df)
    qty_arr = df["qty"].values
    
    # Check history sufficiency
    if n_obs < 7:
        warnings.append(f"Short history ({n_obs} days < 7 days minimum). Accuracy confidence is low.")
    if n_obs < 14:
        warnings.append(f"History under 14 days ({n_obs} days). Seasonal models (m=7) are disabled.")

    # Intermittency analysis
    zero_count = int(np.sum(qty_arr == 0.0))
    zero_share = float(zero_count / n_obs) if n_obs > 0 else 1.0
    
    # Average Demand Interval (ADI)
    non_zero_indices = np.where(qty_arr > 0.0)[0]
    if len(non_zero_indices) > 1:
        intervals = np.diff(non_zero_indices)
        adi = float(np.mean(intervals))
    elif len(non_zero_indices) == 1:
        adi = float(n_obs)
    else:
        adi = 1.0

    # Coefficient of Variation (CV^2) of non-zero demand
    if len(non_zero_indices) > 0:
        non_zero_demands = qty_arr[non_zero_indices]
        mean_nz = np.mean(non_zero_demands)
        std_nz = np.std(non_zero_demands)
        cv = float(std_nz / mean_nz) if mean_nz > 0 else 0.0
        cv2 = cv ** 2
    else:
        cv = 0.0
        cv2 = 0.0

    # Syntetos-Boylan intermittency threshold: ADI >= 1.32 or zero_share >= 0.40
    is_intermittent = (adi >= 1.32) or (zero_share >= 0.40)

    # Winsorization (5th and 95th percentiles) for outlier-resistant model fitting
    if n_obs >= 10:
        p5 = np.percentile(qty_arr, 5)
        p95 = np.percentile(qty_arr, 95)
        # Avoid collapsing constant or low-count demand
        if p95 > p5:
            df["qty_winsorized"] = np.clip(qty_arr, p5, p95)
        else:
            df["qty_winsorized"] = qty_arr.copy()
    else:
        df["qty_winsorized"] = qty_arr.copy()

    stats = {
        "n_obs": n_obs,
        "zero_share": zero_share,
        "adi": adi,
        "cv": cv,
        "cv2": cv2,
        "is_intermittent": is_intermittent,
        "start_date": min_date.strftime("%Y-%m-%d"),
        "end_date": max_date.strftime("%Y-%m-%d"),
    }

    return df, stats, warnings
