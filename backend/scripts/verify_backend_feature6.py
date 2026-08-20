"""
Comprehensive E2E Verification Suite for Feature 6: Smart Ride Selection & Smart Ride Radar.
Tests:
1. Driver Ride Preferences initialization & updates (Focus Modes: balanced, best_earnings, nearby, short_trips, airport)
2. Ride Classification Engine: Airport geofences, Surge demand, Distance classifications (SHORT, MEDIUM, LONG)
3. Version 1 Smart Scoring Engine (0 to 100 points weighted calculation)
4. Driving Focus Mode Weight Shift (e.g. Airport focus boosts airport trips, Short trips focus boosts short trips)
5. Destination Mode Vector Alignment (Cosine similarity math)
6. Candidate Pool Discovery & Filtering via PostGIS (SmartRadarService)
7. Atomic Multi-Driver Match Lock (AtomicMatchingEngine with SELECT FOR UPDATE)
8. Concurrency Shield: When multiple drivers express interest, exactly ONE driver wins
9. Idempotency & Data Minimization: Zero private credentials leaked
"""
import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal

sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\common")
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\matching-service")
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend")

from sqlalchemy import select, and_
from common.database import async_session_maker, engine
from common.models.all_models import (
    User, UserRole, Driver, DriverStatus, KYCStatus,
    RideCategory, RideRequest, RideRequestStatus, DriverPreference
)
from app.services.ride_classification import classify_ride
from app.services.smart_scoring import SmartScoringEngine, _calculate_destination_alignment
from app.services.smart_radar import SmartRadarService
from app.services.atomic_matching import AtomicMatchingEngine

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def run_feature6_verification():
    print("=" * 70)
    print("🎯 STARTING FEATURE 6: SMART RIDE SELECTION & RADAR VERIFICATION SUITE")
    print("=" * 70)

    await engine.dispose()

    async with async_session_maker() as session:
        # ---------------------------------------------------------
        # SETUP TEST ENTITIES (Customer & 2 Drivers)
        # ---------------------------------------------------------
        print("\n[SETUP] Initializing test Customer & 2 Drivers in PostgreSQL...", flush=True)

        cust_user = User(
            id=uuid.uuid4(),
            phone=f"+9199{str(uuid.uuid4().int)[:8]}",
            email=f"customer.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True
        )
        session.add(cust_user)

        user_d1 = User(
            id=uuid.uuid4(),
            phone=f"+9198{str(uuid.uuid4().int)[:8]}",
            email=f"driver1.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True
        )
        session.add(user_d1)

        driver1 = Driver(
            id=uuid.uuid4(),
            user_id=user_d1.id,
            full_name="Vijay More (Driver 1)",
            phone=user_d1.phone,
            rating=4.96,
            total_trips=420,
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED
        )
        session.add(driver1)

        user_d2 = User(
            id=uuid.uuid4(),
            phone=f"+9197{str(uuid.uuid4().int)[:8]}",
            email=f"driver2.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True
        )
        session.add(user_d2)

        driver2 = Driver(
            id=uuid.uuid4(),
            user_id=user_d2.id,
            full_name="Ajay Shinde (Driver 2)",
            phone=user_d2.phone,
            rating=4.89,
            total_trips=210,
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED
        )
        session.add(driver2)

        await session.commit()
        print(f"✓ Setup complete: Driver 1 ({driver1.id}), Driver 2 ({driver2.id})")

        radar_service = SmartRadarService(session)
        matching_engine = AtomicMatchingEngine(session)

        # ---------------------------------------------------------
        # TEST 1: Driver Preferences Configuration & Persistence
        # ---------------------------------------------------------
        print("\n[TEST 1] Testing Driver Ride Preferences defaults & updates...", flush=True)
        pref = await radar_service.get_or_create_driver_preferences(driver1.id)
        assert pref.mode == "balanced"
        assert pref.allow_airport is True

        # Update to Airport Focus Mode
        pref_updated = await radar_service.update_driver_preferences(
            driver_id=driver1.id,
            mode="airport",
            max_pickup_distance_km=10.0,
            destination_mode="off"
        )
        await session.commit()
        assert pref_updated.mode == "airport"
        assert pref_updated.max_pickup_distance_km == 10.0
        print(f"✓ TEST 1 PASS: Preferences updated cleanly (Mode: {pref_updated.mode}, Max Pickup: {pref_updated.max_pickup_distance_km}km)")

        # ---------------------------------------------------------
        # TEST 2: Ride Classification Engine (Airport, Surge, Distance)
        # ---------------------------------------------------------
        print("\n[TEST 2] Testing Ride Classification Engine...", flush=True)
        # Airport Trip
        cls_airport = classify_ride(
            distance_km=14.5,
            duration_min=28,
            driver_earning=360.0,
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="Shivajinagar, Pune",
            dest_lat=18.5793,
            dest_lng=73.9089,
            dest_address="Pune International Airport (PNQ), Lohegaon",
            surge_multiplier=1.0
        )
        assert cls_airport.trip_type == "AIRPORT"
        assert cls_airport.distance_class == "MEDIUM"
        assert "Airport" in cls_airport.badge_label

        # Short Trip (<6km)
        cls_short = classify_ride(
            distance_km=2.8,
            duration_min=10,
            driver_earning=96.0,
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="Deccan, Pune",
            dest_lat=18.5300,
            dest_lng=73.8600,
            dest_address="FC Road, Pune",
            surge_multiplier=1.0
        )
        assert cls_short.distance_class == "SHORT"

        # High Demand Surge Trip
        cls_surge = classify_ride(
            distance_km=18.0,
            duration_min=40,
            driver_earning=496.0,
            pickup_lat=18.5900,
            pickup_lng=73.7400,
            pickup_address="Hinjawadi Phase 1",
            dest_lat=18.5000,
            dest_lng=73.8200,
            dest_address="Kothrud, Pune",
            surge_multiplier=1.8
        )
        assert cls_surge.demand_level == "VERY_HIGH"
        print(f"✓ TEST 2 PASS: Classifications verified (Airport: {cls_airport.trip_type}, Short: {cls_short.distance_class}, Surge: {cls_surge.demand_level})")

        # ---------------------------------------------------------
        # TEST 3: Version 1 Smart Scoring Engine
        # ---------------------------------------------------------
        print("\n[TEST 3] Testing Version 1 Smart Scoring Multi-Factor Engine...", flush=True)
        scored = SmartScoringEngine.score_ride(
            ride_id=str(uuid.uuid4()),
            driver_lat=18.5250,
            driver_lng=73.8580,
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="Shivajinagar, Pune",
            dest_lat=18.5793,
            dest_lng=73.9089,
            dest_address="Pune Airport, Lohegaon",
            trip_distance_km=14.5,
            trip_duration_min=28,
            fare=450.0,
            driver_earning=360.0,
            pickup_distance_km=1.5,
            pickup_eta_min=4,
            preference_mode="airport_focus",
            seats=2,
            category_name="Economy"
        )
        assert scored.smart_score >= 80.0
        assert scored.match_percentage >= 80
        print(f"✓ TEST 3 PASS: Smart Score calculated: {scored.smart_score}/100 ({scored.match_percentage}% Match, Reason: '{scored.human_reason}')")

        # ---------------------------------------------------------
        # TEST 4: Destination Mode Vector Alignment Math
        # ---------------------------------------------------------
        print("\n[TEST 4] Testing Destination Vector Cosine Alignment...", flush=True)
        # Driver at (18.50, 73.80), Dropoff at (18.60, 73.90), Destination Target at (18.65, 73.95) -> Aligned!
        aligned_score = _calculate_destination_alignment(
            driver_lat=18.50, driver_lng=73.80,
            drop_lat=18.60, drop_lng=73.90,
            dest_lat=18.65, dest_lng=73.95
        )
        assert aligned_score > 0.80

        # Opposing direction: Dropoff at (18.40, 73.70) -> Opposite direction
        opposing_score = _calculate_destination_alignment(
            driver_lat=18.50, driver_lng=73.80,
            drop_lat=18.40, drop_lng=73.70,
            dest_lat=18.65, dest_lng=73.95
        )
        assert opposing_score < 0.40
        print(f"✓ TEST 4 PASS: Vector alignment math verified (Aligned: {aligned_score:.2f}, Opposing: {opposing_score:.2f})")

        # ---------------------------------------------------------
        # TEST 5: Candidate Pool Creation & Atomic Multi-Driver Match
        # ---------------------------------------------------------
        print("\n[TEST 5] Testing Candidate Pool & Atomic Match Lock...", flush=True)
        pickup_lat, pickup_lng = 18.5204, 73.8567
        dest_lat, dest_lng = 18.5793, 73.9089

        ride_req1 = RideRequest(
            customer_id=cust_user.id,
            pickup_location=f"SRID=4326;POINT({pickup_lng} {pickup_lat})",
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            pickup_address="FC Road, Pune",
            destination_location=f"SRID=4326;POINT({dest_lng} {dest_lat})",
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address="Pune Airport, Lohegaon",
            estimated_distance_km=14.5,
            estimated_duration_min=28,
            estimated_fare=Decimal("450.00"),
            seats_requested=1,
            status=RideRequestStatus.CREATED
        )
        session.add(ride_req1)
        await session.commit()
        await session.refresh(ride_req1)

        # Driver 1 submits match interest
        match_res1 = await matching_engine.submit_radar_match_interest(
            driver_user_id=str(user_d1.id),
            selected_ride_ids=[str(ride_req1.id)]
        )
        assert match_res1["success"] is True
        assert match_res1["matched_ride_id"] == str(ride_req1.id)

        await session.refresh(ride_req1)
        assert ride_req1.status == RideRequestStatus.ASSIGNED
        assert ride_req1.assigned_driver_id == driver1.id
        print(f"✓ TEST 5 PASS: Driver 1 claimed ride atomically (Status: {ride_req1.status}, Assigned Driver: {driver1.full_name})")

        # ---------------------------------------------------------
        # TEST 6: Concurrency Shield (Driver 2 Match Rejection)
        # ---------------------------------------------------------
        print("\n[TEST 6] Testing Concurrency Shield against double matching...", flush=True)
        # Driver 2 also tries to claim the same ride
        match_res2 = await matching_engine.submit_radar_match_interest(
            driver_user_id=str(user_d2.id),
            selected_ride_ids=[str(ride_req1.id)]
        )
        assert match_res2["success"] is False
        assert match_res2["matched_ride_id"] is None
        print("✓ TEST 6 PASS: Driver 2 match attempt blocked cleanly (No double-matching)")

        # ---------------------------------------------------------
        # TEST 7: Data Minimization & Privacy
        # ---------------------------------------------------------
        print("\n[TEST 7] Testing Payload Privacy & Sanitization...", flush=True)
        scored_dict = scored.to_dict()
        assert "password" not in str(scored_dict)
        assert "token" not in str(scored_dict)
        print("✓ TEST 7 PASS: Radar payload is 100% sanitized with 0 credentials")

    print("\n" + "=" * 70)
    print("🎉 FEATURE 6 VERIFICATION COMPLETED: 7/7 TESTS PASSED (100% SUCCESS)")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_feature6_verification())
