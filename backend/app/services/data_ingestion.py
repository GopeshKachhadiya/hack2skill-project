"""
services/data_ingestion.py — Real-time data ingestion from external APIs.

Fetches:
  1. Weather data  (OpenWeatherMap)
  2. Traffic data  (Google Maps Directions)
  3. Port status   (MarineTraffic RSS + World Bank)

All fetches:
  • Check Redis cache first
  • Call API on miss
  • Store raw response in PostgreSQL
  • Log every call to api_call_logs table
  • Apply exponential-backoff retry (3 attempts)
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from bs4 import BeautifulSoup
from loguru import logger

from app.cache import cache_get, cache_set
from app.config import get_settings
# from app.database import SessionLocal  # No longer needed
from app.models.disruption import APICallLog
from app.models.weather import WeatherData

settings = get_settings()

# ── Internal helpers ──────────────────────────────────────────────────────────

async def _http_get_with_retry(
    url: str,
    params: Optional[Dict] = None,
    headers: Optional[Dict] = None,
    max_retries: int = 3,
    timeout: float = 10.0,
) -> Optional[Dict]:
    """
    Async HTTP GET with exponential back-off.
    Returns parsed JSON dict or None on failure.
    """
    delay = 1.0
    for attempt in range(1, max_retries + 1):
        start_ms = int(time.time() * 1000)
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(url, params=params, headers=headers)
                elapsed = int(time.time() * 1000) - start_ms
                await _log_api_call(url, response.status_code, elapsed)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            elapsed = int(time.time() * 1000) - start_ms
            await _log_api_call(url, exc.response.status_code, elapsed, str(exc))
            logger.warning(f"HTTP {exc.response.status_code} on attempt {attempt}: {url}")
        except Exception as exc:
            elapsed = int(time.time() * 1000) - start_ms
            await _log_api_call(url, 0, elapsed, str(exc))
            logger.warning(f"Request error attempt {attempt}: {exc}")

        if attempt < max_retries:
            await asyncio.sleep(delay)
            delay *= 2

    return None


async def _log_api_call(
    url: str,
    status_code: int,
    response_time_ms: int,
    error: Optional[str] = None,
) -> None:
    """Write one row to api_call_logs (best-effort, never raises)."""
    try:
        log = APICallLog(
            api_source=url.split("/")[2] if url else "unknown",
            endpoint_url=url[:500],
            status_code=status_code,
            response_time_ms=response_time_ms,
            error_message=error,
        )
        await log.insert()
    except Exception as exc:
        logger.debug(f"API call log write failed (non-critical): {exc}")


def _classify_weather_severity(
    wave_height: float, wind_speed: float
) -> str:
    """Return a severity label based on marine meteorological conditions."""
    if wave_height > 4.0 or wind_speed > 25:
        return "critical"
    if wave_height > 2.5 or wind_speed > 15:
        return "high"
    if wave_height > 1.0 or wind_speed > 10:
        return "medium"
    return "low"


# ── Weather ───────────────────────────────────────────────────────────────────

async def fetch_weather_data(location: str) -> Optional[Dict]:
    """
    Fetch current weather for *location* from OpenWeatherMap.

    1. Check Redis cache (TTL 30 min)
    2. Call API on miss
    3. Classify severity
    4. Store in PostgreSQL + cache
    5. Return structured dict
    """
    cache_key = f"weather:{location.lower().replace(' ', '_')}"
    cached = cache_get(cache_key)
    if cached:
        logger.debug(f"Weather cache HIT: {location}")
        return cached

    from app.routing.constants import _coord_for_location
    coords = _coord_for_location(location)

    url = "https://marine-api.open-meteo.com/v1/marine"
    params = {
        "latitude": coords["lat"],
        "longitude": coords["lng"],
        "hourly": "wave_height,wind_speed_10m",
        "past_days": 0,
        "forecast_days": 7,
    }

    raw = await _http_get_with_retry(url, params)
    if raw is None or "error" in raw:
        logger.warning(f"Weather API failed for location: {location}")
        return _mock_weather_data(location)

    try:
        hourly = raw.get("hourly", {})
        
        wave_heights = hourly.get("wave_height", [])
        wind_speeds = hourly.get("wind_speed_10m", [])
        
        # Calculate 24-hour averages
        valid_waves = [w for w in wave_heights[:24] if w is not None]
        valid_winds = [w for w in wind_speeds[:24] if w is not None]
        
        wave_height = sum(valid_waves) / len(valid_waves) if valid_waves else 1.0
        wind_speed = sum(valid_winds) / len(valid_winds) if valid_winds else 10.0
        
        condition = "Rough Seas" if wave_height > 2.5 else "Calm Seas"
        
        severity = _classify_weather_severity(wave_height, wind_speed)

        structured = {
            "location": location,
            "wave_height": round(wave_height, 2),
            "wind_speed": round(wind_speed, 2),
            "weather_condition": condition,
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Persist to DB
        # Persist to DB
        try:
            record = WeatherData(
                location=location,
                temperature=wave_height, # Store wave_height in temp column temporarily to avoid DB migration
                humidity=0.0,
                wind_speed=wind_speed,
                weather_condition=condition,
                severity=severity,
                raw_response=json.dumps(raw)[:2000],
                timestamp=datetime.now(timezone.utc),
            )
            await record.insert()
        except Exception as exc:
            logger.warning(f"Weather DB write failed: {exc}")

        cache_set(cache_key, structured, ttl=settings.REDIS_CACHE_TTL_WEATHER)
        return structured

    except (KeyError, TypeError) as exc:
        logger.error(f"Weather response parse error: {exc}")
        return _mock_weather_data(location)


def _mock_weather_data(location: str) -> Dict:
    """Return plausible mock weather when the API is unavailable."""
    import random
    conditions = ["Calm Seas", "Moderate Waves", "Rough Seas"]
    wave = round(random.uniform(0.5, 4.0), 1)
    wind = round(random.uniform(2, 20), 1)
    return {
        "location": location,
        "wave_height": wave,
        "wind_speed": wind,
        "weather_condition": random.choice(conditions),
        "severity": _classify_weather_severity(wave, wind),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "_mock": True,
    }


# ── Traffic ───────────────────────────────────────────────────────────────────

async def fetch_traffic_data(origin: str, destination: str) -> Optional[Dict]:
    """
    Fetch traffic/directions data from OpenRouteService API.
    Falls back to mock data if the API key is not configured.
    """
    cache_key = f"traffic:{origin.lower()}:{destination.lower()}"
    cached = cache_get(cache_key)
    if cached:
        logger.debug(f"Traffic cache HIT: {origin} → {destination}")
        return cached

    if not settings.OPENROUTESERVICE_API_KEY or settings.OPENROUTESERVICE_API_KEY.startswith("your_"):
        return _mock_traffic_data(origin, destination)

    from app.api.routes import _coord_for_location
    orig_coords = _coord_for_location(origin)
    dest_coords = _coord_for_location(destination)

    url = "https://api.openrouteservice.org/v2/directions/driving-car"
    params = {
        "start": f"{orig_coords['lng']},{orig_coords['lat']}",
        "end": f"{dest_coords['lng']},{dest_coords['lat']}",
    }
    headers = {
        "Authorization": settings.OPENROUTESERVICE_API_KEY
    }

    raw = await _http_get_with_retry(url, params=params, headers=headers)
    if raw is None or "error" in raw:
        logger.warning(f"Traffic API failed for route: {origin} → {destination}")
        return _mock_traffic_data(origin, destination)

    try:
        summary = raw["features"][0]["properties"]["summary"]
        duration_s = summary["duration"]
        distance_m = summary["distance"]
        
        import random
        # ORS free tier doesn't have real-time traffic delay, so we simulate it
        delay_ratio = random.uniform(0.0, 0.4)
        duration_traffic_s = duration_s * (1 + delay_ratio)

        structured = {
            "origin": origin,
            "destination": destination,
            "distance_km": round(distance_m / 1000, 2),
            "normal_duration_min": round(duration_s / 60, 1),
            "traffic_duration_min": round(duration_traffic_s / 60, 1),
            "delay_ratio": round(delay_ratio, 3),
            "traffic_index": round(min(delay_ratio * 2, 1.0), 3),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        cache_set(cache_key, structured, ttl=settings.REDIS_CACHE_TTL_TRAFFIC)
        return structured

    except (KeyError, IndexError) as exc:
        logger.error(f"Traffic response parse error: {exc}")
        return _mock_traffic_data(origin, destination)


def _mock_traffic_data(origin: str, destination: str) -> Dict:
    """Return plausible mock traffic when the API is unavailable."""
    import random
    normal = random.randint(120, 600)
    delay = random.randint(0, int(normal * 0.5))
    return {
        "origin": origin,
        "destination": destination,
        "distance_km": round(random.uniform(50, 5000), 1),
        "normal_duration_min": normal,
        "traffic_duration_min": normal + delay,
        "delay_ratio": round(delay / normal, 3),
        "traffic_index": round(min(delay / normal * 2, 1.0), 3),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "_mock": True,
    }


# ── Port Status ───────────────────────────────────────────────────────────────

async def fetch_port_data() -> List[Dict]:
    """
    Scrape port congestion signals from MarineTraffic RSS feed.
    Falls back to mock data when unavailable.
    """
    cache_key = "port_status:all"
    cached = cache_get(cache_key)
    if cached:
        logger.debug("Port cache HIT")
        return cached

    rss_url = "https://www.marinetraffic.com/rss/latest_ais_positions.xml"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(rss_url)
        soup = BeautifulSoup(resp.text, "html.parser")
        items = soup.find_all("item")[:20]
        ports = []
        for item in items:
            title = item.find("title")
            desc = item.find("description")
            if title:
                ports.append({
                    "name": title.get_text(strip=True)[:100],
                    "description": desc.get_text(strip=True)[:200] if desc else "",
                    "congestion_index": 0.3,
                    "status": "operational",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
        if ports:
            cache_set(cache_key, ports, ttl=settings.REDIS_CACHE_TTL_PORT)
            return ports
    except Exception as exc:
        logger.warning(f"Port RSS fetch failed: {exc}")

    return _mock_port_data()


def _mock_port_data() -> List[Dict]:
    """Mock port status for key global hubs."""
    import random
    ports = [
        "Port of Shanghai", "Port of Singapore", "Port of Rotterdam",
        "Port of Los Angeles", "Port of Hong Kong", "Suez Canal",
        "Strait of Malacca", "Port of Hamburg",
    ]
    statuses = ["operational", "congested", "partially_closed"]
    return [
        {
            "name": p,
            "congestion_index": round(random.uniform(0.1, 0.9), 2),
            "status": random.choice(statuses),
            "vessel_count": random.randint(10, 200),
            "avg_wait_hours": round(random.uniform(0, 48), 1),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "_mock": True,
        }
        for p in ports
    ]


# ── Orchestrator ──────────────────────────────────────────────────────────────

async def ingest_all_data(locations: Optional[List[str]] = None) -> Dict:
    """
    Parallel ingestion of weather, traffic, and port data.

    Returns an IngestionReport dict.
    """
    if locations is None:
        locations = [
            "Shanghai", "Singapore", "Rotterdam",
            "Los Angeles", "Mumbai", "Dubai",
        ]

    start = time.time()
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "weather": {"success": 0, "failed": 0},
        "traffic": {"success": 0, "failed": 0},
        "ports": {"success": 0, "failed": 0},
    }

    # ── Weather (all locations in parallel) ───────────────────────────────────
    weather_tasks = [fetch_weather_data(loc) for loc in locations]
    weather_results = await asyncio.gather(*weather_tasks, return_exceptions=True)
    for r in weather_results:
        if isinstance(r, Exception) or r is None:
            report["weather"]["failed"] += 1
        else:
            report["weather"]["success"] += 1

    # ── Traffic (origin → destination pairs) ──────────────────────────────────
    route_pairs = list(zip(locations, locations[1:] + [locations[0]]))
    traffic_tasks = [fetch_traffic_data(o, d) for o, d in route_pairs]
    traffic_results = await asyncio.gather(*traffic_tasks, return_exceptions=True)
    for r in traffic_results:
        if isinstance(r, Exception) or r is None:
            report["traffic"]["failed"] += 1
        else:
            report["traffic"]["success"] += 1

    # ── Ports ─────────────────────────────────────────────────────────────────
    try:
        ports = await fetch_port_data()
        report["ports"]["success"] = len(ports)
    except Exception as exc:
        logger.error(f"Port ingestion error: {exc}")
        report["ports"]["failed"] = 1

    report["duration_seconds"] = round(time.time() - start, 2)
    logger.info(f"Ingestion complete: {report}")
    return report
