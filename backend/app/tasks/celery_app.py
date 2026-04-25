"""
tasks/celery_app.py — Celery application configuration.
"""

from celery import Celery
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "supply_chain",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.background_jobs"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.tasks.background_jobs.run_data_ingestion": {"queue": "ingestion"},
        "app.tasks.background_jobs.run_prediction_cycle": {"queue": "prediction"},
        "app.tasks.background_jobs.run_model_retraining": {"queue": "training"},
    },
    beat_schedule={
        "data-ingestion-every-15min": {
            "task": "app.tasks.background_jobs.run_data_ingestion",
            "schedule": 60 * 15,       # 15 minutes
            "options": {"queue": "ingestion"},
        },
        "prediction-every-15min": {
            "task": "app.tasks.background_jobs.run_prediction_cycle",
            "schedule": 60 * 15,
            "options": {"queue": "prediction"},
        },
        "metrics-daily": {
            "task": "app.tasks.background_jobs.run_metrics_evaluation",
            "schedule": 60 * 60 * 24,  # 24 hours
            "options": {"queue": "prediction"},
        },
        "model-retraining-weekly": {
            "task": "app.tasks.background_jobs.run_model_retraining",
            "schedule": 60 * 60 * 24 * 7,  # weekly
            "options": {"queue": "training"},
        },
    },
)
