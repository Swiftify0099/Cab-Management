"""
===============================================================================
TRANSPORT REST API ROUTER — FEATURE 17
===============================================================================
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.auth import get_current_user_optional, get_current_user
from app.services.transport_service import TransportService

router = APIRouter(prefix="", tags=["Transport & Commercial Logistics"])


# ── Pydantic Request Schemas ──────────────────────────────────────────────────

class TransportEstimateRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    goods_category: str = "GENERAL"
    goods_description: str = "Commercial goods and cargo"
    weight_kg: float = 250.0
    length_ft: float = 0.0
    width_ft: float = 0.0
    height_ft: float = 0.0
    package_count: int = 1
    loading_required: bool = True
    unloading_required: bool = True
    helpers_count: int = 0
    vehicle_category: str = "TATA_ACE"
    declared_value: Optional[float] = None
    promo_code: Optional[str] = None


class CreateTransportOrderRequest(BaseModel):
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    pickup_contact_name: str
    pickup_contact_phone: str
    drop_address: str
    drop_lat: float
    drop_lng: float
    drop_contact_name: str
    drop_contact_phone: str
    goods_category: str = "GENERAL"
    goods_description: str = "Commercial Goods"
    weight_kg: float
    length_ft: float = 0.0
    width_ft: float = 0.0
    height_ft: float = 0.0
    package_count: int = 1
    loading_required: bool = True
    unloading_required: bool = True
    helpers_count: int = 0
    vehicle_category_required: str = "TATA_ACE"
    pricing_mode: str = "INSTANT_PRICE"  # INSTANT_PRICE | REQUEST_QUOTES
    schedule_type: str = "IMMEDIATE"
    scheduled_pickup_time: Optional[datetime] = None
    pickup_notes: Optional[str] = None
    drop_notes: Optional[str] = None
    special_instructions: Optional[str] = None
    declared_value: Optional[float] = None
    fragile_handling: bool = False
    payment_method: str = "WALLET"
    promo_code: Optional[str] = None


class SubmitQuoteRequest(BaseModel):
    driver_id: str
    vehicle_id: str
    amount: float
    included_helpers: int = 0
    estimated_pickup_eta_min: int = 15
    estimated_transit_duration_min: int = 60


class CounterOfferRequest(BaseModel):
    actor_type: str = "CUSTOMER"  # CUSTOMER | TRANSPORTER
    counter_amount: float
    note: Optional[str] = None


class SelectQuoteRequest(BaseModel):
    quote_id: str
    payment_method: str = "WALLET"


class UpdateTransportStatusRequest(BaseModel):
    driver_user_id: Optional[str] = None
    next_status: str
    notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class VerifyPODRequest(BaseModel):
    driver_id: str
    receiver_name: str
    receiver_phone: str
    delivery_otp: str
    photo_url: Optional[str] = None
    signature_url: Optional[str] = None
    delivery_notes: Optional[str] = None
    latitude: float = 18.5204
    longitude: float = 73.8567


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/estimate", summary="Calculate authoritative transport estimate")
async def calculate_estimate(
    req: TransportEstimateRequest,
    db: AsyncSession = Depends(get_db),
):
    service = TransportService(db)
    return await service.calculate_estimate(
        pickup_lat=req.pickup_lat,
        pickup_lng=req.pickup_lng,
        drop_lat=req.drop_lat,
        drop_lng=req.drop_lng,
        goods_category=req.goods_category,
        goods_description=req.goods_description,
        weight_kg=req.weight_kg,
        length_ft=req.length_ft,
        width_ft=req.width_ft,
        height_ft=req.height_ft,
        package_count=req.package_count,
        loading_required=req.loading_required,
        unloading_required=req.unloading_required,
        helpers_count=req.helpers_count,
        vehicle_category=req.vehicle_category,
        declared_value=req.declared_value,
        promo_code=req.promo_code,
    )


@router.post("/orders", summary="Create commercial goods transport order")
async def create_transport_order(
    req: CreateTransportOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user.get("id") if current_user else "00000000-0000-0000-0000-000000000001"
    service = TransportService(db)
    return await service.create_transport_order(
        customer_user_id=str(user_id),
        pickup_address=req.pickup_address,
        pickup_lat=req.pickup_lat,
        pickup_lng=req.pickup_lng,
        pickup_contact_name=req.pickup_contact_name,
        pickup_contact_phone=req.pickup_contact_phone,
        drop_address=req.drop_address,
        drop_lat=req.drop_lat,
        drop_lng=req.drop_lng,
        drop_contact_name=req.drop_contact_name,
        drop_contact_phone=req.drop_contact_phone,
        goods_category=req.goods_category,
        goods_description=req.goods_description,
        weight_kg=req.weight_kg,
        length_ft=req.length_ft,
        width_ft=req.width_ft,
        height_ft=req.height_ft,
        package_count=req.package_count,
        loading_required=req.loading_required,
        unloading_required=req.unloading_required,
        helpers_count=req.helpers_count,
        vehicle_category_required=req.vehicle_category_required,
        pricing_mode=req.pricing_mode,
        schedule_type=req.schedule_type,
        scheduled_pickup_time=req.scheduled_pickup_time,
        pickup_notes=req.pickup_notes,
        drop_notes=req.drop_notes,
        special_instructions=req.special_instructions,
        declared_value=req.declared_value,
        fragile_handling=req.fragile_handling,
        payment_method=req.payment_method,
        promo_code=req.promo_code,
    )


@router.get("/orders/{order_id}", summary="Get transport order details & tracking")
async def get_transport_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = TransportService(db)
    return await service.get_order_details(order_id)


@router.get("/my-orders", summary="Get customer transport order history")
async def get_my_transport_orders(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user.get("id") if current_user else "00000000-0000-0000-0000-000000000001"
    service = TransportService(db)
    return await service.get_customer_orders(str(user_id))


@router.post("/orders/{order_id}/quote", summary="Transporter submits commercial quote")
async def submit_quote(
    order_id: str,
    req: SubmitQuoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user.get("id") if current_user else "00000000-0000-0000-0000-000000000002"
    service = TransportService(db)
    return await service.submit_transporter_quote(
        order_id=order_id,
        transporter_user_id=str(user_id),
        driver_id=req.driver_id,
        vehicle_id=req.vehicle_id,
        amount=req.amount,
        included_helpers=req.included_helpers,
        estimated_pickup_eta_min=req.estimated_pickup_eta_min,
        estimated_transit_duration_min=req.estimated_transit_duration_min,
    )


@router.get("/orders/{order_id}/quotes", summary="Get submitted quotes list for order")
async def get_order_quotes(
    order_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = TransportService(db)
    return await service.get_order_quotes(order_id)


@router.post("/quotes/{quote_id}/counter", summary="Send negotiation counter-offer")
async def send_counter_offer(
    quote_id: str,
    req: CounterOfferRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user.get("id") if current_user else "00000000-0000-0000-0000-000000000001"
    service = TransportService(db)
    return await service.send_counter_offer(
        quote_id=quote_id,
        actor_user_id=str(user_id),
        actor_type=req.actor_type,
        counter_amount=req.counter_amount,
        note=req.note,
    )


@router.post("/orders/{order_id}/select-quote", summary="Customer selects and locks winning quote")
async def select_quote(
    order_id: str,
    req: SelectQuoteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user.get("id") if current_user else "00000000-0000-0000-0000-000000000001"
    service = TransportService(db)
    return await service.select_quote(
        order_id=order_id,
        quote_id=req.quote_id,
        customer_user_id=str(user_id),
        payment_method=req.payment_method,
    )


@router.post("/orders/{order_id}/status", summary="Driver updates transport operational state")
async def update_transport_status(
    order_id: str,
    req: UpdateTransportStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    user_id = current_user.get("id") if current_user else req.driver_user_id
    service = TransportService(db)
    return await service.update_transport_status(
        order_id=order_id,
        driver_user_id=str(user_id or "00000000-0000-0000-0000-000000000002"),
        next_status=req.next_status,
        notes=req.notes,
        latitude=req.latitude,
        longitude=req.longitude,
    )


@router.post("/orders/{order_id}/verify-pod", summary="Verify OTP, record POD & settle driver earnings")
async def verify_pod(
    order_id: str,
    req: VerifyPODRequest,
    db: AsyncSession = Depends(get_db),
):
    service = TransportService(db)
    return await service.verify_pod_and_complete(
        order_id=order_id,
        driver_id=req.driver_id,
        receiver_name=req.receiver_name,
        receiver_phone=req.receiver_phone,
        delivery_otp=req.delivery_otp,
        photo_url=req.photo_url,
        signature_url=req.signature_url,
        delivery_notes=req.delivery_notes,
        latitude=req.latitude,
        longitude=req.longitude,
    )
