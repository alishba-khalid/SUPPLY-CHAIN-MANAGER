from __future__ import annotations
import numpy as np
from typing import Tuple

class SimpleMovingAverageModel:
    """Rolling simple moving average with empirical standard error prediction intervals."""
    
    def __init__(self, window: int = 14):
        self.window = window
        self.name = f"SMA ({window}d)"
        self.mean_val: float = 0.0
        self.residual_std: float = 0.0

    def fit(self, y: np.ndarray) -> "SimpleMovingAverageModel":
        y = np.asarray(y, dtype=float)
        if len(y) == 0:
            self.mean_val = 0.0
            self.residual_std = 0.0
            return self

        w = min(self.window, len(y))
        tail = y[-w:]
        self.mean_val = float(np.mean(tail))
        
        # Calculate standard deviation of residuals over history
        if len(y) >= self.window:
            rolling_means = [np.mean(y[i - self.window:i]) for i in range(self.window, len(y))]
            actuals = y[self.window:]
            residuals = actuals - np.array(rolling_means)
            self.residual_std = float(np.std(residuals)) if len(residuals) > 0 else float(np.std(tail))
        else:
            self.residual_std = float(np.std(tail))
            
        return self

    def predict(self, horizon: int, z: float = 1.28) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        forecast = np.full(horizon, self.mean_val, dtype=float)
        step_factor = np.sqrt(np.arange(1, horizon + 1) / self.window + 1.0)
        margin = z * self.residual_std * step_factor
        lower = np.maximum(0.0, forecast - margin)
        upper = forecast + margin
        return forecast, lower, upper
