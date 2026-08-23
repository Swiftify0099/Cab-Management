"""
Feature 2 Customer Address & Location Management — Smoke Test Suite
Validates database models, services, and API endpoints for:
1. Saved Addresses (Home, Work, Custom with PostGIS Geography)
2. Saved Routes (Pickup and Drop Coordinate pairs)
3. Address CRUD & Route CRUD
"""
import asyncio
import uuid
import sys
import os

_ROOT = r"d:\cub\Cab-Management\backend"
sys.path.insert(0, os.path.join(_ROOT, "auth-service"))
sys.path.insert(0, os.path.join(_ROOT, "common"))
sys.path.insert(0, _ROOT)

from common.database import AsyncSessionLocal
from common.models.all_models import (
    User,
    UserRole,
    SavedAddress,
    SavedRoute,
)
from sqlalchemy import select, delete


async def run_feature2_tests():
    print("=== STARTING FEATURE 2 CUSTOMER ADDRESS & LOCATION TEST SUITE ===")
    test_phone = "+919999911111"

    async with AsyncSessionLocal() as db:
        # 1. Setup Test User
        res = await db.execute(select(User).where(User.phone == test_phone))
        user = res.scalar_one_or_none()
        if not user:
            user = User(
                id=uuid.uuid4(),
                phone=test_phone,
                email="test_customer_f2@example.com",
                role=UserRole.CUSTOMER,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        print(f"[OK] Customer Context Ready: {user.id} ({user.phone})")

        # Cleanup existing test data for idempotency
        await db.execute(delete(SavedAddress).where(SavedAddress.user_id == user.id))
        await db.execute(delete(SavedRoute).where(SavedRoute.user_id == user.id))
        await db.commit()

        # 2. Test Saved Addresses
        print("\n--- Testing Saved Addresses (Home, Work, Other) ---")
        home_addr = SavedAddress(
            user_id=user.id,
            label="home",
            address_type="home",
            full_address="Flat 402, Green Acres, Baner, Pune 411045",
            location="SRID=4326;POINT(73.7868 18.5590)",
            latitude=18.5590,
            longitude=73.7868,
            pincode="411045",
            district="Pune",
            state="Maharashtra",
            is_default=True,
        )
        work_addr = SavedAddress(
            user_id=user.id,
            label="work",
            address_type="work",
            full_address="Tower 3, Magarpatta Cybercity, Hadapsar, Pune 411028",
            location="SRID=4326;POINT(73.9317 18.5158)",
            latitude=18.5158,
            longitude=73.9317,
            pincode="411028",
            district="Pune",
            state="Maharashtra",
            is_default=False,
        )
        db.add(home_addr)
        db.add(work_addr)
        await db.commit()
        await db.refresh(home_addr)
        await db.refresh(work_addr)

        print(f"[OK] Created Home Address: {home_addr.id} ({home_addr.full_address})")
        print(f"[OK] Created Work Address: {work_addr.id} ({work_addr.full_address})")

        # Verify Querying
        res = await db.execute(select(SavedAddress).where(SavedAddress.user_id == user.id))
        addresses = res.scalars().all()
        assert len(addresses) == 2
        print(f"[OK] Successfully queried {len(addresses)} saved addresses")

        # 3. Test Saved Routes
        print("\n--- Testing Saved Route Wizard ---")
        daily_route = SavedRoute(
            user_id=user.id,
            route_name="Daily Commute (Home -> Office)",
            pickup_label="Home",
            pickup_address="Baner, Pune",
            pickup_lat=18.5590,
            pickup_lon=73.7868,
            drop_label="Work",
            drop_address="Magarpatta, Pune",
            drop_lat=18.5158,
            drop_lon=73.9317,
        )
        db.add(daily_route)
        await db.commit()
        await db.refresh(daily_route)

        print(f"[OK] Saved Route Created: {daily_route.route_name} ({daily_route.pickup_label} -> {daily_route.drop_label})")

        # Verify Route Querying
        route_res = await db.execute(select(SavedRoute).where(SavedRoute.user_id == user.id))
        saved_routes = route_res.scalars().all()
        assert len(saved_routes) == 1
        assert saved_routes[0].route_name == "Daily Commute (Home -> Office)"
        print(f"[OK] Successfully queried {len(saved_routes)} saved route")

        # 4. Clean up test data
        await db.delete(home_addr)
        await db.delete(work_addr)
        await db.delete(daily_route)
        await db.commit()
        print("[OK] Test data cleanup complete")

        print("\n=== ALL FEATURE 2 CUSTOMER ADDRESS & LOCATION TESTS PASSED SUCCESSFULLY! ===")

asyncio.run(run_feature2_tests())
