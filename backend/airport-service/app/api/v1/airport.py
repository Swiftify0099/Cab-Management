"""
Feature 18: Airport Service FastAPI Router.
Exposes endpoints for master airport hubs, terminal lookups, flight verification,
fare estimation, booking creation, driver airport arrival/waiting, cancellations, and flight provider webhooks.
"""
import uuid
from datetime import date
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Header, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import async_session_maker
from common.models.all_models import User, UserRole
from common.middleware.auth import get_current_user_optional, get_current_user, AuthenticatedUser
from app.services.flight_information_service import FlightInformationService
from app.services.airport_service import AirportService

router = APIRouter(prefix="", tags=["Airport Service"])
flight_router = APIRouter(prefix="/flight", tags=["Flight Information Service"])

async def get_db():
    async with async_session_maker() as session:
        yield session

def resolve_user_id(user: Optional[Any]) -> uuid.UUID:
    if user and hasattr(user, 'id'):
        return user.id if isinstance(user.id, uuid.UUID) else uuid.UUID(str(user.id))
    return uuid.UUID("475d2f54-8a10-4e18-ab48-e877447bc9b6")


# Schemas
class EstimateRequest(BaseModel):
    airport_id: str
    transfer_type: str = "PICKUP" # PICKUP or DROP
    vehicle_category: str = "SEDAN"
    distance_km: float = 18.5
    flight_number: Optional[str] = None
    flight_date: Optional[str] = None
    passenger_count: int = 1
    large_luggage_count: int = 1
    cabin_luggage_count: int = 1
    child_seat_count: int = 0
    meet_and_greet: bool = False
    promo_code: Optional[str] = None

class CreateBookingRequest(BaseModel):
    airport_id: str
    terminal_id: Optional[str] = None
    transfer_type: str = "PICKUP"
    vehicle_category: str = "SEDAN"
    distance_km: float = 18.5
    flight_number: Optional[str] = None
    flight_date: Optional[str] = None
    passenger_count: int = 1
    large_luggage_count: int = 1
    cabin_luggage_count: int = 1
    child_seat_count: int = 0
    meet_and_greet_required: bool = False
    meet_and_greet_name: Optional[str] = None
    special_instructions: Optional[str] = None
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    drop_address: str
    drop_lat: float
    drop_lng: float
    payment_method: str = "WALLET"
    promo_code: Optional[str] = None
    linked_hotel_booking_id: Optional[str] = None

class FlightWebhookPayload(BaseModel):
    flight_number: str
    flight_date: str
    status: str
    delay_minutes: int = 0
    gate: Optional[str] = None
    terminal: Optional[str] = None

class DriverArrivalPayload(BaseModel):
    driver_id: str

class CancelBookingPayload(BaseModel):
    reason: Optional[str] = "Customer requested cancellation"


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/list")
async def list_airports(db: AsyncSession = Depends(get_db)):
    """List all active airport hubs."""
    data = await AirportService.list_airports(db)
    return {"status": "success", "data": data}

@router.get("/{airport_id}/terminals")
async def get_airport_terminals(airport_id: str, db: AsyncSession = Depends(get_db)):
    """List terminals for a specific airport."""
    data = await AirportService.get_airport_terminals(db, uuid.UUID(airport_id))
    return {"status": "success", "data": data}

@flight_router.get("/lookup")
async def lookup_flight(
    flight_number: str = Query(..., description="e.g. AI123, 6E402"),
    flight_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """Lookup authoritative flight schedule, status, and delay."""
    f_date = date.fromisoformat(flight_date) if flight_date else date.today()
    data = await FlightInformationService.lookup_flight(db, flight_number, f_date)
    return {"status": "success", "data": data}

@router.post("/estimate")
async def calculate_fare_estimate(payload: EstimateRequest, db: AsyncSession = Depends(get_db)):
    """Compute itemized fare quote and recommended pickup window."""
    f_date = date.fromisoformat(payload.flight_date) if payload.flight_date else date.today()
    data = await AirportService.calculate_estimate(
        db=db,
        airport_id=uuid.UUID(payload.airport_id),
        transfer_type=payload.transfer_type,
        vehicle_category=payload.vehicle_category,
        distance_km=payload.distance_km,
        flight_number=payload.flight_number,
        flight_date=f_date,
        passenger_count=payload.passenger_count,
        large_luggage_count=payload.large_luggage_count,
        cabin_luggage_count=payload.cabin_luggage_count,
        child_seat_count=payload.child_seat_count,
        meet_and_greet=payload.meet_and_greet,
        promo_code=payload.promo_code,
    )
    return {"status": "success", "data": data}

@router.post("/book")
async def create_airport_booking(
    payload: CreateBookingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Any] = Depends(get_current_user_optional),
):
    """Create a confirmed airport booking with driver reservation."""
    uid = resolve_user_id(current_user)
    data = await AirportService.create_booking(db, uid, payload.dict())
    return {"status": "success", "data": data}

@router.get("/my-bookings")
async def get_my_airport_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Any] = Depends(get_current_user_optional),
):
    """List customer active and historical airport bookings."""
    uid = resolve_user_id(current_user)
    data = await AirportService.get_customer_bookings(db, uid)
    return {"status": "success", "data": data}

@router.get("/booking/{booking_id}")
async def get_booking_details(booking_id: str, db: AsyncSession = Depends(get_db)):
    """Get full booking voucher, driver telemetry, and waiting state."""
    data = await AirportService.get_booking_details(db, uuid.UUID(booking_id))
    return {"status": "success", "data": data}

@router.post("/booking/{booking_id}/driver-arrived")
async def driver_arrived_at_terminal(
    booking_id: str,
    payload: DriverArrivalPayload,
    db: AsyncSession = Depends(get_db),
):
    """Driver registers arrival at terminal; starts 45-min free waiting grace period."""
    data = await AirportService.driver_arrived_at_airport(
        db, uuid.UUID(booking_id), uuid.UUID(payload.driver_id)
    )
    return {"status": "success", "data": data}

@router.post("/booking/{booking_id}/cancel")
async def cancel_airport_booking(
    booking_id: str,
    payload: CancelBookingPayload,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Any] = Depends(get_current_user_optional),
):
    """Cancel airport booking with 100% wallet refund."""
    uid = resolve_user_id(current_user)
    data = await AirportService.cancel_booking(db, uid, uuid.UUID(booking_id), payload.reason)
    return {"status": "success", "data": data}

@router.post("/webhook/flight-update")
async def flight_update_webhook(
    payload: FlightWebhookPayload,
    db: AsyncSession = Depends(get_db),
):
    """Webhook from Flight Provider for live delay and status shifts."""
    f_date = date.fromisoformat(payload.flight_date) if payload.flight_date else date.today()
    snapshot = await FlightInformationService.process_flight_update(
        db=db,
        flight_number=payload.flight_number,
        flight_date=f_date,
        new_status=payload.status,
        delay_minutes=payload.delay_minutes,
        gate=payload.gate,
        terminal=payload.terminal,
    )
    affected_refs = await AirportService.handle_flight_delay_recalculation(
        db=db,
        flight_number=payload.flight_number,
        flight_date=f_date,
        delay_minutes=payload.delay_minutes,
        new_status=payload.status,
    )
    return {
        "status": "success",
        "snapshot": snapshot,
        "affected_booking_references": affected_refs,
    }
