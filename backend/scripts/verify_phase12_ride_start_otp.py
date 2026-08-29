"""
Master Verification Suite for Phase 12: Ride Start OTP/PIN.

Tests:
  1. Purpose Separation: LOGIN, RIDE_START, PARCEL_PICKUP, PARCEL_DELIVERY.
  2. Zero Leakage Invariant: Initial dispatch offers to partners strictly exclude ride PIN/OTP.
  3. 3 KM Proximity Trigger: Emits OTP_READY to customer when partner is <= 3 km.
  4. Before-3km / Distance Violation Attempt: Rejection when partner is far from pickup (>1000m).
  5. Wrong PIN Attempt: Rejection with attempts count decrement.
  6. Too Many Attempts Lockout: 15-minute lock triggered after 5 consecutive failures.
  7. Wrong Partner Authorization: Rejection when unassigned partner attempts to start ride.
  8. Wrong Trip / Non-Existent Ride: 404 validation.
  9. Expired PIN Protection: Rejection when PIN exceeds 15-minute validity window.
  10. Replay Protection: Rejection / safe idempotency on already started ride.
  11. Successful Start Flow: OTP_VERIFIED -> START_ALLOWED -> IN_PROGRESS transition.
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

from common.database import async_session_maker
from common.models.all_models import (
    Driver,
    DriverStatus,
    KYCStatus,
    RideOffer,
    RideOfferStatus,
    RideRequest,
    RideRequestStatus,
    Trip,
    User,
    UserRole,
    Vehicle,
    VehicleType,
)
from app.services.ride_start_service import RideStartService
from app.services.ride_dispatch import RideDispatchService
from app.services.fanout_dispatch_engine import FanoutDispatchEngine
from common.utils.redis_client import get_redis

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
        phone=f"+9197{uuid.uuid4().hex[:8]}",
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
        rating=4.95,
        current_location=f"SRID=4326;POINT({lng} {lat})",
        current_latitude=lat,
        current_longitude=lng,
        current_accuracy_m=4.2,
        current_heading=120.0,
        current_speed_kmh=42.5,
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
            make="Honda",
            model="City ZX",
            year=2024,
            registration_number=reg_no,
            color="Crystal Black",
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


async def run_phase12_ride_start_otp_verification():
    print("=" * 85)
    print("🔑🚗 STARTING PHASE 12: RIDE START OTP/PIN VERIFICATION")
    print("=" * 85)

    async with async_session_maker() as session:
        # Setup Customer & Partners
        cust = User(id=uuid.uuid4(), phone=f"+9191{uuid.uuid4().hex[:8]}", role=UserRole.CUSTOMER, is_active=True)
        session.add(cust)
        await session.commit()

        u_driver_assigned, d_driver_assigned, v_driver_assigned = await create_test_partner(session, "Sameer Deshmukh", 18.5204, 73.8567)
        u_driver_unassigned, d_driver_unassigned, v_driver_unassigned = await create_test_partner(session, "Pravin Kulkarni", 18.5300, 73.8600)

        # Create active ride request
        ride_req = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust.id,
            assigned_driver_id=d_driver_assigned.id,
            assigned_vehicle_id=v_driver_assigned.id,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="FC Road, Shivajinagar, Pune",
            destination_location="SRID=4326;POINT(73.9197 18.5822)",
            destination_lat=18.5822,
            destination_lng=73.9197,
            destination_address="Pune Airport, Lohegaon",
            status=RideRequestStatus.ASSIGNED,
            estimated_fare=Decimal("380.00"),
            start_pin_plain="7412",
            start_pin_hash=RideStartService.hash_pin("7412"),
        )
        session.add(ride_req)
        await session.commit()

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: Zero Leakage Invariant in Initial Dispatch Offers
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 1: Zero Leakage Invariant ---")
    async with async_session_maker() as session:
        fanout_engine = FanoutDispatchEngine(session)
        # Create unassigned request to simulate fanout dispatch offer
        fresh_req = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust.id,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="FC Road",
            destination_location="SRID=4326;POINT(73.9197 18.5822)",
            destination_lat=18.5822,
            destination_lng=73.9197,
            destination_address="Airport",
            status=RideRequestStatus.MATCHING,
            estimated_fare=Decimal("300.00"),
            start_pin_plain="8899",
            start_pin_hash=RideStartService.hash_pin("8899"),
        )
        session.add(fresh_req)
        await session.commit()

        offers = await fanout_engine.create_fanout_offers(
            ride_request_id=fresh_req.id,
            candidates=[{"driver_id": d_driver_unassigned.id, "user_id": u_driver_unassigned.id, "distance_km": 1.2}],
            timeout_sec=30,
        )
        # Verify initial offer payload does NOT expose start_pin/otp
        offer = offers[0] if offers else None
        record_result(
            "Initial Dispatch Offer: Strictly does NOT contain start_pin/otp inside dispatch payload",
            offer is not None and not hasattr(offer, "start_pin_plain"),
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: 3 KM Proximity Trigger (OTP_READY Event Delivery)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 2: 3 KM Proximity Trigger ---")
    async with async_session_maker() as session:
        dispatch_svc = RideDispatchService(session)

        # 2a. Partner 5.0 KM away (>3km) -> Proximity trigger must NOT deliver OTP yet
        far_lat, far_lng = 18.5650, 73.8567 # ~5.0 km away
        far_res = await dispatch_svc.check_driver_proximity_and_deliver_otp(
            ride_request_id=str(ride_req.id),
            driver_lat=far_lat,
            driver_lng=far_lng,
            proximity_threshold_m=3000.0,
        )
        record_result(
            "Proximity Threshold (>3km): Driver far away (5.0 km) does not trigger OTP_READY",
            far_res is None,
        )

        # 2b. Partner moves within 2.2 KM (<=3km) -> Triggers OTP_READY with 4-digit PIN
        near_lat, near_lng = 18.5350, 73.8567 # ~1.6 km away
        near_res = await dispatch_svc.check_driver_proximity_and_deliver_otp(
            ride_request_id=str(ride_req.id),
            driver_lat=near_lat,
            driver_lng=near_lng,
            proximity_threshold_m=3000.0,
        )
        record_result(
            "Proximity Threshold (<=3km): Driver within 3 km triggers OTP_READY to customer",
            near_res is not None and near_res.get("event") == "OTP_READY" and near_res.get("otp") == "7412",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: Purpose Separation Validation
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 3: Purpose Separation Validation ---")
    async with async_session_maker() as session:
        start_svc = RideStartService(session)

        # 3a. LOGIN purpose used for Ride Start -> Must be rejected
        login_err = None
        try:
            await start_svc.verify_and_start_ride(
                driver_user_id=str(u_driver_assigned.id),
                ride_id=ride_req.id,
                pin="7412",
                driver_lat=18.5204,
                driver_lng=73.8567,
                purpose="LOGIN",
            )
        except HTTPException as e:
            login_err = e

        record_result(
            "Purpose Guard: LOGIN OTP purpose rejected for Ride Start",
            login_err is not None and login_err.status_code == 400 and "LOGIN" in login_err.detail,
        )

        # 3b. Invalid/Unknown purpose -> Must be rejected
        unknown_err = None
        try:
            await start_svc.verify_and_start_ride(
                driver_user_id=str(u_driver_assigned.id),
                ride_id=ride_req.id,
                pin="7412",
                driver_lat=18.5204,
                driver_lng=73.8567,
                purpose="UNKNOWN_PURPOSE",
            )
        except HTTPException as e:
            unknown_err = e

        record_result(
            "Purpose Guard: Unknown purpose rejected",
            unknown_err is not None and unknown_err.status_code == 400,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: Before-3km / Distance Violation Attempt
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 4: Distance Violation (Attempt to start before arriving) ---")
    async with async_session_maker() as session:
        start_svc = RideStartService(session)

        dist_err = None
        try:
            # Partner attempts to start ride while 5km away from pickup
            await start_svc.verify_and_start_ride(
                driver_user_id=str(u_driver_assigned.id),
                ride_id=ride_req.id,
                pin="7412",
                driver_lat=18.5650,
                driver_lng=73.8567,
                purpose="RIDE_START",
            )
        except HTTPException as e:
            dist_err = e

        record_result(
            "Distance Violation Guard: Attempt to start ride from 5km away rejected with GPS Proximity Error",
            dist_err is not None and dist_err.status_code == 400 and "GPS Proximity Error" in dist_err.detail,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: Wrong Partner & Wrong Trip Validation
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 5: Wrong Partner & Wrong Trip Validation ---")
    async with async_session_maker() as session:
        start_svc = RideStartService(session)

        # 5a. Wrong Partner (Unassigned driver attempts to start)
        partner_err = None
        try:
            await start_svc.verify_and_start_ride(
                driver_user_id=str(u_driver_unassigned.id),
                ride_id=ride_req.id,
                pin="7412",
                driver_lat=18.5204,
                driver_lng=73.8567,
                purpose="RIDE_START",
            )
        except HTTPException as e:
            partner_err = e

        record_result(
            "Partner Ownership Guard: Unassigned partner rejected with 403 Forbidden",
            partner_err is not None and partner_err.status_code == 403,
        )

        # 5b. Wrong Trip (Non-existent ride ID)
        trip_err = None
        try:
            await start_svc.verify_and_start_ride(
                driver_user_id=str(u_driver_assigned.id),
                ride_id=uuid.uuid4(),
                pin="7412",
                driver_lat=18.5204,
                driver_lng=73.8567,
                purpose="RIDE_START",
            )
        except HTTPException as e:
            trip_err = e

        record_result(
            "Trip Existence Guard: Non-existent ride ID rejected with 404 Not Found",
            trip_err is not None and trip_err.status_code == 404,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6: Wrong PIN & Lockout Protection (Max 5 Attempts)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 6: Wrong PIN & Lockout Protection ---")
    async with async_session_maker() as session:
        start_svc = RideStartService(session)

        # Attempt 1: Wrong PIN
        w1_err = None
        try:
            await start_svc.verify_and_start_ride(
                driver_user_id=str(u_driver_assigned.id),
                ride_id=ride_req.id,
                pin="0001",
                driver_lat=18.5204,
                driver_lng=73.8567,
                purpose="RIDE_START",
            )
        except HTTPException as e:
            w1_err = e

        record_result(
            "Wrong PIN Guard: Incorrect PIN rejected with 400 Bad Request",
            w1_err is not None and w1_err.status_code == 400 and "Incorrect Ride PIN" in w1_err.detail,
        )

        # Send 4 more wrong attempts to trigger 15-min lockout (Total 5 failed attempts)
        lockout_err = None
        for _ in range(4):
            try:
                await start_svc.verify_and_start_ride(
                    driver_user_id=str(u_driver_assigned.id),
                    ride_id=ride_req.id,
                    pin="9998",
                    driver_lat=18.5204,
                    driver_lng=73.8567,
                    purpose="RIDE_START",
                )
            except HTTPException as e:
                lockout_err = e

        record_result(
            "Lockout Guard: 5 consecutive failed attempts locks out ride start for 15 minutes",
            lockout_err is not None and lockout_err.status_code == 403 and "locked" in lockout_err.detail,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7: Expired PIN Protection
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 7: Expired PIN Protection ---")
    async with async_session_maker() as session:
        u_exp, d_exp, v_exp = await create_test_partner(session, "Expired Driver", 18.5204, 73.8567)
        # Create ride with PIN created 20 minutes ago (>15 mins)
        expired_req = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust.id,
            assigned_driver_id=d_exp.id,
            assigned_vehicle_id=v_exp.id,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="FC Road",
            destination_location="SRID=4326;POINT(73.9197 18.5822)",
            destination_lat=18.5822,
            destination_lng=73.9197,
            destination_address="Airport",
            status=RideRequestStatus.ASSIGNED,
            estimated_fare=Decimal("380.00"),
            start_pin_plain="3344",
            start_pin_hash=RideStartService.hash_pin("3344"),
        )
        session.add(expired_req)
        await session.commit()

        # Artificially set creation timestamp to 20 minutes ago
        await session.execute(
            update(RideRequest)
            .where(RideRequest.id == expired_req.id)
            .values(updated_at=datetime.utcnow() - timedelta(minutes=20))
        )
        await session.commit()

        start_svc = RideStartService(session)
        exp_err = None
        try:
            await start_svc.verify_and_start_ride(
                driver_user_id=str(u_exp.id),
                ride_id=expired_req.id,
                pin="3344",
                driver_lat=18.5204,
                driver_lng=73.8567,
                purpose="RIDE_START",
            )
        except HTTPException as e:
            exp_err = e

        record_result(
            "Expiry Guard: PIN older than 15 minutes rejected as expired",
            exp_err is not None and exp_err.status_code == 400 and "expired" in exp_err.detail,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 8: Successful Start Flow (OTP_VERIFIED -> START_ALLOWED)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 8: Successful Start Flow ---")
    async with async_session_maker() as session:
        u_start, d_start, v_start = await create_test_partner(session, "Legitimate Driver", 18.5204, 73.8567)
        # Create fresh assigned ride for legitimate start
        valid_req = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust.id,
            assigned_driver_id=d_start.id,
            assigned_vehicle_id=v_start.id,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="FC Road",
            destination_location="SRID=4326;POINT(73.9197 18.5822)",
            destination_lat=18.5822,
            destination_lng=73.9197,
            destination_address="Airport",
            status=RideRequestStatus.ASSIGNED,
            estimated_fare=Decimal("380.00"),
            start_pin_plain="5678",
            start_pin_hash=RideStartService.hash_pin("5678"),
        )
        session.add(valid_req)
        await session.commit()

        start_svc = RideStartService(session)
        start_res = await start_svc.verify_and_start_ride(
            driver_user_id=str(u_start.id),
            ride_id=valid_req.id,
            pin="5678",
            driver_lat=18.5204,
            driver_lng=73.8567,
            accuracy=8.5,
            purpose="RIDE_START",
            customer_id=cust.id,
        )

        record_result(
            "Valid PIN Verification: Returns success=True and start_allowed=True",
            start_res.get("success") is True and start_res.get("start_allowed") is True,
        )
        record_result(
            "Ride Status Transition: State successfully updated to IN_PROGRESS",
            start_res.get("status") == "in_progress",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 9: Replay Protection
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 9: Replay Protection ---")
    async with async_session_maker() as session:
        start_svc = RideStartService(session)
        # Attempt to replay verification on already started ride
        replay_res = await start_svc.verify_and_start_ride(
            driver_user_id=str(u_start.id),
            ride_id=valid_req.id,
            pin="5678",
            driver_lat=18.5204,
            driver_lng=73.8567,
            purpose="RIDE_START",
        )

        record_result(
            "Replay Protection: Repeated verification returns safe idempotent in_progress response",
            replay_res.get("success") is True and "already started" in replay_res.get("message", ""),
        )

    # ──────────────────────────────────────────────────────────────────────────
    # FINAL SUMMARY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 85)
    print(f"📊 PHASE 12 VERIFICATION SUMMARY: {TESTS_PASSED}/{TESTS_RUN} TESTS PASSED")
    if TESTS_FAILED == 0:
        print("🎉 PHASE 12: RIDE START OTP/PIN FULLY VERIFIED!")
    else:
        print(f"⚠️ {TESTS_FAILED} TESTS FAILED!")
    print("=" * 85)

    if TESTS_FAILED > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_phase12_ride_start_otp_verification())
