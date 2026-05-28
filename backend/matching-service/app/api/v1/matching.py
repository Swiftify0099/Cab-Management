"""
Matching Service API  Driver location updates, booking dispatch trigger.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, get_current_active_driver, AuthenticatedUser
from common.schemas.base import SuccessResponse
from app.services.geo_search import GeoSearchService
from app.services.dispatch import DispatchService

router = APIRouter()


#  Schemas 

class LocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: float = 0.0
    heading: float = 0.0


class DispatchRequest(BaseModel):
    booking_id: str


class DriverResponseRequest(BaseModel):
    booking_id: str
    accepted: bool


class SearchDriversRequest(BaseModel):
    latitude: float
    longitude: float
    vehicle_type: Optional[str] = None
    women_only: bool = False
    parcel_needed: bool = False
    radius_km: float = 10.0


#  Routes 

@router.post(
    "/location",
    response_model=SuccessResponse,
    summary="Driver: Update live GPS location",
)
async def update_location(
    request: LocationUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = GeoSearchService(db)
    await service.update_driver_location(
        driver_id=current_user.user_id_str,
        latitude=request.latitude,
        longitude=request.longitude,
        speed_kmh=request.speed_kmh,
        heading=request.heading,
    )
    return SuccessResponse(success=True, message="Location updated")


@router.post(
    "/dispatch",
    response_model=SuccessResponse,
    summary="Internal: Trigger driver dispatch for a booking",
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_dispatch(
    request: DispatchRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Called by booking-service after a customer confirms a booking.
    Runs dispatch asynchronously so the HTTP response is immediate.
    """
    service = DispatchService(db)
    background_tasks.add_task(service.dispatch_booking, request.booking_id)
    return SuccessResponse(
        success=True,
        message="Dispatch initiated",
        data={"booking_id": request.booking_id},
    )


@router.post(
    "/respond",
    response_model=SuccessResponse,
    summary="Driver: Accept or reject a trip request",
)
async def driver_respond(
    request: DriverResponseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DispatchService(db)
    await service.driver_respond(
        booking_id=request.booking_id,
        driver_id=current_user.user_id_str,
        accepted=request.accepted,
    )
    action = "accepted" if request.accepted else "rejected"
    return SuccessResponse(success=True, message=f"Trip {action}")


@router.post(
    "/search-drivers",
    response_model=SuccessResponse,
    summary="Search nearby drivers for a location",
)
async def search_nearby_drivers(
    request: SearchDriversRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = GeoSearchService(db)
    drivers = await service.find_nearest_drivers(
        latitude=request.latitude,
        longitude=request.longitude,
        vehicle_type=request.vehicle_type,
        women_only=request.women_only,
        parcel_needed=request.parcel_needed,
        max_radius_km=request.radius_km,
    )
    return SuccessResponse(
        success=True,
        message=f"{len(drivers)} drivers found nearby",
        data=drivers,
    )


@router.get(
    "/driver/{driver_id}/location",
    response_model=SuccessResponse,
    summary="Get cached driver location from Redis",
)
async def get_driver_location(
    driver_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = GeoSearchService(db)
    location = await service.get_driver_location_from_redis(driver_id)
    if not location:
        raise HTTPException(status_code=404, detail="Driver location not found or offline")
    return SuccessResponse(success=True, message="OK", data=location)
