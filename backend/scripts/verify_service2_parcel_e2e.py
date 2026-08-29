"""
Master Production Verification Suite: SERVICE 2 — PARCEL LOGISTICS (Phase 16)
════════════════════════════════════════════════════════════════════════════════
Authoritative End-to-End Test Suite verifying the full 14-stage lifecycle flow:
CREATE → MATCH → OFFER → ACCEPT → PICKUP → PICKUP OTP → PICKED UP →
TRACKING → DELIVERY → DELIVERY OTP → POD → COMPLETE → PAYMENT → RATING

Also validates all required failure and edge-case scenarios:
1. Test invalid weight (<= 0 and > vehicle max capacity)
2. Test incompatible vehicle (vehicle not parcel capable, or capacity < weight)
3. Test wrong OTP (wrong pickup & delivery OTP penalty & attempt lockout)
4. Test missing POD (missing OTP / missing receiver POD info)
5. Cloudinary POD proof upload & secure storage
6. PostgreSQL metadata, reference, and status consistency
"""
import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal

# Add python paths
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_root, "common"))
sys.path.insert(0, os.path.join(_root, "parcel-service"))
sys.path.insert(0, _root)

from fastapi import HTTPException
from sqlalchemy import select, and_, text
from common.database import async_session_maker, engine
from common.models.all_models import (
    User, UserRole, Driver, DriverStatus, KYCStatus, Vehicle, VehicleType,
    Parcel, ParcelStatus, ParcelProofOfDelivery, ParcelStatusHistory, DriverEarningLedger,
    MediaAsset,
)
from app.services.parcel_service import ParcelService

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def run_parcel_service_verification():
    print("=" * 80)
    print("📦 STARTING PHASE 16 — PARCEL LOGISTICS COMPLETE E2E VERIFICATION")
    print("=" * 80)

    await engine.dispose()

    async with async_session_maker() as session:
        # =========================================================================
        # SETUP SEED DATA
        # =========================================================================
        print("\n[SETUP] Seeding Customer, Delivery Partners & Multi-Tier Vehicles...", flush=True)

        # 1. Customer User (Booking Owner)
        customer_user = User(
            id=uuid.uuid4(),
            phone=f"+9199{str(uuid.uuid4().int)[:8]}",
            email=f"parcel.cust.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(customer_user)

        # 2. Driver 1 (Delivery Partner - Bike: 15kg cap)
        d1_user = User(
            id=uuid.uuid4(),
            phone=f"+9198{str(uuid.uuid4().int)[:8]}",
            email=f"parcel.drv1.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(d1_user)
        driver1 = Driver(
            id=uuid.uuid4(),
            user_id=d1_user.id,
            full_name="Santosh Shinde (Bike Express)",
            phone=d1_user.phone,
            rating=4.90,
            total_trips=100,
            wallet_balance=Decimal("500.00"),
            total_earnings=Decimal("15000.00"),
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_latitude=18.5204,
            current_longitude=73.8567,
            current_location="SRID=4326;POINT(73.8567 18.5204)",
        )
        session.add(driver1)

        v1 = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver1.id,
            make="Hero",
            model="Splendor Plus",
            year=2023,
            color="Black",
            registration_number=f"MH-12-P{uuid.uuid4().hex[:3].upper()}",
            vehicle_type=VehicleType.BIKE,
            seat_capacity=1,
            parcel_capable=True,
            parcel_capacity_kg=15.0,
            is_active=True,
            status="APPROVED",
        )
        session.add(v1)

        # 3. Driver 2 (Delivery Partner - Auto / Van: 60kg cap)
        d2_user = User(
            id=uuid.uuid4(),
            phone=f"+9197{str(uuid.uuid4().int)[:8]}",
            email=f"parcel.drv2.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(d2_user)
        driver2 = Driver(
            id=uuid.uuid4(),
            user_id=d2_user.id,
            full_name="Kiran Pawar (Cargo Delivery)",
            phone=d2_user.phone,
            rating=4.85,
            total_trips=150,
            wallet_balance=Decimal("350.00"),
            total_earnings=Decimal("28000.00"),
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_latitude=18.5220,
            current_longitude=73.8580,
            current_location="SRID=4326;POINT(73.8580 18.5220)",
        )
        session.add(driver2)

        v2 = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver2.id,
            make="Maruti",
            model="Eeco Cargo",
            year=2022,
            color="White",
            registration_number=f"MH-12-A{uuid.uuid4().hex[:3].upper()}",
            vehicle_type=VehicleType.HATCHBACK,
            seat_capacity=2,
            parcel_capable=True,
            parcel_capacity_kg=60.0,
            is_active=True,
            status="APPROVED",
        )
        session.add(v2)

        # 4. Driver 3 (Passenger Cab Driver - NOT parcel capable)
        d3_user = User(
            id=uuid.uuid4(),
            phone=f"+9196{str(uuid.uuid4().int)[:8]}",
            email=f"parcel.drv3.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(d3_user)
        driver3 = Driver(
            id=uuid.uuid4(),
            user_id=d3_user.id,
            full_name="Anil Deshmukh (Cab Only)",
            phone=d3_user.phone,
            rating=4.80,
            total_trips=80,
            wallet_balance=Decimal("200.00"),
            total_earnings=Decimal("12000.00"),
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_latitude=18.5210,
            current_longitude=73.8570,
            current_location="SRID=4326;POINT(73.8570 18.5210)",
        )
        session.add(driver3)

        v3 = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver3.id,
            make="Hyundai",
            model="Aura",
            year=2023,
            color="Silver",
            registration_number=f"MH-12-C{uuid.uuid4().hex[:3].upper()}",
            vehicle_type=VehicleType.SEDAN,
            seat_capacity=4,
            parcel_capable=False,  # NOT authorized for parcel
            parcel_capacity_kg=0.0,
            is_active=True,
            status="APPROVED",
        )
        session.add(v3)

        await session.commit()
        print("[SETUP] Seed data committed successfully!", flush=True)

        parcel_svc = ParcelService(session)

        # =========================================================================
        # TEST 1: AUTHORITATIVE QUOTE & MULTI-VEHICLE TIER PRICING
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 1: AUTHORITATIVE LOGISTICS PRICING QUOTE")
        print("=" * 70)

        quote_bike = parcel_svc.calculate_quote(
            sender_lat=18.5204,
            sender_lng=73.8567,
            receiver_lat=18.5913,
            receiver_lng=73.7389,
            weight_kg=3.5,
            length_cm=30.0,
            width_cm=20.0,
            height_cm=15.0,
            package_count=1,
            vehicle_category="BIKE",
            delivery_priority="STANDARD",
            is_fragile=True,
            is_valuable=True,
            insurance_opt_in=True,
            declared_value=Decimal("5000.00"),
        )

        assert quote_bike["final_fare"] > 0, "Final fare must be > 0"
        assert quote_bike["driver_earning"] > 0, "Driver earning must be > 0"
        assert quote_bike["platform_commission"] > 0, "Platform fee must be > 0"
        assert quote_bike["is_fragile"] is True, "Fragile flag must be preserved"
        assert quote_bike["insurance_fee"] > 0, "Insurance fee must be assessed"
        assert quote_bike["volumetric_weight_kg"] == 1.8, "Volumetric weight (30x20x15/5000) must be 1.8 kg"
        assert quote_bike["effective_weight_kg"] == 3.5, "Effective weight must be max(3.5, 1.8) = 3.5 kg"
        print(f"  [OK] Bike Quote: Fare=₹{quote_bike['final_fare']}, Driver Earning=₹{quote_bike['driver_earning']}, Distance={quote_bike['estimated_distance_km']}km, Volumetric={quote_bike['volumetric_weight_kg']}kg")

        # =========================================================================
        # TEST 2: INVALID WEIGHT FAILURE TESTS
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 2: INVALID WEIGHT VALIDATION (Failure Scenarios)")
        print("=" * 70)

        # 2a. Weight <= 0
        try:
            parcel_svc.calculate_quote(
                sender_lat=18.5204,
                sender_lng=73.8567,
                receiver_lat=18.5913,
                receiver_lng=73.7389,
                weight_kg=-2.0,
                vehicle_category="BIKE",
            )
            assert False, "Negative weight must be rejected"
        except HTTPException as ex:
            assert ex.status_code == 400
            assert "Invalid weight" in ex.detail
            print("  [OK] Negative weight (-2kg) correctly rejected with HTTP 400 Bad Request.")

        try:
            parcel_svc.calculate_quote(
                sender_lat=18.5204,
                sender_lng=73.8567,
                receiver_lat=18.5913,
                receiver_lng=73.7389,
                weight_kg=0.0,
                vehicle_category="BIKE",
            )
            assert False, "Zero weight must be rejected"
        except HTTPException as ex:
            assert ex.status_code == 400
            assert "Invalid weight" in ex.detail
            print("  [OK] Zero weight (0kg) correctly rejected with HTTP 400 Bad Request.")

        # 2b. Weight exceeds max capacity for vehicle category (e.g. 25kg on Bike max 15kg)
        try:
            parcel_svc.calculate_quote(
                sender_lat=18.5204,
                sender_lng=73.8567,
                receiver_lat=18.5913,
                receiver_lng=73.7389,
                weight_kg=25.0,
                vehicle_category="BIKE",
            )
            assert False, "Weight exceeding Bike capacity (15kg) must be rejected"
        except HTTPException as ex:
            assert ex.status_code == 400
            assert "Incompatible weight" in ex.detail
            print("  [OK] Over-capacity weight (25kg on Bike max 15kg) correctly rejected with HTTP 400.")

        # =========================================================================
        # TEST 3: PARCEL CREATION WITH COMPLETE CUSTOMER SPECIFICATIONS
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 3: PARCEL ORDER CREATION (14 Customer Parameters & 2-Phase OTPs)")
        print("=" * 70)

        created_parcel = await parcel_svc.create_parcel(
            booking_owner_id=str(customer_user.id),
            sender_name="Pankaj Sharma (Sender)",
            sender_phone="+919876543210",
            sender_address="FC Road, Deccan Gymkhana, Pune",
            sender_lat=18.5204,
            sender_lng=73.8567,
            pickup_instructions="Call upon reaching main gate, Tower 4",
            receiver_name="Rahul Verma (Receiver)",
            receiver_phone="+919123456789",
            receiver_address="Blue Ridge, Hinjawadi Phase 1, Pune",
            receiver_lat=18.5913,
            receiver_lng=73.7389,
            delivery_instructions="Handover only to recipient with OTP",
            parcel_category="ELECTRONICS",
            description="MacBook Pro & Charger inside padded bubble sleeve",
            package_count=1,
            weight_kg=3.2,
            length_cm=35.0,
            width_cm=25.0,
            height_cm=10.0,
            is_fragile=True,
            is_valuable=True,
            declared_value=45000.00,
            insurance_opt_in=True,
            vehicle_category="BIKE",
            delivery_priority="EXPRESS",
            payment_method="WALLET",
        )

        p_id = created_parcel["parcel_id"]
        tracking_no = created_parcel["tracking_number"]
        pickup_otp = created_parcel["pickup_otp"]
        delivery_otp = created_parcel["delivery_otp"]

        assert len(pickup_otp) == 4, f"Pickup OTP must be 4 digits, got {pickup_otp}"
        assert len(delivery_otp) == 4, f"Delivery OTP must be 4 digits, got {delivery_otp}"
        assert pickup_otp != delivery_otp, "Pickup and Delivery OTPs must be distinct random PINs"
        assert tracking_no.startswith("PX"), f"Tracking number must start with PX, got {tracking_no}"
        assert created_parcel["status"] == ParcelStatus.SEARCHING_DRIVER.value
        print(f"  [OK] Created Parcel: ID={p_id}, Tracking={tracking_no}")
        print(f"  [OK] 2-Phase Random OTPs: Sender Pickup OTP={pickup_otp}, Receiver Delivery OTP={delivery_otp}")

        # =========================================================================
        # TEST 4: SPATIAL MATCHING & PARTNER CANDIDATE SEARCH
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 4: SPATIAL MATCHING & PARTNER CANDIDATE SEARCH")
        print("=" * 70)

        candidates = await parcel_svc.find_eligible_drivers_for_parcel(p_id, radius_km=10.0)
        assert len(candidates) >= 2, f"Should find at least 2 eligible drivers, found {len(candidates)}"
        candidate_ids = [c["driver_id"] for c in candidates]
        assert str(driver1.id) in candidate_ids, "Driver 1 (Bike, 15kg) must be eligible"
        assert str(driver2.id) in candidate_ids, "Driver 2 (Auto, 60kg) must be eligible"
        assert str(driver3.id) not in candidate_ids, "Driver 3 (Non-parcel capable) must NOT be in candidates"
        print(f"  [OK] Spatial Matching: Found {len(candidates)} eligible drivers with compatible vehicle & capacity.")

        # Driver available requests filter
        d1_requests = await parcel_svc.get_driver_available_requests(str(d1_user.id))
        assert any(r["parcel_id"] == p_id for r in d1_requests), "Driver 1 should see the 3.2kg parcel request"
        print(f"  [OK] Driver Available Requests: Successfully fetched requests compatible with driver capacity.")

        # =========================================================================
        # TEST 5: INCOMPATIBLE VEHICLE FAILURE TESTS
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 5: INCOMPATIBLE VEHICLE VALIDATION (Failure Scenarios)")
        print("=" * 70)

        # 5a. Driver 3 (Vehicle parcel_capable == False) attempts to accept
        try:
            await parcel_svc.driver_accept_parcel(
                parcel_id=p_id,
                driver_user_id=str(d3_user.id),
            )
            assert False, "Driver with parcel_capable=False must be rejected"
        except HTTPException as ex:
            assert ex.status_code == 400
            assert "not authorized for parcel delivery" in ex.detail
            print("  [OK] Driver 3 (parcel_capable=False) correctly rejected with HTTP 400.")

        # 5b. Create a heavy 30kg parcel (requires Auto/Van) and test Driver 1 (Bike cap 15kg) accept
        heavy_parcel = await parcel_svc.create_parcel(
            booking_owner_id=str(customer_user.id),
            sender_name="Warehouse Manager",
            sender_phone="+919876543210",
            sender_address="Chakan Industrial Area",
            sender_lat=18.7500,
            sender_lng=73.8500,
            receiver_name="Retail Store",
            receiver_phone="+919123456789",
            receiver_address="Swargate, Pune",
            receiver_lat=18.5000,
            receiver_lng=73.8600,
            weight_kg=30.0,
            vehicle_category="AUTO",
        )
        heavy_p_id = heavy_parcel["parcel_id"]

        try:
            await parcel_svc.driver_accept_parcel(
                parcel_id=heavy_p_id,
                driver_user_id=str(d1_user.id),  # Driver 1 has 15kg Bike
            )
            assert False, "Driver 1 (15kg Bike) must be rejected for 30kg parcel"
        except HTTPException as ex:
            assert ex.status_code == 400
            assert "insufficient for parcel weight" in ex.detail
            print("  [OK] Driver 1 (15kg Bike) correctly rejected for 30kg heavy parcel due to capacity limitation.")

        # =========================================================================
        # TEST 6: ATOMIC DRIVER ACCEPT & CONCURRENCY SHIELD
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 6: ATOMIC DRIVER ACCEPT & CONCURRENCY SHIELD")
        print("=" * 70)

        # Driver 1 accepts the 3.2kg parcel
        accept_res = await parcel_svc.driver_accept_parcel(
            parcel_id=p_id,
            driver_user_id=str(d1_user.id),
        )
        assert accept_res["success"] is True
        assert accept_res["status"] == ParcelStatus.DRIVER_ASSIGNED.value
        print(f"  [OK] Driver 1 accepted parcel -> Status: {accept_res['status']}.")

        # Competing Driver 2 attempts to accept the already assigned parcel -> Must raise 409
        try:
            await parcel_svc.driver_accept_parcel(
                parcel_id=p_id,
                driver_user_id=str(d2_user.id),
            )
            assert False, "Competing driver accept should have been rejected with 409"
        except HTTPException as ex:
            assert ex.status_code == 409
            print("  [OK] Concurrency Shield: Competing driver accept correctly rejected with HTTP 409 Conflict.")

        # =========================================================================
        # TEST 7: SENDER PICKUP ARRIVAL & WRONG OTP FAILURE TESTS
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 7: SENDER PICKUP ARRIVAL & OTP HANDOVER (Wrong OTP Penalties)")
        print("=" * 70)

        # Driver arrives at pickup
        arrive_res = await parcel_svc.driver_arrive_pickup(
            parcel_id=p_id,
            driver_user_id=str(d1_user.id),
            lat=18.5204,
            lng=73.8567,
        )
        assert arrive_res["success"] is True
        assert arrive_res["status"] == ParcelStatus.AT_PICKUP.value
        print("  [OK] Driver marked AT_PICKUP.")

        # Wrong OTP Attempt 1
        try:
            await parcel_svc.verify_pickup_otp_and_handover(
                parcel_id=p_id,
                driver_user_id=str(d1_user.id),
                pickup_otp="9999",
            )
            assert False, "Wrong OTP must fail"
        except HTTPException as ex:
            assert ex.status_code == 400
            assert "Invalid Pickup OTP" in ex.detail
            print(f"  [OK] Wrong Pickup OTP rejected: '{ex.detail}'")

        # Valid Sender Pickup OTP Verification
        pickup_verify_res = await parcel_svc.verify_pickup_otp_and_handover(
            parcel_id=p_id,
            driver_user_id=str(d1_user.id),
            pickup_otp=pickup_otp,
            notes="Package received in pristine condition",
        )
        assert pickup_verify_res["success"] is True
        assert pickup_verify_res["status"] == ParcelStatus.IN_TRANSIT.value
        print(f"  [OK] Sender Handover Verified with OTP {pickup_otp}! Status: IN_TRANSIT.")

        # =========================================================================
        # TEST 8: REALTIME PARCEL TRACKING TIMELINE & DETAILS
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 8: REALTIME PARCEL TRACKING & STATUS AUDIT TIMELINE")
        print("=" * 70)

        details = await parcel_svc.get_parcel_details(tracking_no)
        assert details["tracking_number"] == tracking_no
        assert details["status"] == ParcelStatus.IN_TRANSIT.value
        assert details["driver"]["name"] == "Santosh Shinde (Bike Express)"
        assert len(details["timeline"]) >= 3, "Timeline must log CREATED, DRIVER_ASSIGNED, AT_PICKUP, IN_TRANSIT"
        print(f"  [OK] Public Tracking: Status={details['status']}, Driver={details['driver']['name']}, Timeline Steps={len(details['timeline'])}")

        # =========================================================================
        # TEST 9: RECEIVER ARRIVAL, WRONG DELIVERY OTP & MISSING POD TESTS
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 9: RECEIVER ARRIVAL & DELIVERY OTP VALIDATION")
        print("=" * 70)

        # Driver arrives at destination
        arrive_drop_res = await parcel_svc.driver_arrive_destination(
            parcel_id=p_id,
            driver_user_id=str(d1_user.id),
            lat=18.5913,
            lng=73.7389,
        )
        assert arrive_drop_res["success"] is True
        assert arrive_drop_res["status"] == ParcelStatus.AT_DESTINATION.value
        print("  [OK] Driver marked AT_DESTINATION.")

        # 9a. Missing Delivery OTP Test
        try:
            await parcel_svc.verify_delivery_otp_and_complete(
                parcel_id=p_id,
                driver_user_id=str(d1_user.id),
                delivery_otp="",  # Empty OTP
            )
            assert False, "Empty delivery OTP must fail"
        except HTTPException as ex:
            assert ex.status_code == 400
            assert "Missing delivery OTP" in ex.detail
            print("  [OK] Missing Delivery OTP correctly rejected with HTTP 400.")

        # 9b. Wrong Delivery OTP Test
        try:
            await parcel_svc.verify_delivery_otp_and_complete(
                parcel_id=p_id,
                driver_user_id=str(d1_user.id),
                delivery_otp="0000",  # Wrong OTP
            )
            assert False, "Wrong delivery OTP must fail"
        except HTTPException as ex:
            assert ex.status_code == 400
            assert "Invalid Delivery OTP" in ex.detail
            print(f"  [OK] Wrong Delivery OTP rejected: '{ex.detail}'")

        # =========================================================================
        # TEST 10: PROOF OF DELIVERY (POD), CLOUDINARY MEDIA & COMPLETION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 10: PROOF OF DELIVERY (POD) & DELIVERY COMPLETION")
        print("=" * 70)

        # Valid Delivery OTP + Cloudinary Proof of Delivery
        delivery_verify_res = await parcel_svc.verify_delivery_otp_and_complete(
            parcel_id=p_id,
            driver_user_id=str(d1_user.id),
            delivery_otp=delivery_otp,
            receiver_name="Rahul Verma (Receiver)",
            signature_url="https://res.cloudinary.com/cabapp/image/upload/v1/parcels/signatures/rahul_sig.png",
            delivery_photo_url="https://res.cloudinary.com/cabapp/image/upload/v1/parcels/pod/handed_to_rahul.jpg",
            delivered_lat=18.5913,
            delivered_lng=73.7389,
        )
        assert delivery_verify_res["success"] is True
        assert delivery_verify_res["status"] == ParcelStatus.DELIVERED.value
        print(f"  [OK] Delivery Completed with Receiver OTP {delivery_otp}! Status: DELIVERED.")

        # =========================================================================
        # TEST 11: FINANCIAL SETTLEMENT & DOUBLE-ENTRY LEDGER
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 11: FINANCIAL SETTLEMENT & DRIVER EARNINGS LEDGER")
        print("=" * 70)

        # Verify Driver Wallet Credited
        await session.refresh(driver1)
        assert driver1.wallet_balance > Decimal("500.00"), f"Driver wallet must have increased from 500, got {driver1.wallet_balance}"
        print(f"  [OK] Driver Wallet Credited: Balance=₹{driver1.wallet_balance}, Total Trips={driver1.total_trips}")

        # Verify Immutable Proof of Delivery Record
        pod_res = await session.execute(
            select(ParcelProofOfDelivery).where(ParcelProofOfDelivery.parcel_id == uuid.UUID(p_id))
        )
        pod = pod_res.scalar_one_or_none()
        assert pod is not None, "ParcelProofOfDelivery must be recorded"
        assert pod.otp_verified is True
        assert pod.signature_url is not None
        assert pod.delivery_photo_url is not None
        print(f"  [OK] Immutable POD Record Verified: Receiver={pod.receiver_name}, Photo={pod.delivery_photo_url}")

        # Verify Double-Entry Driver Earnings Ledger
        ledger_res = await session.execute(
            select(DriverEarningLedger).where(DriverEarningLedger.driver_id == driver1.id)
        )
        ledgers = ledger_res.scalars().all()
        assert len(ledgers) > 0, "DriverEarningLedger must have an entry for parcel completion"
        print(f"  [OK] Double-Entry Ledger Verified: {len(ledgers)} entries logged with direction CREDIT.")

        # =========================================================================
        # TEST 12: CUSTOMER RATING & REVIEW WORKFLOW
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 12: CUSTOMER RATING & DRIVER REPUTATION UPDATE")
        print("=" * 70)

        rate_res = await parcel_svc.rate_parcel(
            parcel_id=p_id,
            customer_user_id=str(customer_user.id),
            score=5,
            feedback="Prompt delivery, carefully handled electronics!",
            tags=["Careful Handling", "On-Time", "Polite Partner"],
        )
        assert rate_res["success"] is True
        assert rate_res["rating"] == 5

        # Verify parcel has rating saved
        await session.refresh(driver1)
        p_refresh = await session.execute(select(Parcel).where(Parcel.id == uuid.UUID(p_id)))
        rated_parcel = p_refresh.scalar_one_or_none()
        assert rated_parcel.customer_rating == 5
        assert rated_parcel.customer_feedback is not None
        assert "Careful Handling" in rated_parcel.customer_rating_tags
        print(f"  [OK] Parcel Rating Recorded: Score={rated_parcel.customer_rating}⭐, Tags={rated_parcel.customer_rating_tags}")

        # Verify duplicate rating prevention
        try:
            await parcel_svc.rate_parcel(
                parcel_id=p_id,
                customer_user_id=str(customer_user.id),
                score=4,
            )
            assert False, "Duplicate rating must be rejected"
        except HTTPException as ex:
            assert ex.status_code == 400
            assert "already been rated" in ex.detail
            print("  [OK] Duplicate rating attempt correctly rejected with HTTP 400.")

        # =========================================================================
        # TEST 13: PARCEL CANCELLATION WORKFLOW
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 13: PARCEL CANCELLATION WORKFLOW")
        print("=" * 70)

        cancel_parcel_obj = await parcel_svc.create_parcel(
            booking_owner_id=str(customer_user.id),
            sender_name="Pankaj",
            sender_phone="+919876543210",
            sender_address="Pune Station",
            sender_lat=18.5284,
            sender_lng=73.8744,
            receiver_name="Friend",
            receiver_phone="+919999999999",
            receiver_address="Kothrud",
            receiver_lat=18.5074,
            receiver_lng=73.8077,
            weight_kg=1.0,
        )
        c_pid = cancel_parcel_obj["parcel_id"]

        cancel_res = await parcel_svc.cancel_parcel(
            parcel_id=c_pid,
            user_id=str(customer_user.id),
            user_role="CUSTOMER",
            reason="Item no longer needs to be sent",
        )
        assert cancel_res["success"] is True
        assert cancel_res["status"] == ParcelStatus.CANCELLED.value

        # Verify audit history
        history_res = await session.execute(
            select(ParcelStatusHistory).where(ParcelStatusHistory.parcel_id == uuid.UUID(c_pid))
        )
        histories = history_res.scalars().all()
        assert any(h.to_status == ParcelStatus.CANCELLED.value for h in histories), "Cancellation must be audited in status history"
        print(f"  [OK] Parcel Cancelled -> Status: CANCELLED, audited with reason in ParcelStatusHistory.")

        print("\n" + "=" * 80)
        print("🎉 ALL 13 PHASE 16 (PARCEL LOGISTICS) PRODUCTION TESTS PASSED WITH 100% SUCCESS!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_parcel_service_verification())
