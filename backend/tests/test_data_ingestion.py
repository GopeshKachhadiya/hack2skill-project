"""
tests/test_data_ingestion.py — Unit tests for the data ingestion service.

Tests:
  • Mock weather API response parsing
  • Severity classification
  • Mock data fallback
  • Cache utilities
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ── Weather ───────────────────────────────────────────────────────────────────

def test_classify_weather_severity_critical():
    from app.services.data_ingestion import _classify_weather_severity
    assert _classify_weather_severity(25, 10, "Thunderstorm") == "critical"


def test_classify_weather_severity_high():
    from app.services.data_ingestion import _classify_weather_severity
    assert _classify_weather_severity(25, 30, "Clear sky") == "high"


def test_classify_weather_severity_medium():
    from app.services.data_ingestion import _classify_weather_severity
    assert _classify_weather_severity(43, 5, "Clear sky") == "medium"


def test_classify_weather_severity_low():
    from app.services.data_ingestion import _classify_weather_severity
    assert _classify_weather_severity(22, 5, "Partly cloudy") == "low"


def test_mock_weather_data_structure():
    from app.services.data_ingestion import _mock_weather_data
    data = _mock_weather_data("TestCity")
    assert data["location"] == "TestCity"
    assert "temperature" in data
    assert "weather_condition" in data
    assert "severity" in data
    assert data.get("_mock") is True


def test_mock_traffic_data_structure():
    from app.services.data_ingestion import _mock_traffic_data
    data = _mock_traffic_data("Shanghai", "Rotterdam")
    assert data["origin"] == "Shanghai"
    assert data["destination"] == "Rotterdam"
    assert 0.0 <= data["traffic_index"] <= 1.0


def test_mock_port_data_structure():
    from app.services.data_ingestion import _mock_port_data
    ports = _mock_port_data()
    assert len(ports) > 0
    for p in ports:
        assert "name" in p
        assert 0.0 <= p["congestion_index"] <= 1.0


# ── Cache ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fetch_weather_returns_dict_on_api_failure():
    """Should return mock data (not crash) when API is unreachable."""
    from app.services.data_ingestion import fetch_weather_data
    with patch("app.services.data_ingestion._http_get_with_retry", return_value=None):
        with patch("app.services.data_ingestion.cache_get", return_value=None):
            result = await fetch_weather_data("TestCity")
    assert result is not None
    assert "location" in result


@pytest.mark.asyncio
async def test_fetch_weather_uses_cache():
    """Cache hit should return immediately without calling the API."""
    from app.services.data_ingestion import fetch_weather_data
    mock_cached = {"location": "Shanghai", "temperature": 22.0, "severity": "low"}
    with patch("app.services.data_ingestion.cache_get", return_value=mock_cached):
        result = await fetch_weather_data("Shanghai")
    assert result == mock_cached


@pytest.mark.asyncio
async def test_ingest_all_data_returns_report():
    """ingest_all_data should always return a report dict."""
    from app.services.data_ingestion import ingest_all_data
    with patch("app.services.data_ingestion.fetch_weather_data", return_value={"location": "X"}):
        with patch("app.services.data_ingestion.fetch_traffic_data", return_value={"traffic_index": 0.3}):
            with patch("app.services.data_ingestion.fetch_port_data", return_value=[]):
                report = await ingest_all_data(locations=["Shanghai"])
    assert "weather" in report
    assert "traffic" in report
    assert "ports" in report
    assert "duration_seconds" in report
