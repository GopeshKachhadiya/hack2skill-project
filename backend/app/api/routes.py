"""
api/routes.py — All REST API endpoints.

Endpoints:
  GET  /api/v1/health
  GET  /api/v1/disruptions
  POST /api/v1/shipments/analyze
  GET  /api/v1/forecasts/{location}
  GET  /api/v1/stats/performance
  POST /api/v1/routes/optimize
  GET  /api/v1/ingest/trigger     (manual trigger for dev)
"""

from __future__ import annotations

import uuid
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from loguru import logger
from pydantic import BaseModel, Field
from app.config import get_settings
# from app.database import get_db  # No longer needed for Beanie
from app.ml.model_evaluation import build_mock_performance_report
from app.models.disruption import DisruptionPrediction
from app.models.shipment import Shipment
from app.services.data_ingestion import ingest_all_data
from app.services.forecasting import generate_location_forecast
from app.services.prediction_engine import get_active_disruptions_from_cache

settings = get_settings()
router = APIRouter()


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

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


# ── Health Check ──────────────────────────────────────────────────────────────

@router.get("/health", tags=["System"])
async def health_check() -> Dict:
    """System health check — used by Railway/Render uptime monitoring."""
    from app.cache import get_redis_client
    services: Dict[str, str] = {}

    # Redis health
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
    """Return shipment data in the shape used by the frontend."""
    records = await Shipment.find_all().sort("-created_at").limit(limit).to_list()
    shipments = [_serialize_shipment_record(record) for record in records]
    if not shipments:
        shipments = _generate_sample_shipments(limit)
    return {"shipments": shipments}


PORT_COORDS: Dict[str, Dict[str, float]] = {
    "Shanghai": {"lat": 31.2304, "lng": 121.4737},
    "Rotterdam": {"lat": 51.9225, "lng": 4.4792},
    "Singapore": {"lat": 1.2966, "lng": 103.7764},
    "Los Angeles": {"lat": 33.7283, "lng": -118.2712},
    "Dubai": {"lat": 24.9857, "lng": 55.0272},
    "Hamburg": {"lat": 53.5753, "lng": 9.9827},
    "Busan": {"lat": 35.1796, "lng": 129.0756},
    "Hong Kong": {"lat": 22.3193, "lng": 114.1694},
    "Antwerp": {"lat": 51.2213, "lng": 4.4051},
    "Mumbai": {"lat": 18.9388, "lng": 72.8354},
    "New York": {"lat": 40.6501, "lng": -74.0377},
    "Cape Town": {"lat": -33.9249, "lng": 18.4241},
    "Suez": {"lat": 30.5852, "lng": 32.2654},
    "Colombo": {"lat": 6.9271, "lng": 79.8612},
    "Felixstowe": {"lat": 51.9659, "lng": 1.3516},
}

SHIPMENT_STATUSES = ["on_time", "delayed", "critical", "delivered", "disrupted"]
SHIPMENT_CARGO = ["Container", "Bulk", "Refrigerated", "Tanker", "Air Freight", "Breakbulk"]


def _coord_for_location(name: str) -> Dict[str, float]:
    for port, coords in PORT_COORDS.items():
        if port.lower() in name.lower():
            return coords
    return random.choice(list(PORT_COORDS.values()))


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
    midpoint = {
        "lat": round((origin_coords["lat"] + destination_coords["lat"]) / 2, 4),
        "lng": round((origin_coords["lng"] + destination_coords["lng"]) / 2, 4),
    }

    return {
        "id": str(record.id),
        "origin": record.origin,
        "destination": record.destination,
        "originCoords": origin_coords,
        "destinationCoords": destination_coords,
        "currentCoords": midpoint,
        "departureTime": departure.isoformat(),
        "expectedArrival": expected_arrival.isoformat(),
        "currentStatus": current_status,
        "cargoType": record.cargo_type or random.choice(SHIPMENT_CARGO),
        "cargoValue": float(random.randint(50000, 5000000)),
        "priority": record.priority or "normal",
        "riskScore": round(risk_score, 4),
        "delay": round(delay, 1),
        "route": [origin_coords, midpoint, destination_coords],
    }


def _generate_sample_shipments(count: int = 75) -> List[Dict[str, Any]]:
    ports = list(PORT_COORDS.keys())
    shipments: List[Dict[str, Any]] = []
    for idx in range(count):
        origin = random.choice(ports)
        destination = random.choice([p for p in ports if p != origin])
        status = random.choices(SHIPMENT_STATUSES, weights=[0.42, 0.24, 0.12, 0.11, 0.11], k=1)[0]
        risk_score, delay = _status_summary(status)
        departure = datetime.now(timezone.utc) - timedelta(hours=random.randint(12, 240))
        expected_arrival = departure + timedelta(hours=random.randint(24, 500))
        origin_coords = PORT_COORDS[origin]
        destination_coords = PORT_COORDS[destination]
        midpoint = {
            "lat": round((origin_coords["lat"] + destination_coords["lat"]) / 2, 4),
            "lng": round((origin_coords["lng"] + destination_coords["lng"]) / 2, 4),
        }
        shipments.append({
            "id": f"SHP-{1000 + idx}",
            "origin": f"Port of {origin}" if "Port of" not in origin else origin,
            "destination": f"Port of {destination}" if "Port of" not in destination else destination,
            "originCoords": origin_coords,
            "destinationCoords": destination_coords,
            "currentCoords": midpoint,
            "departureTime": departure.isoformat(),
            "expectedArrival": expected_arrival.isoformat(),
            "currentStatus": status,
            "cargoType": random.choice(SHIPMENT_CARGO),
            "cargoValue": float(random.randint(50000, 5000000)),
            "priority": random.choice(["normal", "urgent", "time-sensitive"]),
            "riskScore": round(risk_score, 4),
            "delay": round(delay, 1),
            "route": [origin_coords, midpoint, destination_coords],
        })
    return shipments


# ── ENDPOINT 1: GET /disruptions ──────────────────────────────────────────────

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
    """
    Returns active disruption predictions. Checks Redis cache first,
    falls back to PostgreSQL on miss.
    """
    # Try cache first
    cached = get_active_disruptions_from_cache()
    if cached:
        disruptions = cached
    else:
        # Fallback to DB
        filters = {"status": "active"}
        if location:
            filters["location"] = {"$regex": location, "$options": "i"}
        if disruption_type:
            filters["disruption_type"] = disruption_type
        
        try:
            records = await DisruptionPrediction.find(filters).sort("-probability").limit(limit).to_list()
        except Exception as exc:
            logger.warning(f"Disruption lookup fallback used: {exc}")
            records = []

        disruptions = [
            {
                "id": str(r.id),
                "location": r.location or "unknown",
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
            }
            for r in records
        ]

    # Apply post-query filters
    if severity:
        sev_map = {"critical": 0.75, "high": 0.5, "medium": 0.25, "low": 0.0}
        min_sev = sev_map.get(severity.lower(), 0.0)
        disruptions = [d for d in disruptions if d["predicted_severity"] >= min_sev]

    return {"disruptions": disruptions[:limit]}


# ── ENDPOINT 2: POST /shipments/analyze ───────────────────────────────────────

@router.post(
    "/shipments/analyze",
    tags=["Shipments"],
    summary="Analyze a shipment route for disruption risk",
)
async def analyze_shipment(
    request: ShipmentAnalysisRequest,
) -> Dict:
    """
    Accepts a shipment request and returns a full risk analysis including:
    • Per-disruption-type probability scores
    • Timeline with checkpoint risk levels
    • Actionable recommendations
    """
    from app.services.forecasting import generate_location_forecast

    # Generate forecasts for origin and destination
    origin_forecast = await generate_location_forecast(request.origin, horizon_hours=72)
    dest_forecast = await generate_location_forecast(request.destination, horizon_hours=72)

    # Extract peak probabilities
    origin_peak = max(
        (p["disruption_likelihood"] for p in origin_forecast.get("data", [])),
        default=0.1,
    )
    dest_peak = max(
        (p["disruption_likelihood"] for p in dest_forecast.get("data", [])),
        default=0.1,
    )

    overall_risk = round((origin_peak * 0.5 + dest_peak * 0.5), 4)

    def _risk_level(score: float) -> str:
        if score >= 0.75:
            return "CRITICAL"
        if score >= 0.50:
            return "HIGH"
        if score >= 0.25:
            return "MEDIUM"
        return "LOW"

    # Persist shipment record
    shipment_id = str(uuid.uuid4())
    try:
        shipment = Shipment(
            id=uuid.UUID(shipment_id),
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

    # Build response
    origin_cond = origin_forecast.get("current_conditions", {})
    dest_cond = dest_forecast.get("current_conditions", {})

    forecasts = {
        "port_congestion": round(origin_cond.get("traffic_index", 0.3) * 0.8, 4),
        "weather_delays": round(origin_cond.get("weather_severity", 0.2) * 0.9, 4),
        "traffic_bottleneck": round(origin_cond.get("traffic_index", 0.3) * 0.6, 4),
        "mechanical_failure": 0.05,
    }

    timeline = [
        {
            "checkpoint": request.origin,
            "risk_level": _risk_level(origin_peak),
            "disruption_likelihood": round(origin_peak, 4),
            "alert": _pick_alert(origin_peak, origin_cond),
        },
        {
            "checkpoint": "Transit Zone",
            "risk_level": _risk_level(overall_risk * 0.8),
            "disruption_likelihood": round(overall_risk * 0.8, 4),
            "alert": "Standard monitoring in transit zone.",
        },
        {
            "checkpoint": request.destination,
            "risk_level": _risk_level(dest_peak),
            "disruption_likelihood": round(dest_peak, 4),
            "alert": _pick_alert(dest_peak, dest_cond),
        },
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
    if risk >= 0.75:
        return "⚠️ Critical disruption risk detected. Immediate action required."
    if risk >= 0.50:
        return f"High risk — weather severity: {conditions.get('weather_severity', 'N/A')}"
    return "Monitoring active. No immediate action required."


def _build_recommendations(overall_risk: float, forecasts: Dict) -> List[str]:
    recs = []
    if overall_risk >= 0.75:
        recs.append("🚨 CRITICAL: Delay shipment or reroute immediately.")
    if forecasts.get("weather_delays", 0) > 0.5:
        recs.append("Consider weather-avoidance routing.")
    if forecasts.get("port_congestion", 0) > 0.4:
        recs.append("Pre-book alternative port berth as contingency.")
    if not recs:
        recs.append("✅ Route cleared. Proceed with standard monitoring.")
    return recs


# ── ENDPOINT 3: GET /forecasts/{location} ────────────────────────────────────

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
    """
    Returns an hourly time-series of disruption likelihood for the given location.
    Prophet model generates uncertainty bounds (lower/upper).
    """
    try:
        forecast = await generate_location_forecast(location, horizon_hours=hours)
        return forecast
    except Exception as exc:
        logger.error(f"Forecast endpoint error for {location}: {exc}")
        raise HTTPException(status_code=500, detail=f"Forecast generation failed: {exc}")


# ── ENDPOINT 4: GET /stats/performance ───────────────────────────────────────

@router.get(
    "/stats/performance",
    tags=["Analytics"],
    summary="Get Prophet model performance metrics",
)
async def get_model_performance() -> Dict:
    """
    Returns current Prophet model accuracy metrics including
    precision, recall, F1, MAPE, and coverage statistics.
    """
    return build_mock_performance_report()


# ── ENDPOINT 5: POST /routes/optimize ────────────────────────────────────────

@router.post(
    "/routes/optimize",
    tags=["Routing"],
    summary="Request disruption-aware route optimization",
)
async def optimize_route(
    request: RouteOptimizationRequest,
) -> Dict:
    """
    Returns disruption-aware cost hints for the A* router (handled by Frontend).
    Backend provides per-waypoint disruption risk scores.
    """
    waypoints = request.waypoints
    if not waypoints:
        raise HTTPException(status_code=400, detail="At least one waypoint required.")

    # Build per-waypoint risk scores
    risks = []
    for wp in waypoints:
        lat, lng = wp.get("lat", 0), wp.get("lng", 0)
        risks.append({
            "lat": lat,
            "lng": lng,
            "disruption_risk": 0.3,           # will be replaced by real forecast
            "congestion_factor": 1.2,
            "recommended": True,
        })

    return {
        "optimized_waypoints": risks,
        "estimated_time_savings_minutes": 45,
        "disruption_avoidance_score": 0.78,
        "algorithm": "A*",
        "backend_forecast_applied": request.consider_disruptions,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── ENDPOINT 6: POST /ingest/trigger (dev helper) ────────────────────────────

@router.post(
    "/ingest/trigger",
    tags=["System"],
    summary="Manually trigger data ingestion (dev/debug)",
)
async def trigger_ingestion(background_tasks: BackgroundTasks) -> Dict:
    """
    Manually fires the data ingestion pipeline in a background task.
    Useful for testing without waiting for the scheduler.
    """
    async def _run():
        try:
            await ingest_all_data()
        except Exception as exc:
            logger.error(f"Manual ingest failed: {exc}")

    background_tasks.add_task(_run)
    return {"message": "Data ingestion triggered in background.", "status": "accepted"}




