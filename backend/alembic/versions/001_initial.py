"""Initial migration — create all 6 tables.

Revision ID: 001_initial
Revises: 
Create Date: 2026-04-25
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── ENUM types ─────────────────────────────────────────────────────────────
    shipment_priority = postgresql.ENUM(
        "normal", "urgent", "time-sensitive", name="shipment_priority", create_type=False
    )
    shipment_status = postgresql.ENUM(
        "pending", "in_transit", "delayed", "delivered", "cancelled",
        name="shipment_status", create_type=False,
    )
    weather_severity = postgresql.ENUM(
        "low", "medium", "high", "critical", name="weather_severity", create_type=False
    )
    disruption_status = postgresql.ENUM(
        "active", "resolved", "expired", name="disruption_status", create_type=False
    )

    for enum in [shipment_priority, shipment_status, weather_severity, disruption_status]:
        enum.create(op.get_bind(), checkfirst=True)

    # ── 1. shipments ──────────────────────────────────────────────────────────
    op.create_table(
        "shipments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("origin", sa.String(255), nullable=False),
        sa.Column("destination", sa.String(255), nullable=False),
        sa.Column("cargo_type", sa.String(100), nullable=True),
        sa.Column("priority", shipment_priority, server_default="normal"),
        sa.Column("departure_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expected_arrival", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_status", shipment_status, server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_shipments_origin", "shipments", ["origin"])
    op.create_index("ix_shipments_destination", "shipments", ["destination"])

    # ── 2. weather_data ───────────────────────────────────────────────────────
    op.create_table(
        "weather_data",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("location", sa.String(255), nullable=False),
        sa.Column("temperature", sa.Float, nullable=True),
        sa.Column("humidity", sa.Float, nullable=True),
        sa.Column("wind_speed", sa.Float, nullable=True),
        sa.Column("weather_condition", sa.String(100), nullable=True),
        sa.Column("severity", weather_severity, server_default="low", nullable=False),
        sa.Column("raw_response", sa.String, nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_weather_location", "weather_data", ["location"])
    op.create_index("ix_weather_timestamp", "weather_data", ["timestamp"])
    op.create_index("ix_weather_severity", "weather_data", ["severity"])

    # ── 3. disruption_predictions ─────────────────────────────────────────────
    op.create_table(
        "disruption_predictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("shipment_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=True),
        sa.Column("disruption_type", sa.String(100), nullable=False),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("predicted_severity", sa.Float, nullable=False),
        sa.Column("probability", sa.Float, nullable=False),
        sa.Column("confidence_score", sa.Float, nullable=False),
        sa.Column("predicted_window_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("predicted_window_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recommended_action", sa.Text, nullable=True),
        sa.Column("affected_shipments_count", sa.Integer, server_default="0"),
        sa.Column("status", disruption_status, server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_disruption_shipment_id", "disruption_predictions", ["shipment_id"])
    op.create_index("ix_disruption_type", "disruption_predictions", ["disruption_type"])
    op.create_index("ix_disruption_location", "disruption_predictions", ["location"])
    op.create_index("ix_disruption_status", "disruption_predictions", ["status"])
    op.create_index("ix_disruption_created_at", "disruption_predictions", ["created_at"])

    # ── 4. route_history ──────────────────────────────────────────────────────
    op.create_table(
        "route_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("shipment_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("original_route", postgresql.JSON, nullable=True),
        sa.Column("optimized_route", postgresql.JSON, nullable=True),
        sa.Column("time_saved", sa.Integer, nullable=True),
        sa.Column("distance_saved_km", sa.Float, nullable=True),
        sa.Column("algorithm", sa.String(50), server_default="A*"),
        sa.Column("optimization_timestamp", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_route_shipment_id", "route_history", ["shipment_id"])

    # ── 5. prophet_forecasts ──────────────────────────────────────────────────
    op.create_table(
        "prophet_forecasts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("disruption_type", sa.String(100), nullable=False),
        sa.Column("location", sa.String(255), nullable=False),
        sa.Column("forecast_value", sa.Float, nullable=False),
        sa.Column("forecast_lower", sa.Float, nullable=True),
        sa.Column("forecast_upper", sa.Float, nullable=True),
        sa.Column("forecast_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("model_trained_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("training_data_points", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_forecast_type", "prophet_forecasts", ["disruption_type"])
    op.create_index("ix_forecast_location", "prophet_forecasts", ["location"])
    op.create_index("ix_forecast_timestamp", "prophet_forecasts", ["forecast_timestamp"])

    # ── 6. api_call_logs ──────────────────────────────────────────────────────
    op.create_table(
        "api_call_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("api_source", sa.String(100), nullable=False),
        sa.Column("endpoint_url", sa.String(500), nullable=True),
        sa.Column("status_code", sa.Integer, nullable=True),
        sa.Column("response_time_ms", sa.Integer, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_api_log_source", "api_call_logs", ["api_source"])
    op.create_index("ix_api_log_timestamp", "api_call_logs", ["timestamp"])


def downgrade() -> None:
    op.drop_table("api_call_logs")
    op.drop_table("prophet_forecasts")
    op.drop_table("route_history")
    op.drop_table("disruption_predictions")
    op.drop_table("weather_data")
    op.drop_table("shipments")
