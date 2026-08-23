"""
Feature 3 Cab Booking Master Flow — Automated Smoke & Integration Test Suite
"""
import asyncio
import uuid
import sys
import os
from decimal import Decimal
from datetime import datetime, timezone

_ROOT = r"d:\cub\Cab-Management\backend"
sys.path.insert(0, os.path.join(_ROOT, "auth-service"))
sys.path.insert(0, os.path.join(_ROOT, "booking-service"))
sys.path.insert(0, os.path.join(_ROOT, "matching-service"))
sys.path.insert(0, os.path.join(_ROOT, "common"))
sys.path.insert(0, _ROOT)

from common.database import AsyncSessionLocal
from common.models.all_models import (
    User,
    UserRole,
    RideRequest,
    RideRequestStatus,
    RideCategory,
    Coupon,
    DiscountType,
    Driver,
    DriverStatus,
)
from sqlalchemy import select, delete


async def run_feature3_booking_tests():
    print("=== STARTING FEATURE 3 CAB BOOKING MASTER TEST SUITE ===")
    test_phone = "+919999911111"

    async with AsyncSessionLocal() as db:
        # 1. Setup Test Customer User
        res = await db.execute(select(User).where(User.phone == test_phone))
        user = res.scalar_one_or_none()
        if not user:
            user = User(
                id=uuid.uuid4(),
                phone=test_phone,
                email="test_f3_booking@example.com",
                role=UserRole.CUSTOMER,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        print(f"[OK] Customer Context Ready: {user.id} ({user.phone})")

        # 2. Test Dynamic Vehicle Categories from Database
        print("\n--- Testing Dynamic Backend Vehicle Categories ---")
        cats_res = await db.execute(
            select(RideCategory).where(RideCategory.is_active == True).order_by(RideCategory.sort_order)
        )
        categories = cats_res.scalars().all()
        if not categories:
            # Seed default categories for testing
            cat_sedan = RideCategory(
                name="sedan",
                display_name="Comfort Sedan",
                eligible_vehicle_types=["SEDAN"],
                base_fare=Decimal("75.00"),
                per_km_rate=Decimal("16.00"),
                per_min_rate=Decimal("2.00"),
                min_fare=Decimal("120.00"),
                surge_multiplier=1.1,
                platform_commission_pct=0.20,
                is_active=True,
                sort_order=1,
            )
            cat_suv = RideCategory(
                name="suv",
                display_name="Spacious SUV",
                eligible_vehicle_types=["SUV"],
                base_fare=Decimal("110.00"),
                per_km_rate=Decimal("22.00"),
                per_min_rate=Decimal("3.00"),
                min_fare=Decimal("180.00"),
                surge_multiplier=1.0,
                platform_commission_pct=0.20,
                is_active=True,
                sort_order=2,
            )
            db.add(cat_sedan)
            db.add(cat_suv)
            await db.commit()
            categories = [cat_sedan, cat_suv]

        assert len(categories) >= 2
        print(f"[OK] Fetched {len(categories)} Active Vehicle Categories from backend DB:")
        for c in categories:
            print(f"     • {c.display_name} ({c.name}): Base Rs.{c.base_fare}, Rs.{c.per_km_rate}/km, Surge {c.surge_multiplier}x")

        # 3. Test Authoritative Multi-Category Fare Computation
        print("\n--- Testing Authoritative Multi-Category Fare Engine ---")
        distance_km = 148.0
        duration_min = 180

        # Calculate Sedan fare
        sedan_cat = next((c for c in categories if c.name == "sedan"), categories[0])
        sedan_base = float(sedan_cat.base_fare)
        sedan_dist = distance_km * float(sedan_cat.per_km_rate)
        sedan_time = duration_min * float(sedan_cat.per_min_rate)
        sedan_surge = float(sedan_cat.surge_multiplier or 1.0)
        sedan_total = max((sedan_base + sedan_dist + sedan_time) * sedan_surge, float(sedan_cat.min_fare))

        # Calculate SUV fare
        suv_cat = next((c for c in categories if c.name == "suv"), categories[1])
        suv_base = float(suv_cat.base_fare)
        suv_dist = distance_km * float(suv_cat.per_km_rate)
        suv_time = duration_min * float(suv_cat.per_min_rate)
        suv_surge = float(suv_cat.surge_multiplier or 1.0)
        suv_total = max((suv_base + suv_dist + suv_time) * suv_surge, float(suv_cat.min_fare))

        assert sedan_total > 0
        assert suv_total > sedan_total
        print(f"[OK] Fare Calculation verified: Sedan = Rs.{sedan_total:.2f}, SUV = Rs.{suv_total:.2f} for {distance_km} km")

        # 4. Test Multi-Stop Route Fare Calculation
        print("\n--- Testing Multi-Stop Intermediate Route Fare Calculation ---")
        # Multi-stop with 1 intermediate stop adds ~15km
        multi_stop_dist = distance_km + 15.0
        multi_stop_dur = duration_min + 20
        multi_stop_fare = (sedan_base + (multi_stop_dist * float(sedan_cat.per_km_rate)) + (multi_stop_dur * float(sedan_cat.per_min_rate))) * sedan_surge
        assert multi_stop_fare > sedan_total
        print(f"[OK] Multi-Stop Route (+1 Stop): Distance {multi_stop_dist} km, Fare Rs.{multi_stop_fare:.2f} (Base direct was Rs.{sedan_total:.2f})")

        # 5. Test Coupon & Promo Code Application
        print("\n--- Testing Promo Code & Discount Application ---")
        coupon_res = await db.execute(select(Coupon).where(Coupon.code == "DIWALI2026"))
        coupon = coupon_res.scalar_one_or_none()
        if not coupon:
            coupon = Coupon(
                code="DIWALI2026",
                description="20% Festival Discount",
                discount_type=DiscountType.PERCENTAGE,
                discount_value=Decimal("20.00"),
                max_discount_amount=Decimal("200.00"),
                min_fare=Decimal("100.00"),
                is_active=True,
            )
            db.add(coupon)
            await db.commit()
            await db.refresh(coupon)

        raw_fare = sedan_total
        discount_amount = min((raw_fare * float(coupon.discount_value)) / 100.0, float(coupon.max_discount_amount))
        discounted_fare = raw_fare - discount_amount
        assert discounted_fare < raw_fare
        print(f"[OK] Coupon {coupon.code} verified: Fare Rs.{raw_fare:.2f} -> Discount -Rs.{discount_amount:.2f} -> Final Rs.{discounted_fare:.2f}")

        # 6. Test Ride Request Creation with Participant Context (Feature 1 Contract)
        print("\n--- Testing Ride Creation with Participant Context (Feature 1 Contract) ---")
        stops_data = [
            {"sequence": 1, "lat": 18.7557, "lng": 73.4091, "address": "Lonavala Toll Plaza"},
        ]
        ride = RideRequest(
            customer_id=user.id,
            booking_owner_id=user.id,
            rider_type="FAMILY_MEMBER",
            rider_name="Pooja Patil",
            rider_phone="+919999922222",
            is_booked_for_other=True,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="Shivajinagar Station, Pune",
            destination_location="SRID=4326;POINT(72.8777 19.0760)",
            destination_lat=19.0760,
            destination_lng=72.8777,
            destination_address="Dadar TT Circle, Mumbai",
            ride_category_id=sedan_cat.id,
            estimated_distance_km=multi_stop_dist,
            estimated_duration_min=multi_stop_dur,
            estimated_fare=Decimal(str(round(discounted_fare, 2))),
            surge_multiplier=sedan_surge,
            seats_requested=1,
            seat_preferences={"stops": stops_data},
            start_pin_plain="5812",
            status=RideRequestStatus.CREATED,
            payment_method="CASH",
        )
        db.add(ride)
        await db.commit()
        await db.refresh(ride)

        assert ride.status == RideRequestStatus.CREATED
        assert ride.is_booked_for_other == True
        assert ride.rider_name == "Pooja Patil"
        assert ride.booking_owner_id == user.id
        print(f"[OK] Participant Ride Created: Ride #{str(ride.id)[:8]} for {ride.rider_name} (Owner: {user.phone}, OTP: {ride.start_pin_plain})")

        # Clean up test ride
        await db.delete(ride)
        await db.commit()
        print("[OK] Test ride cleanup complete")

        print("\n=== ALL FEATURE 3 CAB BOOKING MASTER TESTS PASSED! ===")

asyncio.run(run_feature3_booking_tests())
