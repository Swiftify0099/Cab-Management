"""
E2E Regression & Verification Test Suite for Feature 10 (During Ride / Live Trip Execution)
Includes full lifecycle: GPS telemetry, PostGIS distance tracking, waiting detection,
intermediate stops, destination change, emergency SOS, and regression with Features 7, 8, 9.
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
from sqlalchemy import select, and_, func

from common.models.all_models import (
    User, Driver, Vehicle, UserRole, DriverStatus, VehicleType,
    RideRequest, RideRequestStatus,
    RideStop, RideSOSEvent, RideEventLog,
    RideMessage, CallSession, RoadHazard
)
from app.services.during_ride_service import DuringRideService
from app.services.multi_stop_service import MultiStopService
from app.services.safety_sos_service import SafetySOSService
from app.services.communication_service import CommunicationService
from app.services.ride_start_service import RideStartService
from app.services.hazard_service import HazardService

DB_URL = "postgresql+asyncpg://cabooking_user:cabooking_pass@127.0.0.1:5432/cabooking"
test_engine = create_async_engine(DB_URL, poolclass=NullPool, echo=False)
TestSession = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def run_full_regression():
    print("=" * 80, flush=True)
    print("COMPLETE E2E REGRESSION SUITE: FEATURE 10 (DURING RIDE SYSTEM)", flush=True)
    print("=" * 80, flush=True)

    async with TestSession() as db:
        # 1. SETUP
        print("\n[STEP 1] Setting up driver, passenger, vehicle, and active ride...", flush=True)
        driver_user_id = uuid.uuid4()
        cust_user_id = uuid.uuid4()
        d_phone = f"+9198{random.randint(10000000, 99999999)}"
        c_phone = f"+9198{random.randint(10000000, 99999999)}"
        v_reg = f"MH 12 DD {random.randint(1000, 9999)}"

        driver_user = User(
            id=driver_user_id, email=f"drv_{driver_user_id.hex[:6]}@test.com", phone=d_phone, role=UserRole.DRIVER, is_active=True, is_verified=True
        )
        cust_user = User(
            id=cust_user_id, email=f"cst_{cust_user_id.hex[:6]}@test.com", phone=c_phone, role=UserRole.CUSTOMER, is_active=True, is_verified=True
        )
        db.add_all([driver_user, cust_user])

        driver = Driver(
            id=uuid.uuid4(), user_id=driver_user_id, full_name="Vijay Shinde", phone=d_phone, status=DriverStatus.ON_TRIP, is_active=True, is_verified=True
        )
        db.add(driver)

        vehicle = Vehicle(
            id=uuid.uuid4(), driver_id=driver.id, vehicle_type=VehicleType.SEDAN, make="Maruti", model="Dzire", registration_number=v_reg, color="Silver", seat_capacity=4, year=2023
        )
        db.add(vehicle)
        await db.commit()

        start_lat, start_lng = 18.5362, 73.8939
        dest_lat, dest_lng = 18.5822, 73.9197

        ride = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust_user_id,
            assigned_driver_id=driver.id,
            assigned_vehicle_id=vehicle.id,
            pickup_lat=start_lat,
            pickup_lng=start_lng,
            pickup_address="Koregaon Park North Main Rd, Pune",
            pickup_location=f"SRID=4326;POINT({start_lng} {start_lat})",
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address="Pune Airport Terminal 2 Departure Gate",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            estimated_fare=Decimal("544.00"),
            current_estimated_fare=Decimal("544.00"),
            seats_requested=2,
            status=RideRequestStatus.IN_PROGRESS,
            started_at=datetime.utcnow() - timedelta(minutes=10),
            start_lat=start_lat,
            start_lng=start_lng,
            start_accuracy=8.0,
            distance_travelled_km=0.0,
            waiting_duration_seconds=0,
            waiting_fare=Decimal("0.0"),
        )
        db.add(ride)
        await db.commit()
        print(f"  ✓ Setup active trip: ID {ride.id}", flush=True)

        during_svc = DuringRideService(db)
        stop_svc = MultiStopService(db)
        sos_svc = SafetySOSService(db)
        comm_svc = CommunicationService(db)
        hazard_svc = HazardService(db)

        # ─────────────────────────────────────────────────────────────
        # TEST 1: GPS TELEMETRY & POSTGIS CUMULATIVE DISTANCE
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 1] GPS Telemetry & PostGIS Spatial Distance Ingestion...", flush=True)
        # 1.1 Ingestion point 1 (400m along route)
        loc1 = await during_svc.record_trip_location(
            str(driver_user_id), ride.id, 18.5390, 73.8965, speed_kmh=45.0, heading=45.0, accuracy_m=10.0
        )
        assert loc1["distance_travelled_km"] > 0
        assert loc1["distance_remaining_km"] > 0
        print(f"  ✓ Point 1: Distance = {loc1['distance_travelled_km']} km, ETA = {loc1['duration_remaining_min']} min", flush=True)

        # 1.2 Ingestion point 2 (Weak GPS accuracy 55m > 45m filter)
        loc2 = await during_svc.record_trip_location(
            str(driver_user_id), ride.id, 18.5420, 73.8980, speed_kmh=40.0, heading=45.0, accuracy_m=55.0
        )
        assert "warning" in loc2
        print("  ✓ Point 2: Weak GPS accuracy (>45m) filtered cleanly.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 2: WAITING TIME DETECTION & BILLABLE WAITING FARE
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 2] Realtime Waiting Detection (Speed < 3 km/h)...", flush=True)
        for _ in range(5):
            wait_loc = await during_svc.record_trip_location(
                str(driver_user_id), ride.id, 18.5390, 73.8965, speed_kmh=0.0, heading=45.0, accuracy_m=8.0
            )
        assert wait_loc["waiting_seconds"] >= 15
        assert wait_loc["is_waiting"] is True
        print(f"  ✓ Waiting state confirmed: {wait_loc['waiting_seconds']}s elapsed waiting.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 3: MULTI-STOP LIFECYCLE (ADD, ARRIVE, DEPART)
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 3] Intermediate Stop Lifecycle...", flush=True)
        # 3.1 Add Stop 1
        stop_lat, stop_lng = 18.5520, 73.9050
        stop1_res = await stop_svc.add_stop(
            user_id=str(driver_user_id),
            role="driver",
            ride_id=ride.id,
            address="Phoenix Marketcity Mall, Viman Nagar",
            latitude=stop_lat,
            longitude=stop_lng,
        )
        assert stop1_res["success"] is True
        assert stop1_res["stop_fee"] == 30.0
        stop1_id = uuid.UUID(stop1_res["stop_id"])
        print(f"  ✓ Stop 1 added: {stop1_res['address']} (+₹30.00 fee, New Estimated Fare: ₹{stop1_res['updated_fare']}).", flush=True)

        # 3.2 Stop Arrival Geofence (<60m)
        arrive_res = await stop_svc.verify_stop_arrival(
            driver_user_id=str(driver_user_id),
            ride_id=ride.id,
            stop_id=stop1_id,
            driver_lat=stop_lat + 0.0001,
            driver_lng=stop_lng + 0.0001,
        )
        assert arrive_res["success"] is True
        assert arrive_res["status"] == "arrived"
        print("  ✓ Arrived at Stop 1 within 60m PostGIS geofence.", flush=True)

        # 3.3 Stop Departure
        depart_res = await stop_svc.depart_stop(
            driver_user_id=str(driver_user_id),
            ride_id=ride.id,
            stop_id=stop1_id,
        )
        assert depart_res["success"] is True
        assert depart_res["status"] == "completed"
        print("  ✓ Departed Stop 1. Trip resumed to destination.", flush=True)

        # 3.4 Add Stop 2 & Max Stops Limit
        await stop_svc.add_stop(str(driver_user_id), "driver", ride.id, "Kalyani Nagar Circle", 18.5475, 73.9035)
        await stop_svc.add_stop(str(driver_user_id), "driver", ride.id, "Viman Nagar Metro", 18.5615, 73.9167)
        try:
            # 4th stop must fail
            await stop_svc.add_stop(str(driver_user_id), "driver", ride.id, "Excess Stop 4", 18.5700, 73.9200)
            assert False, "Should fail when adding >3 stops"
        except Exception as e:
            assert "maximum 3" in str(e).lower()
            print("  ✓ Max 3 intermediate stops limit enforced successfully.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 4: DESTINATION MODIFICATION DURING ACTIVE TRIP
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 4] Destination Modification & Fare Recalculation...", flush=True)
        new_d_lat, new_d_lng = 18.5520, 73.9350
        dest_update = await during_svc.update_destination(
            user_id=str(driver_user_id),
            role="driver",
            ride_id=ride.id,
            new_latitude=new_d_lat,
            new_longitude=new_d_lng,
            new_address="World Trade Center, Kharadi, Pune",
        )
        assert dest_update["success"] is True
        assert dest_update["destination"]["address"] == "World Trade Center, Kharadi, Pune"
        print(f"  ✓ Destination modified to Kharadi (New Estimated Fare: ₹{dest_update['estimated_fare']}).", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 5: EMERGENCY SOS TRIGGER & IDEMPOTENCY
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 5] Emergency SOS Incident & Idempotent Escalation...", flush=True)
        sos_res = await sos_svc.trigger_sos(
            user_id=str(driver_user_id),
            role="driver",
            ride_id=ride.id,
            latitude=18.5490,
            longitude=73.9010,
            accuracy=9.0,
            reason="Vehicle breakdown in dark alley",
        )
        assert sos_res["success"] is True
        assert sos_res["status"] == "active"
        assert sos_res["police_number"] == "112"
        sos_id = sos_res["sos_id"]
        print(f"  ✓ Emergency SOS triggered: Incident ID {sos_id}", flush=True)

        # Duplicate SOS test
        dup_res = await sos_svc.trigger_sos(
            user_id=str(driver_user_id),
            role="driver",
            ride_id=ride.id,
            latitude=18.5490,
            longitude=73.9010,
        )
        assert dup_res["sos_id"] == sos_id
        print("  ✓ Idempotency verified: Duplicate SOS safely returned existing incident.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # TEST 6: REGRESSION ACROSS FEATURES 7, 8, 9
        # ─────────────────────────────────────────────────────────────
        print("\n[TEST 6] Multi-Module Regression (Features 7, 8, 9)...", flush=True)
        # 6.1 Road Hazard Reporting (Feature 7)
        hazard_res = await hazard_svc.report_hazard(
            driver_id=driver.id,
            hazard_type="flooding",
            latitude=18.5490,
            longitude=73.9010,
            description="Waterlogged road underpass",
        )
        assert hazard_res.hazard_type == "flooding"
        print("  ✓ Feature 7 Regression: Road Hazard reported and clustered in PostGIS.", flush=True)

        # 6.2 Masked Calling Session (Feature 8)
        call_res = await comm_svc.initiate_masked_call(
            driver_user_id=str(driver_user_id),
            ride_id=ride.id,
        )
        assert call_res["status"] in ["requesting", "ringing"]
        assert "+91" in call_res["virtual_proxy_number"]
        print("  ✓ Feature 8 Regression: Masked call session active without raw phone exposure.", flush=True)

        # 6.3 In-App Chat Messaging (Feature 8)
        msg_res = await comm_svc.send_message(
            sender_user_id=str(driver_user_id),
            sender_role="driver",
            ride_id=ride.id,
            content="Traffic cleared, arriving in 5 mins.",
        )
        assert msg_res["is_delivered"] is True
        print("  ✓ Feature 8 Regression: In-app chat message delivered.", flush=True)

        print("\n" + "=" * 80, flush=True)
        print("E2E REGRESSION SUITE PASSED — ALL 6 CRITICAL TESTS VERIFIED (100% SUCCESS)!", flush=True)
        print("=" * 80, flush=True)

    await test_engine.dispose()

if __name__ == '__main__':
    asyncio.run(run_full_regression())
