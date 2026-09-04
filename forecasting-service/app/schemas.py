from __future__ import annotations
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

class HistoryPoint(BaseModel):
    date: str
    qty: float

class SeriesInput(BaseModel):
    sku: str
    warehouse: str
    history: List[HistoryPoint]
    horizon_days: int = Field(default=28, ge=1, le=180)
    unit_cost: float = Field(default=0.0, ge=0.0)

class ForecastPoint(BaseModel):
    date: str
    qty: float
    lower_80: float
    upper_80: float

class AccuracyMetrics(BaseModel):
    wape: float
    mape: Optional[float] = None
    bias: float
    bias_pct: float
    rmse: float
    mase: float

class SeriesForecastResult(BaseModel):
    sku: str
    warehouse: str
    method_selected: str
    method_reason: str
    forecast: List[ForecastPoint]
    accuracy: AccuracyMetrics
    abc_class: Literal["A", "B", "C"]
    xyz_class: Literal["X", "Y", "Z"]
    policy_hint: str
    warnings: List[str] = []

class ForecastRequest(BaseModel):
    series: List[SeriesInput]
    service_level_z: float = Field(default=1.65, ge=0.5, le=3.5)

class PortfolioSummary(BaseModel):
    total_series: int
    portfolio_wape: float
    portfolio_bias: float
    portfolio_mase: float
    method_distribution: Dict[str, int]
    abc_distribution: Dict[str, int]
    xyz_distribution: Dict[str, int]

class ForecastResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    summary: PortfolioSummary
    results: List[SeriesForecastResult]

class BacktestFoldDetail(BaseModel):
    fold: int
    train_start: str
    train_end: str
    test_start: str
    test_end: str
    model: str
    wape: float
    bias: float
    rmse: float

class BacktestSeriesResult(BaseModel):
    sku: str
    warehouse: str
    folds: List[BacktestFoldDetail]
    candidate_wape: Dict[str, float]
    winning_model: str
    winning_wape: float

class BacktestRequest(BaseModel):
    series: List[SeriesInput]
    n_splits: int = Field(default=3, ge=2, le=6)
    horizon_days: int = Field(default=14, ge=7, le=28)

class BacktestResponse(BaseModel):
    status: str = "ok"
    results: List[BacktestSeriesResult]
