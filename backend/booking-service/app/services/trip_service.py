"""
Trip Service  Driver creates and manages intercity trips.
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
        pickup_lat: float,
        pickup_lng: float,
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
        non_stop: bool = False,
    ) -> dict:
        """Driver creates a new trip offering."""
        # Resolve driver record
        driver_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = driver_res.scalar_one_or_none()
        if not driver:
            # Auto-create mock driver profile for testing purposes
            driver = Driver(
                id=uuid.uuid4(),
                user_id=uuid.UUID(driver_user_id),
                full_name="Mock Driver",
                license_number=f"MOCK-{uuid.uuid4().hex[:8].upper()}",
                status=DriverStatus.ONLINE,
                rating=5.0,
                total_trips=0
            )
            self.db.add(driver)
            await self.db.flush()

        distance = get_distance_km(pickup_lat, pickup_lng, destination_lat, destination_lng)

        from geoalchemy2.elements import WKTElement
        pickup_point = WKTElement(f"POINT({pickup_lng} {pickup_lat})", srid=4326)
        dest_point = WKTElement(f"POINT({destination_lng} {destination_lat})", srid=4326)

        trip = Trip(
            id=uuid.uuid4(),
            driver_id=driver.id,
            pickup_location=pickup_point,
            pickup_latitude=pickup_lat,
            pickup_longitude=pickup_lng,
            destination_location=dest_point,
            destination_latitude=destination_lat,
            destination_longitude=destination_lng,
            departure_time=departure_time,
            total_seats=total_seats,
            available_seats=total_seats,
            window_seats=window_seats,
            available_window_seats=window_seats,
            window_seat_charge=window_seat_charge,
            base_fare=base_fare,
            per_km_rate=per_km_rate,
            distance_km=distance,
            vehicle_type=vehicle_type,
            parcel_enabled=parcel_enabled,
            women_only=women_only,
            status=TripStatus.PUBLISHED,
            notes=notes,
            non_stop=non_stop,
        )
        self.db.add(trip)
        await self.db.flush()  # Get trip.id

        # Add route stops if provided
        if route_stops:
            for i, stop in enumerate(route_stops):
                stop_point = WKTElement(f"POINT({stop['longitude']} {stop['latitude']})", srid=4326)
                rs = RouteStop(
                    id=uuid.uuid4(),
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
        """Move trip from DRAFT → PUBLISHED, then trigger forward matching."""
        trip = await self._get_driver_trip(trip_id, driver_user_id)
        if not trip or trip.status not in (TripStatus.DRAFT, TripStatus.PUBLISHED):
            return None
        trip.status = TripStatus.PUBLISHED
        await self.db.commit()
        serialized = self._serialize(trip)

        # Trigger forward match — notify waiting customers via matching-service
        import asyncio
        asyncio.create_task(self._trigger_forward_match(trip_id))

        return serialized

    async def _trigger_forward_match(self, trip_id: str) -> None:
        """Call matching-service to scan pending_bookings for this newly published trip."""
        import httpx, structlog as _log
        log = _log.get_logger(__name__)

        # Try local gateway first (local dev), then Docker hostname (container)
        for url in [
            f"http://localhost:8001/api/v1/matching/internal/match-trip/{trip_id}",
            f"http://matching-service:8003/internal/match-trip/{trip_id}",
        ]:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        log.info("Forward match completed", trip_id=trip_id, matches=data.get("matches", 0), url=url)
                        return
                    else:
                        log.warning("Forward match non-200", url=url, status=resp.status_code)
            except Exception as e:
                log.warning("Forward match attempt failed", url=url, error=str(e))

        # Last resort: direct in-process call
        try:
            import os, sys, importlib.util
            _root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            _matching_path = os.path.join(_root, "matching-service")
            _spec = importlib.util.spec_from_file_location(
                "_pms_direct",
                os.path.join(_matching_path, "app", "services", "pending_matching.py"),
            )
            _mod = importlib.util.module_from_spec(_spec)
            _spec.loader.exec_module(_mod)
            from common.database import async_session_maker
            async with async_session_maker() as db:
                svc = _mod.PendingMatchingService(db)
                matches = await svc.match_pending_bookings(trip_id)
                log.info("Forward match via direct call", trip_id=trip_id, matches=len(matches))
        except Exception as e:
            log.error("Forward match all methods failed", exc_info=e)

    async def start_trip(self, trip_id: str, driver_user_id: str) -> Optional[dict]:
        """Move trip from PUBLISHED  IN_PROGRESS."""
        trip = await self._get_driver_trip(trip_id, driver_user_id)
        if not trip or trip.status != TripStatus.PUBLISHED:
            return None
        trip.status = TripStatus.IN_PROGRESS
        trip.started_at = datetime.utcnow()
        await self.db.commit()
        return self._serialize(trip)

    async def complete_trip(self, trip_id: str, driver_user_id: str) -> Optional[dict]:
        """Move trip from IN_PROGRESS  COMPLETED."""
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
        from_lat: float,
        from_lng: float,
        to_lat: float,
        to_lng: float,
        departure_date: datetime,
        seats_needed: int = 1,
        vehicle_type: Optional[str] = None,
        women_only: bool = False,
        with_parcel: bool = False,
    ) -> list[dict]:
        """Search available published trips using PostGIS."""
        date_start = departure_date.replace(hour=0, minute=0, second=0)
        date_end = departure_date.replace(hour=23, minute=59, second=59)

        from geoalchemy2.elements import WKTElement
        from geoalchemy2.functions import ST_DWithin
        from sqlalchemy import cast
        from geoalchemy2.types import Geography

        search_pickup = WKTElement(f"POINT({from_lng} {from_lat})", srid=4326)
        search_dropoff = WKTElement(f"POINT({to_lng} {to_lat})", srid=4326)

        # Allow 50km radius for pickup and dropoff
        filters = [
            Trip.status == TripStatus.PUBLISHED,
            ST_DWithin(Trip.pickup_location, cast(search_pickup, Geography), 50000),
            ST_DWithin(Trip.destination_location, cast(search_dropoff, Geography), 50000),
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
        import math
        distance = trip.distance_km or 0
        eta_minutes = int(math.ceil(distance * 1.5))  # rough estimate: 1.5 min per km
        vehicle = trip.vehicle_type if isinstance(trip.vehicle_type, str) else (trip.vehicle_type.value if trip.vehicle_type else "sedan")
        # Build human-readable city labels from coordinates or notes
        pickup_label = f"{trip.pickup_latitude:.4f},{trip.pickup_longitude:.4f}"
        dest_label = f"{trip.destination_latitude:.4f},{trip.destination_longitude:.4f}"
        return {
            "id": str(trip.id),
            "vehicle_type": vehicle,
            "pickup_city": pickup_label,
            "destination_city": dest_label,
            "pickup_lat": trip.pickup_latitude,
            "pickup_lng": trip.pickup_longitude,
            "destination_lat": trip.destination_latitude,
            "destination_lng": trip.destination_longitude,
            "departure_time": trip.departure_time.isoformat() if trip.departure_time else None,
            "total_seats": trip.total_seats,
            "available_seats": trip.available_seats,
            "base_fare": float(trip.base_fare),
            "per_km_rate": float(trip.per_km_rate),
            "distance_km": distance,
            "eta_minutes": eta_minutes,
            "parcel_enabled": trip.parcel_enabled,
            "women_only": trip.women_only,
            "window_seats": trip.window_seats,
            "window_seat_charge": float(trip.window_seat_charge),
            "status": trip.status.value if trip.status else None,
            "started_at": trip.started_at.isoformat() if trip.started_at else None,
            "completed_at": trip.completed_at.isoformat() if trip.completed_at else None,
        }
