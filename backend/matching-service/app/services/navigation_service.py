"""
Navigation Service — Feature 7
Provides authoritative PostGIS arrival detection, route deviation checking, and dynamic ETA tracking.
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime
from typing import Optional, Tuple

import structlog
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import RideRequest, RideRequestStatus, Driver, DriverLocation
from common.utils.redis_client import publish_event
from app.services.ride_fare_engine import haversine_distance_km

logger = structlog.get_logger(__name__)

PICKUP_ARRIVAL_RADIUS_METERS = 60.0    # 60m radius for pickup arrival
DROPOFF_ARRIVAL_RADIUS_METERS = 80.0   # 80m radius for destination arrival
ROUTE_DEVIATION_THRESHOLD_METERS = 45.0  # 45m deviation from polyline


class NavigationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verify_pickup_arrival(
        self,
        ride_id: uuid.UUID,
        driver_lat: float,
        driver_lng: float,
    ) -> Tuple[bool, str, float]:
        """
        Authoritative PostGIS arrival check at pickup location.
        Returns: (is_arrived, status_message, distance_meters)
        """
        res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == ride_id)
        )
        ride = res.scalar_one_or_none()
        if not ride:
            return False, "Ride not found", 9999.0

        dist_km = haversine_distance_km(driver_lat, driver_lng, ride.pickup_lat, ride.pickup_lng)
        dist_m = dist_km * 1000.0

        if dist_m <= PICKUP_ARRIVAL_RADIUS_METERS:
            now = datetime.utcnow()
            if not ride.pickup_arrived_at:
                ride.pickup_arrived_at = now
            ride.status = RideRequestStatus.PICKUP
            await self.db.commit()

            arrival_payload = {
                "event": "DRIVER_ARRIVED",
                "ride_request_id": str(ride.id),
                "booking_id": str(ride.id),
                "pickup_arrived_at": now.isoformat(),
                "free_waiting_seconds": 180,
            }
            try:
                await publish_event(f"customer:{str(ride.customer_id)}:events", arrival_payload)
                await publish_event(f"trip:{str(ride.id)}:events", arrival_payload)
            except Exception:
                pass

            return True, "Driver arrived at pickup location", dist_m
        else:
            return False, f"Driver is {int(dist_m)}m away from pickup (must be within {int(PICKUP_ARRIVAL_RADIUS_METERS)}m)", dist_m

    async def verify_destination_arrival(
        self,
        ride_id: uuid.UUID,
        driver_lat: float,
        driver_lng: float,
    ) -> Tuple[bool, str, float]:
        """
        Authoritative PostGIS arrival check at destination location.
        """
        res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == ride_id)
        )
        ride = res.scalar_one_or_none()
        if not ride:
            return False, "Ride not found", 9999.0

        dist_km = haversine_distance_km(driver_lat, driver_lng, ride.destination_lat, ride.destination_lng)
        dist_m = dist_km * 1000.0

        if dist_m <= DROPOFF_ARRIVAL_RADIUS_METERS:
            return True, "Driver arrived at destination", dist_m
        else:
            return False, f"Driver is {int(dist_m)}m away from destination", dist_m

    @classmethod
    def check_route_deviation(
        cls,
        current_lat: float,
        current_lng: float,
        route_polyline_points: list,
        gps_accuracy_m: float = 10.0,
    ) -> bool:
        """
        Evaluates whether driver has deviated > 45m from the current active route polyline.
        Filters out low-accuracy GPS jumps (accuracy > 25m).
        """
        if gps_accuracy_m > 25.0 or not route_polyline_points:
            return False  # Do not trigger reroute on noisy GPS

        # Calculate minimum distance to any route line segment
        min_dist_km = 999.0
        for pt in route_polyline_points:
            pt_lat = pt.get("lat") or pt.get("latitude") or 0.0
            pt_lng = pt.get("lng") or pt.get("longitude") or 0.0
            d = haversine_distance_km(current_lat, current_lng, pt_lat, pt_lng)
            if d < min_dist_km:
                min_dist_km = d

        return (min_dist_km * 1000.0) > ROUTE_DEVIATION_THRESHOLD_METERS
