"""
Live Tracking Service  Phase 5.

Consumes GPS updates from Redis pub/sub (published by WebSocket gateway),
persists to live_tracking table, and computes ETA using Haversine formula.
Also exposes REST API for fetching trip route history.
"""
from __future__ import annotations

import asyncio
import json
import math
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import LiveTracking, Trip, Booking, BookingStatus
from common.utils.redis_client import get_redis, publish_event

logger = structlog.get_logger(__name__)


#  Haversine ETA Engine 

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two GPS coordinates in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def estimate_eta(
    current_lat: float,
    current_lng: float,
    dest_lat: float,
    dest_lng: float,
    speed_kmh: float = 0.0,
) -> tuple[float, int]:
    """
    Returns (distance_km, eta_minutes).
    Falls back to average intercity speed of 60 km/h if speed < 5.
    """
    distance_km = haversine_km(current_lat, current_lng, dest_lat, dest_lng)
    effective_speed = max(speed_kmh, 60.0)  # min 60 km/h for intercity
    eta_minutes = int((distance_km / effective_speed) * 60)
    return round(distance_km, 2), eta_minutes


#  Tracking Service 

class TrackingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_location(
        self,
        trip_id: str,
        driver_id: str,
        latitude: float,
        longitude: float,
        speed_kmh: float = 0.0,
        heading: float = 0.0,
        accuracy_m: float = 0.0,
        altitude_m: Optional[float] = None,
        booking_id: Optional[str] = None,
    ) -> dict:
        """
        Persist one GPS point to live_tracking.
        Compute ETA against trip destination.
        Broadcast updated ETA to trip room via Redis.
        """
        # Load trip destination
        trip = await self._get_trip(trip_id)
        eta_minutes = None
        distance_remaining_km = None

        if trip:
            distance_remaining_km, eta_minutes = estimate_eta(
                latitude, longitude,
                trip.destination_lat, trip.destination_lng,
                speed_kmh,
            )

        # Persist to DB (bulk insert mode  don't await individually)
        point_wkt = f"SRID=4326;POINT({longitude} {latitude})"
        tracking = LiveTracking(
            trip_id=UUID(trip_id),
            driver_id=UUID(driver_id),
            booking_id=UUID(booking_id) if booking_id else None,
            latitude=latitude,
            longitude=longitude,
            speed_kmh=speed_kmh,
            heading=heading,
            accuracy_m=accuracy_m,
            altitude_m=altitude_m,
            eta_minutes=eta_minutes,
            distance_remaining_km=distance_remaining_km,
            recorded_at=datetime.utcnow(),
        )
        self.db.add(tracking)
        await self.db.commit()

        # Cache latest point in Redis (fast read for customer app)
        r = await get_redis()
        location_data = {
            "trip_id": trip_id,
            "driver_id": driver_id,
            "latitude": latitude,
            "longitude": longitude,
            "speed_kmh": speed_kmh,
            "heading": heading,
            "eta_minutes": eta_minutes,
            "distance_remaining_km": distance_remaining_km,
            "recorded_at": datetime.utcnow().isoformat(),
        }
        await r.setex(f"trip:location:{trip_id}", 60, json.dumps(location_data))

        # Publish ETA update to trip room  Socket.IO gateway forwards to customers
        await publish_event(
            f"trip:{trip_id}:events",
            {
                "event": "LOCATION_UPDATE",
                "trip_id": trip_id,
                **location_data,
            },
        )

        return location_data

    async def get_latest_location(self, trip_id: str) -> Optional[dict]:
        """Fast read from Redis cache. Falls back to DB if cache miss."""
        r = await get_redis()
        raw = await r.get(f"trip:location:{trip_id}")
        if raw:
            return json.loads(raw)

        # DB fallback  latest recorded point
        result = await self.db.execute(
            select(LiveTracking)
            .where(LiveTracking.trip_id == UUID(trip_id))
            .order_by(LiveTracking.recorded_at.desc())
            .limit(1)
        )
        point = result.scalar_one_or_none()
        if not point:
            return None

        return {
            "trip_id": trip_id,
            "latitude": point.latitude,
            "longitude": point.longitude,
            "speed_kmh": point.speed_kmh,
            "heading": point.heading,
            "eta_minutes": point.eta_minutes,
            "distance_remaining_km": point.distance_remaining_km,
            "recorded_at": point.recorded_at.isoformat(),
        }

    async def get_trip_route(
        self, trip_id: str, limit: int = 500
    ) -> list[dict]:
        """
        Get polyline path for this trip (last `limit` points).
        Used by customer app to draw route line on map.
        """
        result = await self.db.execute(
            select(LiveTracking)
            .where(LiveTracking.trip_id == UUID(trip_id))
            .order_by(LiveTracking.recorded_at.asc())
            .limit(limit)
        )
        points = result.scalars().all()
        return [
            {
                "lat": p.latitude,
                "lng": p.longitude,
                "ts": p.recorded_at.isoformat(),
                "speed": p.speed_kmh,
            }
            for p in points
        ]

    async def _get_trip(self, trip_id: str) -> Optional[Trip]:
        result = await self.db.execute(
            select(Trip).where(Trip.id == UUID(trip_id))
        )
        return result.scalar_one_or_none()


#  Redis Pub/Sub Consumer (runs as background task in WebSocket Gateway) 

async def consume_location_updates(db_factory):
    """
    Listens to 'live:location:updates' Redis channel.
    Persists each GPS point via TrackingService.
    Called from WebSocket gateway lifespan as a background coroutine.
    """
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe("live:location:updates")
    logger.info(" Location consumer started")

    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            data = json.loads(message["data"])
            async with db_factory() as db:
                service = TrackingService(db)
                await service.record_location(
                    trip_id=data["trip_id"],
                    driver_id=data["driver_id"],
                    latitude=data["latitude"],
                    longitude=data["longitude"],
                    speed_kmh=data.get("speed_kmh", 0.0),
                    heading=data.get("heading", 0.0),
                    accuracy_m=data.get("accuracy_m", 0.0),
                    altitude_m=data.get("altitude_m"),
                    booking_id=data.get("booking_id"),
                )
        except Exception as e:
            logger.error("Location consumer error", exc_info=e)
