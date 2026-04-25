"""
ml/prophet_model.py — Prophet training, serialisation, and prediction pipeline.

Four specialist models are trained:
  1. disruption_likelihood  – probability of a disruption occurring
  2. disruption_severity    – predicted severity (0-1) if one occurs
  3. resolution_duration    – expected hours to resolve
  4. route_delay            – expected delay in hours for a route
"""

from __future__ import annotations

import os
import pickle
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from loguru import logger

from app.config import get_settings
from app.ml.feature_engineering import engineer_time_series_features, generate_future_dataframe

settings = get_settings()

# ── Model registry ────────────────────────────────────────────────────────────
MODEL_TYPES = [
    "disruption_likelihood",
    "disruption_severity",
    "resolution_duration",
    "route_delay",
]

# Extra regressors added to every model
REGRESSORS = [
    "weather_severity",
    "traffic_index",
    "is_weekend",
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _model_path(model_type: str, location: str) -> Path:
    """Return the filesystem path for a serialised Prophet model."""
    safe_loc = location.lower().replace(" ", "_").replace("/", "-")
    storage = Path(settings.MODEL_STORAGE_PATH)
    storage.mkdir(parents=True, exist_ok=True)
    return storage / f"{model_type}__{safe_loc}.pkl"


def _make_synthetic_training_data(
    model_type: str,
    location: str,
    n_hours: int = 2160,  # 90 days
) -> pd.DataFrame:
    """
    Generate synthetic training data when no real historical data exists.
    Used for hackathon bootstrapping.
    """
    rng = np.random.default_rng(seed=42)
    dates = pd.date_range(end=datetime.utcnow(), periods=n_hours, freq="h")

    # Base signal with seasonality + noise
    base = 0.2 + 0.1 * np.sin(np.linspace(0, 6 * np.pi, n_hours))
    noise = rng.normal(0, 0.05, n_hours)
    spike_mask = rng.random(n_hours) < 0.03            # 3% chance of spike
    spikes = rng.uniform(0.5, 0.9, n_hours) * spike_mask

    y = np.clip(base + noise + spikes, 0.0, 1.0)

    df = pd.DataFrame({
        "ds": dates,
        "y": y,
        "weather_severity": np.clip(rng.normal(0.2, 0.1, n_hours), 0, 1),
        "traffic_index": np.clip(rng.normal(0.3, 0.15, n_hours), 0, 1),
    })
    return engineer_time_series_features(df, lookback_days=90)


# ── Core training function ────────────────────────────────────────────────────

def train_prophet_model(
    training_data: pd.DataFrame,
    model_type: str,
    location: str = "global",
) -> object:
    """
    Train (or retrain) a Prophet model for *model_type* at *location*.

    Parameters
    ----------
    training_data : pd.DataFrame
        Must contain ``ds`` and ``y`` columns plus any regressor columns.
    model_type : str
        One of MODEL_TYPES.
    location : str
        Location label (used in model filename).

    Returns
    -------
    Trained Prophet model instance.

    Raises
    ------
    ImportError if Prophet is not installed.
    ValueError if training data is insufficient.
    """
    try:
        from prophet import Prophet  # lazy import – Prophet is large
    except ImportError as exc:
        raise ImportError(
            "Facebook Prophet is not installed. "
            "Run: pip install prophet"
        ) from exc

    if len(training_data) < 48:
        raise ValueError(
            f"Insufficient training data: {len(training_data)} rows "
            "(minimum 48 required)."
        )

    df = training_data[["ds", "y"] + REGRESSORS].copy()
    df["ds"] = pd.to_datetime(df["ds"])
    df = df.dropna(subset=["ds", "y"])

    logger.info(
        f"Training Prophet model: type={model_type!r} "
        f"location={location!r} rows={len(df)}"
    )

    model = Prophet(
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10,
        holidays_prior_scale=10,
        daily_seasonality=True,
        weekly_seasonality=True,
        yearly_seasonality=False,      # not enough data at hackathon time
        uncertainty_samples=200,
        interval_width=0.80,
    )

    # Add external regressors
    for reg in REGRESSORS:
        if reg in df.columns:
            model.add_regressor(reg, standardize=True)

    model.fit(df)

    # Persist to disk
    path = _model_path(model_type, location)
    with open(path, "wb") as fh:
        pickle.dump(model, fh)

    logger.success(
        f"Model saved → {path} "
        f"(trained on {len(df)} data points)"
    )
    return model


def load_prophet_model(model_type: str, location: str = "global") -> Optional[object]:
    """
    Load a previously trained Prophet model from disk.
    Returns None if no model file exists yet.
    """
    path = _model_path(model_type, location)
    if not path.exists():
        logger.debug(f"No saved model found at {path}")
        return None
    with open(path, "rb") as fh:
        model = pickle.load(fh)
    logger.debug(f"Loaded model from {path}")
    return model


# ── Prediction function ───────────────────────────────────────────────────────

def predict_with_prophet(
    model_type: str,
    location: str = "global",
    horizon_hours: int = 72,
    live_weather_severity: float = 0.2,
    live_traffic_index: float = 0.3,
) -> List[Dict]:
    """
    Generate a *horizon_hours* forecast using the loaded Prophet model.

    Falls back to training a synthetic model if none exists.

    Returns
    -------
    list of dicts with keys:
        ``timestamp``, ``forecast_value``, ``lower``, ``upper``.
    """
    model = load_prophet_model(model_type, location)

    if model is None:
        logger.warning(
            f"No model found for {model_type!r}@{location!r}. "
            "Bootstrapping with synthetic data …"
        )
        synthetic = _make_synthetic_training_data(model_type, location)
        model = train_prophet_model(synthetic, model_type, location)

    # Build future DataFrame
    last_ds = datetime.utcnow()
    future = generate_future_dataframe(last_ds, hours=horizon_hours)
    future["weather_severity"] = live_weather_severity
    future["traffic_index"] = live_traffic_index

    forecast = model.predict(future)

    results = []
    for _, row in forecast.iterrows():
        results.append({
            "timestamp": row["ds"].isoformat(),
            "forecast_value": float(np.clip(row["yhat"], 0.0, 1.0)),
            "lower": float(np.clip(row["yhat_lower"], 0.0, 1.0)),
            "upper": float(np.clip(row["yhat_upper"], 0.0, 1.0)),
        })

    logger.info(
        f"Prophet forecast generated: type={model_type!r} "
        f"location={location!r} points={len(results)}"
    )
    return results


# ── Batch retraining ──────────────────────────────────────────────────────────

def retrain_all_prophet_models(locations: Optional[List[str]] = None) -> Dict:
    """
    Retrain all MODEL_TYPES × locations with synthetic (or real) data.
    Returns a summary dict.
    """
    if locations is None:
        locations = [
            "port_of_shanghai", "port_of_rotterdam", "port_of_singapore",
            "suez_canal", "strait_of_malacca",
        ]

    summary = {"trained": [], "failed": []}
    for loc in locations:
        for mtype in MODEL_TYPES:
            try:
                data = _make_synthetic_training_data(mtype, loc)
                train_prophet_model(data, mtype, loc)
                summary["trained"].append(f"{mtype}@{loc}")
            except Exception as exc:
                logger.error(f"Retraining failed {mtype}@{loc}: {exc}")
                summary["failed"].append(f"{mtype}@{loc}: {exc}")

    logger.info(
        f"Batch retraining complete: "
        f"{len(summary['trained'])} OK, {len(summary['failed'])} failed."
    )
    return summary
