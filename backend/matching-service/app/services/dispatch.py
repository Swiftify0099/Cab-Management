"""
Driver Dispatch Service  Redis queue + WebSocket push + timeout + retry.

Flow:
  1. Customer creates a booking  
  2. Booking-service publishes to Redis channel 'dispatch:new_booking'
  3. This service picks it up, finds nearest drivers via PostGIS
  4. Pushes INCOMING_TRIP_REQUEST to driver's Socket.IO room
  5. Waits DRIVER_ACCEPT_TIMEOUT_SEC for response
  6. On timeout/reject  try next driver (up to MAX_RETRY_DRIVERS)
  7. On 3rd consecutive rejection  suspend driver 1 hour
  8. If no driver accepts  notify customer MATCHING_FAILED
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional

import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import Booking, BookingStatus, Driver, DriverStatus
from common.utils.redis_client import get_redis, publish_event
from app.core.config import matching_settings
from app.services.geo_search import GeoSearchService

logger = structlog.get_logger(__name__)


#  Redis key helpers 

def _pending_key(booking_id: str) -> str:
    return f"dispatch:pending:{booking_id}"

def _reject_count_key(driver_id: str) -> str:
    return f"driver:reject_count:{driver_id}"


class DispatchService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.geo = GeoSearchService(db)

    async def dispatch_booking(self, booking_id: str, excluded_driver_ids: Optional[list[str]] = None) -> bool:
        """
        Main entry point  find drivers and dispatch the booking request.
        Returns True if dispatched to at least one driver.
        """
        # Load booking
        booking = await self._get_booking(booking_id)
        if not booking:
            logger.error("Booking not found", booking_id=booking_id)
            return False

        # Load trip for pickup coordinates
        trip = await self._get_trip_for_booking(booking)
        if not trip:
            logger.error("Trip not found for booking", booking_id=booking_id)
            return False

        tried_drivers: list[str] = excluded_driver_ids or []
        attempt = 0

        while attempt < matching_settings.MAX_RETRY_DRIVERS:
            # Find nearest available driver
            drivers = await self.geo.find_nearest_drivers(
                latitude=trip.pickup_latitude,
                longitude=trip.pickup_longitude,
                vehicle_type=trip.vehicle_type if hasattr(trip, "vehicle_type") else None,
                parcel_needed=booking.has_parcel,
                limit=5,
                exclude_driver_ids=tried_drivers,
            )

            if not drivers:
                logger.warning(
                    "No drivers found after search",
                    booking_id=booking_id,
                    attempt=attempt,
                )
                break

            driver = drivers[0]
            driver_id = driver["driver_id"]
            tried_drivers.append(driver_id)
            attempt += 1

            # Push request to driver via Redis pub/sub  WebSocket gateway
            request_payload = {
                "event": "INCOMING_TRIP_REQUEST",
                "booking_id": booking_id,
                "driver_id": driver_id,
                "trip": {
                    "from": booking.pickup_address or f"{trip.pickup_latitude},{trip.pickup_longitude}",
                    "to": booking.drop_address or f"{trip.destination_latitude},{trip.destination_longitude}",
                    "departure_time": trip.departure_time.isoformat(),
                    "distance_km": trip.distance_km,
                    "seats": booking.seat_count,
                    "has_parcel": booking.has_parcel,
                    "fare": float(booking.total_fare),
                },
                "customer": {
                    "id": str(booking.customer_id),
                },
                "timeout_sec": matching_settings.DRIVER_ACCEPT_TIMEOUT_SEC,
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Set pending key (auto-expires at timeout)
            r = await get_redis()
            await r.setex(
                _pending_key(booking_id),
                matching_settings.DRIVER_ACCEPT_TIMEOUT_SEC + 5,
                json.dumps({"driver_id": driver_id, "attempt": attempt}),
            )

            # Publish to WebSocket gateway channel
            await publish_event(f"driver:{driver_id}:events", request_payload)

            logger.info(
                "Dispatched to driver",
                driver_id=driver_id,
                booking_id=booking_id,
                attempt=attempt,
                distance_km=driver["distance_km"],
            )

            # Wait for driver response (polling Redis for accept/reject)
            response = await self._wait_for_driver_response(
                booking_id=booking_id,
                driver_id=driver_id,
                timeout_sec=matching_settings.DRIVER_ACCEPT_TIMEOUT_SEC,
            )

            if response == "accepted":
                await self._on_driver_accepted(booking_id, driver_id, driver)
                return True
            elif response == "rejected":
                await self._on_driver_rejected(driver_id)
                # Continue to next driver
            else:
                # Timeout  notify driver (no penalty for timeout in this version)
                await publish_event(f"driver:{driver_id}:events", {
                    "event": "BOOKING_EXPIRED",
                    "booking_id": booking_id,
                })

        # All retries exhausted  notify customer
        await self._on_matching_failed(booking_id)
        return False

    async def _wait_for_driver_response(
        self, booking_id: str, driver_id: str, timeout_sec: int
    ) -> str:
        """
        Poll Redis every 2s for up to timeout_sec waiting for driver response.
        Returns: 'accepted' | 'rejected' | 'timeout'
        """
        r = await get_redis()
        response_key = f"dispatch:response:{booking_id}:{driver_id}"
        elapsed = 0

        while elapsed < timeout_sec:
            response = await r.get(response_key)
            if response:
                await r.delete(response_key)
                return response  # 'accepted' or 'rejected'
            await asyncio.sleep(2)
            elapsed += 2

        return "timeout"

    async def driver_respond(
        self, booking_id: str, driver_id: str, accepted: bool
    ) -> None:
        """Called when driver accepts/rejects via WebSocket."""
        r = await get_redis()
        response_key = f"dispatch:response:{booking_id}:{driver_id}"
        await r.setex(
            response_key,
            matching_settings.DRIVER_ACCEPT_TIMEOUT_SEC,
            "accepted" if accepted else "rejected",
        )

    async def _on_driver_accepted(
        self, booking_id: str, driver_id: str, driver_info: dict
    ) -> None:
        """Update booking + notify customer."""
        r = await get_redis()
        await r.delete(_pending_key(booking_id))

        # Update booking in DB
        result = await self.db.execute(
            select(Booking).where(Booking.id == uuid.UUID(booking_id))
        )
        booking = result.scalar_one_or_none()
        if booking:
            booking.status = BookingStatus.DRIVER_ACCEPTED
            booking.driver_id = driver_id
            await self.db.commit()

        # Notify customer via pub/sub  WebSocket
        await publish_event(
            f"customer:{str(booking.customer_id)}:events",
            {
                "event": "DRIVER_ACCEPTED",
                "booking_id": booking_id,
                "driver": driver_info,
            },
        )
        logger.info("Driver accepted booking", booking_id=booking_id, driver_id=driver_id)

    async def _on_driver_rejected(self, driver_id: str) -> None:
        """Track rejection count and suspend if threshold reached."""
        r = await get_redis()
        key = _reject_count_key(driver_id)
        count = await r.incr(key)
        await r.expire(key, 86400)  # 24h rolling window

        if count >= matching_settings.PENALTY_THRESHOLD:
            # Suspend driver for 1 hour
            await self.db.execute(
                Driver.__table__.update()
                .where(Driver.id == uuid.UUID(driver_id))
                .values(
                    status=DriverStatus.SUSPENDED,
                    suspension_until=datetime.utcnow() + timedelta(hours=1),
                )
            )
            await self.db.commit()
            await r.delete(key)  # Reset count after suspension

            await publish_event(f"driver:{driver_id}:events", {
                "event": "SUSPENDED",
                "reason": "3 consecutive trip rejections. Suspended for 1 hour.",
                "until": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            })
            logger.warning("Driver suspended for rejections", driver_id=driver_id)

    async def _on_matching_failed(self, booking_id: str) -> None:
        """All retries failed  update booking and notify customer."""
        result = await self.db.execute(
            select(Booking).where(Booking.id == uuid.UUID(booking_id))
        )
        booking = result.scalar_one_or_none()
        if booking:
            booking.status = BookingStatus.CANCELLED
            booking.cancellation_reason = "No driver available in your area"
            await self.db.commit()

            await publish_event(
                f"customer:{str(booking.customer_id)}:events",
                {
                    "event": "MATCHING_FAILED",
                    "booking_id": booking_id,
                    "message": "No driver available right now. Please try again.",
                },
            )
        logger.warning("Matching failed  no driver accepted", booking_id=booking_id)

    async def _get_booking(self, booking_id: str) -> Optional[Booking]:
        result = await self.db.execute(
            select(Booking).where(Booking.id == booking_id)
        )
        return result.scalar_one_or_none()

    async def _get_trip_for_booking(self, booking: Booking):
        from common.models.all_models import Trip
        result = await self.db.execute(
            select(Trip).where(Trip.id == booking.trip_id)
        )
        return result.scalar_one_or_none()
