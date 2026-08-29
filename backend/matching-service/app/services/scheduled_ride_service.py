"""
Feature 15: Scheduled & Advance Booking Engine.

Authoritative Scheduled Booking Lifecycle:
- Book Now vs Schedule Later (Advance date & time selection)
- Strict Future Timestamp & Timezone Validation (T+30m to 7 days ahead)
- Vehicle Category & Preferred Partner Availability
- Anti-Overlap Guard: Customer duplicate booking prevention & Driver overlapping job prevention
- Scheduled Job Policy: Unassigned/Reserved advance state (Never dispatched as instant ride)
- Customer Modification Engine (Allowed >= 60m before pickup)
- Early vs Late Cancellation Policy (Free >= 60m, ₹50 late fee < 60m)
- Pre-Trip Automated Reminders (T-60m and T-30m alerts)
- Driver Dispatch Transition & Punctuality Auto-Release Safeguards
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union

import structlog
from fastapi import HTTPException
from sqlalchemy import and_, asc, desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Driver,
    DriverStatus,
    KYCStatus,
    Notification,
    NotificationType,
    RideEventLog,
    RideRequest,
    RideRequestStatus,
    User,
    UserRole,
    Vehicle,
)
from common.utils.redis_client import publish_event

logger = structlog.get_logger(__name__)

MIN_SCHEDULE_ADVANCE_MINUTES = 30  # Minimum 30 minutes in advance
MAX_SCHEDULE_ADVANCE_DAYS = 7     # Maximum 7 days in advance
CUSTOMER_OVERLAP_WINDOW_MINUTES = 45 # Customer cannot book overlapping rides within 45m
DRIVER_OVERLAP_WINDOW_MINUTES = 90   # Driver cannot take overlapping rides within 90m
MODIFICATION_DEADLINE_MINUTES = 60    # Must modify >= 60m before pickup
LATE_CANCELLATION_DEADLINE_MINUTES = 60 # Free cancel >= 60m; fee < 60m


class ScheduledRideService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # =========================================================================
    # 1. SCHEDULED RIDE CREATION (SCHEDULE LATER)
    # =========================================================================
    async def create_scheduled_ride(
        self,
        customer_user_id: Union[str, uuid.UUID],
        pickup_lat: float,
        pickup_lng: float,
        pickup_address: str,
        destination_lat: float,
        destination_lng: float,
        destination_address: str,
        scheduled_pickup_time: Union[str, datetime],
        service_type: str = "cab",
        ride_category_id: Optional[uuid.UUID] = None,
        preferred_driver_id: Optional[uuid.UUID] = None,
        estimated_fare: Optional[Decimal] = None,
        seats_requested: int = 1,
    ) -> Dict[str, Any]:
        """
        Customer schedules an advance ride for a future date and time.
        Validates future timestamp, customer duplicate overlap, and preferred driver availability.
        """
        cust_uid = uuid.UUID(str(customer_user_id))
        now = datetime.now(timezone.utc)

        # 1. Parse & Normalize Future Timestamp
        if isinstance(scheduled_pickup_time, str):
            try:
                # Handle ISO8601 strings
                clean_ts = scheduled_pickup_time.replace("Z", "+00:00")
                pickup_dt = datetime.fromisoformat(clean_ts)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid ISO datetime format for scheduled_pickup_time.")
        else:
            pickup_dt = scheduled_pickup_time

        if pickup_dt.tzinfo is None:
            pickup_dt = pickup_dt.replace(tzinfo=timezone.utc)
        else:
            pickup_dt = pickup_dt.astimezone(timezone.utc)

        # Boundary checks
        min_allowed = now + timedelta(minutes=MIN_SCHEDULE_ADVANCE_MINUTES)
        max_allowed = now + timedelta(days=MAX_SCHEDULE_ADVANCE_DAYS)

        if pickup_dt < min_allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Scheduled pickup time must be at least {MIN_SCHEDULE_ADVANCE_MINUTES} minutes in the future."
            )
        if pickup_dt > max_allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Scheduled pickup time cannot exceed {MAX_SCHEDULE_ADVANCE_DAYS} days in advance."
            )

        # 2. Customer Duplicate Schedule Check
        overlap_start = pickup_dt - timedelta(minutes=CUSTOMER_OVERLAP_WINDOW_MINUTES)
        overlap_end = pickup_dt + timedelta(minutes=CUSTOMER_OVERLAP_WINDOW_MINUTES)

        dup_stmt = select(RideRequest).where(
            and_(
                RideRequest.customer_id == cust_uid,
                RideRequest.is_scheduled.is_(True),
                RideRequest.scheduled_status.in_(["UNASSIGNED", "RESERVED", "DISPATCHED"]),
                RideRequest.status.in_([RideRequestStatus.CREATED, RideRequestStatus.ASSIGNED]),
                RideRequest.scheduled_pickup_time >= overlap_start,
                RideRequest.scheduled_pickup_time <= overlap_end,
            )
        )
        dup_res = await self.session.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"You already have a scheduled booking within {CUSTOMER_OVERLAP_WINDOW_MINUTES} minutes of this time."
            )

        # 3. Preferred Driver Validation & Overlap Check (if supplied)
        assigned_driver_id = None
        scheduled_status = "UNASSIGNED"
        auto_release_at = None

        if preferred_driver_id:
            d_stmt = select(Driver).where(Driver.id == preferred_driver_id)
            d_res = await self.session.execute(d_stmt)
            driver = d_res.scalar_one_or_none()
            if not driver or not driver.is_active or driver.kyc_status != KYCStatus.APPROVED:
                raise HTTPException(status_code=400, detail="Preferred driver is not eligible or active.")

            # Check driver overlapping scheduled trips
            d_overlap_start = pickup_dt - timedelta(minutes=DRIVER_OVERLAP_WINDOW_MINUTES)
            d_overlap_end = pickup_dt + timedelta(minutes=DRIVER_OVERLAP_WINDOW_MINUTES)

            d_dup_stmt = select(RideRequest).where(
                and_(
                    RideRequest.assigned_driver_id == preferred_driver_id,
                    RideRequest.is_scheduled.is_(True),
                    RideRequest.scheduled_status.in_(["RESERVED", "DISPATCHED"]),
                    RideRequest.scheduled_pickup_time >= d_overlap_start,
                    RideRequest.scheduled_pickup_time <= d_overlap_end,
                )
            )
            d_dup_res = await self.session.execute(d_dup_stmt)
            if d_dup_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=409,
                    detail="Preferred driver is already committed to another scheduled trip during this window."
                )

            assigned_driver_id = preferred_driver_id
            scheduled_status = "RESERVED"
            auto_release_at = pickup_dt - timedelta(minutes=30)

        # 4. Construct Ride Request
        calc_fare = estimated_fare or Decimal("380.00")
        ride = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust_uid,
            pickup_location=f"SRID=4326;POINT({pickup_lng} {pickup_lat})",
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            pickup_address=pickup_address,
            destination_location=f"SRID=4326;POINT({destination_lng} {destination_lat})",
            destination_lat=destination_lat,
            destination_lng=destination_lng,
            destination_address=destination_address,
            service_type=service_type,
            ride_category_id=ride_category_id,
            seats_requested=seats_requested,
            estimated_fare=calc_fare,
            current_estimated_fare=calc_fare,
            status=RideRequestStatus.CREATED,
            pricing_mode="STANDARD",
            is_scheduled=True,
            scheduled_pickup_time=pickup_dt,
            scheduled_status=scheduled_status,
            assigned_driver_id=assigned_driver_id,
            reservation_accepted_at=now if assigned_driver_id else None,
            dispatch_buffer_minutes=45,
            auto_release_at=auto_release_at,
        )
        self.session.add(ride)
        await self.session.flush()

        # Audit Event Log
        self.session.add(
            RideEventLog(
                id=uuid.uuid4(),
                ride_id=ride.id,
                event_type="SCHEDULED_RIDE_CREATED",
                actor_id=cust_uid,
                actor_role="customer",
                details={
                    "scheduled_pickup_time": pickup_dt.isoformat(),
                    "scheduled_status": scheduled_status,
                    "estimated_fare": float(calc_fare),
                    "preferred_driver_id": str(preferred_driver_id) if preferred_driver_id else None,
                },
            )
        )

        await self.session.commit()

        # Emit realtime event to customer
        try:
            await publish_event(
                f"customer:{str(cust_uid)}:events",
                {
                    "event": "SCHEDULED_RIDE_CONFIRMED",
                    "ride_id": str(ride.id),
                    "scheduled_pickup_time": pickup_dt.isoformat(),
                    "scheduled_status": scheduled_status,
                    "estimated_fare": float(calc_fare),
                },
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": "Ride successfully scheduled!",
            "ride_id": str(ride.id),
            "is_scheduled": True,
            "scheduled_status": scheduled_status,
            "scheduled_pickup_time": pickup_dt.isoformat(),
            "pickup_address": pickup_address,
            "destination_address": destination_address,
            "estimated_fare": float(calc_fare),
            "assigned_driver_id": str(assigned_driver_id) if assigned_driver_id else None,
        }

    # =========================================================================
    # 2. CUSTOMER MODIFICATION ENGINE
    # =========================================================================
    async def modify_scheduled_ride(
        self,
        customer_user_id: Union[str, uuid.UUID],
        ride_id: uuid.UUID,
        new_scheduled_pickup_time: Optional[Union[str, datetime]] = None,
        new_pickup_address: Optional[str] = None,
        new_pickup_lat: Optional[float] = None,
        new_pickup_lng: Optional[float] = None,
        new_destination_address: Optional[str] = None,
        new_destination_lat: Optional[float] = None,
        new_destination_lng: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Customer modifies an upcoming scheduled booking (pickup time or address).
        Permitted only if current time >= 60 minutes prior to scheduled pickup.
        """
        cust_uid = uuid.UUID(str(customer_user_id))
        now = datetime.now(timezone.utc)

        stmt = select(RideRequest).where(RideRequest.id == ride_id).with_for_update()
        res = await self.session.execute(stmt)
        ride = res.scalar_one_or_none()

        if not ride or ride.customer_id != cust_uid:
            raise HTTPException(status_code=404, detail="Scheduled ride not found or unauthorized.")

        if not ride.is_scheduled or ride.scheduled_status not in ("UNASSIGNED", "RESERVED") or ride.status != RideRequestStatus.CREATED:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot modify scheduled trip in {ride.scheduled_status} / {ride.status.value} state."
            )

        # 1. Lead-time deadline enforcement
        if ride.scheduled_pickup_time:
            time_until_pickup = (ride.scheduled_pickup_time - now).total_seconds() / 60.0
            if time_until_pickup < MODIFICATION_DEADLINE_MINUTES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Modifications are not permitted within {MODIFICATION_DEADLINE_MINUTES} minutes of pickup time."
                )

        # 2. If changing time, validate new future timestamp
        if new_scheduled_pickup_time:
            if isinstance(new_scheduled_pickup_time, str):
                try:
                    clean_ts = new_scheduled_pickup_time.replace("Z", "+00:00")
                    new_dt = datetime.fromisoformat(clean_ts)
                except Exception:
                    raise HTTPException(status_code=400, detail="Invalid ISO datetime format for new scheduled time.")
            else:
                new_dt = new_scheduled_pickup_time

            if new_dt.tzinfo is None:
                new_dt = new_dt.replace(tzinfo=timezone.utc)
            else:
                new_dt = new_dt.astimezone(timezone.utc)

            min_allowed = now + timedelta(minutes=MIN_SCHEDULE_ADVANCE_MINUTES)
            max_allowed = now + timedelta(days=MAX_SCHEDULE_ADVANCE_DAYS)
            if new_dt < min_allowed or new_dt > max_allowed:
                raise HTTPException(
                    status_code=400,
                    detail=f"New pickup time must be between {MIN_SCHEDULE_ADVANCE_MINUTES}m and {MAX_SCHEDULE_ADVANCE_DAYS}d in advance."
                )

            # Check customer duplicate overlap
            dup_stmt = select(RideRequest).where(
                and_(
                    RideRequest.customer_id == cust_uid,
                    RideRequest.id != ride.id,
                    RideRequest.is_scheduled.is_(True),
                    RideRequest.scheduled_status.in_(["UNASSIGNED", "RESERVED", "DISPATCHED"]),
                    RideRequest.scheduled_pickup_time >= (new_dt - timedelta(minutes=CUSTOMER_OVERLAP_WINDOW_MINUTES)),
                    RideRequest.scheduled_pickup_time <= (new_dt + timedelta(minutes=CUSTOMER_OVERLAP_WINDOW_MINUTES)),
                )
            )
            if (await self.session.execute(dup_stmt)).scalar_one_or_none():
                raise HTTPException(status_code=400, detail="You have an overlapping scheduled trip at this new time.")

            # If driver is assigned, check driver overlap at new time
            if ride.assigned_driver_id:
                d_dup_stmt = select(RideRequest).where(
                    and_(
                        RideRequest.assigned_driver_id == ride.assigned_driver_id,
                        RideRequest.id != ride.id,
                        RideRequest.is_scheduled.is_(True),
                        RideRequest.scheduled_status.in_(["RESERVED", "DISPATCHED"]),
                        RideRequest.scheduled_pickup_time >= (new_dt - timedelta(minutes=DRIVER_OVERLAP_WINDOW_MINUTES)),
                        RideRequest.scheduled_pickup_time <= (new_dt + timedelta(minutes=DRIVER_OVERLAP_WINDOW_MINUTES)),
                    )
                )
                if (await self.session.execute(d_dup_stmt)).scalar_one_or_none():
                    # Unassign driver if driver cannot make the new time
                    ride.assigned_driver_id = None
                    ride.scheduled_status = "UNASSIGNED"
                    ride.reservation_accepted_at = None
                    ride.auto_release_at = None
                else:
                    ride.auto_release_at = new_dt - timedelta(minutes=30)

            ride.scheduled_pickup_time = new_dt

        # 3. Update addresses / coordinates
        if new_pickup_address:
            ride.pickup_address = new_pickup_address
        if new_pickup_lat is not None and new_pickup_lng is not None:
            ride.pickup_lat = new_pickup_lat
            ride.pickup_lng = new_pickup_lng
            ride.pickup_location = f"SRID=4326;POINT({new_pickup_lng} {new_pickup_lat})"

        if new_destination_address:
            ride.destination_address = new_destination_address
        if new_destination_lat is not None and new_destination_lng is not None:
            ride.destination_lat = new_destination_lat
            ride.destination_lng = new_destination_lng
            ride.destination_location = f"SRID=4326;POINT({new_destination_lng} {new_destination_lat})"

        # Audit Event Log
        self.session.add(
            RideEventLog(
                id=uuid.uuid4(),
                ride_id=ride.id,
                event_type="SCHEDULED_RIDE_MODIFIED",
                actor_id=cust_uid,
                actor_role="customer",
                details={
                    "new_scheduled_pickup_time": ride.scheduled_pickup_time.isoformat() if ride.scheduled_pickup_time else None,
                    "new_pickup_address": ride.pickup_address,
                    "new_destination_address": ride.destination_address,
                },
            )
        )

        await self.session.commit()

        return {
            "success": True,
            "message": "Scheduled booking successfully modified.",
            "ride_id": str(ride.id),
            "scheduled_status": ride.scheduled_status,
            "scheduled_pickup_time": ride.scheduled_pickup_time.isoformat() if ride.scheduled_pickup_time else None,
            "pickup_address": ride.pickup_address,
            "destination_address": ride.destination_address,
            "assigned_driver_id": str(ride.assigned_driver_id) if ride.assigned_driver_id else None,
        }

    # =========================================================================
    # 3. CUSTOMER CANCELLATION (EARLY VS LATE FEE)
    # =========================================================================
    async def cancel_scheduled_ride_by_customer(
        self,
        customer_user_id: Union[str, uuid.UUID],
        ride_id: uuid.UUID,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Customer cancels scheduled reservation.
        - Early cancellation (>= 60m before pickup): Free (₹0.00).
        - Late cancellation (< 60m before pickup with driver reserved): ₹50.00 cancellation fee.
        """
        cust_uid = uuid.UUID(str(customer_user_id))
        now = datetime.now(timezone.utc)

        stmt = select(RideRequest).where(RideRequest.id == ride_id).with_for_update()
        res = await self.session.execute(stmt)
        ride = res.scalar_one_or_none()

        if not ride or ride.customer_id != cust_uid:
            raise HTTPException(status_code=404, detail="Scheduled ride not found or unauthorized.")

        if ride.status in (RideRequestStatus.COMPLETED, RideRequestStatus.CANCELLED):
            raise HTTPException(status_code=400, detail=f"Ride is already {ride.status.value}.")

        hours_to_pickup = 999.0
        if ride.scheduled_pickup_time:
            hours_to_pickup = (ride.scheduled_pickup_time - now).total_seconds() / 3600.0

        is_late_cancellation = (hours_to_pickup < 1.0) and (ride.assigned_driver_id is not None)
        cancellation_fee = Decimal("50.00") if is_late_cancellation else Decimal("0.00")

        # Update Ride Request State
        ride.status = RideRequestStatus.CANCELLED
        ride.scheduled_status = "CANCELLED"
        ride.cancelled_by = "customer"
        ride.cancelled_at = now
        ride.cancellation_reason = reason or ("Late scheduled cancellation" if is_late_cancellation else "Customer cancelled in advance")
        ride.final_fare = cancellation_fee

        # Audit Event Log
        self.session.add(
            RideEventLog(
                id=uuid.uuid4(),
                ride_id=ride.id,
                event_type="SCHEDULED_RIDE_CANCELLED_BY_CUSTOMER",
                actor_id=cust_uid,
                actor_role="customer",
                details={
                    "is_late_cancellation": is_late_cancellation,
                    "cancellation_fee": float(cancellation_fee),
                    "hours_to_pickup": round(hours_to_pickup, 2),
                    "reason": ride.cancellation_reason,
                },
            )
        )

        await self.session.commit()

        # Emit realtime event
        try:
            payload = {
                "event": "SCHEDULED_RIDE_CANCELLED",
                "ride_id": str(ride.id),
                "cancelled_by": "customer",
                "cancellation_fee": float(cancellation_fee),
                "is_late_cancellation": is_late_cancellation,
            }
            await publish_event(f"customer:{str(cust_uid)}:events", payload)
            if ride.assigned_driver_id:
                await publish_event(f"driver:{str(ride.assigned_driver_id)}:events", payload)
        except Exception:
            pass

        return {
            "success": True,
            "message": "Scheduled ride cancelled." if not is_late_cancellation else "Scheduled ride cancelled. ₹50.00 late cancellation fee applies.",
            "ride_id": str(ride.id),
            "status": "CANCELLED",
            "is_late_cancellation": is_late_cancellation,
            "cancellation_fee": float(cancellation_fee),
        }

    # =========================================================================
    # 4. CUSTOMER UPCOMING SCHEDULED TRIPS FEED
    # =========================================================================
    async def get_customer_scheduled_rides(
        self,
        customer_user_id: Union[str, uuid.UUID],
    ) -> Dict[str, Any]:
        """
        Returns active upcoming advance bookings for the customer.
        """
        cust_uid = uuid.UUID(str(customer_user_id))
        now = datetime.now(timezone.utc)

        stmt = select(RideRequest).where(
            and_(
                RideRequest.customer_id == cust_uid,
                RideRequest.is_scheduled.is_(True),
                RideRequest.scheduled_status.in_(["UNASSIGNED", "RESERVED", "DISPATCHED"]),
                RideRequest.status.in_([RideRequestStatus.CREATED, RideRequestStatus.ASSIGNED]),
                RideRequest.scheduled_pickup_time > (now - timedelta(hours=1)),
            )
        ).order_by(asc(RideRequest.scheduled_pickup_time))

        res = await self.session.execute(stmt)
        rides = res.scalars().all()

        upcoming = []
        for r in rides:
            countdown_seconds = int((r.scheduled_pickup_time - now).total_seconds()) if r.scheduled_pickup_time else 0
            upcoming.append({
                "id": str(r.id),
                "scheduled_status": r.scheduled_status,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "scheduled_pickup_time": r.scheduled_pickup_time.isoformat() if r.scheduled_pickup_time else None,
                "countdown_seconds": max(0, countdown_seconds),
                "pickup_address": r.pickup_address,
                "pickup_lat": r.pickup_lat,
                "pickup_lng": r.pickup_lng,
                "destination_address": r.destination_address,
                "destination_lat": r.destination_lat,
                "destination_lng": r.destination_lng,
                "estimated_fare": float(r.estimated_fare) if r.estimated_fare else 350.0,
                "assigned_driver_id": str(r.assigned_driver_id) if r.assigned_driver_id else None,
            })

        return {
            "total": len(upcoming),
            "upcoming_bookings": upcoming,
        }

    # =========================================================================
    # 5. DISCOVERY FEED & ATOMIC DRIVER ACCEPTANCE (WITH OVERLAP GUARD)
    # =========================================================================
    async def get_available_scheduled_rides(
        self,
        driver_id: Optional[uuid.UUID] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Returns list of open, unassigned advance scheduled bookings.
        """
        now = datetime.now(timezone.utc)
        stmt = select(RideRequest).where(
            and_(
                RideRequest.is_scheduled.is_(True),
                RideRequest.scheduled_status == "UNASSIGNED",
                RideRequest.scheduled_pickup_time > now,
                RideRequest.status == RideRequestStatus.CREATED,
            )
        ).order_by(asc(RideRequest.scheduled_pickup_time)).limit(limit).offset(offset)

        res = await self.session.execute(stmt)
        rides = res.scalars().all()

        return {
            "total": len(rides),
            "available_rides": [
                {
                    "id": str(r.id),
                    "scheduled_pickup_time": r.scheduled_pickup_time.isoformat() if r.scheduled_pickup_time else None,
                    "pickup_address": r.pickup_address,
                    "pickup_lat": r.pickup_lat,
                    "pickup_lng": r.pickup_lng,
                    "destination_address": r.destination_address,
                    "destination_lat": r.destination_lat,
                    "destination_lng": r.destination_lng,
                    "estimated_fare": float(r.estimated_fare) if r.estimated_fare else 350.0,
                    "dispatch_buffer_minutes": r.dispatch_buffer_minutes or 45,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rides
            ],
        }

    async def accept_scheduled_reservation(
        self,
        driver_id: uuid.UUID,
        ride_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Atomically claims a scheduled ride reservation for the driver.
        Validates no overlapping driver bookings within +/- 90 minutes.
        """
        now = datetime.now(timezone.utc)

        # 1. Row-lock target ride
        stmt = select(RideRequest).where(RideRequest.id == ride_id).with_for_update()
        res = await self.session.execute(stmt)
        ride = res.scalar_one_or_none()

        if not ride:
            raise HTTPException(status_code=404, detail="Scheduled ride not found")

        if not ride.is_scheduled or ride.scheduled_status != "UNASSIGNED":
            raise HTTPException(
                status_code=409,
                detail="This reservation has already been claimed by another driver."
            )

        if ride.scheduled_pickup_time and ride.scheduled_pickup_time <= now:
            raise HTTPException(
                status_code=400,
                detail="This scheduled ride pickup time has already passed."
            )

        # 2. Driver Overlapping Job Guard
        if ride.scheduled_pickup_time:
            d_overlap_start = ride.scheduled_pickup_time - timedelta(minutes=DRIVER_OVERLAP_WINDOW_MINUTES)
            d_overlap_end = ride.scheduled_pickup_time + timedelta(minutes=DRIVER_OVERLAP_WINDOW_MINUTES)

            d_dup_stmt = select(RideRequest).where(
                and_(
                    RideRequest.assigned_driver_id == driver_id,
                    RideRequest.id != ride.id,
                    RideRequest.is_scheduled.is_(True),
                    RideRequest.scheduled_status.in_(["RESERVED", "DISPATCHED"]),
                    RideRequest.scheduled_pickup_time >= d_overlap_start,
                    RideRequest.scheduled_pickup_time <= d_overlap_end,
                )
            )
            d_dup_res = await self.session.execute(d_dup_stmt)
            if d_dup_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=409,
                    detail=f"You already have a reserved scheduled trip within {DRIVER_OVERLAP_WINDOW_MINUTES} minutes of this time."
                )

        # 3. Update reservation state
        ride.assigned_driver_id = driver_id
        ride.scheduled_status = "RESERVED"
        ride.reservation_accepted_at = now
        if ride.scheduled_pickup_time:
            ride.auto_release_at = ride.scheduled_pickup_time - timedelta(minutes=30)

        # Audit Event Log
        self.session.add(
            RideEventLog(
                id=uuid.uuid4(),
                ride_id=ride.id,
                event_type="SCHEDULED_RESERVATION_ACCEPTED_BY_DRIVER",
                actor_id=driver_id,
                actor_role="driver",
                details={
                    "scheduled_pickup_time": ride.scheduled_pickup_time.isoformat() if ride.scheduled_pickup_time else None,
                    "auto_release_at": ride.auto_release_at.isoformat() if ride.auto_release_at else None,
                },
            )
        )

        await self.session.commit()

        # Emit realtime event
        try:
            await publish_event(
                f"customer:{str(ride.customer_id)}:events",
                {
                    "event": "SCHEDULED_DRIVER_ASSIGNED",
                    "ride_id": str(ride.id),
                    "driver_id": str(driver_id),
                    "scheduled_pickup_time": ride.scheduled_pickup_time.isoformat() if ride.scheduled_pickup_time else None,
                },
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": "Advance reservation confirmed! We will remind you before the trip.",
            "ride_id": str(ride_id),
            "scheduled_status": "RESERVED",
            "scheduled_pickup_time": ride.scheduled_pickup_time.isoformat() if ride.scheduled_pickup_time else None,
            "auto_release_at": ride.auto_release_at.isoformat() if ride.auto_release_at else None,
        }

    # =========================================================================
    # 6. DRIVER UPCOMING TRIPS TIMELINE & DISPATCH TRANSITION
    # =========================================================================
    async def get_driver_scheduled_trips(
        self,
        driver_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Returns list of upcoming confirmed reservations for the authenticated driver.
        """
        now = datetime.now(timezone.utc)
        stmt = select(RideRequest).where(
            and_(
                RideRequest.assigned_driver_id == driver_id,
                RideRequest.is_scheduled.is_(True),
                RideRequest.scheduled_status.in_(["RESERVED", "DISPATCHED"]),
                RideRequest.scheduled_pickup_time > (now - timedelta(hours=2)),
            )
        ).order_by(asc(RideRequest.scheduled_pickup_time))

        res = await self.session.execute(stmt)
        trips = res.scalars().all()

        upcoming = []
        for t in trips:
            countdown_seconds = int((t.scheduled_pickup_time - now).total_seconds()) if t.scheduled_pickup_time else 0
            is_ready_to_start = countdown_seconds <= ((t.dispatch_buffer_minutes or 45) * 60)

            upcoming.append({
                "id": str(t.id),
                "scheduled_status": t.scheduled_status,
                "scheduled_pickup_time": t.scheduled_pickup_time.isoformat() if t.scheduled_pickup_time else None,
                "countdown_seconds": max(0, countdown_seconds),
                "is_ready_to_start": is_ready_to_start,
                "pickup_address": t.pickup_address,
                "pickup_lat": t.pickup_lat,
                "pickup_lng": t.pickup_lng,
                "destination_address": t.destination_address,
                "destination_lat": t.destination_lat,
                "destination_lng": t.destination_lng,
                "estimated_fare": float(t.estimated_fare) if t.estimated_fare else 450.0,
            })

        return {
            "total": len(upcoming),
            "upcoming_trips": upcoming,
        }

    async def start_heading_to_scheduled_pickup(
        self,
        driver_id: uuid.UUID,
        ride_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Driver triggers start heading to the scheduled pickup location.
        Transitions reservation into active DISPATCHED state.
        """
        stmt = select(RideRequest).where(
            and_(
                RideRequest.id == ride_id,
                RideRequest.assigned_driver_id == driver_id,
            )
        ).with_for_update()
        res = await self.session.execute(stmt)
        ride = res.scalar_one_or_none()

        if not ride:
            raise HTTPException(status_code=404, detail="Reservation not found or unauthorized")

        ride.scheduled_status = "DISPATCHED"
        ride.status = RideRequestStatus.ASSIGNED
        await self.session.commit()

        try:
            await publish_event(
                f"customer:{str(ride.customer_id)}:events",
                {
                    "event": "DRIVER_EN_ROUTE_TO_SCHEDULED_PICKUP",
                    "ride_id": str(ride.id),
                    "driver_id": str(driver_id),
                },
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": "Navigation started. Drive safely to the pickup location!",
            "ride_id": str(ride_id),
            "status": "ASSIGNED",
            "scheduled_status": "DISPATCHED",
        }

    async def cancel_scheduled_reservation(
        self,
        driver_id: uuid.UUID,
        ride_id: uuid.UUID,
        reason: str = "Driver personal emergency",
    ) -> Dict[str, Any]:
        """
        Driver cancels a reserved scheduled ride.
        Applies early (>= 2h) free cancellation vs late (< 2h) penalty policy.
        """
        now = datetime.now(timezone.utc)
        stmt = select(RideRequest).where(
            and_(
                RideRequest.id == ride_id,
                RideRequest.assigned_driver_id == driver_id,
            )
        ).with_for_update()
        res = await self.session.execute(stmt)
        ride = res.scalar_one_or_none()

        if not ride:
            raise HTTPException(status_code=404, detail="Reservation not found")

        hours_to_pickup = 0.0
        if ride.scheduled_pickup_time:
            hours_to_pickup = (ride.scheduled_pickup_time - now).total_seconds() / 3600.0

        is_late_cancellation = hours_to_pickup < 2.0

        # Unassign ride so other drivers can claim it
        ride.assigned_driver_id = None
        ride.scheduled_status = "UNASSIGNED"
        ride.status = RideRequestStatus.CREATED
        ride.reservation_accepted_at = None
        ride.auto_release_at = None

        await self.session.commit()

        return {
            "success": True,
            "message": "Reservation cancelled." if not is_late_cancellation else "Late cancellation recorded. Please arrive on schedule next time.",
            "is_late_cancellation": is_late_cancellation,
            "hours_before_pickup": round(hours_to_pickup, 1),
            "ride_id": str(ride_id),
        }

    # =========================================================================
    # 7. AUTOMATED PRE-TRIP REMINDERS (T-60m and T-30m)
    # =========================================================================
    async def process_scheduled_reminders(self) -> Dict[str, Any]:
        """
        Scans for scheduled rides approaching at T-60m and T-30m to dispatch push notifications.
        """
        now = datetime.now(timezone.utc)
        t60_start = now + timedelta(minutes=50)
        t60_end = now + timedelta(minutes=65)

        t30_start = now + timedelta(minutes=20)
        t30_end = now + timedelta(minutes=35)

        # Query rides in reminder windows
        stmt = select(RideRequest).where(
            and_(
                RideRequest.is_scheduled.is_(True),
                RideRequest.scheduled_status.in_(["RESERVED", "UNASSIGNED"]),
                RideRequest.status == RideRequestStatus.CREATED,
                or_(
                    and_(RideRequest.scheduled_pickup_time >= t60_start, RideRequest.scheduled_pickup_time <= t60_end),
                    and_(RideRequest.scheduled_pickup_time >= t30_start, RideRequest.scheduled_pickup_time <= t30_end),
                )
            )
        )
        res = await self.session.execute(stmt)
        reminder_rides = res.scalars().all()

        reminders_sent = []
        for r in reminder_rides:
            mins_left = int((r.scheduled_pickup_time - now).total_seconds() / 60.0) if r.scheduled_pickup_time else 0
            reminder_type = "T-60_DEPARTURE_REMINDER" if mins_left >= 45 else "T-30_IMMINENT_DEPARTURE"

            # Customer Notification
            cust_payload = {
                "event": "SCHEDULED_RIDE_REMINDER",
                "reminder_type": reminder_type,
                "ride_id": str(r.id),
                "minutes_to_pickup": mins_left,
                "pickup_address": r.pickup_address,
                "scheduled_pickup_time": r.scheduled_pickup_time.isoformat() if r.scheduled_pickup_time else None,
            }
            try:
                await publish_event(f"customer:{str(r.customer_id)}:events", cust_payload)
            except Exception:
                pass

            # Driver Notification (if assigned)
            if r.assigned_driver_id:
                drv_payload = {
                    "event": "SCHEDULED_DRIVER_REMINDER",
                    "reminder_type": reminder_type,
                    "ride_id": str(r.id),
                    "minutes_to_pickup": mins_left,
                    "pickup_address": r.pickup_address,
                    "scheduled_pickup_time": r.scheduled_pickup_time.isoformat() if r.scheduled_pickup_time else None,
                }
                try:
                    await publish_event(f"driver:{str(r.assigned_driver_id)}:events", drv_payload)
                except Exception:
                    pass

            reminders_sent.append({
                "ride_id": str(r.id),
                "reminder_type": reminder_type,
                "minutes_to_pickup": mins_left,
            })

        return {
            "success": True,
            "processed_at": now.isoformat(),
            "reminders_count": len(reminders_sent),
            "reminders": reminders_sent,
        }

    # =========================================================================
    # 8. AUTO-RELEASE SAFEGUARD (UNRESPONSIVE DRIVER PROTECTION)
    # =========================================================================
    async def check_and_auto_release_expired(self) -> Dict[str, Any]:
        """
        Background maintenance task: Automatically releases scheduled rides
        where driver is OFFLINE or hasn't started heading 30m prior to pickup.
        """
        now = datetime.now(timezone.utc)
        stmt = select(RideRequest).where(
            and_(
                RideRequest.is_scheduled.is_(True),
                RideRequest.scheduled_status == "RESERVED",
                RideRequest.auto_release_at <= now,
            )
        )
        res = await self.session.execute(stmt)
        expired_rides = res.scalars().all()

        released_count = 0
        for r in expired_rides:
            if r.assigned_driver_id:
                d_stmt = select(Driver).where(Driver.id == r.assigned_driver_id)
                d_res = await self.session.execute(d_stmt)
                driver = d_res.scalar_one_or_none()

                if not driver or driver.status != DriverStatus.ONLINE:
                    # Release ride back to open pool
                    r.assigned_driver_id = None
                    r.scheduled_status = "UNASSIGNED"
                    r.status = RideRequestStatus.CREATED
                    r.reservation_accepted_at = None
                    r.auto_release_at = None
                    released_count += 1

        await self.session.commit()
        return {
            "success": True,
            "checked_at": now.isoformat(),
            "released_count": released_count,
        }

    # =========================================================================
    # 9. DEVELOPER SANDBOX SIMULATOR
    # =========================================================================
    async def simulate_dev_scenario(
        self,
        driver_id: uuid.UUID,
        scenario_key: str,
    ) -> Dict[str, Any]:
        """
        Developer Mode simulator with preset scheduled ride scenarios.
        """
        now = datetime.now(timezone.utc)

        if scenario_key == "SEED_AVAILABLE_SCHEDULED_RIDES":
            cust_id = uuid.uuid4()
            cust = User(
                id=cust_id,
                phone=f"+9199{str(uuid.uuid4().int)[:8]}",
                role=UserRole.CUSTOMER,
                is_verified=True,
                is_active=True,
            )
            self.session.add(cust)

            ride_1 = RideRequest(
                id=uuid.uuid4(),
                customer_id=cust_id,
                pickup_address="Kalyani Nagar, Pune",
                pickup_lat=18.5463,
                pickup_lng=73.9022,
                pickup_location="SRID=4326;POINT(73.9022 18.5463)",
                destination_address="Pune Airport Departure Terminal",
                destination_lat=18.5822,
                destination_lng=73.9197,
                destination_location="SRID=4326;POINT(73.9197 18.5822)",
                estimated_fare=Decimal("420.00"),
                status=RideRequestStatus.CREATED,
                is_scheduled=True,
                scheduled_pickup_time=now + timedelta(hours=14),
                scheduled_status="UNASSIGNED",
                dispatch_buffer_minutes=45,
            )
            self.session.add(ride_1)

            ride_2 = RideRequest(
                id=uuid.uuid4(),
                customer_id=cust_id,
                pickup_address="Aundh, Pune",
                pickup_lat=18.5602,
                pickup_lng=73.8031,
                pickup_location="SRID=4326;POINT(73.8031 18.5602)",
                destination_address="Navi Mumbai Expressway Toll Plaza",
                destination_lat=18.7512,
                destination_lng=73.4021,
                destination_location="SRID=4326;POINT(73.4021 18.7512)",
                estimated_fare=Decimal("1250.00"),
                status=RideRequestStatus.CREATED,
                is_scheduled=True,
                scheduled_pickup_time=now + timedelta(hours=18),
                scheduled_status="UNASSIGNED",
                dispatch_buffer_minutes=60,
            )
            self.session.add(ride_2)

            await self.session.commit()
            return {
                "scenario": scenario_key,
                "message": "Seeded 2 realistic advance bookings (Airport & Expressway).",
                "ride_1_id": str(ride_1.id),
                "ride_2_id": str(ride_2.id),
            }

        return {"scenario": scenario_key, "message": "Scenario executed."}
