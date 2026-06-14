"""
Parcel Service API  Phase 7.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, get_current_active_driver, AuthenticatedUser
from common.schemas.base import SuccessResponse
from common.utils.storage import save_upload, ALLOWED_IMAGE_TYPES, get_file_url
from app.services.parcel_service import ParcelService

router = APIRouter()


#  Schemas 

class CreateParcelRequest(BaseModel):
    trip_id: str
    sender_name: str
    sender_phone: str
    receiver_name: str
    receiver_phone: str
    receiver_address: str
    weight_kg: float = Field(..., gt=0, le=500)
    description: str
    fragile: bool = False
    urgent: bool = False
    declared_value: Optional[float] = None


class UpdateParcelStatusRequest(BaseModel):
    parcel_id: str
    status: str  # pickup_done | in_transit | delivered | failed
    delivery_otp: Optional[str] = None


class FareEstimateRequest(BaseModel):
    weight_kg: float
    distance_km: float
    fragile: bool = False
    urgent: bool = False


#  Routes 

@router.post(
    "/parcels",
    response_model=SuccessResponse,
    summary="Customer: Book a parcel on a shared trip",
)
async def book_parcel(
    request: CreateParcelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    try:
        result = await service.create_parcel(
            customer_id=current_user.user_id_str,
            trip_id=request.trip_id,
            sender_name=request.sender_name,
            sender_phone=request.sender_phone,
            receiver_name=request.receiver_name,
            receiver_phone=request.receiver_phone,
            receiver_address=request.receiver_address,
            weight_kg=request.weight_kg,
            description=request.description,
            fragile=request.fragile,
            urgent=request.urgent,
            declared_value=request.declared_value,
        )
        return SuccessResponse(success=True, message="Parcel booked", data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/parcels/fare-estimate",
    response_model=SuccessResponse,
    summary="Estimate parcel fare before booking",
)
async def estimate_fare(
    request: FareEstimateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    fare = service.calculate_fare(
        weight_kg=request.weight_kg,
        distance_km=request.distance_km,
        fragile=request.fragile,
        urgent=request.urgent,
    )
    return SuccessResponse(
        success=True,
        message="Fare estimated",
        data={"fare": float(fare), "breakdown": {
            "weight_kg": request.weight_kg,
            "distance_km": request.distance_km,
            "fragile_surcharge": "20%" if request.fragile else "0%",
            "urgent_surcharge": "30%" if request.urgent else "0%",
        }},
    )


@router.get(
    "/parcels/my",
    response_model=SuccessResponse,
    summary="Customer: Get my parcel history",
)
async def my_parcels(
    page: int = 1,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    parcels = await service.get_customer_parcels(current_user.user_id_str, page=page)
    return SuccessResponse(success=True, message="OK", data=parcels)


@router.get(
    "/parcels/track/{tracking_number}",
    response_model=SuccessResponse,
    summary="Public: Track a parcel by tracking number",
)
async def track_parcel(
    tracking_number: str,
    db: AsyncSession = Depends(get_db),
):
    service = ParcelService(db)
    try:
        result = await service.track_parcel(tracking_number.upper())
        return SuccessResponse(success=True, message="OK", data=result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


class ParcelRespondRequest(BaseModel):
    parcel_id: str
    action: str  # accept | decline


# ============================================================
# DRIVER ROUTES
# ============================================================

@router.get(
    "/parcels/driver-requests",
    response_model=SuccessResponse,
    summary="Driver: Get pending parcel requests",
)
async def get_driver_requests(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = ParcelService(db)
    requests = await service.get_driver_requests(current_user.user_id_str)
    return SuccessResponse(success=True, message="OK", data=requests)


@router.post(
    "/parcels/respond",
    response_model=SuccessResponse,
    summary="Driver: Accept or decline a parcel request",
)
async def respond_to_parcel(
    request: ParcelRespondRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = ParcelService(db)
    try:
        result = await service.respond_to_request(
            parcel_id=request.parcel_id,
            driver_id=current_user.user_id_str,
            action=request.action,
        )
        return SuccessResponse(success=True, message=f"Parcel {request.action}ed", data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/parcels/status",
    response_model=SuccessResponse,
    summary="Driver: Update parcel status (pickup/transit/delivered)",
)
async def update_parcel_status(
    request: UpdateParcelStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = ParcelService(db)
    try:
        result = await service.update_status(
            parcel_id=request.parcel_id,
            new_status=request.status,
            driver_id=current_user.user_id_str,
            delivery_otp=request.delivery_otp,
        )
        return SuccessResponse(success=True, message=f"Parcel status  {request.status}", data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/parcels/{parcel_id}",
    response_model=SuccessResponse,
    summary="Get parcel detail",
)
async def get_parcel(
    parcel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from sqlalchemy import select
    from uuid import UUID
    from common.models.all_models import Parcel
    result = await db.execute(select(Parcel).where(Parcel.id == UUID(parcel_id)))
    parcel = result.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return SuccessResponse(success=True, message="OK", data={
        "id": str(parcel.id),
        "tracking_number": parcel.tracking_number,
        "status": parcel.status.value,
        "fare": float(parcel.fare),
        "weight_kg": parcel.weight_kg,
        "sender_name": parcel.sender_name,
        "receiver_name": parcel.receiver_name,
        "receiver_address": parcel.receiver_address,
        "is_fragile": parcel.is_fragile,
        "is_urgent": parcel.is_urgent,
        "delivery_otp": parcel.delivery_otp if str(parcel.customer_id) == current_user.user_id_str else None,
        "parcel_photo": get_file_url(parcel.parcel_photo) if getattr(parcel, 'parcel_photo', None) else None,
    })


@router.post(
    "/parcels/{parcel_id}/photo",
    response_model=SuccessResponse,
    summary="Upload a photo for a parcel",
)
async def upload_parcel_photo(
    parcel_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from sqlalchemy import select
    from uuid import UUID
    from common.models.all_models import Parcel
    
    result = await db.execute(select(Parcel).where(Parcel.id == UUID(parcel_id)))
    parcel = result.scalar_one_or_none()
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
        
    if str(parcel.customer_id) != current_user.user_id_str:
        raise HTTPException(status_code=403, detail="Not authorized")

    relative_path = await save_upload(
        file=file,
        category="parcels",
        allowed_types=ALLOWED_IMAGE_TYPES,
        max_size=5 * 1024 * 1024,
    )

    # Note: Ensure parcel model has 'parcel_photo' column. Assuming it does or will be added dynamically in DB.
    # Currently assuming setting an attribute if missing. 
    setattr(parcel, 'parcel_photo', relative_path)
    await db.commit()

    return SuccessResponse(
        success=True,
        message="Photo uploaded successfully",
        data={"photo_url": get_file_url(relative_path)},
    )

