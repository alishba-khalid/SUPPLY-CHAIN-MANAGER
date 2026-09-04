from __future__ import annotations
import numpy as np
from typing import Tuple

class NaiveModel:
    """Flat projection of the last observed demand value."""
    name: str = "Naive (Last Value)"

    def __init__(self):
        self.last_value: float = 0.0
        self.residual_std: float = 0.0

    def fit(self, y: np.ndarray) -> "NaiveModel":
        y = np.asarray(y, dtype=float)
        if len(y) == 0:
            self.last_value = 0.0
            self.residual_std = 0.0
            return self

        self.last_value = float(y[-1])
        if len(y) > 1:
            diffs = y[1:] - y[:-1]
            self.residual_std = float(np.std(diffs))
        else:
            self.residual_std = float(self.last_value * 0.2)
        return self

    def predict(self, horizon: int, z: float = 1.28) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        # 80% prediction interval (z ≈ 1.28)
        forecast = np.full(horizon, self.last_value, dtype=float)
        step_factor = np.sqrt(np.arange(1, horizon + 1))
        margin = z * self.residual_std * step_factor
        lower = np.maximum(0.0, forecast - margin)
        upper = forecast + margin
        return forecast, lower, upper


class SeasonalNaiveModel:
    """Projects the exact same weekday value from the previous weekly cycle (m=7)."""
    name: str = "Seasonal Naive (Weekly)"

    def __init__(self, m: int = 7):
        self.m = m
        self.last_cycle: np.ndarray = np.array([])
        self.residual_std: float = 0.0

    def fit(self, y: np.ndarray) -> "SeasonalNaiveModel":
        y = np.asarray(y, dtype=float)
        if len(y) < self.m:
            # Fallback to naive if less than 1 cycle
            self.last_cycle = np.full(self.m, y[-1] if len(y) > 0 else 0.0)
            self.residual_std = 0.0
            return self

        self.last_cycle = y[-self.m:].copy()
        if len(y) > self.m:
            diffs = y[self.m:] - y[:-self.m]
            self.residual_std = float(np.std(diffs))
        else:
            self.residual_std = float(np.std(self.last_cycle))
        return self

    def predict(self, horizon: int, z: float = 1.28) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        reps = int(np.ceil(horizon / self.m))
        tiled = np.tile(self.last_cycle, reps)[:horizon]
        step_factor = np.sqrt(np.ceil(np.arange(1, horizon + 1) / self.m))
        margin = z * self.residual_std * step_factor
        lower = np.maximum(0.0, tiled - margin)
        upper = tiled + margin
        return tiled, lower, upper
