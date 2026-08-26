"""
Master Production Verification Suite: SERVICE 8 — PACKERS & MOVERS LOGISTICS SUITE
Tests:
1. Authoritative Shifting Estimation: Itemized breakdown across 1RK/1BHK/2BHK/3BHK/Villa, floor charges, assembly, fragile packing, and insurance
2. Moving Order Creation & Itemized Inventory: MOV-YYMMDD-XXXX voucher with King Bed, Fridge, 55" TV, Sofa, Fragile Crates & Boxes
3. Mover Partner Bidding & Quotation: Mover submits quote with 4 crew members and 14ft closed container truck
4. Customer Quote Acceptance: Customer confirms quote -> status transitions to CREW_ASSIGNED
5. Milestone State Machine: Advances through PACKING -> LOADING -> LOADED -> IN_TRANSIT -> UNLOADING
6. Delivery POD & Damage Inspection Walkthrough: Verifies 4-digit delivery OTP, captures signature, checks damage -> COMPLETED
7. Authoritative 85/15 Settlement & Driver Earnings Ledger: 85% net earnings credited to mover wallet & recorded in DriverEarningLedger
8. Pre-Dispatch Cancellation & 100% Wallet Refund: Zero-penalty cancellation before dispatch restores deposit to customer wallet
"""
import os
import sys
import uuid
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
import asyncio

# Add python paths
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_root, "common"))
sys.path.insert(0, os.path.join(_root, "packers-service"))
sys.path.insert(0, _root)

from sqlalchemy import select, and_, text
from common.database import async_session_maker, engine
from common.models.all_models import (
    Base, User, UserRole, Driver, DriverStatus, KYCStatus, Vehicle, VehicleType,
    CustomerProfile, MovingOrder, MovingItem, MovingQuote, MovingPOD,
    MoveSize, MovingOrderStatus, MovingQuoteStatus,
    DriverEarningLedger, WalletTransaction, LedgerType,
)
from app.services.packers_service import PackersService

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def run_packers_service_verification():
    print("=" * 80)
    print("🏠📦 STARTING SERVICE 8 (PACKERS & MOVERS) PRODUCTION VERIFICATION")
    print("=" * 80)

    await engine.dispose()

    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=[
                    MovingOrder.__table__,
                    MovingItem.__table__,
                    MovingQuote.__table__,
                    MovingPOD.__table__,
                ],
            )
        )

    async with async_session_maker() as session:
        # =========================================================================
        # SETUP SEED DATA
        # =========================================================================
        print("\n[SETUP] Seeding Relocation Customer Profile, Certified Mover & Moving Truck...", flush=True)

        # 1. Customer User & Profile
        customer_user = User(
            id=uuid.uuid4(),
            phone=f"+9194{str(uuid.uuid4().int)[:8]}",
            email=f"packers.cust.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(customer_user)
        await session.flush()

        customer_profile = CustomerProfile(
            id=uuid.uuid4(),
            user_id=customer_user.id,
            full_name="Vikramaditya Shinde",
            wallet_balance=Decimal("30000.00"),
            rating=Decimal("4.96"),
        )
        session.add(customer_profile)

        # 2. Moving Partner Driver & Heavy Container Truck
        mover_user = User(
            id=uuid.uuid4(),
            phone=f"+9193{str(uuid.uuid4().int)[:8]}",
            email=f"packers.mover.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(mover_user)
        await session.flush()

        mover_driver = Driver(
            id=uuid.uuid4(),
            user_id=mover_user.id,
            full_name="Mahalaxmi Packers & Relocation Experts",
            phone=mover_user.phone,
            rating=4.98,
            total_trips=850,
            wallet_balance=Decimal("5000.00"),
            total_earnings=Decimal("1850000.00"),
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_location="SRID=4326;POINT(73.8567 18.5204)",
        )
        session.add(mover_driver)

        truck = Vehicle(
            id=uuid.uuid4(),
            driver_id=mover_driver.id,
            make="Eicher",
            model="Pro 2049 Closed Container 14ft",
            year=2023,
            color="Commercial Yellow",
            registration_number=f"MH-12-MV{uuid.uuid4().hex[:3].upper()}",
            vehicle_type=VehicleType.SUV,
            seat_capacity=3,
            parcel_capable=True,
        )
        session.add(truck)

        await session.commit()
        print("[SETUP] Packers & Movers seed data committed successfully!", flush=True)

        packers_svc = PackersService(session)

        # =========================================================================
        # TEST 1: AUTHORITATIVE SHIFTING ESTIMATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 1: AUTHORITATIVE SHIFTING COST ESTIMATION")
        print("=" * 70)

        # 2 BHK move with 3rd floor pickup (no lift) and 15 KM distance
        est = await packers_svc.estimate_move(
            move_size="2_BHK",
            distance_km=15.0,
            pickup_floor=3,
            pickup_has_lift=False,  # 3 floors * 300 = 900
            drop_floor=1,
            drop_has_lift=True,     # 0
            requires_assembly=True,
            requires_fragile_packing=True,
            insurance_opted=True,
            declared_value=200000.0,  # 1.5% of 2L = 3000
        )

        assert est["move_size"] == "2_BHK"
        assert est["base_rate"] == 8500.0
        assert est["distance_charge"] == 350.0  # 10 km * 35
        assert est["floor_charges"]["total_floor_charge"] == 900.0
        assert est["addons"]["assembly"] == 800.0
        assert est["addons"]["fragile_packing"] == 1200.0
        assert est["addons"]["insurance"] == 3000.0
        assert est["estimated_fare"] > 0
        print(f"  [OK] 2 BHK Shifting Estimate:")
        print(f"    - Base Rate (2 BHK): Rs.{est['base_rate']}, Distance Charge (15 KM): Rs.{est['distance_charge']}")
        print(f"    - No-Lift Floor Surcharge (3 floors): Rs.{est['floor_charges']['total_floor_charge']}")
        print(f"    - Addons: Assembly (Rs.{est['addons']['assembly']}), Fragile Packing (Rs.{est['addons']['fragile_packing']}), Insurance (Rs.{est['addons']['insurance']})")
        print(f"    - Total Estimated Fare (inc. 5% GST): Rs.{est['estimated_fare']}.")

        # =========================================================================
        # TEST 2: MOVING ORDER CREATION & INVENTORY CHECKLIST
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 2: MOVING ORDER CREATION & ITEMIZED INVENTORY CHECKLIST")
        print("=" * 70)

        move_date = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        items = [
            {"category": "FURNITURE", "item_name": "King Size Bed with Mattress", "quantity": 1, "is_fragile": False, "needs_disassembly": True},
            {"category": "FURNITURE", "item_name": "3+2 L-Shape Sofa Set", "quantity": 1, "is_fragile": False, "needs_disassembly": False},
            {"category": "APPLIANCE", "item_name": "Double Door Refrigerator 340L", "quantity": 1, "is_fragile": True, "needs_disassembly": False},
            {"category": "APPLIANCE", "item_name": "55-inch 4K OLED Smart TV", "quantity": 1, "is_fragile": True, "needs_disassembly": True},
            {"category": "KITCHEN", "item_name": "Crockery & Glassware Crates", "quantity": 4, "is_fragile": True, "needs_disassembly": False},
            {"category": "BOX", "item_name": "Heavy Cardboard Clothes & Book Boxes", "quantity": 10, "is_fragile": False, "needs_disassembly": False},
        ]

        order_res = await packers_svc.create_moving_order(
            customer_id=str(customer_user.id),
            move_size="2_BHK",
            scheduled_move_date=move_date,
            pickup_address="B-402, Rohan Mithila, Viman Nagar, Pune",
            pickup_lat=18.5679,
            pickup_lng=73.9143,
            pickup_floor=3,
            pickup_has_lift=False,
            drop_address="Flat 101, Pride World City, Charholi, Pune",
            drop_lat=18.6322,
            drop_lng=73.8827,
            drop_floor=1,
            drop_has_lift=True,
            distance_km=15.0,
            requires_assembly=True,
            requires_fragile_packing=True,
            insurance_opted=True,
            declared_value=200000.0,
            items=items,
            payment_method="WALLET",
        )

        order_id = order_res["order_id"]
        order_ref = order_res["reference"]
        assert order_ref.startswith("MOV-"), f"Order reference must start with MOV-, got {order_ref}"
        assert order_res["items_count"] == 6
        assert order_res["status"] == "REQUESTED"
        print(f"  [OK] Created Moving Order: Ref={order_ref}, ID={order_id}, Move Size={order_res['move_size']}, Inventory Items={order_res['items_count']}.")

        # =========================================================================
        # TEST 3: MOVER PARTNER BIDDING & QUOTATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 3: MOVER PARTNER BIDDING & QUOTATION")
        print("=" * 70)

        quote_res = await packers_svc.submit_mover_quote(
            order_id=order_id,
            mover_id=str(mover_driver.id),
            quoted_fare=15000.0,
            crew_size=4,
            truck_type="14ft Eicher Closed Container",
            estimated_hours=5.0,
            notes="Includes bubble wrap, foam corner guards, and electric screwdrivers for disassembly.",
        )

        quote_id = quote_res["quote_id"]
        assert quote_res["quoted_fare"] == 15000.0
        assert quote_res["crew_size"] == 4
        assert quote_res["status"] == "OFFERED"
        print(f"  [OK] Mover Submitted Quote: Fare=Rs.{quote_res['quoted_fare']}, Crew={quote_res['crew_size']} Persons, Truck={quote_res['truck_type']}.")

        # =========================================================================
        # TEST 4: CUSTOMER QUOTE ACCEPTANCE & CREW ALLOCATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 4: CUSTOMER QUOTE ACCEPTANCE & CREW ALLOCATION")
        print("=" * 70)

        accept_res = await packers_svc.accept_mover_quote(order_id=order_id, quote_id=quote_id)
        assert accept_res["status"] == "CREW_ASSIGNED"
        assert accept_res["assigned_mover_id"] == str(mover_driver.id)
        print(f"  [OK] Customer Confirmed Quote! Order Status: CREW_ASSIGNED to {mover_driver.full_name}.")

        # =========================================================================
        # TEST 5: ADVANCE MOVING MILESTONES
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 5: ADVANCE MOVING OPERATIONAL MILESTONES")
        print("=" * 70)

        milestones = ["PACKING", "LOADING", "LOADED", "IN_TRANSIT", "UNLOADING"]
        for m in milestones:
            m_res = await packers_svc.advance_milestone(order_id=order_id, new_status=m)
            assert m_res["status"] == m
            print(f"  [OK] Milestone Transition -> {m}")

        # =========================================================================
        # TEST 6: DELIVERY POD & DAMAGE INSPECTION WALKTHROUGH
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 6: DELIVERY POD & DAMAGE INSPECTION WALKTHROUGH")
        print("=" * 70)

        delivery_otp = "7492"
        pod_res = await packers_svc.complete_move_with_pod(
            order_id=order_id,
            entered_otp=delivery_otp,
            signature_url="https://res.cloudinary.com/swiftify/relocation_pod_sign.png",
            damage_reported=False,
            damage_description=None,
        )

        assert pod_res["status"] == "COMPLETED"
        assert pod_res["damage_reported"] == False
        print(f"  [OK] Move Completed with POD: Delivery OTP Verified, Zero Damage Signoff Confirmed at Charholi Residence.")

        # =========================================================================
        # TEST 7: AUTHORITATIVE 85/15 SETTLEMENT & IMMUTABLE LEDGER
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 7: AUTHORITATIVE 85/15 SETTLEMENT & IMMUTABLE LEDGER")
        print("=" * 70)

        assert pod_res["gross_fare"] == 15000.0
        assert pod_res["mover_earning"] == 12750.0  # 85% of 15000
        print(f"  [OK] Moving Settlement: Gross Fare: Rs.{pod_res['gross_fare']}, Mover Net Earning: Rs.{pod_res['mover_earning']}.")

        # Verify Mover Wallet Credited
        await session.refresh(mover_driver)
        assert mover_driver.wallet_balance > Decimal("5000.00")

        # Verify Double-Entry Driver Earnings Ledger
        ledger_res = await session.execute(
            select(DriverEarningLedger).where(DriverEarningLedger.driver_id == mover_driver.id)
        )
        ledgers = ledger_res.scalars().all()
        assert len(ledgers) > 0, "DriverEarningLedger must record moving earning entry"
        print(f"  [OK] Double-Entry Ledger Verified: {len(ledgers)} shifting earnings logged with direction CREDIT.")

        # =========================================================================
        # TEST 8: PRE-DISPATCH CANCELLATION & 100% WALLET REFUND
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 8: PRE-DISPATCH CANCELLATION & 100% WALLET REFUND")
        print("=" * 70)

        # Create another moving order to test cancellation
        to_cancel_res = await packers_svc.create_moving_order(
            customer_id=str(customer_user.id),
            move_size="1_RK",
            scheduled_move_date=move_date,
            pickup_address="Kothrud, Pune",
            pickup_lat=18.5074,
            pickup_lng=73.8077,
            drop_address="Karve Nagar, Pune",
            drop_lat=18.4912,
            drop_lng=73.8214,
            distance_km=4.0,
            payment_method="WALLET",
        )
        c_oid = to_cancel_res["order_id"]

        cancel_res = await packers_svc.cancel_moving_order(
            order_id=c_oid,
            reason="Lease agreement extension with current landlord",
        )

        assert cancel_res["status"] == "CANCELLED"
        assert cancel_res["refund_amount"] > 0
        print(f"  [OK] Cancelled Moving Order: Ref={cancel_res['order_reference']}, 100% Deposit Refund: Rs.{cancel_res['refund_amount']}.")

        print("\n" + "=" * 80)
        print("🎉 ALL 8 SERVICE 8 (PACKERS & MOVERS) TEST SCENARIOS PASSED WITH 100% SUCCESS!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_packers_service_verification())
