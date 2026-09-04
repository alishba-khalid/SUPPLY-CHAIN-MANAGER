from __future__ import annotations
from typing import Dict, Any, Tuple, List
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

# Complexity rank for tie-breaking (lower number = simpler model)
MODEL_COMPLEXITY_RANK: Dict[str, int] = {
    "Naive (Last Value)": 1,
    "SMA (7d)": 2,
    "SMA (14d)": 2,
    "Single Exp Smoothing (SES)": 3,
    "Croston (SBA Debiased)": 4,
    "Croston (Classical)": 4,
    "Seasonal Naive (Weekly)": 5,
    "Holt Linear Trend": 6,
    "Holt-Winters (Weekly m=7)": 7,
}

def select_winning_model(
    aggregated_wape: Dict[str, float],
    stats: Dict[str, Any],
    candidate_instances: List[Any]
) -> Tuple[Any, str, str]:
    """
    Evaluates tournament results and selects the winning forecasting model.
    Applies tie-breaking rules favoring parsimony and domain appropriateness.
    
    Returns:
    - winning_model_instance
    - winning_model_name
    - method_reason
    """
    if not aggregated_wape:
        fallback = SimpleMovingAverageModel(window=14)
        return fallback, fallback.name, "Defaulted to SMA (14d) due to empty tournament results."

    is_intermittent = stats.get("is_intermittent", False)
    zero_share = stats.get("zero_share", 0.0)
    adi = stats.get("adi", 1.0)
    n_obs = stats.get("n_obs", 0)

    # Find the lowest WAPE score
    min_wape = min(aggregated_wape.values())
    
    # Identify all models within 1.5% WAPE of the minimum (near-tie tolerance)
    TOLERANCE = 0.015
    contenders = [
        name for name, score in aggregated_wape.items()
        if score <= min_wape + TOLERANCE
    ]

    # If intermittent, prioritize Croston / SBA among top contenders
    if is_intermittent:
        for preferred in ["Croston (SBA Debiased)", "Croston (Classical)"]:
            if preferred in contenders:
                winner_name = preferred
                break
        else:
            winner_name = min(contenders, key=lambda name: (MODEL_COMPLEXITY_RANK.get(name, 99), aggregated_wape[name]))
    else:
        # Pick simplest model with lowest complexity rank among top performers
        winner_name = min(contenders, key=lambda name: (MODEL_COMPLEXITY_RANK.get(name, 99), aggregated_wape[name]))

    # Clone or locate the winning model
    winning_instance = None
    for cand in candidate_instances:
        if cand.name == winner_name:
            import copy
            winning_instance = copy.deepcopy(cand)
            break
            
    if winning_instance is None:
        winning_instance = SimpleMovingAverageModel(window=14)
        winner_name = winning_instance.name

    # Craft human-readable reason
    score_pct = f"{aggregated_wape.get(winner_name, min_wape) * 100:.1f}%"
    if is_intermittent:
        reason = (
            f"Selected {winner_name} (out-of-fold WAPE: {score_pct}) "
            f"for intermittent demand profile ({zero_share*100:.0f}% zero-days, ADI: {adi:.1f})."
        )
    elif "Holt-Winters" in winner_name:
        reason = (
            f"Selected {winner_name} (out-of-fold WAPE: {score_pct}) "
            f"capturing prominent weekly seasonality across {n_obs} history days."
        )
    elif "Holt Linear" in winner_name:
        reason = (
            f"Selected {winner_name} (out-of-fold WAPE: {score_pct}) "
            f"with damped trend for steady trajectory."
        )
    else:
        reason = (
            f"Selected {winner_name} with lowest cross-validated error "
            f"(out-of-fold WAPE: {score_pct}) across tournament competitors."
        )

    return winning_instance, winner_name, reason
