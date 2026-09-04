from __future__ import annotations
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "available_models" in data
    assert len(data["available_models"]) >= 7

def test_forecast_endpoint():
    payload = {
        "series": [
            {
                "sku": "SKU-TEST-001",
                "warehouse": "WH-MAIN",
                "unit_cost": 25.0,
                "horizon_days": 14,
                "history": [
                    {"date": f"2026-01-{i:02d}", "qty": float(10 + (i % 7))}
                    for i in range(1, 31)
                ],
            }
        ]
    }
    response = client.post("/forecast", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["summary"]["total_series"] == 1
    assert len(data["results"]) == 1
    
    res = data["results"][0]
    assert res["sku"] == "SKU-TEST-001"
    assert len(res["forecast"]) == 14
    assert res["accuracy"]["wape"] >= 0.0
    assert res["abc_class"] in ["A", "B", "C"]
    assert res["xyz_class"] in ["X", "Y", "Z"]

def test_backtest_endpoint():
    payload = {
        "n_splits": 2,
        "horizon_days": 7,
        "series": [
            {
                "sku": "SKU-TEST-002",
                "warehouse": "WH-WEST",
                "unit_cost": 10.0,
                "history": [
                    {"date": f"2026-01-{i:02d}", "qty": float(20 + i)}
                    for i in range(1, 31)
                ],
            }
        ]
    }
    response = client.post("/backtest", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert len(data["results"]) == 1
    res = data["results"][0]
    assert "candidate_wape" in res
    assert len(res["folds"]) >= 2
