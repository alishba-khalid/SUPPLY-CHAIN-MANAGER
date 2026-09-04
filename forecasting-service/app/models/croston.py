from __future__ import annotations
import numpy as np
from typing import Tuple, Optional

class CrostonClassicalModel:
    """
    Croston's Method for intermittent demand forecasting.
    Separates the time series into non-zero demand size (z) and inter-arrival time (p).
    Forecast per period = z / p.
    """
    name: str = "Croston (Classical)"

    def __init__(self, alpha: float = 0.1):
        self.alpha = alpha
        self.z: float = 0.0  # Smoothed demand size
        self.p: float = 1.0  # Smoothed inter-arrival interval
        self.rate: float = 0.0
        self.residual_std: float = 0.0

    def fit(self, y: np.ndarray) -> "CrostonClassicalModel":
        y = np.asarray(y, dtype=float)
        n = len(y)
        if n == 0:
            self.rate = 0.0
            return self

        non_zeros = np.where(y > 0.0)[0]
        if len(non_zeros) == 0:
            self.z = 0.0
            self.p = float(n)
            self.rate = 0.0
            self.residual_std = 0.0
            return self

        # Initialize with the first non-zero demand
        first_idx = non_zeros[0]
        z_t = y[first_idx]
        p_t = max(1.0, float(first_idx + 1))
        q = 1.0  # Counter of periods since last non-zero demand

        for t in range(first_idx + 1, n):
            if y[t] > 0.0:
                z_t = self.alpha * y[t] + (1.0 - self.alpha) * z_t
                p_t = self.alpha * q + (1.0 - self.alpha) * p_t
                q = 1.0
            else:
                q += 1.0

        self.z = float(z_t)
        self.p = float(max(1.0, p_t))
        self.rate = float(self.z / self.p)

        # In-sample residual variance
        residuals = y - self.rate
        self.residual_std = float(np.std(residuals)) if len(residuals) > 0 else float(self.rate * 0.5)
        return self

    def predict(self, horizon: int, z: float = 1.28) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        forecast = np.full(horizon, self.rate, dtype=float)
        step_factor = np.sqrt(np.arange(1, horizon + 1))
        margin = z * self.residual_std * step_factor
        lower = np.maximum(0.0, forecast - margin)
        upper = forecast + margin
        return forecast, lower, upper


class CrostonSBAModel:
    """
    Syntetos-Boylan Approximation (SBA) for intermittent demand.
    Applies a debiasing factor of (1 - alpha / 2) to eliminate the positive bias
    inherent in standard Croston estimation.
    """
    name: str = "Croston (SBA Debiased)"

    def __init__(self, alpha: float = 0.1):
        self.alpha = alpha
        self.z: float = 0.0
        self.p: float = 1.0
        self.rate: float = 0.0
        self.residual_std: float = 0.0

    def fit(self, y: np.ndarray) -> "CrostonSBAModel":
        y = np.asarray(y, dtype=float)
        n = len(y)
        if n == 0:
            self.rate = 0.0
            return self

        non_zeros = np.where(y > 0.0)[0]
        if len(non_zeros) == 0:
            self.rate = 0.0
            self.residual_std = 0.0
            return self

        first_idx = non_zeros[0]
        z_t = y[first_idx]
        p_t = max(1.0, float(first_idx + 1))
        q = 1.0

        for t in range(first_idx + 1, n):
            if y[t] > 0.0:
                z_t = self.alpha * y[t] + (1.0 - self.alpha) * z_t
                p_t = self.alpha * q + (1.0 - self.alpha) * p_t
                q = 1.0
            else:
                q += 1.0

        self.z = float(z_t)
        self.p = float(max(1.0, p_t))
        # SBA debiasing correction
        debias = (1.0 - self.alpha / 2.0)
        self.rate = float(debias * (self.z / self.p))

        residuals = y - self.rate
        self.residual_std = float(np.std(residuals)) if len(residuals) > 0 else float(self.rate * 0.5)
        return self

    def predict(self, horizon: int, z: float = 1.28) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        forecast = np.full(horizon, self.rate, dtype=float)
        step_factor = np.sqrt(np.arange(1, horizon + 1))
        margin = z * self.residual_std * step_factor
        lower = np.maximum(0.0, forecast - margin)
        upper = forecast + margin
        return forecast, lower, upper
