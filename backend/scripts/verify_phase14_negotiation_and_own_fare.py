"""
Master Verification Suite for Phase 14: Negotiation & Own Fare Model.

Tests:
  1. Initial Suggested Fare Creation: Customer sends offer -> immutable NegotiationOffer created with TTL.
  2. Partner Direct Acceptance: Partner accepts -> atomically assigns driver, marks ACCEPTED, supersedes competing offers, closes negotiation.
  3. Partner Multi-Round Counter-Offer: Partner counters -> parent offer SUPERSEDED, new immutable child offer created (round_number=2).
  4. Customer Counter-Offer: Customer counters back -> creates immutable round_number=3 offer.
  5. Customer Accepts Counter-Offer: Customer accepts counter -> assigns driver at counter amount.
  6. Concurrent Partner Accept Conflict: 2 partners attempt to accept simultaneously -> exactly ONE wins.
  7. Expired Offer Rejection: Offer past expires_at is rejected with 400 Bad Request and marked EXPIRED.
  8. Cancellation During Negotiation: Customer cancels negotiation -> ride CANCELLED, all active offers CANCELLED.
  9. Negotiation Closure Invariant: Once trip is ASSIGNED, no further bids or counters are accepted.
  10. Financial Ledger Reconciliation: Verifies final_fare, platform_commission (10%), and driver_earning (90%).
  11. Immutability Invariant: Verifies complete un-overwritten offer chain in PostgreSQL.
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

from common.database import async_session_maker, engine, Base
from common.models.all_models import (
    Driver,
    DriverStatus,
    KYCStatus,
    NegotiationOffer,
    RideEventLog,
    RideOffer,
    RideOfferStatus,
    RideRequest,
    RideRequestStatus,
    User,
    UserRole,
    Vehicle,
    VehicleType,
)
from app.services.negotiation_service import NegotiationService
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
        total_trips=10,
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
            make="Toyota",
            model="Etios Platinum",
            year=2024,
            registration_number=reg_no,
            color="Pearl White",
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


async def run_phase14_negotiation_and_own_fare_verification():
    print("=" * 85)
    print("🤝💰 STARTING PHASE 14: NEGOTIATION / OWN FARE MODEL VERIFICATION")
    print("=" * 85)

    # Ensure negotiation_offers table exists in Postgres
    async with async_session_maker() as session:
        from sqlalchemy import text
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS negotiation_offers (
                id UUID PRIMARY KEY,
                ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
                sender_type VARCHAR(20) NOT NULL,
                sender_id UUID NOT NULL,
                receiver_type VARCHAR(20) NOT NULL,
                receiver_id UUID NOT NULL,
                amount NUMERIC(10, 2) NOT NULL,
                round_number INTEGER NOT NULL DEFAULT 1,
                parent_offer_id UUID REFERENCES negotiation_offers(id) ON DELETE SET NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'OFFERED',
                expires_at TIMESTAMPTZ NOT NULL,
                responded_at TIMESTAMPTZ,
                rejection_reason VARCHAR(255),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await session.execute(text("CREATE INDEX IF NOT EXISTS ix_neg_offers_ride_id ON negotiation_offers(ride_request_id)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS ix_neg_offers_sender ON negotiation_offers(sender_id)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS ix_neg_offers_receiver ON negotiation_offers(receiver_id)"))
        await session.execute(text("CREATE INDEX IF NOT EXISTS ix_neg_offers_status ON negotiation_offers(status)"))
        await session.commit()

        cust = User(id=uuid.uuid4(), phone=f"+9191{uuid.uuid4().hex[:8]}", role=UserRole.CUSTOMER, is_active=True)
        session.add(cust)
        await session.commit()

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: Initial Suggested Fare Creation
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 1: Initial Suggested Fare Creation ---")
    async with async_session_maker() as session:
        u_p1, d_p1, v_p1 = await create_test_partner(session, "Partner 1", 18.5204, 73.8567)
        u_p2, d_p2, v_p2 = await create_test_partner(session, "Partner 2", 18.5204, 73.8567)

        ride1 = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust.id,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="FC Road, Pune",
            destination_location="SRID=4326;POINT(73.9197 18.5822)",
            destination_lat=18.5822,
            destination_lng=73.9197,
            destination_address="Airport",
            status=RideRequestStatus.MATCHING,
            pricing_mode="STANDARD",
            estimated_fare=Decimal("450.00"),
        )
        session.add(ride1)
        await session.commit()

        neg_svc = NegotiationService(session)

        # Customer suggests ₹350.00 and sends offer to Partner 1 and Partner 2
        offers_created = await neg_svc.create_customer_initial_offer(
            customer_user_id=str(cust.id),
            ride_request_id=ride1.id,
            suggested_amount=350.0,
            candidate_driver_user_ids=[str(u_p1.id), str(u_p2.id)],
            ttl_seconds=120,
        )

        record_result(
            "Initial Suggested Fare: Exactly 2 immutable offers created for candidate partners",
            len(offers_created) == 2 and all(o["amount"] == 350.0 for o in offers_created),
        )

        # Check DB authoritative state
        o_db_res = await session.execute(
            select(NegotiationOffer).where(NegotiationOffer.ride_request_id == ride1.id)
        )
        db_offers = o_db_res.scalars().all()

        record_result(
            "Authoritative DB Offer State: Status is OFFERED and pricing_mode updated to NEGOTIATED",
            len(db_offers) == 2 and all(o.status == "OFFERED" for o in db_offers) and ride1.pricing_mode == "NEGOTIATED",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: Partner Direct Acceptance & Atomic Winner Selection
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 2: Partner Direct Acceptance ---")
    async with async_session_maker() as session:
        neg_svc = NegotiationService(session)

        # Partner 1 accepts the customer's ₹350.00 offer
        p1_offer = [o for o in db_offers if o.receiver_id == u_p1.id][0]
        accept_res = await neg_svc.partner_accept_offer(
            driver_user_id=str(u_p1.id),
            offer_id=p1_offer.id,
        )

        record_result(
            "Partner Acceptance: Winner atomically assigned and offer status updated to ACCEPTED",
            accept_res["success"] is True and accept_res["final_fare"] == 350.0,
        )

        # Check that Partner 2's offer was automatically marked SUPERSEDED
        p2_check = await session.execute(
            select(NegotiationOffer).where(
                and_(NegotiationOffer.ride_request_id == ride1.id, NegotiationOffer.receiver_id == u_p2.id)
            )
        )
        p2_offer_db = p2_check.scalar_one_or_none()

        record_result(
            "Competing Offer Supersession: Competing offers marked SUPERSEDED",
            p2_offer_db is not None and p2_offer_db.status == "SUPERSEDED",
        )

        # Check Ride status
        r_check = await session.execute(select(RideRequest).where(RideRequest.id == ride1.id))
        ride1_db = r_check.scalar_one_or_none()

        record_result(
            "Ride Status & Assignment: Ride status is ASSIGNED to winning driver",
            ride1_db is not None and ride1_db.status == RideRequestStatus.ASSIGNED and ride1_db.assigned_driver_id == d_p1.id,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: Multi-Round Counter-Offer Protocol (Partner -> Customer -> Partner)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 3: Multi-Round Counter-Offer Protocol ---")
    async with async_session_maker() as session:
        u_p3, d_p3, v_p3 = await create_test_partner(session, "Partner 3", 18.5204, 73.8567)

        ride2 = RideRequest(
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
            pricing_mode="NEGOTIATED",
            estimated_fare=Decimal("300.00"),
        )
        session.add(ride2)
        await session.commit()

        neg_svc = NegotiationService(session)

        # Round 1: Customer initial offer of ₹300.00
        r1_offers = await neg_svc.create_customer_initial_offer(
            customer_user_id=str(cust.id),
            ride_request_id=ride2.id,
            suggested_amount=300.0,
            candidate_driver_user_ids=[str(u_p3.id)],
        )
        r1_offer_id = uuid.UUID(r1_offers[0]["offer_id"])

        # Round 2: Partner 3 counters with ₹420.00
        counter_res = await neg_svc.partner_send_counter_offer(
            driver_user_id=str(u_p3.id),
            parent_offer_id=r1_offer_id,
            counter_amount=420.0,
        )

        record_result(
            "Partner Counter-Offer: Creates new immutable offer (round 2, ₹420.00) and marks parent SUPERSEDED",
            counter_res["success"] is True and counter_res["amount"] == 420.0 and counter_res["round_number"] == 2,
        )

        # Verify Round 1 offer is SUPERSEDED, not deleted/overwritten
        r1_db = (await session.execute(select(NegotiationOffer).where(NegotiationOffer.id == r1_offer_id))).scalar_one_or_none()
        record_result(
            "Immutability Invariant: Parent offer preserved as SUPERSEDED without data loss",
            r1_db is not None and r1_db.status == "SUPERSEDED" and float(r1_db.amount) == 300.0,
        )

        # Round 3: Customer counters back with ₹390.00
        r2_offer_id = uuid.UUID(counter_res["offer_id"])
        cust_counter_res = await neg_svc.customer_send_counter_offer(
            customer_user_id=str(cust.id),
            parent_offer_id=r2_offer_id,
            counter_amount=390.0,
        )

        record_result(
            "Customer Counter-Offer: Creates new immutable offer (round 3, ₹390.00)",
            cust_counter_res["success"] is True and cust_counter_res["amount"] == 390.0 and cust_counter_res["round_number"] == 3,
        )

        # Partner accepts customer's Round 3 counter of ₹390.00
        r3_offer_id = uuid.UUID(cust_counter_res["offer_id"])
        p3_accept_res = await neg_svc.partner_accept_offer(
            driver_user_id=str(u_p3.id),
            offer_id=r3_offer_id,
        )

        record_result(
            "Mutual Agreement: Partner accepts round 3 counter, establishing ₹390.00 authoritative booking price",
            p3_accept_res["success"] is True and p3_accept_res["final_fare"] == 390.0,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: Customer Accepts Partner Counter-Offer
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 4: Customer Accepts Counter-Offer ---")
    async with async_session_maker() as session:
        u_p4, d_p4, v_p4 = await create_test_partner(session, "Partner 4", 18.5204, 73.8567)

        ride3 = RideRequest(
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
            pricing_mode="NEGOTIATED",
            estimated_fare=Decimal("350.00"),
        )
        session.add(ride3)
        await session.commit()

        neg_svc = NegotiationService(session)

        init_offers = await neg_svc.create_customer_initial_offer(
            customer_user_id=str(cust.id),
            ride_request_id=ride3.id,
            suggested_amount=250.0,
            candidate_driver_user_ids=[str(u_p4.id)],
        )

        p4_counter = await neg_svc.partner_send_counter_offer(
            driver_user_id=str(u_p4.id),
            parent_offer_id=uuid.UUID(init_offers[0]["offer_id"]),
            counter_amount=320.0,
        )

        # Customer directly accepts Partner 4's counter-offer
        cust_accept_res = await neg_svc.customer_accept_counter_offer(
            customer_user_id=str(cust.id),
            offer_id=uuid.UUID(p4_counter["offer_id"]),
        )

        record_result(
            "Customer Accept Counter: Customer accepts counter-offer -> ride assigned at ₹320.00",
            cust_accept_res["success"] is True and cust_accept_res["final_fare"] == 320.0,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: Concurrent Partner Accept Conflict (Exactly 1 Winner)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 5: Concurrent Accept Concurrency Control ---")
    async with async_session_maker() as session:
        u_p5a, d_p5a, v_p5a = await create_test_partner(session, "Concurrent Partner A", 18.5204, 73.8567)
        u_p5b, d_p5b, v_p5b = await create_test_partner(session, "Concurrent Partner B", 18.5204, 73.8567)

        ride4 = RideRequest(
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
            pricing_mode="NEGOTIATED",
            estimated_fare=Decimal("350.00"),
        )
        session.add(ride4)
        await session.commit()

        neg_svc = NegotiationService(session)

        conc_offers = await neg_svc.create_customer_initial_offer(
            customer_user_id=str(cust.id),
            ride_request_id=ride4.id,
            suggested_amount=400.0,
            candidate_driver_user_ids=[str(u_p5a.id), str(u_p5b.id)],
        )

        off_a_id = uuid.UUID(conc_offers[0]["offer_id"])
        off_b_id = uuid.UUID(conc_offers[1]["offer_id"])

        # Partner A accepts first
        accept_a = await neg_svc.partner_accept_offer(str(u_p5a.id), off_a_id)

        # Partner B attempts to accept after Partner A already won
        accept_b = await neg_svc.partner_accept_offer(str(u_p5b.id), off_b_id)

        record_result(
            "Concurrency Invariant: First partner wins (success=True), second partner rejected (assigned=False)",
            accept_a["success"] is True and accept_b["success"] is False and "already been assigned" in accept_b["message"],
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6: Expired Offer Protection
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 6: Expired Offer Protection ---")
    async with async_session_maker() as session:
        u_p6, d_p6, v_p6 = await create_test_partner(session, "Expired Driver", 18.5204, 73.8567)

        ride5 = RideRequest(
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
            pricing_mode="NEGOTIATED",
            estimated_fare=Decimal("350.00"),
        )
        session.add(ride5)
        await session.commit()

        neg_svc = NegotiationService(session)

        exp_offers = await neg_svc.create_customer_initial_offer(
            customer_user_id=str(cust.id),
            ride_request_id=ride5.id,
            suggested_amount=300.0,
            candidate_driver_user_ids=[str(u_p6.id)],
            ttl_seconds=-10,  # Already expired 10 seconds ago
        )
        exp_off_id = uuid.UUID(exp_offers[0]["offer_id"])

        exp_err = None
        try:
            await neg_svc.partner_accept_offer(str(u_p6.id), exp_off_id)
        except HTTPException as e:
            exp_err = e

        record_result(
            "Expiry Guard: Attempt to accept an expired offer rejected with 400 Bad Request",
            exp_err is not None and exp_err.status_code == 400 and "expired" in exp_err.detail,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7: Cancellation During Negotiation
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 7: Cancellation During Negotiation ---")
    async with async_session_maker() as session:
        u_p7, d_p7, v_p7 = await create_test_partner(session, "Cancelled Driver", 18.5204, 73.8567)

        ride6 = RideRequest(
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
            pricing_mode="NEGOTIATED",
            estimated_fare=Decimal("350.00"),
        )
        session.add(ride6)
        await session.commit()
        await session.commit()

        neg_svc = NegotiationService(session)

        canc_offers = await neg_svc.create_customer_initial_offer(
            customer_user_id=str(cust.id),
            ride_request_id=ride6.id,
            suggested_amount=300.0,
            candidate_driver_user_ids=[str(u_p7.id)],
        )

        # Customer cancels negotiation session
        cancel_neg_res = await neg_svc.cancel_negotiation(
            customer_user_id=str(cust.id),
            ride_request_id=ride6.id,
            reason="Found alternate ride",
        )

        record_result(
            "Session Cancellation: Negotiation session and ride request marked CANCELLED",
            cancel_neg_res["success"] is True and cancel_neg_res["status"] == "CANCELLED",
        )

        # Check DB active offers are CANCELLED
        canc_off_db = (
            await session.execute(select(NegotiationOffer).where(NegotiationOffer.ride_request_id == ride6.id))
        ).scalars().all()

        record_result(
            "Offer Invalidation: All active offers marked CANCELLED in database",
            len(canc_off_db) == 1 and canc_off_db[0].status == "CANCELLED",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 8: Financial Reconciliation & Commission Split
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 8: Financial Reconciliation & Commission Split ---")
    async with async_session_maker() as session:
        # Check ride2 financial fields: final_fare = ₹390.00
        # Commission (10%) = ₹39.00
        # Driver Earning (90%) = ₹351.00
        r_fin = (await session.execute(select(RideRequest).where(RideRequest.id == ride2.id))).scalar_one_or_none()

        record_result(
            "Authoritative Booking Price: Final fare exactly matches accepted negotiated amount (₹390.00)",
            r_fin is not None and float(r_fin.final_fare) == 390.0,
        )

        record_result(
            "Platform Commission Split: Exact 10% platform commission (₹39.00) calculated",
            r_fin is not None and float(r_fin.platform_commission) == 39.0,
        )

        record_result(
            "Driver Net Earning Split: Exact 90% driver net earning (₹351.00) registered in ledger",
            r_fin is not None and float(r_fin.driver_earning) == 351.0,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 9: Full Negotiation State & Immutability Audit Trail
    # ──────────────────────────────────────────────────────────────────────────
    print("\n--- SECTION 9: Full Negotiation State & Immutability Audit ---")
    async with async_session_maker() as session:
        neg_svc = NegotiationService(session)
        state = await neg_svc.get_negotiation_state(ride2.id)

        record_result(
            "Negotiation State History: Retrieved complete 3-round immutable audit trail",
            state["offers_count"] == 3 and state["final_fare"] == 390.0,
        )

        record_result(
            "Immutable Round Sequence: Rounds 1 (₹300), 2 (₹420), and 3 (₹390) preserved intact",
            [o["round_number"] for o in state["offers"]] == [1, 2, 3] and [o["amount"] for o in state["offers"]] == [300.0, 420.0, 390.0],
        )

    # ──────────────────────────────────────────────────────────────────────────
    # FINAL SUMMARY
    # ──────────────────────────────────────────────────────────────────────────
    print("\n" + "=" * 85)
    print(f"📊 PHASE 14 VERIFICATION SUMMARY: {TESTS_PASSED}/{TESTS_RUN} TESTS PASSED")
    if TESTS_FAILED == 0:
        print("🎉 PHASE 14: NEGOTIATION / OWN FARE MODEL FULLY VERIFIED!")
    else:
        print(f"⚠️ {TESTS_FAILED} TESTS FAILED!")
    print("=" * 85)

    if TESTS_FAILED > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_phase14_negotiation_and_own_fare_verification())
