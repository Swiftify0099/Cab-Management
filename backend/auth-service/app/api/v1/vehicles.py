"""
Driver Multi-Vehicle Management API Router
Endpoints for adding, editing, removing, activating, deactivating, and managing vehicle documents.
"""
from __future__ import annotations

import uuid
from datetime import date
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.vehicle import (
    VehicleCreateRequest,
    VehicleUpdateRequest,
    VehicleDetailResponse,
    VehicleDocumentSummary,
    VehicleDashboardSummaryResponse,
)
from app.services.vehicle_service import (
    activate_driver_vehicle,
    create_driver_vehicle,
    deactivate_driver_vehicle,
    delete_driver_vehicle,
    get_driver_vehicle,
    list_driver_vehicles,
    update_driver_vehicle,
    MAX_VEHICLES_PER_DRIVER,
)
from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_active_driver
from common.models.all_models import (
    DocumentType,
    Driver,
    DriverDocument,
    MediaAsset,
    MediaOwnerType,
    MediaType,
    Vehicle,
)
from common.schemas.response import APIResponse
from common.utils.cloudinary_service import CloudinaryService
from common.utils.storage import ALLOWED_DOCUMENT_TYPES, get_file_url, save_upload

logger = structlog.get_logger(__name__)
router = APIRouter()


def _build_vehicle_detail(v: Vehicle, docs: List[DriverDocument]) -> VehicleDetailResponse:
    today = date.today()
    doc_summaries = []
    for d in docs:
        if d.vehicle_id == v.id:
            is_exp = bool(d.expires_at and d.expires_at < today)
            preview_url = None
            if d.cloudinary_public_id:
                try:
                    preview_url = CloudinaryService.generate_secure_access_url(d.cloudinary_public_id)
                except Exception:
                    preview_url = d.file_path
            else:
                preview_url = d.file_path

            doc_summaries.append(
                VehicleDocumentSummary(
                    doc_type=d.doc_type.value if hasattr(d.doc_type, "value") else str(d.doc_type),
                    is_verified=d.is_verified,
                    status=d.status,
                    expiry_date=d.expires_at,
                    is_expired=is_exp,
                    preview_url=preview_url,
                )
            )

    return VehicleDetailResponse(
        id=v.id,
        driver_id=v.driver_id,
        vehicle_type=v.vehicle_type.value if hasattr(v.vehicle_type, "value") else str(v.vehicle_type),
        make=v.make,
        model=v.model,
        variant=v.variant,
        year=v.year,
        color=v.color,
        registration_number=v.registration_number,
        seat_capacity=v.seat_capacity,
        fuel_type=v.fuel_type or "petrol",
        comfort_level=v.comfort_level or "economy",
        ownership_type=v.ownership_type or "self",
        registered_owner_name=v.registered_owner_name,
        service_capabilities=list(v.service_capabilities or []),
        is_active=v.is_active,
        status=v.status or "APPROVED",
        rejection_reason=v.rejection_reason,
        has_ac=v.has_ac,
        parcel_capable=v.parcel_capable,
        parcel_capacity_kg=v.parcel_capacity_kg,
        transport_capable=v.transport_capable,
        max_payload_kg=v.max_payload_kg,
        cargo_volume_cft=v.cargo_volume_cft,
        commercial_permit=v.commercial_permit,
        insurance_expiry=v.insurance_expiry,
        pollution_expiry=v.pollution_expiry,
        permit_expiry=v.permit_expiry,
        fitness_expiry=v.fitness_expiry,
        photos=[get_file_url(p) for p in (v.photos or [])],
        documents=doc_summaries,
        created_at=v.created_at,
        updated_at=v.updated_at,
    )


@router.get(
    "",
    response_model=APIResponse[VehicleDashboardSummaryResponse],
    summary="List all vehicles for current driver with active operational vehicle",
)
async def list_vehicles(
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Fetches list of all driver's vehicles with operational active indicator and standby list."""
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    vehicles = await list_driver_vehicles(db, driver.id)
    doc_res = await db.execute(select(DriverDocument).where(DriverDocument.driver_id == driver.id))
    all_docs = doc_res.scalars().all()

    active_veh = None
    standby_veh = []
    for v in vehicles:
        detail = _build_vehicle_detail(v, all_docs)
        if v.is_active:
            active_veh = detail
        else:
            standby_veh.append(detail)

    resp = VehicleDashboardSummaryResponse(
        total_vehicles=len(vehicles),
        active_vehicle=active_veh,
        standby_vehicles=standby_veh,
        pending_count=sum(1 for v in vehicles if v.status == "PENDING_REVIEW"),
        can_add_more=len(vehicles) < MAX_VEHICLES_PER_DRIVER,
        max_vehicles_allowed=MAX_VEHICLES_PER_DRIVER,
    )
    return APIResponse(message="Vehicles fetched", data=resp)


@router.get(
    "/{vehicle_id}",
    response_model=APIResponse[VehicleDetailResponse],
    summary="Get vehicle details by ID",
)
async def get_vehicle(
    vehicle_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full details for a single vehicle owned by current driver."""
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    v = await get_driver_vehicle(db, driver.id, vehicle_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    doc_res = await db.execute(
        select(DriverDocument).where(
            DriverDocument.driver_id == driver.id,
            DriverDocument.vehicle_id == vehicle_id,
        )
    )
    docs = doc_res.scalars().all()

    return APIResponse(message="Vehicle details fetched", data=_build_vehicle_detail(v, docs))


@router.post(
    "",
    response_model=APIResponse[VehicleDetailResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new vehicle to driver's fleet",
)
async def add_vehicle(
    payload: VehicleCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Adds a new vehicle to the driver's registered fleet."""
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    v = await create_driver_vehicle(db, driver, payload)
    await db.commit()

    return APIResponse(
        message=f"Vehicle {v.registration_number} registered successfully",
        data=_build_vehicle_detail(v, []),
    )


@router.patch(
    "/{vehicle_id}",
    response_model=APIResponse[VehicleDetailResponse],
    summary="Update vehicle details",
)
async def update_vehicle(
    vehicle_id: uuid.UUID,
    payload: VehicleUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Updates vehicle metadata and specifications."""
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    v = await update_driver_vehicle(db, driver.id, vehicle_id, payload)
    await db.commit()

    return APIResponse(
        message="Vehicle updated successfully",
        data=_build_vehicle_detail(v, []),
    )


@router.delete(
    "/{vehicle_id}",
    response_model=APIResponse[dict],
    summary="Remove vehicle from fleet",
)
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Removes a vehicle from driver's fleet."""
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    await delete_driver_vehicle(db, driver.id, vehicle_id)
    await db.commit()

    return APIResponse(
        message="Vehicle removed successfully",
        data={"vehicle_id": str(vehicle_id), "deleted": True},
    )


@router.post(
    "/{vehicle_id}/activate",
    response_model=APIResponse[VehicleDetailResponse],
    summary="Atomically activate a vehicle for operational duty",
)
async def activate_vehicle(
    vehicle_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """
    Atomic Active Switch:
    Deactivates all other vehicles and activates the selected vehicle.
    Guarantees exactly ONE active vehicle for dispatch.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    v = await activate_driver_vehicle(db, driver.id, vehicle_id)
    await db.commit()

    return APIResponse(
        message=f"Vehicle {v.registration_number} is now your active operational vehicle",
        data=_build_vehicle_detail(v, []),
    )


@router.post(
    "/{vehicle_id}/deactivate",
    response_model=APIResponse[VehicleDetailResponse],
    summary="Deactivate a vehicle",
)
async def deactivate_vehicle(
    vehicle_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Deactivates a vehicle from operational duty."""
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    v = await deactivate_driver_vehicle(db, driver.id, vehicle_id)
    await db.commit()

    return APIResponse(
        message=f"Vehicle {v.registration_number} deactivated",
        data=_build_vehicle_detail(v, []),
    )


@router.post(
    "/{vehicle_id}/documents/{doc_type}",
    response_model=APIResponse[dict],
    summary="Upload a vehicle document (RC, Insurance, Permit, Fitness, PUC, Photos) to Cloudinary",
)
async def upload_vehicle_document(
    vehicle_id: uuid.UUID,
    doc_type: str,
    file: UploadFile = File(...),
    document_number: Optional[str] = Form(None),
    expires_at: Optional[str] = Form(None),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Uploads vehicle compliance document to Cloudinary and links to vehicle record."""
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    vehicle = await get_driver_vehicle(db, driver.id, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    try:
        dt_enum = DocumentType(doc_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document type: {doc_type}")

    parsed_exp: Optional[date] = None
    if expires_at:
        try:
            parsed_exp = date.fromisoformat(expires_at)
        except ValueError:
            pass

    # 1. Upload to Cloudinary private storage
    try:
        upload_res = await CloudinaryService.upload_driver_kyc_document(
            driver_id=str(driver.id),
            doc_type=doc_type,
            file=file,
            vehicle_id=str(vehicle_id),
        )
        secure_url = upload_res.get("secure_url") or upload_res.get("url")
        public_id = upload_res.get("public_id")
    except Exception as e:
        logger.warning("cloudinary_vehicle_doc_fallback", error=str(e))
        path = await save_upload(file=file, category="documents", allowed_types=ALLOWED_DOCUMENT_TYPES)
        secure_url = get_file_url(path)
        public_id = None

    # 2. Record MediaAsset metadata
    media_asset = MediaAsset(
        owner_type=MediaOwnerType.VEHICLE,
        owner_id=vehicle_id,
        media_type=MediaType.VEHICLE_DOCUMENT,
        cloudinary_public_id=public_id or f"local_veh_{uuid.uuid4().hex[:8]}",
        resource_type="image",
        format="jpg",
        mime_type=file.content_type or "image/jpeg",
        file_size_bytes=0,
        version=1,
        secure_url=secure_url,
        thumbnail_url=secure_url,
        status="ACTIVE",
        is_private=True,
    )
    db.add(media_asset)
    await db.flush()

    # 3. Create or update DriverDocument scoped to vehicle
    doc_res = await db.execute(
        select(DriverDocument).where(
            DriverDocument.driver_id == driver.id,
            DriverDocument.vehicle_id == vehicle_id,
            DriverDocument.doc_type == dt_enum,
        )
    )
    doc = doc_res.scalar_one_or_none()
    if doc:
        doc.version += 1
        doc.file_path = secure_url
        doc.cloudinary_public_id = public_id
        doc.media_asset_id = media_asset.id
        doc.document_number = document_number or doc.document_number
        doc.expires_at = parsed_exp or doc.expires_at
        doc.status = "under_review"
        doc.rejection_reason = None
    else:
        doc = DriverDocument(
            driver_id=driver.id,
            vehicle_id=vehicle_id,
            doc_type=dt_enum,
            file_path=secure_url,
            cloudinary_public_id=public_id,
            media_asset_id=media_asset.id,
            document_number=document_number,
            expires_at=parsed_exp,
            version=1,
            status="under_review",
            is_verified=False,
            is_current=True,
        )
        db.add(doc)

    # 4. Synchronize expiry date on vehicle record if applicable
    if dt_enum == DocumentType.INSURANCE and parsed_exp:
        vehicle.insurance_expiry = parsed_exp
    elif dt_enum == DocumentType.PUC and parsed_exp:
        vehicle.pollution_expiry = parsed_exp
    elif dt_enum == DocumentType.PERMIT and parsed_exp:
        vehicle.permit_expiry = parsed_exp
    elif dt_enum == DocumentType.FITNESS and parsed_exp:
        vehicle.fitness_expiry = parsed_exp

    await db.commit()

    return APIResponse(
        message=f"{dt_enum.value} uploaded for vehicle {vehicle.registration_number}",
        data={
            "vehicle_id": str(vehicle_id),
            "doc_type": dt_enum.value,
            "version": doc.version,
            "status": doc.status,
            "file_path": secure_url,
            "public_id": public_id,
        },
    )
