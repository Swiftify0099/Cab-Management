"""
Customer profile service  business logic for profile CRUD and addresses.
"""
import uuid
from typing import List, Optional, Tuple

import structlog
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.profile import (
    CustomerProfileCreate,
    CustomerProfileUpdate,
    AddressCreate,
    AddressUpdate,
)
from common.models.all_models import CustomerProfile, SavedAddress, User
from common.utils.security import generate_referral_code

logger = structlog.get_logger(__name__)

MAX_ADDRESSES = 5


async def create_customer_profile(
    db: AsyncSession,
    user: User,
    data: CustomerProfileCreate,
) -> CustomerProfile:
    """Create customer profile after OTP verification. Marks profile as complete."""

    # Check if profile already exists
    result = await db.execute(
        select(CustomerProfile).where(CustomerProfile.user_id == user.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    # Generate unique referral code
    referral_code = await _generate_unique_referral_code(db)

    profile = CustomerProfile(
        user_id=user.id,
        full_name=data.full_name,
        gender=data.gender,
        dob=data.dob,
        emergency_contact=data.emergency_contact,
        referral_code=referral_code,
        reward_points=0,
        wallet_balance=0,
    )
    db.add(profile)

    # Mark user profile as complete
    user.is_profile_complete = True
    await db.flush()
    await db.refresh(profile)

    logger.info("Customer profile created", user_id=str(user.id))
    return profile


async def update_customer_profile(
    db: AsyncSession,
    profile: CustomerProfile,
    data: CustomerProfileUpdate,
    user: User,
) -> CustomerProfile:
    """Update customer profile fields."""
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field == "language":
            user.language = value
        else:
            setattr(profile, field, value)

    await db.flush()
    await db.refresh(profile)
    return profile


async def get_customer_profile(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> Optional[CustomerProfile]:
    """Get customer profile by user ID."""
    result = await db.execute(
        select(CustomerProfile).where(CustomerProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()


# ============================================================
# ADDRESSES
# ============================================================

async def get_user_addresses(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> List[SavedAddress]:
    """Get all saved addresses for a user."""
    result = await db.execute(
        select(SavedAddress)
        .where(SavedAddress.user_id == user_id)
        .order_by(SavedAddress.is_default.desc(), SavedAddress.created_at.asc())
    )
    return list(result.scalars().all())


async def create_address(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: AddressCreate,
) -> SavedAddress:
    """Create a new saved address. Max 5 allowed."""

    # Count existing
    count_result = await db.execute(
        select(func.count()).where(SavedAddress.user_id == user_id)
    )
    count = count_result.scalar_one()

    if count >= MAX_ADDRESSES:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_ADDRESSES} saved addresses allowed. Please delete one first.",
        )

    # If setting as default, unset existing default
    if data.is_default:
        await _unset_default_address(db, user_id)

    # PostGIS point
    point = WKTElement(f"POINT({data.longitude} {data.latitude})", srid=4326)

    address = SavedAddress(
        user_id=user_id,
        label=data.label,
        location=point,
        latitude=data.latitude,
        longitude=data.longitude,
        pincode=data.pincode,
        district=data.district,
        state=data.state,
        landmark=data.landmark,
        full_address=data.full_address,
        is_default=data.is_default,
    )
    db.add(address)
    await db.flush()
    await db.refresh(address)
    return address


async def update_address(
    db: AsyncSession,
    address: SavedAddress,
    data: AddressUpdate,
) -> SavedAddress:
    """Update a saved address."""
    update_data = data.model_dump(exclude_unset=True)

    if "is_default" in update_data and update_data["is_default"]:
        await _unset_default_address(db, address.user_id)

    if "latitude" in update_data or "longitude" in update_data:
        lat = update_data.get("latitude", address.latitude)
        lng = update_data.get("longitude", address.longitude)
        address.location = WKTElement(f"POINT({lng} {lat})", srid=4326)
        address.latitude = lat
        address.longitude = lng
        update_data.pop("latitude", None)
        update_data.pop("longitude", None)

    for field, value in update_data.items():
        setattr(address, field, value)

    await db.flush()
    await db.refresh(address)
    return address


async def delete_address(db: AsyncSession, address: SavedAddress) -> None:
    """Delete a saved address."""
    await db.delete(address)


async def _unset_default_address(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Remove default flag from all addresses for a user."""
    result = await db.execute(
        select(SavedAddress).where(
            SavedAddress.user_id == user_id,
            SavedAddress.is_default == True,
        )
    )
    for addr in result.scalars().all():
        addr.is_default = False


async def _generate_unique_referral_code(db: AsyncSession) -> str:
    """Generate a unique referral code."""
    for _ in range(10):
        code = generate_referral_code(8)
        result = await db.execute(
            select(CustomerProfile).where(CustomerProfile.referral_code == code)
        )
        if not result.scalar_one_or_none():
            return code
    return generate_referral_code(12)  # Fallback longer code
