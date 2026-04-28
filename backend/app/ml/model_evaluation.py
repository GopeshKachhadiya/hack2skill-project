

from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd
from loguru import logger


def _safe_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    
    mask = y_true != 0
    if not mask.any():
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def evaluate_forecast_accuracy(
    actuals: pd.DataFrame,
    predictions: pd.DataFrame,
    threshold: float = 0.5,
) -> Dict:
    
    if actuals.empty or predictions.empty:
        logger.warning("evaluate_forecast_accuracy: empty inputs received.")
        return {
            "precision": 0.0, "recall": 0.0, "f1": 0.0,
            "mape": 0.0, "coverage_hours": 0.0,
            "total_predictions": 0, "true_positives": 0,
            "false_positives": 0, "false_negatives": 0,
        }

    actuals["timestamp"] = pd.to_datetime(actuals["timestamp"])
    predictions["timestamp"] = pd.to_datetime(predictions["timestamp"])
    merged = pd.merge_asof(
        actuals.sort_values("timestamp"),
        predictions.sort_values("timestamp"),
        on="timestamp",
        direction="nearest",
        tolerance=pd.Timedelta("1h"),
    ).dropna(subset=["forecast_value"])

    y_true = merged["disruption_flag"].values.astype(float)
    y_pred_raw = merged["forecast_value"].values.astype(float)
    y_pred = (y_pred_raw >= threshold).astype(float)

    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0 else 0.0
    )
    mape = _safe_mape(y_true, y_pred_raw)

    advance_hours = 0.0
    if tp > 0:
        advance_hours = 36.0  # placeholder — real calculation needs event timeline

    metrics = {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "mape": round(mape, 2),
        "coverage_hours": advance_hours,
        "total_predictions": int(y_pred.sum()),
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
    }
    logger.info(f"Model evaluation: {metrics}")
    return metrics


def build_mock_performance_report() -> Dict:
    
    return {
        "model_accuracy": {
            "precision": 0.82,
            "recall": 0.76,
            "f1_score": 0.79,
            "mape": 12.3,
        },
        "coverage": {
            "avg_hours_to_disruption": 36.5,
            "total_disruptions_predicted": 1234,
            "correct_predictions": 1012,
            "false_positives": 89,
        },
        "last_retrained": "2024-04-28T00:00:00Z",
        "next_retraining": "2024-05-05T00:00:00Z",
        "models": {m: "active" for m in [
            "disruption_likelihood",
            "disruption_severity",
            "resolution_duration",
            "route_delay",
        ]},
    }