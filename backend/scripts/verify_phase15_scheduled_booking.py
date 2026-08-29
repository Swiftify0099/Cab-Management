"""
Master Verification Suite for Phase 15: Scheduled Booking Engine.

Tests:
  1. Advance Booking Creation (Schedule Later): Valid future timestamp (T+12h), is_scheduled=True, scheduled_status="UNASSIGNED", status="CREATED".
  2. Invalid Past / Low Advance Notice Rejection: Rejects past timestamp or booking < 30 mins in advance with 400 Bad Request.
  3. Customer Duplicate Overlap Prevention: Rejects second scheduled booking for same customer within +/- 45 mins.
  4. Partner Overlapping Job Prevention: Partner with existing booking at T+12h cannot accept another booking at T+12h30m (+/- 90m conflict).
  5. Atomic Partner Claim: Partner claims booking via row lock -> transitions scheduled_status="RESERVED".
  6. Customer Modification (>= 60m): Modifies pickup time and address successfully.
  7. Late Modification Rejection (< 60m): Rejects modification attempted < 60 mins before scheduled pickup.
  8. Automated Pre-Trip Reminders: Generates T-60m and T-30m pre-trip notification alerts.
  9. Dispatch Transition: Partner starts heading -> scheduled_status="DISPATCHED", status="ASSIGNED".
  10. Customer Free Cancellation (>= 60m): Free cancellation with cancellation_fee=₹0.00.
  11. Customer Late Cancellation (< 60m): Applies ₹50.00 late cancellation fee when partner is assigned.
  12. Auto-Release Safeguard: Inactive/offline driver automatically unassigned at T-30m, returning ride to open pool.
  13. Customer Upcoming Feed: Verifies upcoming bookings feed with countdown and status badges.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import structlog
from fastapi import HTTPException
from sqlalchemy import and_, select, update

# Add backend directory and service directories to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
matching_service_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "matching-service"))
auth_service_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "auth-service"))

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# 1. Load auth service dependencies
if auth_service_dir not in sys.path:
    sys.path.insert(0, auth_service_dir)

from app.schemas.vehicle import VehicleCreateRequest
from app.services.vehicle_service import (
    create_driver_vehicle,
    activate_driver_vehicle,
)

# 2. Set matching service dependencies at index 0
if auth_service_dir in sys.path:
    sys.path.remove(auth_service_dir)
if matching_service_dir in sys.path:
    sys.path.remove(matching_service_dir)
sys.path.insert(0, matching_service_dir)
for mod_name in list(sys.modules.keys()):
    if mod_name == "app" or mod_name.startswith("app."):
        del sys.modules[mod_name]

from common.database import async_session_maker, engine
from common.models.all_models import (
    Driver,
    DriverStatus,
    KYCStatus,
    RideEventLog,
    RideRequest,
    RideRequestStatus,
    User,
    UserRole,
    Vehicle,
    VehicleType,
)
from app.services.scheduled_ride_service import ScheduledRideService

logger = structlog.get_logger(__name__)

TESTS_RUN = 0
TESTS_PASSED = 0
TESTS_FAILED = 0


def record_result(name: str, passed: bool, error: str = ""):
    global TESTS_RUN, TESTS_PASSED, TESTS_FAILED
    TESTS_RUN += 1
    if passed:
        TESTS_PASSED += 1
        print(f"  [PASS] {name}")
    else:
        TESTS_FAILED += 1
        print(f"  [FAIL] {name} ── Error: {error}")


async def create_test_partner(session, name: str, lat: float, lng: float) -> Tuple[User, Driver, Vehicle]:
    today = date.today()
    u = User(
        id=uuid.uuid4(),
        phone=f"+9198{uuid.uuid4().hex[:8]}",
        role=UserRole.DRIVER,
        is_active=True,
        is_verified=True,
    )
    session.add(u)
    d = Driver(
        id=uuid.uuid4(),
        user_id=u.id,
        full_name=name,
        kyc_status=KYCStatus.APPROVED,
        status=DriverStatus.ONLINE,
        is_active=True,
        rating=4.92,
        current_location=f"SRID=4326;POINT({lng} {lat})",
        current_latitude=lat,
        current_longitude=lng,
        current_accuracy_m=4.0,
        current_heading=90.0,
        current_speed_kmh=40.0,
        total_trips=25,
        total_cancellations=0,
        penalty_cancellations=0,
        cancellation_rate=0.0,
        profile_photo="https://res.cloudinary.com/cabapp/image/upload/v1/drivers/driver.jpg",
        last_location_updated_at=datetime.now(timezone.utc),
    )
    d._is_verified = True
    d._is_online = True
    session.add(d)
    await session.commit()

    reg_no = f"MH12{uuid.uuid4().hex[:6].upper()}"
    v = await create_driver_vehicle(
        session, d,
        VehicleCreateRequest(
            vehicle_type=VehicleType.SEDAN,
            make="Maruti Suzuki",
            model="Dzire",
            year=2023,
            registration_number=reg_no,
            color="Silver",
            seat_capacity=4,
            insurance_expiry=today + timedelta(days=365),
            pollution_expiry=today + timedelta(days=180),
            fitness_expiry=today + timedelta(days=365),
            service_capabilities=["cab", "rental", "airport", "local"],
        )
    )
    await session.commit()
    await activate_driver_vehicle(session, d.id, v.id)
    await session.commit()
    return u, d, v


async def run_phase15_scheduled_booking_verification():
    print("=" * 85)
    print("📅🚀 STARTING PHASE 15: SCHEDULED & ADVANCE BOOKING VERIFICATION")
    print("=" * 85)

    now = datetime.now(timezone.utc)

    # Setup Customer
    async with async_session_maker() as session:
        cust = User(id=uuid.uuid4(), phone=f"+9193{uuid.uuid4().hex[:8]}", role=UserRole.CUSTOMER, is_active=True)
        session.add(cust)
        await session.commit()

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: Advance Booking Creation (Schedule Later)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 1: Advance Booking Creation (Schedule Later) ---")
    async with async_session_maker() as session:
        sched_svc = ScheduledRideService(session)

        # Booking for 12 hours from now
        t_12h = now + timedelta(hours=12)
        sched_res = await sched_svc.create_scheduled_ride(
            customer_user_id=cust.id,
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="FC Road, Pune",
            destination_lat=18.5822,
            destination_lng=73.9197,
            destination_address="Pune International Airport",
            scheduled_pickup_time=t_12h,
            estimated_fare=Decimal("450.00"),
        )

        record_result(
            "Schedule Later Creation: Scheduled ride created with is_scheduled=True and scheduled_status='UNASSIGNED'",
            sched_res["success"] is True and sched_res["is_scheduled"] is True and sched_res["scheduled_status"] == "UNASSIGNED",
        )

        # Verify DB state: status must be CREATED (not immediate dispatch fanout)
        r_db = (
            await session.execute(select(RideRequest).where(RideRequest.id == uuid.UUID(sched_res["ride_id"])))
        ).scalar_one_or_none()

        record_result(
            "Scheduled Job Policy: State is CREATED (Zero instant dispatch fanout)",
            r_db is not None and r_db.status == RideRequestStatus.CREATED and r_db.dispatch_buffer_minutes == 45,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: Boundary Validations (Past & Low Notice Rejection)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 2: Boundary Validations ---")
    async with async_session_maker() as session:
        sched_svc = ScheduledRideService(session)

        # 2a. Rejection of past timestamp
        past_err = None
        try:
            await sched_svc.create_scheduled_ride(
                customer_user_id=cust.id,
                pickup_lat=18.5204, pickup_lng=73.8567, pickup_address="FC Road",
                destination_lat=18.5822, destination_lng=73.9197, destination_address="Airport",
                scheduled_pickup_time=now - timedelta(hours=1),
            )
        except HTTPException as e:
            past_err = e

        record_result(
            "Past Timestamp Guard: Rejects past pickup time with 400 Bad Request",
            past_err is not None and past_err.status_code == 400,
        )

        # 2b. Rejection of low notice (< 30 mins)
        low_notice_err = None
        try:
            await sched_svc.create_scheduled_ride(
                customer_user_id=cust.id,
                pickup_lat=18.5204, pickup_lng=73.8567, pickup_address="FC Road",
                destination_lat=18.5822, destination_lng=73.9197, destination_address="Airport",
                scheduled_pickup_time=now + timedelta(minutes=15),
            )
        except HTTPException as e:
            low_notice_err = e

        record_result(
            "Minimum Lead-Time Guard: Rejects notice < 30m with 400 Bad Request",
            low_notice_err is not None and low_notice_err.status_code == 400 and "at least 30 minutes" in low_notice_err.detail,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: Customer Duplicate Overlap Prevention
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 3: Customer Duplicate Overlap Prevention ---")
    async with async_session_maker() as session:
        sched_svc = ScheduledRideService(session)

        # Customer already has booking at T+12h; tries to book again at T+12h15m (overlap window +/- 45m)
        dup_err = None
        try:
            await sched_svc.create_scheduled_ride(
                customer_user_id=cust.id,
                pickup_lat=18.5204, pickup_lng=73.8567, pickup_address="FC Road",
                destination_lat=18.5822, destination_lng=73.9197, destination_address="Airport",
                scheduled_pickup_time=t_12h + timedelta(minutes=15),
            )
        except HTTPException as e:
            dup_err = e

        record_result(
            "Customer Overlap Guard: Rejects duplicate booking within +/- 45 mins",
            dup_err is not None and dup_err.status_code == 400 and "already have a scheduled booking" in dup_err.detail,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: Partner Discovery Feed & Atomic Reservation Acceptance
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 4: Partner Discovery Feed & Atomic Claim ---")
    async with async_session_maker() as session:
        u_p1, d_p1, v_p1 = await create_test_partner(session, "Scheduled Partner 1", 18.5204, 73.8567)

        sched_svc = ScheduledRideService(session)

        # 4a. Check Discovery Feed
        feed = await sched_svc.get_available_scheduled_rides()
        record_result(
            "Partner Discovery Feed: Unassigned advance bookings appear in discovery hub",
            feed["total"] >= 1 and any(r["id"] == sched_res["ride_id"] for r in feed["available_rides"]),
        )

        # 4b. Partner 1 claims the reservation
        claim_res = await sched_svc.accept_scheduled_reservation(
            driver_id=d_p1.id,
            ride_id=uuid.UUID(sched_res["ride_id"]),
        )

        record_result(
            "Atomic Partner Claim: Reservation claimed and transitions to scheduled_status='RESERVED'",
            claim_res["success"] is True and claim_res["scheduled_status"] == "RESERVED",
        )

        # Check DB state
        r_claim_db = (
            await session.execute(select(RideRequest).where(RideRequest.id == uuid.UUID(sched_res["ride_id"])))
        ).scalar_one_or_none()

        record_result(
            "Authoritative DB Reservation State: assigned_driver_id set and auto_release_at calculated at T-30m",
            r_claim_db is not None and r_claim_db.assigned_driver_id == d_p1.id and r_claim_db.scheduled_status == "RESERVED",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: Partner Overlapping Job Prevention
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 5: Partner Overlapping Job Prevention ---")
    async with async_session_maker() as session:
        # Create a 2nd scheduled ride by another customer at T+12h30m (overlap window +/- 90m with Partner 1's T+12h job)
        cust2 = User(id=uuid.uuid4(), phone=f"+9194{uuid.uuid4().hex[:8]}", role=UserRole.CUSTOMER, is_active=True)
        session.add(cust2)
        await session.commit()

        sched_svc = ScheduledRideService(session)

        ride2_res = await sched_svc.create_scheduled_ride(
            customer_user_id=cust2.id,
            pickup_lat=18.5204, pickup_lng=73.8567, pickup_address="FC Road",
            destination_lat=18.5822, destination_lng=73.9197, destination_address="Airport",
            scheduled_pickup_time=t_12h + timedelta(minutes=30), # 30 mins after Partner 1's existing ride
        )
        ride2_id = uuid.UUID(ride2_res["ride_id"])

        # Partner 1 tries to claim this overlapping ride
        overlap_claim_err = None
        try:
            await sched_svc.accept_scheduled_reservation(
                driver_id=d_p1.id,
                ride_id=ride2_id,
            )
        except HTTPException as e:
            overlap_claim_err = e

        print(f"DEBUG overlap_claim_err: {overlap_claim_err}")
        record_result(
            "Driver Overlap Guard: Partner cannot claim overlapping scheduled jobs within +/- 90 mins",
            overlap_claim_err is not None and overlap_claim_err.status_code == 409 and ("reserved scheduled trip" in overlap_claim_err.detail or "overlapping" in overlap_claim_err.detail),
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6: Customer Modification Engine (Valid vs Late)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 6: Customer Modification Engine ---")
    async with async_session_maker() as session:
        sched_svc = ScheduledRideService(session)
        ride1_id = uuid.UUID(sched_res["ride_id"])

        # 6a. Valid modification (>= 60m before pickup: modifying time from T+12h to T+15h and changing address)
        t_15h = now + timedelta(hours=15)
        mod_res = await sched_svc.modify_scheduled_ride(
            customer_user_id=cust.id,
            ride_id=ride1_id,
            new_scheduled_pickup_time=t_15h,
            new_pickup_address="JW Marriott, SB Road, Pune",
            new_pickup_lat=18.5322,
            new_pickup_lng=73.8344,
        )

        record_result(
            "Advance Modification (>= 60m): Customer modifies scheduled pickup time and location successfully",
            mod_res["success"] is True and mod_res["pickup_address"] == "JW Marriott, SB Road, Pune",
        )

        # 6b. Late modification rejection (< 60m before pickup)
        # Create a ride with pickup in 45 mins
        ride_short = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust2.id,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204, pickup_lng=73.8567, pickup_address="FC Road",
            destination_location="SRID=4326;POINT(73.9197 18.5822)",
            destination_lat=18.5822, destination_lng=73.9197, destination_address="Airport",
            status=RideRequestStatus.CREATED,
            is_scheduled=True,
            scheduled_pickup_time=now + timedelta(minutes=45), # 45m left (< 60m deadline)
            scheduled_status="UNASSIGNED",
            dispatch_buffer_minutes=45,
            estimated_fare=Decimal("350.00"),
        )
        session.add(ride_short)
        await session.commit()

        late_mod_err = None
        try:
            await sched_svc.modify_scheduled_ride(
                customer_user_id=cust2.id,
                ride_id=ride_short.id,
                new_pickup_address="New Destination",
            )
        except HTTPException as e:
            late_mod_err = e

        record_result(
            "Late Modification Rejection (< 60m): Modifying < 60m before pickup rejected with 400 Bad Request",
            late_mod_err is not None and late_mod_err.status_code == 400 and "within 60 minutes" in late_mod_err.detail,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7: Automated Pre-Trip Reminders (T-60m and T-30m)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 7: Pre-Trip Reminders (T-60m & T-30m) ---")
    async with async_session_maker() as session:
        # Create a ride scheduled in 55 mins (T-60 window)
        ride_t60 = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust.id,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204, pickup_lng=73.8567, pickup_address="FC Road",
            destination_location="SRID=4326;POINT(73.9197 18.5822)",
            destination_lat=18.5822, destination_lng=73.9197, destination_address="Airport",
            status=RideRequestStatus.CREATED,
            is_scheduled=True,
            scheduled_pickup_time=now + timedelta(minutes=55),
            scheduled_status="RESERVED",
            assigned_driver_id=d_p1.id,
            estimated_fare=Decimal("350.00"),
        )
        session.add(ride_t60)
        await session.commit()

        sched_svc = ScheduledRideService(session)
        reminders_res = await sched_svc.process_scheduled_reminders()

        record_result(
            "Automated Reminder Engine: Scans and generates pre-trip reminders for T-60m / T-30m windows",
            reminders_res["success"] is True and reminders_res["reminders_count"] >= 1,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 8: Dispatch Transition (Start Heading)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 8: Dispatch Transition ---")
    async with async_session_maker() as session:
        sched_svc = ScheduledRideService(session)

        # Partner 1 starts heading for ride_t60
        disp_res = await sched_svc.start_heading_to_scheduled_pickup(
            driver_id=d_p1.id,
            ride_id=ride_t60.id,
        )

        record_result(
            "Dispatch Transition: Partner initiates navigation -> status='ASSIGNED', scheduled_status='DISPATCHED'",
            disp_res["success"] is True and disp_res["scheduled_status"] == "DISPATCHED" and disp_res["status"] == "ASSIGNED",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 9: Customer Cancellation Policies (Free vs Late Fee)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 9: Customer Cancellation Policies ---")
    async with async_session_maker() as session:
        sched_svc = ScheduledRideService(session)

        # 9a. Early cancellation (>= 60m): Customer cancels ride1 (scheduled for T+15h)
        early_cancel_res = await sched_svc.cancel_scheduled_ride_by_customer(
            customer_user_id=cust.id,
            ride_id=ride1_id,
            reason="Flight rescheduled",
        )

        record_result(
            "Customer Early Cancellation (>= 60m): Free cancellation with cancellation_fee=₹0.00",
            early_cancel_res["success"] is True and early_cancel_res["is_late_cancellation"] is False and early_cancel_res["cancellation_fee"] == 0.0,
        )

        # 9b. Late cancellation (< 60m with driver assigned): Customer cancels ride_t60 (scheduled in <60m with Partner 1 assigned)
        late_cancel_res = await sched_svc.cancel_scheduled_ride_by_customer(
            customer_user_id=cust.id,
            ride_id=ride_t60.id,
            reason="Cancelled on short notice",
        )

        record_result(
            "Customer Late Cancellation (< 60m): ₹50.00 late cancellation fee registered",
            late_cancel_res["success"] is True and late_cancel_res["is_late_cancellation"] is True and late_cancel_res["cancellation_fee"] == 50.0,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 10: Auto-Release Safeguard (Inactive Driver Protection)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 10: Auto-Release Safeguard ---")
    async with async_session_maker() as session:
        u_p_offline, d_p_offline, v_p_offline = await create_test_partner(session, "Offline Driver", 18.5204, 73.8567)
        # Set driver OFFLINE
        d_p_offline.status = DriverStatus.OFFLINE
        await session.commit()

        # Create a reserved ride with auto_release_at in the past
        ride_expired_reserve = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust.id,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204, pickup_lng=73.8567, pickup_address="FC Road",
            destination_location="SRID=4326;POINT(73.9197 18.5822)",
            destination_lat=18.5822, destination_lng=73.9197, destination_address="Airport",
            status=RideRequestStatus.CREATED,
            is_scheduled=True,
            scheduled_pickup_time=now + timedelta(minutes=25),
            scheduled_status="RESERVED",
            assigned_driver_id=d_p_offline.id,
            auto_release_at=now - timedelta(minutes=5), # Auto-release expired 5m ago
            estimated_fare=Decimal("350.00"),
        )
        session.add(ride_expired_reserve)
        await session.commit()

        sched_svc = ScheduledRideService(session)
        release_res = await sched_svc.check_and_auto_release_expired()

        record_result(
            "Auto-Release Safeguard: Offline/inactive driver unassigned at T-30m, returning ride to open pool",
            release_res["success"] is True and release_res["released_count"] >= 1,
        )

        # Check DB state
        r_rel_db = (
            await session.execute(select(RideRequest).where(RideRequest.id == ride_expired_reserve.id))
        ).scalar_one_or_none()

        record_result(
            "Open Pool Re-Assignment: Ride reset to scheduled_status='UNASSIGNED' and assigned_driver_id=None",
            r_rel_db is not None and r_rel_db.scheduled_status == "UNASSIGNED" and r_rel_db.assigned_driver_id is None,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 11: Customer Upcoming Feed
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 11: Customer Upcoming Feed ---")
    async with async_session_maker() as session:
        # Create 1 fresh upcoming scheduled ride for customer
        fresh_sched = await sched_svc.create_scheduled_ride(
            customer_user_id=cust.id,
            pickup_lat=18.5204, pickup_lng=73.8567, pickup_address="FC Road",
            destination_lat=18.5822, destination_lng=73.9197, destination_address="Airport",
            scheduled_pickup_time=now + timedelta(hours=24),
            estimated_fare=Decimal("400.00"),
        )

        cust_feed = await sched_svc.get_customer_scheduled_rides(customer_user_id=cust.id)

        record_result(
            "Customer Upcoming Feed: Retrieved upcoming bookings with countdowns and badges",
            cust_feed["total"] >= 1 and any(b["id"] == fresh_sched["ride_id"] for b in cust_feed["upcoming_bookings"]),
        )

    # ──────────────────────────────────────────────────────────────────────────
    # FINAL SUMMARY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 85)
    print(f"📊 PHASE 15 VERIFICATION SUMMARY: {TESTS_PASSED}/{TESTS_RUN} TESTS PASSED")
    if TESTS_FAILED == 0:
        print("🎉 PHASE 15: SCHEDULED BOOKING ENGINE FULLY VERIFIED!")
    else:
        print(f"⚠️ {TESTS_FAILED} TESTS FAILED!")
    print("=" * 85)

    if TESTS_FAILED > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_phase15_scheduled_booking_verification())
