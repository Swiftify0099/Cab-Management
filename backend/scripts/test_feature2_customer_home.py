"""
Feature 2 Customer Home / Service Discovery — Smoke Test Suite
Validates:
1. Dynamic Service Catalog API (/api/v1/services/catalog)
2. Unified Customer Home Summary API (/api/v1/customer/home/summary)
3. Active Ride in Progress Aggregation
4. Promotions & Offers payload
"""
import asyncio
import uuid
import sys
import os
from decimal import Decimal

_ROOT = r"d:\cub\Cab-Management\backend"
sys.path.insert(0, os.path.join(_ROOT, "auth-service"))
sys.path.insert(0, os.path.join(_ROOT, "common"))
sys.path.insert(0, _ROOT)

from common.database import AsyncSessionLocal
from common.models.all_models import (
    User,
    UserRole,
    RideRequest,
    RideRequestStatus,
    CustomerProfile,
)
from app.services.customer_home_service import (
    get_service_catalog,
    get_customer_home_summary,
)
from sqlalchemy import select, delete


async def run_feature2_home_tests():
    print("=== STARTING FEATURE 2 CUSTOMER HOME / SERVICE DISCOVERY TEST SUITE ===")
    test_phone = "+919999911111"

    async with AsyncSessionLocal() as db:
        # 1. Setup Test User
        res = await db.execute(select(User).where(User.phone == test_phone))
        user = res.scalar_one_or_none()
        if not user:
            user = User(
                id=uuid.uuid4(),
                phone=test_phone,
                email="test_customer_f2_home@example.com",
                role=UserRole.CUSTOMER,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        # Profile check
        prof_res = await db.execute(select(CustomerProfile).where(CustomerProfile.user_id == user.id))
        prof = prof_res.scalar_one_or_none()
        if not prof:
            prof = CustomerProfile(
                user_id=user.id,
                full_name="Pankaj Patil",
                emergency_contact="+919888877771",
            )
            db.add(prof)
            await db.commit()
        else:
            prof.full_name = "Pankaj Patil"
            await db.commit()

        print(f"[OK] Customer Context Ready: {user.id} ({prof.full_name})")

        # 2. Test Service Catalog
        print("\n--- Testing Service Catalog ---")
        catalog = await get_service_catalog()
        assert len(catalog) >= 6
        codes = [s.code for s in catalog]
        assert "ride" in codes
        assert "parcel" in codes
        assert "hotel" in codes
        assert "transport" in codes
        assert "rental" in codes

        # Verify Coming Soon vs Available status
        ride_item = next(s for s in catalog if s.code == "ride")
        rental_item = next(s for s in catalog if s.code == "rental")
        assert ride_item.status == "AVAILABLE"
        assert rental_item.status == "COMING_SOON"
        print(f"[OK] Service Catalog verified ({len(catalog)} services with active/coming_soon statuses)")

        # 3. Test Customer Home Summary (Idle State)
        print("\n--- Testing Home Summary (Idle State) ---")
        summary = await get_customer_home_summary(db, user)
        assert summary.customer_name == "Pankaj Patil"
        assert len(summary.promotions) >= 1
        assert len(summary.services) >= 6
        print(f"[OK] Idle Home Summary verified for {summary.customer_name}")

        # 4. Test Customer Home Summary with Active Ride in Progress
        print("\n--- Testing Home Summary with Live Active Ride ---")
        active_ride_req = RideRequest(
            customer_id=user.id,
            booking_owner_id=user.id,
            rider_type="SELF",
            rider_name="Pankaj Patil",
            rider_phone=test_phone,
            is_booked_for_other=False,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="Shivajinagar Station, Pune",
            destination_location="SRID=4326;POINT(72.8777 19.0760)",
            destination_lat=19.0760,
            destination_lng=72.8777,
            destination_address="Dadar TT Circle, Mumbai",
            estimated_distance_km=148.0,
            estimated_duration_min=180,
            estimated_fare=Decimal("1850.00"),
            start_pin_plain="4921",
            status=RideRequestStatus.ASSIGNED,
        )
        db.add(active_ride_req)
        await db.commit()
        await db.refresh(active_ride_req)

        summary_with_ride = await get_customer_home_summary(db, user)
        assert summary_with_ride.active_ride is not None
        assert summary_with_ride.active_ride.ride_id == str(active_ride_req.id)
        assert summary_with_ride.active_ride.pickup_otp == "4921"
        assert summary_with_ride.active_ride.pickup_address == "Shivajinagar Station, Pune"
        print(f"[OK] Live Active Ride correctly aggregated: Ride #{summary_with_ride.active_ride.ride_id[:8]} (OTP: {summary_with_ride.active_ride.pickup_otp})")

        # Clean up active ride
        await db.delete(active_ride_req)
        await db.commit()
        print("[OK] Test data cleanup complete")

        print("\n=== ALL FEATURE 2 CUSTOMER HOME / SERVICE DISCOVERY TESTS PASSED! ===")

asyncio.run(run_feature2_home_tests())
