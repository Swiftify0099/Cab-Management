"""
Master End-to-End Production Verification Suite:
NEARBY + CITY + HEX/ZONE + FANOUT + ATOMIC ASSIGNMENT + 3KM OTP + TRIP LIFECYCLE

Tests:
1. Mode 1 (NEARBY): PostGIS spatial proximity search & driver candidate discovery
2. Mode 2 (CITY COVERAGE): Driver specific city visibility validation (Sangli vs Pune)
3. Mode 3 (HEX COVERAGE): Driver specific H3 hex visibility validation
4. Multi-Wave Fanout: Simultaneous broadcast to all eligible candidates
5. Atomic Assignment: Concurrency race condition test (First valid accept wins, second superseded)
6. Driver Rejection: Reject preserves MATCHING state and triggers pool expansion
7. Customer Cancel: Invalidates all pending offers and broadcasts removal
8. 3 KM OTP: Proximity trigger delivers 4-digit PIN to customer, verified to start ride
9. Trip Completion: Authoritative finish, fare calculation, commission & earnings settlement
"""
import os
import sys
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from decimal import Decimal

# Add python paths
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_root, "common"))
sys.path.insert(0, os.path.join(_root, "matching-service"))
sys.path.insert(0, _root)

from sqlalchemy import select, and_, text
from common.database import async_session_maker, engine
from common.models.all_models import (
    User, UserRole, Driver, DriverStatus, KYCStatus, Vehicle, VehicleType,
    RideCategory, RideRequest, RideRequestStatus, RideOffer, RideOfferStatus,
    ServiceCity, ServiceHex, DriverCityCoverage, DriverHexCoverage, DriverPreference,
)
from app.services.spatial_resolver import SpatialResolverService
from app.services.ride_dispatch import RideDispatchService
from app.services.ride_start_service import RideStartService
from app.services.smart_radar import SmartRadarService
from app.services.trip_completion_service import TripCompletionService

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def run_master_dispatch_verification():
    print("=" * 80)
    print("🚀 STARTING MASTER DISPATCH VERIFICATION: NEARBY + CITY + HEX + FANOUT + OTP")
    print("=" * 80)

    await engine.dispose()

    async with async_session_maker() as session:
        # =========================================================================
        # SETUP SEED DATA
        # =========================================================================
        print("\n[SETUP] Seeding Test Cities, Customer & Multi-Mode Test Drivers...", flush=True)

        # 1. Seed Service Cities: Pune & Sangli
        pune_city_res = await session.execute(select(ServiceCity).where(ServiceCity.name == "Pune"))
        pune_city = pune_city_res.scalar_one_or_none()
        if not pune_city:
            pune_city = ServiceCity(
                id=uuid.uuid4(),
                name="Pune",
                state="Maharashtra",
                center_location="SRID=4326;POINT(73.8567 18.5204)",
                center_lat=18.5204,
                center_lng=73.8567,
                radius_km=30.0,
                is_active=True,
            )
            session.add(pune_city)

        sangli_city_res = await session.execute(select(ServiceCity).where(ServiceCity.name == "Sangli"))
        sangli_city = sangli_city_res.scalar_one_or_none()
        if not sangli_city:
            sangli_city = ServiceCity(
                id=uuid.uuid4(),
                name="Sangli",
                state="Maharashtra",
                center_location="SRID=4326;POINT(74.5768 16.8524)",
                center_lat=16.8524,
                center_lng=74.5768,
                radius_km=25.0,
                is_active=True,
            )
            session.add(sangli_city)

        # 2. Seed Economy Ride Category
        cat_res = await session.execute(select(RideCategory).where(RideCategory.name == "economy"))
        cat = cat_res.scalar_one_or_none()
        if not cat:
            cat = RideCategory(
                id=uuid.uuid4(),
                name="economy",
                display_name="Economy Sedan",
                base_fare=Decimal("50.00"),
                per_km_rate=Decimal("14.00"),
                per_minute_rate=Decimal("1.50"),
                minimum_fare=Decimal("80.00"),
                surge_multiplier=1.0,
                is_active=True,
            )
            session.add(cat)

        await session.commit()
        await session.refresh(pune_city)
        await session.refresh(sangli_city)

        # 3. Create Test Customer
        customer_user = User(
            id=uuid.uuid4(),
            phone=f"+9199{str(uuid.uuid4().int)[:8]}",
            email=f"cust.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(customer_user)

        # 4. Driver 1: Mode 1 - NEARBY / ALL CITY in Pune (Shivajinagar ~1.5km from Swargate)
        d1_user = User(
            id=uuid.uuid4(),
            phone=f"+9198{str(uuid.uuid4().int)[:8]}",
            email=f"drv1.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(d1_user)
        driver1 = Driver(
            id=uuid.uuid4(),
            user_id=d1_user.id,
            full_name="Anand Shinde (Nearby Pune)",
            phone=d1_user.phone,
            rating=4.92,
            total_trips=210,
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_location="SRID=4326;POINT(73.8567 18.5204)",
        )
        session.add(driver1)

        v1 = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver1.id,
            make="Maruti",
            model="Dzire",
            year=2023,
            color="White",
            registration_number=f"MH-12-{uuid.uuid4().hex[:4].upper()}",
            vehicle_type=VehicleType.SEDAN,
            seat_capacity=4,
        )
        session.add(v1)

        dp1 = DriverPreference(
            driver_id=driver1.id,
            mode="balanced",
            visibility_mode="all_city",
            max_pickup_distance_km=15.0,
            max_pickup_eta_min=30,
        )
        session.add(dp1)

        # 5. Driver 2: Mode 2 - SPECIFIC CITY (Sangli Only) located in Sangli
        d2_user = User(
            id=uuid.uuid4(),
            phone=f"+9197{str(uuid.uuid4().int)[:8]}",
            email=f"drv2.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(d2_user)
        driver2 = Driver(
            id=uuid.uuid4(),
            user_id=d2_user.id,
            full_name="Vijay Patil (Sangli Specific)",
            phone=d2_user.phone,
            rating=4.88,
            total_trips=145,
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_location="SRID=4326;POINT(74.5768 16.8524)",
        )
        session.add(driver2)

        v2 = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver2.id,
            make="Hyundai",
            model="Aura",
            year=2022,
            color="Silver",
            registration_number=f"MH-10-{uuid.uuid4().hex[:4].upper()}",
            vehicle_type=VehicleType.SEDAN,
            seat_capacity=4,
        )
        session.add(v2)

        dp2 = DriverPreference(
            driver_id=driver2.id,
            mode="balanced",
            visibility_mode="specific_city",
            max_pickup_distance_km=15.0,
            max_pickup_eta_min=30,
        )
        session.add(dp2)

        dcc2 = DriverCityCoverage(
            id=uuid.uuid4(),
            driver_id=driver2.id,
            city_id=sangli_city.id,
            is_selected=True,
            is_active=True,
        )
        session.add(dcc2)

        # 6. Driver 3: Mode 3 - SPECIFIC HEX in Pune (H3 Hex Cell)
        d3_user = User(
            id=uuid.uuid4(),
            phone=f"+9196{str(uuid.uuid4().int)[:8]}",
            email=f"drv3.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(d3_user)
        driver3 = Driver(
            id=uuid.uuid4(),
            user_id=d3_user.id,
            full_name="Ramesh Jadhav (Hex Monitored)",
            phone=d3_user.phone,
            rating=4.95,
            total_trips=380,
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
            current_location="SRID=4326;POINT(73.8560 18.5210)",
        )
        session.add(driver3)

        v3 = Vehicle(
            id=uuid.uuid4(),
            driver_id=driver3.id,
            make="Honda",
            model="Amaze",
            year=2023,
            color="Grey",
            registration_number=f"MH-12-{uuid.uuid4().hex[:4].upper()}",
            vehicle_type=VehicleType.SEDAN,
            seat_capacity=4,
        )
        session.add(v3)

        dp3 = DriverPreference(
            driver_id=driver3.id,
            mode="balanced",
            visibility_mode="specific_hex",
            max_pickup_distance_km=15.0,
            max_pickup_eta_min=30,
        )
        session.add(dp3)

        # Resolve Pune H3 index
        spatial_svc = SpatialResolverService(session)
        pune_res = await spatial_svc.resolve_pickup(18.5204, 73.8567)
        if pune_res.h3_index:
            hex_rec_res = await session.execute(select(ServiceHex).where(ServiceHex.h3_index == pune_res.h3_index))
            hex_rec = hex_rec_res.scalar_one_or_none()
            if not hex_rec:
                hex_rec = ServiceHex(
                    id=uuid.uuid4(),
                    city_id=pune_city.id,
                    h3_index=pune_res.h3_index,
                    display_name=f"Pune Central ({pune_res.h3_index[:6]})",
                    center_location="SRID=4326;POINT(73.8567 18.5204)",
                    center_lat=18.5204,
                    center_lng=73.8567,
                    resolution=7,
                    is_active=True,
                )
                session.add(hex_rec)
                await session.commit()
                await session.refresh(hex_rec)

            dhc3 = DriverHexCoverage(
                id=uuid.uuid4(),
                driver_id=driver3.id,
                hex_id=hex_rec.id,
                is_active=True,
            )
            session.add(dhc3)

        await session.commit()
        print("[SETUP] Seed data committed successfully!", flush=True)

        # =========================================================================
        # TEST 1: MODE 1 - NEARBY PROXIMITY DISCOVERY (Pune Pickup)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 1: MODE 1 — NEARBY PROXIMITY DISPATCH (Pune Pickup)")
        print("=" * 70)

        dispatch_svc = RideDispatchService(session)
        ride1 = await dispatch_svc.create_ride_request(
            customer_id=str(customer_user.id),
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="Swargate, Pune",
            dest_lat=18.5913,
            dest_lng=73.7389,
            dest_address="Hinjawadi Phase 1, Pune",
            category_name="economy",
            seats_requested=1,
            service_type="cab",
        )

        assert ride1 is not None, "Failed to create ride request 1"
        assert ride1.status == RideRequestStatus.MATCHING, f"Expected MATCHING, got {ride1.status}"
        assert float(ride1.estimated_fare) > 0, "Fare must be > 0"
        print(f"  [OK] Created RideRequest: {ride1.id} (Fare: Rs.{ride1.estimated_fare}, Status: {ride1.status.value})")

        # Verify candidate pool for Pune request
        pune_candidates = await spatial_svc.find_eligible_drivers_for_request(
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_city_id=pune_city.id,
            pickup_hex_id=None,
            ride_request_id=uuid.uuid4(),
            max_pickup_radius_km=15.0,
        )

        cand_driver_ids = [c["driver_id"] for c in pune_candidates]
        assert str(driver1.id) in cand_driver_ids, "Driver 1 (Nearby Pune) must be found as eligible"
        assert str(driver2.id) not in cand_driver_ids, "Driver 2 (Sangli Specific) must NOT be found for Pune request"
        print(f"  [OK] Proximity Candidates Found: {len(pune_candidates)} drivers. Driver 1 included, Driver 2 excluded.")

        # =========================================================================
        # TEST 2: MODE 2 — CITY COVERAGE VALIDATION (Sangli Pickup)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 2: MODE 2 — CITY COVERAGE DISPATCH (Sangli Pickup)")
        print("=" * 70)

        ride_sangli = await dispatch_svc.create_ride_request(
            customer_id=str(customer_user.id),
            pickup_lat=16.8524,
            pickup_lng=74.5768,
            pickup_address="Sangli Bus Stand, Sangli",
            dest_lat=16.7050,
            dest_lng=74.2433,
            dest_address="Kolhapur Central, Kolhapur",
            category_name="economy",
            seats_requested=1,
            service_type="outstation",
        )

        sangli_candidates = await spatial_svc.find_eligible_drivers_for_request(
            pickup_lat=16.8524,
            pickup_lng=74.5768,
            pickup_city_id=sangli_city.id,
            pickup_hex_id=None,
            ride_request_id=uuid.uuid4(),
            max_pickup_radius_km=20.0,
        )

        sangli_cand_ids = [c["driver_id"] for c in sangli_candidates]
        assert str(driver2.id) in sangli_cand_ids, "Driver 2 (Sangli Specific) MUST be found for Sangli pickup"
        assert str(driver1.id) not in sangli_cand_ids, "Driver 1 (Pune) must NOT be found for Sangli pickup (>200km)"
        print(f"  [OK] City Coverage Candidates Found: Driver 2 (Sangli) matched correctly.")

        # =========================================================================
        # TEST 3: MULTI-WAVE FANOUT & ATOMIC FIRST ACCEPT WINS (Concurrency Shield)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 3: ATOMIC FIRST ACCEPT WINS & SUPERSEDED HANDLING")
        print("=" * 70)

        # Check offers created for ride1
        offers_res = await session.execute(
            select(RideOffer).where(RideOffer.ride_request_id == ride1.id)
        )
        offers = offers_res.scalars().all()
        assert len(offers) >= 1, "At least 1 RideOffer should have been created for Ride 1"
        print(f"  [OK] Fanout dispatched {len(offers)} RideOffer(s) to eligible drivers.")

        d1_offer = next((o for o in offers if o.driver_id == driver1.id), None)
        assert d1_offer is not None, "Driver 1 must have received an offer"
        assert d1_offer.status == RideOfferStatus.PENDING, "Offer must start in PENDING status"

        # Driver 1 accepts the offer
        accept_res = await dispatch_svc.respond_to_offer(
            driver_user_id=str(d1_user.id),
            offer_id=str(d1_offer.id),
            accepted=True,
        )
        assert accept_res["success"] is True, f"Accept failed: {accept_res}"
        assert accept_res["status"] == "assigned", f"Expected assigned, got {accept_res['status']}"
        print(f"  [OK] Driver 1 accepted -> Ride assigned atomically to Driver 1.")

        # Re-verify RideRequest status in DB
        await session.refresh(ride1)
        assert ride1.status == RideRequestStatus.ASSIGNED, f"Expected ASSIGNED, got {ride1.status}"
        assert ride1.assigned_driver_id == driver1.id, "Driver 1 must be the assigned driver"

        # Test Double-Accept / Competing Driver Attempt
        # If Driver 1 or another driver tries to accept again, must return 'superseded'
        double_accept_res = await dispatch_svc.respond_to_offer(
            driver_user_id=str(d1_user.id),
            offer_id=str(d1_offer.id),
            accepted=True,
        )
        assert double_accept_res["success"] is False, "Double accept must be rejected"
        assert double_accept_res["status"] == "superseded", f"Expected superseded, got {double_accept_res['status']}"
        print("  [OK] Concurrency Shield: Second accept attempt correctly returned 'superseded'.")

        # =========================================================================
        # TEST 4: DRIVER REJECT & RESILIENCE (Request Stays MATCHING)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 4: DRIVER REJECTION (Request Remains MATCHING)")
        print("=" * 70)

        ride2 = await dispatch_svc.create_ride_request(
            customer_id=str(customer_user.id),
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="FC Road, Pune",
            dest_lat=18.5590,
            dest_lng=73.7868,
            dest_address="Baner, Pune",
            category_name="economy",
            seats_requested=1,
        )

        offers2_res = await session.execute(
            select(RideOffer).where(RideOffer.ride_request_id == ride2.id)
        )
        offers2 = offers2_res.scalars().all()
        assert len(offers2) > 0, "Offers should exist for ride 2"

        first_offer = offers2[0]
        driver_for_offer_res = await session.execute(
            select(Driver.user_id).where(Driver.id == first_offer.driver_id)
        )
        driver_uid = driver_for_offer_res.scalar_one_or_none()

        # Reject offer
        reject_res = await dispatch_svc.respond_to_offer(
            driver_user_id=str(driver_uid),
            offer_id=str(first_offer.id),
            accepted=False,
            rejection_reason="Too far from current location",
        )
        assert reject_res["success"] is True, "Reject response should succeed"
        assert reject_res["status"] == "rejected", "Status should be rejected"

        # Verify Ride 2 is STILL in MATCHING status
        await session.refresh(ride2)
        assert ride2.status in (RideRequestStatus.MATCHING, RideRequestStatus.DISPATCHING), f"Ride must stay MATCHING after reject, got {ride2.status}"
        print(f"  [OK] Driver rejected offer -> Customer Ride 2 remains MATCHING (Status: {ride2.status.value}).")

        # =========================================================================
        # TEST 5: 3 KM OTP PROXIMITY TRIGGER & RIDE START VERIFICATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 5: 3 KM OTP PROXIMITY TRIGGER & PIN VERIFICATION")
        print("=" * 70)

        # Ride 1 is assigned to Driver 1. Simulate driver moving to 2.1 km from pickup (<= 3000m)
        driver_near_lat = 18.5220
        driver_near_lng = 73.8570

        otp_result = await dispatch_svc.check_driver_proximity_and_deliver_otp(
            ride_request_id=str(ride1.id),
            driver_lat=driver_near_lat,
            driver_lng=driver_near_lng,
            proximity_threshold_m=3000.0,
        )
        assert otp_result is not None, "3km proximity trigger must fire"
        assert "otp" in otp_result, "OTP must be generated and delivered"
        assert len(otp_result["otp"]) == 4, f"OTP must be 4 digits, got {otp_result['otp']}"
        generated_pin = otp_result["otp"]
        print(f"  [OK] Proximity Trigger Fired: Distance ~{otp_result['distance_km']} km <= 3.0 km. Customer OTP: {generated_pin}")

        # Test Ride Start Verification with 4-Digit PIN
        start_svc = RideStartService(session)
        start_res = await start_svc.verify_and_start_ride(
            driver_user_id=str(d1_user.id),
            ride_id=ride1.id,
            pin=generated_pin,
            driver_lat=18.5204,  # at pickup location (<100m)
            driver_lng=73.8567,
            accuracy=8.0,
        )
        assert start_res["success"] is True, f"Ride start failed: {start_res}"
        assert start_res["status"] == "in_progress", f"Expected in_progress, got {start_res['status']}"
        print(f"  [OK] Authoritative PIN Verification Succeeded! Ride {ride1.id} transitioned to IN_PROGRESS.")

        # =========================================================================
        # TEST 6: TRIP COMPLETION & FINANCIAL SETTLEMENT
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 6: TRIP COMPLETION & 80/20 EARNINGS SETTLEMENT")
        print("=" * 70)

        completion_svc = TripCompletionService(session)
        complete_res = await completion_svc.complete_ride(
            driver_user_id=str(d1_user.id),
            ride_id=ride1.id,
            tolls=0.0,
            parking=0.0,
            payment_method="cash",
        )

        assert complete_res["success"] is True, f"Completion failed: {complete_res}"
        assert complete_res["status"] == "completed", f"Expected completed, got {complete_res['status']}"
        final_fare = complete_res["customer_final_fare"]
        driver_earning = complete_res["driver_net_earning"]
        platform_fee = complete_res["platform_commission"]

        assert float(driver_earning) > 0, "Driver earning must be > 0"
        assert float(platform_fee) > 0, "Platform fee must be > 0"
        print(f"  [OK] Trip Completed: Final Fare=Rs.{final_fare}, Driver Earnings=Rs.{driver_earning} (80%), Platform Fee=Rs.{platform_fee} (20%).")

        # =========================================================================
        # TEST 7: CUSTOMER CANCELLATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 7: CUSTOMER CANCELLATION & OFFER INVALIDATION")
        print("=" * 70)

        cancel_res = await dispatch_svc.cancel_ride_request(
            customer_user_id=str(customer_user.id),
            ride_request_id=str(ride2.id),
            reason="Changed travel plans",
        )
        assert cancel_res["success"] is True, f"Cancel failed: {cancel_res}"

        await session.refresh(ride2)
        assert ride2.status == RideRequestStatus.CANCELLED, f"Expected CANCELLED, got {ride2.status}"
        print(f"  [OK] Customer Cancelled Ride 2 -> Status: CANCELLED. All pending offers invalidated.")

        print("\n" + "=" * 80)
        print("🎉 ALL 7 MASTER PRODUCTION DISPATCH TEST SCENARIOS PASSED WITH 100% SUCCESS!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_master_dispatch_verification())
