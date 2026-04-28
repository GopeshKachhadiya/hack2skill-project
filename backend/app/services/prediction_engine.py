

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from loguru import logger

from app.cache import cache_get, cache_set
from app.config import get_settings
from app.models.disruption import DisruptionPrediction
from app.models.shipment import Shipment

settings = get_settings()

DISRUPTION_TYPES = [
    "port_congestion",
    "weather_delay",
    "traffic_bottleneck",
    "route_closure",
]


def _severity_label(score: float) -> str:
    if score >= 0.75:
        return "critical"
    if score >= 0.50:
        return "high"
    if score >= 0.25:
        return "medium"
    return "low"


def _build_recommendation(disruption_type: str, severity: str) -> str:
    recs = {
        "port_congestion": {
            "critical": "Divert to alternative port immediately. Contact freight broker.",
            "high": "Consider alternative port routing; prepare delay contingency.",
            "medium": "Monitor port status every 2 hours.",
            "low": "No action required. Continue monitoring.",
        },
        "weather_delay": {
            "critical": "Halt departure. Severe weather advisory in effect.",
            "high": "Delay departure 12-24 hours to avoid weather window.",
            "medium": "Activate weather-aware routing; reduce speed recommendation.",
            "low": "Proceed with caution; standard monitoring applies.",
        },
        "traffic_bottleneck": {
            "critical": "Reroute via alternate corridor immediately.",
            "high": "Switch to alternate route within 4 hours.",
            "medium": "Prepare alternate route as contingency.",
            "low": "Monitor traffic; no immediate action.",
        },
        "route_closure": {
            "critical": "Emergency rerouting required. Notify all stakeholders.",
            "high": "Initiate rerouting protocol.",
            "medium": "Assess alternate routes; prepare ETA revision.",
            "low": "Monitor situation; standard protocol.",
        },
    }
    return recs.get(disruption_type, {}).get(severity, "Monitor situation closely.")


async def predict_disruptions(locations: Optional[List[str]] = None) -> List[Dict]:
    
    from app.services.forecasting import generate_location_forecast, DEFAULT_LOCATIONS

    if locations is None:
        locations = DEFAULT_LOCATIONS

    active_disruptions: List[Dict] = []

    for location in locations:
        try:
            forecast = await generate_location_forecast(location, horizon_hours=72)
            points = forecast.get("data", [])

            for point in points:
                prob = point.get("disruption_likelihood", 0.0)
                weather_sev = point.get("weather_severity", 0.0)
                
                if weather_sev >= 0.4:
                    prob = max(prob, weather_sev)
                
                sev = point.get("disruption_severity", prob * 0.8)
                if weather_sev >= 0.4:
                    sev = max(sev, weather_sev)

                if prob < settings.DISRUPTION_ALERT_THRESHOLD:
                    continue  # below alert threshold

                for dtype in DISRUPTION_TYPES:
                    type_prob = _adjust_probability_by_type(dtype, prob, forecast)
                    if type_prob < settings.HIGH_RISK_THRESHOLD:
                        continue

                    severity_label = _severity_label(sev)
                    disruption = {
                        "id": str(uuid.uuid4()),
                        "location": location,
                        "disruption_type": dtype,
                        "predicted_severity": round(sev, 4),
                        "probability": round(type_prob, 4),
                        "confidence_score": round(min(type_prob + 0.1, 1.0), 4),
                        "predicted_time_window": {
                            "start": point["timestamp"],
                            "end": (
                                datetime.fromisoformat(
                                    point["timestamp"].replace("Z", "+00:00")
                                ) + timedelta(hours=12)
                            ).isoformat(),
                        },
                        "recommended_action": _build_recommendation(dtype, severity_label),
                        "affected_shipments": 0,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "status": "active",
                    }
                    active_disruptions.append(disruption)

                break  # only use the peak probability point per location

        except Exception as exc:
            logger.error(f"Prediction failed for {location}: {exc}")

    await _persist_predictions(active_disruptions)

    cache_set("active_disruptions", active_disruptions, ttl=900)

    logger.info(
        f"Prediction engine: {len(active_disruptions)} active disruptions detected "
        f"across {len(locations)} locations."
    )
    return active_disruptions


def _adjust_probability_by_type(
    disruption_type: str,
    base_prob: float,
    forecast: Dict,
) -> float:
    
    conditions = forecast.get("current_conditions", {})
    weather_sev = conditions.get("weather_severity", 0.2)
    traffic_idx = conditions.get("traffic_index", 0.3)

    multipliers = {
        "port_congestion": 0.6 + traffic_idx * 0.4,
        "weather_delay": 0.4 + weather_sev * 0.6,
        "traffic_bottleneck": 0.5 + traffic_idx * 0.5,
        "route_closure": 0.3 + weather_sev * 0.3 + traffic_idx * 0.3,
    }
    m = multipliers.get(disruption_type, 0.5)
    return min(base_prob * m, 1.0)


async def _persist_predictions(disruptions: List[Dict]) -> None:
    
    if not disruptions:
        return
    try:
        records = []
        for d in disruptions:
            tw = d.get("predicted_time_window", {})
            records.append(DisruptionPrediction(
                id=d["id"],
                disruption_type=d["disruption_type"],
                location=d["location"],
                predicted_severity=d["predicted_severity"],
                probability=d["probability"],
                confidence_score=d["confidence_score"],
                predicted_window_start=datetime.fromisoformat(
                    tw["start"].replace("Z", "+00:00")
                ) if tw.get("start") else None,
                predicted_window_end=datetime.fromisoformat(
                    tw["end"].replace("Z", "+00:00")
                ) if tw.get("end") else None,
                recommended_action=d.get("recommended_action"),
                affected_shipments_count=d.get("affected_shipments", 0),
                status="active",
            ))
        await DisruptionPrediction.insert_many(records)
        logger.debug(f"Persisted {len(records)} disruption predictions.")
    except Exception as exc:
        logger.warning(f"Disruption DB persist failed: {exc}")


def get_active_disruptions_from_cache() -> List[Dict]:
    
    return cache_get("active_disruptions") or []