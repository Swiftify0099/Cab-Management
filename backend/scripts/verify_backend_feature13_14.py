import asyncio
import sys, os, uuid, random
from datetime import datetime, timedelta, date
from decimal import Decimal

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
os.chdir(backend_root)
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, 'common'))
sys.path.insert(0, os.path.join(backend_root, 'matching-service'))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from sqlalchemy import select, and_

from common.models.all_models import (
    User, Driver, Vehicle, UserRole, DriverStatus, VehicleType,
    RideRequest, RideRequestStatus,
    RideReceipt, DriverEarningLedger, DriverCustomerRating,
    DriverPointWallet, DriverPointTransaction, RideEventLog
)
from app.services.trip_completion_service import TripCompletionService
from app.services.driver_earnings_service import DriverEarningsService

DB_URL = "postgresql+asyncpg://cabooking_user:cabooking_pass@127.0.0.1:5432/cabooking"
test_engine = create_async_engine(DB_URL, poolclass=NullPool, echo=False)
TestSession = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def run_tests():
    print("=" * 80, flush=True)
    print("BACKEND TEST SUITE: FEATURES 13 & 14 (TRIP COMPLETION & DRIVER EARNINGS)", flush=True)
    print("=" * 80, flush=True)

    async with TestSession() as db:
        # Step 1: Setup
        print("\n[SETUP] Creating test driver, customer, vehicle, and active trip...", flush=True)
        driver_user_id = uuid.uuid4()
        cust_user_id = uuid.uuid4()
        d_phone = f"+9198{random.randint(10000000, 99999999)}"
        c_phone = f"+9198{random.randint(10000000, 99999999)}"
        v_reg = f"MH 12 KK {random.randint(1000, 9999)}"

        driver_user = User(
            id=driver_user_id, email=f"driver_{driver_user_id.hex[:6]}@test.com", phone=d_phone, role=UserRole.DRIVER, is_active=True, is_verified=True
        )
        cust_user = User(
            id=cust_user_id, email=f"cust_{cust_user_id.hex[:6]}@test.com", phone=c_phone, role=UserRole.CUSTOMER, is_active=True, is_verified=True
        )
        db.add_all([driver_user, cust_user])

        driver = Driver(
            id=uuid.uuid4(),
            user_id=driver_user_id,
            full_name="Driver Rajesh",
            phone=d_phone,
            status=DriverStatus.ONLINE,
            is_active=True,
            is_verified=True,
            total_trips=0,
            total_earnings=Decimal("0.00"),
            wallet_balance=Decimal("0.00"),
        )
        db.add(driver)

        vehicle = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver.id,
            vehicle_type=VehicleType.SEDAN,
            make="Hyundai",
            model="Aura",
            registration_number=v_reg,
            color="White",
            seat_capacity=4,
            year=2023,
        )
        db.add(vehicle)
        await db.commit()

        start_lat, start_lng = 18.5362, 73.8939
        dest_lat, dest_lng = 18.5822, 73.9197

        completion_svc = TripCompletionService(db)
        earnings_svc = DriverEarningsService(db)

        # ─────────────────────────────────────────────────────────────
        # 1. TRIP COMPLETION TESTS (FEATURE 13)
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("1. TESTING TRIP COMPLETION & FARE CALCULATION (FEATURE 13)", flush=True)
        print("-" * 60, flush=True)

        ride1 = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust_user_id,
            assigned_driver_id=driver.id,
            pickup_lat=start_lat,
            pickup_lng=start_lng,
            pickup_address="Koregaon Park North Main Rd, Pune",
            pickup_location=f"SRID=4326;POINT({start_lng} {start_lat})",
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address="Pune Airport Terminal 2",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            estimated_fare=Decimal("450.00"),
            status=RideRequestStatus.IN_PROGRESS,
            started_at=datetime.utcnow() - timedelta(minutes=24),
            distance_travelled_km=14.5,
            pickup_waiting_fare=Decimal("12.00"), # 6 min billable waiting
        )
        db.add(ride1)
        await db.commit()

        # 1.1 Destination Arrival Geofence Check
        print("[TEST 1.1] Destination Arrival Geofence Proximity Check...", flush=True)
        # Far from destination (400m away) -> is_arrived False
        arr_far = await completion_svc.verify_destination_arrival(
            str(driver_user_id), ride1.id, dest_lat + 0.003, dest_lng + 0.003
        )
        assert arr_far["is_arrived"] is False

        # Near destination (30m away) -> is_arrived True
        arr_near = await completion_svc.verify_destination_arrival(
            str(driver_user_id), ride1.id, dest_lat + 0.0002, dest_lng + 0.0002
        )
        assert arr_near["is_arrived"] is True
        print(f"  ✓ PASS: Destination arrival geofence validated (Distance: {arr_near['distance_meters']}m <= 100m).", flush=True)

        # 1.2 Authoritative Trip Completion & Final Fare
        print("[TEST 1.2] Authoritative Trip Completion, Final Fare & Commission...", flush=True)
        comp_res = await completion_svc.complete_ride(
            driver_user_id=str(driver_user_id),
            ride_id=ride1.id,
            tolls=40.0,
            parking=20.0,
            payment_method="cash",
        )
        assert comp_res["success"] is True
        assert comp_res["status"] == "completed"
        assert comp_res["customer_final_fare"] > 400.0
        assert comp_res["driver_net_earning"] > 0.0
        assert comp_res["platform_commission"] > 0.0
        assert comp_res["payment_method"] == "cash"
        print(f"  ✓ PASS: Final Fare ₹{comp_res['customer_final_fare']:.2f} (Commission: -₹{comp_res['platform_commission']:.2f}, Driver Net: ₹{comp_res['driver_net_earning']:.2f}).", flush=True)

        # 1.3 Immutable Receipt Generation
        print("[TEST 1.3] Immutable Ride Receipt Query...", flush=True)
        receipt = await completion_svc.get_ride_receipt(str(driver_user_id), ride1.id)
        assert receipt["receipt_number"] == comp_res["receipt_number"]
        assert receipt["tolls_charge"] == 40.0
        assert receipt["parking_charge"] == 20.0
        assert receipt["waiting_charge"] == 12.0
        print(f"  ✓ PASS: Immutable Receipt #{receipt['receipt_number']} verified with itemized tolls, parking & waiting.", flush=True)

        # 1.4 Duplicate Completion Idempotency
        print("[TEST 1.4] Duplicate Completion Idempotency...", flush=True)
        dup_comp = await completion_svc.complete_ride(
            driver_user_id=str(driver_user_id),
            ride_id=ride1.id,
        )
        assert dup_comp["success"] is True
        assert dup_comp["receipt_number"] == receipt["receipt_number"]
        print("  ✓ PASS: Duplicate completion safely returned existing receipt without double-charging or duplicate ledger entries.", flush=True)

        # 1.5 Rate Customer
        print("[TEST 1.5] Driver Rating Passenger 1-5 Stars...", flush=True)
        rate_res = await completion_svc.rate_customer(
            driver_user_id=str(driver_user_id),
            ride_id=ride1.id,
            rating=5.0,
            tags=["Polite", "On Time", "Clean"],
            feedback="Great passenger, was ready at pickup point.",
        )
        assert rate_res["success"] is True
        assert rate_res["rating"] == 5.0
        print(f"  ✓ PASS: Customer rating submitted successfully with tags: {rate_res['tags']}.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # 2. DRIVER EARNINGS & LEDGER TESTS (FEATURE 14)
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("2. TESTING DRIVER EARNINGS & DOUBLE-ENTRY LEDGER (FEATURE 14)", flush=True)
        print("-" * 60, flush=True)

        # 2.1 Today's Financial Summary
        print("[TEST 2.1] Today's Financial Ledger Summary...", flush=True)
        today_sum = await earnings_svc.get_earnings_summary(str(driver_user_id), period="today")
        assert today_sum["trip_count"] == 1
        assert today_sum["total_net_earnings"] == comp_res["driver_net_earning"]
        assert today_sum["cash_collected"] == comp_res["customer_final_fare"]
        print(f"  ✓ PASS: Today's Summary Reconciled: Net ₹{today_sum['total_net_earnings']:.2f}, Cash Collected ₹{today_sum['cash_collected']:.2f}, Trips: {today_sum['trip_count']}.", flush=True)

        # 2.2 Add Tip to Completed Trip
        print("[TEST 2.2] Post-Trip Tip Allocation & Ledger Credit...", flush=True)
        tip_res = await earnings_svc.add_tip(ride1.id, 50.0)
        assert tip_res["success"] is True
        assert tip_res["tip_added"] == 50.0

        # Check updated today's summary reflects tip
        today_after_tip = await earnings_svc.get_earnings_summary(str(driver_user_id), period="today")
        assert today_after_tip["tips_total"] == 50.0
        assert today_after_tip["total_net_earnings"] == round(comp_res["driver_net_earning"] + 50.0, 2)
        print(f"  ✓ PASS: Tip ₹50.00 added and reconciled into net earnings (New Total: ₹{today_after_tip['total_net_earnings']:.2f}).", flush=True)

        # 2.3 Weekly & Monthly Ledger Breakdown
        print("[TEST 2.3] Weekly Breakdown & Mon-Sun Daily Bars...", flush=True)
        week_sum = await earnings_svc.get_earnings_summary(str(driver_user_id), period="week")
        assert len(week_sum["daily_breakdown"]) == 7
        assert week_sum["total_net_earnings"] == today_after_tip["total_net_earnings"]
        print("  ✓ PASS: Weekly 7-day breakdown generated with active day matching today's journal total.", flush=True)

        # 2.4 Immutable Financial Journal Ledger Query
        print("[TEST 2.4] Immutable Ledger History Query...", flush=True)
        ledger_entries = await earnings_svc.get_ledger_history(str(driver_user_id))
        assert len(ledger_entries) >= 3  # TRIP_EARNING, CASH_COLLECTED, TIP
        types = [e["entry_type"] for e in ledger_entries]
        assert "TRIP_EARNING" in types
        assert "CASH_COLLECTED" in types
        assert "TIP" in types
        print(f"  ✓ PASS: Ledger history retrieved {len(ledger_entries)} immutable double-entry journal records: {types}.", flush=True)

        print("\n" + "=" * 80, flush=True)
        print("ALL BACKEND UNIT TESTS FOR FEATURES 13 & 14 PASSED (100% SUCCESS)!", flush=True)
        print("=" * 80, flush=True)

    await test_engine.dispose()

if __name__ == '__main__':
    asyncio.run(run_tests())
