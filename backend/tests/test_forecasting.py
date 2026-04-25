"""
tests/test_forecasting.py — Unit tests for the Prophet pipeline.

Tests:
  • Feature engineering output shape
  • Synthetic training data generation
  • Prophet model train + predict round-trip
  • Model evaluation metrics
"""

import numpy as np
import pandas as pd
import pytest
from datetime import datetime, timedelta

from app.ml.feature_engineering import (
    engineer_time_series_features,
    generate_future_dataframe,
)
from app.ml.model_evaluation import evaluate_forecast_accuracy, build_mock_performance_report


# ── Feature Engineering ───────────────────────────────────────────────────────

def _make_raw_df(n_hours: int = 200) -> pd.DataFrame:
    """Helper: create a minimal raw DataFrame for testing."""
    dates = pd.date_range(end=datetime.utcnow(), periods=n_hours, freq="h")
    rng = np.random.default_rng(0)
    return pd.DataFrame({
        "ds": dates,
        "y": rng.uniform(0.0, 1.0, n_hours),
        "weather_severity": rng.uniform(0.0, 1.0, n_hours),
        "traffic_index": rng.uniform(0.0, 1.0, n_hours),
    })


def test_feature_engineering_output_columns():
    df = _make_raw_df()
    result = engineer_time_series_features(df, lookback_days=5)
    required_cols = {
        "ds", "y",
        "hour_sin", "hour_cos",
        "dow_sin", "dow_cos",
        "month_sin", "month_cos",
        "rolling_mean_7d", "rolling_std_7d", "rolling_max_7d",
        "weather_severity", "traffic_index",
        "is_weekend",
        "lag_1d", "lag_7d", "lag_30d",
    }
    assert required_cols.issubset(set(result.columns))


def test_feature_engineering_y_range():
    df = _make_raw_df()
    result = engineer_time_series_features(df)
    assert result["y"].between(0.0, 1.0).all(), "y must be clipped to [0, 1]"


def test_feature_engineering_empty_input():
    empty = pd.DataFrame(columns=["ds", "y"])
    result = engineer_time_series_features(empty)
    assert result.empty


def test_generate_future_dataframe_length():
    last_ds = datetime.utcnow()
    future = generate_future_dataframe(last_ds, hours=72)
    assert len(future) == 72


def test_generate_future_dataframe_columns():
    future = generate_future_dataframe(datetime.utcnow(), hours=12)
    assert "ds" in future.columns
    assert "weather_severity" in future.columns
    assert "traffic_index" in future.columns


# ── Model Evaluation ──────────────────────────────────────────────────────────

def test_evaluate_empty_inputs():
    metrics = evaluate_forecast_accuracy(
        actuals=pd.DataFrame(),
        predictions=pd.DataFrame(),
    )
    assert metrics["precision"] == 0.0
    assert metrics["recall"] == 0.0


def test_evaluate_perfect_predictions():
    ts = pd.date_range(start="2024-01-01", periods=100, freq="h")
    actuals = pd.DataFrame({
        "timestamp": ts,
        "disruption_flag": [1 if i % 10 == 0 else 0 for i in range(100)],
    })
    preds = pd.DataFrame({
        "timestamp": ts,
        "forecast_value": [0.9 if i % 10 == 0 else 0.1 for i in range(100)],
    })
    metrics = evaluate_forecast_accuracy(actuals, preds, threshold=0.5)
    assert metrics["precision"] >= 0.9
    assert metrics["recall"] >= 0.9


def test_mock_performance_report_structure():
    report = build_mock_performance_report()
    assert "model_accuracy" in report
    assert "coverage" in report
    assert "last_retrained" in report
    assert 0 <= report["model_accuracy"]["precision"] <= 1


# ── Prophet Train + Predict (integration, slow) ───────────────────────────────

@pytest.mark.slow
def test_prophet_train_and_predict():
    """Full Prophet round-trip test — skipped in fast test mode."""
    from app.ml.prophet_model import train_prophet_model, predict_with_prophet, _make_synthetic_training_data
    data = _make_synthetic_training_data("disruption_likelihood", "test_location", n_hours=500)
    model = train_prophet_model(data, "disruption_likelihood", "test_location")
    assert model is not None

    forecasts = predict_with_prophet(
        "disruption_likelihood", "test_location", horizon_hours=24
    )
    assert len(forecasts) == 24
    for pt in forecasts:
        assert 0.0 <= pt["forecast_value"] <= 1.0
        assert pt["lower"] <= pt["forecast_value"] <= pt["upper"]
