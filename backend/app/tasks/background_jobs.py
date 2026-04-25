"""
tasks/background_jobs.py — Celery tasks + APScheduler setup.

Registered tasks:
  • run_data_ingestion        (every 15 min)
  • run_prediction_cycle      (every 15 min)
  • run_metrics_evaluation    (daily)
  • run_model_retraining      (weekly)
  • run_db_cleanup            (weekly)
"""

from __future__ import annotations

import asyncio
import functools
from datetime import datetime, timezone
from typing import Dict

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from app.tasks.celery_app import celery_app


# ── Helper to run async functions inside synchronous Celery tasks ─────────────

def _run_async(coro):
    """Run an async coroutine synchronously (used inside Celery tasks)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, coro)
                return future.result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


# ── Celery Tasks ──────────────────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="app.tasks.background_jobs.run_data_ingestion",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def run_data_ingestion(self) -> Dict:
    """
    Celery task: Ingest weather, traffic, and port data from all sources.
    Retries up to 3 times on failure with 60-second delay.
    """
    from app.services.data_ingestion import ingest_all_data
    try:
        logger.info("⚙️  Starting data ingestion task …")
        report = _run_async(ingest_all_data())
        logger.success(f"Data ingestion complete: {report}")
        return report
    except Exception as exc:
        logger.error(f"Data ingestion failed: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="app.tasks.background_jobs.run_prediction_cycle",
    max_retries=2,
    default_retry_delay=120,
    acks_late=True,
)
def run_prediction_cycle(self) -> Dict:
    """
    Celery task: Run the Prophet prediction engine for all hub locations.
    """
    from app.services.prediction_engine import predict_disruptions
    try:
        logger.info("🔮 Starting prediction cycle …")
        results = _run_async(predict_disruptions())
        logger.success(f"Prediction cycle complete: {len(results)} disruptions detected.")
        return {"disruptions_count": len(results), "status": "ok"}
    except Exception as exc:
        logger.error(f"Prediction cycle failed: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="app.tasks.background_jobs.run_metrics_evaluation",
    max_retries=1,
)
def run_metrics_evaluation(self) -> Dict:
    """
    Celery task: Compute prediction accuracy metrics (runs daily).
    """
    from app.ml.model_evaluation import build_mock_performance_report
    try:
        logger.info("📊 Running metrics evaluation …")
        metrics = build_mock_performance_report()
        logger.info(f"Metrics: {metrics}")
        return metrics
    except Exception as exc:
        logger.error(f"Metrics evaluation failed: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="app.tasks.background_jobs.run_model_retraining",
    max_retries=1,
    time_limit=3600,   # 1-hour hard limit
)
def run_model_retraining(self) -> Dict:
    """
    Celery task: Retrain all Prophet models (runs weekly on Sunday 02:00 UTC).
    """
    from app.ml.prophet_model import retrain_all_prophet_models
    try:
        logger.info("🔄 Starting weekly model retraining …")
        summary = retrain_all_prophet_models()
        logger.success(f"Retraining complete: {summary}")
        return summary
    except Exception as exc:
        logger.error(f"Model retraining failed: {exc}")
        raise self.retry(exc=exc)


# ── APScheduler (in-process fallback when Celery workers not running) ─────────

def _create_scheduler() -> BackgroundScheduler:
    """
    Build and configure the APScheduler instance.
    This is the lightweight alternative to Celery for local dev / Railway free tier.
    """
    scheduler = BackgroundScheduler(timezone="UTC")

    # Data ingestion every 15 minutes
    scheduler.add_job(
        func=lambda: _run_async(__import__(
            "app.services.data_ingestion", fromlist=["ingest_all_data"]
        ).ingest_all_data()),
        trigger=IntervalTrigger(minutes=15),
        id="data_ingestion",
        coalesce=True,
        max_instances=1,
        name="Data Ingestion",
    )

    # Disruption prediction every 15 minutes
    scheduler.add_job(
        func=lambda: _run_async(__import__(
            "app.services.prediction_engine", fromlist=["predict_disruptions"]
        ).predict_disruptions()),
        trigger=IntervalTrigger(minutes=15),
        id="disruption_prediction",
        coalesce=True,
        max_instances=1,
        name="Disruption Prediction",
    )

    # Model retraining weekly on Sunday 02:00 UTC
    scheduler.add_job(
        func=lambda: __import__(
            "app.ml.prophet_model", fromlist=["retrain_all_prophet_models"]
        ).retrain_all_prophet_models(),
        trigger=CronTrigger(day_of_week="sun", hour=2, minute=0),
        id="weekly_retraining",
        max_instances=1,
        name="Weekly Model Retraining",
    )

    # Daily metrics evaluation at 01:00 UTC
    scheduler.add_job(
        func=lambda: __import__(
            "app.ml.model_evaluation", fromlist=["build_mock_performance_report"]
        ).build_mock_performance_report(),
        trigger=CronTrigger(hour=1, minute=0),
        id="daily_metrics",
        max_instances=1,
        name="Daily Metrics Evaluation",
    )

    return scheduler


# Singleton scheduler instance used by main.py startup
scheduler: BackgroundScheduler = _create_scheduler()
