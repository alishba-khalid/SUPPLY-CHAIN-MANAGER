from __future__ import annotations
import numpy as np
from typing import Tuple, Optional

class SimpleExpSmoothingModel:
    """Single exponential smoothing for level without trend or seasonality."""
    name: str = "Single Exp Smoothing (SES)"

    def __init__(self, alpha: Optional[float] = None):
        self.alpha_param = alpha
        self.alpha: float = 0.2
        self.level: float = 0.0
        self.residual_std: float = 0.0

    def fit(self, y: np.ndarray) -> "SimpleExpSmoothingModel":
        y = np.asarray(y, dtype=float)
        n = len(y)
        if n == 0:
            self.level = 0.0
            self.residual_std = 0.0
            return self

        # If alpha is not specified, optimize or default
        if self.alpha_param is not None:
            self.alpha = float(self.alpha_param)
        else:
            # Simple grid search over alpha for lowest in-sample SSE
            best_alpha = 0.2
            best_sse = float("inf")
            for a in np.linspace(0.05, 0.95, 19):
                lvl = y[0]
                sse = 0.0
                for t in range(n):
                    err = y[t] - lvl
                    sse += err ** 2
                    lvl = a * y[t] + (1.0 - a) * lvl
                if sse < best_sse:
                    best_sse = sse
                    best_alpha = float(a)
            self.alpha = best_alpha

        # Compute fitted level and residuals
        lvl = y[0]
        residuals = []
        for t in range(n):
            residuals.append(y[t] - lvl)
            lvl = self.alpha * y[t] + (1.0 - self.alpha) * lvl
        
        self.level = float(lvl)
        self.residual_std = float(np.std(residuals)) if residuals else float(self.level * 0.2)
        return self

    def predict(self, horizon: int, z: float = 1.28) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        forecast = np.full(horizon, self.level, dtype=float)
        # Prediction interval expands with horizon: sigma_h = sigma * sqrt(1 + (h-1)*alpha^2)
        h_steps = np.arange(1, horizon + 1)
        var_factors = np.sqrt(1.0 + (h_steps - 1) * (self.alpha ** 2))
        margin = z * self.residual_std * var_factors
        lower = np.maximum(0.0, forecast - margin)
        upper = forecast + margin
        return forecast, lower, upper


class HoltLinearTrendModel:
    """Holt's Linear Exponential Smoothing with damped trend support."""
    name: str = "Holt Linear Trend"

    def __init__(self, phi: float = 0.95):
        self.phi = phi  # Damping factor to prevent runaway trend projections
        self.alpha: float = 0.3
        self.beta: float = 0.1
        self.level: float = 0.0
        self.trend: float = 0.0
        self.residual_std: float = 0.0

    def fit(self, y: np.ndarray) -> "HoltLinearTrendModel":
        y = np.asarray(y, dtype=float)
        n = len(y)
        if n < 2:
            self.level = float(y[-1]) if n > 0 else 0.0
            self.trend = 0.0
            self.residual_std = 0.0
            return self

        # Initial level and trend
        lvl = y[0]
        trd = y[1] - y[0]
        
        # Grid search for alpha and beta
        best_params = (0.3, 0.1)
        best_sse = float("inf")
        for a in [0.1, 0.2, 0.3, 0.5]:
            for b in [0.05, 0.1, 0.2]:
                l, b_val = y[0], y[1] - y[0]
                sse = 0.0
                for t in range(n):
                    pred = l + self.phi * b_val
                    err = y[t] - pred
                    sse += err ** 2
                    new_l = a * y[t] + (1.0 - a) * (l + self.phi * b_val)
                    new_b = b * (new_l - l) + (1.0 - b) * (self.phi * b_val)
                    l, b_val = new_l, new_b
                if sse < best_sse:
                    best_sse = sse
                    best_params = (a, b)
                    
        self.alpha, self.beta = best_params
        
        # Fit final path
        residuals = []
        lvl = y[0]
        trd = (y[1] - y[0]) if n > 1 else 0.0
        for t in range(n):
            pred = lvl + self.phi * trd
            residuals.append(y[t] - pred)
            new_lvl = self.alpha * y[t] + (1.0 - self.alpha) * (lvl + self.phi * trd)
            new_trd = self.beta * (new_lvl - lvl) + (1.0 - self.beta) * (self.phi * trd)
            lvl, trd = new_lvl, new_trd
            
        self.level = float(lvl)
        self.trend = float(trd)
        self.residual_std = float(np.std(residuals)) if residuals else float(self.level * 0.2)
        return self

    def predict(self, horizon: int, z: float = 1.28) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        h_steps = np.arange(1, horizon + 1)
        # Damped trend formula: sum(phi^i for i in 1..h)
        trend_multipliers = np.array([np.sum(self.phi ** np.arange(1, h + 1)) for h in range(1, horizon + 1)])
        forecast = np.maximum(0.0, self.level + self.trend * trend_multipliers)
        
        step_factor = np.sqrt(h_steps)
        margin = z * self.residual_std * step_factor
        lower = np.maximum(0.0, forecast - margin)
        upper = forecast + margin
        return forecast, lower, upper


class HoltWintersModel:
    """Holt-Winters Additive Seasonality Model with weekly period m=7."""
    name: str = "Holt-Winters (Weekly m=7)"

    def __init__(self, m: int = 7):
        self.m = m
        self.alpha: float = 0.2
        self.beta: float = 0.05
        self.gamma: float = 0.3
        self.level: float = 0.0
        self.trend: float = 0.0
        self.seasonals: np.ndarray = np.zeros(m)
        self.residual_std: float = 0.0

    def fit(self, y: np.ndarray) -> "HoltWintersModel":
        y = np.asarray(y, dtype=float)
        n = len(y)
        if n < 2 * self.m:
            # Need at least 2 full seasonal cycles
            raise ValueError(f"HoltWinters requires at least 2*m ({2*self.m}) observations, got {n}.")

        # Classical decomposition for initial seasonal factors and level
        n_seasons = n // self.m
        season_averages = np.array([np.mean(y[i*self.m:(i+1)*self.m]) for i in range(n_seasons)])
        
        # Initial trend
        initial_trend = (season_averages[-1] - season_averages[0]) / ((n_seasons - 1) * self.m) if n_seasons > 1 else 0.0
        initial_level = season_averages[0]
        
        # Initial seasonals (additive)
        initial_seasonals = np.zeros(self.m)
        for i in range(self.m):
            initial_seasonals[i] = np.mean([y[s * self.m + i] - season_averages[s] for s in range(n_seasons)])
        initial_seasonals -= np.mean(initial_seasonals)  # Zero-center additive seasonal factors

        lvl = initial_level
        trd = initial_trend
        s = list(initial_seasonals)
        residuals = []

        for t in range(n):
            seas_idx = t % self.m
            st = s[seas_idx]
            pred = lvl + trd + st
            residuals.append(y[t] - pred)
            
            new_lvl = self.alpha * (y[t] - st) + (1.0 - self.alpha) * (lvl + trd)
            new_trd = self.beta * (new_lvl - lvl) + (1.0 - self.beta) * trd
            new_s = self.gamma * (y[t] - new_lvl) + (1.0 - self.gamma) * st
            
            lvl, trd = new_lvl, new_trd
            s[seas_idx] = new_s

        self.level = float(lvl)
        self.trend = float(trd)
        self.seasonals = np.array(s)
        self.residual_std = float(np.std(residuals)) if residuals else float(self.level * 0.2)
        return self

    def predict(self, horizon: int, z: float = 1.28) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        h_steps = np.arange(1, horizon + 1)
        base_trend = self.level + self.trend * h_steps
        reps = int(np.ceil(horizon / self.m))
        seasonal_cycle = np.tile(self.seasonals, reps)[:horizon]
        
        forecast = np.maximum(0.0, base_trend + seasonal_cycle)
        step_factor = np.sqrt(np.arange(1, horizon + 1) / self.m + 1.0)
        margin = z * self.residual_std * step_factor
        lower = np.maximum(0.0, forecast - margin)
        upper = forecast + margin
        return forecast, lower, upper
