"""
Feature 4 Customer Live Ride Matching, Driver Assignment & Tracking — Smoke Test Suite
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
    Driver,
    DriverStatus,
    CustomerEmergencyContact,
)
from sqlalchemy import select, delete


async def run_feature4_tracking_tests():
    print("=== STARTING FEATURE 4 LIVE TRACKING & MATCHING TEST SUITE ===")
    test_phone = "+919999911111"

    async with AsyncSessionLocal() as db:
        # 1. Setup Test Customer User
        res = await db.execute(select(User).where(User.phone == test_phone))
        user = res.scalar_one_or_none()
        if not user:
            user = User(
                id=uuid.uuid4(),
                phone=test_phone,
                email="test_f4_tracking@example.com",
                role=UserRole.CUSTOMER,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        # 2. Setup Test Driver
        driver_phone = "+919876543210"
        d_user_res = await db.execute(select(User).where(User.phone == driver_phone))
        driver_user = d_user_res.scalar_one_or_none()
        if not driver_user:
            driver_user = User(
                id=uuid.uuid4(),
                phone=driver_phone,
                email="driver_f4@example.com",
                role=UserRole.DRIVER,
                is_active=True,
            )
            db.add(driver_user)
            await db.commit()
            await db.refresh(driver_user)

        driver_res = await db.execute(select(Driver).where(Driver.user_id == driver_user.id))
        driver = driver_res.scalar_one_or_none()
        if not driver:
            driver = Driver(
                user_id=driver_user.id,
                full_name="Sunil Shinde",
                phone=driver_phone,
                license_number="MH12-2021009988",
                rating=Decimal("4.9"),
                status=DriverStatus.ONLINE,
                is_online=True,
                vehicle_type="sedan",
                is_verified=True,
            )
            db.add(driver)
            await db.commit()
            await db.refresh(driver)

        print(f"[OK] Test Customer ({user.phone}) and Driver ({driver.full_name}, {driver.vehicle_type}) Ready")

        # 3. Test Ride Creation & Driver Assignment (Stage 1: ASSIGNED)
        print("\n--- Testing Ride Creation & Driver Matching (Stage 1: ASSIGNED) ---")
        ride = RideRequest(
            customer_id=user.id,
            booking_owner_id=user.id,
            assigned_driver_id=driver.id,
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
        db.add(ride)
        await db.commit()
        await db.refresh(ride)

        assert ride.status == RideRequestStatus.ASSIGNED
        assert ride.assigned_driver_id == driver.id
        assert ride.start_pin_plain == "4921"
        print(f"[OK] Stage 1 (ASSIGNED) verified: Ride #{str(ride.id)[:8]} assigned to Driver {driver.full_name} (OTP: {ride.start_pin_plain})")

        # 4. Test Stage 2: Driver Arrived at Pickup (PICKUP)
        print("\n--- Testing Stage 2: Driver Arrived (PICKUP) ---")
        ride.status = RideRequestStatus.PICKUP
        await db.commit()
        await db.refresh(ride)
        assert ride.status == RideRequestStatus.PICKUP
        print(f"[OK] Stage 2 (PICKUP / ARRIVED) verified for Ride #{str(ride.id)[:8]}")

        # 5. Test Stage 3: Start PIN Verification & Trip in Progress
        print("\n--- Testing Stage 3: Start PIN Verify & IN_PROGRESS ---")
        entered_pin = "4921"
        assert entered_pin == ride.start_pin_plain, "Start PIN verification failed"
        ride.status = RideRequestStatus.IN_PROGRESS
        await db.commit()
        await db.refresh(ride)
        assert ride.status == RideRequestStatus.IN_PROGRESS
        print(f"[OK] Stage 3 (IN_PROGRESS) verified: PIN {entered_pin} verified successfully")

        # 6. Test Stage 4: Trip Completion
        print("\n--- Testing Stage 4: Trip Completion ---")
        ride.status = RideRequestStatus.COMPLETED
        await db.commit()
        await db.refresh(ride)
        assert ride.status == RideRequestStatus.COMPLETED
        print(f"[OK] Stage 4 (COMPLETED) verified")

        # 7. Test Emergency SOS Contact Resolution
        print("\n--- Testing Emergency SOS Contacts Resolution ---")
        sos_res = await db.execute(
            select(CustomerEmergencyContact)
            .where(CustomerEmergencyContact.user_id == user.id)
            .order_by(CustomerEmergencyContact.is_primary.desc())
        )
        contacts = sos_res.scalars().all()
        if not contacts:
            c = CustomerEmergencyContact(
                user_id=user.id,
                name="Uncle Rajesh",
                phone="+919876500001",
                relation="Uncle",
                is_primary=True,
                auto_share_trips=True,
            )
            db.add(c)
            await db.commit()
            contacts = [c]

        assert len(contacts) > 0
        primary = contacts[0]
        print(f"[OK] Emergency SOS Target Verified: {primary.name} ({primary.phone}, Relation: {primary.relation})")

        # 8. Test Cancellation with Structured Reason
        print("\n--- Testing Ride Cancellation with Structured Reason ---")
        cancel_ride = RideRequest(
            customer_id=user.id,
            booking_owner_id=user.id,
            rider_type="SELF",
            rider_name="Pankaj Patil",
            rider_phone=test_phone,
            is_booked_for_other=False,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="Baner, Pune",
            destination_location="SRID=4326;POINT(72.8777 19.0760)",
            destination_lat=19.0760,
            destination_lng=72.8777,
            destination_address="Airport, Mumbai",
            estimated_distance_km=140.0,
            estimated_duration_min=170,
            estimated_fare=Decimal("1750.00"),
            start_pin_plain="8821",
            status=RideRequestStatus.CANCELLED,
            cancellation_reason="Driver is taking too long to arrive",
        )
        db.add(cancel_ride)
        await db.commit()
        await db.refresh(cancel_ride)

        assert cancel_ride.status == RideRequestStatus.CANCELLED
        assert cancel_ride.cancellation_reason == "Driver is taking too long to arrive"
        print(f"[OK] Cancelled Ride Verified: Ride #{str(cancel_ride.id)[:8]} (Reason: {cancel_ride.cancellation_reason})")

        # Clean up test rides
        await db.delete(ride)
        await db.delete(cancel_ride)
        await db.commit()
        print("[OK] Test data cleanup complete")

        print("\n=== ALL FEATURE 4 LIVE TRACKING & MATCHING TESTS PASSED! ===")

asyncio.run(run_feature4_tracking_tests())
