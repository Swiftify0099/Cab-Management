"""
Customer and Driver profile API endpoints.
Phase 2  Complete implementation.
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
    SavedRouteCreate,
    SavedRouteResponse,
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
from common.models.all_models import (
    CustomerProfile,
    MediaAsset,
    MediaOwnerType,
    MediaType,
    SavedAddress,
    SavedRoute,
)
from common.schemas.response import APIResponse, MessageResponse
from common.utils.cloudinary_service import CloudinaryService
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
    summary="Upload customer profile photo to Cloudinary",
)
async def upload_profile_photo(
    photo: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload customer profile photo. Stores file in Cloudinary and metadata in PostgreSQL."""
    profile = await get_customer_profile(db=db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    old_photo = profile.profile_photo

    # Upload to Cloudinary with face auto-crop
    upload_res = await CloudinaryService.upload_customer_profile_photo(
        customer_id=str(current_user.id),
        file=photo,
    )
    photo_url = upload_res.get("secure_url") or upload_res.get("url")
    public_id = upload_res.get("public_id")

    # Record MediaAsset metadata in PostgreSQL (Zero binary bytes)
    media_asset = MediaAsset(
        owner_type=MediaOwnerType.CUSTOMER,
        owner_id=current_user.id,
        media_type=MediaType.PROFILE_PHOTO,
        cloudinary_public_id=public_id,
        resource_type=upload_res.get("resource_type", "image"),
        format=upload_res.get("format", "jpg"),
        mime_type=photo.content_type or "image/jpeg",
        file_size_bytes=upload_res.get("bytes", 0),
        version=upload_res.get("version", 1),
        secure_url=photo_url,
        thumbnail_url=photo_url,
        status="ACTIVE",
        is_private=False,
    )
    db.add(media_asset)

    # Atomic update: set new URL and commit
    profile.profile_photo = photo_url
    await db.commit()

    # Clean up old photo from Cloudinary if existed
    if old_photo and old_photo != photo_url:
        await delete_upload(old_photo)

    return APIResponse(
        message="Profile photo updated successfully",
        data={
            "photo_url": photo_url,
            "public_id": public_id,
            "version": upload_res.get("version", 1),
        },
    )


@router.delete(
    "/me/photo",
    response_model=APIResponse[dict],
    summary="Remove customer profile photo",
)
async def delete_profile_photo(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Removes customer profile photo, deletes Cloudinary asset, and clears DB metadata."""
    profile = await get_customer_profile(db=db, user_id=current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    old_photo = profile.profile_photo
    if old_photo:
        await delete_upload(old_photo)
        profile.profile_photo = None
        await db.commit()

    return APIResponse(
        message="Profile photo removed successfully",
        data={"photo_url": None},
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


# ============================================================
# SAVED ROUTES
# ============================================================

@router.get(
    "/me/routes",
    response_model=APIResponse[List[SavedRouteResponse]],
    summary="Get all saved routes",
)
async def list_routes(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedRoute).where(SavedRoute.user_id == current_user.id)
    )
    routes = result.scalars().all()
    data = [SavedRouteResponse.model_validate(r) for r in routes]
    return APIResponse(message="Routes fetched", data=data)


@router.post(
    "/me/routes",
    response_model=APIResponse[SavedRouteResponse],
    summary="Save a pickup+drop route pair",
    status_code=status.HTTP_201_CREATED,
)
async def add_route(
    data: SavedRouteCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    route = SavedRoute(
        user_id=current_user.id,
        route_name=data.route_name,
        pickup_label=data.pickup_label,
        pickup_address=data.pickup_address,
        pickup_lat=data.pickup_lat,
        pickup_lon=data.pickup_lon,
        drop_label=data.drop_label,
        drop_address=data.drop_address,
        drop_lat=data.drop_lat,
        drop_lon=data.drop_lon,
    )
    db.add(route)
    await db.commit()
    await db.refresh(route)
    return APIResponse(
        message="Route saved",
        data=SavedRouteResponse.model_validate(route),
    )


@router.delete(
    "/me/routes/{route_id}",
    response_model=MessageResponse,
    summary="Delete a saved route",
)
async def delete_saved_route(
    route_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedRoute).where(
            SavedRoute.id == route_id,
            SavedRoute.user_id == current_user.id,
        )
    )
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")

    await db.delete(route)
    await db.commit()
    return MessageResponse(message="Route deleted")
