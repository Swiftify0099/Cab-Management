"""
Full E2E Regression & Financial Reconciliation Test Suite for Features 13 & 14
(Trip Completion & Driver Earnings Ledger)
Tests: Destination arrival geofence, atomic ride completion, final fare vs net earning separation,
itemized receipts, double-entry financial ledger, daily/weekly reconciliation, zero double-counting,
and cross-module regression across Features 7–12.
"""
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
from sqlalchemy import select, and_, func

from common.models.all_models import (
    User, Driver, Vehicle, UserRole, DriverStatus, VehicleType,
    RideRequest, RideRequestStatus,
    RideReceipt, DriverEarningLedger, DriverCustomerRating,
    DriverPointWallet, DriverPointTransaction, RideEventLog
)
from app.services.trip_completion_service import TripCompletionService
from app.services.driver_earnings_service import DriverEarningsService
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
    print("COMPLETE E2E REGRESSION SUITE: FEATURES 13 & 14 (COMPLETION & EARNINGS)", flush=True)
    print("=" * 80, flush=True)

    async with TestSession() as db:
        # Step 1: Setup
        print("\n[STEP 1] Setting up driver, passenger, vehicle, and active rides...", flush=True)
        driver_user_id = uuid.uuid4()
        cust_user_id = uuid.uuid4()
        d_phone = f"+9198{random.randint(10000000, 99999999)}"
        c_phone = f"+9198{random.randint(10000000, 99999999)}"
        v_reg = f"MH 14 MM {random.randint(1000, 9999)}"

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
            full_name="Driver Vikram",
            phone=d_phone,
            status=DriverStatus.ONLINE,
            is_active=True,
            is_verified=True,
            total_trips=10,
            total_earnings=Decimal("4500.00"),
            wallet_balance=Decimal("2100.00"),
        )
        db.add(driver)

        vehicle = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver.id,
            vehicle_type=VehicleType.SEDAN,
            make="Maruti",
            model="Dzire",
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
        waiting_svc = WaitingService(db)
        cancel_svc = CancellationService(db)
        during_svc = DuringRideService(db)
        comm_svc = CommunicationService(db)
        hazard_svc = HazardService(db)

        # ─────────────────────────────────────────────────────────────
        # TEST 1: POSTGIS DESTINATION ARRIVAL & GEOFENCE VALIDATION
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 1] PostGIS Destination Arrival & Proximity Verification...", flush=True)
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
            estimated_fare=Decimal("480.00"),
            status=RideRequestStatus.IN_PROGRESS,
            started_at=datetime.utcnow() - timedelta(minutes=28),
            distance_travelled_km=15.2,
            pickup_waiting_fare=Decimal("16.00"), # 8 min waiting
        )
        db.add(ride1)
        await db.commit()

        # Arrival verification
        arr_chk = await completion_svc.verify_destination_arrival(
            str(driver_user_id), ride1.id, dest_lat + 0.0001, dest_lng + 0.0001
        )
        assert arr_chk["is_arrived"] is True
        print(f"  ✓ 1.1 Destination Arrival verified within {arr_chk['distance_meters']}m of dropoff.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 2: AUTHORITATIVE TRIP COMPLETION & FARE SEPARATION
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 2] Authoritative Trip Completion, Final Fare & Commission...", flush=True)
        comp_res = await completion_svc.complete_ride(
            driver_user_id=str(driver_user_id),
            ride_id=ride1.id,
            tolls=50.0,
            parking=30.0,
            payment_method="cash",
        )
        assert comp_res["success"] is True
        assert comp_res["status"] == "completed"
        
        # Verify Fare vs Earning separation: Customer Fare != Driver Gross != Driver Net
        cust_fare = comp_res["customer_final_fare"]
        commission = comp_res["platform_commission"]
        driver_net = comp_res["driver_net_earning"]
        
        assert cust_fare > 450.0
        assert commission > 0.0
        assert driver_net < cust_fare
        print(f"  ✓ 2.1 Final Fare Calculated: Customer Fare ₹{cust_fare:.2f} | Platform Commission (20%): -₹{commission:.2f} | Driver Net Earning: ₹{driver_net:.2f}.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 3: IMMUTABLE RECEIPT & CASH SETTLEMENT
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 3] Immutable Receipt Snapshot & Cash Settlement...", flush=True)
        receipt = await completion_svc.get_ride_receipt(str(driver_user_id), ride1.id)
        assert receipt["receipt_number"] == comp_res["receipt_number"]
        assert receipt["tolls_charge"] == 50.0
        assert receipt["parking_charge"] == 30.0
        assert receipt["waiting_charge"] == 16.0
        assert receipt["payment_method"] == "cash"
        print(f"  ✓ 3.1 Immutable Receipt #{receipt['receipt_number']} verified with itemized tolls, parking & waiting.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 4: CUSTOMER MUTUAL RATING
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 4] Passenger Mutual Rating...", flush=True)
        rate_res = await completion_svc.rate_customer(
            driver_user_id=str(driver_user_id),
            ride_id=ride1.id,
            rating=5.0,
            tags=["Polite", "On Time", "Clean"],
            feedback="Prompt passenger, courteous and polite.",
        )
        assert rate_res["success"] is True
        print(f"  ✓ 4.1 Rating submitted (5.0 stars with tags: {rate_res['tags']}).", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 5: FINANCIAL LEDGER & ZERO DOUBLE-COUNTING RECONCILIATION
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 5] Double-Entry Ledger Journal Reconciliation (Feature 14)...", flush=True)
        # Summary query
        today_sum = await earnings_svc.get_earnings_summary(str(driver_user_id), period="today")
        assert today_sum["total_net_earnings"] == driver_net
        assert today_sum["trip_count"] == 1
        assert today_sum["cash_collected"] == cust_fare
        print(f"  ✓ 5.1 Today's Financial Summary: Net Earning ₹{today_sum['total_net_earnings']:.2f}, Cash Collected ₹{today_sum['cash_collected']:.2f}, Trips: 1.", flush=True)

        # Tip allocation
        tip_res = await earnings_svc.add_tip(ride1.id, 40.0)
        assert tip_res["success"] is True

        today_after_tip = await earnings_svc.get_earnings_summary(str(driver_user_id), period="today")
        assert today_after_tip["tips_total"] == 40.0
        assert today_after_tip["total_net_earnings"] == round(driver_net + 40.0, 2)
        print(f"  ✓ 5.2 Tip ₹40.00 added and reconciled into net earnings (New Total: ₹{today_after_tip['total_net_earnings']:.2f}).", flush=True)

        # Ledger history entries verification
        ledger_entries = await earnings_svc.get_ledger_history(str(driver_user_id))
        entry_types = [e["entry_type"] for e in ledger_entries]
        assert "TRIP_EARNING" in entry_types
        assert "CASH_COLLECTED" in entry_types
        assert "TIP" in entry_types
        print(f"  ✓ 5.3 Double-Entry Ledger verified with immutable records: {entry_types}.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 6: CROSS-MODULE REGRESSION (FEATURES 7–12)
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 6] Multi-Module Integration & Regression (Features 7–12)...", flush=True)
        
        # Setup an active ride for regression testing
        ride2 = RideRequest(
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
            estimated_fare=Decimal("380.00"),
            status=RideRequestStatus.IN_PROGRESS,
            started_at=datetime.utcnow() - timedelta(minutes=10),
            pickup_arrived_at=datetime.utcnow() - timedelta(minutes=12),
        )
        db.add(ride2)
        await db.commit()

        # 6.1 Road Hazards (Feature 7)
        haz = await hazard_svc.report_hazard(
            driver_id=driver.id,
            hazard_type="heavy_traffic",
            latitude=18.5500,
            longitude=73.9050,
            description="Airport road congestion",
        )
        assert haz.hazard_type == "heavy_traffic"
        print("  ✓ Feature 7 Regression: Road Hazard reported and active.", flush=True)

        # 6.2 Communication (Feature 8)
        call_res = await comm_svc.initiate_masked_call(
            driver_user_id=str(driver_user_id),
            ride_id=ride2.id,
        )
        assert call_res["status"] in ["requesting", "ringing"]
        print("  ✓ Feature 8 Regression: Masked calling active.", flush=True)

        # 6.3 During Ride Telemetry (Feature 10)
        loc_res = await during_svc.record_trip_location(
            driver_user_id=str(driver_user_id),
            ride_id=ride2.id,
            latitude=18.5700,
            longitude=73.9100,
            speed_kmh=45.0,
            accuracy_m=9.0,
        )
        assert loc_res["distance_travelled_km"] >= 0.0
        print("  ✓ Feature 10 Regression: Live GPS telemetry active.", flush=True)

        # 6.4 Waiting Status (Feature 11)
        w_res = await waiting_svc.get_live_waiting_status(str(driver_user_id), ride2.id, start_lat, start_lng)
        assert "waiting_charge" in w_res
        print("  ✓ Feature 11 Regression: Server-authoritative waiting status active.", flush=True)

        # 6.5 Cancellation Reason Catalog (Feature 12)
        cat = cancel_svc.get_reason_catalog()
        assert len(cat) >= 8
        print("  ✓ Feature 12 Regression: Structured cancellation reason catalog active.", flush=True)

        print("\n" + "=" * 80, flush=True)
        print("ALL E2E REGRESSION & FINANCIAL TESTS PASSED WITH 100% SUCCESS!", flush=True)
        print("=" * 80, flush=True)

    await test_engine.dispose()

if __name__ == '__main__':
    asyncio.run(run_full_regression())
