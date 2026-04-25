"""
services/forecasting.py — Prophet-based disruption forecasting service.

Orchestrates the feature-engineering → model-prediction → DB-storage pipeline.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

import pandas as pd
from loguru import logger

from app.cache import cache_get, cache_set
from app.config import get_settings
from app.database import SessionLocal
from app.ml.prophet_model import MODEL_TYPES, predict_with_prophet
from app.models.disruption import ProphetForecast
from app.services.data_ingestion import fetch_weather_data, fetch_traffic_data

settings = get_settings()

# Key shipping hubs covered by the system
DEFAULT_LOCATIONS = [
    "Port of Shanghai",
    "Port of Singapore",
    "Port of Rotterdam",
    "Port of Los Angeles",
    "Suez Canal",
    "Strait of Malacca",
]


async def generate_location_forecast(
    location: str,
    horizon_hours: int = 72,
) -> Dict:
    """
    Generate a full 72-hour disruption forecast for *location*.

    Steps:
      1. Fetch live weather & traffic data
      2. Run all 4 Prophet models
      3. Persist forecasts to PostgreSQL
      4. Cache result in Redis (15 min)
      5. Return structured forecast response

    Returns
    -------
    dict with ``location``, ``forecast_generated_at``, and ``data`` list.
    """
    cache_key = f"forecast:{location.lower().replace(' ', '_')}:{horizon_hours}h"
    cached = cache_get(cache_key)
    if cached:
        logger.debug(f"Forecast cache HIT: {location}")
        return cached

    # ── Fetch live context ────────────────────────────────────────────────────
    weather = await fetch_weather_data(location)
    traffic = await fetch_traffic_data(location, "Rotterdam")   # arbitrary pair

    weather_severity = _severity_to_float(weather.get("severity", "low") if weather else "low")
    traffic_index = float(traffic.get("traffic_index", 0.3)) if traffic else 0.3

    # ── Run Prophet models in parallel (synchronous calls, thread pool feasible)
    forecasts_by_model: Dict[str, List] = {}
    for mtype in MODEL_TYPES:
        try:
            forecasts_by_model[mtype] = predict_with_prophet(
                model_type=mtype,
                location=location,
                horizon_hours=horizon_hours,
                live_weather_severity=weather_severity,
                live_traffic_index=traffic_index,
            )
        except Exception as exc:
            logger.error(f"Prophet prediction failed {mtype}@{location}: {exc}")
            forecasts_by_model[mtype] = []

    # ── Assemble unified time-series ──────────────────────────────────────────
    likelihood_series = forecasts_by_model.get("disruption_likelihood", [])
    severity_series = forecasts_by_model.get("disruption_severity", [])

    data_points = []
    for i, point in enumerate(likelihood_series):
        sev = severity_series[i]["forecast_value"] if i < len(severity_series) else 0.3
        data_points.append({
            "timestamp": point["timestamp"],
            "disruption_likelihood": round(point["forecast_value"], 4),
            "disruption_likelihood_upper": round(point["upper"], 4),
            "disruption_likelihood_lower": round(point["lower"], 4),
            "disruption_severity": round(sev, 4),
            "weather_severity": round(weather_severity, 4),
            "traffic_index": round(traffic_index, 4),
        })

    # ── Persist to DB ─────────────────────────────────────────────────────────
    _persist_forecasts(location, likelihood_series)

    result = {
        "location": location,
        "forecast_generated_at": datetime.now(timezone.utc).isoformat(),
        "horizon_hours": horizon_hours,
        "current_conditions": {
            "weather_severity": weather_severity,
            "traffic_index": traffic_index,
            "weather_condition": weather.get("weather_condition", "unknown") if weather else "unknown",
        },
        "data": data_points,
    }

    cache_set(cache_key, result, ttl=settings.REDIS_CACHE_TTL_FORECAST)
    logger.info(f"Forecast generated: {location} → {len(data_points)} points")
    return result


def _severity_to_float(severity: str) -> float:
    """Map severity label to a 0-1 float."""
    return {"low": 0.1, "medium": 0.35, "high": 0.65, "critical": 0.9}.get(
        severity.lower(), 0.1
    )


def _persist_forecasts(location: str, series: List[Dict]) -> None:
    """Write forecast data points to prophet_forecasts table."""
    if not series:
        return
    try:
        db = SessionLocal()
        now = datetime.now(timezone.utc)
        records = [
            ProphetForecast(
                id=uuid.uuid4(),
                disruption_type="disruption_likelihood",
                location=location,
                forecast_value=pt["forecast_value"],
                forecast_lower=pt.get("lower"),
                forecast_upper=pt.get("upper"),
                forecast_timestamp=datetime.fromisoformat(pt["timestamp"]),
                model_trained_at=now,
                training_data_points=2160,
            )
            for pt in series
        ]
        db.bulk_save_objects(records)
        db.commit()
        db.close()
        logger.debug(f"Persisted {len(records)} forecast rows for {location}")
    except Exception as exc:
        logger.warning(f"Forecast DB persist failed for {location}: {exc}")


async def generate_all_location_forecasts() -> Dict:
    """
    Trigger forecast generation for all default hub locations.
    Used by the background scheduler.
    """
    import asyncio
    results = {"success": [], "failed": []}
    tasks = [generate_location_forecast(loc) for loc in DEFAULT_LOCATIONS]
    responses = await asyncio.gather(*tasks, return_exceptions=True)

    for loc, resp in zip(DEFAULT_LOCATIONS, responses):
        if isinstance(resp, Exception):
            results["failed"].append({"location": loc, "error": str(resp)})
        else:
            results["success"].append(loc)

    logger.info(
        f"All-location forecast done: "
        f"{len(results['success'])} OK, {len(results['failed'])} failed."
    )
    return results
