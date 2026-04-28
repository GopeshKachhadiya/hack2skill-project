

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



def _run_async(coro):
    
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



@celery_app.task(
    bind=True,
    name="app.tasks.background_jobs.run_data_ingestion",
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def run_data_ingestion(self) -> Dict:
    
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
    
    from app.services.prediction_engine import predict_disruptions
    try:
        logger.info(" Starting prediction cycle …")
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
    
    from app.ml.model_evaluation import build_mock_performance_report
    try:
        logger.info(" Running metrics evaluation …")
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
    
    from app.ml.prophet_model import retrain_all_prophet_models
    try:
        logger.info("🔄 Starting weekly model retraining …")
        summary = retrain_all_prophet_models()
        logger.success(f"Retraining complete: {summary}")
        return summary
    except Exception as exc:
        logger.error(f"Model retraining failed: {exc}")
        raise self.retry(exc=exc)



def _create_scheduler() -> BackgroundScheduler:
    
    scheduler = BackgroundScheduler(timezone="UTC")

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

    scheduler.add_job(
        func=lambda: __import__(
            "app.ml.prophet_model", fromlist=["retrain_all_prophet_models"]
        ).retrain_all_prophet_models(),
        trigger=CronTrigger(day_of_week="sun", hour=2, minute=0),
        id="weekly_retraining",
        max_instances=1,
        name="Weekly Model Retraining",
    )

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


scheduler: BackgroundScheduler = _create_scheduler()