"""
ml/feature_engineering.py — Time-series feature engineering for Prophet.

Converts raw DB records into a Prophet-ready DataFrame with:
  • Rolling statistics
  • Lag features (t-1, t-7, t-30)
  • Cyclical encodings (sin/cos)
  • Normalisation to [0, 1]
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import List

import numpy as np
import pandas as pd
from loguru import logger


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sin_cos_encode(series: pd.Series, period: float) -> tuple[pd.Series, pd.Series]:
    """Return (sin, cos) cyclical encoding for *series* with given *period*."""
    angle = 2 * math.pi * series / period
    return np.sin(angle), np.cos(angle)


def _clip_and_norm(series: pd.Series) -> pd.Series:
    """Normalise *series* to [0, 1]; return 0.5 for constant inputs."""
    lo, hi = series.min(), series.max()
    if hi == lo:
        return pd.Series(0.5, index=series.index)
    return (series - lo) / (hi - lo)


# ── Main function ─────────────────────────────────────────────────────────────

def engineer_time_series_features(
    raw_data: pd.DataFrame,
    lookback_days: int = 90,
) -> pd.DataFrame:
    """
    Transform raw disruption / weather DataFrame into Prophet-ready format.

    Parameters
    ----------
    raw_data : pd.DataFrame
        Must have at minimum columns: ``ds`` (datetime) and ``y`` (numeric target).
        Optional extra columns: ``weather_severity``, ``traffic_index``.
    lookback_days : int
        How many days of history to include.

    Returns
    -------
    pd.DataFrame
        Prophet-compatible DataFrame with ``ds``, ``y`` and all regressor columns.
    """
    if raw_data.empty:
        logger.warning("engineer_time_series_features: received empty DataFrame.")
        return raw_data.copy()

    df = raw_data.copy()

    # ── Ensure datetime index ─────────────────────────────────────────────────
    df["ds"] = pd.to_datetime(df["ds"])
    df = df.sort_values("ds").reset_index(drop=True)

    # ── Trim to lookback window ───────────────────────────────────────────────
    cutoff = df["ds"].max() - timedelta(days=lookback_days)
    df = df[df["ds"] >= cutoff].reset_index(drop=True)

    # ── Interpolate missing target values ─────────────────────────────────────
    df["y"] = df["y"].interpolate(method="linear").fillna(0.0)

    # ── Cyclical time features ────────────────────────────────────────────────
    df["hour_sin"], df["hour_cos"] = _sin_cos_encode(df["ds"].dt.hour, 24)
    df["dow_sin"], df["dow_cos"] = _sin_cos_encode(df["ds"].dt.dayofweek, 7)
    df["month_sin"], df["month_cos"] = _sin_cos_encode(df["ds"].dt.month, 12)

    # ── Lag features ─────────────────────────────────────────────────────────
    for lag in [1, 7, 30]:
        df[f"lag_{lag}d"] = df["y"].shift(lag * 24).fillna(0.0)  # hourly data

    # ── Rolling statistics (7-day window) ─────────────────────────────────────
    window = 7 * 24  # 7 days in hours
    df["rolling_mean_7d"] = df["y"].rolling(window, min_periods=1).mean()
    df["rolling_std_7d"] = df["y"].rolling(window, min_periods=1).std().fillna(0.0)
    df["rolling_max_7d"] = df["y"].rolling(window, min_periods=1).max()

    # ── Weather severity (if available) ──────────────────────────────────────
    if "weather_severity" in df.columns:
        df["weather_severity"] = _clip_and_norm(
            df["weather_severity"].fillna(0.0)
        )
    else:
        df["weather_severity"] = 0.0

    # ── Traffic index (if available) ─────────────────────────────────────────
    if "traffic_index" in df.columns:
        df["traffic_index"] = _clip_and_norm(
            df["traffic_index"].fillna(0.0)
        )
    else:
        df["traffic_index"] = 0.0

    # ── Holiday / weekend flag ────────────────────────────────────────────────
    df["is_weekend"] = (df["ds"].dt.dayofweek >= 5).astype(float)

    # ── Normalise target ──────────────────────────────────────────────────────
    df["y"] = df["y"].clip(0.0, 1.0)

    logger.info(
        f"Feature engineering complete: {len(df)} rows, "
        f"lookback={lookback_days}d, cols={list(df.columns)}"
    )
    return df


def generate_future_dataframe(
    last_ds: datetime,
    hours: int = 72,
) -> pd.DataFrame:
    """
    Create a future DataFrame (Prophet ``make_future_dataframe`` equivalent)
    with all regressor columns set to neutral defaults.

    Parameters
    ----------
    last_ds : datetime
        Last known timestamp in the training data.
    hours : int
        Number of future hours to forecast.

    Returns
    -------
    pd.DataFrame
    """
    future_dates = pd.date_range(
        start=last_ds + timedelta(hours=1),
        periods=hours,
        freq="h",
    )
    df = pd.DataFrame({"ds": future_dates})

    # Cyclical features
    df["hour_sin"], df["hour_cos"] = _sin_cos_encode(df["ds"].dt.hour, 24)
    df["dow_sin"], df["dow_cos"] = _sin_cos_encode(df["ds"].dt.dayofweek, 7)
    df["month_sin"], df["month_cos"] = _sin_cos_encode(df["ds"].dt.month, 12)

    # Neutral defaults for regressors (will be overridden with live data)
    df["weather_severity"] = 0.2
    df["traffic_index"] = 0.3
    df["is_weekend"] = (df["ds"].dt.dayofweek >= 5).astype(float)
    df["lag_1d"] = 0.0
    df["lag_7d"] = 0.0
    df["lag_30d"] = 0.0
    df["rolling_mean_7d"] = 0.2
    df["rolling_std_7d"] = 0.05
    df["rolling_max_7d"] = 0.4

    return df
