"""
config.py — Centralised settings via pydantic-settings.
All secrets are pulled from environment variables / .env file.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide configuration object."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────
    APP_NAME: str = "Supply Chain Resilience API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # ── Database ───────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    MONGODB_URL: str = "mongodb+srv://hack2skill:LeFGvWiiTx2fSBn1@cluster0.vqixpzk.mongodb.net/?appName=Cluster0"
    MONGODB_DB_NAME: str = "anvayaa_supply_chain"

    # ── Redis ──────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL_WEATHER: int = 1800   # 30 minutes
    REDIS_CACHE_TTL_TRAFFIC: int = 300    # 5 minutes
    REDIS_CACHE_TTL_PORT: int = 1800      # 30 minutes
    REDIS_CACHE_TTL_FORECAST: int = 900   # 15 minutes

    # ── Celery ─────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ── External API Keys ─────────────────────────────────────
    OPENROUTESERVICE_API_KEY: str = "your_openrouteservice_api_key_here"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # ── Prophet Model Storage ──────────────────────────────────
    MODEL_STORAGE_PATH: str = "./models"
    MODEL_RETRAIN_LOOKBACK_DAYS: int = 90
    FORECAST_HORIZON_HOURS: int = 72

    # ── Disruption Thresholds ──────────────────────────────────
    DISRUPTION_ALERT_THRESHOLD: float = 0.00
    HIGH_RISK_THRESHOLD: float = 0.00
    MEDIUM_RISK_THRESHOLD: float = 0.00

    # ── Scheduling Intervals ───────────────────────────────────
    DATA_INGESTION_INTERVAL_MINUTES: int = 15
    PREDICTION_INTERVAL_MINUTES: int = 15
    METRICS_INTERVAL_HOURS: int = 24


def get_settings() -> Settings:
    """Return the Settings instance."""
    return Settings()
