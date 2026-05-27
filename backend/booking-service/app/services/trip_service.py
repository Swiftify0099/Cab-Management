"""
Trip Service — Driver creates and manages intercity trips.
Phase 3 Core: Trip lifecycle state machine.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Trip, TripStatus, Driver, DriverStatus, RouteStop, Booking, BookingStatus
)
from app.services.fare_engine import get_distance_km, VEHICLE_RATES, VEHICLE_CAPACITY


class TripService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_trip(
        self,
        driver_user_id: str,
        pickup_city: str,
        pickup_state: str,
        pickup_lat: float,
        pickup_lng: float,
        destination_city: str,
        destination_state: str,
        destination_lat: float,
        destination_lng: float,
        departure_time: datetime,
        total_seats: int,
        vehicle_type: str,
        base_fare: float,
        per_km_rate: float,
        parcel_enabled: bool = False,
        women_only: bool = False,
        window_seats: int = 0,
        window_seat_charge: float = 0.0,
        notes: Optional[str] = None,
        route_stops: Optional[list] = None,
    ) -> dict:
        """Driver creates a new trip offering."""
        # Resolve driver record
        driver_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = driver_res.scalar_one_or_none()
        if not driver:
            raise ValueError("Driver profile not found")

        distance = get_distance_km(pickup_city, destination_city)

        from geoalchemy2.elements import WKTElement
        pickup_point = WKTElement(f"POINT({pickup_lng} {pickup_lat})", srid=4326)
        dest_point = WKTElement(f"POINT({destination_lng} {destination_lat})", srid=4326)

        trip = Trip(
            id=str(uuid.uuid4()),
            driver_id=driver.id,
            pickup_location=pickup_point,
            pickup_latitude=pickup_lat,
            pickup_longitude=pickup_lng,
            pickup_city=pickup_city,
            pickup_state=pickup_state,
            destination_location=dest_point,
            destination_latitude=destination_lat,
            destination_longitude=destination_lng,
            destination_city=destination_city,
            destination_state=destination_state,
            departure_time=departure_time,
            total_seats=total_seats,
            available_seats=total_seats,
            window_seats=window_seats,
            available_window_seats=window_seats,
            window_seat_charge=window_seat_charge,
            base_fare=base_fare,
            per_km_rate=per_km_rate,
            distance_km=distance,
            parcel_enabled=parcel_enabled,
            women_only=women_only,
            status=TripStatus.DRAFT,
            notes=notes,
        )
        self.db.add(trip)
        await self.db.flush()  # Get trip.id

        # Add route stops if provided
        if route_stops:
            for i, stop in enumerate(route_stops):
                stop_point = WKTElement(f"POINT({stop['longitude']} {stop['latitude']})", srid=4326)
                rs = RouteStop(
                    id=str(uuid.uuid4()),
                    trip_id=trip.id,
                    stop_type=stop.get("stop_type", "pickup"),
                    location=stop_point,
                    latitude=stop["latitude"],
                    longitude=stop["longitude"],
                    city=stop.get("city"),
                    name=stop.get("name"),
                    sequence_order=i + 1,
                    duration_minutes=stop.get("duration_minutes", 10),
                )
                self.db.add(rs)

        await self.db.commit()
        await self.db.refresh(trip)
        return self._serialize(trip)

    async def publish_trip(self, trip_id: str, driver_user_id: str) -> Optional[dict]:
        """Move trip from DRAFT → PUBLISHED."""
        trip = await self._get_driver_trip(trip_id, driver_user_id)
        if not trip or trip.status != TripStatus.DRAFT:
            return None
        trip.status = TripStatus.PUBLISHED
        await self.db.commit()
        return self._serialize(trip)

    async def start_trip(self, trip_id: str, driver_user_id: str) -> Optional[dict]:
        """Move trip from PUBLISHED → IN_PROGRESS."""
        trip = await self._get_driver_trip(trip_id, driver_user_id)
        if not trip or trip.status != TripStatus.PUBLISHED:
            return None
        trip.status = TripStatus.IN_PROGRESS
        trip.started_at = datetime.utcnow()
        await self.db.commit()
        return self._serialize(trip)

    async def complete_trip(self, trip_id: str, driver_user_id: str) -> Optional[dict]:
        """Move trip from IN_PROGRESS → COMPLETED."""
        trip = await self._get_driver_trip(trip_id, driver_user_id)
        if not trip or trip.status != TripStatus.IN_PROGRESS:
            return None
        trip.status = TripStatus.COMPLETED
        trip.completed_at = datetime.utcnow()
        # Mark all PAID bookings as COMPLETED
        await self.db.execute(
            Booking.__table__.update()
            .where(
                and_(
                    Booking.trip_id == trip.id,
                    Booking.status.in_([BookingStatus.PAID, BookingStatus.DRIVER_ACCEPTED]),
                )
            )
            .values(status=BookingStatus.COMPLETED)
        )
        await self.db.commit()
        return self._serialize(trip)

    async def search_trips(
        self,
        from_city: str,
        to_city: str,
        departure_date: datetime,
        seats_needed: int = 1,
        vehicle_type: Optional[str] = None,
        women_only: bool = False,
        with_parcel: bool = False,
    ) -> list[dict]:
        """Search available published trips."""
        date_start = departure_date.replace(hour=0, minute=0, second=0)
        date_end = departure_date.replace(hour=23, minute=59, second=59)

        filters = [
            Trip.status == TripStatus.PUBLISHED,
            func.lower(Trip.pickup_city) == from_city.lower().strip(),
            func.lower(Trip.destination_city) == to_city.lower().strip(),
            Trip.departure_time >= date_start,
            Trip.departure_time <= date_end,
            Trip.available_seats >= seats_needed,
        ]
        if vehicle_type:
            filters.append(Trip.vehicle_type == vehicle_type)
        if women_only:
            filters.append(Trip.women_only == True)
        if with_parcel:
            filters.append(Trip.parcel_enabled == True)

        result = await self.db.execute(
            select(Trip).where(and_(*filters)).order_by(Trip.departure_time)
        )
        trips = result.scalars().all()
        return [self._serialize(t) for t in trips]

    async def get_driver_trips(
        self, driver_user_id: str, status_filter: Optional[str] = None
    ) -> list[dict]:
        driver_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = driver_res.scalar_one_or_none()
        if not driver:
            return []

        filters = [Trip.driver_id == driver.id]
        if status_filter:
            try:
                filters.append(Trip.status == TripStatus(status_filter))
            except ValueError:
                pass

        result = await self.db.execute(
            select(Trip).where(and_(*filters)).order_by(desc(Trip.departure_time))
        )
        return [self._serialize(t) for t in result.scalars().all()]

    async def _get_driver_trip(self, trip_id: str, driver_user_id: str) -> Optional[Trip]:
        driver_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = driver_res.scalar_one_or_none()
        if not driver:
            return None

        res = await self.db.execute(
            select(Trip).where(
                and_(Trip.id == trip_id, Trip.driver_id == driver.id)
            )
        )
        return res.scalar_one_or_none()

    @staticmethod
    def _serialize(trip: Trip) -> dict:
        return {
            "id": str(trip.id),
            "pickup_city": trip.pickup_city,
            "pickup_state": trip.pickup_state,
            "destination_city": trip.destination_city,
            "destination_state": trip.destination_state,
            "departure_time": trip.departure_time.isoformat() if trip.departure_time else None,
            "total_seats": trip.total_seats,
            "available_seats": trip.available_seats,
            "base_fare": float(trip.base_fare),
            "per_km_rate": float(trip.per_km_rate),
            "distance_km": trip.distance_km,
            "parcel_enabled": trip.parcel_enabled,
            "women_only": trip.women_only,
            "window_seats": trip.window_seats,
            "window_seat_charge": float(trip.window_seat_charge),
            "status": trip.status.value if trip.status else None,
            "started_at": trip.started_at.isoformat() if trip.started_at else None,
            "completed_at": trip.completed_at.isoformat() if trip.completed_at else None,
        }
