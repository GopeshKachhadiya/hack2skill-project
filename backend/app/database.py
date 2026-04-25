"""
database.py - MongoDB engine + Beanie ODM initialization.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from loguru import logger

from app.config import get_settings

settings = get_settings()
client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.MONGODB_DB_NAME]


async def init_db() -> None:
    from app.models.shipment import Shipment
    from app.models.disruption import DisruptionPrediction, ProphetForecast, APICallLog, RouteHistory
    from app.models.weather import WeatherData

    logger.info("Initializing MongoDB connection via Beanie...")
    try:
        await init_beanie(
            database=db,
            document_models=[Shipment, DisruptionPrediction, ProphetForecast, APICallLog, RouteHistory, WeatherData],
        )
        logger.success("MongoDB / Beanie initialization complete.")
    except Exception as exc:
        logger.error(f"MongoDB initialization failed: {exc}")
        raise
