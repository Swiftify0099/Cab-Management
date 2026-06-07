"""
Pending Booking Matching Engine — PostGIS Powered.

Two directions of matching:
  1. Forward  : Driver creates trip  → scan pending_bookings for matches
  2. Reverse  : Customer pre-books   → scan published trips for matches

For each match:
  - Publish MATCH_FOUND WebSocket event to customer
  - Send FCM push notification to customer

Women-Only safety rule:
  - If trip.women_only = True → only match pending_bookings with women_only = True
  - If pending_booking.women_only = True → only match trips with women_only = True
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Optional

import structlog
from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Trip, TripStatus, Driver, User,
    PendingBooking, PendingBookingStatus,
    Booking, BookingStatus,
    DriverRejection,
)
from common.utils.redis_client import get_redis, publish_event
from app.services.corridor_matcher import CorridorMatchingService

logger = structlog.get_logger(__name__)

# ─── Matching thresholds ──────────────────────────────────────────────────────
PICKUP_RADIUS_M      = 5000   # 5 km pickup match radius
DESTINATION_RADIUS_M = 5000   # 5 km destination match radius
ARRIVAL_ALERT_KM     = 10.0   # trigger alert when driver is within this distance
ARRIVAL_ALERT_MIN    = 10     # trigger alert when ETA is within this many minutes


class PendingMatchingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ─────────────────────────────────────────────────────────────────────────
    # 1. FORWARD MATCH — called after driver creates a trip
    # ─────────────────────────────────────────────────────────────────────────

    async def match_pending_bookings(self, trip_id: str) -> list[dict]:
        """
        Scan all waiting pending_bookings against this newly created trip.

        Strategy (Phase 2):
          1. If trip has route geometry (encoded_polyline stored) → use corridor
             matching (ST_Within pickup/dest polygons + 3KM route buffer).
          2. Fallback to legacy 5KM point-radius match if no geometry exists.

        Returns list of matched booking dicts (for logging / testing).
        """
        trip = await self._get_trip(trip_id)
        if not trip or trip.status not in (TripStatus.DRAFT, TripStatus.PUBLISHED):
            return []

        driver = await self._get_driver(trip.driver_id)
        driver_name = driver.full_name if driver else "Driver"

        # ── Phase 2: Try corridor matching first ──────────────────────────────
        try:
            corridor_svc = CorridorMatchingService(self.db)
            corridor_matches = await corridor_svc.match_corridor(trip_id)
            if corridor_matches:
                logger.info(
                    "Corridor matching succeeded",
                    trip_id=trip_id,
                    matches=len(corridor_matches),
                )
                return corridor_matches
            # If corridor_matches is [] but geometry existed, also fall through
            # to radius match so existing customers still get notified
        except Exception as corridor_err:
            logger.warning(
                "Corridor match failed, falling back to radius",
                trip_id=trip_id,
                error=str(corridor_err),
            )

        # ── Legacy 5KM radius fallback ─────────────────────────────────────────
        sql = text("""
            SELECT
                pb.id                       AS booking_id,
                pb.customer_id              AS customer_id,
                pb.customer_name            AS customer_name,
                pb.pickup_address           AS pickup_address,
                pb.destination_address      AS destination_address,
                pb.seats_required           AS seats_required,
                pb.parcel                   AS parcel,
                pb.from_time                AS from_time,
                pb.to_time                  AS to_time,
                pb.women_only               AS women_only,
                ST_Distance(
                    pb.pickup_location::geography,
                    ST_MakePoint(:trip_lng, :trip_lat)::geography
                ) AS pickup_dist_m,
                ST_Distance(
                    pb.destination_location::geography,
                    ST_MakePoint(:dest_lng, :dest_lat)::geography
                ) AS dest_dist_m
            FROM pending_bookings pb
            WHERE
                pb.status = 'waiting'
                AND pb.expires_at > NOW()
                AND pb.travel_date = :travel_date
                AND pb.seats_required <= :available_seats
                AND ST_Distance(
                    pb.pickup_location::geography,
                    ST_MakePoint(:trip_lng, :trip_lat)::geography
                ) <= :pickup_radius_m
                AND ST_Distance(
                    pb.destination_location::geography,
                    ST_MakePoint(:dest_lng, :dest_lat)::geography
                ) <= :dest_radius_m
                -- Women-only safety filter
                AND (
                    (:trip_women_only = FALSE)
                    OR (pb.women_only = TRUE)
                )
                AND (
                    (pb.women_only = FALSE)
                    OR (:trip_women_only = TRUE)
                )
            ORDER BY pickup_dist_m ASC
            LIMIT 50
        """)

        result = await self.db.execute(sql, {
            "trip_lat":        trip.pickup_latitude,
            "trip_lng":        trip.pickup_longitude,
            "dest_lat":        trip.destination_latitude,
            "dest_lng":        trip.destination_longitude,
            "travel_date":     trip.departure_time.date(),
            "available_seats": trip.available_seats,
            "pickup_radius_m": PICKUP_RADIUS_M,
            "dest_radius_m":   DESTINATION_RADIUS_M,
            "trip_women_only": trip.women_only,
        })
        rows = result.mappings().all()
        matched = []

        for row in rows:
            match_payload = {
                "event":                    "MATCH_FOUND",
                "trip_id":                  trip_id,
                "driver_name":              driver_name,
                "vehicle_type":             trip.vehicle_type,
                "available_seats":          trip.available_seats,
                "departure_time":           trip.departure_time.isoformat(),
                "pickup_address":           "Pickup Area",
                "destination_address":      "Drop Area",
                "pickup_distance_meters":   float(row["pickup_dist_m"]),
                "destination_distance_meters": float(row["dest_dist_m"]),
                "booking_id":               str(row["booking_id"]),
                "women_only":               trip.women_only,
            }

            # Publish to customer's personal WebSocket channel
            customer_id = str(row["customer_id"])
            await publish_event(f"customer:{customer_id}:events", match_payload)

            # Also publish to notification service for FCM push
            user = await self._get_user(row["customer_id"])
            if user and user.device_token:
                await publish_event("notification:events", {
                    "event":        "MATCH_FOUND",
                    "user_id":      customer_id,
                    "user_type":    "customer",
                    "device_token": user.device_token,
                    "title":        "🚗 Matching Ride Found!",
                    "body":         (
                        f"Driver heading to your destination at "
                        f"{trip.departure_time.strftime('%H:%M')}"
                    ),
                    "data": {
                        "screen":  "RideDetails",
                        "trip_id": trip_id,
                    },
                    "trip_id": trip_id,
                })

            matched.append(dict(row))
            logger.info(
                "MATCH_FOUND emitted",
                customer_id=customer_id,
                trip_id=trip_id,
                pickup_dist_m=row["pickup_dist_m"],
            )

        return matched

    # ─────────────────────────────────────────────────────────────────────────
    # 2. REVERSE MATCH — called after customer creates a pending booking
    # ─────────────────────────────────────────────────────────────────────────

    async def scan_trips_for_customer(self, pending_booking_id: str) -> list[dict]:
        """
        Scan published trips for a freshly created pending booking.
        If any trip matches: immediately send MATCH_FOUND to customer.
        """
        result = await self.db.execute(
            select(PendingBooking).where(PendingBooking.id == uuid.UUID(pending_booking_id))
        )
        pb = result.scalar_one_or_none()
        if not pb or pb.status != PendingBookingStatus.WAITING:
            return []

        sql = text("""
            SELECT
                t.id::text              AS trip_id,
                t.pickup_latitude       AS pickup_lat,
                t.destination_latitude  AS destination_lat,
                t.departure_time        AS departure_time,
                t.available_seats       AS available_seats,
                t.vehicle_type          AS vehicle_type,
                t.women_only            AS trip_women_only,
                d.full_name             AS driver_name,
                ST_Distance(
                    ST_MakePoint(t.pickup_longitude, t.pickup_latitude)::geography,
                    ST_MakePoint(:pb_pickup_lng, :pb_pickup_lat)::geography
                ) AS pickup_dist_m,
                ST_Distance(
                    ST_MakePoint(t.destination_longitude, t.destination_latitude)::geography,
                    ST_MakePoint(:pb_dest_lng, :pb_dest_lat)::geography
                ) AS dest_dist_m
            FROM trips t
            JOIN drivers d ON d.id = t.driver_id
            WHERE
                t.status = 'published'
                AND DATE(t.departure_time) = :travel_date
                AND t.available_seats >= :seats_required
                AND ST_Distance(
                    ST_MakePoint(t.pickup_longitude, t.pickup_latitude)::geography,
                    ST_MakePoint(:pb_pickup_lng, :pb_pickup_lat)::geography
                ) <= :pickup_radius_m
                AND ST_Distance(
                    ST_MakePoint(t.destination_longitude, t.destination_latitude)::geography,
                    ST_MakePoint(:pb_dest_lng, :pb_dest_lat)::geography
                ) <= :dest_radius_m
                -- Women-only safety filter
                AND (
                    (:pb_women_only = FALSE)
                    OR (t.women_only = TRUE)
                )
                AND (
                    (t.women_only = FALSE)
                    OR (:pb_women_only = TRUE)
                )
            ORDER BY pickup_dist_m ASC
            LIMIT 10
        """)

        r = await self.db.execute(sql, {
            "pb_pickup_lat":   pb.pickup_lat,
            "pb_pickup_lng":   pb.pickup_lng,
            "pb_dest_lat":     pb.destination_lat,
            "pb_dest_lng":     pb.destination_lng,
            "travel_date":     pb.travel_date,
            "seats_required":  pb.seats_required,
            "pickup_radius_m": PICKUP_RADIUS_M,
            "dest_radius_m":   DESTINATION_RADIUS_M,
            "pb_women_only":   pb.women_only,
        })
        rows = r.mappings().all()
        matched = []

        for row in rows:
            customer_id = str(pb.customer_id)
            match_payload = {
                "event":                       "MATCH_FOUND",
                "trip_id":                     row["trip_id"],
                "driver_name":                 row["driver_name"],
                "vehicle_type":                row["vehicle_type"],
                "available_seats":             row["available_seats"],
                "departure_time":              row["departure_time"].isoformat(),
                "pickup_address":              "Pickup Area",
                "destination_address":         "Drop Area",
                "pickup_distance_meters":      float(row["pickup_dist_m"]),
                "destination_distance_meters": float(row["dest_dist_m"]),
                "booking_id":                  pending_booking_id,
                "women_only":                  row["trip_women_only"],
            }
            await publish_event(f"customer:{customer_id}:events", match_payload)

            # FCM push
            user = await self._get_user(pb.customer_id)
            if user and user.device_token:
                await publish_event("notification:events", {
                    "event":        "MATCH_FOUND",
                    "user_id":      customer_id,
                    "user_type":    "customer",
                    "device_token": user.device_token,
                    "title":        "🚗 Matching Ride Found!",
                    "body":         (
                        f"Driver heading to your destination at "
                        f"{row['departure_time'].strftime('%H:%M')}"
                    ),
                    "data": {"screen": "RideDetails", "trip_id": row["trip_id"]},
                    "trip_id": row["trip_id"],
                })

            matched.append(dict(row))

        return matched

    # ─────────────────────────────────────────────────────────────────────────
    # 3. DRIVER SCAN — returns pending customers for a driver's scan screen
    # ─────────────────────────────────────────────────────────────────────────

    async def get_scan_results(self, trip_id: str, driver_id: str) -> list[dict]:
        """
        Returns pending bookings that match a driver's trip route.
        Excludes customers the driver has already rejected (DB-persisted).
        Does NOT return phone numbers.
        Women-only trips only show women_only bookings.
        """
        trip = await self._get_trip(trip_id)
        if not trip:
            return []

        sql = text("""
            SELECT
                pb.id::text              AS booking_id,
                pb.customer_name         AS customer_name,
                pb.pickup_address        AS pickup_address,
                pb.pickup_lat            AS pickup_lat,
                pb.pickup_lng            AS pickup_lng,
                pb.destination_address   AS destination_address,
                pb.destination_lat       AS destination_lat,
                pb.destination_lng       AS destination_lng,
                pb.seats_required        AS seats_required,
                pb.parcel                AS parcel,
                pb.from_time             AS from_time,
                pb.to_time               AS to_time,
                pb.women_only            AS women_only,
                ST_Distance(
                    pb.pickup_location::geography,
                    ST_MakePoint(:trip_lng, :trip_lat)::geography
                ) AS pickup_dist_m,
                ST_Distance(
                    pb.destination_location::geography,
                    ST_MakePoint(:dest_lng, :dest_lat)::geography
                ) AS dest_dist_m
            FROM pending_bookings pb
            WHERE
                pb.status = 'waiting'
                AND pb.expires_at > NOW()
                AND pb.travel_date = :travel_date
                AND pb.seats_required <= :available_seats
                AND ST_Distance(
                    pb.pickup_location::geography,
                    ST_MakePoint(:trip_lng, :trip_lat)::geography
                ) <= :pickup_radius_m
                AND ST_Distance(
                    pb.destination_location::geography,
                    ST_MakePoint(:dest_lng, :dest_lat)::geography
                ) <= :dest_radius_m
                -- Exclude rejections from this driver (DB-persisted, industry standard)
                AND pb.id NOT IN (
                    SELECT dr.pending_booking_id
                    FROM driver_rejections dr
                    WHERE dr.driver_id = :driver_id
                )
                -- Women-only safety filter
                AND (
                    (:trip_women_only = FALSE)
                    OR (pb.women_only = TRUE)
                )
                AND (
                    (pb.women_only = FALSE)
                    OR (:trip_women_only = TRUE)
                )
            ORDER BY pickup_dist_m ASC
        """)

        result = await self.db.execute(sql, {
            "trip_lat":        trip.pickup_latitude,
            "trip_lng":        trip.pickup_longitude,
            "dest_lat":        trip.destination_latitude,
            "dest_lng":        trip.destination_longitude,
            "travel_date":     trip.departure_time.date(),
            "available_seats": trip.available_seats,
            "pickup_radius_m": PICKUP_RADIUS_M,
            "dest_radius_m":   DESTINATION_RADIUS_M,
            "driver_id":       str(driver_id),
            "trip_women_only": trip.women_only,
        })
        rows = result.mappings().all()

        return [
            {
                "booking_id":                  row["booking_id"],
                "customer_name":               row["customer_name"],
                "pickup_address":              row["pickup_address"],
                "pickup_lat":                  float(row["pickup_lat"]),
                "pickup_lng":                  float(row["pickup_lng"]),
                "destination_address":         row["destination_address"],
                "destination_lat":             float(row["destination_lat"]),
                "destination_lng":             float(row["destination_lng"]),
                "seats_required":              row["seats_required"],
                "parcel":                      row["parcel"],
                "from_time":                   str(row["from_time"]),
                "to_time":                     str(row["to_time"]),
                "women_only":                  row["women_only"],
                "pickup_distance_km":          round(float(row["pickup_dist_m"]) / 1000, 2),
                "destination_distance_km":     round(float(row["dest_dist_m"]) / 1000, 2),
                "pickup_distance_meters":      float(row["pickup_dist_m"]),
                "destination_distance_meters": float(row["dest_dist_m"]),
            }
            for row in rows
        ]

    # ─────────────────────────────────────────────────────────────────────────
    # 4. ARRIVAL ALERT — called in tracking.record_location()
    # ─────────────────────────────────────────────────────────────────────────

    async def check_arrival_alert(
        self,
        trip_id: str,
        driver_lat: float,
        driver_lng: float,
        speed_kmh: float,
        distance_remaining_km: Optional[float],
        eta_minutes: Optional[int],
    ) -> None:
        """
        For each active booking on this trip, check if the driver is within
        10 km OR 10 minutes.  If so, send ARRIVAL_ALERT once per booking.
        """
        r = await get_redis()

        # Get all active bookings on this trip
        result = await self.db.execute(
            select(Booking).where(
                and_(
                    Booking.trip_id == uuid.UUID(trip_id),
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.DRIVER_ACCEPTED]),
                )
            )
        )
        bookings = result.scalars().all()

        for booking in bookings:
            # Redis flag prevents duplicate alerts per booking
            alert_key = f"arrival:alert:{booking.id}"
            already_sent = await r.exists(alert_key)
            if already_sent:
                continue

            # Check PostGIS distance from driver to customer pickup lat/lng
            if booking.pickup_address:
                # Use distance_remaining_km from tracking if available
                dist_km = distance_remaining_km
                eta_min = eta_minutes
            else:
                continue

            if dist_km is None:
                continue

            if dist_km <= ARRIVAL_ALERT_KM or (eta_min is not None and eta_min <= ARRIVAL_ALERT_MIN):
                # Set flag (24h TTL — prevents re-trigger even after Redis restart on same day)
                await r.setex(alert_key, 86400, "1")

                alert_payload = {
                    "event":        "ARRIVAL_ALERT",
                    "trip_id":      trip_id,
                    "booking_id":   str(booking.id),
                    "distance_km":  round(dist_km, 2),
                    "eta_minutes":  eta_min,
                }
                await publish_event(
                    f"customer:{str(booking.customer_id)}:events",
                    alert_payload,
                )

                # Fetch driver info for push notification
                trip = await self._get_trip(trip_id)
                driver_name = "Your driver"
                if trip:
                    driver = await self._get_driver(trip.driver_id)
                    if driver:
                        driver_name = driver.full_name

                # FCM push
                from common.models.all_models import CustomerProfile
                cp_res = await self.db.execute(
                    select(CustomerProfile).where(CustomerProfile.id == booking.customer_id)
                )
                cp = cp_res.scalar_one_or_none()
                if cp:
                    user = await self._get_user(cp.user_id)
                    if user and user.device_token:
                        await publish_event("notification:events", {
                            "event":        "ARRIVAL_ALERT",
                            "user_id":      str(cp.user_id),
                            "user_type":    "customer",
                            "device_token": user.device_token,
                            "title":        "🚗 Driver is almost here!",
                            "body":         (
                                f"{driver_name} is {round(dist_km, 1)} KM away"
                                + (f", ~{eta_min} min" if eta_min else "")
                            ),
                            "data": {
                                "screen":     "TrackDriver",
                                "trip_id":    trip_id,
                                "booking_id": str(booking.id),
                            },
                        })

                logger.info(
                    "ARRIVAL_ALERT sent",
                    booking_id=str(booking.id),
                    dist_km=dist_km,
                    eta_min=eta_min,
                )

    # ─────────────────────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────────────────────

    async def _get_trip(self, trip_id) -> Optional[Trip]:
        res = await self.db.execute(
            select(Trip).where(Trip.id == (uuid.UUID(str(trip_id)) if isinstance(trip_id, str) else trip_id))
        )
        return res.scalar_one_or_none()

    async def _get_driver(self, driver_id) -> Optional[Driver]:
        res = await self.db.execute(
            select(Driver).where(Driver.id == (uuid.UUID(str(driver_id)) if isinstance(driver_id, str) else driver_id))
        )
        return res.scalar_one_or_none()

    async def _get_user(self, user_id) -> Optional[User]:
        res = await self.db.execute(
            select(User).where(User.id == (uuid.UUID(str(user_id)) if isinstance(user_id, str) else user_id))
        )
        return res.scalar_one_or_none()
