"""
tests/test_api.py — Integration tests for all REST endpoints.

Run with:
  cd backend
  pytest tests/test_api.py -v
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api import routes as api_routes

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


def test_assistant_chat_returns_shipment_details_from_context():
    resp = client.post(
        "/api/v1/assistant/chat",
        json={
            "messages": [{"role": "user", "content": "tell me details about this SHP-1015 ship"}],
            "context": {
                "shipments": [
                    {
                        "id": "SHP-1015",
                        "origin": "Port of Shanghai",
                        "destination": "Port of Rotterdam",
                        "cargoType": "Container",
                        "priority": "urgent",
                        "currentStatus": "critical",
                        "riskScore": 0.92,
                        "delay": 18.0,
                        "expectedArrival": "2026-04-28T04:11:00Z",
                        "cargoValue": 3705506,
                    }
                ]
            },
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "SHP-1015" in data["reply"]
    assert "Port of Shanghai" in data["reply"]
    assert "Port of Rotterdam" in data["reply"]


def test_assistant_chat_refuses_off_topic_question():
    resp = client.post(
        "/api/v1/assistant/chat",
        json={"messages": [{"role": "user", "content": "Who won the football match yesterday?"}]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Anvayaa supply-chain project" in data["reply"]


def test_assistant_chat_handles_greeting():
    resp = client.post(
        "/api/v1/assistant/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Hi!" in data["reply"]
    assert "SHP-1015" in data["reply"]


def test_assistant_chat_handles_in_scope_general_question():
    resp = client.post(
        "/api/v1/assistant/chat",
        json={"messages": [{"role": "user", "content": "Explain the route optimization feature"}]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["reply"], str)
    assert len(data["reply"].strip()) > 0


def test_assistant_chat_returns_shanghai_disruption_severity_from_context():
    resp = client.post(
        "/api/v1/assistant/chat",
        json={
            "messages": [{"role": "user", "content": "What is the current severity of disruptions at the Port of Shanghai?"}],
            "context": {
                "disruptions": [
                    {
                        "id": "d-1",
                        "location": "Port of Shanghai",
                        "disruptionType": "weather",
                        "predictedSeverity": 0.35,
                        "probability": 0.72,
                        "status": "active",
                    }
                ]
            },
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Port of Shanghai" in data["reply"]
    assert "0.35" in data["reply"]


def test_assistant_chat_handles_tell_me_about_disruption():
    resp = client.post(
        "/api/v1/assistant/chat",
        json={
            "messages": [{"role": "user", "content": "tell me about mechanical bay of biscay"}],
            "context": {
                "disruptions": [
                    {
                        "id": "d-2",
                        "location": "Bay_of_Biscay",
                        "disruptionType": "mechanical",
                        "predictedSeverity": 0.81,
                        "probability": 0.63,
                        "status": "active",
                    }
                ]
            },
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "Mechanical" in data["reply"]
    assert "Bay of Biscay" in data["reply"]


def test_assistant_chat_returns_retry_seconds_on_rate_limit(monkeypatch):
    async def fake_generate(*args, **kwargs):
        raise api_routes.HTTPException(
            status_code=429,
            detail="The Gemini API rate limit is active right now. Please wait about **42 seconds** before sending the next assistant message.",
        )

    monkeypatch.setattr(api_routes, "_generate_gemini_project_reply", fake_generate)
    resp = client.post(
        "/api/v1/assistant/chat",
        json={"messages": [{"role": "user", "content": "Summarize the forecasting module"}]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["retryAfterSeconds"] == 42
    assert "42 seconds" in data["reply"]


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
