"""
Common Tracking Layer — Master Core Architecture
════════════════════════════════════════════════════════════════════════════════
Unified real-time GPS telemetry ingestion, Redis live caching, PostGIS spatial
indexing, and Socket.IO channel distribution for ALL service domains:
- Rides (live vehicle tracking to pickup & dropoff)
- Parcels (courier live location for sender & recipient)
- Freight Transport (commercial truck live route tracking)
- Rentals (geofence and live vehicle location)
- Outstation (intercity highway tracking)
"""
from __future__ import annotations

import json
import time
import uuid
from typing import Optional, Dict, Any

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import DriverLocation, Driver
from common.utils.redis_client import get_redis

logger = structlog.get_logger(__name__)

REDIS_DRIVER_LOC_KEY = "driver:location:{driver_id}"
REDIS_CHANNEL_LIVE_TRACK = "channel:tracking:{job_type}:{job_id}"


class CommonTrackingService:
    """
    Authoritative cross-service GPS tracking and telemetry manager.
    """

    @classmethod
    async def ingest_driver_location(
        cls,
        driver_id: str,
        lat: float,
        lng: float,
        heading: float = 0.0,
        speed_mps: float = 0.0,
        accuracy: float = 5.0,
        active_job_id: Optional[str] = None,
        job_type: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """
        Ingests high-frequency driver GPS update:
        1. Caches in Redis with TTL for low-latency queries (<5ms)
        2. Publishes to Redis pub/sub channel for Socket.IO delivery
        3. Updates PostgreSQL/PostGIS DriverLocation record if db session provided
        """
        payload = {
            "driver_id": driver_id,
            "lat": lat,
            "lng": lng,
            "heading": heading,
            "speed_mps": speed_mps,
            "accuracy": accuracy,
            "active_job_id": active_job_id,
            "job_type": job_type,
            "timestamp": time.time(),
        }

        # 1. Cache in Redis
        try:
            redis = await get_redis()
            if redis:
                key = REDIS_DRIVER_LOC_KEY.format(driver_id=driver_id)
                await redis.set(key, json.dumps(payload), ex=300)

                # 2. Publish to channel if active job
                if active_job_id and job_type:
                    channel = REDIS_CHANNEL_LIVE_TRACK.format(job_type=job_type.lower(), job_id=active_job_id)
                    await redis.publish(channel, json.dumps(payload))
        except Exception as e:
            logger.warning("tracking_redis_error", driver_id=driver_id, error=str(e))

        # 3. Update DB if session available
        if db:
            try:
                driver_uuid = uuid.UUID(driver_id)
                point_wkt = f"SRID=4326;POINT({lng} {lat})"
                stmt = (
                    update(DriverLocation)
                    .where(DriverLocation.driver_id == driver_uuid)
                    .values(
                        latitude=lat,
                        longitude=lng,
                        location=point_wkt,
                        heading=heading,
                        speed=speed_mps,
                        accuracy=accuracy,
                    )
                )
                await db.execute(stmt)
                await db.commit()
            except Exception as e:
                logger.warning("tracking_db_error", driver_id=driver_id, error=str(e))

        return payload

    @classmethod
    async def get_live_location(cls, driver_id: str) -> Optional[Dict[str, Any]]:
        """Fetch cached latest coordinates of a driver from Redis."""
        try:
            redis = await get_redis()
            if not redis:
                return None
            key = REDIS_DRIVER_LOC_KEY.format(driver_id=driver_id)
            raw = await redis.get(key)
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.warning("tracking_get_error", driver_id=driver_id, error=str(e))
        return None
