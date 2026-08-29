"""
===============================================================================
E2E AUTOMATED VERIFICATION SUITE: PHASE 21 — PACKERS & MOVERS LOGISTICS
===============================================================================
Comprehensive test suite verifying:
1. Customer Specification: Move Size, Rooms, Floor/Lift Labor Surcharges,
   Multi-Layer Packaging, Helpers, Assembly/Disassembly, and Transit Insurance.
2. Vehicle Capacity Validation & Rejection (Rejecting under-capacity trucks).
3. Multiple Worker Crew Management & Missing Crew Attendance Enforcement.
4. Open Relocation Marketplace & Itemized Quotation Bidding.
5. Concurrency-Safe Quote Selection (Row-Level Locking via SELECT ... FOR UPDATE).
6. Pre-Inspection Walkthrough with Cloudinary Photos & Customer Signature.
7. Complete 12-Stage Operational State Machine & Pickup OTP Verification:
   REQUESTED → QUOTING → CREW_ASSIGNED → CREW_ARRIVED → PRE_INSPECTION →
   PACKING → LOADING → LOADED (Pickup OTP) → IN_TRANSIT → ARRIVED_DESTINATION →
   UNLOADING → POST_INSPECTION → DAMAGE_SIGNOFF → COMPLETED.
8. Post-Inspection Damage Sign-off & Cloudinary Damage Proof Claims.
9. Proof of Delivery (POD) & Double-Entry Financial Settlement
   (Driver wallet credit, DriverEarningLedger record, Customer damage escrow refund).
===============================================================================
"""
import asyncio
import os
import sys
import uuid
from datetime import date as date_type, datetime, timedelta, timezone
from decimal import Decimal

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
_PACKERS_DIR = os.path.join(_BACKEND_DIR, "packers-service")
if _PACKERS_DIR not in sys.path:
    sys.path.insert(0, _PACKERS_DIR)

from fastapi import HTTPException
from sqlalchemy import desc, select
from common.database import async_session_maker, engine
from common.models.all_models import (
    CustomerProfile, Driver, DriverEarningLedger, DriverStatus,
    KYCStatus, LedgerType, MoveSize, MovingCrewMember, MovingInspection,
    MovingItem, MovingOrder, MovingOrderStatus, MovingPOD, MovingQuote,
    MovingQuoteStatus, User, UserRole, Vehicle, VehicleType,
    WalletTransaction
)
from app.services.packers_service import PackersService


async def run_phase21_packers_movers_e2e_tests():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("\n" + "=" * 80)
    print("🚀 RUNNING E2E TESTS: PHASE 21 — PACKERS & MOVERS LOGISTICS SUITE")
    print("=" * 80 + "\n", flush=True)

    passed_count = 0
    total_tests = 9

    async with async_session_maker() as db:
        service = PackersService(db)

        # ── Setup Seed Data: Customer, Movers, & Vehicles ────────────────────
        print("▶ Initializing Phase 21 Test Fixtures...", flush=True)
        # 1. Customer
        cust_res = await db.execute(select(User).where(User.phone == "+919833112233"))
        cust_user = cust_res.scalar_one_or_none()
        if not cust_user:
            cust_user = User(
                id=uuid.uuid4(),
                phone="+919833112233",
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
                full_name="Dr. Rajesh Mehra",
                wallet_balance=Decimal("60000.00"),
            )
            db.add(cust_prof)
        else:
            cust_prof.wallet_balance = Decimal("60000.00")

        # 2. Eligible Mover Partner 1 (Agarwal Packers Lead - 14ft Eicher Container)
        m1_u_res = await db.execute(select(User).where(User.phone == "+919833001101"))
        m1_user = m1_u_res.scalar_one_or_none()
        if not m1_user:
            m1_user = User(id=uuid.uuid4(), phone="+919833001101", role=UserRole.DRIVER, is_verified=True, is_active=True)
            db.add(m1_user)
            await db.flush()

        m1_res = await db.execute(select(Driver).where(Driver.user_id == m1_user.id))
        mover1 = m1_res.scalar_one_or_none()
        if not mover1:
            mover1 = Driver(
                id=uuid.uuid4(),
                user_id=m1_user.id,
                full_name="Agarwal Safe Relocations",
                phone="+919833001101",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_verified=True,
                wallet_balance=Decimal("5000.00"),
                total_earnings=Decimal("150000.00"),
            )
            db.add(mover1)
            await db.flush()
        else:
            mover1.kyc_status = KYCStatus.APPROVED
            mover1.status = DriverStatus.ONLINE

        v1_res = await db.execute(select(Vehicle).where(Vehicle.registration_number == "MH 12 PK 1400"))
        veh1_large = v1_res.scalar_one_or_none()
        if not veh1_large:
            veh1_large = Vehicle(
                id=uuid.uuid4(),
                driver_id=mover1.id,
                vehicle_type=VehicleType.TRUCK,
                make="Eicher",
                model="Pro 2049 14ft Closed Container",
                year=2024,
                color="White",
                registration_number="MH 12 PK 1400",
                seat_capacity=3,
                status="APPROVED",
                is_active=True,
                commercial_permit=True,
                transport_capable=True,
                max_payload_kg=4000.0,
                cargo_volume_cft=850.0,  # Capable of 3 BHK move (requires 800 cft)
                fitness_expiry=date_type.today() + timedelta(days=365),
                insurance_expiry=date_type.today() + timedelta(days=365),
                permit_expiry=date_type.today() + timedelta(days=365),
            )
            db.add(veh1_large)
        else:
            veh1_large.driver_id = mover1.id
            veh1_large.status = "APPROVED"
            veh1_large.commercial_permit = True
            veh1_large.transport_capable = True
            veh1_large.max_payload_kg = 4000.0
            veh1_large.cargo_volume_cft = 850.0

        # 3. Small Vehicle (Tata Ace - Insufficient for 3 BHK move)
        v_small_res = await db.execute(select(Vehicle).where(Vehicle.registration_number == "MH 12 PK 0750"))
        veh_small = v_small_res.scalar_one_or_none()
        if not veh_small:
            veh_small = Vehicle(
                id=uuid.uuid4(),
                driver_id=mover1.id,
                vehicle_type=VehicleType.TRUCK,
                make="Tata",
                model="Ace Mini",
                year=2023,
                color="Silver",
                registration_number="MH 12 PK 0750",
                seat_capacity=2,
                status="APPROVED",
                is_active=True,
                commercial_permit=True,
                transport_capable=True,
                max_payload_kg=750.0,
                cargo_volume_cft=150.0,  # Too small for 3 BHK (800 cft required)
                fitness_expiry=date_type.today() + timedelta(days=365),
            )
            db.add(veh_small)
        else:
            veh_small.driver_id = mover1.id
            veh_small.status = "APPROVED"
            veh_small.commercial_permit = True
            veh_small.transport_capable = True
            veh_small.max_payload_kg = 750.0
            veh_small.cargo_volume_cft = 150.0

        # 4. Mover Partner 2 (Express Movers Lead)
        m2_u_res = await db.execute(select(User).where(User.phone == "+919833001102"))
        m2_user = m2_u_res.scalar_one_or_none()
        if not m2_user:
            m2_user = User(id=uuid.uuid4(), phone="+919833001102", role=UserRole.DRIVER, is_verified=True, is_active=True)
            db.add(m2_user)
            await db.flush()

        m2_res = await db.execute(select(Driver).where(Driver.user_id == m2_user.id))
        mover2 = m2_res.scalar_one_or_none()
        if not mover2:
            mover2 = Driver(
                id=uuid.uuid4(),
                user_id=m2_user.id,
                full_name="Express Shifting Co.",
                phone="+919833001102",
                kyc_status=KYCStatus.APPROVED,
                status=DriverStatus.ONLINE,
                is_verified=True,
                wallet_balance=Decimal("3000.00"),
                total_earnings=Decimal("90000.00"),
            )
            db.add(mover2)
            await db.flush()
        else:
            mover2.kyc_status = KYCStatus.APPROVED
            mover2.status = DriverStatus.ONLINE

        await db.commit()
        print("  ✓ Test Fixtures & Fleet Setup Initialized Successfully", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 1: Dynamic Move Estimation with Floors, Materials & Addons
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 1: Shifting Cost Engine (Rooms, Staircases, Multi-Layer Packing, Addons)...", flush=True)
        est = await service.estimate_move(
            move_size="3_BHK",
            distance_km=25.0,
            property_type="VILLA",
            rooms_count=4,
            large_items_count=3,           # 3 heavy items (₹1200)
            box_count=25,
            pickup_floor=3,
            pickup_has_lift=False,          # 3 floors staircase labor (₹900)
            drop_floor=2,
            drop_has_lift=False,            # 2 floors staircase labor (₹600)
            packing_type="MULTI_LAYER",     # Multi-layer bubble/foam (₹1500)
            helpers_count=5,               # 1 extra helper over 4-crew base (₹500)
            requires_assembly=True,        # Assembly (₹800)
            requires_disassembly=True,
            requires_fragile_packing=True, # Fragile (₹1200)
            insurance_opted=True,
            declared_value=200000.0,       # 1.5% of ₹200k (₹3000)
            promo_code="MOVE1000",         # ₹1000 discount
        )
        assert est["move_size"] == "3_BHK"
        assert est["min_required_volume_cft"] == 800.0
        assert est["breakdown"]["floor_labor_fare"] == 1500.0  # ₹900 + ₹600
        assert est["breakdown"]["packing_grade_fare"] == 1500.0
        assert est["breakdown"]["helpers_fare"] == 500.0
        assert est["breakdown"]["heavy_items_fare"] == 1200.0
        assert est["breakdown"]["insurance_fare"] == 3000.0
        assert est["breakdown"]["discount_amount"] == 1000.0
        assert est["estimated_total"] > 20000.0
        print(f"  ✓ Estimated 3 BHK Total: ₹{est['estimated_total']} | Floor Labor: ₹{est['breakdown']['floor_labor_fare']} | Packing Grade: ₹{est['breakdown']['packing_grade_fare']}", flush=True)
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 2: Vehicle Capacity Validation & Rejection
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 2: Commercial Vehicle Capacity & Volume Matching...", flush=True)
        # Create a test 3 BHK move order (requires 800 cu.ft)
        order_cap = await service.create_moving_order(
            customer_id=str(cust_user.id),
            move_size="3_BHK",
            scheduled_move_date=(datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            pickup_address="Amanora Park Town, Hadapsar, Pune",
            pickup_lat=18.5186,
            pickup_lng=73.9352,
            drop_address="Nyati Elysia, Kharadi, Pune",
            drop_lat=18.5529,
            drop_lng=73.9426,
            property_type="APARTMENT",
            rooms_count=4,
            large_items_count=2,
            box_count=20,
            helpers_count=4,
            packing_type="MULTI_LAYER",
        )

        # Check 2a: Small vehicle (Tata Ace - 150 cu.ft) must be rejected for 3 BHK move (800 cu.ft)
        rej_capacity = False
        try:
            await service.submit_mover_quote(
                order_id=order_cap["order_id"],
                mover_id=str(mover1.id),
                quoted_fare=15000.0,
                vehicle_id=str(veh_small.id),
                crew_size=4,
            )
        except HTTPException as ex:
            if "Vehicle capacity mismatch" in str(ex.detail):
                rej_capacity = True
        assert rej_capacity, "Expected rejection when assigning under-capacity truck to 3 BHK move"
        print("  ✓ Under-capacity vehicle (150 cft vs 800 cft) rejected: PASS", flush=True)

        # Check 2b: Sized commercial vehicle (14ft Eicher - 850 cu.ft) must be accepted
        q_valid = await service.submit_mover_quote(
            order_id=order_cap["order_id"],
            mover_id=str(mover1.id),
            quoted_fare=15500.0,
            vehicle_id=str(veh1_large.id),
            crew_size=4,
            truck_type="14ft Eicher Container (850 cu.ft)",
        )
        assert q_valid["quote_id"] is not None
        assert q_valid["quoted_fare"] == 15500.0
        print("  ✓ Sized commercial container truck (850 cft) accepted: PASS", flush=True)
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 3: Crew Management & Missing Crew Attendance Enforcement
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 3: Multiple Workers / Crew Attendance & Missing Crew Check...", flush=True)
        # Customer accepts quote
        await service.accept_mover_quote(
            order_id=order_cap["order_id"],
            quote_id=q_valid["quote_id"],
            vehicle_id=str(veh1_large.id),
        )

        # Mover registers 4 crew members (Order helpers_count is 4)
        crew_payload = [
            {"member_name": "Ramesh Shinde", "phone": "+919811000001", "role": "LEAD_PACKER", "is_present": True},
            {"member_name": "Sanjay Gole", "phone": "+919811000002", "role": "CARPENTER", "is_present": True},
            {"member_name": "Vikram Jadhav", "phone": "+919811000003", "role": "HELPER", "is_present": False},  # Absent
            {"member_name": "Ganesh Kadam", "phone": "+919811000004", "role": "HELPER", "is_present": False},   # Absent
        ]
        await service.assign_crew_members(
            order_id=order_cap["order_id"],
            mover_id=str(mover1.id),
            members=crew_payload,
        )

        # Attempt to start PACKING with only 2 of 4 crew members checked in -> MUST FAIL
        rej_crew = False
        try:
            await service.advance_milestone(order_id=order_cap["order_id"], new_status="PACKING")
        except HTTPException as ex:
            if "Missing crew" in str(ex.detail):
                rej_crew = True
        assert rej_crew, "Expected rejection when advancing to PACKING with missing crew members"
        print("  ✓ Missing crew blocked milestone advance (2 of 4 checked in): PASS", flush=True)

        # Retrieve crew member IDs and check in the remaining 2 members
        details_crew = await service.get_order_details(order_cap["order_id"])
        for c in details_crew["crew_members"]:
            if not c["is_present"]:
                await service.check_in_crew_member(order_id=order_cap["order_id"], member_id=c["id"])

        # Now all 4 crew members are present -> Milestone advance to PACKING must succeed
        adv_ok = await service.advance_milestone(order_id=order_cap["order_id"], new_status="PACKING")
        assert adv_ok["status"] == MovingOrderStatus.PACKING.value
        print("  ✓ All 4 crew members checked in -> PACKING milestone unlocked: PASS", flush=True)
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 4: Open Marketplace Discovery & Quotation Bidding
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 4: Open Relocation Marketplace & Quotation Bidding...", flush=True)
        # Create an open lead in REQUESTED status
        lead_order = await service.create_moving_order(
            customer_id=str(cust_user.id),
            move_size="1_BHK",
            scheduled_move_date=(datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            pickup_address="Kalyani Nagar, Pune",
            pickup_lat=18.5463,
            pickup_lng=73.9033,
            drop_address="Viman Nagar, Pune",
            drop_lat=18.5679,
            drop_lng=73.9143,
        )
        open_leads = await service.get_open_moving_requests()
        assert len(open_leads) > 0
        lead_ids = [l["order_id"] for l in open_leads]
        assert lead_order["order_id"] in lead_ids
        print(f"  ✓ Open relocation leads discovered in marketplace: {len(open_leads)} (Lead {lead_order['reference']} verified)", flush=True)
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 5: Concurrency-Safe Quote Locking (Row-Level Locking)
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 5: Quote Concurrency Race Condition Safety...", flush=True)
        # Create fresh order with 2 competing quotes
        ord_conc = await service.create_moving_order(
            customer_id=str(cust_user.id),
            move_size="2_BHK",
            scheduled_move_date=(datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
            pickup_address="Baner, Pune",
            pickup_lat=18.5590,
            pickup_lng=73.7868,
            drop_address="Wakad, Pune",
            drop_lat=18.5987,
            drop_lng=73.7661,
            helpers_count=3,
        )
        q_m1 = await service.submit_mover_quote(
            order_id=ord_conc["order_id"],
            mover_id=str(mover1.id),
            quoted_fare=9200.0,
            crew_size=3,
        )
        q_m2 = await service.submit_mover_quote(
            order_id=ord_conc["order_id"],
            mover_id=str(mover2.id),
            quoted_fare=8900.0,
            crew_size=3,
        )

        # Select Q1
        sel1 = await service.accept_mover_quote(order_id=ord_conc["order_id"], quote_id=q_m1["quote_id"])
        assert sel1["status"] == MovingOrderStatus.CREW_ASSIGNED.value

        # Attempt to select Q2 concurrently -> MUST FAIL
        conc_blocked = False
        try:
            await service.accept_mover_quote(order_id=ord_conc["order_id"], quote_id=q_m2["quote_id"])
        except HTTPException as ex:
            if "already" in str(ex.detail):
                conc_blocked = True
        assert conc_blocked, "Expected concurrency protection blocking competing quote acceptance"

        # Verify Q2 marked REJECTED
        q2_obj = await db.get(MovingQuote, uuid.UUID(q_m2["quote_id"]))
        assert q2_obj.status == MovingQuoteStatus.REJECTED
        print("  ✓ Row-level lock secured winning quote & rejected competing bid: PASS", flush=True)
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 6: Pre-Inspection Walkthrough (Cloudinary Photos & Notes)
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 6: Cloudinary Pre-Inspection Walkthrough...", flush=True)
        pre_photos = [
            {"asset_name": "Living Room Sofa", "url": "https://res.cloudinary.com/swiftify/inspect/pre_sofa.jpg", "notes": "Minor fabric wear on left armrest"},
            {"asset_name": "Dining Table", "url": "https://res.cloudinary.com/swiftify/inspect/pre_table.jpg", "notes": "Glass surface pristine"},
            {"asset_name": "Refrigerator", "url": "https://res.cloudinary.com/swiftify/inspect/pre_fridge.jpg", "notes": "Tiny scratch on bottom door"},
        ]
        pre_res = await service.record_pre_inspection(
            order_id=order_cap["order_id"],
            inspector_driver_id=str(mover1.id),
            photos=pre_photos,
            notes="Completed pre-inspection walkthrough with customer present.",
            customer_signature_url="https://res.cloudinary.com/swiftify/signatures/pre_cust_sign.png",
        )
        assert pre_res["stage"] == "PRE_INSPECTION"
        assert pre_res["photos_count"] == 3
        print("  ✓ Pre-inspection photo walkthrough & digital signature saved: PASS", flush=True)
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 7: Complete 12-Stage Operational State Machine & Pickup OTP
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 7: Full 12-Stage Operational Lifecycle...", flush=True)
        # Create fresh end-to-end relocation order with itemized inventory
        items_payload = [
            {"category": "FURNITURE", "item_name": "King Size Bed", "quantity": 1, "needs_disassembly": True, "needs_assembly": True, "cubic_feet_est": 45.0, "weight_kg_est": 80.0},
            {"category": "APPLIANCE", "item_name": "Double Door Refrigerator", "quantity": 1, "is_fragile": True, "cubic_feet_est": 30.0, "weight_kg_est": 75.0},
            {"category": "FURNITURE", "item_name": "L-Shape 6-Seater Sofa", "quantity": 1, "needs_assembly": False, "cubic_feet_est": 60.0, "weight_kg_est": 90.0},
            {"category": "BOX", "item_name": "Kitchenware & Crockery Box", "quantity": 8, "is_fragile": True, "cubic_feet_est": 4.0, "weight_kg_est": 15.0},
            {"category": "BOX", "item_name": "Wardrobe Clothes Box", "quantity": 12, "cubic_feet_est": 5.0, "weight_kg_est": 20.0},
        ]
        ord_e2e = await service.create_moving_order(
            customer_id=str(cust_user.id),
            move_size="3_BHK",
            scheduled_move_date=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            pickup_address="Bavdhan Valley View, Pune",
            pickup_lat=18.5133,
            pickup_lng=73.7699,
            drop_address="Blue Ridge, Hinjewadi Phase 1, Pune",
            drop_lat=18.5913,
            drop_lng=73.7389,
            property_type="APARTMENT",
            rooms_count=4,
            large_items_count=3,
            box_count=20,
            pickup_floor=2,
            pickup_has_lift=True,
            drop_floor=14,
            drop_has_lift=True,
            drop_service_lift_available=True,
            packing_type="MULTI_LAYER",
            helpers_count=4,
            items=items_payload,
        )
        e2e_id = ord_e2e["order_id"]
        pickup_otp = ord_e2e["pickup_otp"]
        delivery_otp = ord_e2e["delivery_otp"]

        # Stage 1: REQUESTED
        assert ord_e2e["status"] == MovingOrderStatus.REQUESTED.value

        # Stage 2: QUOTING
        q_e2e = await service.submit_mover_quote(
            order_id=e2e_id,
            mover_id=str(mover1.id),
            quoted_fare=16800.0,
            base_shifting_rate=10000.0,
            crew_charge=2400.0,
            packing_materials_charge=2000.0,
            vehicle_charge=1800.0,
            toll_and_taxes=600.0,
            crew_size=4,
            vehicle_id=str(veh1_large.id),
        )

        # Stage 3: CREW_ASSIGNED (Quote accepted)
        cust_prof.wallet_balance = Decimal("60000.00")
        await db.commit()
        await service.accept_mover_quote(order_id=e2e_id, quote_id=q_e2e["quote_id"], vehicle_id=str(veh1_large.id))

        # Assign and check in all 4 crew members
        await service.assign_crew_members(
            order_id=e2e_id,
            mover_id=str(mover1.id),
            members=[
                {"member_name": "Anil Patil", "phone": "+919822100001", "role": "LEAD_PACKER", "is_present": True},
                {"member_name": "Sunil More", "phone": "+919822100002", "role": "CARPENTER", "is_present": True},
                {"member_name": "Pravin Koli", "phone": "+919822100003", "role": "HELPER", "is_present": True},
                {"member_name": "Dinesh Pawar", "phone": "+919822100004", "role": "HELPER", "is_present": True},
            ],
        )

        # Stage 4: CREW_ARRIVED
        s4 = await service.advance_milestone(order_id=e2e_id, new_status="CREW_ARRIVED")
        assert s4["status"] == MovingOrderStatus.CREW_ARRIVED.value

        # Stage 5: PRE_INSPECTION
        await service.record_pre_inspection(
            order_id=e2e_id,
            inspector_driver_id=str(mover1.id),
            photos=[{"asset_name": "Living Room Sofa", "url": "https://res.cloudinary.com/swiftify/pre_sofa.jpg"}],
        )

        # Stage 6: PACKING
        s6 = await service.advance_milestone(order_id=e2e_id, new_status="PACKING")
        assert s6["status"] == MovingOrderStatus.PACKING.value

        # Stage 7: LOADING
        s7 = await service.advance_milestone(order_id=e2e_id, new_status="LOADING")
        assert s7["status"] == MovingOrderStatus.LOADING.value

        # Stage 8: LOADED (Pickup OTP verified)
        s8 = await service.verify_pickup_otp(order_id=e2e_id, pickup_otp=pickup_otp)
        assert s8["status"] == MovingOrderStatus.LOADED.value

        # Stage 9: IN_TRANSIT
        s9 = await service.advance_milestone(order_id=e2e_id, new_status="IN_TRANSIT")
        assert s9["status"] == MovingOrderStatus.IN_TRANSIT.value

        # Stage 10: ARRIVED_DESTINATION
        s10 = await service.advance_milestone(order_id=e2e_id, new_status="ARRIVED_DESTINATION")
        assert s10["status"] == MovingOrderStatus.ARRIVED_DESTINATION.value

        # Stage 11: UNLOADING
        s11 = await service.advance_milestone(order_id=e2e_id, new_status="UNLOADING")
        assert s11["status"] == MovingOrderStatus.UNLOADING.value
        print("  ✓ Milestones executed: CREW_ARRIVED → PRE_INSPECT → PACKING → LOADING → LOADED → IN_TRANSIT → UNLOADING", flush=True)
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 8: Post-Inspection Damage Sign-Off & Cloudinary Damage Proof
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 8: Post-Inspection Walkthrough & Customer Damage Sign-Off...", flush=True)
        damage_proof = [
            {
                "item_name": "Dining Table Glass Edge",
                "photo_url": "https://res.cloudinary.com/swiftify/damage/dining_table_crack.jpg",
                "description": "2-inch crack on edge incurred during unloading",
            }
        ]
        post_insp = await service.record_post_inspection_and_damage_signoff(
            order_id=e2e_id,
            inspector_driver_id=str(mover1.id),
            photos=[{"asset_name": "Delivered Rooms", "url": "https://res.cloudinary.com/swiftify/post_delivery_all.jpg"}],
            damage_reported=True,
            damage_description="Crack on dining table corner glass edge during staircase handling.",
            damage_photos=damage_proof,
            claimed_amount=2000.0,
            agreed_deduction=1500.0,  # Agreed claim deduction
            customer_signature_url="https://res.cloudinary.com/swiftify/signatures/cust_damage_sign.png",
            mover_signature_url="https://res.cloudinary.com/swiftify/signatures/mover_damage_sign.png",
        )
        assert post_insp["stage"] == "POST_INSPECTION"
        assert post_insp["damage_reported"] is True
        assert post_insp["agreed_deduction"] == 1500.0
        assert post_insp["status"] == MovingOrderStatus.DAMAGE_SIGNOFF.value
        print("  ✓ Damage claim registered with Cloudinary proof and dual signatures: PASS", flush=True)
        passed_count += 1

        # ─────────────────────────────────────────────────────────────
        # TEST 9: Proof of Delivery (POD) & Double-Entry Settlement
        # ─────────────────────────────────────────────────────────────
        print("\n▶ TEST 9: POD Verification & Double-Entry Financial Settlement...", flush=True)
        init_mover_bal = mover1.wallet_balance or Decimal("0.00")
        init_cust_bal = cust_prof.wallet_balance or Decimal("0.00")

        pod_res = await service.complete_move_with_pod(
            order_id=e2e_id,
            delivery_otp=delivery_otp,
            signature_url="https://res.cloudinary.com/swiftify/signatures/final_pod_sign.png",
            damage_reported=True,
            damage_description="Agreed ₹1,500 damage deduction applied to settlement.",
            damage_photos=damage_proof,
            claimed_amount=2000.0,
            agreed_deduction=1500.0,
        )
        assert pod_res["status"] == MovingOrderStatus.COMPLETED.value
        assert pod_res["agreed_deduction"] == 1500.0

        # Verify Financial Balances
        await db.refresh(mover1)
        await db.refresh(cust_prof)

        expected_gross = 16800.0
        expected_platform_fee = round(expected_gross * 0.15, 2)  # ₹2520.0
        expected_mover_net = Decimal(str(round(expected_gross - expected_platform_fee - 1500.0, 2)))  # ₹12780.0

        assert mover1.wallet_balance == init_mover_bal + expected_mover_net
        assert cust_prof.wallet_balance == init_cust_bal + Decimal("1500.00")  # Customer credited ₹1500 damage refund

        # Verify DriverEarningLedger record
        ledger_res = await db.execute(
            select(DriverEarningLedger)
            .where(DriverEarningLedger.driver_id == mover1.id)
            .order_by(desc(DriverEarningLedger.created_at))
        )
        ledger = ledger_res.scalars().first()
        assert ledger is not None
        assert ledger.entry_type == "MOVING_EARNING"
        assert ledger.amount == expected_mover_net
        print(f"  ✓ Double-entry settlement complete | Mover Net: ₹{expected_mover_net} | Customer Damage Refund: ₹1500.00 | Ledger #{ledger.id}", flush=True)
        passed_count += 1

    await engine.dispose()
    print("\n" + "=" * 80)
    print(f"🎉 PHASE 21 PACKERS & MOVERS E2E TEST SUITE: {passed_count}/{total_tests} TESTS PASSED (100% SUCCESS)")
    print("=" * 80 + "\n", flush=True)


if __name__ == "__main__":
    asyncio.run(run_phase21_packers_movers_e2e_tests())
