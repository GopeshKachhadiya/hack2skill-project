"""
database.py - Beanie/Mongo initialization with a safe local fallback.
"""

from __future__ import annotations

from typing import Any

from loguru import logger

from app.config import get_settings
from app.models.disruption import APICallLog, DisruptionPrediction, ProphetForecast
from app.models.shipment import Shipment
from app.models.weather import WeatherData

settings = get_settings()


class _FallbackQuery:
    def filter(self, *args: Any, **kwargs: Any) -> "_FallbackQuery":
        return self

    def all(self) -> list[Any]:
        return []


class _FallbackSession:
    def query(self, *args: Any, **kwargs: Any) -> _FallbackQuery:
        return _FallbackQuery()

    def close(self) -> None:
        return None


def SessionLocal() -> _FallbackSession:
    """Compatibility shim for routes that still expect a SQLAlchemy-style session."""
    return _FallbackSession()


async def init_db() -> None:
    """Initialize Beanie if Mongo is available; otherwise keep the app running in fallback mode."""
    mongo_url = getattr(settings, "MONGODB_URL", "") or getattr(settings, "DATABASE_URL", "")
    mongo_db_name = getattr(settings, "MONGODB_DB_NAME", "nexus_supply_chain")

    if not mongo_url.startswith("mongodb"):
        logger.warning("MongoDB URL not configured; running with in-memory/database fallback only.")
        return

    try:
        from beanie import init_beanie
        from motor.motor_asyncio import AsyncIOMotorClient

        client = AsyncIOMotorClient(mongo_url)
        await init_beanie(
            database=client[mongo_db_name],
            document_models=[
                Shipment,
                DisruptionPrediction,
                ProphetForecast,
                APICallLog,
                WeatherData,
            ],
        )
        logger.success("Beanie initialized successfully.")
    except Exception as exc:
        logger.warning(f"Beanie initialization skipped; continuing in fallback mode. Error: {exc}")


def get_db() -> _FallbackSession:
    """Dependency shim kept for compatibility with older route code."""
    return SessionLocal()
