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

from common.models.all_models import LiveTracking, Trip, Booking, BookingStatus, RideRequest, RideRequestStatus, Driver
from common.utils.redis_client import get_redis, publish_event

logger = structlog.get_logger(__name__)


# ── Haversine ETA Engine ──────────────────────────────────────────────────────

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
    effective_speed = max(speed_kmh, 45.0)  # min 45 km/h for realistic city/intercity blend
    eta_minutes = max(1, int((distance_km / effective_speed) * 60))
    return round(distance_km, 2), eta_minutes


# ── Tracking Service ──────────────────────────────────────────────────────────

class TrackingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_destination(self, trip_id: str) -> Optional[tuple[float, float]]:
        """Resolves destination coordinates for either an intercity Trip or on-demand RideRequest."""
        try:
            t_uuid = UUID(str(trip_id))
        except Exception:
            return None

        # 1. Try Trip
        t_res = await self.db.execute(select(Trip).where(Trip.id == t_uuid))
        trip = t_res.scalar_one_or_none()
        if trip and trip.destination_latitude and trip.destination_longitude:
            return float(trip.destination_latitude), float(trip.destination_longitude)

        # 2. Try RideRequest
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == t_uuid))
        ride = r_res.scalar_one_or_none()
        if ride:
            if ride.status == RideRequestStatus.IN_PROGRESS and ride.destination_lat and ride.destination_lng:
                return float(ride.destination_lat), float(ride.destination_lng)
            elif ride.pickup_lat and ride.pickup_lng:
                return float(ride.pickup_lat), float(ride.pickup_lng)

        return None

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
        Compute ETA against trip or ride destination.
        Broadcast updated ETA to trip room via Redis.
        """
        # Load trip destination
        dest = await self._get_destination(trip_id)
        eta_minutes = None
        distance_remaining_km = None

        if dest:
            dest_lat, dest_lng = dest
            distance_remaining_km, eta_minutes = estimate_eta(
                latitude, longitude,
                dest_lat, dest_lng,
                speed_kmh,
            )

        # Persist to DB
        point_wkt = f"SRID=4326;POINT({longitude} {latitude})"
        try:
            t_uuid = UUID(str(trip_id)) if trip_id and len(str(trip_id)) >= 32 else None
            d_uuid = UUID(str(driver_id)) if driver_id and len(str(driver_id)) >= 32 else None
            b_uuid = UUID(str(booking_id)) if booking_id and len(str(booking_id)) >= 32 else None

            if t_uuid:
                tracking = LiveTracking(
                    trip_id=t_uuid,
                    driver_id=d_uuid,
                    booking_id=b_uuid,
                    driver_location=point_wkt,
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
        except Exception as db_err:
            logger.debug("LiveTracking insert notice", exc_info=db_err)

        # Cache latest point in Redis (fast read for customer app)
        r = await get_redis()
        location_data = {
            "trip_id": str(trip_id),
            "driver_id": str(driver_id),
            "latitude": latitude,
            "longitude": longitude,
            "lat": latitude,
            "lng": longitude,
            "speed_kmh": speed_kmh,
            "speed": speed_kmh,
            "heading": heading,
            "accuracy": accuracy_m,
            "accuracy_m": accuracy_m,
            "eta_minutes": eta_minutes,
            "distance_remaining_km": distance_remaining_km,
            "recorded_at": datetime.utcnow().isoformat(),
        }
        await r.setex(f"trip:location:{trip_id}", 60, json.dumps(location_data))

        # Publish ETA update to trip room — Socket.IO gateway forwards to customers
        event_payload = {
            "event": "LOCATION_UPDATE",
            "trip_id": str(trip_id),
            **location_data,
        }
        for ch in [
            f"trip:{trip_id}:events",
            f"ride:{trip_id}:events",
            f"trip:{trip_id}",
            f"ride:{trip_id}",
        ]:
            try:
                await publish_event(ch, event_payload)
            except Exception:
                pass

        # ── Arrival Alert (10km / 10min threshold) ────────────────────────
        try:
            from app.services.pending_matching import PendingMatchingService
            alert_svc = PendingMatchingService(self.db)
            await alert_svc.check_arrival_alert(
                trip_id=trip_id,
                driver_lat=latitude,
                driver_lng=longitude,
                speed_kmh=speed_kmh,
                distance_remaining_km=distance_remaining_km,
                eta_minutes=eta_minutes,
            )
        except Exception as e:
            logger.debug("Arrival alert check notice", exc_info=e)

        return location_data

    async def get_latest_location(self, trip_id: str) -> Optional[dict]:
        """Fast read from Redis cache. Falls back to DB if cache miss."""
        r = await get_redis()
        raw = await r.get(f"trip:location:{trip_id}")
        if raw:
            return json.loads(raw)

        # DB fallback — latest recorded point
        try:
            result = await self.db.execute(
                select(LiveTracking)
                .where(LiveTracking.trip_id == UUID(str(trip_id)))
                .order_by(LiveTracking.recorded_at.desc())
                .limit(1)
            )
            point = result.scalar_one_or_none()
            if not point:
                return None

            return {
                "trip_id": str(trip_id),
                "latitude": point.latitude,
                "longitude": point.longitude,
                "lat": point.latitude,
                "lng": point.longitude,
                "speed_kmh": point.speed_kmh,
                "heading": point.heading,
                "accuracy": point.accuracy_m,
                "eta_minutes": point.eta_minutes,
                "distance_remaining_km": point.distance_remaining_km,
                "recorded_at": point.recorded_at.isoformat(),
            }
        except Exception:
            return None

    async def get_trip_route(
        self, trip_id: str, limit: int = 500
    ) -> list[dict]:
        """
        Get polyline path for this trip (last `limit` points).
        Used by customer app to draw route line on map.
        """
        try:
            result = await self.db.execute(
                select(LiveTracking)
                .where(LiveTracking.trip_id == UUID(str(trip_id)))
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
                    "heading": p.heading,
                }
                for p in points
            ]
        except Exception:
            return []


# ── Redis Pub/Sub Consumer ────────────────────────────────────────────────────

async def consume_location_updates(db_factory):
    """
    Listens to 'live:location:updates' Redis channel.
    1. Updates driver's live GPS coordinates in the PostGIS 'drivers' table.
    2. Persists active trip point via TrackingService if trip_id is present.
    """
    from sqlalchemy import text as sa_text
    import uuid as _uuid
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe("live:location:updates")
    logger.info("📡 Location consumer started")

    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            raw_msg = message["data"]
            if isinstance(raw_msg, bytes):
                raw_msg = raw_msg.decode("utf-8")
            data = json.loads(raw_msg)
            
            driver_id_val = data.get("driver_id")
            lat_val = float(data.get("lat") or data.get("latitude") or 0)
            lng_val = float(data.get("lng") or data.get("longitude") or 0)
            spd_val = float(data.get("speed") or data.get("speed_kmh", 0.0))
            head_val = float(data.get("heading", 0.0))
            acc_val = float(data.get("accuracy") or data.get("accuracy_m", 5.0))

            async with db_factory() as db:
                # 1. Update driver's authoritative PostGIS location in database
                if driver_id_val and lat_val != 0 and lng_val != 0:
                    try:
                        d_uuid = _uuid.UUID(str(driver_id_val))
                        await db.execute(
                            sa_text("""
                                UPDATE drivers
                                SET current_location = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                                    current_latitude = :lat,
                                    current_longitude = :lng,
                                    current_accuracy_m = :acc,
                                    current_heading = :head,
                                    current_speed_kmh = :spd,
                                    last_location_updated_at = NOW(),
                                    is_online = TRUE,
                                    status = 'ONLINE',
                                    updated_at = NOW()
                                WHERE user_id = :uid OR id = :did
                            """),
                            {
                                "lng": lng_val,
                                "lat": lat_val,
                                "acc": acc_val,
                                "head": head_val,
                                "spd": spd_val,
                                "uid": d_uuid,
                                "did": d_uuid,
                            }
                        )
                        await db.commit()
                    except Exception as db_loc_err:
                        pass

                # 2. Persist trip tracking if on an active trip
                trip_id_val = data.get("trip_id")
                if trip_id_val and trip_id_val != "undefined" and len(str(trip_id_val)) > 10:
                    try:
                        service = TrackingService(db)
                        await service.record_location(
                            trip_id=str(trip_id_val),
                            driver_id=str(driver_id_val or ""),
                            latitude=lat_val,
                            longitude=lng_val,
                            speed_kmh=spd_val,
                            heading=head_val,
                            accuracy_m=acc_val,
                            altitude_m=data.get("altitude_m"),
                            booking_id=data.get("booking_id"),
                        )
                    except Exception as trip_err:
                        pass
        except Exception as e:
            logger.error("Location consumer error", exc_info=e)
