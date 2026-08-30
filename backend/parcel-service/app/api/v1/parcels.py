"""
Parcel Logistics API — Feature 15.
Endpoints for:
- Quote estimation
- Parcel order creation
- Customer tracking & history
- Driver delivery request acceptance
- Pickup OTP handover & verification
- Delivery OTP verification & Proof of Delivery (POD)
- Cancellation
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, Field
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, get_current_active_driver, AuthenticatedUser
from common.models.all_models import ParcelCategory
from common.schemas.base import SuccessResponse
from app.services.parcel_service import ParcelService

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────

class ParcelQuoteRequest(BaseModel):
    sender_lat: float
    sender_lng: float
    receiver_lat: float
    receiver_lng: float
    weight_kg: float = Field(..., gt=0, le=3000)
    length_cm: Optional[float] = None
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None
    package_count: int = Field(default=1, ge=1, le=50)
    vehicle_category: str = "BIKE"
    delivery_priority: str = "STANDARD"
    is_fragile: bool = False
    is_valuable: bool = False
    declared_value: Optional[float] = None
    insurance_opt_in: bool = False
    promo_code: Optional[str] = None


class CreateParcelOrderRequest(BaseModel):
    sender_name: str
    sender_phone: str
    sender_address: str
    sender_lat: float
    sender_lng: float
    pickup_instructions: Optional[str] = None

    receiver_name: str
    receiver_phone: str
    receiver_address: str
    receiver_lat: float
    receiver_lng: float
    delivery_instructions: Optional[str] = None

    parcel_category: ParcelCategory = ParcelCategory.GENERAL_BOX

    description: Optional[str] = None
    package_count: int = Field(default=1, ge=1, le=50)
    weight_kg: float = Field(..., gt=0, le=3000)
    length_cm: Optional[float] = None
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None

    is_fragile: bool = False
    is_valuable: bool = False
    declared_value: Optional[float] = None
    insurance_opt_in: bool = False

    vehicle_category: str = "BIKE"
    delivery_priority: str = "STANDARD"
    payment_method: str = "WALLET"
    promo_code: Optional[str] = None


class PickupVerifyRequest(BaseModel):
    pickup_otp: str
    photo_url: Optional[str] = None
    notes: Optional[str] = None


class DeliveryVerifyRequest(BaseModel):
    delivery_otp: str
    receiver_name: Optional[str] = None
    signature_url: Optional[str] = None
    delivery_photo_url: Optional[str] = None
    delivered_lat: Optional[float] = None
    delivered_lng: Optional[float] = None


class ArriveLocationRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None


class RateParcelRequest(BaseModel):
    score: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None
    tags: Optional[List[str]] = None


class CancelParcelRequest(BaseModel):
    reason: Optional[str] = None


# ── Routes ───────────────────────────────────────────────────────────

@router.post(
    "/quote",
    response_model=SuccessResponse,
    summary="Calculate authoritative parcel quote breakdown",
)
async def calculate_quote(
    request: ParcelQuoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    quote = service.calculate_quote(
        sender_lat=request.sender_lat,
        sender_lng=request.sender_lng,
        receiver_lat=request.receiver_lat,
        receiver_lng=request.receiver_lng,
        weight_kg=request.weight_kg,
        length_cm=request.length_cm,
        width_cm=request.width_cm,
        height_cm=request.height_cm,
        package_count=request.package_count,
        vehicle_category=request.vehicle_category,
        delivery_priority=request.delivery_priority,
        is_fragile=request.is_fragile,
        is_valuable=request.is_valuable,
        declared_value=Decimal(str(request.declared_value)) if request.declared_value else None,
        insurance_opt_in=request.insurance_opt_in,
        promo_code=request.promo_code,
    )
    return SuccessResponse(success=True, message="Quote calculated", data=quote)


@router.post(
    "/",
    response_model=SuccessResponse,
    summary="Create a new parcel logistics order",
)
async def create_parcel(
    request: CreateParcelOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    result = await service.create_parcel(
        booking_owner_id=current_user.user_id_str,
        sender_name=request.sender_name,
        sender_phone=request.sender_phone,
        sender_address=request.sender_address,
        sender_lat=request.sender_lat,
        sender_lng=request.sender_lng,
        pickup_instructions=request.pickup_instructions,
        receiver_name=request.receiver_name,
        receiver_phone=request.receiver_phone,
        receiver_address=request.receiver_address,
        receiver_lat=request.receiver_lat,
        receiver_lng=request.receiver_lng,
        delivery_instructions=request.delivery_instructions,
        parcel_category=request.parcel_category,
        description=request.description,
        package_count=request.package_count,
        weight_kg=request.weight_kg,
        length_cm=request.length_cm,
        width_cm=request.width_cm,
        height_cm=request.height_cm,
        is_fragile=request.is_fragile,
        is_valuable=request.is_valuable,
        declared_value=request.declared_value,
        insurance_opt_in=request.insurance_opt_in,
        vehicle_category=request.vehicle_category,
        delivery_priority=request.delivery_priority,
        payment_method=request.payment_method,
        promo_code=request.promo_code,
    )
    return SuccessResponse(success=True, message="Parcel order created", data=result)


@router.get(
    "/my",
    response_model=SuccessResponse,
    summary="Get customer parcel shipments history",
)
async def get_my_parcels(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    parcels = await service.get_customer_parcels(
        customer_id=current_user.user_id_str,
        limit=limit,
        offset=offset,
    )
    return SuccessResponse(success=True, message="Parcels retrieved", data=parcels)


@router.get(
    "/driver/requests",
    response_model=SuccessResponse,
    summary="Driver: Get available parcel delivery requests",
)
@router.get("/driver-requests", response_model=SuccessResponse)
@router.get("/requests", response_model=SuccessResponse)
async def get_driver_requests(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    requests = await service.get_driver_available_requests(current_user.user_id_str)
    return SuccessResponse(success=True, message="Delivery requests retrieved", data=requests)


@router.get("/driver/my-parcels", response_model=SuccessResponse)
@router.get("/driver-my-parcels", response_model=SuccessResponse)
async def get_driver_my_parcels(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from common.models.all_models import Driver, Parcel, ParcelStatus
    from sqlalchemy import select, or_
    from uuid import UUID

    d_res = await db.execute(select(Driver).where(Driver.user_id == UUID(current_user.user_id_str)))
    driver = d_res.scalar_one_or_none()
    if not driver:
        return SuccessResponse(success=True, message="No parcels", data=[])

    p_res = await db.execute(
        select(Parcel)
        .where(
            Parcel.driver_id == driver.id,
            Parcel.status.in_([
                ParcelStatus.DRIVER_ASSIGNED,
                ParcelStatus.AT_PICKUP,
                ParcelStatus.IN_TRANSIT,
                ParcelStatus.AT_DESTINATION,
            ])
        )
    )
    parcels = p_res.scalars().all()
    data = [
        {
            "id": str(p.id),
            "tracking_number": p.tracking_number,
            "status": p.status.value,
            "sender_name": p.sender_name,
            "sender_phone": p.sender_phone,
            "sender_address": p.sender_address,
            "receiver_name": p.receiver_name,
            "receiver_phone": p.receiver_phone,
            "receiver_address": p.receiver_address,
            "weight_kg": p.weight_kg,
            "fare": float(p.fare),
            "driver_earning": float(p.driver_earning),
            "is_fragile": p.is_fragile,
            "pickup_otp": p.pickup_otp,
            "delivery_otp": p.delivery_otp,
        }
        for p in parcels
    ]
    return SuccessResponse(success=True, message="My assigned parcels", data=data)



@router.get(
    "/{parcel_id}",
    response_model=SuccessResponse,
    summary="Get parcel shipment tracking details",
)
async def get_parcel(
    parcel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    data = await service.get_parcel_details(parcel_id)
    return SuccessResponse(success=True, message="Parcel details retrieved", data=data)


@router.post(
    "/{parcel_id}/accept",
    response_model=SuccessResponse,
    summary="Driver: Accept a parcel delivery request",
)
async def accept_parcel(
    parcel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    result = await service.driver_accept_parcel(parcel_id, current_user.user_id_str)
    return SuccessResponse(success=True, message="Parcel accepted", data=result)


@router.post(
    "/{parcel_id}/arrive-pickup",
    response_model=SuccessResponse,
    summary="Driver: Mark arrival at sender pickup",
)
async def arrive_pickup(
    parcel_id: str,
    body: Optional[ArriveLocationRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    lat = body.lat if body else None
    lng = body.lng if body else None
    result = await service.driver_arrive_pickup(parcel_id, current_user.user_id_str, lat=lat, lng=lng)
    return SuccessResponse(success=True, message="Arrived at pickup", data=result)


@router.post(
    "/{parcel_id}/verify-pickup",
    response_model=SuccessResponse,
    summary="Driver: Submit Sender Pickup OTP & start transit",
)
async def verify_pickup(
    parcel_id: str,
    body: PickupVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    result = await service.verify_pickup_otp_and_handover(
        parcel_id=parcel_id,
        driver_user_id=current_user.user_id_str,
        pickup_otp=body.pickup_otp,
        photo_url=body.photo_url,
        notes=body.notes,
    )
    return SuccessResponse(success=True, message="Pickup verified. In transit.", data=result)


@router.post(
    "/{parcel_id}/arrive-drop",
    response_model=SuccessResponse,
    summary="Driver: Mark arrival at receiver drop destination",
)
async def arrive_drop(
    parcel_id: str,
    body: Optional[ArriveLocationRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    lat = body.lat if body else None
    lng = body.lng if body else None
    result = await service.driver_arrive_destination(parcel_id, current_user.user_id_str, lat=lat, lng=lng)
    return SuccessResponse(success=True, message="Arrived at destination", data=result)


@router.post(
    "/{parcel_id}/verify-delivery",
    response_model=SuccessResponse,
    summary="Driver: Submit Receiver Delivery OTP & complete POD",
)
async def verify_delivery(
    parcel_id: str,
    body: DeliveryVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    result = await service.verify_delivery_otp_and_complete(
        parcel_id=parcel_id,
        driver_user_id=current_user.user_id_str,
        delivery_otp=body.delivery_otp,
        receiver_name=body.receiver_name,
        signature_url=body.signature_url,
        delivery_photo_url=body.delivery_photo_url,
        delivered_lat=body.delivered_lat,
        delivered_lng=body.delivered_lng,
    )
    return SuccessResponse(success=True, message="Delivery verified & completed", data=result)


@router.post(
    "/{parcel_id}/rate",
    response_model=SuccessResponse,
    summary="Customer: Rate a completed parcel delivery",
)
async def rate_parcel(
    parcel_id: str,
    body: RateParcelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    result = await service.rate_parcel(
        parcel_id=parcel_id,
        customer_user_id=current_user.user_id_str,
        score=body.score,
        feedback=body.feedback,
        tags=body.tags,
    )
    return SuccessResponse(success=True, message="Parcel rated successfully", data=result)


@router.post(
    "/{parcel_id}/upload-pod",
    response_model=SuccessResponse,
    summary="Driver: Upload Proof of Delivery photo or digital signature to Cloudinary",
)
async def upload_pod_proof(
    parcel_id: str,
    file: UploadFile = File(...),
    proof_type: str = Query("delivery_photo", pattern="^(delivery_photo|signature)$"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    result = await service.upload_pod_proof(
        parcel_id=parcel_id,
        driver_user_id=current_user.user_id_str,
        file=file,
        proof_type=proof_type,
    )
    return SuccessResponse(success=True, message="Proof uploaded successfully", data=result)


@router.get(
    "/{parcel_id}/candidates",
    response_model=SuccessResponse,
    summary="Find eligible driver candidates for parcel dispatch",
)
async def get_parcel_candidates(
    parcel_id: str,
    radius_km: float = Query(15.0, ge=1.0, le=50.0),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    candidates = await service.find_eligible_drivers_for_parcel(parcel_id, radius_km=radius_km)
    return SuccessResponse(success=True, message="Candidates found", data=candidates)


@router.get(
    "/track/{tracking_number}",
    response_model=SuccessResponse,
    summary="Track parcel shipment by tracking number",
)
async def track_parcel_by_number(
    tracking_number: str,
    db: AsyncSession = Depends(get_db),
):
    service = ParcelService(db)
    data = await service.get_parcel_details(tracking_number)
    return SuccessResponse(success=True, message="Tracking details retrieved", data=data)


@router.post(
    "/{parcel_id}/cancel",
    response_model=SuccessResponse,
    summary="Cancel parcel order",
)
async def cancel_parcel(
    parcel_id: str,
    body: Optional[CancelParcelRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = ParcelService(db)
    reason = body.reason if body else None
    result = await service.cancel_parcel(
        parcel_id=parcel_id,
        user_id=current_user.user_id_str,
        user_role=current_user.role or "CUSTOMER",
        reason=reason,
    )
    return SuccessResponse(success=True, message="Parcel cancelled", data=result)
