import asyncio
import sys, os, uuid, random
from datetime import datetime, timedelta
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
from common.models.all_models import (
    User, Driver, Vehicle, UserRole, DriverStatus, VehicleType,
    RideRequest, RideRequestStatus,
    DriverPointWallet, DriverPointTransaction,
    RideEventLog, RideCancellationEvent
)
from app.services.waiting_service import WaitingService
from app.services.cancellation_service import CancellationService
from sqlalchemy import select

DB_URL = "postgresql+asyncpg://cabooking_user:cabooking_pass@127.0.0.1:5432/cabooking"
test_engine = create_async_engine(DB_URL, poolclass=NullPool, echo=False)
TestSession = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def run_tests():
    print("=" * 80, flush=True)
    print("BACKEND TEST SUITE: FEATURES 11 & 12 (WAITING & CANCELLATION SYSTEMS)", flush=True)
    print("=" * 80, flush=True)

    async with TestSession() as db:
        # Step 1: Setup test entities
        print("\n[SETUP] Creating test driver, customer, vehicle, wallet, and ride...", flush=True)
        driver_user_id = uuid.uuid4()
        cust_user_id = uuid.uuid4()
        d_phone = f"+9198{random.randint(10000000, 99999999)}"
        c_phone = f"+9198{random.randint(10000000, 99999999)}"
        v_reg = f"MH 14 CC {random.randint(1000, 9999)}"

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
            full_name="Driver Anil",
            phone=d_phone,
            status=DriverStatus.ONLINE,
            is_active=True,
            is_verified=True,
            total_trips=20,
            total_cancellations=0,
            penalty_cancellations=0,
            cancellation_rate=0.0,
            restriction_status="NORMAL",
        )
        db.add(driver)

        wallet = DriverPointWallet(
            id=uuid.uuid4(),
            driver_id=driver.id,
            balance=100,
        )
        db.add(wallet)

        vehicle = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver.id,
            vehicle_type=VehicleType.SEDAN,
            make="Toyota",
            model="Etios",
            registration_number=v_reg,
            color="White",
            seat_capacity=4,
            year=2022,
        )
        db.add(vehicle)
        await db.commit()

        start_lat, start_lng = 18.5362, 73.8939
        dest_lat, dest_lng = 18.5822, 73.9197

        # ─────────────────────────────────────────────────────────────
        # 1. WAITING SYSTEM TESTS (FEATURE 11)
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("1. TESTING WAITING SYSTEM (FEATURE 11)", flush=True)
        print("-" * 60, flush=True)

        waiting_svc = WaitingService(db)

        # 1.1 Unarrived ride status
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
            destination_address="Pune Airport",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            estimated_fare=Decimal("420.00"),
            status=RideRequestStatus.PICKUP,
            pickup_arrived_at=None,
        )
        db.add(ride1)
        await db.commit()

        print("[TEST 1.1] Unarrived Waiting Status...", flush=True)
        unarr_res = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride1.id, start_lat, start_lng)
        assert unarr_res["is_arrived"] is False
        assert unarr_res["elapsed_seconds"] == 0
        print("  ✓ PASS: Pre-arrival state returns 0 elapsed seconds safely.", flush=True)

        # 1.2 Free Waiting State (1m elapsed < 3m free)
        print("[TEST 1.2] Free Waiting State (60s elapsed)...", flush=True)
        ride1.pickup_arrived_at = datetime.utcnow() - timedelta(seconds=60)
        await db.commit()

        free_res = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride1.id, start_lat, start_lng)
        assert free_res["is_free_waiting"] is True
        assert free_res["is_paid_waiting"] is False
        assert free_res["free_waiting_remaining_seconds"] == 120
        assert free_res["waiting_charge"] == 0.0
        print(f"  ✓ PASS: Free waiting confirmed (Remaining free: {free_res['free_waiting_remaining_seconds']}s, Charge: ₹0.00).", flush=True)

        # 1.3 Paid Waiting Transition (4m elapsed > 3m free)
        print("[TEST 1.3] Paid Waiting Transition (240s elapsed)...", flush=True)
        ride1.pickup_arrived_at = datetime.utcnow() - timedelta(seconds=240)
        await db.commit()

        paid_res = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride1.id, start_lat, start_lng)
        assert paid_res["is_paid_waiting"] is True
        assert paid_res["paid_waiting_seconds"] == 60
        assert paid_res["waiting_charge"] == 2.0  # 1 min * ₹2.00
        print(f"  ✓ PASS: Paid waiting transition confirmed (Paid time: {paid_res['paid_waiting_seconds']}s, Charge: ₹{paid_res['waiting_charge']}).", flush=True)

        # 1.4 No-Show Eligibility Gatekeeper
        print("[TEST 1.4] Anti-Fraud No-Show Eligibility Gatekeeper...", flush=True)
        # Condition A: Time < 5m -> Fails
        ride1.pickup_arrived_at = datetime.utcnow() - timedelta(seconds=240)
        ride1.contact_attempts_count = 1
        await db.commit()
        ns_a = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride1.id, start_lat, start_lng)
        assert ns_a["is_no_show_eligible"] is False

        # Condition B: Time >= 5m, but 0 contacts -> Fails
        ride1.pickup_arrived_at = datetime.utcnow() - timedelta(seconds=320)
        ride1.contact_attempts_count = 0
        await db.commit()
        ns_b = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride1.id, start_lat, start_lng)
        assert ns_b["is_no_show_eligible"] is False

        # Condition C: Time >= 5m, Contact >= 1, but driver far (>150m) -> Fails
        ride1.contact_attempts_count = 1
        await db.commit()
        ns_c = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride1.id, start_lat + 0.003, start_lng + 0.003) # ~400m
        assert ns_c["is_no_show_eligible"] is False

        # Condition D: All met -> PASS
        ns_d = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride1.id, start_lat + 0.0001, start_lng + 0.0001)
        assert ns_d["is_no_show_eligible"] is True
        print("  ✓ PASS: No-Show eligibility strictly validated across time, distance, and contact attempts.", flush=True)

        # 1.5 Execute No-Show Cancellation
        print("[TEST 1.5] Execute No-Show Cancellation & Wallet Credit...", flush=True)
        ns_exec = await waiting_svc.process_no_show_cancellation(
            str(driver_user_id), ride1.id, start_lat + 0.0001, start_lng + 0.0001
        )
        assert ns_exec["success"] is True
        assert ns_exec["status"] == "cancelled"
        assert ns_exec["cancellation_fee"] == 50.0

        # Check wallet credited +50 (100 -> 150)
        w_check = await db.execute(select(DriverPointWallet).where(DriverPointWallet.driver_id == driver.id))
        wallet_obj = w_check.scalar_one()
        assert wallet_obj.balance == 150
        print("  ✓ PASS: No-Show cancellation executed atomically and ₹50 compensation credited to driver wallet.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # 2. CANCELLATION SYSTEM TESTS (FEATURE 12)
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("2. TESTING CANCELLATION SYSTEM (FEATURE 12)", flush=True)
        print("-" * 60, flush=True)

        cancel_svc = CancellationService(db)

        # 2.1 Reason Catalog
        print("[TEST 2.1] Cancellation Reason Catalog...", flush=True)
        catalog = cancel_svc.get_reason_catalog()
        assert len(catalog) >= 8
        assert any(r["code"] == "CUST_REQ" and r["is_penalty_exempt"] is True for r in catalog)
        assert any(r["code"] == "DRIVER_OTHER" and r["is_penalty_exempt"] is False for r in catalog)
        print(f"  ✓ PASS: Structured catalog returned {len(catalog)} validated reasons with exemption flags.", flush=True)

        # 2.2 Penalty-Exempt Cancellation (Customer Requested)
        print("[TEST 2.2] Penalty-Exempt Cancellation (Customer Requested)...", flush=True)
        ride2 = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust_user_id,
            assigned_driver_id=driver.id,
            pickup_lat=start_lat,
            pickup_lng=start_lng,
            pickup_address="KP North Rd",
            pickup_location=f"SRID=4326;POINT({start_lng} {start_lat})",
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address="Airport",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            estimated_fare=Decimal("350.00"),
            status=RideRequestStatus.PICKUP,
        )
        db.add(ride2)
        await db.commit()

        c1_res = await cancel_svc.cancel_ride_by_driver(str(driver_user_id), ride2.id, "CUST_REQ")
        assert c1_res["success"] is True
        assert c1_res["is_penalty_exempt"] is True
        assert driver.penalty_cancellations == 0
        print("  ✓ PASS: Exempt cancellation recorded with 0 penalty cancellations.", flush=True)

        # 2.3 Unexcused Cancellation & Performance Rate Impact
        print("[TEST 2.3] Unexcused Cancellation & Performance Rate Increment...", flush=True)
        ride3 = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust_user_id,
            assigned_driver_id=driver.id,
            pickup_lat=start_lat,
            pickup_lng=start_lng,
            pickup_address="KP North Rd",
            pickup_location=f"SRID=4326;POINT({start_lng} {start_lat})",
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address="Airport",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            estimated_fare=Decimal("350.00"),
            status=RideRequestStatus.PICKUP,
        )
        db.add(ride3)
        await db.commit()

        c2_res = await cancel_svc.cancel_ride_by_driver(str(driver_user_id), ride3.id, "DRIVER_OTHER")
        assert c2_res["success"] is True
        assert c2_res["is_penalty_exempt"] is False
        assert driver.penalty_cancellations == 1
        assert driver.cancellation_rate > 0.0
        print(f"  ✓ PASS: Unexcused cancellation incremented penalty cancellations ({driver.penalty_cancellations}) and updated rate ({driver.cancellation_rate * 100}%).", flush=True)

        # 2.4 Auto-Restriction Tier Escalation
        print("[TEST 2.4] Auto-Restriction Tier Escalation...", flush=True)
        # Force penalty cancellations to simulate tiered warnings
        driver.penalty_cancellations = 3
        driver.total_trips = 20 # 3/20 = 15% -> WARNING
        ride4 = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust_user_id,
            assigned_driver_id=driver.id,
            pickup_lat=start_lat,
            pickup_lng=start_lng,
            pickup_address="KP North Rd",
            pickup_location=f"SRID=4326;POINT({start_lng} {start_lat})",
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address="Airport",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            estimated_fare=Decimal("350.00"),
            status=RideRequestStatus.PICKUP,
        )
        db.add(ride4)
        await db.commit()

        warn_res = await cancel_svc.cancel_ride_by_driver(str(driver_user_id), ride4.id, "DRIVER_OTHER")
        assert warn_res["restriction_status"] in ["WARNING", "RESTRICTED"]
        print(f"  ✓ PASS: Tiered warning status escalated to '{warn_res['restriction_status']}'.", flush=True)

        # 2.5 Race Condition & Atomic State Shield
        print("[TEST 2.5] Atomic Concurrency Shield (In-Progress Cancellation Rejection)...", flush=True)
        ride5 = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust_user_id,
            assigned_driver_id=driver.id,
            pickup_lat=start_lat,
            pickup_lng=start_lng,
            pickup_address="KP North Rd",
            pickup_location=f"SRID=4326;POINT({start_lng} {start_lat})",
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address="Airport",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            estimated_fare=Decimal("350.00"),
            status=RideRequestStatus.IN_PROGRESS, # ACTIVE TRIP
        )
        db.add(ride5)
        await db.commit()

        try:
            await cancel_svc.cancel_ride_by_driver(str(driver_user_id), ride5.id, "DRIVER_OTHER")
            assert False, "Should reject cancellation of IN_PROGRESS ride"
        except Exception as e:
            assert "in-progress" in str(e).lower()
            print("  ✓ PASS: Cancellation of active in-progress trip securely rejected.", flush=True)

        # 2.6 Duplicate Cancellation Idempotency
        print("[TEST 2.6] Duplicate Cancellation Idempotency...", flush=True)
        dup_cancel = await cancel_svc.cancel_ride_by_driver(str(driver_user_id), ride4.id, "DRIVER_OTHER")
        assert dup_cancel["success"] is True
        assert dup_cancel["status"] == "cancelled"
        print("  ✓ PASS: Duplicate cancellation safely returned existing cancelled state with 0 crashes.", flush=True)

        # 2.7 Driver Metrics & Cancellation History
        print("[TEST 2.7] Cancellation History & Metrics Query...", flush=True)
        metrics = await cancel_svc.get_driver_metrics(str(driver_user_id))
        history = await cancel_svc.get_cancellation_history(str(driver_user_id))
        assert "cancellation_rate_percentage" in metrics
        assert len(history) >= 2
        print(f"  ✓ PASS: Driver metrics verified ({metrics['cancellation_rate_percentage']} rate, {len(history)} audit events in history).", flush=True)

        print("\n" + "=" * 80, flush=True)
        print("ALL FEATURE 11 & 12 BACKEND TESTS PASSED WITH 100% SUCCESS!", flush=True)
        print("=" * 80, flush=True)

    await test_engine.dispose()

if __name__ == '__main__':
    asyncio.run(run_tests())
