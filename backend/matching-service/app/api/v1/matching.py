"""
Matching Service API  Driver location, dispatch, scan, reject-and-hide.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, status
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, get_current_active_driver, AuthenticatedUser
from common.schemas.base import SuccessResponse
from app.services.geo_search import GeoSearchService
from app.services.dispatch import DispatchService
from app.services.pending_matching import PendingMatchingService
from app.services.corridor_matcher import CorridorMatchingService

router = APIRouter()


#  Schemas 

class LocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: float = 0.0
    heading: float = 0.0


class DispatchRequest(BaseModel):
    booking_id: str
    excluded_driver_ids: Optional[list[str]] = None


class DriverResponseRequest(BaseModel):
    booking_id: str
    accepted: bool
    pending_booking_id: Optional[str] = None  # set when rejecting a pre-booking request


class SearchDriversRequest(BaseModel):
    latitude: float
    longitude: float
    vehicle_type: Optional[str] = None
    women_only: bool = False
    parcel_needed: bool = False
    radius_km: float = 10.0


#  Existing Routes 

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
    background_tasks.add_task(service.dispatch_booking, request.booking_id, request.excluded_driver_ids)
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
    """
    Driver accepts or rejects an incoming TRIP_REQUEST.

    On REJECT:
      - If pending_booking_id provided → persisted to driver_rejections table
        (industry-standard DB persist: customer hidden from this driver forever
        for this booking, even across app restarts)
      - Customer is notified with TRIP_REJECTED event
      - No phone number is ever shared

    On ACCEPT:
      - Booking status → DRIVER_ACCEPTED
      - Customer notified with TRIP_ACCEPTED + driver info (NO phone number)
      - Driver's phone shared ONLY in ARRIVAL_ALERT (10km / 10min threshold)
    """
    from common.models.all_models import (
        Booking, BookingStatus, Driver, DriverRejection,
        PendingBooking, PendingBookingStatus, User, CustomerProfile, Vehicle
    )
    from common.utils.redis_client import publish_event
    import uuid

    # Validate booking exists + 40s window
    from common.utils.redis_client import get_redis
    r = await get_redis()

    ts_raw = await r.get(f"trip_request:timestamp:{request.booking_id}")
    if ts_raw:
        from datetime import datetime
        ts = datetime.fromisoformat(ts_raw)
        elapsed = (datetime.utcnow() - ts).total_seconds()
        if elapsed > 45:
            return SuccessResponse(
                success=False,
                message="Request expired (>40s). Customer will be moved to scan list.",
            )

    # Load booking
    booking_res = await db.execute(
        select(Booking).where(Booking.id == request.booking_id)
    )
    booking = booking_res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Load driver record (by user_id)
    driver_res = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    if request.accepted:
        # ── ACCEPT ──────────────────────────────────────────────────────────
        booking.status = BookingStatus.DRIVER_ACCEPTED
        await db.commit()

        # Load vehicle info (vehicle_model / registration_number live on Vehicle, not Driver)
        vehicle_res = await db.execute(
            select(Vehicle).where(Vehicle.driver_id == driver.id)
        )
        vehicle = vehicle_res.scalar_one_or_none()

        # Notify customer (NO phone number at this stage)
        cp_res = await db.execute(
            select(CustomerProfile).where(CustomerProfile.id == booking.customer_id)
        )
        cp = cp_res.scalar_one_or_none()
        customer_user_id = str(cp.user_id) if cp else None

        driver_info = {
            "driver_id":           str(driver.id),
            "full_name":           driver.full_name,
            "rating":              float(driver.rating) if driver.rating else 4.5,
            "vehicle":             f"{vehicle.make} {vehicle.model}" if vehicle else "",
            "registration_number": vehicle.registration_number if vehicle else "",
            "vehicle_type":        vehicle.vehicle_type.value if vehicle else "",
            "distance_km":         0.0,
            # Phone number NOT sent here — only at ARRIVAL_ALERT
        }

        if customer_user_id:
            await publish_event(f"customer:{customer_user_id}:events", {
                "event":      "TRIP_ACCEPTED",
                "booking_id": request.booking_id,
                "driver":     driver_info,
            })

            # FCM push
            cust_user_res = await db.execute(
                select(User).where(User.id == cp.user_id)
            )
            cust_user = cust_user_res.scalar_one_or_none()
            if cust_user and cust_user.device_token:
                await publish_event("notification:events", {
                    "event":        "TRIP_ACCEPTED",
                    "user_id":      customer_user_id,
                    "user_type":    "customer",
                    "device_token": cust_user.device_token,
                    "title":        "Your ride is confirmed!",
                    "body":         f"Driver {driver.full_name} is on the way.",
                    "data": {
                        "screen":     "TrackDriver",
                        "booking_id": request.booking_id,
                    },
                })

        return SuccessResponse(success=True, message="Trip accepted")

    else:
        # ── REJECT ──────────────────────────────────────────────────────────
        # 1. Persist rejection to DB (industry standard — permanent, not Redis)
        if request.pending_booking_id:
            try:
                rejection = DriverRejection(
                    driver_id=driver.id,
                    pending_booking_id=uuid.UUID(request.pending_booking_id),
                    booking_id=booking.id if booking else None,
                )
                db.add(rejection)
                await db.commit()
            except Exception:
                await db.rollback()  # Unique constraint hit = already rejected, ignore

        # 2. Restore seat count to trip if booking was pending
        if booking.status == BookingStatus.PENDING:
            from common.models.all_models import Trip, TripStatus
            trip_res = await db.execute(
                select(Trip).where(Trip.id == booking.trip_id)
            )
            trip = trip_res.scalar_one_or_none()
            if trip:
                trip.available_seats += booking.seat_count
                if trip.status == TripStatus.FULL:
                    trip.status = TripStatus.PUBLISHED

        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = "Driver rejected"
        await db.commit()

        # 3. Notify customer
        cp_res = await db.execute(
            select(CustomerProfile).where(CustomerProfile.id == booking.customer_id)
        )
        cp = cp_res.scalar_one_or_none()
        customer_user_id = str(cp.user_id) if cp else None

        if customer_user_id:
            await publish_event(f"customer:{customer_user_id}:events", {
                "event":              "TRIP_REJECTED",
                "booking_id":         request.booking_id,
                "pending_booking_id": request.pending_booking_id,
                "message":            "Driver couldn't accept. Other drivers can still see your request.",
            })

            cust_user_res = await db.execute(
                select(User).where(User.id == cp.user_id)
            )
            cust_user = cust_user_res.scalar_one_or_none()
            if cust_user and cust_user.device_token:
                await publish_event("notification:events", {
                    "event":        "TRIP_REJECTED",
                    "user_id":      customer_user_id,
                    "user_type":    "customer",
                    "device_token": cust_user.device_token,
                    "title":        "Driver couldn't accept",
                    "body":         "Don't worry — other drivers are looking for you.",
                    "data": {
                        "screen":         "MatchingWaiting",
                        "booking_id":     request.booking_id,
                    },
                })

        # 4. Also set Redis response key so dispatch loop can move to next driver
        await r.setex(
            f"dispatch:response:{request.booking_id}:{str(driver.id)}",
            60,
            "rejected",
        )

        return SuccessResponse(success=True, message="Trip rejected. Customer remains visible to other drivers.")


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


# ─── NEW: Driver Scan Screen endpoint ─────────────────────────────────────────

@router.get(
    "/scan",
    response_model=SuccessResponse,
    summary="Driver: Scan pending customers matching this trip route",
)
async def scan_pending_customers(
    trip_id: str = Query(..., description="Driver's active trip ID"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Returns all waiting pending_bookings that geographically match the driver's
    trip route (within 5km of pickup AND destination).

    Excludes:
      - Customers this driver has already rejected (DB-persisted driver_rejections)
      - Expired bookings
      - Women-only bookings if trip is not women-only (and vice-versa)

    Does NOT return phone numbers.
    Phone is only revealed in the ARRIVAL_ALERT when driver is within 10km.
    """
    from common.models.all_models import Driver
    driver_res = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = PendingMatchingService(db)
    results = await service.get_scan_results(
        trip_id=trip_id,
        driver_id=str(driver.id),
    )
    return SuccessResponse(
        success=True,
        message=f"{len(results)} matching customers found",
        data=results,
    )


# ─── NEW: Internal endpoint (called by booking-service bridge) ────────────────

@router.post(
    "/internal/match-pending/{pending_booking_id}",
    summary="Internal: Reverse-match a new pending booking against existing trips",
    include_in_schema=False,  # Hidden from public docs
)
async def internal_match_pending(
    pending_booking_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Called by booking-service after a customer creates a pending booking.
    Scans all published trips and notifies the customer if any match.
    No auth required — internal service-to-service call.
    """
    service = PendingMatchingService(db)
    matches = await service.scan_trips_for_customer(pending_booking_id)
    return {"matches": len(matches), "pending_booking_id": pending_booking_id}


# ─── NEW: Forward match — called when driver creates/publishes a trip ──────────

@router.post(
    "/internal/match-trip/{trip_id}",
    summary="Internal: Forward-match a new trip against waiting pending bookings",
    include_in_schema=False,
)
async def internal_match_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Called by trip-service after a driver publishes a trip.
    Scans pending_bookings and notifies matching customers.
    """
    service = PendingMatchingService(db)
    matches = await service.match_pending_bookings(trip_id)
    return {"matches": len(matches), "trip_id": trip_id}


# ─── CORRIDOR: Store route geometry ───────────────────────────────────────────

class StoreRouteRequest(BaseModel):
    encoded_polyline: str
    distance_km: Optional[float] = None
    duration_minutes: Optional[int] = None


@router.post(
    "/internal/store-route/{trip_id}",
    summary="Internal: Store Google Directions polyline + generate 3KM corridor buffer",
    include_in_schema=False,
)
async def internal_store_route(
    trip_id: str,
    request: StoreRouteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Called by booking-service after a driver creates/publishes a trip.
    Decodes the Google Directions encoded polyline, stores it as a PostGIS
    LINESTRING, and auto-generates a 3 KM buffer corridor polygon.
    No auth required — internal service-to-service.
    """
    from app.services.corridor_matcher import CorridorMatchingService
    service = CorridorMatchingService(db)
    await service.store_trip_route(
        trip_id=trip_id,
        encoded_polyline=request.encoded_polyline,
        distance_km=request.distance_km,
        duration_minutes=request.duration_minutes,
    )
    return {"success": True, "trip_id": trip_id}


# ─── CORRIDOR: Store driver-drawn polygons ────────────────────────────────────

class PolygonCoord(BaseModel):
    lat: float
    lng: float


class StorePolygonsRequest(BaseModel):
    pickup_polygon: list[PolygonCoord]
    destination_polygon: list[PolygonCoord]


@router.post(
    "/internal/store-polygons/{trip_id}",
    summary="Internal: Store driver-drawn pickup/destination service area polygons",
    include_in_schema=False,
)
async def internal_store_polygons(
    trip_id: str,
    request: StorePolygonsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Called by booking-service after a driver draws polygons on the map.
    Stores pickup and destination polygons in PostGIS for ST_Within matching.
    """
    from app.services.corridor_matcher import CorridorMatchingService
    service = CorridorMatchingService(db)
    await service.store_trip_polygons(
        trip_id=trip_id,
        pickup_polygon_coords=[{"lat": p.lat, "lng": p.lng} for p in request.pickup_polygon],
        destination_polygon_coords=[{"lat": p.lat, "lng": p.lng} for p in request.destination_polygon],
    )

    # Also trigger corridor matching now that polygons are stored
    from app.services.corridor_matcher import CorridorMatchingService as CMS
    svc = CMS(db)
    matches = await svc.match_corridor(trip_id)
    return {"success": True, "trip_id": trip_id, "corridor_matches": len(matches)}


# ─── CORRIDOR: Driver map — customers inside corridor ─────────────────────────

@router.get(
    "/corridor-customers",
    response_model=SuccessResponse,
    summary="Driver: Get all customers currently inside this trip's route corridor",
)
async def get_corridor_customers(
    trip_id: str = Query(..., description="Driver's active trip ID"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Returns all pending_booking customers whose:
      1. Pickup is inside driver's pickup polygon
      2. Destination is inside driver's destination polygon
      3. Current GPS is inside the 3 KM route corridor

    Shown as customer markers on the driver map.
    Does NOT return phone numbers.
    """
    service = CorridorMatchingService(db)
    customers = await service.find_corridor_customers(trip_id)
    return SuccessResponse(
        success=True,
        message=f"{len(customers)} customers inside corridor",
        data=customers,
    )


# ─── CORRIDOR: Get trip geometry (for frontend rendering) ─────────────────────

@router.get(
    "/trip-geometry/{trip_id}",
    response_model=SuccessResponse,
    summary="Get stored route geometry and polygon info for a trip",
)
async def get_trip_geometry(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns the encoded polyline, distance/duration metadata, and flags
    indicating whether route buffer and polygons have been stored.
    Used by the driver map to render route line + corridor overlay.
    """
    from app.services.corridor_matcher import CorridorMatchingService
    service = CorridorMatchingService(db)
    geometry = await service.get_trip_geometry(trip_id)
    return SuccessResponse(success=True, message="OK", data=geometry)


# ─── CORRIDOR: Customer location update ───────────────────────────────────────

class CustomerLocationRequest(BaseModel):
    lat: float
    lng: float


@router.post(
    "/customer/location",
    response_model=SuccessResponse,
    summary="Customer: Update live GPS location for corridor matching",
)
async def update_customer_location(
    request: CustomerLocationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Customer sends GPS every ~10 seconds while searching for rides.
    Backend upserts into customer_locations, then checks if the customer
    has entered any published trip's 3 KM route corridor.

    If entered:
      - CUSTOMER_ENTERED_CORRIDOR → driver WebSocket room
      - MATCH_FOUND              → customer WebSocket room
    """
    from app.services.corridor_matcher import CorridorMatchingService
    service = CorridorMatchingService(db)
    await service.update_customer_location(
        customer_id=current_user.user_id_str,
        lat=request.lat,
        lng=request.lng,
    )
    return SuccessResponse(success=True, message="Location updated")


# ─── CORRIDOR: Internal match trigger (called after route/polygon stored) ─────

@router.post(
    "/internal/match-corridor/{trip_id}",
    summary="Internal: Run corridor match for a trip",
    include_in_schema=False,
)
async def internal_match_corridor(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Runs full corridor matching for a trip. Called after polygons or route
    geometry are stored. No auth — internal service-to-service.
    """
    from app.services.corridor_matcher import CorridorMatchingService
    service = CorridorMatchingService(db)
    matches = await service.match_corridor(trip_id)
    return {"matches": len(matches), "trip_id": trip_id}


