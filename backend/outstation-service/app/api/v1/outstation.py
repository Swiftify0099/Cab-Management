"""Feature 20 — Outstation / Intercity API Router"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import async_session_maker
from common.middleware.auth import get_current_user, AuthenticatedUser

router = APIRouter()


async def get_db():
    async with async_session_maker() as session:
        yield session


def _outstation_service(db: AsyncSession = Depends(get_db)):
    from app.services.outstation_service import OutstationService
    return OutstationService(db)


# ── Schemas ───────────────────────────────────────────────────────────────────

class LegInput(BaseModel):
    from_address: str
    from_lat: float
    from_lng: float
    to_address: str
    to_lat: float
    to_lng: float


class EstimateRequest(BaseModel):
    journey_type: str = "ONE_WAY"
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    vehicle_category: str = "SEDAN"
    scheduled_departure: str
    return_date: Optional[str] = None
    additional_legs: Optional[List[LegInput]] = None
    promo_code: Optional[str] = None
    passenger_count: int = 1


class BookingRequest(BaseModel):
    journey_type: str = "ONE_WAY"
    vehicle_category: str = "SEDAN"
    passenger_count: int = 1
    luggage_count: int = 0
    origin_address: str
    origin_lat: float
    origin_lng: float
    destination_address: str
    destination_lat: float
    destination_lng: float
    scheduled_departure: str
    return_date: Optional[str] = None
    additional_legs: Optional[List[LegInput]] = None
    promo_code: Optional[str] = None
    payment_method: str = "WALLET"
    special_instructions: Optional[str] = None
    company_id: Optional[str] = None
    membership_id: Optional[str] = None
    department_id: Optional[str] = None
    is_business_trip: bool = False
    business_purpose: Optional[str] = None


class LegStatusRequest(BaseModel):
    new_status: str
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None


class ChargeRequest(BaseModel):
    charge_type: str  # toll, state_tax, parking, extra_km
    amount: float
    description: Optional[str] = None
    evidence_url: Optional[str] = None
    state_name: Optional[str] = None


class CompleteRequest(BaseModel):
    driver_id: str
    final_km: float


class CancelRequest(BaseModel):
    reason: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/estimate")
async def estimate_outstation(
    req: EstimateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_outstation_service),
):
    """
    Calculate outstation fare estimate (One-Way / Round-Trip / Multi-City).
    Includes toll, state tax, night halt, driver allowance — all backend-computed.
    """
    try:
        legs = [l.model_dump() for l in req.additional_legs] if req.additional_legs else None
        est = await svc.estimate_outstation(
            req.journey_type, req.origin_lat, req.origin_lng,
            req.destination_lat, req.destination_lng,
            req.vehicle_category, req.scheduled_departure,
            req.return_date, legs, req.promo_code, req.passenger_count
        )
        return {"data": est}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/book")
async def create_outstation_booking(
    req: BookingRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_outstation_service),
):
    """Create confirmed outstation booking. Driver commits to full journey (all legs)."""
    try:
        legs = [l.model_dump() for l in req.additional_legs] if req.additional_legs else None
        result = await svc.create_outstation_booking(
            customer_id=str(current_user.id),
            journey_type=req.journey_type,
            vehicle_category=req.vehicle_category,
            passenger_count=req.passenger_count,
            origin_address=req.origin_address,
            origin_lat=req.origin_lat,
            origin_lng=req.origin_lng,
            destination_address=req.destination_address,
            destination_lat=req.destination_lat,
            destination_lng=req.destination_lng,
            scheduled_departure=req.scheduled_departure,
            return_date=req.return_date,
            additional_legs=legs,
            luggage_count=req.luggage_count,
            promo_code=req.promo_code,
            payment_method=req.payment_method,
            special_instructions=req.special_instructions,
            company_id=req.company_id,
            membership_id=req.membership_id,
            department_id=req.department_id,
            is_business_trip=req.is_business_trip,
            business_purpose=req.business_purpose,
        )
        return {"data": result, "message": "Outstation booking confirmed"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/booking/{booking_id}")
async def get_outstation_booking(
    booking_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_outstation_service),
):
    """Get full outstation booking with legs, charges, driver info."""
    try:
        return {"data": await svc.get_booking(booking_id)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/booking/{booking_id}/leg/{leg_id}/status")
async def update_leg_status(
    booking_id: str,
    leg_id: str,
    req: LegStatusRequest,
    svc=Depends(_outstation_service),
):
    """Update outstation journey leg status (scheduled → in_progress → completed)."""
    try:
        result = await svc.update_leg_status(booking_id, leg_id, req.new_status, req.current_lat, req.current_lng)
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/booking/{booking_id}/charge")
async def add_outstation_charge(
    booking_id: str,
    req: ChargeRequest,
    svc=Depends(_outstation_service),
):
    """
    Submit platform-verified charge (toll, parking, state tax).
    Customer must approve before it is added to final fare.
    Driver cannot self-report arbitrary amounts.
    """
    try:
        result = await svc.add_outstation_charge(
            booking_id, req.charge_type, req.amount,
            req.description, req.evidence_url, req.state_name
        )
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/booking/{booking_id}/complete")
async def complete_outstation(
    booking_id: str,
    req: CompleteRequest,
    svc=Depends(_outstation_service),
):
    """
    Complete outstation booking.
    Backend calculates final fare including all approved charges and extra KM.
    Driver earnings include base + allowances.
    """
    try:
        result = await svc.complete_outstation(booking_id, req.driver_id, req.final_km)
        return {"data": result, "message": "Outstation trip completed and settled"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/booking/{booking_id}/cancel")
async def cancel_outstation(
    booking_id: str,
    req: CancelRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_outstation_service),
):
    """Cancel outstation booking with wallet refund (if not yet in-progress)."""
    try:
        result = await svc.cancel_outstation(booking_id, req.reason)
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
