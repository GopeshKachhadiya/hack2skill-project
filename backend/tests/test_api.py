"""
tests/test_api.py — Integration tests for all REST endpoints.

Run with:
  cd backend
  pytest tests/test_api.py -v
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ── Health ────────────────────────────────────────────────────────────────────

def test_health_check():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data


def test_root_redirect():
    resp = client.get("/")
    assert resp.status_code == 200
    assert "docs" in resp.json()


# ── Disruptions ───────────────────────────────────────────────────────────────

def test_get_disruptions_returns_list():
    resp = client.get("/api/v1/disruptions")
    assert resp.status_code == 200
    data = resp.json()
    assert "disruptions" in data
    assert isinstance(data["disruptions"], list)


def test_get_disruptions_limit_param():
    resp = client.get("/api/v1/disruptions?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["disruptions"]) <= 5


def test_get_disruptions_location_filter():
    resp = client.get("/api/v1/disruptions?location=Shanghai")
    assert resp.status_code == 200


def test_get_disruptions_severity_filter():
    for sev in ["low", "medium", "high", "critical"]:
        resp = client.get(f"/api/v1/disruptions?severity={sev}")
        assert resp.status_code == 200


# ── Shipment Analysis ─────────────────────────────────────────────────────────

def test_analyze_shipment_basic():
    payload = {
        "origin": "Shanghai",
        "destination": "Rotterdam",
        "priority": "normal",
    }
    resp = client.post("/api/v1/shipments/analyze", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "shipment_id" in data
    assert "overall_risk_score" in data
    assert "risk_level" in data
    assert "forecasts" in data
    assert "timeline" in data
    assert "recommendations" in data


def test_analyze_shipment_risk_score_range():
    payload = {"origin": "Singapore", "destination": "Los Angeles"}
    resp = client.post("/api/v1/shipments/analyze", json=payload)
    assert resp.status_code == 200
    score = resp.json()["overall_risk_score"]
    assert 0.0 <= score <= 1.0


def test_analyze_shipment_missing_fields():
    """Should succeed with minimal fields (origin + destination required)."""
    resp = client.post("/api/v1/shipments/analyze", json={"origin": "Hamburg"})
    assert resp.status_code == 422  # validation error — destination missing


# ── Forecasting ───────────────────────────────────────────────────────────────

def test_get_forecast_returns_data():
    resp = client.get("/api/v1/forecasts/Shanghai")
    assert resp.status_code == 200
    data = resp.json()
    assert "location" in data
    assert "data" in data
    assert isinstance(data["data"], list)


def test_get_forecast_hours_param():
    resp = client.get("/api/v1/forecasts/Rotterdam?hours=24")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) <= 24


def test_get_forecast_data_structure():
    resp = client.get("/api/v1/forecasts/Singapore?hours=2")
    assert resp.status_code == 200
    points = resp.json()["data"]
    if points:
        p = points[0]
        assert "timestamp" in p
        assert "disruption_likelihood" in p
        assert 0.0 <= p["disruption_likelihood"] <= 1.0


# ── Model Performance ─────────────────────────────────────────────────────────

def test_stats_performance():
    resp = client.get("/api/v1/stats/performance")
    assert resp.status_code == 200
    data = resp.json()
    assert "model_accuracy" in data
    assert "precision" in data["model_accuracy"]
    assert "recall" in data["model_accuracy"]


# ── Route Optimization ────────────────────────────────────────────────────────

def test_optimize_route():
    payload = {
        "waypoints": [
            {"lat": 31.2, "lng": 121.5},
            {"lat": 51.9, "lng": 4.5},
        ],
        "consider_disruptions": True,
    }
    resp = client.post("/api/v1/routes/optimize", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "optimized_waypoints" in data
    assert len(data["optimized_waypoints"]) == 2


def test_optimize_route_empty_waypoints():
    payload = {"waypoints": []}
    resp = client.post("/api/v1/routes/optimize", json=payload)
    assert resp.status_code == 400


# ── Manual Ingestion Trigger ──────────────────────────────────────────────────

def test_ingest_trigger():
    resp = client.post("/api/v1/ingest/trigger")
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"
