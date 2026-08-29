"""
===============================================================================
PACKERS & MOVERS REST API ROUTER — PHASE 21
===============================================================================
"""
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser
from app.services.packers_service import PackersService

router = APIRouter(prefix="", tags=["Packers & Movers Logistics"])


# ── Pydantic Request Schemas ──────────────────────────────────────────────────

class EstimateMoveRequest(BaseModel):
    move_size: str = "1_BHK"
    distance_km: float = 15.0
    property_type: str = "APARTMENT"
    rooms_count: Optional[int] = None
    large_items_count: int = 0
    box_count: int = 10
    pickup_floor: int = 0
    pickup_has_lift: bool = True
    pickup_service_lift_available: bool = False
    drop_floor: int = 0
    drop_has_lift: bool = True
    drop_service_lift_available: bool = False
    packing_type: str = "STANDARD"
    helpers_count: Optional[int] = None
    requires_assembly: bool = True
    requires_disassembly: bool = True
    requires_fragile_packing: bool = True
    insurance_opted: bool = False
    declared_value: float = 0.0
    promo_code: Optional[str] = None


class CreateMovingOrderRequest(BaseModel):
    customer_id: Optional[str] = None
    move_size: str = "1_BHK"
    scheduled_move_date: str
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    drop_address: str
    drop_lat: float
    drop_lng: float
    property_type: str = "APARTMENT"
    rooms_count: Optional[int] = None
    large_items_count: int = 0
    box_count: int = 10
    distance_km: float = 15.0
    pickup_floor: int = 0
    pickup_has_lift: bool = True
    pickup_service_lift_available: bool = False
    drop_floor: int = 0
    drop_has_lift: bool = True
    drop_service_lift_available: bool = False
    packing_type: str = "STANDARD"
    helpers_count: Optional[int] = None
    requires_assembly: bool = True
    requires_disassembly: bool = True
    requires_fragile_packing: bool = True
    insurance_opted: bool = False
    declared_value: float = 0.0
    items: Optional[List[Dict[str, Any]]] = None
    payment_method: str = "WALLET"
    promo_code: Optional[str] = None


class SubmitQuoteRequest(BaseModel):
    mover_id: str
    quoted_fare: float
    base_shifting_rate: Optional[float] = None
    crew_charge: Optional[float] = None
    packing_materials_charge: Optional[float] = None
    vehicle_charge: Optional[float] = None
    toll_and_taxes: Optional[float] = None
    crew_size: int = 3
    truck_type: str = "14ft Eicher Closed Container"
    vehicle_id: Optional[str] = None
    estimated_hours: float = 4.0
    notes: Optional[str] = None


class AcceptQuoteRequest(BaseModel):
    vehicle_id: Optional[str] = None


class AssignCrewRequest(BaseModel):
    mover_id: str
    members: List[Dict[str, Any]]


class PreInspectionRequest(BaseModel):
    inspector_driver_id: str
    photos: List[Dict[str, Any]]
    notes: Optional[str] = None
    customer_signature_url: Optional[str] = None


class PostInspectionRequest(BaseModel):
    inspector_driver_id: str
    photos: List[Dict[str, Any]]
    damage_reported: bool = False
    damage_description: Optional[str] = None
    damage_photos: Optional[List[Dict[str, Any]]] = None
    claimed_amount: float = 0.0
    agreed_deduction: float = 0.0
    customer_signature_url: Optional[str] = None
    mover_signature_url: Optional[str] = None


class VerifyPickupOTPRequest(BaseModel):
    pickup_otp: str


class MilestonePayload(BaseModel):
    new_status: str


class PODPayload(BaseModel):
    delivery_otp: str
    signature_url: Optional[str] = None
    damage_reported: bool = False
    damage_description: Optional[str] = None
    damage_photos: Optional[List[Dict[str, Any]]] = None
    claimed_amount: float = 0.0
    agreed_deduction: float = 0.0
    mover_signature_url: Optional[str] = None


class CancelOrderPayload(BaseModel):
    reason: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/estimate", summary="Calculate authoritative moving estimate")
async def estimate_moving_cost(
    payload: EstimateMoveRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.estimate_move(**payload.model_dump())


@router.post("/orders", summary="Create moving order with room inventory & OTPs")
async def create_moving_order(
    payload: CreateMovingOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    svc = PackersService(db)
    data = payload.model_dump()
    data["customer_id"] = current_user.user_id_str
    return await svc.create_moving_order(**data)


@router.get("/orders/{order_id}", summary="Get moving order details, inventory & quotes")
async def get_moving_order_details(
    order_id: str,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.get_order_details(order_id)


@router.get("/my-orders", summary="Get customer moving order history")
async def get_my_moving_orders(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    svc = PackersService(db)
    orders = await svc.get_customer_orders(current_user.user_id_str)
    return {"status": "success", "data": orders}


@router.get("/open-requests", summary="Open relocation marketplace for mover bidding")
async def get_open_requests(
    db: AsyncSession = Depends(get_db),
    pickup_lat: Optional[float] = Query(None),
    pickup_lng: Optional[float] = Query(None),
):
    svc = PackersService(db)
    return await svc.get_open_moving_requests(pickup_lat=pickup_lat, pickup_lng=pickup_lng)


@router.post("/orders/{order_id}/quotes", summary="Mover submits itemized quotation")
async def submit_mover_quote(
    order_id: str,
    payload: SubmitQuoteRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.submit_mover_quote(order_id=order_id, **payload.model_dump())


@router.post("/orders/{order_id}/quotes/{quote_id}/accept", summary="Customer confirms and locks winning quotation")
async def accept_mover_quote(
    order_id: str,
    quote_id: str,
    payload: Optional[AcceptQuoteRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    v_id = payload.vehicle_id if payload else None
    return await svc.accept_mover_quote(order_id=order_id, quote_id=quote_id, vehicle_id=v_id)


@router.post("/orders/{order_id}/crew", summary="Assign team crew members to moving order")
async def assign_crew(
    order_id: str,
    payload: AssignCrewRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.assign_crew_members(order_id=order_id, mover_id=payload.mover_id, members=payload.members)


@router.post("/orders/{order_id}/crew/{member_id}/check-in", summary="Check in individual crew worker on site")
async def check_in_crew(
    order_id: str,
    member_id: str,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.check_in_crew_member(order_id=order_id, member_id=member_id)


@router.post("/orders/{order_id}/pre-inspection", summary="Record pre-move Cloudinary walkthrough photos & notes")
async def record_pre_inspection(
    order_id: str,
    payload: PreInspectionRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.record_pre_inspection(
        order_id=order_id,
        inspector_driver_id=payload.inspector_driver_id,
        photos=payload.photos,
        notes=payload.notes,
        customer_signature_url=payload.customer_signature_url,
    )


@router.post("/orders/{order_id}/milestone", summary="Advance operational milestone")
async def advance_moving_milestone(
    order_id: str,
    payload: MilestonePayload,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.advance_milestone(order_id=order_id, new_status=payload.new_status)


@router.post("/orders/{order_id}/verify-pickup-otp", summary="Verify pickup OTP on packing & loading completion")
async def verify_pickup_otp(
    order_id: str,
    payload: VerifyPickupOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.verify_pickup_otp(order_id=order_id, pickup_otp=payload.pickup_otp)


@router.post("/orders/{order_id}/post-inspection", summary="Record post-move inspection & damage signoff")
async def record_post_inspection(
    order_id: str,
    payload: PostInspectionRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.record_post_inspection_and_damage_signoff(
        order_id=order_id,
        inspector_driver_id=payload.inspector_driver_id,
        photos=payload.photos,
        damage_reported=payload.damage_reported,
        damage_description=payload.damage_description,
        damage_photos=payload.damage_photos,
        claimed_amount=payload.claimed_amount,
        agreed_deduction=payload.agreed_deduction,
        customer_signature_url=payload.customer_signature_url,
        mover_signature_url=payload.mover_signature_url,
    )


@router.post("/orders/{order_id}/complete", summary="Verify Delivery OTP, POD signoff & settle mover earnings")
async def complete_moving_order(
    order_id: str,
    payload: PODPayload,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.complete_move_with_pod(
        order_id=order_id,
        delivery_otp=payload.delivery_otp,
        signature_url=payload.signature_url,
        damage_reported=payload.damage_reported,
        damage_description=payload.damage_description,
        damage_photos=payload.damage_photos,
        claimed_amount=payload.claimed_amount,
        agreed_deduction=payload.agreed_deduction,
        mover_signature_url=payload.mover_signature_url,
    )


@router.post("/orders/{order_id}/cancel", summary="Cancel moving order & refund wallet deposit")
async def cancel_moving_order(
    order_id: str,
    payload: CancelOrderPayload,
    db: AsyncSession = Depends(get_db),
):
    svc = PackersService(db)
    return await svc.cancel_moving_order(order_id=order_id, reason=payload.reason)
