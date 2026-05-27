"""
Customer and Driver profile API endpoints.
Phase 2 — Complete implementation.
"""
import uuid
from typing import List

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.profile import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
    CustomerProfileCreate,
    CustomerProfileResponse,
    CustomerProfileUpdate,
)
from app.services.profile_service import (
    create_address,
    create_customer_profile,
    delete_address,
    get_customer_profile,
    get_user_addresses,
    update_address,
    update_customer_profile,
)
from common.database import get_db
from common.middleware.auth import (
    AuthenticatedUser,
    get_current_active_customer,
    get_current_user,
)
from common.models.all_models import CustomerProfile, SavedAddress
from common.schemas.response import APIResponse, MessageResponse
from common.utils.storage import (
    ALLOWED_IMAGE_TYPES,
    delete_upload,
    get_file_url,
    save_upload,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


# ============================================================
# CUSTOMER PROFILE
# ============================================================

@router.post(
    "/setup",
    response_model=APIResponse[CustomerProfileResponse],
    summary="Complete profile setup (mandatory after first login)",
    status_code=status.HTTP_201_CREATED,
)
async def setup_profile(
    data: CustomerProfileCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mandatory profile setup after OTP verification.
    Collects name, gender, DOB, emergency contact.
    Sets profile_complete=True on the user.
    """
    profile = await create_customer_profile(db=db, user=current_user._user, data=data)
    await db.commit()

    # Build response
    resp = CustomerProfileResponse(
        user_id=profile.user_id,
        full_name=profile.full_name,
        gender=profile.gender,
        dob=profile.dob,
        emergency_contact=profile.emergency_contact,
        profile_photo=get_file_url(profile.profile_photo) if profile.profile_photo else None,
        reward_points=profile.reward_points,
        wallet_balance=profile.wallet_balance,
        referral_code=profile.referral_code,
        women_only_mode=profile.women_only_mode,
        subscription_plan_id=profile.subscription_plan_id,
    )

    return APIResponse(message="Profile created successfully", data=resp)


@router.get(
    "/me",
    response_model=APIResponse[CustomerProfileResponse],
    summary="Get current user profile",
)
async def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await get_customer_profile(db=db, user_id=current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete profile setup.",
        )

    resp = CustomerProfileResponse(
        user_id=profile.user_id,
        full_name=profile.full_name,
        gender=profile.gender,
        dob=profile.dob,
        emergency_contact=profile.emergency_contact,
        profile_photo=get_file_url(profile.profile_photo) if profile.profile_photo else None,
        reward_points=profile.reward_points,
        wallet_balance=profile.wallet_balance,
        referral_code=profile.referral_code,
        women_only_mode=profile.women_only_mode,
        subscription_plan_id=profile.subscription_plan_id,
    )
    return APIResponse(message="Profile fetched", data=resp)


@router.patch(
    "/me",
    response_model=APIResponse[CustomerProfileResponse],
    summary="Update customer profile",
)
async def update_my_profile(
    data: CustomerProfileUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await get_customer_profile(db=db, user_id=current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    profile = await update_customer_profile(
        db=db, profile=profile, data=data, user=current_user._user
    )
    await db.commit()

    resp = CustomerProfileResponse(
        user_id=profile.user_id,
        full_name=profile.full_name,
        gender=profile.gender,
        dob=profile.dob,
        emergency_contact=profile.emergency_contact,
        profile_photo=get_file_url(profile.profile_photo) if profile.profile_photo else None,
        reward_points=profile.reward_points,
        wallet_balance=profile.wallet_balance,
        referral_code=profile.referral_code,
        women_only_mode=profile.women_only_mode,
        subscription_plan_id=profile.subscription_plan_id,
    )
    return APIResponse(message="Profile updated", data=resp)


@router.post(
    "/me/photo",
    response_model=APIResponse[dict],
    summary="Upload profile photo",
)
async def upload_profile_photo(
    photo: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload profile photo. Accepts JPEG/PNG/WebP, max 5MB."""
    profile = await get_customer_profile(db=db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Delete old photo
    if profile.profile_photo:
        await delete_upload(profile.profile_photo)

    # Save new photo
    relative_path = await save_upload(
        file=photo,
        category="profiles",
        allowed_types=ALLOWED_IMAGE_TYPES,
        max_size=5 * 1024 * 1024,
    )

    profile.profile_photo = relative_path
    await db.commit()

    return APIResponse(
        message="Profile photo updated",
        data={"photo_url": get_file_url(relative_path)},
    )


# ============================================================
# SAVED ADDRESSES
# ============================================================

@router.get(
    "/me/addresses",
    response_model=APIResponse[List[AddressResponse]],
    summary="Get all saved addresses",
)
async def list_addresses(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    addresses = await get_user_addresses(db=db, user_id=current_user.id)
    data = [AddressResponse.model_validate(a) for a in addresses]
    return APIResponse(message="Addresses fetched", data=data)


@router.post(
    "/me/addresses",
    response_model=APIResponse[AddressResponse],
    summary="Add a saved address (max 5)",
    status_code=status.HTTP_201_CREATED,
)
async def add_address(
    data: AddressCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    address = await create_address(db=db, user_id=current_user.id, data=data)
    await db.commit()
    return APIResponse(
        message="Address saved",
        data=AddressResponse.model_validate(address),
    )


@router.patch(
    "/me/addresses/{address_id}",
    response_model=APIResponse[AddressResponse],
    summary="Update a saved address",
)
async def update_saved_address(
    address_id: uuid.UUID,
    data: AddressUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedAddress).where(
            SavedAddress.id == address_id,
            SavedAddress.user_id == current_user.id,
        )
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    address = await update_address(db=db, address=address, data=data)
    await db.commit()
    return APIResponse(
        message="Address updated",
        data=AddressResponse.model_validate(address),
    )


@router.delete(
    "/me/addresses/{address_id}",
    response_model=MessageResponse,
    summary="Delete a saved address",
)
async def delete_saved_address(
    address_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedAddress).where(
            SavedAddress.id == address_id,
            SavedAddress.user_id == current_user.id,
        )
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    await delete_address(db=db, address=address)
    await db.commit()
    return MessageResponse(message="Address deleted")
