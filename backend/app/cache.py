

import json
import time
from typing import Any, Optional, Dict, Tuple

import redis
from loguru import logger

from app.config import get_settings

settings = get_settings()

_pool: Optional[redis.ConnectionPool] = None
_redis_available = True
_last_check = 0

_memory_cache: Dict[str, Tuple[str, float]] = {}

def get_redis_pool() -> Optional[redis.ConnectionPool]:
    
    global _pool, _redis_available, _last_check
    
    now = time.time()
    if not _redis_available and (now - _last_check < 60):
        return None
    
    _last_check = now
    
    if _pool is None:
        try:
            _pool = redis.ConnectionPool.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                max_connections=50,
                socket_connect_timeout=1, # Don't hang if Redis is down
            )
            client = redis.Redis(connection_pool=_pool)
            client.ping()
            _redis_available = True
            logger.info(" Redis connection pool initialised.")
        except Exception as exc:
            _redis_available = False
            _pool = None
            logger.warning(f"⚠️ Redis unavailable, using in-memory fallback. Error: {exc}")
    
    return _pool

def get_redis_client() -> Optional[redis.Redis]:
    
    pool = get_redis_pool()
    if pool:
        return redis.Redis(connection_pool=pool)
    return None


def cache_set(key: str, value: Any, ttl: int = 300) -> bool:
    
    val_json = json.dumps(value, default=str)
    
    client = get_redis_client()
    if client:
        try:
            client.setex(key, ttl, val_json)
            return True
        except Exception:
            pass # Fall through to memory
            
    _memory_cache[key] = (val_json, time.time() + ttl)
    return True

def cache_get(key: str) -> Optional[Any]:
    
    client = get_redis_client()
    if client:
        try:
            raw = client.get(key)
            if raw:
                return json.loads(raw)
        except Exception:
            pass # Fall through to memory
            
    if key in _memory_cache:
        val_json, expiry = _memory_cache[key]
        if time.time() < expiry:
            return json.loads(val_json)
        else:
            del _memory_cache[key]
            
    return None

def cache_delete(key: str) -> bool:
    
    deleted = False
    client = get_redis_client()
    if client:
        try:
            deleted = bool(client.delete(key))
        except Exception:
            pass
            
    if key in _memory_cache:
        del _memory_cache[key]
        deleted = True
        
    return deleted

def cache_exists(key: str) -> bool:
    
    client = get_redis_client()
    if client:
        try:
            if client.exists(key):
                return True
        except Exception:
            pass
            
    if key in _memory_cache:
        _, expiry = _memory_cache[key]
        if time.time() < expiry:
            return True
        else:
            del _memory_cache[key]
            
    return False