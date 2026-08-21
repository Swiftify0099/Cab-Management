"""
Redis client  async connection pool with helpers for
cache, Pub/Sub, rate limiting, and session management.
"""
import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from common.config import settings

logger = logging.getLogger(__name__)

# Global Redis pool
_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Get the Redis connection (creates pool on first call)."""
    global _redis_pool
    if _redis_pool is None:
        redis_url = settings.REDIS_URL
        if not redis_url or 'localhost' in redis_url or '127.0.0.1' in redis_url:
            redis_url = 'rediss://default:gQAAAAAAApumAAIgcDJhYWMyMzA5NmNkOTI0MGYzOTYzNDY4YTJkMzU1YjBkMw@stunning-squid-170918.upstash.io:6379'

        _redis_pool = aioredis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            max_connections=settings.REDIS_POOL_SIZE,
        )
    return _redis_pool


async def close_redis() -> None:
    """Close the Redis connection pool."""
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None


# ============================================================
# Cache Helpers
# ============================================================

async def cache_set(key: str, value: Any, expire_seconds: int = 300) -> None:
    """Set a JSON-serializable value in Redis."""
    r = await get_redis()
    await r.setex(key, expire_seconds, json.dumps(value, default=str))


async def cache_get(key: str) -> Optional[Any]:
    """Get a JSON value from Redis. Returns None if not found."""
    r = await get_redis()
    raw = await r.get(key)
    if raw is None:
        return None
    return json.loads(raw)


async def cache_delete(key: str) -> None:
    """Delete a Redis key."""
    r = await get_redis()
    await r.delete(key)


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching pattern. Returns count deleted."""
    r = await get_redis()
    keys = await r.keys(pattern)
    if keys:
        return await r.delete(*keys)
    return 0


# ============================================================
# OTP Store
# ============================================================

async def store_otp(phone: str, otp: str, expire_seconds: int = 600) -> None:
    """Store OTP with expiry."""
    r = await get_redis()
    await r.setex(f"otp:{phone}", expire_seconds, otp)


async def get_otp(phone: str) -> Optional[str]:
    """Retrieve OTP. Returns None if expired or not set."""
    r = await get_redis()
    return await r.get(f"otp:{phone}")


async def delete_otp(phone: str) -> None:
    """Delete OTP after successful verification."""
    r = await get_redis()
    await r.delete(f"otp:{phone}")


async def increment_otp_requests(phone: str) -> int:
    """Increment OTP request count for rate limiting. Returns new count."""
    r = await get_redis()
    key = f"otp_rate:{phone}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, 3600)  # 1 hour window
    return count


# ============================================================
# Token Blacklist (for logout)
# ============================================================

async def blacklist_token(jti: str, expire_seconds: int = 3600) -> None:
    """Add JWT JTI to blacklist (revoke access token)."""
    r = await get_redis()
    await r.setex(f"blacklist:{jti}", expire_seconds, "1")


async def is_token_blacklisted(jti: str) -> bool:
    """Check if a token JTI is blacklisted."""
    r = await get_redis()
    return await r.exists(f"blacklist:{jti}") == 1


# ============================================================
# Driver Online Status
# ============================================================

async def set_driver_online(driver_id: str, location_data: dict) -> None:
    """Mark driver as online with location data (TTL 30s  heartbeat)."""
    r = await get_redis()
    await r.setex(
        f"driver:online:{driver_id}",
        30,
        json.dumps(location_data, default=str),
    )


async def get_online_driver(driver_id: str) -> Optional[dict]:
    """Get online driver location data."""
    r = await get_redis()
    raw = await r.get(f"driver:online:{driver_id}")
    return json.loads(raw) if raw else None


async def set_driver_offline(driver_id: str) -> None:
    """Remove driver from online pool."""
    r = await get_redis()
    await r.delete(f"driver:online:{driver_id}")


# ============================================================
# Pub/Sub Publisher
# ============================================================

async def publish_event(channel: str, event: dict) -> None:
    """Publish an event to a Redis Pub/Sub channel."""
    r = await get_redis()
    await r.publish(channel, json.dumps(event, default=str))


# ============================================================
# Rate Limiting
# ============================================================

async def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
    """
    Sliding window rate limiter.
    Returns (is_allowed, current_count).
    """
    r = await get_redis()
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, window_seconds)
    return count <= max_requests, count
