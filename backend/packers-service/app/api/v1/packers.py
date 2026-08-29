"""
Feature 24: Packers & Movers FastAPI Router.
Exposes endpoints for shifting cost estimates, order creation with inventory,
mover quotations, milestone transitions, POD completion, and cancellations.
"""
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import async_session_maker
from common.middleware.auth import get_current_user, AuthenticatedUser
from app.services.packers_service import PackersService

router = APIRouter(prefix="", tags=["Packers & Movers Logistics"])


async def get_db():
    async with async_session_maker() as session:
        yield session


class EstimateMoveRequest(BaseModel):
    move_size: str = "1_BHK"
    distance_km: float = 15.0
    pickup_floor: int = 0
    pickup_has_lift: bool = True
    drop_floor: int = 0
    drop_has_lift: bool = True
    requires_assembly: bool = True
    requires_fragile_packing: bool = True
    insurance_opted: bool = False
    declared_value: float = 0.0


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
    distance_km: float = 15.0
    pickup_floor: int = 0
    pickup_has_lift: bool = True
    drop_floor: int = 0
    drop_has_lift: bool = True
    requires_assembly: bool = True
    requires_fragile_packing: bool = True
    insurance_opted: bool = False
    declared_value: float = 0.0
    items: Optional[List[Dict[str, Any]]] = None
    payment_method: str = "WALLET"


class SubmitQuoteRequest(BaseModel):
    mover_id: str
    quoted_fare: float
    crew_size: int = 3
    truck_type: str = "14ft Eicher Closed Container"
    estimated_hours: float = 4.0
    notes: Optional[str] = None


class MilestonePayload(BaseModel):
    new_status: str


class PODPayload(BaseModel):
    delivery_otp: str
    signature_url: Optional[str] = None
    damage_reported: bool = False
    damage_description: Optional[str] = None


class CancelOrderPayload(BaseModel):
    reason: Optional[str] = None


@router.post("/estimate")
async def estimate_moving_cost(payload: EstimateMoveRequest, db: AsyncSession = Depends(get_db)):
    svc = PackersService(db)
    return await svc.estimate_move(**payload.dict())


@router.post("/orders")
async def create_moving_order(
    payload: CreateMovingOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    svc = PackersService(db)
    c_id = current_user.user_id_str
    data = payload.dict()
    data["customer_id"] = c_id
    return await svc.create_moving_order(**data)


@router.get("/orders/{order_id}")
async def get_moving_order_details(order_id: str, db: AsyncSession = Depends(get_db)):
    svc = PackersService(db)
    return await svc.get_order_details(order_id)


@router.get("/my-orders")
async def get_my_moving_orders(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    svc = PackersService(db)
    orders = await svc.get_customer_orders(current_user.user_id_str)
    return {"status": "success", "data": orders}


@router.post("/orders/{order_id}/quotes")
async def submit_mover_quote(order_id: str, payload: SubmitQuoteRequest, db: AsyncSession = Depends(get_db)):
    svc = PackersService(db)
    return await svc.submit_mover_quote(order_id=order_id, **payload.dict())


@router.post("/orders/{order_id}/quotes/{quote_id}/accept")
async def accept_mover_quote(order_id: str, quote_id: str, db: AsyncSession = Depends(get_db)):
    svc = PackersService(db)
    return await svc.accept_mover_quote(order_id=order_id, quote_id=quote_id)


@router.post("/orders/{order_id}/milestone")
async def advance_moving_milestone(order_id: str, payload: MilestonePayload, db: AsyncSession = Depends(get_db)):
    svc = PackersService(db)
    return await svc.advance_milestone(order_id=order_id, new_status=payload.new_status)


@router.post("/orders/{order_id}/complete")
async def complete_moving_order(order_id: str, payload: PODPayload, db: AsyncSession = Depends(get_db)):
    svc = PackersService(db)
    return await svc.complete_move_with_pod(
        order_id=order_id,
        entered_otp=payload.delivery_otp,
        signature_url=payload.signature_url,
        damage_reported=payload.damage_reported,
        damage_description=payload.damage_description,
    )


@router.post("/orders/{order_id}/cancel")
async def cancel_moving_order(order_id: str, payload: CancelOrderPayload, db: AsyncSession = Depends(get_db)):
    svc = PackersService(db)
    return await svc.cancel_moving_order(order_id=order_id, reason=payload.reason)
