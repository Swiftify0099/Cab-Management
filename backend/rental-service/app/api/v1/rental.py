"""Feature 19 — Rental / Hourly API Router"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import async_session_maker
from common.middleware.auth import get_current_user, AuthenticatedUser

router = APIRouter()


async def get_db():
    async with async_session_maker() as session:
        yield session


def _rental_service(db: AsyncSession = Depends(get_db)):
    from app.services.rental_service import RentalService
    return RentalService(db)


# ── Request / Response Schemas ────────────────────────────────────────────────

class EstimateRequest(BaseModel):
    plan_id: str
    vehicle_category: str = "SEDAN"
    custom_duration_minutes: Optional[int] = None
    promo_code: Optional[str] = None


class BookingRequest(BaseModel):
    plan_id: str
    vehicle_category: str = "SEDAN"
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    custom_duration_minutes: Optional[int] = None
    promo_code: Optional[str] = None
    payment_method: str = "WALLET"
    company_id: Optional[str] = None
    membership_id: Optional[str] = None
    department_id: Optional[str] = None
    is_business_trip: bool = False
    business_purpose: Optional[str] = None


class DriverArrivedRequest(BaseModel):
    driver_id: str


class StartRequest(BaseModel):
    driver_id: str
    otp: Optional[str] = None


class ExtendRentalRequest(BaseModel):
    additional_minutes: int
    additional_km: Optional[float] = None


class KMUpdateRequest(BaseModel):
    current_lat: float
    current_lng: float
    current_km: float


class AddStopRequest(BaseModel):
    address: str
    latitude: float
    longitude: float


class CompleteRequest(BaseModel):
    driver_id: str
    final_km: float
    toll_charge: float = 0.0
    parking_charge: float = 0.0


class CancelRequest(BaseModel):
    reason: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/plans")
async def list_rental_plans(
    vehicle_category: Optional[str] = Query(None, description="Filter by vehicle category"),
    svc=Depends(_rental_service),
):
    """List backend-configured rental plans. Prices come from server — never hardcode in frontend."""
    plans = await svc.list_rental_plans(vehicle_category)
    return {"plans": plans, "total": len(plans)}


@router.post("/estimate")
async def estimate_rental(
    req: EstimateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_rental_service),
):
    """Calculate rental fare estimate with itemized breakdown."""
    try:
        estimate = await svc.estimate_rental(
            req.plan_id, req.vehicle_category, req.custom_duration_minutes, req.promo_code
        )
        return {"data": estimate}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/book")
async def create_rental_booking(
    req: BookingRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_rental_service),
):
    """Create confirmed rental booking with driver assignment and wallet hold."""
    try:
        result = await svc.create_rental_booking(
            customer_id=str(current_user.id),
            plan_id=req.plan_id,
            vehicle_category=req.vehicle_category,
            pickup_address=req.pickup_address,
            pickup_lat=req.pickup_lat,
            pickup_lng=req.pickup_lng,
            custom_duration_minutes=req.custom_duration_minutes,
            promo_code=req.promo_code,
            payment_method=req.payment_method,
            company_id=req.company_id,
            membership_id=req.membership_id,
            department_id=req.department_id,
            is_business_trip=req.is_business_trip,
            business_purpose=req.business_purpose,
        )
        return {"data": result, "message": "Rental booking confirmed"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/booking/{booking_id}")
async def get_rental_booking(
    booking_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_rental_service),
):
    """Get full rental booking with live timer state."""
    try:
        return {"data": await svc.get_booking(booking_id)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/active")
async def get_active_rental(
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_rental_service),
):
    """Get currently active rental for the authenticated customer."""
    result = await svc.get_active_rental(str(current_user.id))
    return {"data": result, "has_active": result is not None}


@router.post("/booking/{booking_id}/driver-arrived")
async def driver_arrived_at_pickup(
    booking_id: str,
    req: DriverArrivedRequest,
    svc=Depends(_rental_service),
):
    """Driver marks arrival at customer pickup point."""
    try:
        result = await svc.driver_arrive_at_pickup(booking_id, req.driver_id)
        return {"data": result, "message": "Driver arrived at pickup point"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/booking/{booking_id}/start")
async def start_rental(
    booking_id: str,
    req: StartRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_rental_service),
):
    """
    Backend records authoritative start time. Phone clock NOT trusted.
    Returns actual_start_time that frontend uses to render elapsed timer.
    """
    try:
        result = await svc.start_rental(booking_id, req.driver_id, req.otp)
        return {"data": result, "message": "Rental started — timer running"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/booking/{booking_id}/extend")
async def extend_rental_package(
    booking_id: str,
    req: ExtendRentalRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_rental_service),
):
    """Extend active rental duration and included KM."""
    try:
        result = await svc.extend_rental(booking_id, req.additional_minutes, req.additional_km)
        return {"data": result, "message": f"Rental extended by {req.additional_minutes} minutes"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/booking/{booking_id}/km-update")
async def update_km(
    booking_id: str,
    req: KMUpdateRequest,
    svc=Depends(_rental_service),
):
    """Backend receives GPS-derived cumulative KM from driver. Frontend gets live meter."""
    result = await svc.update_km(booking_id, req.current_lat, req.current_lng, req.current_km)
    return {"data": result}


@router.post("/booking/{booking_id}/add-stop")
async def add_stop(
    booking_id: str,
    req: AddStopRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_rental_service),
):
    """Customer adds a stop during active rental. Driver notified via Socket.IO."""
    try:
        result = await svc.add_stop(booking_id, req.address, req.latitude, req.longitude)
        return {"data": result, "message": "Stop added — driver notified"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/booking/{booking_id}/complete")
async def complete_rental(
    booking_id: str,
    req: CompleteRequest,
    svc=Depends(_rental_service),
):
    """
    Driver completes rental. Backend calculates authoritative final fare.
    Extra KM + Extra Hour + Tolls + Parking - Discount + GST.
    Customer wallet settled with delta (refund if overcharged, debit if undercharged).
    """
    try:
        result = await svc.complete_rental(
            booking_id, req.driver_id, req.final_km, req.toll_charge, req.parking_charge
        )
        return {"data": result, "message": "Rental completed and settled"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/booking/{booking_id}/cancel")
async def cancel_rental(
    booking_id: str,
    req: CancelRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_rental_service),
):
    """Cancel rental booking with full wallet refund (if pre-start)."""
    try:
        result = await svc.cancel_rental(booking_id, req.reason)
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
