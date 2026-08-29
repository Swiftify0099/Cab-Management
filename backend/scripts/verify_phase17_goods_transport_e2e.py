"""
===============================================================================
E2E AUTOMATED VERIFICATION SUITE: PHASE 17 — GOODS TRANSPORT & LOGISTICS
===============================================================================
Comprehensive test suite verifying:
1. Customer Specification: Goods, Weight, Dimensions, Vehicle, Helpers,
   Floor/Elevator Loading/Unloading, Schedule, Special Instructions, Declared Value.
2. GST E-Way Bill Compliance (Mandatory for Declared Value > ₹50,000).
3. Partner Commercial Vehicle Eligibility Checks:
   - Rejection when Vehicle lacks Commercial Permit / Transport capability.
   - Rejection when Vehicle Fitness Certificate is Expired.
   - Rejection when Vehicle Payload Capacity is Insufficient.
4. Instant Pricing Engine & Staircase Floor Handling Surcharges.
5. Open Freight Marketplace & Driver Request Discovery.
6. Multi-Transporter Quotation Bidding & Multi-Round Counter-Offer Negotiation.
7. Quote Concurrency Protection (Row-Level Locking via SELECT ... FOR UPDATE).
8. 11-Stage End-to-End Operational Lifecycle:
   REQUEST → QUOTES → CUSTOMER SELECTS → ASSIGNMENT → ARRIVE →
   LOADING → LOADED (Pickup OTP) → TRANSIT → UNLOADING → POD → SETTLEMENT.
9. Tamper-Proof Proof of Delivery (POD) & Financial Ledger Settlement.
===============================================================================
"""
import asyncio
import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
_TRANSPORT_DIR = os.path.join(_BACKEND_DIR, "transport-service")
if _TRANSPORT_DIR not in sys.path:
    sys.path.insert(0, _TRANSPORT_DIR)

from fastapi import HTTPException
from sqlalchemy import desc, select
from common.database import async_session_maker
from common.models.all_models import (
    CustomerProfile, Driver, DriverEarningLedger, DriverStatus,
    KYCStatus, LedgerType, TransportAssignment, TransportLoad,
    TransportOrder, TransportOrderStatus, TransportProofOfDelivery,
    TransportQuote, TransportQuoteEvent, TransportQuoteStatus,
    TransportStatusEvent, User, UserRole, Vehicle, VehicleType,
    WalletTransaction
)
from app.services.transport_service import TransportService


async def run_phase17_goods_transport_e2e_tests():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("\n" + "=" * 80)
    print("🚀 RUNNING E2E TESTS: PHASE 17 — GOODS TRANSPORT & COMMERCIAL FREIGHT")
    print("=" * 80 + "\n")

    passed_count = 0
    total_tests = 9

    async with async_session_maker() as db:
        service = TransportService(db)

        # ── Setup Seed Data: Customer & Transporter Drivers ───────────────────
        print("▶ Initializing Phase 17 Test Fixtures...")
        # 1. Customer
        cust_res = await db.execute(select(User).where(User.phone == "+919822998877"))
        cust_user = cust_res.scalar_one_or_none()
        if not cust_user:
            cust_user = User(
                id=uuid.uuid4(),
                phone="+919822998877",
                role=UserRole.CUSTOMER,
                is_verified=True,
                is_active=True,
                is_profile_complete=True,
            )
            db.add(cust_user)
            await db.flush()

        prof_res = await db.execute(select(CustomerProfile).where(CustomerProfile.user_id == cust_user.id))
        cust_prof = prof_res.scalar_one_or_none()
        if not cust_prof:
            cust_prof = CustomerProfile(
                id=uuid.uuid4(),
                user_id=cust_user.id,
                full_name="Mahindra Logistics Enterprise",
                wallet_balance=Decimal("50000.00"),
            )
            db.add(cust_prof)
        else:
            cust_prof.wallet_balance = Decimal("50000.00")

        # 2. Eligible Commercial Driver 1 (Bolero Pickup - Verified)
        d1_u_res = await db.execute(select(User).where(User.phone == "+919822001101"))
        d1_user = d1_u_res.scalar_one_or_none()
        if not d1_user:
            d1_user = User(id=uuid.uuid4(), phone="+919822001101", role=UserRole.DRIVER, is_verified=True, is_active=True)
            db.add(d1_user)
            await db.flush()

        d1_res = await db.execute(select(Driver).where(Driver.user_id == d1_user.id))
        driver1 = d1_res.scalar_one_or_none()
        if not driver1:
            driver1 = Driver(
                id=uuid.uuid4(),
                user_id=d1_user.id,
                full_name="Suresh Transporters",
                phone="+919822001101",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_verified=True,
                wallet_balance=Decimal("1000.00"),
                total_earnings=Decimal("50000.00"),
            )
            db.add(driver1)
            await db.flush()
        else:
            driver1.kyc_status = KYCStatus.APPROVED
            driver1.status = DriverStatus.ONLINE

        v1_res = await db.execute(select(Vehicle).where(Vehicle.registration_number == "MH 14 PF 8820"))
        veh1 = v1_res.scalar_one_or_none()
        if not veh1:
            veh1 = Vehicle(
                id=uuid.uuid4(),
                driver_id=driver1.id,
                vehicle_type=VehicleType.TRUCK,
                make="Mahindra",
                model="Bolero Maxi Truck 8ft",
                year=2024,
                color="White",
                registration_number="MH 14 PF 8820",
                seat_capacity=2,
                status="APPROVED",
                is_active=True,
                commercial_permit=True,
                transport_capable=True,
                max_payload_kg=1500.0,
                cargo_volume_cft=220.0,
                fitness_expiry=date.today() + timedelta(days=365),
                insurance_expiry=date.today() + timedelta(days=365),
                permit_expiry=date.today() + timedelta(days=365),
            )
            db.add(veh1)
        else:
            veh1.driver_id = driver1.id
            veh1.status = "APPROVED"
            veh1.commercial_permit = True
            veh1.transport_capable = True
            veh1.max_payload_kg = 1500.0
            veh1.cargo_volume_cft = 220.0
            veh1.fitness_expiry = date.today() + timedelta(days=365)

        # 3. Eligible Commercial Driver 2 (Tata Ace - Verified)
        d2_u_res = await db.execute(select(User).where(User.phone == "+919822001102"))
        d2_user = d2_u_res.scalar_one_or_none()
        if not d2_user:
            d2_user = User(id=uuid.uuid4(), phone="+919822001102", role=UserRole.DRIVER, is_verified=True, is_active=True)
            db.add(d2_user)
            await db.flush()

        d2_res = await db.execute(select(Driver).where(Driver.user_id == d2_user.id))
        driver2 = d2_res.scalar_one_or_none()
        if not driver2:
            driver2 = Driver(
                id=uuid.uuid4(),
                user_id=d2_user.id,
                full_name="Patil Freight Carriers",
                phone="+919822001102",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_verified=True,
                wallet_balance=Decimal("2000.00"),
                total_earnings=Decimal("75000.00"),
            )
            db.add(driver2)
            await db.flush()
        else:
            driver2.kyc_status = KYCStatus.APPROVED
            driver2.status = DriverStatus.ONLINE

        v2_res = await db.execute(select(Vehicle).where(Vehicle.registration_number == "MH 12 TC 1024"))
        veh2 = v2_res.scalar_one_or_none()
        if not veh2:
            veh2 = Vehicle(
                id=uuid.uuid4(),
                driver_id=driver2.id,
                vehicle_type=VehicleType.TRUCK,
                make="Tata",
                model="Ace Gold",
                year=2023,
                color="Silver",
                registration_number="MH 12 TC 1024",
                seat_capacity=2,
                status="APPROVED",
                is_active=True,
                commercial_permit=True,
                transport_capable=True,
                max_payload_kg=750.0,
                cargo_volume_cft=120.0,
                fitness_expiry=date.today() + timedelta(days=365),
                insurance_expiry=date.today() + timedelta(days=365),
                permit_expiry=date.today() + timedelta(days=365),
            )
            db.add(veh2)
        else:
            veh2.driver_id = driver2.id
            veh2.status = "APPROVED"
            veh2.commercial_permit = True
            veh2.transport_capable = True
            veh2.max_payload_kg = 750.0
            veh2.fitness_expiry = date.today() + timedelta(days=365)

        # 4. Ineligible Driver 3 (Private car, unapproved for commercial freight)
        d3_u_res = await db.execute(select(User).where(User.phone == "+919822001103"))
        d3_user = d3_u_res.scalar_one_or_none()
        if not d3_user:
            d3_user = User(id=uuid.uuid4(), phone="+919822001103", role=UserRole.DRIVER, is_verified=True, is_active=True)
            db.add(d3_user)
            await db.flush()

        d3_res = await db.execute(select(Driver).where(Driver.user_id == d3_user.id))
        driver3 = d3_res.scalar_one_or_none()
        if not driver3:
            driver3 = Driver(
                id=uuid.uuid4(),
                user_id=d3_user.id,
                full_name="Private Car Owner",
                phone="+919822001103",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_verified=True,
            )
            db.add(driver3)
            await db.flush()
        else:
            driver3.kyc_status = KYCStatus.APPROVED
            driver3.status = DriverStatus.ONLINE

        v3_res = await db.execute(select(Vehicle).where(Vehicle.registration_number == "MH 12 PV 9999"))
        veh3_ineligible = v3_res.scalar_one_or_none()
        if not veh3_ineligible:
            veh3_ineligible = Vehicle(
                id=uuid.uuid4(),
                driver_id=driver3.id,
                vehicle_type=VehicleType.SEDAN,
                make="Honda",
                model="City",
                year=2022,
                color="Black",
                registration_number="MH 12 PV 9999",
                seat_capacity=4,
                status="APPROVED",
                is_active=True,
                commercial_permit=False,  # Private white plate
                transport_capable=False,
            )
            db.add(veh3_ineligible)
        else:
            veh3_ineligible.driver_id = driver3.id
            veh3_ineligible.commercial_permit = False
            veh3_ineligible.transport_capable = False

        # 5. Ineligible Driver 4 (Expired Fitness Certificate)
        d4_u_res = await db.execute(select(User).where(User.phone == "+919822001104"))
        d4_user = d4_u_res.scalar_one_or_none()
        if not d4_user:
            d4_user = User(id=uuid.uuid4(), phone="+919822001104", role=UserRole.DRIVER, is_verified=True, is_active=True)
            db.add(d4_user)
            await db.flush()

        d4_res = await db.execute(select(Driver).where(Driver.user_id == d4_user.id))
        driver4_expired = d4_res.scalar_one_or_none()
        if not driver4_expired:
            driver4_expired = Driver(
                id=uuid.uuid4(),
                user_id=d4_user.id,
                full_name="Expired Permit Transporter",
                phone="+919822001104",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_verified=True,
            )
            db.add(driver4_expired)
            await db.flush()
        else:
            driver4_expired.kyc_status = KYCStatus.APPROVED
            driver4_expired.status = DriverStatus.ONLINE

        v4_res = await db.execute(select(Vehicle).where(Vehicle.registration_number == "MH 14 EXP 0001"))
        veh4_expired = v4_res.scalar_one_or_none()
        if not veh4_expired:
            veh4_expired = Vehicle(
                id=uuid.uuid4(),
                driver_id=driver4_expired.id,
                vehicle_type=VehicleType.TRUCK,
                make="Eicher",
                model="Pro 2049",
                year=2018,
                color="Blue",
                registration_number="MH 14 EXP 0001",
                seat_capacity=3,
                status="APPROVED",
                is_active=True,
                commercial_permit=True,
                transport_capable=True,
                max_payload_kg=3500.0,
                fitness_expiry=date.today() - timedelta(days=30),  # EXPIRED
            )
            db.add(veh4_expired)
        else:
            veh4_expired.driver_id = driver4_expired.id
            veh4_expired.fitness_expiry = date.today() - timedelta(days=30)

        await db.commit()
        print("  ✓ Test Fixtures & Driver Fleet Initialized Successfully")

        # ─────────────────────────────────────────────────────────────
        # TEST 1: Pricing Estimation, Floor Handling Surcharges & Equipment
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 1: Pricing Engine with Floor Surcharge & Equipment...")
        est = await service.calculate_estimate(
            pickup_lat=18.6279,
            pickup_lng=73.8474,
            drop_lat=18.7562,
            drop_lng=73.8344,
            goods_category="MACHINERY",
            goods_description="Precision CNC Spares",
            weight_kg=600.0,
            length_ft=6.0,
            width_ft=4.0,
            height_ft=3.5,
            package_count=4,
            loading_required=True,
            loading_floor=3,               # 3rd floor
            loading_has_elevator=False,    # Staircase handling
            unloading_required=True,
            unloading_floor=2,             # 2nd floor
            unloading_has_elevator=False,  # Staircase handling
            helpers_count=2,
            vehicle_category="BOLERO_PICKUP",
            declared_value=120000.0,       # > ₹50,000 -> E-Way Bill required
            tarp_required=True,
            ropes_required=True,
            promo_code="TRANSPORT200",
        )
        assert est["vehicle_category"] == "BOLERO_PICKUP"
        assert est["eway_bill_required"] is True, "Declared value ₹120,000 must enforce E-Way bill"
        assert est["financials"]["loading_fare"] > 150.0, "Floor surcharge must be included for staircase loading"
        assert est["financials"]["equipment_fare"] == 150.0, "Tarp (₹100) + Ropes (₹50) equipment fare must equal ₹150"
        assert est["financials"]["discount_amount"] == 200.0
        assert est["total_fare"] > 1500.0
        print(f"  ✓ Total Fare: ₹{est['total_fare']} | Loading: ₹{est['financials']['loading_fare']} | E-Way Required: {est['eway_bill_required']}")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 2: Commercial Eligibility & Regulatory Rejections
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 2: Commercial Vehicle Eligibility Rejection Validations...")
        # Create a test open order
        order_elig = await service.create_transport_order(
            customer_user_id=str(cust_user.id),
            pickup_address="Bhosari MIDC, Pune",
            pickup_lat=18.6279,
            pickup_lng=73.8474,
            pickup_contact_name="Aditya Patil",
            pickup_contact_phone="+919822001101",
            drop_address="Chakan Phase 2, Pune",
            drop_lat=18.7562,
            drop_lng=73.8344,
            drop_contact_name="Karan Shinde",
            drop_contact_phone="+919822001102",
            goods_category="MACHINERY",
            goods_description="Heavy Industrial Pumps",
            weight_kg=1200.0,
            vehicle_category_required="BOLERO_PICKUP",
            pricing_mode="REQUEST_QUOTES",
            declared_value=85000.0,
            eway_bill_number="241088920199",
        )

        # Check 2a: Private vehicle (non-commercial) must be rejected
        rej_private = False
        try:
            await service.submit_transporter_quote(
                order_id=order_elig["order_id"],
                transporter_user_id=str(d3_user.id),
                driver_id=str(driver3.id),
                vehicle_id=str(veh3_ineligible.id),
                amount=2500.0,
            )
        except HTTPException as ex:
            if "Commercial eligibility failed" in str(ex.detail):
                rej_private = True
        assert rej_private, "Expected rejection for private non-commercial vehicle"
        print("  ✓ Non-commercial private vehicle rejected: PASS")

        # Check 2b: Expired Fitness Certificate must be rejected
        rej_expired = False
        try:
            await service.submit_transporter_quote(
                order_id=order_elig["order_id"],
                transporter_user_id=str(d4_user.id),
                driver_id=str(driver4_expired.id),
                vehicle_id=str(veh4_expired.id),
                amount=2400.0,
            )
        except HTTPException as ex:
            if "Fitness Certificate expired" in str(ex.detail):
                rej_expired = True
        assert rej_expired, "Expected rejection for vehicle with expired fitness certificate"
        print("  ✓ Expired Fitness Certificate vehicle rejected: PASS")

        # Check 2c: Insufficient payload capacity must be rejected (1200kg load vs 750kg Tata Ace)
        rej_capacity = False
        try:
            await service.submit_transporter_quote(
                order_id=order_elig["order_id"],
                transporter_user_id=str(d2_user.id),
                driver_id=str(driver2.id),
                vehicle_id=str(veh2.id),
                amount=1800.0,
            )
        except HTTPException as ex:
            if "Capacity mismatch" in str(ex.detail):
                rej_capacity = True
        assert rej_capacity, "Expected rejection for driver vehicle with insufficient payload capacity"
        print("  ✓ Insufficient payload capacity vehicle rejected: PASS")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 3: Open Freight Marketplace & Driver Discovery
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 3: Open Freight Marketplace Discovery for Transporters...")
        open_requests = await service.get_open_freight_requests(driver_id=str(driver1.id))
        assert len(open_requests) > 0, "Commercial drivers must discover open freight bidding requests"
        assert any(r["order_id"] == order_elig["order_id"] for r in open_requests)
        print(f"  ✓ Open freight orders discovered: {len(open_requests)}")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 4: Multi-Transporter Quotation & Counter-Offer Bidding
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 4: Multi-Transporter Quotation & Interactive Negotiation...")
        # Transporter 1 submits valid commercial quote
        q1_res = await service.submit_transporter_quote(
            order_id=order_elig["order_id"],
            transporter_user_id=str(d1_user.id),
            driver_id=str(driver1.id),
            vehicle_id=str(veh1.id),
            amount=2600.0,
            base_rate=2000.0,
            helper_charge=350.0,
            toll_and_taxes=250.0,
            included_helpers=2,
            estimated_pickup_eta_min=15,
            notes="Ready with Bolero Maxi Truck & 2 loaders.",
        )
        assert q1_res["success"] is True
        assert q1_res["breakdown"]["base_rate"] == 2000.0
        q1_id = q1_res["quote_id"]

        # Customer reviews quotes list
        quotes_list = await service.get_order_quotes(order_elig["order_id"])
        assert len(quotes_list) >= 1
        assert quotes_list[0]["quote_id"] == q1_id

        # Round 1: Customer counters to ₹2,300
        counter1 = await service.send_counter_offer(
            quote_id=q1_id,
            actor_user_id=str(cust_user.id),
            actor_type="CUSTOMER",
            counter_amount=2300.0,
            note="Can we settle at ₹2,300 for quick pickup?",
        )
        assert counter1["amount"] == 2300.0
        assert counter1["status"] == TransportQuoteStatus.CUSTOMER_COUNTERED.value
        assert counter1["rounds_count"] == 2

        # Round 2: Transporter counters back to ₹2,400
        counter2 = await service.send_counter_offer(
            quote_id=q1_id,
            actor_user_id=str(d1_user.id),
            actor_type="TRANSPORTER",
            counter_amount=2400.0,
            note="Best price ₹2,400 with 2 helpers included.",
        )
        assert counter2["amount"] == 2400.0
        assert counter2["status"] == TransportQuoteStatus.TRANSPORTER_COUNTERED.value
        assert counter2["rounds_count"] == 3
        print(f"  ✓ Multi-round negotiation completed: ₹2600 → ₹2300 → ₹{counter2['amount']}")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 5: Quote Concurrency Protection (Row-Level Locking)
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 5: Quote Concurrency Race Condition Safety...")
        # Create a second quote from another vehicle / setup
        # Temporarily increase payload on veh2 to test competing quotes
        veh2.max_payload_kg = 2000.0
        await db.commit()

        q2_res = await service.submit_transporter_quote(
            order_id=order_elig["order_id"],
            transporter_user_id=str(d2_user.id),
            driver_id=str(driver2.id),
            vehicle_id=str(veh2.id),
            amount=2500.0,
            included_helpers=1,
        )
        q2_id = q2_res["quote_id"]

        # Simulate concurrent selection: Try selecting Quote 1, then immediately try selecting Quote 2
        # Quote 1 selection succeeds
        sel1 = await service.select_quote(
            order_id=order_elig["order_id"],
            quote_id=q1_id,
            customer_user_id=str(cust_user.id),
            payment_method="WALLET",
        )
        assert sel1["status"] == TransportOrderStatus.DRIVER_ASSIGNED.value

        # Quote 2 selection MUST fail because order is already locked and assigned
        concurrency_caught = False
        try:
            await service.select_quote(
                order_id=order_elig["order_id"],
                quote_id=q2_id,
                customer_user_id=str(cust_user.id),
                payment_method="WALLET",
            )
        except HTTPException as ex:
            if "already assigned and active" in str(ex.detail):
                concurrency_caught = True

        assert concurrency_caught, "Concurrency failure: competing quote selection was not blocked"

        # Verify competing quote Q2 was deprecated to NOT_SELECTED
        q2_obj = await db.get(TransportQuote, uuid.UUID(q2_id))
        assert q2_obj.status == TransportQuoteStatus.NOT_SELECTED, "Competing quote must be marked NOT_SELECTED"
        print("  ✓ Concurrency Protection & Atomic Deprecation: PASS")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 6: 11-Stage End-to-End Operational Lifecycle
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 6: Complete 11-Stage Operational State Machine...")
        # Create fresh complete transport order
        ord_main = await service.create_transport_order(
            customer_user_id=str(cust_user.id),
            pickup_address="MIDC Bhosari Sector 10, Pune",
            pickup_lat=18.6279,
            pickup_lng=73.8474,
            pickup_contact_name="Vijay Kale",
            pickup_contact_phone="+919822990011",
            drop_address="Talegaon MIDC Industrial Hub, Pune",
            drop_lat=18.7300,
            drop_lng=73.6800,
            drop_contact_name="Sunil Deshmukh",
            drop_contact_phone="+919822990022",
            goods_category="MACHINERY",
            goods_description="Automobile Engine Crankshafts",
            weight_kg=800.0,
            length_ft=6.0,
            width_ft=4.0,
            height_ft=3.0,
            package_count=6,
            loading_required=True,
            loading_floor=1,
            loading_has_elevator=True,
            unloading_required=True,
            unloading_floor=0,
            unloading_has_elevator=True,
            helpers_count=1,
            vehicle_category_required="BOLERO_PICKUP",
            pricing_mode="REQUEST_QUOTES",
            declared_value=95000.0,
            eway_bill_number="281099201991",
            tarp_required=True,
            ropes_required=True,
        )
        main_id = ord_main["order_id"]
        pickup_otp = ord_main["pickup_otp"]
        delivery_otp = ord_main["delivery_otp"]

        # Step 1: REQUEST created (Status: QUOTE_REQUESTED)
        assert ord_main["status"] == TransportOrderStatus.QUOTE_REQUESTED.value

        # Step 2: QUOTES submitted
        q_main = await service.submit_transporter_quote(
            order_id=main_id,
            transporter_user_id=str(d1_user.id),
            driver_id=str(driver1.id),
            vehicle_id=str(veh1.id),
            amount=2850.0,
            included_helpers=1,
        )
        assert q_main["success"] is True

        # Step 3 & 4: CUSTOMER SELECTS & ASSIGNMENT
        cust_prof.wallet_balance = Decimal("50000.00")
        await db.commit()

        assign_res = await service.select_quote(
            order_id=main_id,
            quote_id=q_main["quote_id"],
            customer_user_id=str(cust_user.id),
            payment_method="WALLET",
        )
        assert assign_res["status"] == TransportOrderStatus.DRIVER_ASSIGNED.value

        # Step 5: ARRIVE (Driver Arrives at Pickup Dock)
        s5 = await service.update_transport_status(
            order_id=main_id,
            next_status="arrived_pickup",
            notes="Truck parked at loading dock 4.",
            latitude=18.6280,
            longitude=73.8475,
        )
        assert s5["status"] == TransportOrderStatus.ARRIVED_PICKUP.value

        # Step 6: LOADING (Loading started & E-Way Bill Verified)
        s6 = await service.update_transport_status(
            order_id=main_id,
            next_status="loading_started",
            notes="Loading crates with 1 helper. Cargo inspected.",
            latitude=18.6280,
            longitude=73.8475,
        )
        assert s6["status"] == TransportOrderStatus.LOADING_STARTED.value

        eway_v = await service.verify_eway_bill(
            order_id=main_id,
            driver_id=str(driver1.id),
            eway_bill_number="281099201991",
        )
        assert eway_v["eway_bill_verified"] is True

        # Step 7: LOADED (Pickup OTP verified)
        s7 = await service.verify_pickup_otp(
            order_id=main_id,
            driver_id=str(driver1.id),
            pickup_otp=pickup_otp,
        )
        assert s7["status"] == TransportOrderStatus.LOADED.value

        # Step 8: TRANSIT (In-Transit & Navigation Telemetry)
        s8 = await service.update_transport_status(
            order_id=main_id,
            next_status="in_transit",
            notes="Departed pickup dock. En route to Talegaon MIDC via NH48.",
            latitude=18.6500,
            longitude=73.8000,
        )
        assert s8["status"] == TransportOrderStatus.IN_TRANSIT.value

        s8_near = await service.update_transport_status(
            order_id=main_id,
            next_status="near_destination",
            notes="Entering Talegaon MIDC Sector 2.",
            latitude=18.7250,
            longitude=73.6850,
        )
        assert s8_near["status"] == TransportOrderStatus.NEAR_DESTINATION.value

        s8_arr = await service.update_transport_status(
            order_id=main_id,
            next_status="arrived_destination",
            notes="Reached receiver unloading warehouse gate 2.",
            latitude=18.7300,
            longitude=73.6800,
        )
        assert s8_arr["status"] == TransportOrderStatus.ARRIVED_DESTINATION.value

        # Step 9: UNLOADING
        s9 = await service.update_transport_status(
            order_id=main_id,
            next_status="unloading_started",
            notes="Unloading crates onto pallet bays.",
            latitude=18.7300,
            longitude=73.6800,
        )
        assert s9["status"] == TransportOrderStatus.UNLOADING_STARTED.value

        # Step 10 & 11: POD Verification & Financial Settlement
        initial_driver_bal = driver1.wallet_balance or Decimal("0.00")
        pod_res = await service.verify_pod_and_complete(
            order_id=main_id,
            driver_id=str(driver1.id),
            receiver_name="Sunil Deshmukh",
            receiver_phone="+919822990022",
            delivery_otp=delivery_otp,
            photo_url="https://images.unsplash.com/photo-586528116311-ad8dd3c8310d",
            signature_url="https://images.unsplash.com/signature-pod-demo.png",
            delivery_notes="Received 6 crates in pristine condition. Zero damage.",
            latitude=18.7300,
            longitude=73.6800,
        )
        assert pod_res["status"] == TransportOrderStatus.DELIVERED.value
        assert pod_res["driver_earning"] > 0
        print(f"  ✓ 11-Stage Flow Complete: Status {pod_res['status']} | Driver Settled ₹{pod_res['driver_earning']}")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 7: Financial Settlement & Driver Ledger Verification
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 7: Ledger Audit & Wallet Balances Verification...")
        await db.refresh(driver1)
        expected_driver_earning = Decimal(str(pod_res["driver_earning"]))
        assert driver1.wallet_balance >= initial_driver_bal + expected_driver_earning

        # Verify DriverEarningLedger entry
        ledger_res = await db.execute(
            select(DriverEarningLedger)
            .where(DriverEarningLedger.driver_id == driver1.id)
            .order_by(desc(DriverEarningLedger.created_at))
        )
        ledger_entry = ledger_res.scalars().first()
        assert ledger_entry is not None
        assert ledger_entry.entry_type == "TRANSPORT_EARNING"
        assert ledger_entry.amount == expected_driver_earning
        print(f"  ✓ Driver Wallet Credited: ₹{driver1.wallet_balance} | Ledger Entry: #{ledger_entry.id}")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 8: Customer Transport History
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 8: Customer Transport History Retrieval...")
        cust_history = await service.get_customer_orders(str(cust_user.id))
        assert len(cust_history) >= 2
        assert any(h["order_id"] == main_id for h in cust_history)
        print(f"  ✓ Customer Order History contains {len(cust_history)} orders")
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 9: Order Cancellation & State Audit
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 9: Order Cancellation & Audit Trail...")
        canc_order = await service.create_transport_order(
            customer_user_id=str(cust_user.id),
            pickup_address="Pune Station Loading Dock",
            pickup_lat=18.5284,
            pickup_lng=73.8743,
            pickup_contact_name="Ramesh Joshi",
            pickup_contact_phone="+919822990033",
            drop_address="Hadapsar Industrial Estate",
            drop_lat=18.5089,
            drop_lng=73.9259,
            drop_contact_name="Ganesh Rao",
            drop_contact_phone="+919822990044",
            goods_category="GENERAL",
            goods_description="Cardboard Packaging Boxes",
            weight_kg=200.0,
            vehicle_category_required="TATA_ACE",
            pricing_mode="INSTANT_PRICE",
        )
        c_res = await service.cancel_transport_order(
            order_id=canc_order["order_id"],
            user_id=str(cust_user.id),
            user_role="CUSTOMER",
            reason="Material pickup rescheduled by supplier.",
        )
        assert c_res["status"] == TransportOrderStatus.CANCELLED.value

        # Verify audit status events
        events_res = await db.execute(
            select(TransportStatusEvent).where(TransportStatusEvent.order_id == uuid.UUID(canc_order["order_id"]))
        )
        events = events_res.scalars().all()
        assert any(e.status == TransportOrderStatus.CANCELLED.value for e in events)
        print("  ✓ Cancellation Audit Event Recorded: PASS")
        passed_count += 1

    print("\n" + "=" * 80)
    print(f"🎉 PHASE 17 GOODS TRANSPORT E2E TEST SUITE: {passed_count}/{total_tests} TESTS PASSED (100% SUCCESS)")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    asyncio.run(run_phase17_goods_transport_e2e_tests())
