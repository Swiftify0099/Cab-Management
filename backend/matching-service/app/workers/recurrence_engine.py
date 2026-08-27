"""
Daily Trip Recurrence Engine
=============================
Generates daily Trip instances from TripScheduleTemplate records.

How it works:
  - Runs once at startup (catches up on missed generations) and then every hour.
  - Finds all active TripScheduleTemplates.
  - For each template, checks if today is a valid running day.
  - Creates a new DRAFT Trip instance from the template config.
  - Notifies the driver via Socket.IO + FCM: "Today's trip is ready — confirm or cancel."
  - Driver confirms → trip status → PUBLISHED (customers can book).
  - Driver cancels today → template stays active for tomorrow.

Recurrence types:
  - DAILY: runs every day (Mon-Sun)
  - SPECIFIC_DATE: runs only on specific dates stored in template_config.dates
  - SCHEDULED: matches days_of_week field

Templates can have:
  - excluded_dates: list of "YYYY-MM-DD" strings to skip (holidays, etc.)
  - days_of_week: list of int [1-7] where 1=Mon, 7=Sun
"""
from __future__ import annotations

import asyncio
import copy
import json
import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional

import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    TripScheduleTemplate, Trip, TripStatus, Driver, User,
)
from common.utils.redis_client import get_redis, publish_event

logger = structlog.get_logger(__name__)

# How often to check for missed daily instances (in seconds)
RECURRENCE_CHECK_INTERVAL_SECONDS = 3600  # 1 hour


async def _generate_trip_instance(
    template: TripScheduleTemplate,
    target_date: date,
    db: AsyncSession,
) -> Optional[Trip]:
    """
    Create a DRAFT Trip from a TripScheduleTemplate for a specific date.
    Returns the newly created trip, or None if creation failed.
    """
    config: dict = template.template_config or {}

    # Parse scheduled departure time
    start_time_str = template.start_time  # "08:00" or "08:00 AM"
    try:
        if "AM" in start_time_str.upper() or "PM" in start_time_str.upper():
            t = datetime.strptime(start_time_str.strip(), "%I:%M %p")
        else:
            t = datetime.strptime(start_time_str.strip(), "%H:%M")
        departure_dt = datetime(
            target_date.year, target_date.month, target_date.day,
            t.hour, t.minute, 0
        )
    except Exception:
        departure_dt = datetime(target_date.year, target_date.month, target_date.day, 8, 0, 0)

    # Build pickup location WKT for geography column
    pickup_lat = float(config.get("pickup_latitude", 0))
    pickup_lng = float(config.get("pickup_longitude", 0))
    dest_lat = float(config.get("destination_latitude", 0))
    dest_lng = float(config.get("destination_longitude", 0))

    from geoalchemy2.elements import WKTElement
    pickup_geom = WKTElement(f"POINT({pickup_lng} {pickup_lat})", srid=4326)
    dest_geom = WKTElement(f"POINT({dest_lng} {dest_lat})", srid=4326)

    trip = Trip(
        driver_id=template.driver_id,
        pickup_location=pickup_geom,
        pickup_latitude=pickup_lat,
        pickup_longitude=pickup_lng,
        pickup_address=config.get("pickup_address", ""),
        pickup_city=config.get("pickup_city", ""),
        destination_location=dest_geom,
        destination_latitude=dest_lat,
        destination_longitude=dest_lng,
        destination_address=config.get("destination_address", ""),
        destination_city=config.get("destination_city", ""),
        departure_time=departure_dt,
        total_seats=int(config.get("total_seats", 4)),
        available_seats=int(config.get("total_seats", 4)),
        window_seats=int(config.get("window_seats", 0)),
        available_window_seats=int(config.get("window_seats", 0)),
        window_seat_charge=Decimal(str(config.get("window_seat_charge", 0))),
        service_type=template.service_type,
        visibility_mode=config.get("visibility_mode", "SPECIFIC_CITY"),
        recurrence_type="DAILY",
        max_route_deviation_km=float(config.get("max_route_deviation_km", 3.0)),
        max_pickup_radius_km=float(config.get("max_pickup_radius_km", 5.0)),
        family_trip_enabled=bool(config.get("family_trip_enabled", False)),
        women_only=bool(config.get("women_only", False)),
        parcel_enabled=bool(config.get("parcel_enabled", False)),
        non_stop=bool(config.get("non_stop", False)),
        base_fare=Decimal(str(config.get("base_fare", 0))),
        per_km_rate=Decimal(str(config.get("per_km_rate", 0))),
        min_fare=Decimal(str(config.get("min_fare", 0))) if config.get("min_fare") else None,
        is_negotiable=bool(config.get("is_negotiable", False)),
        distance_km=float(config.get("distance_km", 0)) if config.get("distance_km") else None,
        vehicle_type=config.get("vehicle_type", "sedan"),
        organization_id=uuid.UUID(config["organization_id"]) if config.get("organization_id") else None,
        schedule_template_id=template.id,
        polyline=config.get("polyline"),
        notes=config.get("notes"),
        status=TripStatus.DRAFT,  # Driver must confirm before publishing
        is_full=False,
        occupied_seats=0,
    )

    db.add(trip)
    await db.flush()  # Get the ID before committing

    # Update template's last_instance_date
    template.last_instance_date = target_date

    return trip


def _is_valid_day(template: TripScheduleTemplate, target_date: date) -> bool:
    """
    Check if the template should generate a trip instance on target_date.
    """
    recurrence = (template.recurrence_type or "daily").lower()

    # Check excluded dates
    excluded = template.excluded_dates or []
    if target_date.strftime("%Y-%m-%d") in excluded:
        return False

    if recurrence == "daily":
        days_of_week = template.days_of_week or [1, 2, 3, 4, 5, 6, 7]
        # Python: Monday=0...Sunday=6; our model: 1=Mon...7=Sun
        day_num = target_date.isoweekday()  # 1=Mon...7=Sun
        return day_num in days_of_week

    elif recurrence == "weekdays":
        return target_date.isoweekday() <= 5

    elif recurrence == "weekly":
        days_of_week = template.days_of_week or [1]
        return target_date.isoweekday() in days_of_week

    elif recurrence == "scheduled":
        # Check specific dates in template_config
        config = template.template_config or {}
        specific_dates = config.get("dates", [])
        return target_date.strftime("%Y-%m-%d") in specific_dates

    return True


async def _notify_driver_renewal(
    template: TripScheduleTemplate,
    trip: Trip,
    db: AsyncSession,
) -> None:
    """Send renewal notification to driver via socket + FCM."""
    driver_res = await db.execute(
        select(Driver).where(Driver.id == template.driver_id)
    )
    driver = driver_res.scalar_one_or_none()
    if not driver:
        return

    user_res = await db.execute(
        select(User).where(User.id == driver.user_id)
    )
    user = user_res.scalar_one_or_none()

    departure_str = trip.departure_time.strftime("%I:%M %p") if trip.departure_time else "Scheduled"

    # Socket event
    await publish_event(f"driver:{str(driver.user_id)}:events", {
        "event":     "DAILY_TRIP_RENEWAL",
        "trip_id":   str(trip.id),
        "departure": departure_str,
        "route":     f"{trip.pickup_city} → {trip.destination_city}",
        "message":   f"Your scheduled trip is ready for {trip.departure_time.strftime('%b %d') if trip.departure_time else 'today'}. Confirm to publish it.",
    })

    # FCM push
    if user and user.device_token:
        from common.services.notification_dispatcher import dispatch_notification
        await dispatch_notification(
            event_type="DAILY_TRIP_RENEWAL",
            user_id=str(driver.user_id),
            device_token=user.device_token,
            title="📅 Today's Trip Ready",
            body=f"{trip.pickup_city} → {trip.destination_city} at {departure_str}. Tap to confirm.",
            data={
                "screen":  "TripRenewal",
                "trip_id": str(trip.id),
            },
            idempotency_key=f"renewal:{str(template.id)}:{trip.departure_time.date() if trip.departure_time else 'today'}",
            user_type="driver",
        )

    logger.info(
        "Driver renewal notification sent",
        driver_id=str(driver.id),
        trip_id=str(trip.id),
        departure=departure_str,
    )


async def run_recurrence_check(db_factory) -> None:
    """
    Check all active TripScheduleTemplates and create today's trip instances
    for any that haven't been generated yet.

    Should be called:
      - Once at startup
      - Every hour via the background loop
    """
    today = date.today()
    logger.info("Running trip recurrence check", date=str(today))

    async with db_factory() as db:
        try:
            template_res = await db.execute(
                select(TripScheduleTemplate).where(TripScheduleTemplate.is_active == True)
            )
            templates = template_res.scalars().all()

            generated = 0
            for template in templates:
                # Skip if already generated for today
                if template.last_instance_date == today:
                    continue

                # Check if today is a valid day for this template
                if not _is_valid_day(template, today):
                    logger.debug(
                        "Template skipped for today",
                        template_id=str(template.id),
                        today=str(today),
                    )
                    continue

                try:
                    trip = await _generate_trip_instance(template, today, db)
                    if trip:
                        await db.commit()
                        await _notify_driver_renewal(template, trip, db)
                        generated += 1
                        logger.info(
                            "Daily trip instance created",
                            template_id=str(template.id),
                            trip_id=str(trip.id),
                            departure=str(trip.departure_time),
                        )
                except Exception as exc:
                    await db.rollback()
                    logger.exception(
                        "Failed to generate trip instance",
                        template_id=str(template.id),
                        error=str(exc),
                    )

            logger.info("Recurrence check complete", generated=generated, checked=len(templates))

        except Exception as exc:
            logger.exception("Recurrence check failed", error=str(exc))


async def recurrence_loop(db_factory) -> None:
    """
    Background loop: runs recurrence check every hour.
    Started by the matching-service lifespan.
    """
    logger.info("Trip recurrence engine starting")

    while True:
        try:
            await run_recurrence_check(db_factory)
        except Exception as exc:
            logger.exception("Recurrence loop error", error=str(exc))

        # Wait for next check (1 hour)
        await asyncio.sleep(RECURRENCE_CHECK_INTERVAL_SECONDS)
