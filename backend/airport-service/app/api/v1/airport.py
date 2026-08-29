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
from common.middleware.auth import get_current_user, AuthenticatedUser
from app.services.flight_information_service import FlightInformationService
from app.services.airport_service import AirportService

router = APIRouter(prefix="", tags=["Airport Service"])
flight_router = APIRouter(prefix="/flight", tags=["Flight Information Service"])

async def get_db():
    async with async_session_maker() as session:
        yield session


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
    driver_lat: Optional[float] = None
    driver_lng: Optional[float] = None

class ExtendWaitingPayload(BaseModel):
    additional_minutes: int = 15
    reason: Optional[str] = "Flight delayed / Baggage retrieval in progress"

class LogParkingPayload(BaseModel):
    driver_id: str
    amount: float
    bay_info: Optional[str] = None

class DriverActionPayload(BaseModel):
    driver_id: str

class StartTripPayload(BaseModel):
    driver_id: str
    simulated_waiting_mins: Optional[int] = None

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
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Create a confirmed airport booking with driver reservation."""
    data = await AirportService.create_booking(db, current_user.id, payload.dict())
    return {"status": "success", "data": data}

@router.get("/my-bookings")
async def get_my_airport_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """List customer active and historical airport bookings."""
    data = await AirportService.get_customer_bookings(db, current_user.id)
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
    """Driver registers arrival at terminal; verifies geofence and starts 45-min free waiting grace period."""
    data = await AirportService.driver_arrived_at_airport(
        db=db,
        booking_id=uuid.UUID(booking_id),
        driver_id=uuid.UUID(payload.driver_id),
        driver_lat=payload.driver_lat,
        driver_lng=payload.driver_lng,
    )
    return {"status": "success", "data": data}

@router.post("/booking/{booking_id}/extend-waiting")
async def extend_waiting_window(
    booking_id: str,
    payload: ExtendWaitingPayload,
    db: AsyncSession = Depends(get_db),
):
    """Extend airport waiting window with custom duration."""
    data = await AirportService.extend_waiting(
        db=db,
        booking_id=uuid.UUID(booking_id),
        additional_minutes=payload.additional_minutes,
        reason=payload.reason,
    )
    return {"status": "success", "data": data}

@router.post("/booking/{booking_id}/log-parking")
async def log_terminal_parking(
    booking_id: str,
    payload: LogParkingPayload,
    db: AsyncSession = Depends(get_db),
):
    """Log terminal parking fee and bay details."""
    data = await AirportService.log_parking_fee(
        db=db,
        booking_id=uuid.UUID(booking_id),
        driver_id=uuid.UUID(payload.driver_id),
        amount=payload.amount,
        bay_info=payload.bay_info,
    )
    return {"status": "success", "data": data}

@router.post("/booking/{booking_id}/meet-passenger")
async def meet_passenger_at_terminal(
    booking_id: str,
    payload: DriverActionPayload,
    db: AsyncSession = Depends(get_db),
):
    """Passenger meet & greet handshake with chauffeur."""
    data = await AirportService.meet_passenger(
        db=db,
        booking_id=uuid.UUID(booking_id),
        driver_id=uuid.UUID(payload.driver_id),
    )
    return {"status": "success", "data": data}

@router.post("/booking/{booking_id}/start")
async def start_airport_trip(
    booking_id: str,
    payload: StartTripPayload,
    db: AsyncSession = Depends(get_db),
):
    """Start airport transfer ride; computes overstay waiting fees."""
    data = await AirportService.start_trip(
        db=db,
        booking_id=uuid.UUID(booking_id),
        driver_id=uuid.UUID(payload.driver_id),
        simulated_waiting_mins=payload.simulated_waiting_mins,
    )
    return {"status": "success", "data": data}

@router.post("/booking/{booking_id}/complete")
async def complete_airport_trip(
    booking_id: str,
    payload: DriverActionPayload,
    db: AsyncSession = Depends(get_db),
):
    """Complete airport transfer ride and settle driver earnings (80/20 split)."""
    data = await AirportService.complete_trip(
        db=db,
        booking_id=uuid.UUID(booking_id),
        driver_id=uuid.UUID(payload.driver_id),
    )
    return {"status": "success", "data": data}

@router.post("/booking/{booking_id}/cancel")
async def cancel_airport_booking(
    booking_id: str,
    payload: CancelBookingPayload,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Cancel airport booking with 100% wallet refund."""
    data = await AirportService.cancel_booking(db, current_user.id, uuid.UUID(booking_id), payload.reason)
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
