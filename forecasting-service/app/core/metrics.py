from __future__ import annotations
import numpy as np
from typing import Optional, Dict

def calculate_wape(actuals: np.ndarray, predictions: np.ndarray) -> float:
    """Weighted Absolute Percentage Error (WAPE = sum(|y - y_hat|) / sum(y))."""
    actuals = np.asarray(actuals, dtype=float)
    predictions = np.asarray(predictions, dtype=float)
    
    total_actual = np.sum(actuals)
    total_abs_error = np.sum(np.abs(actuals - predictions))
    
    if total_actual == 0.0:
        return 0.0 if total_abs_error == 0.0 else 1.0
    return float(total_abs_error / total_actual)

def calculate_mape(actuals: np.ndarray, predictions: np.ndarray) -> Optional[float]:
    """Mean Absolute Percentage Error evaluated exclusively on non-zero observations."""
    actuals = np.asarray(actuals, dtype=float)
    predictions = np.asarray(predictions, dtype=float)
    
    non_zero_mask = actuals > 1e-6
    if not np.any(non_zero_mask):
        return None
        
    abs_pct_errors = np.abs((actuals[non_zero_mask] - predictions[non_zero_mask]) / actuals[non_zero_mask])
    return float(np.mean(abs_pct_errors))

def calculate_bias(actuals: np.ndarray, predictions: np.ndarray) -> float:
    """Signed mean forecast error (positive = overforecasting, negative = underforecasting)."""
    actuals = np.asarray(actuals, dtype=float)
    predictions = np.asarray(predictions, dtype=float)
    if len(actuals) == 0:
        return 0.0
    return float(np.mean(predictions - actuals))

def calculate_bias_pct(actuals: np.ndarray, predictions: np.ndarray) -> float:
    """Signed percentage bias (sum(pred - act) / sum(act))."""
    actuals = np.asarray(actuals, dtype=float)
    predictions = np.asarray(predictions, dtype=float)
    
    total_actual = np.sum(actuals)
    total_diff = np.sum(predictions - actuals)
    
    if total_actual == 0.0:
        return 0.0 if total_diff == 0.0 else (100.0 if total_diff > 0 else -100.0)
    return float((total_diff / total_actual) * 100.0)

def calculate_rmse(actuals: np.ndarray, predictions: np.ndarray) -> float:
    """Root Mean Squared Error."""
    actuals = np.asarray(actuals, dtype=float)
    predictions = np.asarray(predictions, dtype=float)
    if len(actuals) == 0:
        return 0.0
    return float(np.sqrt(np.mean((actuals - predictions) ** 2)))

def calculate_mase(
    actuals: np.ndarray,
    predictions: np.ndarray,
    in_sample_history: np.ndarray,
    seasonal_period: int = 1
) -> float:
    """
    Mean Absolute Scaled Error (MASE) relative to one-step in-sample naive baseline.
    MASE < 1.0 means the model outperforms the in-sample naive benchmark.
    """
    actuals = np.asarray(actuals, dtype=float)
    predictions = np.asarray(predictions, dtype=float)
    in_sample = np.asarray(in_sample_history, dtype=float)
    
    if len(actuals) == 0:
        return 1.0
        
    mae_test = np.mean(np.abs(actuals - predictions))
    
    if len(in_sample) <= seasonal_period:
        return float(mae_test) if mae_test > 0 else 1.0
        
    # In-sample naive differences
    scale = np.mean(np.abs(in_sample[seasonal_period:] - in_sample[:-seasonal_period]))
    
    if scale == 0.0 or np.isnan(scale):
        return 0.0 if mae_test == 0.0 else 1.0
        
    return float(mae_test / scale)

def calculate_all_metrics(
    actuals: np.ndarray,
    predictions: np.ndarray,
    in_sample_history: np.ndarray
) -> Dict[str, Any]:
    """Computes all primary statistical accuracy metrics."""
    return {
        "wape": round(calculate_wape(actuals, predictions), 4),
        "mape": round(calculate_mape(actuals, predictions), 4) if calculate_mape(actuals, predictions) is not None else None,
        "bias": round(calculate_bias(actuals, predictions), 2),
        "bias_pct": round(calculate_bias_pct(actuals, predictions), 2),
        "rmse": round(calculate_rmse(actuals, predictions), 2),
        "mase": round(calculate_mase(actuals, predictions, in_sample_history), 3),
    }
