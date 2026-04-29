

from __future__ import annotations

import asyncio
import uuid
import random
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from loguru import logger
from pydantic import BaseModel, Field
from app.config import get_settings
from app.ml.model_evaluation import build_mock_performance_report
from app.models.disruption import DisruptionPrediction
from app.models.shipment import Shipment
from app.services.data_ingestion import ingest_all_data
from app.services.forecasting import generate_location_forecast
from app.services.prediction_engine import get_active_disruptions_from_cache
from app.routing.engine import RoutingEngine
from app.routing.constants import PORT_COORDS, SHIPMENT_STATUSES, SHIPMENT_CARGO, _coord_for_location

settings = get_settings()
router = APIRouter()
routing_engine = RoutingEngine()
_sample_shipments_cache: list[Dict[str, Any]] | None = None
PROJECT_SCOPE_HINTS = {
    "shipment",
    "shipments",
    "ship",
    "shp-",
    "route",
    "routes",
    "sea",
    "maritime",
    "port",
    "ports",
    "cargo",
    "delay",
    "disruption",
    "disruptions",
    "forecast",
    "forecasts",
    "alert",
    "alerts",
    "tracking",
    "analytics",
    "dashboard",
    "anvayaa",
    "platform",
    "backend",
    "frontend",
    "api",
    "logistics",
    "risk",
    "critical",
    "delayed",
    "status",
}
OFF_TOPIC_HINTS = {
    "football",
    "cricket",
    "match",
    "movie",
    "movies",
    "actor",
    "actress",
    "celebrity",
    "politics",
    "election",
    "recipe",
    "song",
    "music",
    "exam",
    "school",
    "college",
}



class ShipmentAnalysisRequest(BaseModel):
    origin: str = Field(..., example="Shanghai")
    destination: str = Field(..., example="Rotterdam")
    departure_time: Optional[datetime] = None
    cargo_type: Optional[str] = Field(None, example="electronics")
    priority: Optional[str] = Field("normal", example="urgent")


class TimeWindow(BaseModel):
    start: str
    end: str


class DisruptionResponse(BaseModel):
    id: str
    location: str
    coords: Optional[Dict] = None
    radius: Optional[float] = None
    disruption_type: str
    predicted_severity: float
    probability: float
    confidence_score: float
    predicted_time_window: Optional[Dict] = None
    recommended_action: Optional[str] = None
    affected_shipments: int = 0
    status: str


class ForecastPoint(BaseModel):
    timestamp: str
    disruption_likelihood: float
    disruption_likelihood_upper: float
    disruption_likelihood_lower: float
    disruption_severity: float
    weather_severity: float
    traffic_index: float


class ForecastResponse(BaseModel):
    location: str
    forecast_generated_at: str
    horizon_hours: int
    current_conditions: Dict
    data: List[ForecastPoint]


class RouteOptimizationRequest(BaseModel):
    waypoints: List[Dict] = Field(
        ...,
        example=[{"lat": 31.2, "lng": 121.5}, {"lat": 51.9, "lng": 4.5}]
    )
    constraints: Optional[Dict] = None
    consider_disruptions: bool = True


class ShipmentPoint(BaseModel):
    lat: float
    lng: float


class ShipmentResponse(BaseModel):
    id: str
    origin: str
    destination: str
    originCoords: ShipmentPoint
    destinationCoords: ShipmentPoint
    currentCoords: ShipmentPoint
    departureTime: str
    expectedArrival: str
    currentStatus: str
    cargoType: str
    cargoValue: float
    priority: str
    riskScore: float
    delay: float
    route: List[ShipmentPoint]


class AssistantMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class AssistantChatRequest(BaseModel):
    messages: List[AssistantMessage] = Field(..., min_length=1, max_length=24)
    context: Optional[Dict[str, List[Dict[str, Any]]]] = None


class AssistantChatResponse(BaseModel):
    reply: str
    scoped: bool = True
    retryAfterSeconds: Optional[int] = None



@router.get("/health", tags=["System"])
async def health_check() -> Dict:
    
    from app.cache import get_redis_client
    services: Dict[str, str] = {}

    try:
        get_redis_client().ping()
        services["redis"] = "ok"
    except Exception:
        services["redis"] = "unavailable"

    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": services,
    }


@router.get(
    "/shipments",
    response_model=Dict[str, List[ShipmentResponse]],
    tags=["Shipments"],
    summary="Get shipment records for the dashboard",
)
async def get_shipments(
    limit: int = Query(75, ge=1, le=500),
) -> Dict[str, List[Dict[str, Any]]]:
    
    shipments = await _get_shipments_snapshot(limit)
    return {"shipments": shipments}


def _status_summary(status: str) -> tuple[float, float]:
    if status == "delivered":
        return 0.08, 0.0
    if status == "critical":
        return 0.9, random.uniform(10, 48)
    if status == "disrupted":
        return 0.8, random.uniform(6, 36)
    if status == "delayed":
        return 0.55, random.uniform(1, 12)
    return 0.18, 0.0


def _serialize_shipment_record(record: Shipment) -> Dict[str, Any]:
    origin_coords = _coord_for_location(record.origin)
    destination_coords = _coord_for_location(record.destination)
    current_status = {
        "pending": "on_time",
        "in_transit": "on_time",
        "delayed": "delayed",
        "delivered": "delivered",
        "cancelled": "critical",
    }.get(record.current_status, "on_time")
    risk_score, delay = _status_summary(current_status)
    departure = record.departure_time or datetime.now(timezone.utc) - timedelta(hours=random.randint(12, 240))
    expected_arrival = record.expected_arrival or departure + timedelta(hours=random.randint(24, 96))
    
    waypoints = _get_maritime_route_points(record.origin, record.destination, origin_coords, destination_coords)
    currentCoords = waypoints[len(waypoints)//2] if waypoints else origin_coords

    return {
        "id": str(record.id),
        "origin": record.origin,
        "destination": record.destination,
        "originCoords": origin_coords,
        "destinationCoords": destination_coords,
        "currentCoords": currentCoords,
        "departureTime": departure.isoformat(),
        "expectedArrival": expected_arrival.isoformat(),
        "currentStatus": current_status,
        "cargoType": record.cargo_type or random.choice(SHIPMENT_CARGO),
        "cargoValue": float(random.randint(50000, 5000000)),
        "priority": record.priority or "normal",
        "riskScore": round(risk_score, 4),
        "delay": round(delay, 1),
        "route": [origin_coords] + waypoints + [destination_coords],
    }

def _get_maritime_route_points(origin: str, destination: str, o_coords: Dict, d_coords: Dict) -> List[Dict[str, float]]:
    o_name = origin.lower()
    d_name = destination.lower()

    if ("cape town" in o_name or "cape town" in d_name) and \
       (d_coords["lat"] > 0 or o_coords["lat"] > 0):
        return [{"lat": -5.0, "lng": 5.0}, {"lat": 20.0, "lng": -20.0}, {"lat": 40.0, "lng": -10.0}]
        
    if (o_coords["lng"] > 60 and d_coords["lng"] < 20) or \
       (d_coords["lng"] > 60 and o_coords["lng"] < 20):
        return [{"lat": 5.0, "lng": 80.0}, {"lat": 12.0, "lng": 55.0}, {"lat": 15.0, "lng": 40.0}, {"lat": 35.0, "lng": 15.0}, {"lat": 45.0, "lng": -8.0}]
        
    if (o_coords["lng"] > 100 and d_coords["lng"] < -50) or \
       (d_coords["lng"] > 100 and o_coords["lng"] < -50):
        return [{"lat": 20.0, "lng": 150.0}, {"lat": 30.0, "lng": -160.0}, {"lat": 25.0, "lng": -130.0}]

    if (o_coords["lng"] > -20 and o_coords["lng"] < 20 and d_coords["lng"] < -50) or \
       (d_coords["lng"] > -20 and d_coords["lng"] < 20 and o_coords["lng"] < -50):
        return [{"lat": 40.0, "lng": -30.0}, {"lat": 30.0, "lng": -50.0}]
        
    return [{
        "lat": round((o_coords["lat"] + d_coords["lat"]) / 2, 4),
        "lng": round((o_coords["lng"] + d_coords["lng"]) / 2, 4),
    }]


def _generate_sample_shipments(count: int = 75, seed: int = 20260426) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    ports = list(PORT_COORDS.keys())
    shipments: List[Dict[str, Any]] = []
    for idx in range(count):
        origin = rng.choice(ports)
        destination = rng.choice([p for p in ports if p != origin])
        status = rng.choices(SHIPMENT_STATUSES, weights=[0.42, 0.24, 0.12, 0.11, 0.11], k=1)[0]
        risk_score, delay = _status_summary(status)
        departure = datetime.now(timezone.utc) - timedelta(hours=rng.randint(12, 240))
        expected_arrival = departure + timedelta(hours=rng.randint(24, 500))
        origin_coords = PORT_COORDS[origin]
        destination_coords = PORT_COORDS[destination]
        waypoints = _get_maritime_route_points(origin, destination, origin_coords, destination_coords)
        currentCoords = waypoints[len(waypoints)//2] if waypoints else origin_coords
        shipments.append({
            "id": f"SHP-{1000 + idx}",
            "origin": f"Port of {origin}" if "Port of" not in origin else origin,
            "destination": f"Port of {destination}" if "Port of" not in destination else destination,
            "originCoords": origin_coords,
            "destinationCoords": destination_coords,
            "currentCoords": currentCoords,
            "departureTime": departure.isoformat(),
            "expectedArrival": expected_arrival.isoformat(),
            "currentStatus": status,
            "cargoType": rng.choice(SHIPMENT_CARGO),
            "cargoValue": float(rng.randint(50000, 5000000)),
            "priority": rng.choice(["normal", "urgent", "time-sensitive"]),
            "riskScore": round(risk_score, 4),
            "delay": round(delay, 1),
            "route": [origin_coords] + waypoints + [destination_coords],
        })
    return shipments


async def _get_shipments_snapshot(limit: int = 75) -> List[Dict[str, Any]]:
    global _sample_shipments_cache

    try:
        records = await Shipment.find_all().sort("-created_at").limit(limit).to_list()
        shipments = [_serialize_shipment_record(record) for record in records]
        if shipments:
            return shipments
    except Exception as exc:
        logger.warning(f"Shipment DB unavailable, falling back to cached sample shipments: {exc}")

    target_count = max(75, limit)
    if _sample_shipments_cache is None or len(_sample_shipments_cache) < target_count:
        _sample_shipments_cache = _generate_sample_shipments(target_count)

    return _sample_shipments_cache[:limit]


def _extract_shipment_id(message: str) -> str | None:
    match = re.search(r"\bSHP-\d{4,}\b", message.upper())
    return match.group(0) if match else None


def _is_obviously_off_topic(message: str) -> bool:
    normalized = " ".join(message.lower().split())
    if _extract_shipment_id(normalized) or _is_greeting(normalized):
        return False
    if any(hint in normalized for hint in PROJECT_SCOPE_HINTS):
        return False
    return any(hint in normalized for hint in OFF_TOPIC_HINTS)


def _is_project_scoped_chat(message: str) -> bool:
    return True


def _project_scope_refusal() -> str:
    return (
        "I can only help with this Anvayaa supply-chain project. "
        "Ask me about shipment tracking, route optimization, disruptions, forecasts, alerts, or platform behavior."
    )


def _is_greeting(message: str) -> bool:
    normalized = message.strip().lower()
    return normalized in {"hi", "hello", "hey", "hii", "hola", "good morning", "good afternoon", "good evening"}


def _normalize_context_shipment(shipment: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(shipment.get("id", "")),
        "origin": str(shipment.get("origin", "Unknown")),
        "destination": str(shipment.get("destination", "Unknown")),
        "cargoType": str(shipment.get("cargoType", shipment.get("cargo_type", "Unknown"))),
        "priority": str(shipment.get("priority", "normal")),
        "currentStatus": str(shipment.get("currentStatus", shipment.get("current_status", "unknown"))),
        "riskScore": float(shipment.get("riskScore", shipment.get("risk_score", 0.0)) or 0.0),
        "delay": float(shipment.get("delay", 0.0) or 0.0),
        "expectedArrival": str(shipment.get("expectedArrival", shipment.get("expected_arrival", "Unknown"))),
        "cargoValue": float(shipment.get("cargoValue", shipment.get("cargo_value", 0.0)) or 0.0),
    }


def _normalize_context_disruption(disruption: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(disruption.get("id", "")),
        "location": str(disruption.get("location", "Unknown")),
        "disruption_type": str(disruption.get("disruptionType", disruption.get("disruption_type", "unknown"))),
        "predicted_severity": float(disruption.get("predictedSeverity", disruption.get("predicted_severity", 0.0)) or 0.0),
        "probability": float(disruption.get("probability", 0.0) or 0.0),
        "status": str(disruption.get("status", "active")),
    }


async def _resolve_assistant_shipments(context: Optional[Dict[str, List[Dict[str, Any]]]]) -> List[Dict[str, Any]]:
    context_shipments = (context or {}).get("shipments") or []
    if context_shipments:
        return [_normalize_context_shipment(shipment) for shipment in context_shipments]
    return await _get_shipments_snapshot(200)


async def _resolve_assistant_disruptions(context: Optional[Dict[str, List[Dict[str, Any]]]]) -> List[Dict[str, Any]]:
    context_disruptions = (context or {}).get("disruptions") or []
    if context_disruptions:
        return [_normalize_context_disruption(disruption) for disruption in context_disruptions]

    disruptions_res = await get_disruptions(location=None, severity=None, disruption_type=None, limit=8)
    return disruptions_res.get("disruptions", [])


def _extract_retry_after_seconds_from_text(text: str) -> int | None:
    if not text:
        return None

    integer_match = re.search(r"retry(?: after)?\D+(\d+)\s*(second|seconds|sec|s)\b", text, re.IGNORECASE)
    if integer_match:
        return max(int(integer_match.group(1)), 1)

    minute_match = re.search(r"retry(?: after)?\D+(\d+)\s*(minute|minutes|min|m)\b", text, re.IGNORECASE)
    if minute_match:
        return max(int(minute_match.group(1)) * 60, 60)

    generic_seconds_match = re.search(r"(\d+)\s*(second|seconds|sec|s)\b", text, re.IGNORECASE)
    if generic_seconds_match:
        return max(int(generic_seconds_match.group(1)), 1)

    generic_minutes_match = re.search(r"(\d+)\s*(minute|minutes|min|m)\b", text, re.IGNORECASE)
    if generic_minutes_match:
        return max(int(generic_minutes_match.group(1)) * 60, 60)

    return None


def _extract_retry_after_seconds(response: httpx.Response) -> int:
    header_value = response.headers.get("Retry-After")
    if header_value:
        if header_value.isdigit():
            return max(int(header_value), 1)
        try:
            retry_at = datetime.strptime(header_value, "%a, %d %b %Y %H:%M:%S GMT").replace(tzinfo=timezone.utc)
            delta = int((retry_at - datetime.now(timezone.utc)).total_seconds())
            if delta > 0:
                return delta
        except ValueError:
            pass

    try:
        payload = response.json()
        payload_text = str(payload)
    except ValueError:
        payload_text = response.text

    return _extract_retry_after_seconds_from_text(payload_text) or 60


def _build_rate_limit_reply(retry_after_seconds: int) -> str:
    retry_after_seconds = max(retry_after_seconds, 1)
    return (
        "The Gemini API rate limit is active right now. "
        f"Please wait about **{retry_after_seconds} seconds** before sending the next assistant message."
    )


def _format_shipment_details(shipment: Dict[str, Any]) -> str:
    return "\n".join([
        f"Here are the details for **{shipment['id']}**:",
        f"* **Origin:** {shipment['origin'].replace('_', ' ')}",
        f"* **Destination:** {shipment['destination'].replace('_', ' ')}",
        f"* **Cargo Type:** {shipment['cargoType']}",
        f"* **Priority:** {shipment['priority'].replace('-', ' ')}",
        f"* **Status:** **{shipment['currentStatus'].replace('_', ' ')}**",
        f"* **Risk Score:** {round(float(shipment['riskScore']) * 100, 1)}%",
        f"* **Delay:** {shipment['delay']} hours",
        f"* **ETA:** {shipment['expectedArrival']}",
        f"* **Cargo Value:** ${float(shipment['cargoValue']):,.0f}",
    ])


async def _build_structured_assistant_reply(
    latest_user_message: str,
    context: Optional[Dict[str, List[Dict[str, Any]]]] = None,
) -> str | None:
    import math
    from app.api.chat_analytics import (
        highest_late_risk, pct_at_risk, cargo_value_at_risk,
        most_delay_origin, avg_delay, cargo_type_disruption_rate,
        suez_impact, safest_route, suez_vs_cape, routing_mode_comparison,
        likely_escalation, compounded_risk, delay_decision,
        above_avg_weather_ports, compare_reroute_priority,
        total_critical_value, prediction_accuracy_context,
    )
    normalized = " ".join(latest_user_message.lower().split())
    shipments = await _resolve_assistant_shipments(context)
    disruptions = await _resolve_assistant_disruptions(context)

    if _is_greeting(latest_user_message):
        return (
            "Hi! I can help with this Anvayaa supply-chain project. Ask me about shipments, route optimization, "
            "sea-only routing, disruptions, alerts, forecasts, or a shipment ID like **SHP-1015**."
        )

    # ── multi-shipment compare — must run BEFORE single-ID lookup ──────────────
    ids_in_msg_early = re.findall(r"\bSHP-\d{4,}\b", latest_user_message.upper())
    if len(ids_in_msg_early) >= 2 and any(kw in normalized for kw in ["reroute", "first", "priority", "compare", "which", "urgency", "based on"]):
        from app.api.chat_analytics import compare_reroute_priority
        s1 = next((s for s in shipments if s["id"].upper() == ids_in_msg_early[0]), None)
        s2 = next((s for s in shipments if s["id"].upper() == ids_in_msg_early[1]), None)
        if s1 and s2:
            return compare_reroute_priority(s1, s2)

    shipment_id = _extract_shipment_id(latest_user_message)
    if shipment_id:
        match = next((shipment for shipment in shipments if shipment["id"].upper() == shipment_id), None)
        if match:
            return _format_shipment_details(match)
        return f"I could not find **{shipment_id}** in the current shipment dataset shown by this app."

    if "critical shipment" in normalized or "critical shipments" in normalized:
        critical = [shipment for shipment in shipments if shipment["currentStatus"] == "critical"][:8]
        if not critical:
            return "There are no shipments currently marked as **critical** in the live dataset."
        lines = ["Here are the current **critical shipments**:"]
        for shipment in critical:
            lines.append(
                f"* **{shipment['id']}**: {shipment['origin'].replace('_', ' ')} -> "
                f"{shipment['destination'].replace('_', ' ')}, delay {shipment['delay']}h"
            )
        return "\n".join(lines)

    if "delayed shipment" in normalized or "delayed shipments" in normalized:
        delayed = [shipment for shipment in shipments if shipment["currentStatus"] == "delayed"][:8]
        if not delayed:
            return "There are no shipments currently marked as **delayed** in the live dataset."
        lines = ["Here are the current **delayed shipments**:"]
        for shipment in delayed:
            lines.append(
                f"* **{shipment['id']}**: {shipment['origin'].replace('_', ' ')} -> "
                f"{shipment['destination'].replace('_', ' ')}, delay {shipment['delay']}h"
            )
        return "\n".join(lines)

    # Suez escalation must run before generic 'how many shipments' catch
    if "suez" in normalized and ("escalat" in normalized or "affect" in normalized or ("how many" in normalized) or "impact" in normalized):
        from app.api.chat_analytics import suez_impact
        return suez_impact(shipments, disruptions)

    if "shipment" in normalized and ("how many" in normalized or "count" in normalized):
        return f"There are currently **{len(shipments)} shipments** in the dataset used by this app."

    if "recent shipment" in normalized or "recent shipments" in normalized or "what are my shipments" in normalized or "list shipments" in normalized:
        if not shipments:
            return "No shipments found in the current system dataset."
        lines = ["Based on the current real-time data, here are the most recent shipments:"]
        for shipment in shipments[:10]:
            lines.append(
                f"* **{shipment['id']}**: {shipment['origin'].replace('_', ' ')} to "
                f"{shipment['destination'].replace('_', ' ')} (**{shipment['currentStatus'].replace('_', ' ')}**)"
            )
        return "\n".join(lines)

    # Safest-route questions must run before generic Mumbai→Rotterdam handler
    if "safest" in normalized and "route" in normalized:
        from app.api.chat_analytics import safest_route
        port_matches = re.findall(r"(mumbai|shanghai|rotterdam|hamburg|dubai|singapore|colombo|los angeles|busan|antwerp)", normalized)
        o = port_matches[0].title() if len(port_matches) > 0 else "Origin"
        d = port_matches[1].title() if len(port_matches) > 1 else "Destination"
        return safest_route(o, d, disruptions)

    if ("mumbai" in normalized and "rotterdam" in normalized and "optimize" not in normalized and "safest" not in normalized) or ("optimize" in normalized and "route" in normalized):
        return "\n".join([
            "To optimize a route (e.g., from **Mumbai** to **Rotterdam**), please use the **Route Optimization** page on the sidebar.",
            "* **Step 1:** Select **Mumbai** as your Origin Port.",
            "* **Step 2:** Select **Rotterdam** as your Destination Port.",
            "* **Step 3:** Choose between **Sea + Land** (A* search) or **Only Sea** (Bezier curves) modes.",
            "* **Step 4:** Click **'Find Optimized Route'** to see the live risk analysis, distance, and ETA calculation.",
            "The platform will then calculate the safest path avoiding any active disruptions like the ones currently reported in the Suez Canal or North Sea."
        ])

    if "shipment id" in normalized or "tell me about shipments" in normalized or "shipment details" in normalized:
        return "\n".join([
            "You can ask me about any specific shipment ID shown on the dashboard (e.g., **SHP-1002**).",
            "I can provide details on its origin, destination, cargo value, risk score, and any predicted delays.",
            "Currently, we are tracking **" + str(len(shipments)) + " shipments** across global lanes including Shanghai, Rotterdam, Dubai, and Mumbai."
        ])

    if "active disruptions" in normalized or "current disruptions" in normalized or "disruptions" == normalized:
        if not disruptions:
            return "There are no active disruptions in the current app dataset."
        lines = ["Here are the current **active disruptions**:"]
        for disruption in disruptions[:8]:
            lines.append(
                f"* **{disruption['disruption_type'].replace('_', ' ').title()}** at "
                f"{disruption['location'].replace('_', ' ')} "
                f"(severity {round(float(disruption.get('predicted_severity', 0.0)), 2)})"
            )
        return "\n".join(lines)

    # ── Total disruptions count ──────────────────────────────────────────────
    if ("total disruption" in normalized or "number of disruption" in normalized
            or ("how many" in normalized and "disruption" in normalized)):
        return (
            f"There are currently **{len(disruptions)} active disruptions** tracked across all monitored locations "
            f"in the Anvayaa platform. Use the **Disruptions** page to see all details on the map."
        )

    # ── Model precision / recall / accuracy metrics ──────────────────────────
    if any(kw in normalized for kw in ["precision", "recall", "f1", "f1 score", "model accuracy", "model performance", "accuracy"]):
        report = build_mock_performance_report()
        acc = report["model_accuracy"]
        cov = report["coverage"]
        return "\n".join([
            "Here are the current **Prophet ML Model Performance** metrics:",
            f"* **Precision:** {round(acc['precision'] * 100, 1)}%",
            f"* **Recall:** {round(acc['recall'] * 100, 1)}%",
            f"* **F1 Score:** {round(acc['f1_score'] * 100, 1)}%",
            f"* **MAPE:** {acc['mape']}%",
            f"* **Total Disruptions Predicted:** {cov['total_disruptions_predicted']:,}",
            f"* **Correct Predictions:** {cov['correct_predictions']:,}",
            f"* **Avg Hours to Disruption:** {cov['avg_hours_to_disruption']}h",
        ])

    # ── Avg hours to disruption ──────────────────────────────────────────────
    if "avg hour" in normalized or "average hour" in normalized or "hours to disruption" in normalized:
        report = build_mock_performance_report()
        cov = report["coverage"]
        return (
            f"The platform currently predicts disruptions on average **{cov['avg_hours_to_disruption']} hours** "
            f"before they occur, providing actionable lead time to reroute or intervene."
        )

    # ── Port weather ─────────────────────────────────────────────────────────
    port_weather_match = re.search(r"weather.*?(?:of|at|for|in)?\s+port\s+of\s+([\w\s]+)", normalized)
    if not port_weather_match:
        port_weather_match = re.search(r"(?:of|at|for|in)?\s*port\s+of\s+([\w\s]+?)\s*(?:weather|condition|status)?", normalized)
    if port_weather_match and ("weather" in normalized or "condition" in normalized or "forecast" in normalized):
        loc_name = port_weather_match.group(1).strip().title()
        matched = next(
            (d for d in disruptions if loc_name.lower() in d["location"].lower()), None
        )
        if matched:
            return (
                f"Current conditions at **Port of {loc_name}**: "
                f"**{matched['disruption_type'].replace('_', ' ').title()}** event detected, "
                f"severity **{round(float(matched.get('predicted_severity', 0.0)), 2)}**, "
                f"probability **{round(float(matched.get('probability', 0.0)) * 100, 0):.0f}%**. "
                f"\n\nAction recommended: {matched.get('recommended_action', 'Monitor closely.')}"
            )
        return (
            f"No active weather events currently flagged for **Port of {loc_name}**. "
            f"Conditions appear nominal. Check the **Live Map** for real-time disruption overlays."
        )

    # ── Port-to-port route / distance details ────────────────────────────────
    port_pair = re.findall(r"port\s+of\s+([\w\s]+?)(?:\s+to\s+|\s+and\s+)port\s+of\s+([\w\s]+)", normalized)
    if not port_pair:
        port_pair = re.findall(r"(?:between\s+)?port\s+of\s+([\w\s]+?)\s+(?:to|and|-)\s+port\s+of\s+([\w\s]+)", normalized)
    if port_pair:
        origin_name, dest_name = port_pair[0][0].strip().title(), port_pair[0][1].strip().title()
        origin_key = next((k for k in PORT_COORDS if origin_name.lower() in k.lower()), None)
        dest_key = next((k for k in PORT_COORDS if dest_name.lower() in k.lower()), None)
        if origin_key and dest_key:
            o = PORT_COORDS[origin_key]
            d = PORT_COORDS[dest_key]
            import math
            R = 6371
            lat1, lon1 = math.radians(o["lat"]), math.radians(o["lng"])
            lat2, lon2 = math.radians(d["lat"]), math.radians(d["lng"])
            dlat, dlon = lat2 - lat1, lon2 - lon1
            a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
            dist_km = round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))
            dist_nm = round(dist_km * 0.539957)
            transit_days = round(dist_km / (750 * 24), 1)  # ~750 km/day average vessel speed
            return "\n".join([
                f"**Route: Port of {origin_name} → Port of {dest_name}**",
                f"* **Great-Circle Distance:** {dist_km:,} km ({dist_nm:,} nautical miles)",
                f"* **Estimated Transit Time:** ~{transit_days} days (at standard cargo vessel speed)",
                f"* **Origin Coordinates:** {o['lat']}°, {o['lng']}°",
                f"* **Destination Coordinates:** {d['lat']}°, {d['lng']}°",
                f"\nUse the **Route Optimization** page for a live disruption-aware route analysis between these ports.",
            ])
        return (
            f"I found a route query for **Port of {origin_name}** to **Port of {dest_name}**, but one or both ports "
            f"are not in the platform's port graph. Use the **Route Optimization** page to try with the available port list."
        )

    if "weather disruption" in normalized or "weather disruptions" in normalized:
        weather_disruptions = [
            disruption
            for disruption in disruptions
            if "weather" in disruption["disruption_type"].lower() and disruption.get("status") == "active"
        ]
        if not weather_disruptions:
            return "There are no active **weather disruptions** in the current app dataset."
        lines = ["Here are the current **active weather disruptions**:"]
        for disruption in weather_disruptions[:8]:
            lines.append(
                f"* **{disruption['location'].replace('_', ' ')}** "
                f"(severity {round(float(disruption.get('predicted_severity', 0.0)), 2)})"
            )
        return "\n".join(lines)

    if "severity" in normalized and "shanghai" in normalized:
        shanghai_disruptions = [
            disruption
            for disruption in disruptions
            if "shanghai" in disruption["location"].lower() and disruption.get("status") == "active"
        ]
        if not shanghai_disruptions:
            return "There are no active disruptions at **Port of Shanghai** in the current app dataset."
        top = max(shanghai_disruptions, key=lambda disruption: float(disruption.get("predicted_severity", 0.0)))
        return (
            f"Yes, there is an active **{top['disruption_type'].replace('_', ' ')}** disruption at "
            f"**{top['location'].replace('_', ' ')}** with a current severity of "
            f"**{round(float(top.get('predicted_severity', 0.0)), 2)}**."
        )

    if "route optimization" in normalized or "route optimiser" in normalized or "route optimizer" in normalized:
        return "\n".join([
            "The **route optimization** feature combines live network data with AI risk signals to improve shipment planning.",
            "* It compares origin and destination ports using the route graph already built into the platform.",
            "* In **Sea + Land** mode it can use the full route network, while **Only Sea** mode stays on maritime corridors.",
            "* It weighs distance, delay risk, and disruptions before recommending the optimized path.",
            "* The map then renders the optimized route and the dashboard cards show distance, transit time, cost, and risk impact.",
        ])

    if normalized.startswith("tell me about ") or normalized.startswith("what about "):
        query = normalized.replace("tell me about ", "", 1).replace("what about ", "", 1).strip()
        # Check if query matches a platform metric
        metrics_keywords = {
            "avg hours to disruption": "avg_hours_to_disruption",
            "average hours to disruption": "avg_hours_to_disruption",
            "total disruptions": "total_disruptions_predicted",
            "precision": "precision",
            "recall": "recall",
            "f1": "f1_score",
        }
        for kw, metric_key in metrics_keywords.items():
            if kw in query:
                report = build_mock_performance_report()
                if metric_key == "avg_hours_to_disruption":
                    val = report["coverage"]["avg_hours_to_disruption"]
                    return f"The **Average Hours to Disruption** metric is currently **{val} hours**. This measures how far in advance the Prophet ML model predicts disruption events."
                if metric_key == "total_disruptions_predicted":
                    val = report["coverage"]["total_disruptions_predicted"]
                    return f"The platform has predicted a total of **{val:,} disruptions** to date, with **{report['coverage']['correct_predictions']:,}** correct predictions."
                if metric_key in ["precision", "recall", "f1_score"]:
                    acc = report["model_accuracy"]
                    return (
                        f"Current model **{metric_key.replace('_', ' ').title()}**: "
                        f"**{round(acc.get(metric_key, acc.get('f1_score', 0)) * 100, 1)}%**. "
                        f"Precision: {round(acc['precision']*100,1)}%, Recall: {round(acc['recall']*100,1)}%, F1: {round(acc['f1_score']*100,1)}%."
                    )
        matched_disruptions = [
            disruption
            for disruption in disruptions
            if query and (
                query in disruption["location"].lower().replace("_", " ")
                or query in disruption["disruption_type"].lower().replace("_", " ")
                or all(
                    token in f"{disruption['disruption_type']} {disruption['location']}".lower().replace("_", " ")
                    for token in query.split()
                )
            )
        ]
        if matched_disruptions:
            lines = [f"Here is what I found about **{query.title()}**:"]
            for disruption in matched_disruptions[:5]:
                lines.append(
                    f"* **{disruption['disruption_type'].replace('_', ' ').title()}** at "
                    f"{disruption['location'].replace('_', ' ')} "
                    f"(severity {round(float(disruption.get('predicted_severity', 0.0)), 2)}, "
                    f"status {disruption.get('status', 'active')})"
                )
            return "\n".join(lines)

    # ── ANALYTICS: highest late risk ──────────────────────────────────────────
    if any(p in normalized for p in ["highest risk", "not arriving on time", "most at risk shipment", "worst shipment", "riskiest shipment"]):
        return highest_late_risk(shipments)

    # ── ANALYTICS: % at risk ──────────────────────────────────────────────────
    if ("percentage" in normalized or "percent" in normalized or "how many" in normalized) and "at risk" in normalized:
        return pct_at_risk(shipments)
    if "what percentage" in normalized and "shipment" in normalized:
        return pct_at_risk(shipments)

    # ── ANALYTICS: cargo value at risk ────────────────────────────────────────
    if ("cargo value" in normalized or "cargo worth" in normalized or "value" in normalized) and "at risk" in normalized:
        return cargo_value_at_risk(shipments)
    if "how much" in normalized and ("cargo" in normalized or "value" in normalized) and ("risk" in normalized or "disruption" in normalized):
        return cargo_value_at_risk(shipments)

    # ── ANALYTICS: worst origin port ─────────────────────────────────────────
    if ("origin port" in normalized or "which port" in normalized) and ("delay" in normalized or "causing" in normalized or "most" in normalized):
        return most_delay_origin(shipments)
    if "which" in normalized and "origin" in normalized and "delay" in normalized:
        return most_delay_origin(shipments)

    # ── ANALYTICS: average delay ─────────────────────────────────────────────
    if ("average delay" in normalized or "avg delay" in normalized or "mean delay" in normalized) and "shipment" in normalized:
        return avg_delay(shipments)

    # ── ANALYTICS: cargo type disruption rate ────────────────────────────────
    if "cargo type" in normalized and ("disruption" in normalized or "rate" in normalized or "highest" in normalized or "most" in normalized):
        return cargo_type_disruption_rate(shipments)
    if "which cargo" in normalized and ("disruption" in normalized or "risk" in normalized):
        return cargo_type_disruption_rate(shipments)

    # ── ANALYTICS: Suez escalation impact ────────────────────────────────────
    if "suez" in normalized and ("escalat" in normalized or "affect" in normalized or "how many" in normalized or "impact" in normalized):
        return suez_impact(shipments, disruptions)

    # ── ANALYTICS: Suez vs Cape of Good Hope ─────────────────────────────────
    if ("suez" in normalized and "cape" in normalized) or ("cape of good hope" in normalized) or ("faster" in normalized and "suez" in normalized):
        return suez_vs_cape(disruptions)

    # ── ANALYTICS: Sea+Land vs Sea-Only comparison ────────────────────────────
    if ("sea" in normalized and "land" in normalized and ("risk" in normalized or "difference" in normalized or "compare" in normalized or "vs" in normalized)):
        origin_kw = "Dubai" if "dubai" in normalized else ("Mumbai" if "mumbai" in normalized else "Origin Port")
        dest_kw = "Hamburg" if "hamburg" in normalized else ("Rotterdam" if "rotterdam" in normalized else "Destination Port")
        return routing_mode_comparison(origin_kw, dest_kw, disruptions)
    if "sea only" in normalized and ("risk" in normalized or "compare" in normalized or "difference" in normalized):
        return routing_mode_comparison("Origin", "Destination", disruptions)

    # ── ANALYTICS: which disruption will escalate ─────────────────────────────
    if ("escalat" in normalized or "escalate" in normalized) and ("disruption" in normalized or "next 24" in normalized or "forecast" in normalized):
        return likely_escalation(disruptions)
    if "most likely" in normalized and ("escalat" in normalized or "worsen" in normalized or "grow" in normalized):
        return likely_escalation(disruptions)

    # ── ANALYTICS: compounded risk of multiple disruptions ────────────────────
    if "compounded risk" in normalized or ("both" in normalized and "disruption" in normalized and ("active" in normalized or "risk" in normalized)):
        loc_matches = re.findall(r"(?:bay of biscay|rotterdam|suez|shanghai|mumbai|hamburg|singapore|dubai|colombo|gibraltar)", normalized)
        loc_a = loc_matches[0].title() if len(loc_matches) > 0 else "Bay of Biscay"
        loc_b = loc_matches[1].title() if len(loc_matches) > 1 else "Rotterdam"
        return compounded_risk(loc_a, loc_b, disruptions)

    # ── ANALYTICS: delay decision ─────────────────────────────────────────────
    if "should i delay" in normalized or ("delay" in normalized and "shipment" in normalized and ("should" in normalized or "48" in normalized or "24" in normalized)):
        hours_match = re.search(r"(\d+)\s*hours?", normalized)
        hours = int(hours_match.group(1)) if hours_match else 48
        port_matches = re.findall(r"(?:from|between)?\s*(singapore|mumbai|shanghai|rotterdam|hamburg|dubai|colombo|los angeles|busan)", normalized)
        origin_kw = port_matches[0].title() if len(port_matches) > 0 else "Singapore"
        dest_kw = port_matches[1].title() if len(port_matches) > 1 else "Hamburg"
        return delay_decision(origin_kw, dest_kw, hours, disruptions)

    # ── ANALYTICS: above-average weather ports ────────────────────────────────
    if ("above" in normalized and "average" in normalized and ("weather" in normalized or "severity" in normalized or "port" in normalized)):
        return above_avg_weather_ports(disruptions)
    if "which port" in normalized and ("weather" in normalized or "severe" in normalized or "worst" in normalized):
        return above_avg_weather_ports(disruptions)

    # ── ANALYTICS: compare two shipments for rerouting ────────────────────────
    ids_in_msg = re.findall(r"\bSHP-\d{4,}\b", latest_user_message.upper())
    if len(ids_in_msg) >= 2 and any(kw in normalized for kw in ["reroute", "first", "priority", "compare", "which", "urgency"]):
        s1 = next((s for s in shipments if s["id"].upper() == ids_in_msg[0]), None)
        s2 = next((s for s in shipments if s["id"].upper() == ids_in_msg[1]), None)
        if s1 and s2:
            return compare_reroute_priority(s1, s2)

    # ── ANALYTICS: total value of critical shipments ──────────────────────────
    if ("total value" in normalized or "total cargo" in normalized) and "critical" in normalized:
        return total_critical_value(shipments)
    if ("value" in normalized and "critical shipment" in normalized):
        return total_critical_value(shipments)

    # ── ANALYTICS: prediction accuracy in business terms ─────────────────────
    if ("f1" in normalized and "good enough" in normalized) or ("trust" in normalized and "prediction" in normalized) or ("roi" in normalized and "platform" in normalized):
        return prediction_accuracy_context()
    if "false alert" in normalized or "false positive" in normalized:
        return prediction_accuracy_context()
    if "how accurate" in normalized or "accuracy" in normalized and "model" in normalized:
        return prediction_accuracy_context()

    # ── ANALYTICS: safest route (generic) ────────────────────────────────────
    if "safest route" in normalized or ("safest" in normalized and "route" in normalized):
        port_matches = re.findall(r"(mumbai|shanghai|rotterdam|hamburg|dubai|singapore|colombo|los angeles|busan|antwerp)", normalized)
        o = port_matches[0].title() if len(port_matches) > 0 else "Origin"
        d = port_matches[1].title() if len(port_matches) > 1 else "Destination"
        return safest_route(o, d, disruptions)

    return None


async def _generate_gemini_project_reply(
    messages: List[AssistantMessage],
    context: Optional[Dict[str, List[Dict[str, Any]]]] = None,
) -> str:
    current_settings = get_settings()
    request_messages = messages[-10:]
    latest_user_message = next((message.content for message in reversed(request_messages) if message.role == "user"), "")

    if not latest_user_message:
        raise HTTPException(status_code=400, detail="A user message is required.")

    if not current_settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured on the backend.",
        )

    disruption_text = "Data temporarily unavailable."
    shipment_text = "Data temporarily unavailable."

    try:
        disruptions_info = await _resolve_assistant_disruptions(context)
        if disruptions_info:
            disruption_text = "\n".join([f"- {d['disruption_type'].replace('_', ' ').title()} at {d['location'].replace('_', ' ')} (Severity: {d.get('predicted_severity', 0.0)})" for d in disruptions_info])
        else:
            disruption_text = "No active major disruptions reported."
    except Exception as e:
        logger.error(f"Assistant disruption context failed: {e}")

    try:
        shipments_info = await _resolve_assistant_shipments(context)
        shipment_id = _extract_shipment_id(latest_user_message)
        if shipment_id:
            matched = next((shipment for shipment in shipments_info if shipment["id"].upper() == shipment_id), None)
            if matched:
                shipment_text = _format_shipment_details(matched)
            else:
                shipment_text = f"Shipment {shipment_id} is not present in the current shipment dataset."
        elif shipments_info:
            shipment_text = "\n".join([
                f"- ID: {s['id']}, {s['origin'].replace('_', ' ')} -> {s['destination'].replace('_', ' ')}, "
                f"Status: {s['currentStatus'].replace('_', ' ')}"
                for s in shipments_info[:10]
            ])
        else:
            shipment_text = "No active shipments found in system."
    except Exception as e:
        logger.error(f"Assistant shipment context failed: {e}")

    report = build_mock_performance_report()
    acc = report["model_accuracy"]
    cov = report["coverage"]
    dynamic_prompt = (
        "You are Anvayaa, an expert AI assistant embedded inside the Anvayaa Supply Chain Resilience platform. "
        "You have live access to the platform's data and can answer any question about it. "
        "ALWAYS respond in a helpful, factual, and concise manner. "
        "NEVER say you cannot answer a question that can be derived from the data below. "
        "Use bullet points and bold text for clarity.\n\n"
        "=== PLATFORM LIVE DATA ===\n"
        f"ACTIVE DISRUPTIONS ({len(disruptions_info)} total):\n{disruption_text}\n\n"
        f"RECENT SHIPMENTS (sample of up to 10):\n{shipment_text}\n\n"
        "=== PLATFORM PERFORMANCE METRICS ===\n"
        f"- Model Precision: {round(acc['precision']*100,1)}%\n"
        f"- Model Recall: {round(acc['recall']*100,1)}%\n"
        f"- F1 Score: {round(acc['f1_score']*100,1)}%\n"
        f"- MAPE: {acc['mape']}%\n"
        f"- Total Disruptions Predicted: {cov['total_disruptions_predicted']:,}\n"
        f"- Correct Predictions: {cov['correct_predictions']:,}\n"
        f"- False Positives: {cov['false_positives']}\n"
        f"- Avg Hours to Disruption: {cov['avg_hours_to_disruption']}h\n\n"
        "=== PLATFORM FEATURES ===\n"
        "- Dashboard: real-time KPIs including total shipments, critical count, active disruptions, risk distribution.\n"
        "- Live Map: interactive map showing all shipment positions and disruption overlays.\n"
        "- Shipments page: full shipment table with filtering by status, origin, destination.\n"
        "- Route Optimization: A* sea+land routing or Bezier sea-only curves with live risk analysis.\n"
        "- Disruptions: active disruption map with severity circles and weather conditions.\n"
        "- Analytics: Prophet ML model forecast charts and performance metrics.\n\n"
        "=== AVAILABLE PORTS ===\n"
        "Shanghai, Rotterdam, Singapore, Mumbai, Los Angeles, Dubai, Hamburg, Colombo, "
        "Jakarta, Busan, Antwerp, New York, Felixstowe, Cape Town, Bay of Biscay, and more.\n\n"
        "=== RULES ===\n"
        "1. If asked about a shipment ID, look in the shipment data above and provide all fields.\n"
        "2. If asked about metrics (precision, recall, F1, avg hours, total disruptions), use the performance metrics above.\n"
        "3. If asked about a port route or distance, calculate it from the port coordinates if possible.\n"
        "4. If asked about weather at a port, refer to the disruption data above.\n"
        "5. If asked about platform features, describe them accurately from the features section above.\n"
        "6. Never refuse to answer questions related to supply chain, logistics, ports, weather, routes, or this platform.\n"
        "7. For off-topic questions (sports, movies, politics), politely decline and redirect to platform topics.\n"
    )

    contents = [
        {
            "role": "model" if message.role == "assistant" else "user",
            "parts": [{"text": message.content}],
        }
        for message in request_messages
    ]

    payload = {
        "system_instruction": {
            "parts": [{"text": dynamic_prompt}],
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.3,
            "topP": 0.9,
            "maxOutputTokens": 2048,
        },
    }

    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{current_settings.GEMINI_MODEL}:generateContent"
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                endpoint,
                params={"key": current_settings.GEMINI_API_KEY},
                json=payload,
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            retry_after_seconds = _extract_retry_after_seconds(exc.response)
            logger.warning(f"Gemini API rate limit hit. Retry after about {retry_after_seconds}s.")
            raise HTTPException(
                status_code=429,
                detail=_build_rate_limit_reply(retry_after_seconds),
            ) from exc
        logger.error(f"Gemini API HTTP error: {exc.response.text}")
        raise HTTPException(status_code=502, detail=f"Gemini API error: {exc.response.text}") from exc
    except httpx.HTTPError as exc:
        logger.error(f"Gemini API connection error: {exc}")
        raise HTTPException(status_code=502, detail="Unable to reach Gemini API or request timed out.") from exc

    data = response.json()
    candidates = data.get("candidates") or []
    if not candidates:
        raise HTTPException(status_code=502, detail="Gemini returned no response.")

    parts = (((candidates[0] or {}).get("content") or {}).get("parts")) or []
    reply = "\n".join(part.get("text", "").strip() for part in parts if part.get("text")).strip()
    if not reply:
        raise HTTPException(status_code=502, detail="Gemini returned an empty response.")

    return reply


@router.post(
    "/assistant/chat",
    response_model=AssistantChatResponse,
    tags=["Assistant"],
    summary="Project-scoped AI chat for the Anvayaa platform",
)
async def assistant_chat(request: AssistantChatRequest) -> AssistantChatResponse:
    latest_user_message = next((msg.content for msg in reversed(request.messages) if msg.role == "user"), "")
    if not latest_user_message:
        raise HTTPException(status_code=400, detail="A user message is required.")

    if _is_obviously_off_topic(latest_user_message):
        return AssistantChatResponse(reply=_project_scope_refusal(), scoped=True)

    if not _is_project_scoped_chat(latest_user_message):
        return AssistantChatResponse(reply=_project_scope_refusal(), scoped=True)

    structured_reply = await _build_structured_assistant_reply(latest_user_message, request.context)
    if structured_reply:
        return AssistantChatResponse(reply=structured_reply, scoped=True)

    try:
        reply = await _generate_gemini_project_reply(request.messages, request.context)
        return AssistantChatResponse(reply=reply, scoped=True)
    except HTTPException as exc:
        if exc.status_code == 429:
            retry_after_seconds = _extract_retry_after_seconds_from_text(str(exc.detail)) or 60
            return AssistantChatResponse(
                reply=str(exc.detail),
                scoped=True,
                retryAfterSeconds=retry_after_seconds,
            )
        if exc.status_code in {502, 503}:
            return AssistantChatResponse(
                reply=(
                    "I can still help with shipment, disruption, route, and platform questions, but the live Gemini "
                    "assistant is unavailable right now. Try asking for a shipment ID, critical shipments, delayed "
                    "shipments, route optimization, or current disruptions."
                ),
                scoped=True,
            )
        raise



@router.get(
    "/disruptions",
    response_model=Dict[str, List[DisruptionResponse]],
    tags=["Disruptions"],
    summary="Get all active disruption predictions",
)
async def get_disruptions(
    location: Optional[str] = Query(None, description="Filter by location"),
    severity: Optional[str] = Query(None, description="low|medium|high|critical"),
    disruption_type: Optional[str] = Query(None, description="Filter by disruption type"),
    limit: int = Query(50, ge=1, le=500),
) -> Dict:
    from app.services.data_ingestion import fetch_weather_data
    from app.routing.constants import DEFAULT_LOCATIONS
    from app.database import SessionLocal

    disruptions = []
    
    async def _fetch_loc(loc: str):
        try:
            weather = await fetch_weather_data(loc)
            if not weather: return None
            
            sev_str = weather.get("severity", "low")
            sev_val = {"low": 0.2, "medium": 0.5, "high": 0.75, "critical": 0.95}.get(sev_str.lower(), 0.2)
            if sev_val < 0.35:
                sev_val = 0.35
            
            coords = _coord_for_location(loc)
            radius = 100 + (sev_val * 300)
            
            return {
                "id": f"live-weather-{loc.replace(' ', '-')}-{int(time.time()/3600)}",
                "location": loc,
                "coords": coords,
                "radius": radius,
                "disruption_type": "weather",
                "predicted_severity": sev_val,
                "probability": min(sev_val + 0.1, 1.0),
                "confidence_score": 0.92,
                "predicted_time_window": {
                    "start": datetime.now(timezone.utc).isoformat(),
                    "end": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
                },
                "recommended_action": f"Marine Warning: {weather.get('weather_condition', 'Stormy conditions')}. Wave Height: {weather.get('wave_height', 'N/A')}m",
                "affected_shipments": random.randint(3, 12),
                "status": "active",
            }
        except Exception as e:
            logger.error(f"Error fetching live weather for {loc}: {e}")
            return None

    weather_results = await asyncio.gather(*[_fetch_loc(loc) for loc in DEFAULT_LOCATIONS])
    disruptions.extend([r for r in weather_results if r])

    try:
        records = await DisruptionPrediction.find(DisruptionPrediction.status == "active").to_list()
        for r in records:
            if r.disruption_type == "weather" and any(d["location"] == r.location for d in disruptions):
                continue
                
            loc = r.location or "unknown"
            coords = _coord_for_location(loc)
            radius = 80 + (r.predicted_severity * 280)
            
            disruptions.append({
                "id": str(r.id),
                "location": loc,
                "coords": coords,
                "radius": radius,
                "disruption_type": r.disruption_type,
                "predicted_severity": r.predicted_severity,
                "probability": r.probability,
                "confidence_score": r.confidence_score,
                "predicted_time_window": {
                    "start": r.predicted_window_start.isoformat() if r.predicted_window_start else None,
                    "end": r.predicted_window_end.isoformat() if r.predicted_window_end else None,
                },
                "recommended_action": r.recommended_action,
                "affected_shipments": r.affected_shipments_count,
                "status": r.status,
            })
    except Exception as e:
        logger.error(f"MongoDB Disruption fetch failed: {e}")

    if location:
        disruptions = [d for d in disruptions if location.lower() in d["location"].lower()]
    if disruption_type:
        disruptions = [d for d in disruptions if d["disruption_type"] == disruption_type]
    if severity:
        sev_map = {"critical": 0.75, "high": 0.5, "medium": 0.25, "low": 0.0}
        min_sev = sev_map.get(severity.lower(), 0.0)
        disruptions = [d for d in disruptions if d.get("predicted_severity", 0.0) >= min_sev]

    return {"disruptions": disruptions[:limit]}



@router.post(
    "/shipments/analyze",
    tags=["Shipments"],
    summary="Analyze a shipment route for disruption risk",
)
async def analyze_shipment(
    request: ShipmentAnalysisRequest,
) -> Dict:
    from app.services.forecasting import generate_location_forecast

    origin_forecast = await generate_location_forecast(request.origin, horizon_hours=72)
    dest_forecast = await generate_location_forecast(request.destination, horizon_hours=72)

    origin_peak = max((p["disruption_likelihood"] for p in origin_forecast.get("data", [])), default=0.1)
    dest_peak = max((p["disruption_likelihood"] for p in dest_forecast.get("data", [])), default=0.1)
    overall_risk = round((origin_peak * 0.5 + dest_peak * 0.5), 4)

    def _risk_level(score: float) -> str:
        if score >= 0.75: return "CRITICAL"
        if score >= 0.50: return "HIGH"
        if score >= 0.25: return "MEDIUM"
        return "LOW"

    shipment_id = str(uuid.uuid4())
    try:
        shipment = Shipment(
            id=shipment_id,
            origin=request.origin,
            destination=request.destination,
            cargo_type=request.cargo_type,
            priority=request.priority or "normal",
            departure_time=request.departure_time,
            current_status="pending",
        )
        await shipment.insert()
    except Exception as exc:
        logger.warning(f"Shipment DB write failed: {exc}")

    origin_cond = origin_forecast.get("current_conditions", {})
    dest_cond = dest_forecast.get("current_conditions", {})

    forecasts = {
        "port_congestion": round(origin_cond.get("traffic_index", 0.3) * 0.8, 4),
        "weather_delays": round(origin_cond.get("weather_severity", 0.2) * 0.9, 4),
        "traffic_bottleneck": round(origin_cond.get("traffic_index", 0.3) * 0.6, 4),
        "mechanical_failure": 0.05,
    }

    timeline = [
        {"checkpoint": request.origin, "risk_level": _risk_level(origin_peak), "disruption_likelihood": round(origin_peak, 4), "alert": _pick_alert(origin_peak, origin_cond)},
        {"checkpoint": "Transit Zone", "risk_level": _risk_level(overall_risk * 0.8), "disruption_likelihood": round(overall_risk * 0.8, 4), "alert": "Standard monitoring in transit zone."},
        {"checkpoint": request.destination, "risk_level": _risk_level(dest_peak), "disruption_likelihood": round(dest_peak, 4), "alert": _pick_alert(dest_peak, dest_cond)},
    ]

    recommendations = _build_recommendations(overall_risk, forecasts)

    return {
        "shipment_id": shipment_id,
        "origin": request.origin,
        "destination": request.destination,
        "overall_risk_score": overall_risk,
        "risk_level": _risk_level(overall_risk),
        "forecasts": forecasts,
        "timeline": timeline,
        "recommendations": recommendations,
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _pick_alert(risk: float, conditions: Dict) -> str:
    if risk >= 0.75: return "⚠️ Critical disruption risk detected. Immediate action required."
    if risk >= 0.50: return f"High risk — weather severity: {conditions.get('weather_severity', 'N/A')}"
    return "Monitoring active. No immediate action required."


def _build_recommendations(overall_risk: float, forecasts: Dict) -> List[str]:
    recs = []
    if overall_risk >= 0.75: recs.append("🚨 CRITICAL: Delay shipment or reroute immediately.")
    if forecasts.get("weather_delays", 0) > 0.5: recs.append("Consider weather-avoidance routing.")
    if forecasts.get("port_congestion", 0) > 0.4: recs.append("Pre-book alternative port berth as contingency.")
    if not recs: recs.append(" Route cleared. Proceed with standard monitoring.")
    return recs



@router.get(
    "/forecasts/{location}",
    response_model=ForecastResponse,
    tags=["Forecasting"],
    summary="Get 72-hour disruption forecast for a location",
)
async def get_location_forecast(
    location: str,
    hours: int = Query(72, ge=1, le=168, description="Forecast horizon in hours"),
) -> Dict:
    try:
        forecast = await generate_location_forecast(location, horizon_hours=hours)
        return forecast
    except Exception as exc:
        logger.error(f"Forecast endpoint error for {location}: {exc}")
        raise HTTPException(status_code=500, detail=f"Forecast generation failed: {exc}")



@router.get(
    "/stats/performance",
    tags=["Analytics"],
    summary="Get Prophet model performance metrics",
)
async def get_model_performance() -> Dict:
    return build_mock_performance_report()



@router.post(
    "/routes/optimize",
    tags=["Routing"],
    summary="Request disruption-aware route optimization",
)
async def optimize_route(
    request: RouteOptimizationRequest,
) -> Dict:
    waypoints = request.waypoints
    if not waypoints:
        raise HTTPException(status_code=400, detail="At least one waypoint required.")

    try:
        if all(
            waypoint.get("id") is None and waypoint.get("name") is None
            for waypoint in waypoints
        ):
            normalized_waypoints = [
                {
                    "lat": waypoint.get("lat") or waypoint.get("latitude"),
                    "lng": waypoint.get("lng") or waypoint.get("longitude"),
                    "disruption_risk": 0.0,
                    "recommended": True,
                }
                for waypoint in waypoints
            ]
            return {
                "optimized_waypoints": normalized_waypoints,
                "estimated_time_savings_minutes": 0,
                "disruption_avoidance_score": 0.0,
                "algorithm": "Anvayaa Hybrid (Coordinate Compatibility)",
                "backend_forecast_applied": False,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        raw_origin = waypoints[0].get("id") or waypoints[0].get("name") or "Shanghai"
        raw_dest = waypoints[-1].get("id") or waypoints[-1].get("name") or "Rotterdam"
        
        origin = "Shanghai"
        destination = "Rotterdam"
        
        for node_id in routing_engine.graph.nodes.keys():
            if node_id.lower() in str(raw_origin).lower():
                origin = node_id
            if node_id.lower() in str(raw_dest).lower():
                destination = node_id

        departure = datetime.now(timezone.utc)
        route = await routing_engine.get_optimal_route(origin, destination, departure)
        
        if not route:
            logger.warning(f"No path found between {origin} and {destination}, using fallback.")
            fallback_waypoints = []
            for wp in waypoints:
                lat = wp.get("lat") or wp.get("latitude")
                lng = wp.get("lng") or wp.get("longitude")
                fallback_waypoints.append({"lat": lat, "lng": lng, "disruption_risk": 0.1})
                
            return {
                "optimized_waypoints": fallback_waypoints,
                "estimated_time_savings_minutes": 0,
                "algorithm": "Anvayaa Hybrid (Direct Fallback)",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        optimized_waypoints = []
        for edge in route.edges:
            node = routing_engine.graph.nodes[edge.source]
            optimized_waypoints.append({
                "lat": node.latitude,
                "lng": node.longitude,
                "disruption_risk": edge.disruption_risk[0],
                "congestion_factor": edge.real_time_multiplier,
                "recommended": True
            })
        
        dest_node = routing_engine.graph.nodes[route.edges[-1].target]
        optimized_waypoints.append({
            "lat": dest_node.latitude,
            "lng": dest_node.longitude,
            "disruption_risk": 0.0,
            "recommended": True
        })

        return {
            "optimized_waypoints": optimized_waypoints,
            "estimated_time_savings_minutes": round(route.total_time * 60 * 0.15, 1),
            "disruption_avoidance_score": round(1.0 - route.risk_score, 2),
            "algorithm": "Anvayaa Hybrid Engine (Roadmap v1)",
            "backend_forecast_applied": True,
            "total_cost": round(route.total_cost, 2),
            "total_time": round(route.total_time, 1),
            "total_distance": round(route.total_distance, 1),
            "eta": route.eta.isoformat(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error(f"Hybrid routing failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))



@router.post(
    "/ingest/trigger",
    tags=["System"],
    summary="Manually trigger data ingestion (dev/debug)",
)
async def trigger_ingestion(background_tasks: BackgroundTasks) -> Dict:
    async def _run():
        try:
            await ingest_all_data()
        except Exception as exc:
            logger.error(f"Manual ingest failed: {exc}")

    background_tasks.add_task(_run)
    return {"message": "Data ingestion triggered in background.", "status": "accepted"}