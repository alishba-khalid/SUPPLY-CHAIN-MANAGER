from __future__ import annotations
from typing import List, Dict, Any, Literal, Tuple
from app.schemas import SeriesInput

POLICY_MATRIX: Dict[Tuple[str, str], str] = {
    ("A", "X"): "Automated continuous replenishment with tight safety buffer (z=1.65). High value, steady demand.",
    ("A", "Y"): "Weekly review with seasonal forecasting; buffer against volatility (z=1.96). High revenue impact.",
    ("A", "Z"): "High-value erratic; requires active planner oversight; dynamic prediction-interval buffer or MTO.",
    ("B", "X"): "Automated standard reorder point (ROP); balanced inventory cover (z=1.65).",
    ("B", "Y"): "Standard exponential smoothing; moderate safety buffer for mid-tier demand shifts.",
    ("B", "Z"): "Intermittent Croston/SBA replenishment; minimum stocking levels with stockout alert triggers.",
    ("C", "X"): "Bulk periodic purchasing to minimize transaction costs; generous safety buffer.",
    ("C", "Y"): "Simple reorder thresholds; low replenishment frequency with periodic review.",
    ("C", "Z"): "Low value erratic/slow-mover; minimum order quantity stocking or order-on-demand.",
}

def classify_portfolio_abc_xyz(
    series_list: List[SeriesInput],
    series_stats: Dict[str, Dict[str, Any]]
) -> Dict[str, Tuple[Literal["A", "B", "C"], Literal["X", "Y", "Z"], str]]:
    """
    Classifies a portfolio into a 3x3 ABC/XYZ matrix:
    - ABC: Cumulative annual consumption value (A=top 80%, B=next 15%, C=bottom 5%)
    - XYZ: Coefficient of Variation (X <= 0.5, 0.5 < Y <= 1.0, Z > 1.0)
    
    Returns a map: series_key -> (abc_class, xyz_class, policy_hint)
    """
    if not series_list:
        return {}

    # 1. Compute annual consumption value per series
    series_values: List[Dict[str, Any]] = []
    for s in series_list:
        key = f"{s.sku}::{s.warehouse}"
        total_units = sum(max(0.0, p.qty) for p in s.history)
        n_days = max(1, len(s.history))
        annual_units = (total_units / n_days) * 365.0
        annual_val = annual_units * max(0.01, s.unit_cost)
        
        cv = series_stats.get(key, {}).get("cv", 0.0)
        
        series_values.append({
            "key": key,
            "annual_val": annual_val,
            "cv": cv,
        })

    # Sort descending by annual consumption value for Pareto ABC analysis
    series_values.sort(key=lambda x: x["annual_val"], reverse=True)
    total_portfolio_value = sum(x["annual_val"] for x in series_values)
    
    cumulative_val = 0.0
    classification_map: Dict[str, Tuple[Literal["A", "B", "C"], Literal["X", "Y", "Z"], str]] = {}
    
    for item in series_values:
        key = item["key"]
        cv = item["cv"]
        annual_val = item["annual_val"]
        cumulative_val += annual_val
        
        # ABC Pareto split
        if total_portfolio_value > 0:
            cum_share = cumulative_val / total_portfolio_value
            if cum_share <= 0.80:
                abc: Literal["A", "B", "C"] = "A"
            elif cum_share <= 0.95:
                abc = "B"
            else:
                abc = "C"
        else:
            abc = "C"

        # XYZ Volatility split
        if cv <= 0.50:
            xyz: Literal["X", "Y", "Z"] = "X"
        elif cv <= 1.00:
            xyz = "Y"
        else:
            xyz = "Z"

        policy = POLICY_MATRIX.get((abc, xyz), "Standard replenishment review.")
        classification_map[key] = (abc, xyz, policy)

    return classification_map
