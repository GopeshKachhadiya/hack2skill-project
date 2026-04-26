"""
database.py — SQLite engine + SQLAlchemy ORM initialization.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from loguru import logger

from app.config import get_settings
from app.models.base import Base

settings = get_settings()

# Use database URL from settings
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

async def init_db() -> None:
    """Initialize the database by creating all tables."""
    logger.info("Initializing SQLite database via SQLAlchemy...")
    try:
        # Create all tables defined in models
        Base.metadata.create_all(bind=engine)
        logger.success("SQLite database initialization complete.")
    except Exception as exc:
        logger.error(f"Database initialization failed: {exc}")
        raise

def get_db():
    """Dependency for getting a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
