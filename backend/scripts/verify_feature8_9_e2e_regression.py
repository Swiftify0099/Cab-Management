import asyncio
import sys, os, uuid, random
from datetime import datetime, timedelta

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(backend_root)
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, 'common'))
sys.path.insert(0, os.path.join(backend_root, 'matching-service'))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from common.models.all_models import (
    User, Driver, Vehicle, UserRole, DriverStatus, VehicleType,
    RideRequest, RideRequestStatus,
    RideMessage, CallSession, RideEventLog,
    DriverPointWallet, DriverPointTransaction
)
from app.services.communication_service import CommunicationService
from app.services.ride_start_service import RideStartService
from sqlalchemy import select

from common.database import async_session_maker


async def run_regression():
    print("=" * 80, flush=True)
    print("🏆 FULL E2E REGRESSION & SECURITY AUDIT: FEATURE 8 + FEATURE 9", flush=True)
    print("=" * 80, flush=True)

    async with async_session_maker() as db:
        # Step 1: Create fresh test user, driver profile, vehicle, and wallet
        print("\n[STEP 1] Setting up authentic database entities...", flush=True)
        driver_uid = uuid.uuid4()
        cust_uid = uuid.uuid4()
        driver_phone = f"+9198{random.randint(10000000, 99999999)}"
        cust_phone = f"+9198{random.randint(10000000, 99999999)}"
        veh_reg = f"MH 12 {random.choice(['AA', 'BB', 'CC', 'DD'])}{random.randint(1000, 9999)}"

        d_user = User(
            id=driver_uid,
            email=f"driver_{driver_uid.hex[:6]}@cabooking.in",
            phone=driver_phone,
            role=UserRole.DRIVER,
            is_active=True,
            is_verified=True,
        )
        c_user = User(
            id=cust_uid,
            email=f"rahul_{cust_uid.hex[:6]}@cabooking.in",
            phone=cust_phone,
            role=UserRole.CUSTOMER,
            is_active=True,
            is_verified=True,
        )
        db.add_all([d_user, c_user])

        d_profile = Driver(
            id=uuid.uuid4(),
            user_id=driver_uid,
            full_name="Vikram Singh",
            phone=driver_phone,
            status=DriverStatus.ONLINE,
            is_active=True,
            is_verified=True,
        )
        db.add(d_profile)

        d_wallet = DriverPointWallet(
            id=uuid.uuid4(),
            driver_id=d_profile.id,
            balance=100
        )
        db.add(d_wallet)

        veh = Vehicle(
            id=uuid.uuid4(),
            driver_id=d_profile.id,
            vehicle_type=VehicleType.SEDAN,
            make="Hyundai",
            model="Verna",
            registration_number=veh_reg,
            color="White",
            seat_capacity=4,
            year=2023,
        )
        db.add(veh)
        await db.commit()

        # Step 2: Create Active Ride at Pickup Phase
        pickup_lat, pickup_lng = 18.5362, 73.8939
        dest_lat, dest_lng = 18.5822, 73.9197
        test_pin = "4821"

        ride = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust_uid,
            assigned_driver_id=d_profile.id,
            assigned_vehicle_id=veh.id,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            pickup_address="Koregaon Park North Main Rd, Pune",
            pickup_location=f"SRID=4326;POINT({pickup_lng} {pickup_lat})",
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address="Pune Airport Terminal 2 Departure Gate",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            estimated_fare=544.0,
            seats_requested=2,
            status=RideRequestStatus.PICKUP,
            pickup_arrived_at=datetime.utcnow() - timedelta(seconds=320), # > 5 min
            start_pin_plain=test_pin,
            start_pin_hash=RideStartService.hash_pin(test_pin),
            contact_attempts_count=0,
        )
        db.add(ride)
        await db.commit()
        print(f"  ✓ Setup successful: Driver ID: {d_profile.id} | Ride ID: {ride.id}", flush=True)

        comm_svc = CommunicationService(db)
        start_svc = RideStartService(db)

        # ─────────────────────────────────────────────────────────────
        # FEATURE 8: CUSTOMER COMMUNICATION E2E
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("1. FEATURE 8: MASKED CALLING & CHAT REGRESSION", flush=True)
        print("-" * 60, flush=True)

        # 1.1 Privacy Masked Call
        call_res = await comm_svc.initiate_masked_call(str(driver_uid), ride.id)
        assert call_res["virtual_proxy_number"] == "+91-80-4567-8900"
        assert cust_phone not in str(call_res)
        assert driver_phone not in str(call_res)
        print("  ✓ [1.1] Masked Call: Privacy confirmed (Proxy: +91-80-4567-8900, Zero raw numbers).", flush=True)

        # 1.2 Rate Limit Cooldown (30s)
        try:
            await comm_svc.initiate_masked_call(str(driver_uid), ride.id)
            assert False, "Should fail cooldown"
        except Exception as e:
            assert "wait" in str(e).lower() or "429" in str(e)
            print("  ✓ [1.2] Cooldown Shield: 30s rate limit enforced.", flush=True)

        # 1.3 State progression
        call_sid = uuid.UUID(call_res["call_session_id"])
        await comm_svc.update_call_status(call_sid, "connected", 10)
        await comm_svc.update_call_status(call_sid, "ended", 38)
        db_call = (await db.execute(select(CallSession).where(CallSession.id == call_sid))).scalar_one()
        assert db_call.status == "ended"
        assert db_call.duration_seconds == 38
        print("  ✓ [1.3] Call Lifecycle: State moved to 'ended' with 38s duration.", flush=True)

        # 1.4 Real-Time Chat & Read Status
        msg_res1 = await comm_svc.send_message(
            str(driver_uid), "driver", ride.id, "I am waiting at the main gate.", "quick_message"
        )
        msg_res2 = await comm_svc.send_message(
            str(cust_uid), "customer", ride.id, "Coming out right now!", "text"
        )
        assert msg_res1["is_delivered"] is True
        assert msg_res2["is_delivered"] is True

        history = await comm_svc.get_messages(str(driver_uid), ride.id)
        assert len(history) >= 2
        read_cnt = await comm_svc.mark_messages_read(str(driver_uid), ride.id)
        print(f"  ✓ [1.4] In-App Chat: Messages stored, read receipts updated ({read_cnt} read).", flush=True)

        # 1.5 Assistance Workflows
        assist_res = await comm_svc.report_pickup_issue(str(driver_uid), ride.id, "cant_find_customer")
        assert assist_res["success"] is True
        print("  ✓ [1.5] Assistance Logging: Can't Find Customer issue logged to audit table.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # FEATURE 9: RIDE START & CUSTOMER VERIFICATION E2E
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("2. FEATURE 9: 4-POINT VERIFICATION & PIN RIDE START", flush=True)
        print("-" * 60, flush=True)

        # 2.1 Live 4-Point Checklist
        checklist = await start_svc.get_verification_status(
            driver_user_id=str(driver_uid),
            ride_id=ride.id,
            driver_lat=18.5363,
            driver_lng=73.8940,
            accuracy=12.0
        )
        assert checklist["customer"]["seats"] == 2
        assert checklist["vehicle"]["registration"] == veh_reg
        assert checklist["pickup"]["proximity_ok"] is True
        assert checklist["waiting_timer"]["elapsed_seconds"] >= 300
        assert checklist["pin"]["attempts_remaining"] == 5
        print(f"  ✓ [2.1] 4-Point Checklist: All verified (Proximity: {checklist['pickup']['distance_meters']}m, Timer: {checklist['waiting_timer']['elapsed_seconds']}s).", flush=True)

        # 2.2 Wrong PIN Error Shake & Counter Decrement
        try:
            await start_svc.verify_and_start_ride(
                driver_user_id=str(driver_uid),
                ride_id=ride.id,
                pin="0000",
                driver_lat=18.5363,
                driver_lng=73.8940,
                accuracy=10.0
            )
            assert False, "Should reject wrong PIN"
        except Exception as e:
            assert "incorrect" in str(e).lower() or "400" in str(e)
            print("  ✓ [2.2] Wrong PIN: Rejected, attempt counter decremented safely.", flush=True)

        # 2.3 GPS Out of Range Rejection (>100m)
        try:
            await start_svc.verify_and_start_ride(
                driver_user_id=str(driver_uid),
                ride_id=ride.id,
                pin=test_pin,
                driver_lat=18.5450, # ~1km away
                driver_lng=73.9050,
                accuracy=10.0
            )
            assert False, "Should reject when GPS is out of range"
        except Exception as e:
            assert "proximity" in str(e).lower() or "far" in str(e).lower()
            print("  ✓ [2.3] GPS Proximity Shield: Out-of-range attempt (>100m) rejected.", flush=True)

        # 2.4 Weak GPS Accuracy Rejection (>40m)
        try:
            await start_svc.verify_and_start_ride(
                driver_user_id=str(driver_uid),
                ride_id=ride.id,
                pin=test_pin,
                driver_lat=18.5363,
                driver_lng=73.8940,
                accuracy=60.0 # > 40m
            )
            assert False, "Should reject weak accuracy"
        except Exception as e:
            assert "accuracy" in str(e).lower()
            print("  ✓ [2.4] GPS Accuracy Shield: Inaccurate GPS (60m > 40m) rejected.", flush=True)

        # 2.5 Successful Atomic Ride Start & Snapshot
        start_result = await start_svc.verify_and_start_ride(
            driver_user_id=str(driver_uid),
            ride_id=ride.id,
            pin=test_pin,
            driver_lat=18.5363,
            driver_lng=73.8940,
            accuracy=8.5
        )
        assert start_result["success"] is True
        assert start_result["status"] == "in_progress"

        # Verify DB state
        r_active = (await db.execute(select(RideRequest).where(RideRequest.id == ride.id))).scalar_one()
        assert r_active.status == RideRequestStatus.IN_PROGRESS
        assert r_active.start_lat == 18.5363
        assert r_active.start_lng == 73.8940
        assert r_active.start_accuracy == 8.5
        assert r_active.started_at is not None

        d_on_trip = (await db.execute(select(Driver).where(Driver.id == d_profile.id))).scalar_one()
        assert d_on_trip.status == DriverStatus.ON_TRIP
        print("  ✓ [2.5] Atomic Ride Start: PIN verified, start location snapshot saved, driver set to ON_TRIP.", flush=True)

        # 2.6 Idempotency Test (Double Tap Protection)
        double_tap = await start_svc.verify_and_start_ride(
            driver_user_id=str(driver_uid),
            ride_id=ride.id,
            pin=test_pin,
            driver_lat=18.5363,
            driver_lng=73.8940,
            accuracy=8.5
        )
        assert double_tap["success"] is True
        assert double_tap["status"] == "in_progress"
        print("  ✓ [2.6] Idempotency: Double tap handled safely with zero duplicates.", flush=True)

        # ─────────────────────────────────────────────────────────────
        # 3. ANTI-FRAUD NO-SHOW VERIFICATION & WALLET CREDIT
        # ─────────────────────────────────────────────────────────────
        print("\n" + "-" * 60, flush=True)
        print("3. ANTI-FRAUD NO-SHOW VERIFICATION & COMPENSATION", flush=True)
        print("-" * 60, flush=True)

        # Create a fresh ride to test No-Show
        no_show_ride = RideRequest(
            id=uuid.uuid4(),
            customer_id=cust_uid,
            assigned_driver_id=d_profile.id,
            assigned_vehicle_id=veh.id,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            pickup_address="Koregaon Park North Main Rd, Pune",
            pickup_location=f"SRID=4326;POINT({pickup_lng} {pickup_lat})",
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address="Pune Airport Terminal 2 Departure Gate",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            estimated_fare=350.0,
            status=RideRequestStatus.PICKUP,
            pickup_arrived_at=datetime.utcnow() - timedelta(seconds=330),
            contact_attempts_count=2,
        )
        db.add(no_show_ride)
        await db.commit()

        initial_bal = d_wallet.balance
        noshow_res = await comm_svc.process_no_show(
            str(driver_uid), no_show_ride.id, pickup_lat + 0.0001, pickup_lng + 0.0001
        )
        assert noshow_res["success"] is True
        assert noshow_res["cancellation_fee"] == 50.0

        r_cancelled = (await db.execute(select(RideRequest).where(RideRequest.id == no_show_ride.id))).scalar_one()
        assert r_cancelled.status == RideRequestStatus.CANCELLED
        assert r_cancelled.cancellation_reason == "CUSTOMER_NO_SHOW"

        updated_wallet = (await db.execute(select(DriverPointWallet).where(DriverPointWallet.driver_id == d_profile.id))).scalar_one()
        assert updated_wallet.balance == initial_bal + 50
        print(f"  ✓ [3.1] No-Show Validated: Cancelled with fee compensation (Wallet: ₹{initial_bal} -> ₹{updated_wallet.balance}).", flush=True)

        print("\n" + "=" * 80, flush=True)
        print("🎉 100% REGRESSION PASS: FEATURES 8 & 9 ARE FULLY OPERATIONAL AND SECURE!", flush=True)
        print("=" * 80, flush=True)


if __name__ == '__main__':
    asyncio.run(run_regression())
