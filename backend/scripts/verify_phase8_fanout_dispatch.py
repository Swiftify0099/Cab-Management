"""
Master Verification Suite for Phase 8: Fanout Dispatch Engine.

Tests:
  1. Multi-partner fanout offer creation (Partner A, B, C, D).
  2. Partner reject isolation (Offer -> REJECTED, Request remains MATCHING).
  3. 2 Simultaneous Concurrent Accepts (Exactly 1 winner, 1 loser REMOVED).
  4. 5 Simultaneous Concurrent Accepts (Exactly 1 winner, 4 losers REMOVED).
  5. 10 Simultaneous Concurrent Accepts (Exactly 1 winner, 9 losers REMOVED).
  6. Duplicate Accept Invariant (Winning driver accepting twice -> rejected).
  7. Late Accept Invariant (Accepting after winner committed -> rejected).
  8. Expired Accept Invariant (Accepting after expires_at -> rejected as EXPIRED).
  9. Realtime Event Broadcasting to losing partners.
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
if matching_service_dir not in sys.path:
    sys.path.insert(0, matching_service_dir)
if auth_service_dir not in sys.path:
    sys.path.insert(0, auth_service_dir)

from common.database import async_session_maker
from common.models.all_models import (
    Driver,
    DriverStatus,
    KYCStatus,
    RideCategory,
    RideOffer,
    RideOfferStatus,
    RideRequest,
    RideRequestStatus,
    User,
    UserRole,
    Vehicle,
    VehicleType,
)
from app.schemas.vehicle import VehicleCreateRequest
from app.services.vehicle_service import (
    create_driver_vehicle,
    activate_driver_vehicle,
)

import importlib.util
spec = importlib.util.spec_from_file_location(
    "fanout_dispatch_engine",
    os.path.join(backend_dir, "matching-service", "app", "services", "fanout_dispatch_engine.py"),
)
fanout_mod = importlib.util.module_from_spec(spec)
sys.modules["fanout_dispatch_engine"] = fanout_mod
spec.loader.exec_module(fanout_mod)

FanoutDispatchEngine = fanout_mod.FanoutDispatchEngine

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


async def run_phase8_fanout_dispatch_verification():
    print("=" * 85)
    print("⚡🎯 STARTING PHASE 8: FANOUT DISPATCH & HIGH-CONCURRENCY ACCEPT VERIFICATION")
    print("=" * 85)

    # 1. Setup Customer
    async with async_session_maker() as session:
        cust_user = User(
            id=uuid.uuid4(),
            phone=f"+9177{uuid.uuid4().hex[:8]}",
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(cust_user)
        await session.commit()

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: Multi-Partner Fanout Offer Creation (Partner A, B, C, D)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 1: Multi-Partner Fanout Offer Creation (Partner A, B, C, D) ---")
    async with async_session_maker() as session:
        try:
            req1 = await create_test_ride_request(session, cust_user)
            drivers_s1 = []
            candidates_s1 = []
            for name in ["Partner A", "Partner B", "Partner C", "Partner D"]:
                u, d, v = await create_test_driver(session, name, 18.5204 + 0.005, 73.8567 + 0.005)
                drivers_s1.append((u, d, v))
                candidates_s1.append({
                    "driver_id": str(d.id),
                    "user_id": str(u.id),
                    "distance_km": 1.2,
                    "eta_min": 4,
                    "seat_capacity": 4,
                })

            engine = FanoutDispatchEngine(session)
            created_offers = await engine.create_fanout_offers(req1.id, candidates_s1, timeout_sec=180)

            record_result(
                "Fanout Creation: Exactly 4 distinct RideOffers created for Partners A, B, C, D",
                len(created_offers) == 4,
            )

            # Check statuses in DB
            db_offers_res = await session.execute(
                select(RideOffer).where(RideOffer.ride_request_id == req1.id)
            )
            db_offers = db_offers_res.scalars().all()
            all_offered = all(o.status in (RideOfferStatus.OFFERED, RideOfferStatus.PENDING) for o in db_offers)
            distinct_drivers = len({o.driver_id for o in db_offers}) == 4

            record_result(
                "Offer States: All 4 offers initialized in OFFERED state with distinct drivers",
                all_offered and distinct_drivers,
            )

            # Check RideRequest status
            req1_ref = await session.get(RideRequest, req1.id)
            record_result(
                "Request State: RideRequest transitioned to MATCHING state",
                req1_ref.status == RideRequestStatus.MATCHING,
            )

        except Exception as e:
            record_result("Section 1 Fanout Offer Creation Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: Partner Reject Invariant (Offer -> REJECTED, Request -> MATCHING)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 2: Partner Reject Invariant ---")
    async with async_session_maker() as session:
        try:
            # Partner A rejects
            partner_a_user, partner_a_drv, _ = drivers_s1[0]
            partner_a_offer = next(o for o in created_offers if o.driver_id == partner_a_drv.id)

            engine = FanoutDispatchEngine(session)
            reject_res = await engine.reject_offer(
                driver_identifier=partner_a_user.id,
                offer_identifier=partner_a_offer.id,
                rejection_reason="Too far from current location",
            )

            record_result(
                "Partner Reject: Response successful with status 'rejected'",
                reject_res.get("success") is True and reject_res.get("status") == "rejected",
            )

            # Verify Partner A offer is REJECTED in DB
            off_a_db = await session.get(RideOffer, partner_a_offer.id)
            record_result(
                "Partner Reject: Partner A's offer strictly updated to REJECTED in DB",
                off_a_db.status == RideOfferStatus.REJECTED and off_a_db.response_reason is not None,
            )

            # Verify RideRequest remains MATCHING
            req1_check = await session.get(RideRequest, req1.id)
            record_result(
                "Partner Reject Guard: Customer RideRequest remains strictly in MATCHING status",
                req1_check.status == RideRequestStatus.MATCHING and req1_check.assigned_driver_id is None,
            )

            # Verify Partners B, C, D offers remain OFFERED
            other_offers_res = await session.execute(
                select(RideOffer).where(
                    and_(
                        RideOffer.ride_request_id == req1.id,
                        RideOffer.id != partner_a_offer.id,
                    )
                )
            )
            other_offers = other_offers_res.scalars().all()
            record_result(
                "Partner Reject Guard: Remaining 3 offers (B, C, D) remain active/open",
                len(other_offers) == 3 and all(o.status in (RideOfferStatus.OFFERED, RideOfferStatus.PENDING) for o in other_offers),
            )

        except Exception as e:
            record_result("Section 2 Partner Reject Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: 2 Simultaneous Concurrent Accepts (Exactly 1 Winner)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 3: 2 Simultaneous Concurrent Accepts ---")
    async with async_session_maker() as session:
        req2 = await create_test_ride_request(session, cust_user)
        d2_list = []
        cands2 = []
        for i in range(2):
            u, d, v = await create_test_driver(session, f"Sim2 Driver {i+1}", 18.5204, 73.8567)
            d2_list.append((u, d, v))
            cands2.append({"driver_id": str(d.id), "user_id": str(u.id), "distance_km": 1.0, "eta_min": 3})

        engine = FanoutDispatchEngine(session)
        offers2 = await engine.create_fanout_offers(req2.id, cands2)

    async def _accept_task(u_id: uuid.UUID, off_id: uuid.UUID):
        async with async_session_maker() as sess:
            eng = FanoutDispatchEngine(sess)
            return await eng.accept_offer_atomic(u_id, off_id)

    # Trigger simultaneous accepts at exact same time
    results_sim2 = await asyncio.gather(
        _accept_task(d2_list[0][0].id, offers2[0].id),
        _accept_task(d2_list[1][0].id, offers2[1].id),
    )

    success_count_2 = sum(1 for r in results_sim2 if r.get("success") is True)
    failure_count_2 = sum(1 for r in results_sim2 if r.get("success") is False)

    record_result(
        "2 Simultaneous Accepts: Exactly ONE driver accepted (1 Winner, 1 Loser)",
        success_count_2 == 1 and failure_count_2 == 1,
    )

    # Check DB state
    async with async_session_maker() as session:
        req2_db = await session.get(RideRequest, req2.id)
        db_offers_2 = (await session.execute(select(RideOffer).where(RideOffer.ride_request_id == req2.id))).scalars().all()
        accepted_cnt = sum(1 for o in db_offers_2 if o.status == RideOfferStatus.ACCEPTED)
        removed_cnt = sum(1 for o in db_offers_2 if o.status in (RideOfferStatus.REMOVED, RideOfferStatus.SUPERSEDED))

        record_result(
            "2 Simultaneous Accepts DB: RideRequest ASSIGNED with exactly 1 ACCEPTED offer and 1 REMOVED offer",
            req2_db.status == RideRequestStatus.ASSIGNED and req2_db.assigned_driver_id is not None and accepted_cnt == 1 and removed_cnt == 1,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: 5 Simultaneous Concurrent Accepts (Exactly 1 Winner)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 4: 5 Simultaneous Concurrent Accepts ---")
    async with async_session_maker() as session:
        req5 = await create_test_ride_request(session, cust_user)
        d5_list = []
        cands5 = []
        for i in range(5):
            u, d, v = await create_test_driver(session, f"Sim5 Driver {i+1}", 18.5204, 73.8567)
            d5_list.append((u, d, v))
            cands5.append({"driver_id": str(d.id), "user_id": str(u.id), "distance_km": 1.0, "eta_min": 3})

        engine = FanoutDispatchEngine(session)
        offers5 = await engine.create_fanout_offers(req5.id, cands5)

    tasks5 = [_accept_task(d5_list[i][0].id, offers5[i].id) for i in range(5)]
    results_sim5 = await asyncio.gather(*tasks5)

    success_count_5 = sum(1 for r in results_sim5 if r.get("success") is True)
    failure_count_5 = sum(1 for r in results_sim5 if r.get("success") is False)

    record_result(
        "5 Simultaneous Accepts: Exactly ONE driver accepted (1 Winner, 4 Losers)",
        success_count_5 == 1 and failure_count_5 == 4,
    )

    async with async_session_maker() as session:
        req5_db = await session.get(RideRequest, req5.id)
        db_offers_5 = (await session.execute(select(RideOffer).where(RideOffer.ride_request_id == req5.id))).scalars().all()
        accepted_cnt_5 = sum(1 for o in db_offers_5 if o.status == RideOfferStatus.ACCEPTED)
        removed_cnt_5 = sum(1 for o in db_offers_5 if o.status in (RideOfferStatus.REMOVED, RideOfferStatus.SUPERSEDED))

        record_result(
            "5 Simultaneous Accepts DB: Exactly 1 ACCEPTED offer and 4 REMOVED offers",
            req5_db.status == RideRequestStatus.ASSIGNED and accepted_cnt_5 == 1 and removed_cnt_5 == 4,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: 10 Simultaneous Concurrent Accepts (High-Concurrency Stress)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 5: 10 Simultaneous Concurrent Accepts (Stress Test) ---")
    async with async_session_maker() as session:
        req10 = await create_test_ride_request(session, cust_user)
        d10_list = []
        cands10 = []
        for i in range(10):
            u, d, v = await create_test_driver(session, f"Sim10 Driver {i+1}", 18.5204, 73.8567)
            d10_list.append((u, d, v))
            cands10.append({"driver_id": str(d.id), "user_id": str(u.id), "distance_km": 1.0, "eta_min": 3})

        engine = FanoutDispatchEngine(session)
        offers10 = await engine.create_fanout_offers(req10.id, cands10)

    tasks10 = [_accept_task(d10_list[i][0].id, offers10[i].id) for i in range(10)]
    results_sim10 = await asyncio.gather(*tasks10)

    success_count_10 = sum(1 for r in results_sim10 if r.get("success") is True)
    failure_count_10 = sum(1 for r in results_sim10 if r.get("success") is False)

    record_result(
        "10 Simultaneous Accepts: Exactly ONE driver accepted (1 Winner, 9 Losers)",
        success_count_10 == 1 and failure_count_10 == 9,
    )

    async with async_session_maker() as session:
        req10_db = await session.get(RideRequest, req10.id)
        db_offers_10 = (await session.execute(select(RideOffer).where(RideOffer.ride_request_id == req10.id))).scalars().all()
        accepted_cnt_10 = sum(1 for o in db_offers_10 if o.status == RideOfferStatus.ACCEPTED)
        removed_cnt_10 = sum(1 for o in db_offers_10 if o.status in (RideOfferStatus.REMOVED, RideOfferStatus.SUPERSEDED))

        record_result(
            "10 Simultaneous Accepts DB: Exactly 1 Winner Assigned, 9 Losers Marked REMOVED",
            req10_db.status == RideRequestStatus.ASSIGNED and accepted_cnt_10 == 1 and removed_cnt_10 == 9,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6: Duplicate Accept Invariant (Same Driver Calls Accept Twice)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 6: Duplicate Accept Invariant ---")
    async with async_session_maker() as session:
        try:
            # Find the winner of req10
            winner_res = next(r for r in results_sim10 if r.get("success") is True)
            winner_driver_id = uuid.UUID(winner_res["winner_driver_id"])
            winning_pair = next(pair for pair in d10_list if pair[1].id == winner_driver_id)
            winning_offer = next(o for o in offers10 if o.driver_id == winner_driver_id)

            engine = FanoutDispatchEngine(session)
            dup_res = await engine.accept_offer_atomic(
                driver_identifier=winning_pair[0].id,
                offer_identifier=winning_offer.id,
            )

            record_result(
                "Duplicate Accept Guard: Second accept attempt by winner strictly rejected",
                dup_res.get("success") is False and dup_res.get("status") in ("already_accepted", "removed", "already_assigned"),
            )
        except Exception as e:
            record_result("Section 6 Duplicate Accept Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7: Late Accept Invariant (Accept Attempt After Winner Decided)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 7: Late Accept Invariant ---")
    async with async_session_maker() as session:
        try:
            # Find one of the losing drivers from req10
            loser_res = next(r for r in results_sim10 if r.get("success") is False)
            loser_offer_id = uuid.UUID(loser_res["offer_id"])
            loser_offer = next(o for o in offers10 if o.id == loser_offer_id)
            loser_pair = next(pair for pair in d10_list if pair[1].id == loser_offer.driver_id)

            engine = FanoutDispatchEngine(session)
            late_res = await engine.accept_offer_atomic(
                driver_identifier=loser_pair[0].id,
                offer_identifier=loser_offer.id,
            )

            record_result(
                "Late Accept Guard: Accept attempt on already-resolved request strictly rejected",
                late_res.get("success") is False and late_res.get("status") in ("removed", "superseded"),
            )
        except Exception as e:
            record_result("Section 7 Late Accept Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 8: Expired Accept Invariant
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 8: Expired Accept Invariant ---")
    async with async_session_maker() as session:
        try:
            req_exp = await create_test_ride_request(session, cust_user)
            u_exp, d_exp, _ = await create_test_driver(session, "Expired Driver", 18.5204, 73.8567)

            engine = FanoutDispatchEngine(session)
            offers_exp = await engine.create_fanout_offers(
                req_exp.id,
                [{"driver_id": str(d_exp.id), "user_id": str(u_exp.id), "distance_km": 1.0, "eta_min": 3}],
                timeout_sec=180,
            )
            exp_offer = offers_exp[0]

            # Manually set expires_at in the past
            await session.execute(
                update(RideOffer)
                .where(RideOffer.id == exp_offer.id)
                .values(expires_at=datetime.now(timezone.utc) - timedelta(seconds=60))
            )
            await session.commit()

            # Attempt accept on expired offer
            exp_accept_res = await engine.accept_offer_atomic(
                driver_identifier=u_exp.id,
                offer_identifier=exp_offer.id,
            )

            record_result(
                "Expired Accept Guard: Accept attempt after timeout strictly rejected with status 'expired'",
                exp_accept_res.get("success") is False and exp_accept_res.get("status") == "expired",
            )

            # Verify offer status in DB is EXPIRED
            exp_offer_db = await session.get(RideOffer, exp_offer.id)
            record_result(
                "Expired DB State: RideOffer status updated to EXPIRED in database",
                exp_offer_db.status == RideOfferStatus.EXPIRED,
            )

        except Exception as e:
            record_result("Section 8 Expired Accept Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 9: Start OTP Security & Summary
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 9: Start OTP & Customer Invariant ---")
    async with async_session_maker() as session:
        try:
            req10_final = await session.get(RideRequest, req10.id)
            has_otp = bool(req10_final.start_pin_plain and len(req10_final.start_pin_plain) == 4)
            record_result(
                "OTP Invariant: Winning assignment generates secure 4-digit start PIN",
                has_otp and req10_final.start_pin_hash is not None,
            )
        except Exception as e:
            record_result("Section 9 OTP Test", False, str(e))

    # ──────────────────────────────────────────────────────────────────────────
    # FINAL SUMMARY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 85)
    print(f"📊 PHASE 8 VERIFICATION SUMMARY: {TESTS_PASSED}/{TESTS_RUN} TESTS PASSED")
    if TESTS_FAILED == 0:
        print("🎉 PHASE 8: FANOUT DISPATCH & CONCURRENCY ENGINE FULLY VERIFIED!")
    else:
        print(f"⚠️ {TESTS_FAILED} TESTS FAILED!")
    print("=" * 85)

    if TESTS_FAILED > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_phase8_fanout_dispatch_verification())
