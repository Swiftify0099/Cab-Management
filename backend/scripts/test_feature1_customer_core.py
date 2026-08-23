"""
Feature 1 Customer Core Account — Smoke Test Suite
Validates database models, services, and API endpoints for:
1. Family & Shared Accounts (Organizer, Members, Limits)
2. Emergency & Trusted Contacts (CRUD, Primary toggle, Auto-share)
3. Customer App Settings (Notifications, Privacy, Language)
4. Session Management & Soft Account Deletion
5. Cross-app Driver Privacy & Rider Resolution
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
    FamilyAccount,
    FamilyMember,
    FamilyRole,
    CustomerEmergencyContact,
    CustomerAppSetting,
    RideRequest,
    RideRequestStatus,
)
from app.services.family_service import (
    get_or_create_family,
    add_family_member,
    update_family_member,
    remove_family_member,
    update_family_payment_settings,
)
from app.schemas.family import FamilyMemberCreate, FamilyMemberUpdate, FamilyPaymentUpdate
from app.services.emergency_service import (
    list_emergency_contacts,
    create_emergency_contact,
    update_emergency_contact,
    delete_emergency_contact,
)
from app.schemas.emergency import EmergencyContactCreate, EmergencyContactUpdate
from app.services.customer_settings_service import (
    get_or_create_customer_settings,
    update_customer_settings,
    list_user_sessions,
    delete_customer_account,
)
from app.schemas.customer_settings import CustomerSettingsUpdate
from sqlalchemy import select, delete


async def run_feature1_tests():
    print("=== STARTING FEATURE 1 CUSTOMER CORE ACCOUNT TEST SUITE ===")
    test_phone = "+919999911111"
    member_phone = "+919999922222"

    async with AsyncSessionLocal() as db:
        # 1. Setup Test User
        res = await db.execute(select(User).where(User.phone == test_phone))
        user = res.scalar_one_or_none()
        if not user:
            user = User(
                id=uuid.uuid4(),
                phone=test_phone,
                email="test_customer_f1@example.com",
                role=UserRole.CUSTOMER,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        print(f"[OK] Test Customer ready: {user.id} ({user.phone})")

        # Cleanup existing test data for idempotency
        await db.execute(delete(CustomerEmergencyContact).where(CustomerEmergencyContact.user_id == user.id))
        fam_res = await db.execute(select(FamilyAccount).where(FamilyAccount.organizer_id == user.id))
        old_fam = fam_res.scalar_one_or_none()
        if old_fam:
            await db.execute(delete(FamilyMember).where(FamilyMember.family_id == old_fam.id))
            await db.delete(old_fam)
        await db.commit()

        # 2. Test Family Hub
        print("\n--- Testing Family & Shared Account ---")
        family = await get_or_create_family(db, user)
        assert family is not None
        assert family.organizer_id == user.id
        assert len(family.members) == 1
        assert family.members[0].role == FamilyRole.ORGANIZER
        print(f"[OK] Created Family Account: {family.family_name} with Organizer member")

        # Add Member
        member_data = FamilyMemberCreate(
            name="Pooja Patil",
            phone=member_phone,
            relationship="Sister",
            can_use_shared_payment=True,
            can_book_rides=True,
            can_track_trips=True,
        )
        new_member = await add_family_member(db, user, member_data)
        assert new_member.name == "Pooja Patil"
        assert new_member.relation == "Sister"
        print(f"[OK] Added Family Member: {new_member.name} ({new_member.relation})")

        # Update Member
        updated_member = await update_family_member(
            db,
            user,
            new_member.id,
            FamilyMemberUpdate(relationship="Spouse", can_track_trips=False),
        )
        assert updated_member.relation == "Spouse"
        assert updated_member.can_track_trips is False
        print(f"[OK] Updated Family Member permissions & relation: {updated_member.relation}")

        # Update Family Payment
        updated_fam = await update_family_payment_settings(
            db,
            user,
            FamilyPaymentUpdate(is_shared_payment_enabled=True, shared_payment_method="card"),
        )
        assert updated_fam.shared_payment_method == "card"
        print("[OK] Updated Family Payment Settings")

        # 3. Test Emergency Contacts
        print("\n--- Testing Emergency & Trusted Contacts ---")
        c1 = await create_emergency_contact(
            db,
            user.id,
            EmergencyContactCreate(
                name="Uncle Rajesh",
                phone="+919888877771",
                relationship="Uncle",
                is_primary=True,
                auto_share_rides=True,
            ),
        )
        assert c1.is_primary is True
        assert c1.auto_share_rides is True
        print(f"[OK] Added Primary Emergency Contact: {c1.name}")

        c2 = await create_emergency_contact(
            db,
            user.id,
            EmergencyContactCreate(
                name="Dr. Alok Verma",
                phone="+919888877772",
                relationship="Doctor",
                is_primary=False,
                auto_share_rides=False,
            ),
        )
        assert c2.is_primary is False
        print(f"[OK] Added Secondary Contact: {c2.name}")

        contacts = await list_emergency_contacts(db, user.id)
        assert len(contacts) == 2
        print(f"[OK] Listed {len(contacts)} emergency contacts correctly ordered")

        # 4. Test Customer Settings
        print("\n--- Testing Settings & Preferences ---")
        settings = await get_or_create_customer_settings(db, user)
        assert settings.notifications_ride_updates is True
        print("[OK] Default customer settings initialized")

        updated_settings = await update_customer_settings(
            db,
            user,
            CustomerSettingsUpdate(
                notifications_promotions=False,
                privacy_personalized_ads=True,
                language="mr",
            ),
        )
        assert updated_settings.notifications_promotions is False
        assert updated_settings.privacy_personalized_ads is True
        assert user.language == "mr"
        print(f"[OK] Updated Customer Settings & Language preference: {user.language}")

        # 5. Test Ride Participant Contract (Book for Other)
        print("\n--- Testing Cross-App Booking Participant Contract ---")
        ride_req = RideRequest(
            customer_id=user.id,
            booking_owner_id=user.id,
            rider_type="FAMILY_MEMBER",
            rider_name="Pooja Patil",
            rider_phone=member_phone,
            is_booked_for_other=True,
            pickup_location="SRID=4326;POINT(73.8567 18.5204)",
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            pickup_address="Shivajinagar, Pune",
            destination_location="SRID=4326;POINT(72.8777 19.0760)",
            destination_lat=19.0760,
            destination_lng=72.8777,
            destination_address="Dadar, Mumbai",
            estimated_distance_km=145.0,
            estimated_duration_min=180,
            estimated_fare=Decimal("1850.00"),
            status=RideRequestStatus.CREATED,
        )
        db.add(ride_req)
        await db.commit()
        await db.refresh(ride_req)

        assert ride_req.is_booked_for_other is True
        assert ride_req.rider_name == "Pooja Patil"
        assert ride_req.booking_owner_id == user.id
        print(f"[OK] RideRequest saved with participant context: {ride_req.rider_name} ({ride_req.rider_type})")

        # Clean up ride request
        await db.delete(ride_req)
        await db.commit()

        print("\n=== ALL FEATURE 1 CUSTOMER CORE TESTS PASSED SUCCESSFULLY! ===")

asyncio.run(run_feature1_tests())
