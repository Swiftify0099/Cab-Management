"""
Driver onboarding API endpoints.
- Profile setup
- Vehicle registration
- KYC document upload
- Onboarding status
"""
import uuid
from typing import List

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.profile import (
    DriverDocumentResponse,
    DriverProfileCreate,
    DriverProfileResponse,
    DriverProfileUpdate,
    VehicleCreate,
    VehicleResponse,
)
from app.services.driver_service import (
    add_driver_document,
    add_driver_vehicle,
    get_or_create_driver_profile,
    update_driver_profile,
    REQUIRED_DOCUMENTS,
)
from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_active_driver
from common.models.all_models import (
    DocType,
    DriverDocument,
    DriverProfile,
    Vehicle,
)
from common.schemas.response import APIResponse, MessageResponse
from common.utils.storage import (
    ALLOWED_DOCUMENT_TYPES,
    delete_upload,
    get_file_url,
    save_upload,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


# ============================================================
# DRIVER PROFILE
# ============================================================

@router.post(
    "/setup",
    response_model=APIResponse[DriverProfileResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Driver profile setup (step 1 of onboarding)",
)
async def driver_setup(
    data: DriverProfileCreate,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Create driver profile. First step of onboarding."""
    profile = await get_or_create_driver_profile(
        db=db, user=current_user._user, data=data
    )
    await db.commit()

    return APIResponse(
        message="Driver profile created",
        data=DriverProfileResponse.model_validate(profile),
    )


@router.get(
    "/me",
    response_model=APIResponse[DriverProfileResponse],
    summary="Get current driver profile",
)
async def get_driver_profile(
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    return APIResponse(
        message="Driver profile fetched",
        data=DriverProfileResponse.model_validate(profile),
    )


@router.patch(
    "/me",
    response_model=APIResponse[DriverProfileResponse],
    summary="Update driver profile",
)
async def update_driver(
    data: DriverProfileUpdate,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    profile = await update_driver_profile(db=db, profile=profile, data=data)
    await db.commit()

    return APIResponse(
        message="Driver profile updated",
        data=DriverProfileResponse.model_validate(profile),
    )


@router.post(
    "/me/photo",
    response_model=APIResponse[dict],
    summary="Upload driver profile photo",
)
async def upload_driver_photo(
    photo: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    if profile.profile_photo:
        await delete_upload(profile.profile_photo)

    path = await save_upload(file=photo, category="drivers", max_size=5 * 1024 * 1024)
    profile.profile_photo = path
    await db.commit()

    return APIResponse(
        message="Profile photo updated",
        data={"photo_url": get_file_url(path)},
    )


# ============================================================
# VEHICLE
# ============================================================

@router.post(
    "/me/vehicle",
    response_model=APIResponse[VehicleResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register vehicle (step 2 of onboarding)",
)
async def register_vehicle(
    data: VehicleCreate,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Please complete driver profile setup first")

    vehicle = await add_driver_vehicle(db=db, driver=profile, data=data)
    await db.commit()

    return APIResponse(
        message="Vehicle registered",
        data=VehicleResponse(
            id=vehicle.id,
            vehicle_type=vehicle.vehicle_type.value,
            make=vehicle.make,
            model=vehicle.model,
            year=vehicle.year,
            color=vehicle.color,
            registration_number=vehicle.registration_number,
            seat_capacity=vehicle.seat_capacity,
            parcel_capable=vehicle.parcel_capable,
            parcel_capacity_kg=vehicle.parcel_capacity_kg,
            has_ac=vehicle.has_ac,
            insurance_expiry=vehicle.insurance_expiry,
            pollution_expiry=vehicle.pollution_expiry,
            photos=[get_file_url(p) for p in (vehicle.photos or [])],
        ),
    )


# ============================================================
# KYC DOCUMENTS
# ============================================================

@router.post(
    "/me/documents/{doc_type}",
    response_model=APIResponse[DriverDocumentResponse],
    summary="Upload KYC document (step 3 of onboarding)",
)
async def upload_document(
    doc_type: DocType,
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a KYC document.
    Required docs: driving_license, aadhaar, vehicle_rc, vehicle_insurance, pan_card.
    Accepts images (JPEG/PNG/WebP) and PDF.
    """
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    # Delete old document file if re-uploading
    old_result = await db.execute(
        select(DriverDocument).where(
            DriverDocument.driver_id == profile.id,
            DriverDocument.doc_type == doc_type,
        )
    )
    old_doc = old_result.scalar_one_or_none()
    if old_doc and old_doc.file_path:
        await delete_upload(old_doc.file_path)

    # Save file
    path = await save_upload(
        file=file,
        category="documents",
        allowed_types=ALLOWED_DOCUMENT_TYPES,
        max_size=10 * 1024 * 1024,
    )

    doc = await add_driver_document(db=db, driver=profile, doc_type=doc_type, file_path=path)
    await db.commit()

    return APIResponse(
        message=f"{doc_type.value} uploaded successfully",
        data=DriverDocumentResponse(
            id=doc.id,
            doc_type=doc.doc_type.value,
            file_path=get_file_url(doc.file_path),
            is_verified=doc.is_verified,
            rejection_reason=doc.rejection_reason,
        ),
    )


@router.get(
    "/me/documents",
    response_model=APIResponse[List[DriverDocumentResponse]],
    summary="List all uploaded documents",
)
async def list_documents(
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    docs_result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == profile.id)
    )
    docs = docs_result.scalars().all()

    data = [
        DriverDocumentResponse(
            id=d.id,
            doc_type=d.doc_type.value,
            file_path=get_file_url(d.file_path),
            is_verified=d.is_verified,
            rejection_reason=d.rejection_reason,
        )
        for d in docs
    ]
    return APIResponse(message="Documents fetched", data=data)


@router.get(
    "/me/onboarding-status",
    response_model=APIResponse[dict],
    summary="Check onboarding completion status",
)
async def onboarding_status(
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Returns which steps are complete for onboarding."""
    result = await db.execute(
        select(DriverProfile).where(DriverProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        return APIResponse(
            message="Onboarding status",
            data={
                "profile": False,
                "vehicle": False,
                "documents": {},
                "kyc_status": "not_started",
                "all_complete": False,
            },
        )

    # Vehicle
    vehicle_result = await db.execute(
        select(Vehicle).where(Vehicle.driver_id == profile.id).limit(1)
    )
    has_vehicle = vehicle_result.scalar_one_or_none() is not None

    # Documents
    docs_result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == profile.id)
    )
    docs = docs_result.scalars().all()
    doc_status = {d.doc_type.value: {"uploaded": True, "verified": d.is_verified} for d in docs}

    required_uploaded = all(
        req.value in doc_status for req in REQUIRED_DOCUMENTS
    )

    return APIResponse(
        message="Onboarding status",
        data={
            "profile": True,
            "vehicle": has_vehicle,
            "documents": doc_status,
            "required_documents": [r.value for r in REQUIRED_DOCUMENTS],
            "all_documents_uploaded": required_uploaded,
            "kyc_status": profile.kyc_status.value,
            "all_complete": has_vehicle and required_uploaded,
        },
    )
