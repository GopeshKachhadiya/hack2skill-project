"""
main.py — FastAPI application entry point.

Startup sequence:
  1. Configure structured logging (Loguru)
  2. Create PostgreSQL tables (if not already exist)
  3. Register API router (all REST endpoints)
  4. Register WebSocket endpoint
  5. Start APScheduler background jobs
  6. Add CORS middleware for Frontend integration

Run locally:
  uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.api.routes import router
from app.api.websocket import websocket_disruptions
from app.config import get_settings
from app.database import create_all_tables

settings = get_settings()

# ── Logging setup ─────────────────────────────────────────────────────────────
logger.remove()                           # Remove default stderr handler
logger.add(
    sys.stderr,
    format=(
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    ),
    level="DEBUG" if settings.DEBUG else "INFO",
    colorize=True,
)
logger.add(
    "logs/backend_{time:YYYY-MM-DD}.log",
    rotation="00:00",          # New file every midnight
    retention="14 days",
    compression="zip",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} - {message}",
)


# ── Lifespan (replaces @app.on_event startup/shutdown) ───────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup & shutdown hooks."""
    # ── Startup ───────────────────────────────────────────────────────────────
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Ensure log directory exists
    Path("logs").mkdir(exist_ok=True)

    # Ensure model storage directory exists
    Path(settings.MODEL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)

    # Create DB tables
    try:
        create_all_tables()
    except Exception as exc:
        logger.warning(f"DB table creation skipped (may already exist): {exc}")

    # Start APScheduler
    try:
        from app.tasks.background_jobs import scheduler
        scheduler.start()
        logger.success("✅ APScheduler started (15-min data ingestion + prediction jobs)")
    except Exception as exc:
        logger.warning(f"APScheduler startup failed (non-critical): {exc}")

    # Warm-up: trigger initial ingestion in background
    try:
        import asyncio
        from app.services.data_ingestion import ingest_all_data
        asyncio.create_task(ingest_all_data())
        logger.info("🌡️  Initial data ingestion triggered.")
    except Exception as exc:
        logger.debug(f"Warm-up ingestion skipped: {exc}")

    logger.success(
        f"✅ {settings.APP_NAME} ready. "
        f"Docs: http://localhost:8000/docs"
    )

    yield  # ←── app is running

    # ── Shutdown ──────────────────────────────────────────────────────────────
    try:
        from app.tasks.background_jobs import scheduler
        if scheduler.running:
            scheduler.shutdown(wait=False)
            logger.info("APScheduler stopped.")
    except Exception:
        pass

    logger.info("👋 Application shut down.")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "🚀 **Supply Chain Resilience API** — Predictive disruption detection "
        "engine using Prophet time-series forecasting. "
        "Predicts disruptions 48-72 hours in advance across global shipping lanes."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",          # Next.js dev server
        "http://localhost:5173",          # Vite dev server
        "https://*.vercel.app",           # Vercel deployments
        "https://*.railway.app",          # Railway deployments
        "*",                              # open for hackathon; restrict in prod
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(router, prefix=settings.API_PREFIX)

# WebSocket endpoint
app.add_api_websocket_route("/ws/disruptions", websocket_disruptions)


# ── Root redirect ─────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health",
    }
