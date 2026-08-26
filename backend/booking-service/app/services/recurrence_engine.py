"""
Recurrence Engine Service — Daily / Specific Date / Scheduled Multi-Service Recurrence.

Distinguishes between Master Schedule Templates (TripScheduleTemplate) and
Active Daily Trip Instances (Trip), ensuring historical data and audit trails are preserved.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
import uuid

import structlog
from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.elements import WKTElement

from common.models.all_models import (
    Trip, TripStatus, TripScheduleTemplate, Driver, DriverStatus
)

logger = structlog.get_logger(__name__)


class RecurrenceEngineService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_template(
        self,
        driver_id: uuid.UUID,
        service_type: str,
        recurrence_type: str,
        days_of_week: list[int],
        start_time: str,
        template_config: dict,
        excluded_dates: Optional[list[str]] = None,
    ) -> TripScheduleTemplate:
        """Create a master recurring trip template."""
        template = TripScheduleTemplate(
            id=uuid.uuid4(),
            driver_id=driver_id,
            service_type=service_type,
            recurrence_type=recurrence_type,
            days_of_week=days_of_week or [1, 2, 3, 4, 5],
            excluded_dates=excluded_dates or [],
            start_time=start_time,
            template_config=template_config,
            is_active=True,
        )
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        return template

    async def generate_daily_instance(
        self,
        template_id: uuid.UUID,
        target_date: Optional[date] = None,
        force: bool = False,
    ) -> Optional[Trip]:
        """
        Generate or renew a daily trip instance from a master template.
        Skips holidays/excluded dates and inactive weekdays unless forced.
        """
        target = target_date or date.today()
        target_str = target.strftime("%Y-%m-%d")

        stmt = select(TripScheduleTemplate).where(
            and_(
                TripScheduleTemplate.id == template_id,
                TripScheduleTemplate.is_active == True,
            )
        )
        res = await self.db.execute(stmt)
        template = res.scalar_one_or_none()
        if not template:
            return None

        # Check holiday/excluded dates
        if not force and target_str in (template.excluded_dates or []):
            logger.info("Skipping instance creation on excluded date/holiday", date=target_str)
            return None

        # Check day of week (Python Monday is 1, Sunday is 7)
        iso_weekday = target.isoweekday()
        if not force and iso_weekday not in (template.days_of_week or [1, 2, 3, 4, 5]):
            logger.info("Skipping instance creation outside template days", weekday=iso_weekday)
            return None

        cfg = template.template_config
        pickup_lat = cfg.get("pickup_latitude", 18.5204)
        pickup_lng = cfg.get("pickup_longitude", 73.8567)
        dest_lat = cfg.get("destination_latitude", 19.0760)
        dest_lng = cfg.get("destination_longitude", 72.8777)

        # Build departure datetime from target date + start_time
        time_parts = template.start_time.replace("AM", "").replace("PM", "").strip().split(":")
        hour = int(time_parts[0]) if len(time_parts) > 0 else 8
        minute = int(time_parts[1]) if len(time_parts) > 1 else 0
        if "PM" in template.start_time and hour < 12:
            hour += 12
        departure_dt = datetime(target.year, target.month, target.day, hour, minute, tzinfo=timezone.utc)

        pickup_point = WKTElement(f"POINT({pickup_lng} {pickup_lat})", srid=4326)
        dest_point = WKTElement(f"POINT({dest_lng} {dest_lat})", srid=4326)

        total_seats = int(cfg.get("total_seats", 4))
        trip = Trip(
            id=uuid.uuid4(),
            driver_id=template.driver_id,
            pickup_location=pickup_point,
            pickup_latitude=pickup_lat,
            pickup_longitude=pickup_lng,
            pickup_address=cfg.get("pickup_address", "Pune Station"),
            pickup_city=cfg.get("pickup_city", "Pune"),
            destination_location=dest_point,
            destination_latitude=dest_lat,
            destination_longitude=dest_lng,
            destination_address=cfg.get("destination_address", "Dadar, Mumbai"),
            destination_city=cfg.get("destination_city", "Mumbai"),
            departure_time=departure_dt,
            total_seats=total_seats,
            available_seats=total_seats,
            occupied_seats=0,
            is_full=False,
            service_type=template.service_type,
            visibility_mode=cfg.get("visibility_mode", "SPECIFIC_CITY"),
            recurrence_type="DAILY",
            max_route_deviation_km=float(cfg.get("max_route_deviation_km", 3.0)),
            max_pickup_radius_km=float(cfg.get("max_pickup_radius_km", 5.0)),
            max_pickup_deviation_left_km=float(cfg.get("max_pickup_deviation_left_km", 3.0)),
            max_pickup_deviation_right_km=float(cfg.get("max_pickup_deviation_right_km", 3.0)),
            allowed_drop_deviation_km=float(cfg.get("allowed_drop_deviation_km", 3.0)),
            base_fare=float(cfg.get("base_fare", 450.0)),
            per_km_rate=float(cfg.get("per_km_rate", 3.5)),
            min_fare=float(cfg.get("min_fare", 0.0)) if cfg.get("min_fare") else None,
            is_negotiable=bool(cfg.get("is_negotiable", False)),
            vehicle_type=cfg.get("vehicle_type", "sedan"),
            vehicle_id=uuid.UUID(cfg["vehicle_id"]) if cfg.get("vehicle_id") else None,
            organization_id=uuid.UUID(cfg["organization_id"]) if cfg.get("organization_id") else None,
            schedule_template_id=template.id,
            service_metadata=cfg.get("service_metadata"),
            women_only=bool(cfg.get("women_only", False)),
            parcel_enabled=bool(cfg.get("parcel_enabled", False)),
            status=TripStatus.PUBLISHED,
            polyline=cfg.get("encoded_polyline"),
            distance_km=float(cfg.get("distance_km", 150.0)),
        )
        self.db.add(trip)
        template.last_instance_date = target
        await self.db.commit()
        await self.db.refresh(trip)
        return trip
