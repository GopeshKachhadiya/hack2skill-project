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
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

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


# ── Health Check ──────────────────────────────────────────────────────────────

@router.get("/health", tags=["System"])
async def health_check() -> Dict:
    """System health check — used by Railway/Render uptime monitoring."""
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
    """Return shipment data in the shape used by the frontend."""
    records = await Shipment.find_all().sort("-created_at").limit(limit).to_list()
    shipments = [_serialize_shipment_record(record) for record in records]
    if not shipments:
        shipments = _generate_sample_shipments(limit)
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
            "cargoType": random.choice(SHIPMENT_CARGO),
            "cargoValue": float(random.randint(50000, 5000000)),
            "priority": random.choice(["normal", "urgent", "time-sensitive"]),
            "riskScore": round(risk_score, 4),
            "delay": round(delay, 1),
            "route": [origin_coords] + waypoints + [destination_coords],
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
    from app.services.data_ingestion import fetch_weather_data
    from app.routing.constants import DEFAULT_LOCATIONS
    from app.database import SessionLocal

    disruptions = []
    
    # 1. Fetch live marine weather for all hubs to create real-time risk zones
    for loc in DEFAULT_LOCATIONS:
        try:
            weather = await fetch_weather_data(loc)
            if not weather: continue
            
            sev_str = weather.get("severity", "low")
            sev_val = {"low": 0.2, "medium": 0.5, "high": 0.75, "critical": 0.95}.get(sev_str.lower(), 0.2)
            
            # Artificial boost for demo visibility if weather is too calm
            if sev_val < 0.35:
                sev_val = 0.35
            
            coords = _coord_for_location(loc)
            # Dynamic radius scales with weather intensity (80km to 400km)
            radius = 100 + (sev_val * 300)
            
            disruptions.append({
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
            })
        except Exception as e:
            logger.error(f"Error fetching live weather for {loc}: {e}")

    # 2. Append predictive disruptions from SQLite DB (port congestion, mechanical, etc)
    try:
        db = SessionLocal()
        records = db.query(DisruptionPrediction).filter(DisruptionPrediction.status == "active").all()
        for r in records:
            # Avoid duplicating weather if we already have a live one for the same location
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
        db.close()
    except Exception as e:
        logger.error(f"DB Disruption fetch failed: {e}")

    # Apply filters
    if location:
        disruptions = [d for d in disruptions if location.lower() in d["location"].lower()]
    if disruption_type:
        disruptions = [d for d in disruptions if d["disruption_type"] == disruption_type]
    if severity:
        sev_map = {"critical": 0.75, "high": 0.5, "medium": 0.25, "low": 0.0}
        min_sev = sev_map.get(severity.lower(), 0.0)
        disruptions = [d for d in disruptions if d.get("predicted_severity", 0.0) >= min_sev]

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
    if not recs: recs.append("✅ Route cleared. Proceed with standard monitoring.")
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
    waypoints = request.waypoints
    if not waypoints:
        raise HTTPException(status_code=400, detail="At least one waypoint required.")

    try:
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
                "algorithm": "NEXUS Hybrid (Direct Fallback)",
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
            "algorithm": "NEXUS Hybrid Engine (Roadmap v1)",
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


# ── ENDPOINT 6: POST /ingest/trigger (dev helper) ────────────────────────────

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
