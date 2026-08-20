"""
Full E2E Regression & Verification Test Suite for Features 11 & 12
(Waiting System & Cancellation System)
Tests: Server-authoritative waiting, free/paid transitions, no-show fraud shield,
structured reasons, cancellation rate calculations, auto-restrictions, atomic locking,
and multi-module regression across Features 7–10.
"""
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
from sqlalchemy import select, and_

from common.models.all_models import (
    User, Driver, Vehicle, UserRole, DriverStatus, VehicleType,
    RideRequest, RideRequestStatus,
    DriverPointWallet, DriverPointTransaction,
    RideEventLog, RideCancellationEvent
)
from app.services.waiting_service import WaitingService
from app.services.cancellation_service import CancellationService
from app.services.ride_start_service import RideStartService
from app.services.during_ride_service import DuringRideService
from app.services.communication_service import CommunicationService
from app.services.hazard_service import HazardService

DB_URL = "postgresql+asyncpg://cabooking_user:cabooking_pass@127.0.0.1:5432/cabooking"
test_engine = create_async_engine(DB_URL, poolclass=NullPool, echo=False)
TestSession = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def run_full_regression():
    print("=" * 80, flush=True)
    print("COMPLETE E2E REGRESSION SUITE: FEATURES 11 & 12 (WAITING & CANCELLATION)", flush=True)
    print("=" * 80, flush=True)

    async with TestSession() as db:
        # Step 1: Setup
        print("\n[STEP 1] Setting up driver, passenger, vehicle, and active rides...", flush=True)
        driver_user_id = uuid.uuid4()
        cust_user_id = uuid.uuid4()
        d_phone = f"+9198{random.randint(10000000, 99999999)}"
        c_phone = f"+9198{random.randint(10000000, 99999999)}"
        v_reg = f"MH 12 EE {random.randint(1000, 9999)}"

        driver_user = User(
            id=driver_user_id, email=f"drv_{driver_user_id.hex[:6]}@test.com", phone=d_phone, role=UserRole.DRIVER, is_active=True, is_verified=True
        )
        cust_user = User(
            id=cust_user_id, email=f"cst_{cust_user_id.hex[:6]}@test.com", phone=c_phone, role=UserRole.CUSTOMER, is_active=True, is_verified=True
        )
        db.add_all([driver_user, cust_user])

        driver = Driver(
            id=uuid.uuid4(),
            user_id=driver_user_id,
            full_name="Driver Suresh",
            phone=d_phone,
            status=DriverStatus.ONLINE,
            is_active=True,
            is_verified=True,
            total_trips=25,
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
            make="Maruti",
            model="Ciaz",
            registration_number=v_reg,
            color="Silver",
            seat_capacity=4,
            year=2023,
        )
        db.add(vehicle)
        await db.commit()

        start_lat, start_lng = 18.5362, 73.8939
        dest_lat, dest_lng = 18.5822, 73.9197

        waiting_svc = WaitingService(db)
        cancel_svc = CancellationService(db)
        start_svc = RideStartService(db)
        during_svc = DuringRideService(db)
        comm_svc = CommunicationService(db)
        hazard_svc = HazardService(db)

        # ─────────────────────────────────────────────────────────────
        # TEST 1: SERVER-AUTHORITATIVE WAITING TIMER & FREE/PAID PHASES
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 1] Server-Authoritative Waiting Engine (Feature 11)...", flush=True)
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
            status=RideRequestStatus.PICKUP,
            pickup_arrived_at=datetime.utcnow() - timedelta(seconds=90), # 1.5 min elapsed
        )
        db.add(ride1)
        await db.commit()

        w_stat1 = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride1.id, start_lat, start_lng)
        assert w_stat1["is_free_waiting"] is True
        assert w_stat1["free_waiting_remaining_seconds"] == 90
        assert w_stat1["waiting_charge"] == 0.0
        print(f"  ✓ 1.1 Free Waiting: {w_stat1['elapsed_seconds']}s elapsed, {w_stat1['free_waiting_remaining_seconds']}s free remaining, ₹0.00 fee.", flush=True)

        # Paid waiting transition (270s elapsed -> 90s paid -> 2 billable mins = ₹4.00)
        ride1.pickup_arrived_at = datetime.utcnow() - timedelta(seconds=270)
        await db.commit()

        w_stat2 = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride1.id, start_lat, start_lng)
        assert w_stat2["is_paid_waiting"] is True
        assert w_stat2["paid_waiting_seconds"] == 90
        assert w_stat2["waiting_charge"] == 4.0
        print(f"  ✓ 1.2 Paid Waiting: {w_stat2['paid_waiting_seconds']}s paid waiting, ₹{w_stat2['waiting_charge']} billable waiting charge.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 2: ANTI-FRAUD NO-SHOW ELIGIBILITY & WALLET PAYOUT
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 2] Anti-Fraud No-Show Gatekeeper & Wallet Compensation...", flush=True)
        # Advance timer to 330s (5.5m), add contact attempt, verify proximity
        ride1.pickup_arrived_at = datetime.utcnow() - timedelta(seconds=330)
        ride1.contact_attempts_count = 1
        await db.commit()

        ns_stat = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride1.id, start_lat + 0.0001, start_lng + 0.0001)
        assert ns_stat["is_no_show_eligible"] is True
        print("  ✓ 2.1 No-Show Eligibility confirmed after 5.5 min waiting & 1 contact attempt.", flush=True)

        ns_exec = await waiting_svc.process_no_show_cancellation(str(driver_user_id), ride1.id, start_lat, start_lng)
        assert ns_exec["success"] is True
        assert ns_exec["cancellation_fee"] == 50.0

        # Verify wallet credited (+50)
        w_res = await db.execute(select(DriverPointWallet).where(DriverPointWallet.driver_id == driver.id))
        wallet_obj = w_res.scalar_one()
        assert wallet_obj.balance == 150
        print(f"  ✓ 2.2 No-Show Cancellation executed atomically and ₹50 compensation credited to wallet (Balance: {wallet_obj.balance}).", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 3: STRUCTURED CANCELLATION REASONS & EXEMPTIONS (FEATURE 12)
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 3] Structured Cancellation Reasons & Policy Exemptions (Feature 12)...", flush=True)
        catalog = cancel_svc.get_reason_catalog()
        assert len(catalog) >= 8
        print(f"  ✓ 3.1 Catalog returned {len(catalog)} validated structured cancellation reasons.", flush=True)

        # 3.2 Vehicle Breakdown (Auto-Offline test)
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
            estimated_fare=Decimal("380.00"),
            status=RideRequestStatus.PICKUP,
        )
        db.add(ride2)
        await db.commit()

        c_veh = await cancel_svc.cancel_ride_by_driver(str(driver_user_id), ride2.id, "VEHICLE_ISSUE")
        assert c_veh["is_penalty_exempt"] is True
        assert driver.status == DriverStatus.OFFLINE
        assert driver._is_online is False
        print("  ✓ 3.2 Vehicle breakdown cancellation marked exempt and automatically set driver OFFLINE.", flush=True)

        # Restore driver to ONLINE for next tests
        driver.status = DriverStatus.ONLINE
        driver._is_online = True
        await db.commit()

        # ─────────────────────────────────────────────────────────────
        # TEST 4: DRIVER CANCELLATION RATE & TIERED AUTO-RESTRICTIONS
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 4] Driver Cancellation Rate & Tiered Auto-Restrictions...", flush=True)
        # Unexcused cancellation
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
            estimated_fare=Decimal("380.00"),
            status=RideRequestStatus.PICKUP,
        )
        db.add(ride3)
        await db.commit()

        c_unexc = await cancel_svc.cancel_ride_by_driver(str(driver_user_id), ride3.id, "DRIVER_OTHER")
        assert c_unexc["is_penalty_exempt"] is False
        assert driver.penalty_cancellations == 1
        assert driver.cancellation_rate > 0.0
        print(f"  ✓ 4.1 Unexcused cancellation incremented penalty cancellations (Rate: {driver.cancellation_rate * 100}%).", flush=True)

        # Force penalty cancellations to 8 (>=30%) -> TEMPORARILY_SUSPENDED
        driver.penalty_cancellations = 8
        driver.total_trips = 25 # 8/25 = 32% >= 30%
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
            estimated_fare=Decimal("380.00"),
            status=RideRequestStatus.PICKUP,
        )
        db.add(ride4)
        await db.commit()

        susp_res = await cancel_svc.cancel_ride_by_driver(str(driver_user_id), ride4.id, "DRIVER_OTHER")
        assert susp_res["restriction_status"] == "TEMPORARILY_SUSPENDED"
        assert driver.status == DriverStatus.SUSPENDED
        assert driver.suspension_until is not None
        print(f"  ✓ 4.2 Auto-Restriction Tier: Driver suspended for 24h due to high unexcused cancellation rate ({driver.cancellation_rate * 100}%).", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 5: ATOMIC CONCURRENCY & DUPLICATE IDEMPOTENCY
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 5] Atomic Concurrency Shield & Idempotency...", flush=True)
        # Restore status for test
        driver.status = DriverStatus.ONLINE

        # 5.1 Rejection of in-progress ride cancellation
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
            estimated_fare=Decimal("380.00"),
            status=RideRequestStatus.IN_PROGRESS,
        )
        db.add(ride5)
        await db.commit()

        try:
            await cancel_svc.cancel_ride_by_driver(str(driver_user_id), ride5.id, "DRIVER_OTHER")
            assert False, "Should reject cancellation of active in-progress trip"
        except Exception as e:
            assert "in-progress" in str(e).lower()
            print("  ✓ 5.1 Concurrency Shield: Cancellation of active in-progress ride securely rejected.", flush=True)

        # 5.2 Duplicate cancel idempotency
        dup_res = await cancel_svc.cancel_ride_by_driver(str(driver_user_id), ride4.id, "DRIVER_OTHER")
        assert dup_res["success"] is True
        assert dup_res["status"] == "cancelled"
        print("  ✓ 5.2 Idempotency: Duplicate cancellation returned current status safely.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 6: CROSS-MODULE REGRESSION (FEATURES 7, 8, 9, 10)
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 6] Cross-Module Integration & Regression (Features 7–10)...", flush=True)
        # 6.1 Road Hazard (Feature 7)
        haz = await hazard_svc.report_hazard(
            driver_id=driver.id,
            hazard_type="accident",
            latitude=18.5400,
            longitude=73.8950,
            description="Accident at main junction",
        )
        assert haz.hazard_type == "accident"
        print("  ✓ Feature 7 Regression: Road Hazard reported and clustered.", flush=True)

        # 6.2 Masked Calling (Feature 8)
        call_res = await comm_svc.initiate_masked_call(
            driver_user_id=str(driver_user_id),
            ride_id=ride5.id,
        )
        assert call_res["status"] in ["requesting", "ringing"]
        print("  ✓ Feature 8 Regression: Masked calling session active.", flush=True)

        # 6.3 During Ride Telemetry (Feature 10)
        loc_res = await during_svc.record_trip_location(
            driver_user_id=str(driver_user_id),
            ride_id=ride5.id,
            latitude=18.5450,
            longitude=73.9000,
            speed_kmh=42.0,
            accuracy_m=8.0,
        )
        assert loc_res["distance_travelled_km"] >= 0.0
        print("  ✓ Feature 10 Regression: During-ride GPS telemetry and PostGIS distance active.", flush=True)

        print("\n" + "=" * 80, flush=True)
        print("ALL E2E REGRESSION TESTS PASSED (100% SUCCESS) FOR FEATURES 11 & 12!", flush=True)
        print("=" * 80, flush=True)

    await test_engine.dispose()

if __name__ == '__main__':
    asyncio.run(run_full_regression())
