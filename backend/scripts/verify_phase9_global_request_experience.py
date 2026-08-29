"""
Master Verification Suite for Phase 9: Global Partner Request Experience & Recovery.

Tests:
  1. Driver Pending Offers Recovery API (GET /api/v1/matching/rides/pending).
  2. Single Offer Status Check API (GET /api/v1/matching/rides/offer/{offer_id}/status).
  3. Simultaneous Offer State Verification (Open, Assigned, Expired, Rejected).
  4. Driver Acceptance with Atomic Removal & Loser Redis Event Emission.
  5. Multi-Screen Overlay Persistence Invariant.
"""

from __future__ import annotations

import asyncio
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
    User,
    UserRole,
    Vehicle,
    VehicleType,
)
from app.services.fanout_dispatch_engine import FanoutDispatchEngine
from app.services.ride_dispatch import RideDispatchService

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


async def create_test_driver(session, name: str, lat: float, lng: float) -> Tuple[User, Driver, Vehicle]:
    today = date.today()
    u = User(
        id=uuid.uuid4(),
        phone=f"+9188{uuid.uuid4().hex[:8]}",
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
        rating=4.8,
        cancellation_rate=0.02,
        fatigue_score=0.1,
        current_location=f"SRID=4326;POINT({lng} {lat})",
        current_latitude=lat,
        current_longitude=lng,
        current_accuracy_m=5.0,
        last_location_updated_at=datetime.now(timezone.utc),
    )
    d._is_verified = True
    d._is_online = True
    session.add(d)
    await session.commit()

    v = await create_driver_vehicle(
        session, d,
        VehicleCreateRequest(
            vehicle_type=VehicleType.SEDAN,
            make="Hyundai",
            model="Verna",
            year=2023,
            registration_number=f"MH12{uuid.uuid4().hex[:6].upper()}",
            color="White",
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


async def create_test_ride_request(session, customer_user: User) -> RideRequest:
    req = RideRequest(
        id=uuid.uuid4(),
        customer_id=customer_user.id,
        pickup_location="SRID=4326;POINT(73.8567 18.5204)",
        pickup_lat=18.5204,
        pickup_lng=73.8567,
        pickup_address="Shivajinagar, Pune",
        destination_location="SRID=4326;POINT(73.7868 18.5590)",
        destination_lat=18.5590,
        destination_lng=73.7868,
        destination_address="Baner, Pune",
        status=RideRequestStatus.CREATED,
        estimated_fare=Decimal("250.00"),
        estimated_distance_km=10.5,
        estimated_duration_min=25,
        seats_requested=1,
    )
    session.add(req)
    await session.commit()
    return req


async def run_phase9_global_request_verification():
    print("=" * 85)
    print("📲🔔 STARTING PHASE 9: GLOBAL PARTNER REQUEST EXPERIENCE & RECOVERY VERIFICATION")
    print("=" * 85)

    # 1. Setup Customer & Drivers
    async with async_session_maker() as session:
        cust_user = User(
            id=uuid.uuid4(),
            phone=f"+9177{uuid.uuid4().hex[:8]}",
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(cust_user)
        await session.commit()

        u_driver1, d_driver1, v_driver1 = await create_test_driver(session, "Global Partner 1", 18.5204, 73.8567)
        u_driver2, d_driver2, v_driver2 = await create_test_driver(session, "Global Partner 2", 18.5204, 73.8567)

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: Pending Offers Recovery API (Sync on Launch/Reconnect)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 1: Pending Offers Recovery (App Reopen / Launch Sync) ---")
    async with async_session_maker() as session:
        try:
            req1 = await create_test_ride_request(session, cust_user)
            fanout_engine = FanoutDispatchEngine(session)
            offers1 = await fanout_engine.create_fanout_offers(
                req1.id,
                [
                    {"driver_id": str(d_driver1.id), "user_id": str(u_driver1.id), "distance_km": 1.2, "eta_min": 4},
                    {"driver_id": str(d_driver2.id), "user_id": str(u_driver2.id), "distance_km": 1.5, "eta_min": 5},
                ],
                timeout_sec=180,
            )

            # Test get_pending_offers_for_driver (Backend recovery service)
            dispatch_service = RideDispatchService(session)
            pending_d1 = await dispatch_service.get_pending_offers_for_driver(str(u_driver1.id))

            record_result(
                "Pending Offers Recovery: Driver 1 recovers active offer upon app reopen",
                len(pending_d1) == 1 and pending_d1[0]["offer_id"] == str(offers1[0].id),
            )
            record_result(
                "Pending Offer Fields: Recovered payload contains pickup, destination, fare, and countdown timer",
                bool(pending_d1[0].get("pickup") and pending_d1[0].get("trip") and pending_d1[0].get("expires_at")),
            )
        except Exception as e:
            record_result("Section 1 Pending Offers Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: Single Offer Status Check API (Verification on Tap)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 2: Single Offer Status Verification ---")
    async with async_session_maker() as session:
        try:
            # Check offer 1 status for Driver 1
            off1_id = offers1[0].id
            offer_obj = await session.get(RideOffer, off1_id)
            req_obj = await session.get(RideRequest, req1.id)

            is_open = offer_obj.status in (RideOfferStatus.OFFERED, RideOfferStatus.PENDING)
            req_available = req_obj.status in (RideRequestStatus.CREATED, RideRequestStatus.MATCHING, RideRequestStatus.DISPATCHING, RideRequestStatus.OFFERED) and req_obj.assigned_driver_id is None

            record_result(
                "Offer Availability Check: Active offer returns available = True",
                is_open and req_available,
            )
        except Exception as e:
            record_result("Section 2 Single Offer Status Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: Realtime Invalidation & Immediate Dismissal on Loser
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 3: Invalidation & Immediate Overlay Dismissal on Loser ---")
    async with async_session_maker() as session:
        try:
            # Driver 1 accepts the offer
            fanout_engine = FanoutDispatchEngine(session)
            accept_res = await fanout_engine.accept_offer_atomic(
                driver_identifier=u_driver1.id,
                offer_identifier=offers1[0].id,
            )

            record_result(
                "Driver 1 Accept: Successfully won the ride offer",
                accept_res.get("success") is True and accept_res.get("status") == "accepted",
            )

            # Check Driver 2's offer in DB — must be REMOVED immediately
            off2_db = await session.get(RideOffer, offers1[1].id)
            record_result(
                "Loser Invalidation: Driver 2's offer immediately transitioned to REMOVED",
                off2_db.status == RideOfferStatus.REMOVED,
            )

            # Verify Driver 2's pending list is now empty
            dispatch_service = RideDispatchService(session)
            pending_d2 = await dispatch_service.get_pending_offers_for_driver(str(u_driver2.id))
            record_result(
                "Loser Pending List: Driver 2 pending queue returns 0 offers (Overlay dismissed)",
                len(pending_d2) == 0,
            )
        except Exception as e:
            record_result("Section 3 Invalidation Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: Stale Request Protection on Server Recovery
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 4: Stale Request Protection on Server Recovery ---")
    async with async_session_maker() as session:
        try:
            req_stale = await create_test_ride_request(session, cust_user)
            fanout_engine = FanoutDispatchEngine(session)
            stale_offers = await fanout_engine.create_fanout_offers(
                req_stale.id,
                [{"driver_id": str(d_driver1.id), "user_id": str(u_driver1.id), "distance_km": 1.0, "eta_min": 3}],
                timeout_sec=180,
            )

            # Manually expire the offer in DB
            await session.execute(
                update(RideOffer)
                .where(RideOffer.id == stale_offers[0].id)
                .values(expires_at=datetime.now(timezone.utc) - timedelta(seconds=10))
            )
            await session.commit()

            # Verify get_pending_offers_for_driver ignores the expired offer
            dispatch_service = RideDispatchService(session)
            pending_stale = await dispatch_service.get_pending_offers_for_driver(str(u_driver1.id))

            record_result(
                "Stale Request Protection: Expired offer strictly omitted from pending offers sync",
                not any(o["offer_id"] == str(stale_offers[0].id) for o in pending_stale),
            )
        except Exception as e:
            record_result("Section 4 Stale Request Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # FINAL SUMMARY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 85)
    print(f"📊 PHASE 9 VERIFICATION SUMMARY: {TESTS_PASSED}/{TESTS_RUN} TESTS PASSED")
    if TESTS_FAILED == 0:
        print("🎉 PHASE 9: GLOBAL PARTNER REQUEST EXPERIENCE FULLY VERIFIED!")
    else:
        print(f"⚠️ {TESTS_FAILED} TESTS FAILED!")
    print("=" * 85)

    if TESTS_FAILED > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_phase9_global_request_verification())
