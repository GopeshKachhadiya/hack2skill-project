"""
database.py — Database engine + session factory via SQLAlchemy.

Supports both SQLite (local dev) and PostgreSQL (production).
SQLite is automatically detected and configured with compatible settings.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from loguru import logger

from app.config import get_settings

settings = get_settings()

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# ── Engine — compatible with both SQLite and PostgreSQL ───────────────────────
if _is_sqlite:
    # SQLite: no pool settings; check_same_thread=False needed for FastAPI
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=settings.DEBUG,
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=settings.DEBUG,
    )

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


# ── Dependency for FastAPI routes ─────────────────────────────────────────────
def get_db():
    """Yield a SQLAlchemy session, ensuring cleanup on exit."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def create_all_tables() -> None:
    """Create all tables from ORM metadata (used in startup)."""
    from app.models import shipment, disruption, weather  # noqa: F401 – side-effect imports
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created / verified.")
