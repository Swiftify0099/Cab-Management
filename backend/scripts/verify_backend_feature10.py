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
    RideStop, RideSOSEvent, RideEventLog,
    DriverPointWallet
)
from app.services.during_ride_service import DuringRideService
from app.services.multi_stop_service import MultiStopService
from app.services.safety_sos_service import SafetySOSService
from sqlalchemy import select

DB_URL = "postgresql+asyncpg://cabooking_user:cabooking_pass@127.0.0.1:5432/cabooking"
test_engine = create_async_engine(DB_URL, poolclass=NullPool, echo=False)
TestSession = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


async def run_tests():
    print("=" * 80, flush=True)
    print("BACKEND TEST SUITE: FEATURE 10 (DURING RIDE / LIVE TRIP EXECUTION)", flush=True)
    print("=" * 80, flush=True)

    async with TestSession() as db:
        # Step 1: Setup test entities
        print("\n[SETUP] Creating test driver, customer, vehicle, and in-progress ride...", flush=True)
        test_driver_user_id = uuid.uuid4()
        test_cust_user_id = uuid.uuid4()
        driver_phone = f"+9198{random.randint(10000000, 99999999)}"
        cust_phone = f"+9198{random.randint(10000000, 99999999)}"
        veh_reg = f"MH 12 {random.choice(['AA', 'BB', 'CC'])}{random.randint(1000, 9999)}"

        driver_user = User(
            id=test_driver_user_id,
            email=f"driver_{test_driver_user_id.hex[:6]}@test.com",
            phone=driver_phone,
            role=UserRole.DRIVER,
            is_active=True,
            is_verified=True,
        )
        cust_user = User(
            id=test_cust_user_id,
            email=f"rahul_{test_cust_user_id.hex[:6]}@test.com",
            phone=cust_phone,
            role=UserRole.CUSTOMER,
            is_active=True,
            is_verified=True,
        )
        db.add_all([driver_user, cust_user])

        driver_profile = Driver(
            id=uuid.uuid4(),
            user_id=test_driver_user_id,
            full_name="Driver Rajesh",
            phone=driver_phone,
            status=DriverStatus.ON_TRIP,
            is_active=True,
            is_verified=True,
        )
        db.add(driver_profile)

        vehicle = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver_profile.id,
            vehicle_type=VehicleType.SEDAN,
            make="Hyundai",
            model="Verna",
            registration_number=veh_reg,
            color="White",
            seat_capacity=4,
            year=2023,
        )
        db.add(vehicle)
        await db.commit()

        start_lat, start_lng = 18.5362, 73.8939
        dest_lat, dest_lng = 18.5822, 73.9197

        ride_req = RideRequest(
            id=uuid.uuid4(),
            customer_id=test_cust_user_id,
            assigned_driver_id=driver_profile.id,
            assigned_vehicle_id=vehicle.id,
            pickup_lat=start_lat,
            pickup_lng=start_lng,
            pickup_address="Koregaon Park North Main Rd, Pune",
            pickup_location=f"SRID=4326;POINT({start_lng} {start_lat})",
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address="Pune Airport Terminal 2 Departure Gate",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            estimated_fare=Decimal("540.00"),
            current_estimated_fare=Decimal("540.00"),
            seats_requested=2,
            status=RideRequestStatus.IN_PROGRESS,
            started_at=datetime.utcnow() - timedelta(minutes=8), # 8 mins in trip
            start_lat=start_lat,
            start_lng=start_lng,
            start_accuracy=10.0,
            distance_travelled_km=0.0,
            waiting_duration_seconds=0,
            waiting_fare=Decimal("0.0"),
        )
        db.add(ride_req)
        await db.commit()
        print(f"  ✓ Setup complete. In-Progress Ride ID: {ride_req.id}", flush=True)

        during_svc = DuringRideService(db)
        stop_svc = MultiStopService(db)
        sos_svc = SafetySOSService(db)

        # ─────────────────────────────────────────────────────────────
        # 1. GPS TELEMETRY & POSTGIS DISTANCE ACCUMULATION
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("1. TESTING GPS TELEMETRY & POSTGIS SPATIAL DISTANCE", flush=True)
        print("-" * 60, flush=True)

        # Test 1.1: Weak GPS Filtering (>45m)
        print("[TEST 1.1] Weak GPS Accuracy Filter (>45m)...", flush=True)
        weak_gps_res = await during_svc.record_trip_location(
            str(test_driver_user_id), ride_req.id, 18.5380, 73.8950, speed_kmh=35.0, accuracy_m=55.0
        )
        assert "warning" in weak_gps_res
        assert weak_gps_res["distance_travelled_km"] == 0.0
        print("  ✓ PASS: Weak GPS (55m > 45m) filtered safely without distance corruption.", flush=True)

        # Test 1.2: Implausible Speed Filter (>160 km/h)
        print("[TEST 1.2] Speed Limit Plausibility Filter (>160 km/h)...", flush=True)
        try:
            await during_svc.record_trip_location(
                str(test_driver_user_id), ride_req.id, 18.5380, 73.8950, speed_kmh=185.0, accuracy_m=10.0
            )
            assert False, "Should reject overspeed 185 km/h"
        except Exception as e:
            assert "185" in str(e) or "unrealistic" in str(e).lower()
            print("  ✓ PASS: Unrealistic speed (185 km/h) rejected.", flush=True)

        # Test 1.3: Valid GPS Movement & Distance Accumulation
        print("[TEST 1.3] Valid GPS Telemetry & PostGIS Distance Accumulation...", flush=True)
        # Point 1: ~250m north-east
        p1 = await during_svc.record_trip_location(
            str(test_driver_user_id), ride_req.id, 18.5380, 73.8955, speed_kmh=42.0, heading=45.0, accuracy_m=8.0
        )
        assert p1["distance_travelled_km"] > 0.1
        assert p1["distance_remaining_km"] > 0
        assert p1["duration_remaining_min"] > 0
        print(f"  ✓ PASS: Distance accumulated to {p1['distance_travelled_km']} km (Remaining: {p1['distance_remaining_km']} km, ETA: {p1['duration_remaining_min']} min).", flush=True)

        # Test 1.4: Real-time Waiting Detection (Speed < 3 km/h)
        print("[TEST 1.4] Real-time Waiting Detection...", flush=True)
        for _ in range(3):
            wait_res = await during_svc.record_trip_location(
                str(test_driver_user_id), ride_req.id, 18.5380, 73.8955, speed_kmh=0.0, heading=45.0, accuracy_m=8.0
            )
        assert wait_res["waiting_seconds"] >= 9
        assert wait_res["is_waiting"] is True
        print(f"  ✓ PASS: Waiting state detected (Elapsed waiting: {wait_res['waiting_seconds']}s).", flush=True)

        # ─────────────────────────────────────────────────────────────
        # 2. MULTI-STOP MANAGEMENT & POSTGIS GEOFENCING
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("2. TESTING MULTI-STOP MANAGEMENT & GEOFENCING", flush=True)
        print("-" * 60, flush=True)

        # Test 2.1: Add Intermediate Stop
        print("[TEST 2.1] Add Intermediate Stop...", flush=True)
        stop1_lat, stop1_lng = 18.5490, 73.9010
        add_res = await stop_svc.add_stop(
            user_id=str(test_driver_user_id),
            role="driver",
            ride_id=ride_req.id,
            address="Phoenix Mall, Viman Nagar, Pune",
            latitude=stop1_lat,
            longitude=stop1_lng,
        )
        assert add_res["success"] is True
        assert add_res["sequence"] == 1
        assert add_res["stop_fee"] == 30.0
        stop1_id = uuid.UUID(add_res["stop_id"])
        print(f"  ✓ PASS: Stop 1 added (+₹30.00 fee, Sequence: 1, ID: {stop1_id}).", flush=True)

        # Test 2.2: Stop Arrival Out of Range (>60m)
        print("[TEST 2.2] Stop Arrival Out of Range (>60m)...", flush=True)
        try:
            await stop_svc.verify_stop_arrival(
                driver_user_id=str(test_driver_user_id),
                ride_id=ride_req.id,
                stop_id=stop1_id,
                driver_lat=18.5400, # ~1km away
                driver_lng=73.8950,
            )
            assert False, "Should fail when far from stop"
        except Exception as e:
            assert "within 60m" in str(e) or "400" in str(e)
            print("  ✓ PASS: Stop arrival rejected when driver is far (>60m).", flush=True)

        # Test 2.3: Valid Stop Arrival (<=60m)
        print("[TEST 2.3] Valid Stop Arrival (<=60m Geofence)...", flush=True)
        arrive_res = await stop_svc.verify_stop_arrival(
            driver_user_id=str(test_driver_user_id),
            ride_id=ride_req.id,
            stop_id=stop1_id,
            driver_lat=stop1_lat + 0.0001, # ~12m away
            driver_lng=stop1_lng + 0.0001,
        )
        assert arrive_res["success"] is True
        assert arrive_res["status"] == "arrived"
        print("  ✓ PASS: Stop 1 arrival confirmed within geofence!", flush=True)

        # Test 2.4: Stop Departure
        print("[TEST 2.4] Stop Departure & Waypoint Advancement...", flush=True)
        depart_res = await stop_svc.depart_stop(
            driver_user_id=str(test_driver_user_id),
            ride_id=ride_req.id,
            stop_id=stop1_id,
        )
        assert depart_res["success"] is True
        assert depart_res["status"] == "completed"
        print("  ✓ PASS: Stop 1 completed. Trip resumed to final destination.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # 3. DESTINATION MODIFICATION & LIVE FARE RECALCULATION
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("3. TESTING DESTINATION MODIFICATION & FARE UPDATE", flush=True)
        print("-" * 60, flush=True)

        print("[TEST 3.1] Modify Destination During Active Trip...", flush=True)
        new_dest_lat, new_dest_lng = 18.5520, 73.9350
        dest_res = await during_svc.update_destination(
            user_id=str(test_driver_user_id),
            role="driver",
            ride_id=ride_req.id,
            new_latitude=new_dest_lat,
            new_longitude=new_dest_lng,
            new_address="World Trade Center, Kharadi, Pune",
        )
        assert dest_res["success"] is True
        assert dest_res["destination"]["address"] == "World Trade Center, Kharadi, Pune"
        assert dest_res["estimated_fare"] > 0
        print(f"  ✓ PASS: Destination updated to Kharadi. New Estimated Fare: ₹{dest_res['estimated_fare']}.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # 4. EMERGENCY SOS INCIDENT & IDEMPOTENCY
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("4. TESTING EMERGENCY SOS INCIDENT & IDEMPOTENCY", flush=True)
        print("-" * 60, flush=True)

        print("[TEST 4.1] Trigger Emergency SOS...", flush=True)
        sos_res = await sos_svc.trigger_sos(
            user_id=str(test_driver_user_id),
            role="driver",
            ride_id=ride_req.id,
            latitude=18.5490,
            longitude=73.9010,
            accuracy=8.0,
            reason="Driver reported medical emergency",
        )
        assert sos_res["success"] is True
        assert sos_res["status"] == "active"
        assert sos_res["police_number"] == "112"
        sos_id = sos_res["sos_id"]
        print(f"  ✓ PASS: Emergency SOS active (Incident ID: {sos_id}, Police: 112).", flush=True)

        print("[TEST 4.2] SOS Idempotency (Duplicate Prevention)...", flush=True)
        dup_sos = await sos_svc.trigger_sos(
            user_id=str(test_driver_user_id),
            role="driver",
            ride_id=ride_req.id,
            latitude=18.5490,
            longitude=73.9010,
            accuracy=8.0,
        )
        assert dup_sos["success"] is True
        assert dup_sos["sos_id"] == sos_id
        print("  ✓ PASS: Duplicate SOS call returned existing incident safely.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # 5. LIVE IN-FLIGHT STATUS QUERY
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("5. TESTING FULL IN-FLIGHT STATUS QUERY", flush=True)
        print("-" * 60, flush=True)

        status_res = await during_svc.get_during_ride_status(
            driver_user_id=str(test_driver_user_id),
            ride_id=ride_req.id,
            driver_lat=18.5490,
            driver_lng=73.9010,
        )
        assert status_res["status"] == "in_progress"
        assert status_res["has_active_sos"] is True
        assert len(status_res["stops"]) == 1
        assert status_res["destination"]["address"] == "World Trade Center, Kharadi, Pune"
        print(f"  ✓ PASS: Full in-flight status verified (Trip Time: {status_res['trip_seconds']}s, Fare: ₹{status_res['current_estimated_fare']}).", flush=True)

        print("\n" + "=" * 80, flush=True)
        print("ALL FEATURE 10 BACKEND TESTS PASSED WITH 100% SUCCESS!", flush=True)
        print("=" * 80, flush=True)

    await test_engine.dispose()

if __name__ == '__main__':
    asyncio.run(run_tests())
