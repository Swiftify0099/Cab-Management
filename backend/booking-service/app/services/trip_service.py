"""
Trip Service — Driver creates and manages intercity trips.
Multi-service architecture (Cab, Transport, Organization, Parcel, Hotel, Airport, Packers & Movers)
with PostGIS route geometries, saved locations, recurrence templates, and seat capacity management.
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

import structlog
from sqlalchemy import select, and_, desc, func, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.elements import WKTElement

from common.models.all_models import (
    Trip, TripStatus, Driver, DriverStatus, RouteStop, Booking, BookingStatus,
    DriverSavedLocation, TripScheduleTemplate
)
from app.services.fare_engine import get_distance_km, VEHICLE_RATES, VEHICLE_CAPACITY
from app.services.recurrence_engine import RecurrenceEngineService

logger = structlog.get_logger(__name__)


class TripService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.recurrence = RecurrenceEngineService(db)

    async def create_trip(
        self,
        driver_user_id: str,
        pickup_lat: float,
        pickup_lng: float,
        destination_lat: float,
        destination_lng: float,
        departure_time: datetime,
        total_seats: int,
        vehicle_type: str = "sedan",
        base_fare: float = 450.0,
        per_km_rate: float = 3.5,
        min_fare: Optional[float] = None,
        is_negotiable: bool = False,
        service_type: str = "cab",
        visibility_mode: str = "SPECIFIC_CITY",
        recurrence_type: str = "SPECIFIC_DATE",
        days_of_week: Optional[list[int]] = None,
        excluded_dates: Optional[list[str]] = None,
        max_route_deviation_km: float = 3.0,
        max_pickup_radius_km: float = 5.0,
        max_pickup_deviation_left_km: float = 3.0,
        max_pickup_deviation_right_km: float = 3.0,
        allowed_drop_deviation_km: float = 3.0,
        pickup_address: Optional[str] = None,
        destination_address: Optional[str] = None,
        pickup_city: Optional[str] = None,
        destination_city: Optional[str] = None,
        parcel_enabled: bool = False,
        women_only: bool = False,
        window_seats: int = 0,
        window_seat_charge: float = 0.0,
        notes: Optional[str] = None,
        route_stops: Optional[list] = None,
        non_stop: bool = False,
        vehicle_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        service_metadata: Optional[dict] = None,
        encoded_polyline: Optional[str] = None,
        distance_km: Optional[float] = None,
        pickup_polygon: Optional[list] = None,
        destination_polygon: Optional[list] = None,
    ) -> dict:
        """Driver creates and publishes an intercity trip across any supported service."""
        # Resolve driver record
        driver_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = driver_res.scalar_one_or_none()
        if not driver:
            driver = Driver(
                id=uuid.uuid4(),
                user_id=uuid.UUID(driver_user_id),
                full_name="Partner Driver",
                license_number=f"MH-{uuid.uuid4().hex[:8].upper()}",
                status=DriverStatus.ONLINE,
                rating=4.9,
                total_trips=0,
            )
            self.db.add(driver)
            await self.db.flush()

        calculated_dist = distance_km or get_distance_km(pickup_lat, pickup_lng, destination_lat, destination_lng)

        pickup_point = WKTElement(f"POINT({pickup_lng} {pickup_lat})", srid=4326)
        dest_point = WKTElement(f"POINT({destination_lng} {destination_lat})", srid=4326)

        schedule_template_id = None
        # If DAILY / recurring schedule is chosen, create master template
        if recurrence_type.upper() == "DAILY":
            template = await self.recurrence.create_template(
                driver_id=driver.id,
                service_type=service_type,
                recurrence_type="daily",
                days_of_week=days_of_week or [1, 2, 3, 4, 5, 6, 7],
                start_time=departure_time.strftime("%H:%M"),
                excluded_dates=excluded_dates or [],
                template_config={
                    "pickup_latitude": pickup_lat,
                    "pickup_longitude": pickup_lng,
                    "destination_latitude": destination_lat,
                    "destination_longitude": destination_lng,
                    "pickup_address": pickup_address or f"{pickup_city or 'Origin'}",
                    "destination_address": destination_address or f"{destination_city or 'Destination'}",
                    "pickup_city": pickup_city or "Origin",
                    "destination_city": destination_city or "Destination",
                    "total_seats": total_seats,
                    "base_fare": base_fare,
                    "per_km_rate": per_km_rate,
                    "min_fare": min_fare,
                    "is_negotiable": is_negotiable,
                    "vehicle_type": vehicle_type,
                    "vehicle_id": vehicle_id,
                    "organization_id": organization_id,
                    "service_metadata": service_metadata,
                    "women_only": women_only,
                    "parcel_enabled": parcel_enabled,
                    "max_route_deviation_km": max_route_deviation_km,
                    "max_pickup_radius_km": max_pickup_radius_km,
                    "max_pickup_deviation_left_km": max_pickup_deviation_left_km,
                    "max_pickup_deviation_right_km": max_pickup_deviation_right_km,
                    "allowed_drop_deviation_km": allowed_drop_deviation_km,
                    "encoded_polyline": encoded_polyline,
                    "distance_km": calculated_dist,
                }
            )
            schedule_template_id = template.id

        trip = Trip(
            id=uuid.uuid4(),
            driver_id=driver.id,
            pickup_location=pickup_point,
            pickup_latitude=pickup_lat,
            pickup_longitude=pickup_lng,
            pickup_address=pickup_address or (f"{pickup_city}" if pickup_city else "Pickup Location"),
            pickup_city=pickup_city or "Origin City",
            destination_location=dest_point,
            destination_latitude=destination_lat,
            destination_longitude=destination_lng,
            destination_address=destination_address or (f"{destination_city}" if destination_city else "Destination Location"),
            destination_city=destination_city or "Destination City",
            departure_time=departure_time,
            total_seats=total_seats,
            available_seats=total_seats,
            occupied_seats=0,
            window_seats=window_seats,
            available_window_seats=window_seats,
            window_seat_charge=window_seat_charge,
            base_fare=Decimal(str(base_fare)),
            per_km_rate=Decimal(str(per_km_rate)),
            min_fare=Decimal(str(min_fare)) if min_fare is not None else None,
            is_negotiable=is_negotiable,
            distance_km=calculated_dist,
            vehicle_type=vehicle_type,
            vehicle_id=uuid.UUID(vehicle_id) if vehicle_id else None,
            organization_id=uuid.UUID(organization_id) if organization_id else None,
            schedule_template_id=schedule_template_id,
            service_type=service_type.lower(),
            visibility_mode=visibility_mode.upper(),
            recurrence_type=recurrence_type.upper(),
            max_route_deviation_km=max_route_deviation_km,
            max_pickup_radius_km=max_pickup_radius_km,
            max_pickup_deviation_left_km=max_pickup_deviation_left_km,
            max_pickup_deviation_right_km=max_pickup_deviation_right_km,
            allowed_drop_deviation_km=allowed_drop_deviation_km,
            parcel_enabled=parcel_enabled,
            women_only=women_only,
            is_full=False,
            status=TripStatus.PUBLISHED,
            polyline=encoded_polyline,
            notes=notes,
            non_stop=non_stop,
            service_metadata=service_metadata or {},
        )
        self.db.add(trip)
        await self.db.flush()

        # Add Route stops
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

        # Trigger forward match / corridor processing asynchronously
        import asyncio
        asyncio.create_task(self._trigger_forward_match(str(trip.id)))

        return self._serialize(trip)

    async def get_driver_trips(
        self,
        driver_user_id: str,
        service_type: Optional[str] = None,
        status_filter: Optional[str] = None,
        limit: int = 50,
    ) -> List[dict]:
        """Fetch all trips published by a driver with multi-service and status filtering."""
        driver_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = driver_res.scalar_one_or_none()
        if not driver:
            return []

        query = select(Trip).where(Trip.driver_id == driver.id)
        if service_type and service_type.lower() != "all":
            query = query.where(Trip.service_type == service_type.lower())
        if status_filter and status_filter.lower() != "all":
            try:
                query = query.where(Trip.status == TripStatus(status_filter.lower()))
            except ValueError:
                pass

        query = query.order_by(desc(Trip.departure_time)).limit(limit)
        res = await self.db.execute(query)
        trips = res.scalars().all()
        return [self._serialize(t) for t in trips]

    # ─────────────────────────────────────────────────────────────────────────
    # Saved Driver Locations
    # ─────────────────────────────────────────────────────────────────────────

    async def list_saved_locations(self, driver_user_id: str, loc_type: Optional[str] = None) -> List[dict]:
        """List driver's saved pickup/drop locations."""
        driver_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = driver_res.scalar_one_or_none()
        if not driver:
            return []

        query = select(DriverSavedLocation).where(DriverSavedLocation.driver_id == driver.id)
        if loc_type and loc_type != "all":
            query = query.where(DriverSavedLocation.location_type.in_([loc_type, "both"]))
        query = query.order_by(desc(DriverSavedLocation.is_default), desc(DriverSavedLocation.created_at))

        res = await self.db.execute(query)
        locs = res.scalars().all()
        return [
            {
                "id": str(l.id),
                "label": l.label,
                "address": l.address,
                "latitude": l.latitude,
                "longitude": l.longitude,
                "city": l.city,
                "state": l.state,
                "postal_code": l.postal_code,
                "landmark": l.landmark,
                "location_type": l.location_type,
                "is_default": l.is_default,
            }
            for l in locs
        ]

    async def create_saved_location(self, driver_user_id: str, data: dict) -> dict:
        """Create a new driver saved location."""
        driver_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = driver_res.scalar_one_or_none()
        if not driver:
            driver = Driver(
                id=uuid.uuid4(),
                user_id=uuid.UUID(driver_user_id),
                full_name="Driver",
                license_number=f"DL-{uuid.uuid4().hex[:6].upper()}",
                status=DriverStatus.ONLINE,
            )
            self.db.add(driver)
            await self.db.flush()

        loc = DriverSavedLocation(
            id=uuid.uuid4(),
            driver_id=driver.id,
            label=data["label"],
            address=data["address"],
            latitude=data["latitude"],
            longitude=data["longitude"],
            city=data.get("city"),
            state=data.get("state"),
            postal_code=data.get("postal_code"),
            landmark=data.get("landmark"),
            location_type=data.get("location_type", "both"),
            is_default=data.get("is_default", False),
        )
        self.db.add(loc)
        await self.db.commit()
        await self.db.refresh(loc)
        return {
            "id": str(loc.id),
            "label": loc.label,
            "address": loc.address,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "city": loc.city,
            "state": loc.state,
            "location_type": loc.location_type,
            "is_default": loc.is_default,
        }

    async def update_saved_location(self, driver_user_id: str, loc_id: str, data: dict) -> Optional[dict]:
        """Update an existing driver saved location."""
        driver_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = driver_res.scalar_one_or_none()
        if not driver:
            return None

        res = await self.db.execute(
            select(DriverSavedLocation).where(
                and_(DriverSavedLocation.id == uuid.UUID(loc_id), DriverSavedLocation.driver_id == driver.id)
            )
        )
        loc = res.scalar_one_or_none()
        if not loc:
            return None

        for k in ["label", "address", "latitude", "longitude", "city", "state", "postal_code", "landmark", "location_type", "is_default"]:
            if k in data:
                setattr(loc, k, data[k])

        await self.db.commit()
        await self.db.refresh(loc)
        return {
            "id": str(loc.id),
            "label": loc.label,
            "address": loc.address,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "city": loc.city,
            "state": loc.state,
            "location_type": loc.location_type,
            "is_default": loc.is_default,
        }

    async def delete_saved_location(self, driver_user_id: str, loc_id: str) -> bool:
        """Delete a saved location."""
        driver_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = driver_res.scalar_one_or_none()
        if not driver:
            return False

        res = await self.db.execute(
            delete(DriverSavedLocation).where(
                and_(DriverSavedLocation.id == uuid.UUID(loc_id), DriverSavedLocation.driver_id == driver.id)
            )
        )
        await self.db.commit()
        return res.rowcount > 0

    async def _trigger_forward_match(self, trip_id: str) -> None:
        """Trigger matching service to evaluate corridor matches for this trip."""
        import httpx
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"http://localhost:8003/api/v1/matching/trips/{trip_id}/forward-match",
                    json={"trip_id": trip_id},
                )
        except Exception as e:
            logger.warning("Forward match trigger skipped/failed", exc_info=e)

    @staticmethod
    def _serialize(trip: Trip) -> dict:
        distance = trip.distance_km or 0
        eta_minutes = int(math.ceil(distance * 1.5))
        return {
            "id": str(trip.id),
            "service_type": trip.service_type or "cab",
            "visibility_mode": trip.visibility_mode or "SPECIFIC_CITY",
            "recurrence_type": trip.recurrence_type or "SPECIFIC_DATE",
            "vehicle_type": trip.vehicle_type or "sedan",
            "pickup_city": trip.pickup_city or "Origin",
            "destination_city": trip.destination_city or "Destination",
            "pickup_address": trip.pickup_address,
            "destination_address": trip.destination_address,
            "pickup_lat": trip.pickup_latitude,
            "pickup_lng": trip.pickup_longitude,
            "destination_lat": trip.destination_latitude,
            "destination_lng": trip.destination_longitude,
            "departure_time": trip.departure_time.isoformat() if trip.departure_time else None,
            "total_seats": trip.total_seats,
            "available_seats": trip.available_seats,
            "occupied_seats": trip.occupied_seats or 0,
            "is_full": trip.is_full or False,
            "base_fare": float(trip.base_fare),
            "per_km_rate": float(trip.per_km_rate),
            "min_fare": float(trip.min_fare) if trip.min_fare is not None else None,
            "is_negotiable": trip.is_negotiable or False,
            "distance_km": distance,
            "eta_minutes": eta_minutes,
            "parcel_enabled": trip.parcel_enabled,
            "women_only": trip.women_only,
            "window_seats": trip.window_seats,
            "window_seat_charge": float(trip.window_seat_charge),
            "max_route_deviation_km": trip.max_route_deviation_km,
            "max_pickup_radius_km": trip.max_pickup_radius_km,
            "organization_id": str(trip.organization_id) if trip.organization_id else None,
            "service_metadata": trip.service_metadata or {},
            "status": trip.status.value if trip.status else None,
            "started_at": trip.started_at.isoformat() if trip.started_at else None,
            "completed_at": trip.completed_at.isoformat() if trip.completed_at else None,
        }
