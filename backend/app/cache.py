"""
cache.py — Redis connection pool + helper utilities.
"""

import json
from typing import Any, Optional

import redis
from loguru import logger

from app.config import get_settings

settings = get_settings()

# ── Connection pool (shared across the process) ───────────────────────────────
_pool: Optional[redis.ConnectionPool] = None


def get_redis_pool() -> redis.ConnectionPool:
    """Return (and lazily create) the global Redis connection pool."""
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=50,
        )
        logger.info("✅ Redis connection pool initialised.")
    return _pool


def get_redis_client() -> redis.Redis:
    """Return a Redis client backed by the global pool."""
    return redis.Redis(connection_pool=get_redis_pool())


# ── Cache helpers ─────────────────────────────────────────────────────────────

def cache_set(key: str, value: Any, ttl: int = 300) -> bool:
    """
    Serialise *value* to JSON and store it at *key* with *ttl* seconds TTL.
    Returns True on success, False on error.
    """
    try:
        client = get_redis_client()
        client.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception as exc:
        logger.warning(f"Redis SET failed for key={key!r}: {exc}")
        return False


def cache_get(key: str) -> Optional[Any]:
    """
    Retrieve and deserialise the JSON value stored at *key*.
    Returns None on cache miss or error.
    """
    try:
        client = get_redis_client()
        raw = client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as exc:
        logger.warning(f"Redis GET failed for key={key!r}: {exc}")
        return None


def cache_delete(key: str) -> bool:
    """Delete *key* from Redis. Returns True if deleted, False otherwise."""
    try:
        client = get_redis_client()
        return bool(client.delete(key))
    except Exception as exc:
        logger.warning(f"Redis DELETE failed for key={key!r}: {exc}")
        return False


def cache_exists(key: str) -> bool:
    """Return True if *key* exists in Redis."""
    try:
        return bool(get_redis_client().exists(key))
    except Exception:
        return False
