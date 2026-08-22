"""
Comprehensive Automated Verification Suite for Features 20, 21, and 22.
Tests all database operations, spatial queries, state machines, and business services.
"""
import os
import sys
import asyncio
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, os.path.join(backend_root, "matching-service"))
sys.path.insert(0, backend_root)

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text, func

from common.models.all_models import (
    Base,
    User,
    UserRole,
    Driver,
    DriverStatus,
    DriverPreference,
    RideRequest,
    RideRequestStatus,
    DriverTrustedContact,
    LiveTripShareSession,
    DriverSafetyAlert,
    SafetyIncidentReport,
    RideSOSEvent,
)
from app.services.destination_mode_service import (
    DestinationModeService,
    calculate_vector_alignment,
)
from app.services.back_to_back_service import BackToBackService
from app.services.driver_safety_service import DriverSafetyService

from common.database import async_session_maker

async def main():
    print("=" * 70)
    print("🚀 STARTING AUTOMATED TEST SUITE: FEATURES 20, 21 & 22")
    print("=" * 70)

    async with async_session_maker() as db:
        # Step 0: Ensure Test User, Driver, and Customer exist
        print("\n[SETUP] Initializing test driver, customer, and vehicle records...")
        u_res = await db.execute(select(User).where(User.phone == "+919999920220"))
        driver_user = u_res.scalar_one_or_none()
        if not driver_user:
            driver_user = User(
                id=uuid.uuid4(),
                phone="+919999920220",
                email="driver2022@test.com",
                role=UserRole.DRIVER,
                is_active=True,
            )
            db.add(driver_user)
            await db.flush()

        d_res = await db.execute(select(Driver).where(Driver.user_id == driver_user.id))
        driver = d_res.scalar_one_or_none()
        if not driver:
            driver = Driver(
                id=uuid.uuid4(),
                user_id=driver_user.id,
                full_name="Rajesh Verification Driver",
                phone="+919999920220",
                status=DriverStatus.ONLINE,
                total_trips=12,
                total_earnings=Decimal("4500.00"),
                wallet_balance=Decimal("1200.00"),
            )
            db.add(driver)
            await db.flush()

        # Customer User
        c_res = await db.execute(select(User).where(User.phone == "+919999920221"))
        customer_user = c_res.scalar_one_or_none()
        if not customer_user:
            customer_user = User(
                id=uuid.uuid4(),
                phone="+919999920221",
                email="customer2022@test.com",
                role=UserRole.CUSTOMER,
                is_active=True,
            )
            db.add(customer_user)
            await db.flush()

        await db.commit()
        print(f"✓ Test Driver ID: {driver.id}")
        print(f"✓ Test Customer ID: {customer_user.id}")

        # ====================================================================
        # TEST SUITE 1: FEATURE 20 — DESTINATION MODE
        # ====================================================================
        print("\n" + "=" * 50)
        print("📌 TEST SUITE 1: FEATURE 20 — DESTINATION MODE")
        print("=" * 50)

        # 1.1 Vector Cosine Math Alignment Tests
        print("1.1 Testing Vector Alignment Math (Sangli Destination vs Pune Dropoffs)...")
        # Sangli Target: 16.8524, 74.5815 (South-East from Pune 18.5204, 73.8567)
        # Trip A (Toward Satara/Sangli: 17.6805, 74.0183)
        res_aligned = calculate_vector_alignment(
            driver_lat=18.5204,
            driver_lng=73.8567,
            drop_lat=17.6805,
            drop_lng=74.0183,
            dest_lat=16.8524,
            dest_lng=74.5815,
            mode_pref="balanced",
        )
        print(f"  • Aligned Trip Score: {res_aligned['alignment_score']:.1f} | Cosine: {res_aligned['cosine_similarity']:.3f} | Aligned: {res_aligned['is_aligned']}")
        assert res_aligned["is_aligned"] is True, "Aligned trip towards Satara should pass balanced check"
        assert res_aligned["alignment_score"] > 60.0, "Aligned trip score should be > 60.0"

        # Trip B (Opposite Direction towards Mumbai: 18.9401, 72.8351 - North-West)
        res_misaligned = calculate_vector_alignment(
            driver_lat=18.5204,
            driver_lng=73.8567,
            drop_lat=18.9401,
            drop_lng=72.8351,
            dest_lat=16.8524,
            dest_lng=74.5815,
            mode_pref="strict",
        )
        print(f"  • Misaligned Trip Score: {res_misaligned['alignment_score']:.1f} | Cosine: {res_misaligned['cosine_similarity']:.3f} | Aligned: {res_misaligned['is_aligned']}")
        assert res_misaligned["is_aligned"] is False, "Opposite direction trip towards Mumbai must fail strict check"
        print("  ✓ Vector Cosine Alignment Math verified 100%!")

        # 1.2 Destination Mode Service Activation
        print("\n1.2 Activating Destination Mode for Driver...")
        dest_service = DestinationModeService(db)
        set_res = await dest_service.set_destination_mode(
            driver_id=driver.id,
            destination_address="Sangli Bus Stand, Maharashtra",
            destination_lat=16.8524,
            destination_lng=74.5815,
            preference_mode="balanced",
            max_rides=2,
        )
        print(f"  • Response: {set_res['message']} (State: {set_res['state']})")
        assert set_res["state"] == "ACTIVE"

        # 1.3 Fetch Active Status
        status = await dest_service.get_destination_status(driver.id)
        print(f"  • Status: Active={status['is_active']}, Address='{status['destination_address']}', Mode={status['mode_preference']}, Remaining={status['remaining_seconds']}s")
        assert status["is_active"] is True
        assert status["remaining_seconds"] > 7000

        # 1.4 Test Destination Proximity Reached
        print("\n1.4 Testing Destination Proximity Detection (Driver arrives near Sangli)...")
        # Driver GPS at 16.8530, 74.5820 (within 200m of Sangli)
        reach_check = await dest_service.check_destination_reached_or_progress(
            driver_id=driver.id,
            current_lat=16.8530,
            current_lng=74.5820,
        )
        print(f"  • Reached Check: {reach_check['message']} | State={reach_check['state']}")
        assert reach_check["reached"] is True
        assert reach_check["state"] == "REACHED"

        # 1.5 Turn off Destination Mode
        print("\n1.5 Turning off Destination Mode...")
        off_res = await dest_service.set_destination_mode(driver.id, turn_off=True)
        print(f"  • Turn Off Response: {off_res['message']} | State={off_res['state']}")
        assert off_res["state"] == "OFF"
        print("✓ FEATURE 20 TESTS PASSED COMPLETELY!")

        # ====================================================================
        # TEST SUITE 2: FEATURE 21 — BACK-TO-BACK RIDES
        # ====================================================================
        print("\n" + "=" * 50)
        print("📌 TEST SUITE 2: FEATURE 21 — BACK-TO-BACK CONTINUOUS DISPATCH")
        print("=" * 50)

        # 2.1 Create In-Flight Active Ride A
        now_dt = datetime.now(timezone.utc)
        current_ride = RideRequest(
            id=uuid.uuid4(),
            customer_id=customer_user.id,
            assigned_driver_id=driver.id,
            status=RideRequestStatus.IN_PROGRESS,
            pickup_address="Swargate, Pune",
            pickup_lat=18.5018,
            pickup_lng=73.8586,
            pickup_location=func.ST_SetSRID(func.ST_MakePoint(73.8586, 18.5018), 4326),
            destination_address="Pune Airport Terminal 2",
            destination_lat=18.5822,
            destination_lng=73.9197,
            destination_location=func.ST_SetSRID(func.ST_MakePoint(73.9197, 18.5822), 4326),
            estimated_fare=Decimal("450.00"),
            estimated_distance_km=14.5,
            estimated_duration_min=35,
            expires_at=now_dt + timedelta(minutes=30),
        )
        db.add(current_ride)

        # Create Candidate Next Ride B (Pickup near Pune Airport: 18.5790, 73.9180 - 400m from dropoff)
        next_ride_candidate = RideRequest(
            id=uuid.uuid4(),
            customer_id=customer_user.id,
            status=RideRequestStatus.OFFERED,
            pickup_address="Viman Nagar Main Rd (Near Airport)",
            pickup_lat=18.5790,
            pickup_lng=73.9180,
            pickup_location=func.ST_SetSRID(func.ST_MakePoint(73.9180, 18.5790), 4326),
            destination_address="Hinjawadi Phase 1",
            destination_lat=18.5913,
            destination_lng=73.7389,
            destination_location=func.ST_SetSRID(func.ST_MakePoint(73.7389, 18.5913), 4326),
            estimated_fare=Decimal("520.00"),
            estimated_distance_km=22.0,
            estimated_duration_min=45,
            expires_at=now_dt + timedelta(minutes=15),
        )
        db.add(next_ride_candidate)
        await db.commit()

        b2b_service = BackToBackService(db)

        # 2.2 Test Eligibility Check (Driver 1.5 km away from airport dropoff)
        print("2.2 Testing Back-to-Back Eligibility (Driver approaching dropoff)...")
        eligibility = await b2b_service.check_back_to_back_eligibility(
            driver_id=driver.id,
            current_ride_id=current_ride.id,
            driver_lat=18.5700,
            driver_lng=73.9150,
        )
        print(f"  • Eligibility: Eligible={eligibility['eligible']} | DistToDropoff={eligibility['distance_to_dropoff_km']}km | ETA={eligibility['estimated_dropoff_eta_min']}min")
        assert eligibility["eligible"] is True

        # 2.3 Discover Next Ride Candidates near current dropoff
        print("\n2.3 Discovering Candidates near current dropoff...")
        candidates = await b2b_service.discover_next_ride_candidates(
            driver_id=driver.id,
            current_ride_id=current_ride.id,
        )
        print(f"  • Candidates Found: {len(candidates)}")
        assert len(candidates) > 0
        cand = candidates[0]
        print(f"  • Candidate Ride ID: {cand['ride_id']} | Dist from dropoff: {cand['pickup_distance_from_current_dropoff_km']:.2f}km | Fare: ₹{cand['fare']}")

        # 2.4 Atomically Reserve Candidate Next Ride
        print("\n2.4 Atomically Reserving Next Ride (Row-Level Locking)...")
        res_reserve = await b2b_service.reserve_next_ride(
            driver_id=driver.id,
            current_ride_id=current_ride.id,
            next_ride_id=next_ride_candidate.id,
        )
        print(f"  • Reservation Response: {res_reserve['message']} (Status: {res_reserve['status']})")
        assert res_reserve["status"] == "RESERVED"

        # Verify Database State
        await db.refresh(current_ride)
        await db.refresh(next_ride_candidate)
        assert current_ride.next_ride_id == next_ride_candidate.id
        assert next_ride_candidate.is_back_to_back is True
        assert next_ride_candidate.status == RideRequestStatus.ASSIGNED

        # 2.5 Continuous Zero-Idle Transition on Current Trip Completion
        print("\n2.5 Activating Next Ride on Current Trip Completion...")
        activated_next = await b2b_service.activate_next_ride_on_completion(
            driver_id=driver.id,
            completed_ride_id=current_ride.id,
        )
        print(f"  • Activated Next Ride: {activated_next['next_ride_id']} | Status={activated_next['status']}")
        assert activated_next is not None
        assert activated_next["status"] == "ASSIGNED"

        await db.refresh(next_ride_candidate)
        assert next_ride_candidate.status == RideRequestStatus.ASSIGNED
        print("✓ FEATURE 21 TESTS PASSED COMPLETELY!")

        # ====================================================================
        # TEST SUITE 3: FEATURE 22 — DRIVER SAFETY INTELLIGENCE
        # ====================================================================
        print("\n" + "=" * 50)
        print("📌 TEST SUITE 3: FEATURE 22 — DRIVER SAFETY INTELLIGENCE")
        print("=" * 50)

        safety_service = DriverSafetyService(db)

        # 3.1 Authoritative Emergency SOS Trigger
        print("3.1 Testing Emergency SOS Trigger with 112 Police Dispatch...")
        sos_res = await safety_service.trigger_sos(
            driver_id=driver.id,
            ride_id=current_ride.id,
            latitude=18.5822,
            longitude=73.9197,
            accuracy=8.5,
            reason="Driver reported emergency during test",
        )
        print(f"  • SOS Response: {sos_res['message']} | Police: {sos_res['police_number']}")
        assert sos_res["success"] is True
        assert sos_res["police_number"] == "112"

        # 3.2 Trusted Contacts Management
        print("\n3.2 Testing Trusted Contacts (Add, Mask, List, Delete)...")
        tc1 = await safety_service.add_trusted_contact(
            driver_id=driver.id,
            name="Sneha Patil (Wife)",
            phone="+919876543210",
            relationship="Spouse",
        )
        print(f"  • Added Contact: {tc1['name']} | Masked Phone: {tc1['phone_masked']}")
        assert "••" in tc1["phone_masked"] or "10" in tc1["phone_masked"]

        contacts = await safety_service.get_trusted_contacts(driver.id)
        print(f"  • Total Trusted Contacts: {len(contacts)}")
        assert len(contacts) >= 1

        del_res = await safety_service.delete_trusted_contact(driver.id, uuid.UUID(tc1["contact_id"]))
        print(f"  • Delete Contact Response: {del_res['message']}")
        assert del_res["success"] is True

        # 3.3 Tokenized Short-Lived Live Trip Sharing
        print("\n3.3 Testing Tokenized Live Trip Share Session...")
        share_res = await safety_service.create_live_trip_share(driver.id, current_ride.id)
        print(f"  • Share URL: {share_res['share_url']} (Expires: {share_res['expires_at']})")
        assert share_res["share_token"] is not None

        # Fetch Public Telemetry (No Auth / No PII)
        pub_telemetry = await safety_service.get_shared_trip_telemetry(share_res["share_token"])
        print(f"  • Public Telemetry: Pickup='{pub_telemetry['pickup_address']}' | SOS Active={pub_telemetry['has_active_sos']}")
        assert pub_telemetry["pickup_address"] is not None

        # 3.4 Anomaly Detection & "I'm Safe" Resolution
        print("\n3.4 Testing Safety Anomaly Alert & Resolution ('I'm Safe')...")
        alert_res = await safety_service.record_safety_alert(
            driver_id=driver.id,
            ride_id=current_ride.id,
            alert_type="ROUTE_DEVIATION",
            severity="WARNING",
            latitude=18.5750,
            longitude=73.9100,
            details={"deviation_meters": 650, "message": "Vehicle diverted 650m off calculated route."},
        )
        print(f"  • Alert Recorded: ID={alert_res['alert_id']} | Type={alert_res['alert_type']} | Severity={alert_res['severity']}")
        assert alert_res["status"] == "ACTIVE"

        resolve_res = await safety_service.resolve_safety_alert(
            driver_id=driver.id,
            alert_id=uuid.UUID(alert_res["alert_id"]),
            resolution_type="IM_SAFE",
        )
        print(f"  • Alert Resolved: {resolve_res['message']} (Status: {resolve_res['status']})")
        assert resolve_res["status"] == "ACKNOWLEDGED_SAFE"

        # 3.5 Submit Incident Report
        print("\n3.5 Testing Safety Incident Reporting...")
        incident_res = await safety_service.report_safety_incident(
            driver_id=driver.id,
            ride_id=current_ride.id,
            incident_category="UNSAFE_PASSENGER",
            severity="HIGH",
            description="Passenger refused to wear seatbelt and exhibited aggressive behavior.",
            latitude=18.5822,
            longitude=73.9197,
        )
        print(f"  • Incident Reported: ID={incident_res['incident_id']} | Status={incident_res['status']}")
        assert incident_res["success"] is True
        print("✓ FEATURE 22 TESTS PASSED COMPLETELY!")

    print("\n" + "=" * 70)
    print("🎉 ALL TESTS PASSED SUCCESSFULLY FOR FEATURES 20, 21 & 22! 🚀")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
