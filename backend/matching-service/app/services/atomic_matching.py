"""
Atomic Multi-Driver Matching Engine — Feature 6.
Ensures zero race conditions and single authoritative assignment when multiple drivers express interest in Smart Radar rides.

Also provides acquire_seats_transactionally() for intercity trip seat booking
to prevent double-booking of the last available seat.
"""
from __future__ import annotations

import asyncio
from datetime import datetime
import json
import uuid
from typing import List, Optional

import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Driver, DriverStatus, RideRequest, RideRequestStatus,
    RideOffer, RideOfferStatus, Trip, TripStatus, Booking, BookingStatus,
)
from common.utils.redis_client import get_redis, publish_event

logger = structlog.get_logger(__name__)


async def acquire_seats_transactionally(
    trip_id: uuid.UUID,
    seat_count: int,
    db: AsyncSession,
) -> tuple[bool, str]:
    """
    Atomically reserve seats on an intercity trip using SELECT FOR UPDATE.

    This prevents double-booking when two customers attempt to book the last
    available seat at the same time.

    Returns:
        (True, "ok")                — seats reserved, trip state updated
        (False, "trip_not_found")   — trip does not exist
        (False, "trip_not_published")— trip is not in PUBLISHED state
        (False, "insufficient_seats")— not enough available_seats
        (False, "trip_full")        — trip.is_full is already True
    """
    try:
        # Lock the trip row for the duration of this transaction
        trip_res = await db.execute(
            select(Trip)
            .where(Trip.id == trip_id)
            .with_for_update()
        )
        trip = trip_res.scalar_one_or_none()

        if not trip:
            return False, "trip_not_found"

        if trip.status not in (TripStatus.PUBLISHED, TripStatus.ACTIVE):
            return False, "trip_not_published"

        if trip.is_full:
            return False, "trip_full"

        if trip.available_seats < seat_count:
            return False, "insufficient_seats"

        # Decrement seats
        trip.available_seats -= seat_count
        trip.occupied_seats = (trip.occupied_seats or 0) + seat_count

        # Auto-set FULL state if no seats remain
        if trip.available_seats <= 0:
            trip.available_seats = 0
            trip.is_full = True
            trip.status = TripStatus.FULL

        await db.flush()  # Flush within transaction (not commit — caller commits)

        logger.info(
            "Seats acquired atomically",
            trip_id=str(trip_id),
            seats_taken=seat_count,
            seats_remaining=trip.available_seats,
            is_full=trip.is_full,
        )
        return True, "ok"

    except Exception as exc:
        logger.exception("acquire_seats_transactionally failed", trip_id=str(trip_id), error=str(exc))
        await db.rollback()
        return False, "db_error"


async def release_seats_transactionally(
    trip_id: uuid.UUID,
    seat_count: int,
    db: AsyncSession,
) -> bool:
    """
    Return seats to a trip atomically (called when a booking is cancelled or rejected).
    Clears the FULL state if applicable.
    """
    try:
        trip_res = await db.execute(
            select(Trip)
            .where(Trip.id == trip_id)
            .with_for_update()
        )
        trip = trip_res.scalar_one_or_none()
        if not trip:
            return False

        trip.available_seats = min(trip.available_seats + seat_count, trip.total_seats)
        trip.occupied_seats = max((trip.occupied_seats or 0) - seat_count, 0)

        # Un-full the trip if seats are available again
        if trip.is_full and trip.available_seats > 0:
            trip.is_full = False
            if trip.status == TripStatus.FULL:
                trip.status = TripStatus.PUBLISHED

        await db.flush()
        return True

    except Exception as exc:
        logger.exception("release_seats_transactionally failed", trip_id=str(trip_id), error=str(exc))
        await db.rollback()
        return False



class AtomicMatchingEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def submit_radar_match_interest(
        self,
        driver_user_id: str,
        selected_ride_ids: List[str],
    ) -> dict:
        """
        Driver expresses interest in 1 or more Smart Radar candidate rides.
        Attempts atomic assignment for the best available ride using SELECT FOR UPDATE.
        """
        if not selected_ride_ids:
            return {"success": False, "message": "No rides selected", "matched_ride_id": None}

        # Resolve driver
        d_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = d_res.scalar_one_or_none()
        if not driver or driver.status not in (DriverStatus.ONLINE, "online", "ONLINE"):
            return {"success": False, "message": "Driver not eligible or offline", "matched_ride_id": None}

        now = datetime.utcnow()

        for ride_id_str in selected_ride_ids:
            try:
                ride_uuid = uuid.UUID(ride_id_str)
            except ValueError:
                continue

            # ATOMIC LOCK: SELECT FOR UPDATE on RideRequest
            req_lock = await self.db.execute(
                select(RideRequest)
                .where(RideRequest.id == ride_uuid)
                .with_for_update()
            )
            ride_req = req_lock.scalar_one_or_none()

            valid_statuses = (
                RideRequestStatus.CREATED,
                RideRequestStatus.MATCHING,
                RideRequestStatus.DISPATCHING,
                RideRequestStatus.OFFERED,
                "created", "matching", "dispatching", "offered",
                "CREATED", "MATCHING", "DISPATCHING", "OFFERED",
            )

            if ride_req and ride_req.status in valid_statuses and ride_req.assigned_driver_id is None:
                # Assign ride atomically to this driver
                ride_req.status = RideRequestStatus.ASSIGNED
                ride_req.assigned_driver_id = driver.id
                ride_req.assigned_at = now
                await self.db.commit()

                # Publish success to driver
                await publish_event(f"driver:{driver_user_id}:events", {
                    "event": "RIDE_MATCHED",
                    "ride_request_id": str(ride_req.id),
                    "booking_id": str(ride_req.id),
                    "pickup": {
                        "address": ride_req.pickup_address,
                        "lat": ride_req.pickup_lat,
                        "lng": ride_req.pickup_lng,
                    },
                    "destination": {
                        "address": ride_req.destination_address,
                        "lat": ride_req.destination_lat,
                        "lng": ride_req.destination_lng,
                    },
                    "fare": float(ride_req.estimated_fare),
                    "driver_earning": float(ride_req.estimated_fare) * 0.80,
                })

                # Publish customer confirmation
                await publish_event(f"customer:{str(ride_req.customer_id)}:events", {
                    "event": "RIDE_ASSIGNED",
                    "ride_request_id": str(ride_req.id),
                    "driver": {
                        "driver_id": str(driver.id),
                        "full_name": driver.full_name,
                        "rating": float(driver.rating or 4.85),
                    },
                })

                return {
                    "success": True,
                    "message": "Ride successfully matched and assigned!",
                    "status": "matched",
                    "matched_ride_id": str(ride_req.id),
                }

        # If none of the selected rides were won
        return {
            "success": False,
            "message": "Selected rides were claimed by closer drivers. Checking new opportunities...",
            "status": "not_matched",
            "matched_ride_id": None,
        }
