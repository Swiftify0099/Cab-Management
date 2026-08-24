"""
Matching Service API  Driver location, dispatch, scan, reject-and-hide.
"""
from typing import List, Optional, Dict, Any, Union, Tuple, Set
import uuid
import datetime
from datetime import datetime as dt, date
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, get_current_active_driver, AuthenticatedUser
from common.schemas.base import SuccessResponse
from common.models.all_models import Driver, User
from app.services.geo_search import GeoSearchService
from app.services.dispatch import DispatchService
from app.services.pending_matching import PendingMatchingService
from app.services.corridor_matcher import CorridorMatchingService
from app.services.rating_feedback_service import RatingFeedbackService
from app.services.incentives_promotions_service import IncentivesPromotionsService
from app.services.demand_heatmap_service import DemandHeatmapService
from app.services.ai_smart_driver_service import AISmartDriverService
from app.services.support_ticket_service import SupportTicketService
from app.services.notification_center_service import NotificationCenterService
from app.services.scheduled_ride_service import ScheduledRideService
from app.services.trip_history_service import TripHistoryService
from app.services.driver_settings_service import DriverSettingsService
from app.services.destination_mode_service import DestinationModeService
from app.services.back_to_back_service import BackToBackService
from app.services.during_ride_service import DuringRideService
from app.services.multi_stop_service import MultiStopService
from app.services.driver_safety_service import DriverSafetyService
from app.services.communication_service import CommunicationService
from app.services.navigation_service import NavigationService
from app.services.ride_start_service import RideStartService
from app.services.trip_completion_service import TripCompletionService
from app.services.waiting_service import WaitingService
from app.services.cancellation_service import CancellationService
from app.services.hazard_service import HazardService
from app.services.driver_earnings_service import DriverEarningsService
from app.services.driver_performance_service import DriverPerformanceService
from app.services.driver_wallet_service import DriverWalletService
from app.services.safety_sos_service import SafetySOSService
from app.services.smart_radar import SmartRadarService
from app.services.spatial_resolver import SpatialResolverService
from app.services.route_cache import RouteCacheService
from app.services.atomic_matching import AtomicMatchingEngine
from app.services.ride_dispatch import RideDispatchService

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




# ============================================================
# ON-DEMAND RIDE REQUEST & DISPATCH ENDPOINTS (Feature 5)
# ============================================================

from app.services.ride_dispatch import RideDispatchService
from app.services.ride_fare_engine import estimate_ride_fare


class CreateRideRequestSchema(BaseModel):
    pickup_lat: float
    pickup_lng: float
    pickup_address: str
    destination_lat: float
    destination_lng: float
    destination_address: str
    category_name: str = "economy"
    seats_requested: int = 1
    seat_preferences: Optional[dict] = None
    preferred_driver_ids: Optional[List[str]] = None
    service_type: str = "local"  # local, premium, luxury, outstation


class RideOfferResponseSchema(BaseModel):
    offer_id: str
    accepted: bool
    rejection_reason: Optional[str] = None


class CancelRideSchema(BaseModel):
    ride_request_id: str
    reason: Optional[str] = None


@router.post(
    "/rides/request",
    response_model=SuccessResponse,
    summary="Customer: Request an on-demand ride",
    status_code=status.HTTP_201_CREATED,
)
async def create_ride_request_endpoint(
    request: CreateRideRequestSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Creates an on-demand ride request and triggers PostGIS-powered sequential dispatch.
    """
    service = RideDispatchService(db)
    ride_req = await service.create_ride_request(
        customer_id=current_user.user_id_str,
        pickup_lat=request.pickup_lat,
        pickup_lng=request.pickup_lng,
        pickup_address=request.pickup_address,
        dest_lat=request.destination_lat,
        dest_lng=request.destination_lng,
        dest_address=request.destination_address,
        category_name=request.category_name,
        seats_requested=request.seats_requested,
        seat_preferences=request.seat_preferences,
        preferred_driver_ids=request.preferred_driver_ids,
        service_type=request.service_type,
    )
    return SuccessResponse(
        success=True,
        message="Ride request created. Dispatching nearby drivers...",
        data={
            "ride_request_id": str(ride_req.id),
            "estimated_fare": float(ride_req.estimated_fare),
            "status": ride_req.status.value,
        },
    )


@router.post(
    "/rides/respond",
    response_model=SuccessResponse,
    summary="Driver: Accept or reject a ride offer",
)
async def respond_to_ride_offer_endpoint(
    request: RideOfferResponseSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Driver responds to an on-demand RIDE_REQUEST_NEW offer.
    Uses atomic DB locking to assign ride safely without race conditions.
    """
    service = RideDispatchService(db)
    try:
        result = await service.respond_to_offer(
            driver_user_id=current_user.user_id_str,
            offer_id=request.offer_id,
            accepted=request.accepted,
            rejection_reason=request.rejection_reason,
        )
        return SuccessResponse(
            success=result["success"],
            message=result["message"],
            data=result,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


class UpdateDriverCoverageSchema(BaseModel):
    visibility_mode: str = Field(..., description="all_city, specific_city, specific_hex")
    city_ids: Optional[List[str]] = Field(default=None, description="List of city UUIDs for ALL_CITY / SPECIFIC_CITY")
    hex_ids: Optional[List[str]] = Field(default=None, description="List of hex UUIDs for SPECIFIC_HEX")


@router.post(
    "/rides/cancel",
    response_model=SuccessResponse,
    summary="Customer: Cancel a ride request",
)
async def cancel_ride_request_endpoint(
    request: CancelRideSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Customer cancels an active/matching ride request.
    Invalidates pending offers and broadcasts RIDE_REQUEST_REMOVED to drivers.
    """
    service = RideDispatchService(db)
    try:
        res = await service.cancel_ride_request(
            customer_user_id=current_user.user_id_str,
            ride_request_id=request.ride_request_id,
            reason=request.reason,
        )
        return SuccessResponse(
            success=res["success"],
            message=res["message"],
            data=res,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


# ── CUSTOMER-FACING MATCHING VISIBILITY & ESCALATION ENDPOINTS ──

class SearchNearbyForMatchingSchema(BaseModel):
    pickup_lat: float
    pickup_lng: float
    ride_request_id: Optional[str] = None
    radius_km: float = 10.0


@router.post(
    "/rides/search-nearby-for-matching",
    response_model=SuccessResponse,
    summary="Customer: See available drivers during matching wait",
)
async def search_nearby_for_matching(
    request: SearchNearbyForMatchingSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Customer-facing endpoint to show real nearby drivers on the matching-waiting radar.
    Returns list of available drivers with distance, ETA, vehicle info, and favourite status.
    """
    from common.models.all_models import (
        CustomerProfile, FavoriteDriver, DriverLocation, Vehicle,
    )

    service = GeoSearchService(db)
    drivers = await service.find_nearest_drivers(
        latitude=request.pickup_lat,
        longitude=request.pickup_lng,
        max_radius_km=request.radius_km,
    )

    # Resolve customer favourite driver IDs for badge display
    fav_driver_ids = set()
    try:
        cp_res = await db.execute(
            select(CustomerProfile).where(CustomerProfile.user_id == current_user.id)
        )
        cp = cp_res.scalar_one_or_none()
        if cp:
            fav_res = await db.execute(
                select(FavoriteDriver.driver_id).where(FavoriteDriver.customer_id == cp.id)
            )
            fav_driver_ids = {str(row[0]) for row in fav_res.fetchall()}
    except Exception:
        pass

    # Enrich driver list with favourite badge
    enriched = []
    for d in drivers:
        d_id = str(d.get("driver_id", ""))
        d["is_favourite"] = d_id in fav_driver_ids
        enriched.append(d)

    # Sort: favourites first, then by distance
    enriched.sort(key=lambda x: (0 if x.get("is_favourite") else 1, x.get("distance_km", 999)))

    return SuccessResponse(
        success=True,
        message=f"{len(enriched)} drivers nearby",
        data={"drivers": enriched, "total": len(enriched)},
    )


class ReDispatchSchema(BaseModel):
    ride_request_id: str
    expanded_radius_km: float = 25.0


@router.post(
    "/rides/re-dispatch",
    response_model=SuccessResponse,
    summary="Customer: Expand search radius after timeout",
)
async def re_dispatch_ride(
    request: ReDispatchSchema,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Called after 5-minute timeout when no driver has accepted.
    Expands search radius and re-dispatches to a wider pool of drivers.
    """
    from common.models.all_models import RideRequest, RideRequestStatus
    import uuid as _uuid

    try:
        req_uuid = _uuid.UUID(str(request.ride_request_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid ride request ID")

    req_res = await db.execute(
        select(RideRequest).where(
            and_(
                RideRequest.id == req_uuid,
                RideRequest.customer_id == current_user.id,
            )
        )
    )
    ride_req = req_res.scalar_one_or_none()
    if not ride_req:
        raise HTTPException(status_code=404, detail="Ride request not found")

    if ride_req.status not in (RideRequestStatus.MATCHING, RideRequestStatus.DISPATCHING, RideRequestStatus.CREATED):
        return SuccessResponse(
            success=False,
            message=f"Cannot re-dispatch ride in {ride_req.status.value} status",
        )

    # Increment dispatch attempts
    ride_req.dispatch_attempts = (ride_req.dispatch_attempts or 0) + 1
    await db.commit()

    # Re-dispatch with expanded radius (async background task)
    service = RideDispatchService(db)
    count = await service.dispatch_ride_request(str(ride_req.id))

    return SuccessResponse(
        success=True,
        message=f"Expanded search — {count} additional drivers notified",
        data={
            "dispatched_count": count,
            "attempt": ride_req.dispatch_attempts,
            "ride_request_id": str(ride_req.id),
        },
    )


@router.get(
    "/rides/pending-requests",
    response_model=SuccessResponse,
    summary="Driver: List nearby pending customer requests",
)
async def list_pending_requests(
    latitude: float = Query(..., description="Driver's current lat"),
    longitude: float = Query(..., description="Driver's current lng"),
    radius_km: float = Query(15.0, description="Search radius in km"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Driver sees unmatched/pending customer ride requests near their location.
    Shows requests that haven't been accepted by any driver yet.
    """
    from common.models.all_models import RideRequest, RideRequestStatus
    from app.services.ride_fare_engine import haversine_distance_km

    # Fetch all MATCHING ride requests
    req_res = await db.execute(
        select(RideRequest).where(
            RideRequest.status.in_([
                RideRequestStatus.MATCHING,
                RideRequestStatus.DISPATCHING,
                RideRequestStatus.CREATED,
            ])
        )
    )
    all_requests = req_res.scalars().all()

    nearby = []
    for req in all_requests:
        dist = haversine_distance_km(
            latitude, longitude,
            req.pickup_lat, req.pickup_lng,
        )
        if dist <= radius_km:
            nearby.append({
                "ride_request_id": str(req.id),
                "pickup_address": req.pickup_address,
                "destination_address": req.destination_address,
                "pickup_lat": req.pickup_lat,
                "pickup_lng": req.pickup_lng,
                "destination_lat": req.destination_lat,
                "destination_lng": req.destination_lng,
                "estimated_fare": float(req.estimated_fare),
                "estimated_distance_km": req.estimated_distance_km,
                "estimated_duration_min": req.estimated_duration_min,
                "seats_requested": req.seats_requested,
                "distance_from_driver_km": round(dist, 2),
                "created_at": req.created_at.isoformat() if req.created_at else None,
            })

    nearby.sort(key=lambda x: x["distance_from_driver_km"])

    return SuccessResponse(
        success=True,
        message=f"{len(nearby)} pending requests nearby",
        data={"requests": nearby, "total": len(nearby)},
    )


# ── DRIVER COVERAGE & SPATIAL HIERARCHY ENDPOINTS ──

@router.get(
    "/rides/coverage/cities",
    response_model=SuccessResponse,
    summary="Driver / Admin: List all available service cities",
)
async def list_service_cities(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.spatial_resolver import SpatialResolverService
    service = SpatialResolverService(db)
    cities = await service.get_all_service_cities()
    return SuccessResponse(
        success=True,
        message="Service cities fetched",
        data={"cities": cities},
    )


@router.get(
    "/rides/coverage/zones/{city_id}",
    response_model=SuccessResponse,
    summary="Driver / Admin: List zones in a service city",
)
async def list_service_zones(
    city_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.spatial_resolver import SpatialResolverService
    service = SpatialResolverService(db)
    zones = await service.get_zones_for_city(uuid.UUID(city_id))
    return SuccessResponse(
        success=True,
        message="Service zones fetched",
        data={"zones": zones},
    )


@router.get(
    "/rides/coverage/hexes/{zone_id}",
    response_model=SuccessResponse,
    summary="Driver / Admin: List H3 hex cells in a zone",
)
async def list_service_hexes(
    zone_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.spatial_resolver import SpatialResolverService
    service = SpatialResolverService(db)
    hexes = await service.get_hexes_for_zone(uuid.UUID(zone_id))
    return SuccessResponse(
        success=True,
        message="Service hexes fetched",
        data={"hexes": hexes},
    )


@router.get(
    "/rides/coverage",
    response_model=SuccessResponse,
    summary="Driver: Get current request visibility preference and covered areas",
)
async def get_driver_coverage(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from common.models.all_models import Driver, DriverPreference
    from app.services.spatial_resolver import SpatialResolverService

    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    pref_res = await db.execute(select(DriverPreference).where(DriverPreference.driver_id == driver.id))
    pref = pref_res.scalar_one_or_none()
    visibility_mode = pref.visibility_mode if pref else "all_city"

    spatial = SpatialResolverService(db)
    covered_cities = await spatial.get_cities_for_driver(driver.id)
    covered_hexes = await spatial.get_hexes_for_driver(driver.id)

    return SuccessResponse(
        success=True,
        message="Driver coverage configuration fetched",
        data={
            "visibility_mode": visibility_mode,
            "covered_cities": covered_cities,
            "covered_hexes": covered_hexes,
        },
    )


@router.put(
    "/rides/coverage",
    response_model=SuccessResponse,
    summary="Driver: Update request visibility preference and covered areas",
)
async def update_driver_coverage(
    request: UpdateDriverCoverageSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from common.models.all_models import Driver
    from app.services.spatial_resolver import SpatialResolverService
    from common.utils.redis_client import publish_event

    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    spatial = SpatialResolverService(db)
    updated = await spatial.update_driver_visibility(
        driver_id=driver.id,
        visibility_mode=request.visibility_mode,
        city_ids=request.city_ids,
        hex_ids=request.hex_ids,
    )

    # Publish coverage update to trigger WebSocket room recalculations
    await publish_event(f"driver:{current_user.user_id_str}:events", {
        "event": "COVERAGE_UPDATED",
        "visibility_mode": request.visibility_mode,
        "city_ids": request.city_ids or [],
    })

    return SuccessResponse(
        success=True,
        message="Driver coverage configuration updated successfully",
        data=updated,
    )


@router.get(
    "/rides/radar",
    response_model=SuccessResponse,
    summary="Driver: Get current eligible ride requests for Radar",
)
async def get_rides_radar(
    filter_type: str = Query("all", description="all, recommended, best_earnings, closest, airport"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = SmartRadarService(db)
    rides = await service.get_smart_radar_rides(
        driver_user_id=current_user.user_id_str,
        filter_type=filter_type,
    )
    return SuccessResponse(
        success=True,
        message=f"{len(rides)} requests available on your radar",
        data={
            "rides": rides,
            "count": len(rides),
        },
    )


@router.get(
    "/rides/radar/count",
    response_model=SuccessResponse,
    summary="Driver: Get real-time count of eligible pending requests for Radar badge",
)
async def get_radar_count(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = SmartRadarService(db)
    count = await service.get_smart_radar_count(driver_user_id=current_user.user_id_str)
    return SuccessResponse(
        success=True,
        message="Radar count fetched",
        data={"count": count},
    )


@router.get(
    "/rides/active",
    response_model=SuccessResponse,
    summary="Driver: Get active ride or pending offer (for reconnect sync)",
)
async def get_driver_active_ride(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Returns any active assigned ride or pending ride offer for the driver.
    Called when driver app reconnects to restore UI state.
    """
    from common.models.all_models import Driver, RideRequest, RideOffer, RideRequestStatus, RideOfferStatus
    from datetime import datetime

    # Get driver profile
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    # 1. Check for active assigned ride
    assigned_res = await db.execute(
        select(RideRequest).where(
            and_(
                RideRequest.assigned_driver_id == driver.id,
                RideRequest.status.in_([RideRequestStatus.ASSIGNED, RideRequestStatus.PICKUP, RideRequestStatus.IN_PROGRESS]),
            )
        )
    )
    active_ride = assigned_res.scalar_one_or_none()
    if active_ride:
        return SuccessResponse(
            success=True,
            message="Active ride found",
            data={
                "type": "assigned_ride",
                "ride_request_id": str(active_ride.id),
                "status": active_ride.status.value,
                "pickup_address": active_ride.pickup_address,
                "pickup_lat": active_ride.pickup_lat,
                "pickup_lng": active_ride.pickup_lng,
                "destination_address": active_ride.destination_address,
                "destination_lat": active_ride.destination_lat,
                "destination_lng": active_ride.destination_lng,
                "fare": float(active_ride.estimated_fare),
            },
        )

    # 2. Check for pending offer that has not expired
    now = datetime.utcnow()
    offer_res = await db.execute(
        select(RideOffer).where(
            and_(
                RideOffer.driver_id == driver.id,
                RideOffer.status == RideOfferStatus.PENDING,
                RideOffer.expires_at > now,
            )
        )
    )
    pending_offer = offer_res.scalar_one_or_none()
    if pending_offer:
        # Load related ride request
        rr_res = await db.execute(
            select(RideRequest).where(RideRequest.id == pending_offer.ride_request_id)
        )
        rr = rr_res.scalar_one_or_none()
        if rr and rr.status == RideRequestStatus.DISPATCHING:
            remaining_sec = max(int((pending_offer.expires_at.replace(tzinfo=None) - now).total_seconds()), 1)
            return SuccessResponse(
                success=True,
                message="Pending ride offer found",
                data={
                    "type": "pending_offer",
                    "offer_id": str(pending_offer.id),
                    "ride_request_id": str(rr.id),
                    "booking_id": str(rr.id),
                    "pickup": {
                        "address": rr.pickup_address,
                        "lat": rr.pickup_lat,
                        "lng": rr.pickup_lng,
                        "distance_km": pending_offer.pickup_distance_km,
                        "eta_min": pending_offer.pickup_eta_min,
                    },
                    "destination": {
                        "address": rr.destination_address,
                        "lat": rr.destination_lat,
                        "lng": rr.destination_lng,
                    },
                    "trip": {
                        "from": rr.pickup_address,
                        "to": rr.destination_address,
                        "distance_km": rr.estimated_distance_km,
                        "duration_min": rr.estimated_duration_min,
                        "fare": float(pending_offer.estimated_fare),
                        "earning": float(pending_offer.estimated_earning),
                        "seats": rr.seats_requested,
                    },
                    "category": {
                        "name": "Economy",
                        "icon": "car",
                    },
                    "seat_info": {
                        "total_seats": 4,
                        "available_seats": 4,
                        "available_labels": ["Front Window", "Rear Left", "Rear Right", "Rear Middle"],
                        "requested_seats": rr.seats_requested,
                    },
                    "expires_at": pending_offer.expires_at.isoformat(),
                    "timeout_sec": remaining_sec,
                    "paid": True,
                },
            )

    return SuccessResponse(success=True, message="No active ride or offer", data=None)


@router.get(
    "/rides/categories",
    response_model=SuccessResponse,
    summary="Get available ride categories with fare rules",
)
async def get_ride_categories(
    db: AsyncSession = Depends(get_db),
):
    from common.models.all_models import RideCategory
    res = await db.execute(
        select(RideCategory).where(RideCategory.is_active == True).order_by(RideCategory.sort_order)
    )
    cats = res.scalars().all()
    data = [
        {
            "id": str(c.id),
            "name": c.name,
            "display_name": c.display_name,
            "base_fare": float(c.base_fare),
            "per_km_rate": float(c.per_km_rate),
            "per_min_rate": float(c.per_min_rate),
            "min_fare": float(c.min_fare),
            "platform_commission_pct": c.platform_commission_pct,
            "surge_multiplier": c.surge_multiplier,
            "icon_name": c.icon_name,
        }
        for c in cats
    ]
    return SuccessResponse(success=True, message="Ride categories", data=data)


class EstimateRideFareSchema(BaseModel):
    pickup_lat: float
    pickup_lng: float
    dest_lat: float
    dest_lng: float
    category_name: Optional[str] = None
    stops: Optional[List[Dict[str, Any]]] = None


@router.post(
    "/rides/estimate",
    response_model=SuccessResponse,
    summary="Estimate fare for on-demand ride",
)
async def estimate_ride_fare_endpoint(
    request: EstimateRideFareSchema,
    db: AsyncSession = Depends(get_db),
):
    from common.models.all_models import RideCategory
    from app.services.ride_fare_engine import haversine_distance_km, estimate_ride_fare

    dist_km = haversine_distance_km(
        request.pickup_lat, request.pickup_lng,
        request.dest_lat, request.dest_lng,
        min_km=1.0,
    )
    if request.stops:
        prev_lat, prev_lng = request.pickup_lat, request.pickup_lng
        total_d = 0.0
        for s in request.stops:
            s_lat = s.get("lat") or s.get("latitude")
            s_lng = s.get("lng") or s.get("longitude")
            if s_lat and s_lng:
                total_d += haversine_distance_km(prev_lat, prev_lng, float(s_lat), float(s_lng))
                prev_lat, prev_lng = float(s_lat), float(s_lng)
        total_d += haversine_distance_km(prev_lat, prev_lng, request.dest_lat, request.dest_lng)
        dist_km = max(total_d, dist_km)

    cat_res = await db.execute(
        select(RideCategory).where(RideCategory.name.ilike(request.category_name or "Economy"))
    )
    category = cat_res.scalar_one_or_none()

    est = estimate_ride_fare(distance_km=dist_km, category=category)
    return SuccessResponse(
        success=True,
        message="Fare estimated successfully",
        data=est.to_dict(),
    )


@router.get(
    "/rides/schedule-config",
    response_model=SuccessResponse,
    summary="Get configuration for scheduling advance rides",
)
async def get_schedule_config():
    return SuccessResponse(
        success=True,
        message="Schedule configuration",
        data={
            "min_lead_time_minutes": 30,
            "max_advance_booking_days": 7,
            "operating_hours_start": "00:00",
            "operating_hours_end": "23:59",
            "cancellation_window_minutes": 15,
        },
    )


# ============================================================
# SMART RIDE SELECTION & RADAR ENDPOINTS (Feature 6)
# ============================================================

from app.services.smart_radar import SmartRadarService
from app.services.atomic_matching import AtomicMatchingEngine


class UpdateDriverPreferenceSchema(BaseModel):
    mode: Optional[str] = None
    allow_local: Optional[bool] = None
    allow_airport: Optional[bool] = None
    allow_outstation: Optional[bool] = None
    allow_scheduled: Optional[bool] = None
    min_earning_cutoff: Optional[float] = None
    max_pickup_distance_km: Optional[float] = None
    max_pickup_eta_min: Optional[int] = None
    destination_mode: Optional[str] = None
    destination_address: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None


from typing import List, Optional, Dict, Any, Union, Tuple, Set

class RadarMatchRequestSchema(BaseModel):
    selected_ride_ids: list[str]


@router.get(
    "/preferences",
    response_model=SuccessResponse,
    summary="Driver: Get personal matching preferences",
)
async def get_driver_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """Fetch driver's active driving mode, trip types, and pickup constraints."""
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = SmartRadarService(db)
    pref = await service.get_or_create_driver_preferences(driver.id)
    return SuccessResponse(
        success=True,
        message="Preferences retrieved",
        data={
            "mode": pref.mode,
            "allow_local": pref.allow_local,
            "allow_airport": pref.allow_airport,
            "allow_outstation": pref.allow_outstation,
            "allow_scheduled": pref.allow_scheduled,
            "min_earning_cutoff": pref.min_earning_cutoff,
            "max_pickup_distance_km": pref.max_pickup_distance_km,
            "max_pickup_eta_min": pref.max_pickup_eta_min,
            "destination_mode": pref.destination_mode,
            "destination_address": pref.destination_address,
            "destination_lat": pref.destination_lat,
            "destination_lng": pref.destination_lng,
        },
    )


@router.patch(
    "/preferences",
    response_model=SuccessResponse,
    summary="Driver: Update personal matching preferences",
)
async def update_driver_preferences_endpoint(
    request: UpdateDriverPreferenceSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """Update driver driving mode (Balanced, Best Earnings, Nearby Focus, Airport), constraints, and destination mode."""
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = SmartRadarService(db)
    pref = await service.update_driver_preferences(
        driver_id=driver.id,
        mode=request.mode,
        allow_local=request.allow_local,
        allow_airport=request.allow_airport,
        allow_outstation=request.allow_outstation,
        allow_scheduled=request.allow_scheduled,
        min_earning_cutoff=request.min_earning_cutoff,
        max_pickup_distance_km=request.max_pickup_distance_km,
        max_pickup_eta_min=request.max_pickup_eta_min,
        destination_mode=request.destination_mode,
        destination_address=request.destination_address,
        destination_lat=request.destination_lat,
        destination_lng=request.destination_lng,
    )
    return SuccessResponse(
        success=True,
        message="Preferences saved successfully",
        data={
            "mode": pref.mode,
            "allow_local": pref.allow_local,
            "allow_airport": pref.allow_airport,
            "allow_outstation": pref.allow_outstation,
            "allow_scheduled": pref.allow_scheduled,
            "min_earning_cutoff": pref.min_earning_cutoff,
            "max_pickup_distance_km": pref.max_pickup_distance_km,
            "max_pickup_eta_min": pref.max_pickup_eta_min,
            "destination_mode": pref.destination_mode,
            "destination_address": pref.destination_address,
            "destination_lat": pref.destination_lat,
            "destination_lng": pref.destination_lng,
        },
    )


@router.get(
    "/radar/candidates",
    response_model=SuccessResponse,
    summary="Driver: Discover Smart Ride Radar personalized opportunities",
)
async def get_smart_radar_candidates(
    filter_type: str = Query("all", description="all, recommended, best_earnings, closest, airport"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Returns top N personalized, scored candidate rides matching driver preferences for Smart Radar view.
    """
    service = SmartRadarService(db)
    candidates = await service.get_smart_radar_rides(
        driver_user_id=current_user.user_id_str,
        filter_type=filter_type,
    )
    return SuccessResponse(
        success=True,
        message=f"{len(candidates)} matching trips found in your radar",
        data={
            "candidates": candidates,
            "count": len(candidates),
        },
    )


@router.post(
    "/radar/match",
    response_model=SuccessResponse,
    summary="Driver: Submit interest in 1 or more Smart Radar candidate rides",
)
async def submit_radar_match(
    request: RadarMatchRequestSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Driver selects one or multiple candidate rides from Smart Radar.
    Backend performs atomic assignment using SELECT FOR UPDATE.
    """
    engine = AtomicMatchingEngine(db)
    result = await engine.submit_radar_match_interest(
        driver_user_id=current_user.user_id_str,
        selected_ride_ids=request.selected_ride_ids,
    )
    return SuccessResponse(
        success=result["success"],
        message=result["message"],
        data=result,
    )


# ============================================================
# NAVIGATION & HAZARD ENDPOINTS (Feature 7)
# ============================================================

from app.services.routing_gatekeeper import RoutingGatekeeper
from app.services.hazard_service import HazardService
from app.services.navigation_service import NavigationService


class NavigationArrivalSchema(BaseModel):
    ride_id: str
    phase: str  # pickup or dropoff
    latitude: float
    longitude: float


class ReportHazardSchema(BaseModel):
    hazard_type: str  # construction, pothole, accident, road_closed, heavy_traffic, flooding, other
    latitude: float
    longitude: float
    description: Optional[str] = None
    heading: Optional[float] = None
    speed_kmh: Optional[float] = None
    ride_id: Optional[str] = None


@router.get(
    "/navigation/route",
    response_model=SuccessResponse,
    summary="Navigation: Fetch authoritative road route with turn-by-turn maneuvers",
)
async def get_navigation_route(
    origin_lat: float = Query(...),
    origin_lng: float = Query(...),
    dest_lat: float = Query(...),
    dest_lng: float = Query(...),
    ride_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Centralized server-authoritative route with Redis caching and in-flight request deduplication.
    Prevents mobile from ever calling Google Routes API directly.
    """
    import os
    google_key = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY")
    route = await RoutingGatekeeper.get_route(
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        google_api_key=google_key,
        db=db,
        ride_id=ride_id,
        driver_id=current_user.user_id_str,
    )
    return SuccessResponse(
        success=True,
        message="Navigation route generated",
        data=route,
    )


@router.post(
    "/navigation/arrival",
    response_model=SuccessResponse,
    summary="Navigation: Authoritative PostGIS arrival verification",
)
async def verify_arrival(
    request: NavigationArrivalSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Validates driver physical arrival at pickup (<60m) or dropoff (<80m) using PostGIS spatial logic.
    """
    import uuid
    service = NavigationService(db)
    ride_uuid = uuid.UUID(request.ride_id)
    if request.phase == "pickup":
        is_arrived, msg, dist_m = await service.verify_pickup_arrival(
            ride_id=ride_uuid,
            driver_lat=request.latitude,
            driver_lng=request.longitude,
        )
    else:
        is_arrived, msg, dist_m = await service.verify_destination_arrival(
            ride_id=ride_uuid,
            driver_lat=request.latitude,
            driver_lng=request.longitude,
        )

    return SuccessResponse(
        success=is_arrived,
        message=msg,
        data={
            "is_arrived": is_arrived,
            "distance_meters": round(dist_m, 1),
            "phase": request.phase,
        },
    )


@router.post(
    "/navigation/hazard",
    response_model=SuccessResponse,
    summary="Navigation: Submit one-tap road hazard with PostGIS spatial clustering",
)
async def report_hazard(
    request: ReportHazardSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Captures driver road hazard. Clusters duplicates within 50m to avoid clutter.
    """
    from common.models.all_models import Driver
    import uuid
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()

    service = HazardService(db)
    hazard = await service.report_hazard(
        driver_id=driver.id if driver else None,
        hazard_type=request.hazard_type,
        latitude=request.latitude,
        longitude=request.longitude,
        description=request.description,
        heading=request.heading,
        speed_kmh=request.speed_kmh,
        ride_id=uuid.UUID(request.ride_id) if request.ride_id else None,
    )
    return SuccessResponse(
        success=True,
        message=f"Hazard '{hazard.hazard_type}' recorded successfully. Confidence: {hazard.confidence_score}",
        data={
            "hazard_id": str(hazard.id),
            "hazard_type": hazard.hazard_type,
            "status": hazard.status,
            "confidence_score": hazard.confidence_score,
            "report_count": hazard.report_count,
        },
    )


@router.get(
    "/navigation/hazards",
    response_model=SuccessResponse,
    summary="Navigation: Fetch active road hazards near driver location",
)
async def get_nearby_hazards(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_meters: float = Query(1500.0),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """Returns active road hazards along driver route using PostGIS ST_DWithin."""
    service = HazardService(db)
    hazards = await service.get_nearby_hazards(
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters,
    )
    return SuccessResponse(
        success=True,
        message=f"{len(hazards)} hazards found nearby",
        data={"hazards": hazards, "count": len(hazards)},
    )


# ============================================================
# FEATURE 8: CUSTOMER COMMUNICATION ENDPOINTS
# ============================================================

from app.services.communication_service import CommunicationService
from app.services.ride_start_service import RideStartService


class InitiateCallSchema(BaseModel):
    ride_id: str


class UpdateCallStatusSchema(BaseModel):
    status: str  # ringing, connected, ended, failed, declined
    duration_seconds: Optional[int] = 0


class SendMessageSchema(BaseModel):
    ride_id: str
    content: str
    message_type: Optional[str] = "text"  # text, quick_message, location_share
    metadata: Optional[dict] = None


class PickupIssueSchema(BaseModel):
    issue_type: str  # cant_find_customer, wrong_location
    details: Optional[str] = None


class NoShowSchema(BaseModel):
    latitude: float
    longitude: float


@router.post(
    "/communication/calls/initiate",
    response_model=SuccessResponse,
    summary="Driver: Initiate secure masked call to passenger",
)
async def initiate_masked_call_endpoint(
    request: InitiateCallSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """Initiates a secure masked call session. Never exposes real customer phone numbers."""
    service = CommunicationService(db)
    result = await service.initiate_masked_call(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(request.ride_id),
    )
    return SuccessResponse(
        success=True,
        message="Masked call session initiated.",
        data=result,
    )


@router.post(
    "/communication/calls/{session_id}/status",
    response_model=SuccessResponse,
    summary="Update call session status",
)
async def update_call_status_endpoint(
    session_id: str,
    request: UpdateCallStatusSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Updates call state (e.g. ringing -> connected -> ended)."""
    service = CommunicationService(db)
    result = await service.update_call_status(
        session_id=uuid.UUID(session_id),
        new_status=request.status,
        duration_seconds=request.duration_seconds or 0,
    )
    return SuccessResponse(success=True, message="Call status updated", data=result)


@router.post(
    "/communication/messages",
    response_model=SuccessResponse,
    summary="Send in-app chat message",
)
async def send_chat_message_endpoint(
    request: SendMessageSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Sends realtime chat message with server-side sender authorization."""
    service = CommunicationService(db)
    role = "driver" if current_user.role == "driver" else "customer"
    result = await service.send_message(
        sender_user_id=current_user.user_id_str,
        sender_role=role,
        ride_id=uuid.UUID(request.ride_id),
        content=request.content,
        message_type=request.message_type or "text",
        metadata=request.metadata,
    )
    return SuccessResponse(success=True, message="Message sent", data=result)


@router.get(
    "/communication/messages",
    response_model=SuccessResponse,
    summary="Get chat history for ride",
)
async def get_chat_messages_endpoint(
    ride_id: str = Query(...),
    limit: int = Query(50),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns chronologically ordered messages for active ride."""
    service = CommunicationService(db)
    messages = await service.get_messages(
        user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        limit=limit,
    )
    return SuccessResponse(success=True, message=f"{len(messages)} messages retrieved", data=messages)


@router.post(
    "/communication/messages/read",
    response_model=SuccessResponse,
    summary="Mark messages as read",
)
async def mark_messages_read_endpoint(
    ride_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Marks incoming messages as read and emits read receipt."""
    service = CommunicationService(db)
    count = await service.mark_messages_read(
        user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
    )
    return SuccessResponse(success=True, message=f"{count} messages marked as read", data={"count": count})


@router.post(
    "/rides/{ride_id}/pickup-issue",
    response_model=SuccessResponse,
    summary="Driver: Report pickup assistance issue",
)
async def report_pickup_issue_endpoint(
    ride_id: str,
    request: PickupIssueSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """Driver logs assistance issue (Can't Find Customer / Wrong Pickup Location)."""
    service = CommunicationService(db)
    result = await service.report_pickup_issue(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        issue_type=request.issue_type,
        details=request.details,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.post(
    "/rides/{ride_id}/no-show",
    response_model=SuccessResponse,
    summary="Driver: Anti-fraud Customer No-Show verification",
)
async def report_no_show_endpoint(
    ride_id: str,
    request: NoShowSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Validates:
      - 5 min waiting time since official arrival
      - PostGIS proximity (<150m)
      - >= 1 contact attempt logged
    """
    service = CommunicationService(db)
    result = await service.process_no_show(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        driver_lat=request.latitude,
        driver_lng=request.longitude,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


# ============================================================
# FEATURE 9: RIDE START & VERIFICATION ENDPOINTS
# ============================================================

class StartRideSchema(BaseModel):
    ride_start_pin: str
    latitude: float
    longitude: float
    accuracy: Optional[float] = 10.0


@router.get(
    "/rides/{ride_id}/verification-status",
    response_model=SuccessResponse,
    summary="Driver: Get live 4-point verification checklist & waiting timer",
)
async def get_verification_status_endpoint(
    ride_id: str,
    latitude: float = Query(...),
    longitude: float = Query(...),
    accuracy: float = Query(10.0),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """Returns Customer, Vehicle, PostGIS GPS proximity (<100m), and Waiting Timer status."""
    service = RideStartService(db)
    status_data = await service.get_verification_status(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        driver_lat=latitude,
        driver_lng=longitude,
        accuracy=accuracy,
    )
    return SuccessResponse(success=True, message="Verification status retrieved", data=status_data)


@router.post(
    "/rides/{ride_id}/start",
    response_model=SuccessResponse,
    summary="Driver: Multi-Factor PIN & PostGIS Proximity Ride Start",
)
async def start_ride_endpoint(
    ride_id: str,
    request: StartRideSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    """
    Authoritative Ride Start.
    Uses SELECT FOR UPDATE row locking, validates 4-digit PIN, PostGIS proximity (<100m),
    accuracy (<=40m), and idempotently transitions to IN_PROGRESS.
    """
    service = RideStartService(db)
    result = await service.verify_and_start_ride(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        pin=request.ride_start_pin,
        driver_lat=request.latitude,
        driver_lng=request.longitude,
        accuracy=request.accuracy or 10.0,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


# ============================================================
# FEATURE 10: DURING RIDE / LIVE TRIP EXECUTION ENDPOINTS
# ============================================================

class TripLocationUpdateSchema(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    accuracy_m: Optional[float] = 10.0


class UpdateDestinationSchema(BaseModel):
    new_latitude: float
    new_longitude: float
    new_address: str


class AddStopSchema(BaseModel):
    address: str
    latitude: float
    longitude: float


class StopArrivalSchema(BaseModel):
    latitude: float
    longitude: float


class TriggerSOSSchema(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = 10.0
    reason: Optional[str] = "Emergency button triggered by driver"


@router.post(
    "/rides/{ride_id}/location",
    response_model=SuccessResponse,
    summary="Driver: Process during-ride GPS telemetry and PostGIS distance",
)
async def record_trip_location_endpoint(
    ride_id: str,
    request: TripLocationUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.during_ride_service import DuringRideService
    service = DuringRideService(db)
    result = await service.record_trip_location(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        latitude=request.latitude,
        longitude=request.longitude,
        speed_kmh=request.speed_kmh or 0.0,
        heading=request.heading or 0.0,
        accuracy_m=request.accuracy_m or 10.0,
    )
    return SuccessResponse(success=True, message="Location processed", data=result)


@router.get(
    "/rides/{ride_id}/status",
    response_model=SuccessResponse,
    summary="Driver: Get live in-flight trip execution status & fare",
)
async def get_during_ride_status_endpoint(
    ride_id: str,
    latitude: float = Query(...),
    longitude: float = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.during_ride_service import DuringRideService
    service = DuringRideService(db)
    result = await service.get_during_ride_status(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        driver_lat=latitude,
        driver_lng=longitude,
    )
    return SuccessResponse(success=True, message="Trip status retrieved", data=result)


@router.post(
    "/rides/{ride_id}/destination",
    response_model=SuccessResponse,
    summary="Driver/Customer: Modify destination during active trip",
)
async def update_destination_endpoint(
    ride_id: str,
    request: UpdateDestinationSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.during_ride_service import DuringRideService
    service = DuringRideService(db)
    result = await service.update_destination(
        user_id=current_user.user_id_str,
        role="driver",
        ride_id=uuid.UUID(ride_id),
        new_latitude=request.new_latitude,
        new_longitude=request.new_longitude,
        new_address=request.new_address,
    )
    return SuccessResponse(success=True, message="Destination updated", data=result)


@router.post(
    "/rides/{ride_id}/stops",
    response_model=SuccessResponse,
    summary="Driver/Customer: Add intermediate stop to active trip",
)
async def add_stop_endpoint(
    ride_id: str,
    request: AddStopSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.multi_stop_service import MultiStopService
    service = MultiStopService(db)
    result = await service.add_stop(
        user_id=current_user.user_id_str,
        role="driver",
        ride_id=uuid.UUID(ride_id),
        address=request.address,
        latitude=request.latitude,
        longitude=request.longitude,
    )
    return SuccessResponse(success=True, message="Stop added", data=result)


@router.post(
    "/rides/{ride_id}/stops/{stop_id}/arrive",
    response_model=SuccessResponse,
    summary="Driver: PostGIS Geofence stop arrival check (<=60m)",
)
async def stop_arrive_endpoint(
    ride_id: str,
    stop_id: str,
    request: StopArrivalSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.multi_stop_service import MultiStopService
    service = MultiStopService(db)
    result = await service.verify_stop_arrival(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        stop_id=uuid.UUID(stop_id),
        driver_lat=request.latitude,
        driver_lng=request.longitude,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.post(
    "/rides/{ride_id}/stops/{stop_id}/depart",
    response_model=SuccessResponse,
    summary="Driver: Depart from intermediate stop",
)
async def stop_depart_endpoint(
    ride_id: str,
    stop_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.multi_stop_service import MultiStopService
    service = MultiStopService(db)
    result = await service.depart_stop(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        stop_id=uuid.UUID(stop_id),
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.post(
    "/rides/{ride_id}/sos",
    response_model=SuccessResponse,
    summary="Driver: Trigger Emergency SOS incident",
)
async def trigger_sos_endpoint(
    ride_id: str,
    request: TriggerSOSSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.safety_sos_service import SafetySOSService
    service = SafetySOSService(db)
    result = await service.trigger_sos(
        user_id=current_user.user_id_str,
        role="driver",
        ride_id=uuid.UUID(ride_id),
        latitude=request.latitude,
        longitude=request.longitude,
        accuracy=request.accuracy or 10.0,
        reason=request.reason,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/rides/{ride_id}/sos",
    response_model=SuccessResponse,
    summary="Driver: Check active SOS incident for ride",
)
async def get_active_sos_endpoint(
    ride_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.safety_sos_service import SafetySOSService
    service = SafetySOSService(db)
    result = await service.get_active_sos(ride_id=uuid.UUID(ride_id))
    return SuccessResponse(success=True, message="SOS status retrieved", data=result)


# ============================================================
# FEATURES 11 & 12: WAITING & CANCELLATION ENDPOINTS
# ============================================================

class CancelRideSchema(BaseModel):
    reason_code: str
    reason_details: Optional[str] = None


@router.get(
    "/rides/{ride_id}/waiting-status",
    response_model=SuccessResponse,
    summary="Driver: Get server-authoritative live waiting status & charges",
)
async def get_live_waiting_status_endpoint(
    ride_id: str,
    latitude: float = Query(...),
    longitude: float = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.waiting_service import WaitingService
    service = WaitingService(db)
    result = await service.get_live_waiting_status(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        driver_lat=latitude,
        driver_lng=longitude,
    )
    return SuccessResponse(success=True, message="Waiting status retrieved", data=result)


@router.get(
    "/cancellation/reasons",
    response_model=SuccessResponse,
    summary="Driver/Customer: Get structured cancellation reason catalog",
)
async def get_cancellation_reasons_endpoint(
    db: AsyncSession = Depends(get_db),
):
    from app.services.cancellation_service import CancellationService
    service = CancellationService(db)
    reasons = service.get_reason_catalog()
    return SuccessResponse(success=True, message="Cancellation reasons retrieved", data=reasons)


@router.post(
    "/rides/{ride_id}/cancel-by-driver",
    response_model=SuccessResponse,
    summary="Driver: Structured cancellation with penalty & metric update",
)
async def cancel_ride_by_driver_endpoint(
    ride_id: str,
    request: CancelRideSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.cancellation_service import CancellationService
    service = CancellationService(db)
    result = await service.cancel_ride_by_driver(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        reason_code=request.reason_code,
        reason_details=request.reason_details,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/drivers/cancellation-metrics",
    response_model=SuccessResponse,
    summary="Driver: Get cancellation performance score & standing",
)
async def get_driver_cancellation_metrics_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.cancellation_service import CancellationService
    service = CancellationService(db)
    result = await service.get_driver_metrics(driver_user_id=current_user.user_id_str)
    return SuccessResponse(success=True, message="Cancellation metrics retrieved", data=result)


@router.get(
    "/drivers/cancellation-history",
    response_model=SuccessResponse,
    summary="Driver: Get cancellation history audit log",
)
async def get_driver_cancellation_history_endpoint(
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.cancellation_service import CancellationService
    service = CancellationService(db)
    result = await service.get_cancellation_history(driver_user_id=current_user.user_id_str, limit=limit)
    return SuccessResponse(success=True, message="Cancellation history retrieved", data=result)


# ============================================================
# FEATURES 13 & 14: TRIP COMPLETION & DRIVER EARNINGS
# ============================================================

class CompleteRideSchema(BaseModel):
    tolls: float = 0.0
    parking: float = 0.0
    payment_method: str = "cash"  # cash, upi, card, wallet


class RateCustomerSchema(BaseModel):
    rating: float
    tags: List[str] = []
    feedback: Optional[str] = None


class AddTipSchema(BaseModel):
    tip_amount: float


@router.post(
    "/rides/{ride_id}/arrived-dropoff",
    response_model=SuccessResponse,
    summary="Driver: Verify destination arrival geofence (PostGIS)",
)
async def verify_destination_arrival_endpoint(
    ride_id: str,
    latitude: float = Query(...),
    longitude: float = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.trip_completion_service import TripCompletionService
    service = TripCompletionService(db)
    result = await service.verify_destination_arrival(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        driver_lat=latitude,
        driver_lng=longitude,
    )
    return SuccessResponse(success=True, message="Destination arrival checked", data=result)


@router.post(
    "/rides/{ride_id}/complete",
    response_model=SuccessResponse,
    summary="Driver: Authoritative trip completion, fare calculation & receipt creation",
)
async def complete_ride_endpoint(
    ride_id: str,
    request: CompleteRideSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.trip_completion_service import TripCompletionService
    service = TripCompletionService(db)
    result = await service.complete_ride(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        tolls=request.tolls,
        parking=request.parking,
        payment_method=request.payment_method,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/rides/{ride_id}/receipt",
    response_model=SuccessResponse,
    summary="Driver: Get immutable itemized ride receipt",
)
async def get_ride_receipt_endpoint(
    ride_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.trip_completion_service import TripCompletionService
    service = TripCompletionService(db)
    result = await service.get_ride_receipt(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
    )
    return SuccessResponse(success=True, message="Receipt retrieved", data=result)


@router.post(
    "/rides/{ride_id}/rate-customer",
    response_model=SuccessResponse,
    summary="Driver: Rate passenger 1-5 stars with feedback tags",
)
async def rate_customer_endpoint(
    ride_id: str,
    request: RateCustomerSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.trip_completion_service import TripCompletionService
    service = TripCompletionService(db)
    result = await service.rate_customer(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        rating=request.rating,
        tags=request.tags,
        feedback=request.feedback,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


class RateDriverSchema(BaseModel):
    rating: int  # 1 to 5
    compliments: List[str] = []
    complaint_tags: List[str] = []
    feedback: Optional[str] = None


class TipDriverSchema(BaseModel):
    tip_amount: float
    idempotency_key: Optional[str] = None
    payment_method: Optional[str] = "wallet"


class LostItemReportSchema(BaseModel):
    item_category: str
    description: str
    contact_phone: Optional[str] = None


class TripIssueReportSchema(BaseModel):
    category: str
    description: str


@router.post(
    "/rides/{ride_id}/rate-driver",
    response_model=SuccessResponse,
    summary="Customer: Rate driver 1-5 stars with compliments and review",
)
async def rate_driver_endpoint(
    ride_id: str,
    request: RateDriverSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.rating_feedback_service import RatingFeedbackService
    service = RatingFeedbackService(db)
    result = await service.rate_driver(
        customer_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        rating=request.rating,
        compliments=request.compliments,
        complaint_tags=request.complaint_tags,
        feedback=request.feedback,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.post(
    "/rides/{ride_id}/tip",
    response_model=SuccessResponse,
    summary="Customer: Add driver tip after ride completion",
)
async def tip_driver_endpoint(
    ride_id: str,
    request: TipDriverSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.trip_completion_service import TripCompletionService
    service = TripCompletionService(db)
    result = await service.add_driver_tip(
        customer_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        tip_amount=request.tip_amount,
        idempotency_key=request.idempotency_key,
        payment_method=request.payment_method or "wallet",
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/customer/rides/{ride_id}/receipt",
    response_model=SuccessResponse,
    summary="Customer: Get itemized transparent ride receipt",
)
async def get_customer_ride_receipt_endpoint(
    ride_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.trip_completion_service import TripCompletionService
    service = TripCompletionService(db)
    result = await service.get_customer_ride_receipt(
        customer_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
    )
    return SuccessResponse(success=True, message="Receipt retrieved", data=result)


@router.post(
    "/customer/rides/{ride_id}/lost-item",
    response_model=SuccessResponse,
    summary="Customer: Report lost item left in vehicle",
)
async def report_lost_item_endpoint(
    ride_id: str,
    request: LostItemReportSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.support_ticket_service import SupportTicketService
    from common.models.all_models import RideRequest

    r_res = await db.execute(select(RideRequest).where(RideRequest.id == uuid.UUID(ride_id)))
    ride = r_res.scalar_one_or_none()
    if not ride or ride.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized: User did not participate in this ride")

    service = SupportTicketService(db)
    desc = f"Item: {request.item_category}\nDetails: {request.description}\nContact: {request.contact_phone or current_user.phone or 'User Phone'}"
    res = await service.create_ticket(
        user_id=current_user.id,
        category="TRIPS",
        subcategory="LOST_ITEM",
        subject=f"Lost Item Report: {request.item_category} (Ride #{ride_id[:8]})",
        description=desc,
        priority="high",
        ride_id=ride.id,
    )
    return SuccessResponse(success=True, message="Lost item report submitted to Support Team and Driver.", data=res)


@router.post(
    "/customer/rides/{ride_id}/report-issue",
    response_model=SuccessResponse,
    summary="Customer: Report fare, safety or vehicle issue post-trip",
)
async def report_trip_issue_endpoint(
    ride_id: str,
    request: TripIssueReportSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.support_ticket_service import SupportTicketService
    from common.models.all_models import RideRequest

    r_res = await db.execute(select(RideRequest).where(RideRequest.id == uuid.UUID(ride_id)))
    ride = r_res.scalar_one_or_none()
    if not ride or ride.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized: User did not participate in this ride")

    service = SupportTicketService(db)
    res = await service.create_ticket(
        user_id=current_user.id,
        category="SAFETY" if "SAFETY" in request.category.upper() else "TRIPS",
        subcategory=request.category.upper(),
        subject=f"Trip Issue: {request.category} (Ride #{ride_id[:8]})",
        description=request.description,
        priority="normal",
        ride_id=ride.id,
    )
    return SuccessResponse(success=True, message="Issue reported successfully. Support team notified.", data=res)


@router.get(
    "/driver/earnings/summary",
    response_model=SuccessResponse,
    summary="Driver: Get reconciled financial earnings summary (Today, Week, Month)",
)
async def get_earnings_summary_endpoint(
    period: str = Query("today"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_earnings_service import DriverEarningsService
    service = DriverEarningsService(db)
    result = await service.get_earnings_summary(
        driver_user_id=current_user.user_id_str,
        period=period,
    )
    return SuccessResponse(success=True, message="Earnings summary retrieved", data=result)


@router.get(
    "/driver/earnings/ledger",
    response_model=SuccessResponse,
    summary="Driver: Get immutable double-entry financial ledger history",
)
async def get_ledger_history_endpoint(
    limit: int = Query(30),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_earnings_service import DriverEarningsService
    service = DriverEarningsService(db)
    result = await service.get_ledger_history(
        driver_user_id=current_user.user_id_str,
        limit=limit,
    )
    return SuccessResponse(success=True, message="Ledger history retrieved", data=result)


@router.post(
    "/rides/{ride_id}/tip",
    response_model=SuccessResponse,
    summary="Passenger: Add tip to driver for completed ride",
)
async def add_tip_endpoint(
    ride_id: str,
    request: AddTipSchema,
    db: AsyncSession = Depends(get_db),
):
    from app.services.driver_earnings_service import DriverEarningsService
    service = DriverEarningsService(db)
    result = await service.add_tip(
        ride_id=uuid.UUID(ride_id),
        tip_amount=request.tip_amount,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


# ============================================================
# FEATURE 15: DRIVER WALLET & PAYOUT ENDPOINTS
# ============================================================

from app.services.driver_wallet_service import DriverWalletService
from app.services.driver_performance_service import DriverPerformanceService

class AddPayoutMethodSchema(BaseModel):
    method_type: str  # BANK or UPI
    bank_name: Optional[str] = None
    account_holder_name: Optional[str] = None
    account_number: Optional[str] = None
    confirm_account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    account_type: Optional[str] = "savings"
    upi_id: Optional[str] = None
    is_default: Optional[bool] = False


class WithdrawRequestSchema(BaseModel):
    amount: float
    payout_method_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    simulate_failure: Optional[bool] = False


class AutoPayoutSettingSchema(BaseModel):
    is_enabled: bool
    threshold_amount: float = 2000.0
    frequency: str = "THRESHOLD_ONLY"
    payout_method_type: str = "BANK"
    payout_method_id: Optional[str] = None


@router.get(
    "/driver/wallet/summary",
    response_model=SuccessResponse,
    summary="Driver: Get authoritative ledger-backed wallet summary & balances",
)
async def get_wallet_summary_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DriverWalletService(db)
    summary = await service.get_wallet_summary(driver_user_id=current_user.user_id_str)
    return SuccessResponse(success=True, message="Wallet summary retrieved", data=summary)


@router.post(
    "/driver/wallet/payout-methods",
    response_model=SuccessResponse,
    summary="Driver: Add and verify Bank Account or UPI payout method",
)
async def add_payout_method_endpoint(
    request: AddPayoutMethodSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DriverWalletService(db)
    result = await service.add_payout_method(
        driver_user_id=current_user.user_id_str,
        method_type=request.method_type,
        bank_name=request.bank_name,
        account_holder_name=request.account_holder_name,
        account_number=request.account_number,
        confirm_account_number=request.confirm_account_number,
        ifsc_code=request.ifsc_code,
        account_type=request.account_type or "savings",
        upi_id=request.upi_id,
        is_default=request.is_default or False,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.post(
    "/driver/wallet/payout-methods/{method_id}/default",
    response_model=SuccessResponse,
    summary="Driver: Set default payout destination",
)
async def set_default_payout_method_endpoint(
    method_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DriverWalletService(db)
    result = await service.set_default_payout_method(
        driver_user_id=current_user.user_id_str,
        method_id=method_id,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.delete(
    "/driver/wallet/payout-methods/{method_id}",
    response_model=SuccessResponse,
    summary="Driver: Remove a payout destination",
)
async def delete_payout_method_endpoint(
    method_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DriverWalletService(db)
    result = await service.delete_payout_method(
        driver_user_id=current_user.user_id_str,
        method_id=method_id,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.post(
    "/driver/wallet/withdraw",
    response_model=SuccessResponse,
    summary="Driver: Idempotent withdrawal with row-locking & balance reservation",
)
async def withdraw_funds_endpoint(
    request: WithdrawRequestSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DriverWalletService(db)
    result = await service.request_withdrawal(
        driver_user_id=current_user.user_id_str,
        amount=request.amount,
        payout_method_id=request.payout_method_id,
        idempotency_key=request.idempotency_key,
        simulate_failure=request.simulate_failure or False,
    )
    return SuccessResponse(success=result["success"], message=result["message"], data=result)


@router.get(
    "/driver/wallet/payout-history",
    response_model=SuccessResponse,
    summary="Driver: Get paginated payout transaction history",
)
async def get_payout_history_endpoint(
    page: int = Query(1),
    page_size: int = Query(20),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DriverWalletService(db)
    result = await service.get_payout_history(
        driver_user_id=current_user.user_id_str,
        page=page,
        page_size=page_size,
    )
    return SuccessResponse(success=True, message="Payout history retrieved", data=result)


@router.post(
    "/driver/wallet/auto-payout",
    response_model=SuccessResponse,
    summary="Driver: Configure automatic withdrawal threshold",
)
async def set_auto_payout_endpoint(
    request: AutoPayoutSettingSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DriverWalletService(db)
    result = await service.update_auto_payout_setting(
        driver_user_id=current_user.user_id_str,
        is_enabled=request.is_enabled,
        threshold_amount=request.threshold_amount,
        frequency=request.frequency,
        payout_method_type=request.payout_method_type,
        payout_method_id=request.payout_method_id,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/driver/wallet/settlements",
    response_model=SuccessResponse,
    summary="Driver: Get tax & period settlements breakdown",
)
async def get_settlement_history_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DriverWalletService(db)
    settlements = await service.get_settlement_history(driver_user_id=current_user.user_id_str)
    return SuccessResponse(success=True, message="Settlement records retrieved", data=settlements)


# ============================================================
# FEATURE 16: DRIVER PERFORMANCE ENDPOINTS
# ============================================================

@router.get(
    "/driver/performance/dashboard",
    response_model=SuccessResponse,
    summary="Driver: Get authoritative performance dashboard & reliability metrics",
)
async def get_performance_dashboard_endpoint(
    period: str = Query("today"),  # today, week, month, all
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DriverPerformanceService(db)
    data = await service.get_performance_dashboard(
        driver_user_id=current_user.user_id_str,
        period=period,
    )
    return SuccessResponse(success=True, message="Performance dashboard retrieved", data=data)


@router.post(
    "/driver/session/toggle",
    response_model=SuccessResponse,
    summary="Driver: Authoritative online session start/end tracking",
)
async def toggle_driver_session_endpoint(
    is_online: bool = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    service = DriverPerformanceService(db)
    result = await service.record_session_toggle(
        driver_user_id=current_user.user_id_str,
        is_online=is_online,
    )
    return SuccessResponse(success=True, message="Session status updated", data=result)


# ============================================================
# FEATURE 17: RATING & FEEDBACK ENDPOINTS
# ============================================================

class RateDriverSchema(BaseModel):
    rating: int
    compliments: List[str] = []
    complaint_tags: List[str] = []
    feedback: Optional[str] = None
    cleanliness_rating: Optional[int] = None
    driving_rating: Optional[int] = None
    behaviour_rating: Optional[int] = None
    vehicle_condition_rating: Optional[int] = None


class RateCustomerSchema(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="1 to 5 stars")
    tags: List[str] = []
    feedback: Optional[str] = None


class DisputeRatingSchema(BaseModel):
    dispute_reason: str


class DevSimulateRatingSchema(BaseModel):
    scenario: str = "FIVE_STAR_BOOST"  # FIVE_STAR_BOOST, LOW_RATING_WARNING, RESET_DEFAULTS


@router.post(
    "/rides/{ride_id}/rate-driver",
    response_model=SuccessResponse,
    summary="Customer: Authoritative 1-5 star driver rating with compliments",
)
async def rate_driver_endpoint(
    ride_id: str,
    request: RateDriverSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.rating_feedback_service import RatingFeedbackService
    service = RatingFeedbackService(db)
    result = await service.rate_driver(
        customer_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        rating=request.rating,
        compliments=request.compliments,
        complaint_tags=request.complaint_tags,
        feedback=request.feedback,
        cleanliness_rating=request.cleanliness_rating,
        driving_rating=request.driving_rating,
        behaviour_rating=request.behaviour_rating,
        vehicle_condition_rating=request.vehicle_condition_rating,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.post(
    "/rides/{ride_id}/rate-customer",
    response_model=SuccessResponse,
    summary="Driver: Authoritative 1-5 star customer rating with tags",
)
async def rate_customer_endpoint(
    ride_id: str,
    request: RateCustomerSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.rating_feedback_service import RatingFeedbackService
    service = RatingFeedbackService(db)
    result = await service.rate_customer(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        rating=request.rating,
        tags=request.tags,
        feedback=request.feedback,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/customer/ratings/summary",
    response_model=SuccessResponse,
    summary="Customer: Get overall customer quality score and rating summary",
)
async def get_customer_ratings_summary_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.rating_feedback_service import RatingFeedbackService
    service = RatingFeedbackService(db)
    result = await service.get_customer_ratings_summary(customer_user_id=current_user.user_id_str)
    return SuccessResponse(success=True, message="Customer rating summary retrieved", data=result)


@router.get(
    "/driver/ratings/summary",
    response_model=SuccessResponse,
    summary="Driver: Get authoritative rating breakdown, 30-day trend & compliments",
)
async def get_driver_ratings_summary_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.rating_feedback_service import RatingFeedbackService







    service = RatingFeedbackService(db)
    result = await service.get_driver_ratings_summary(driver_user_id=current_user.user_id_str)
    return SuccessResponse(success=True, message="Rating summary retrieved", data=result)


@router.get(
    "/driver/ratings/history",
    response_model=SuccessResponse,
    summary="Driver: Get anonymized rating feedback history log",
)
async def get_driver_ratings_history_endpoint(
    limit: int = Query(20),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.rating_feedback_service import RatingFeedbackService







    service = RatingFeedbackService(db)
    result = await service.get_driver_ratings_history(
        driver_user_id=current_user.user_id_str,
        limit=limit,
        offset=offset,
    )
    return SuccessResponse(success=True, message="Rating history retrieved", data=result)


@router.post(
    "/driver/ratings/{rating_id}/dispute",
    response_model=SuccessResponse,
    summary="Driver: Submit dispute appeal for moderation review",
)
async def dispute_rating_endpoint(
    rating_id: str,
    request: DisputeRatingSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.rating_feedback_service import RatingFeedbackService







    service = RatingFeedbackService(db)
    result = await service.dispute_rating(
        driver_user_id=current_user.user_id_str,
        rating_id=uuid.UUID(rating_id),
        dispute_reason=request.dispute_reason,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.post(
    "/driver/ratings/dev-simulate",
    response_model=SuccessResponse,
    summary="Developer Mode: Simulate rating breakdown edge cases",
)
async def dev_simulate_rating_endpoint(
    request: DevSimulateRatingSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.rating_feedback_service import RatingFeedbackService







    service = RatingFeedbackService(db)
    result = await service.simulate_ratings_dev_mode(
        driver_user_id=current_user.user_id_str,
        scenario=request.scenario,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


# ============================================================
# FEATURE 20: DESTINATION MODE API
# ============================================================

class SetDestinationModeRequest(BaseModel):
    destination_address: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    preference_mode: str = "balanced"  # flexible, balanced, strict
    max_rides: int = 2
    turn_off: bool = False


class DestinationProgressRequest(BaseModel):
    latitude: float
    longitude: float


@router.post(
    "/destination-mode",
    response_model=SuccessResponse,
    summary="Driver: Set or update destination mode preference",
)
async def set_destination_mode(
    request: SetDestinationModeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DestinationModeService(db)
    result = await service.set_destination_mode(
        driver_id=driver.id,
        destination_address=request.destination_address,
        destination_lat=request.destination_lat,
        destination_lng=request.destination_lng,
        preference_mode=request.preference_mode,
        max_rides=request.max_rides,
        turn_off=request.turn_off,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/destination-mode/status",
    response_model=SuccessResponse,
    summary="Driver: Get active destination mode status and time remaining",
)
async def get_destination_status(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DestinationModeService(db)
    status_data = await service.get_destination_status(driver.id)
    return SuccessResponse(success=True, message="Destination status fetched", data=status_data)


@router.post(
    "/destination-mode/progress",
    response_model=SuccessResponse,
    summary="Driver: Update GPS to check if destination reached",
)
async def check_destination_progress(
    request: DestinationProgressRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DestinationModeService(db)
    res = await service.check_destination_reached_or_progress(
        driver_id=driver.id,
        current_lat=request.latitude,
        current_lng=request.longitude,
    )
    return SuccessResponse(success=True, message="Progress evaluated", data=res)


# ============================================================
# FEATURE 21: BACK-TO-BACK CONTINUOUS DISPATCH API
# ============================================================

class ReserveNextRideRequest(BaseModel):
    next_ride_id: str


class ReleaseNextRideRequest(BaseModel):
    reason: Optional[str] = "Driver delayed or customer request"


@router.get(
    "/rides/{ride_id}/back-to-back/eligibility",
    response_model=SuccessResponse,
    summary="Driver: Check if eligible for next ride offer near dropoff",
)
async def check_back_to_back_eligibility(
    ride_id: str,
    lat: float = Query(..., description="Driver live latitude"),
    lng: float = Query(..., description="Driver live longitude"),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.back_to_back_service import BackToBackService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = BackToBackService(db)
    res = await service.check_back_to_back_eligibility(
        driver_id=driver.id,
        current_ride_id=uuid.UUID(ride_id),
        driver_lat=lat,
        driver_lng=lng,
    )
    return SuccessResponse(success=True, message="Eligibility evaluated", data=res)


@router.get(
    "/rides/{ride_id}/back-to-back/candidates",
    response_model=SuccessResponse,
    summary="Driver: Discover candidate next rides near current dropoff",
)
async def discover_back_to_back_candidates(
    ride_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.back_to_back_service import BackToBackService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = BackToBackService(db)
    candidates = await service.discover_next_ride_candidates(
        driver_id=driver.id,
        current_ride_id=uuid.UUID(ride_id),
    )
    return SuccessResponse(success=True, message=f"Found {len(candidates)} next ride candidates", data=candidates)


@router.post(
    "/rides/{ride_id}/back-to-back/reserve",
    response_model=SuccessResponse,
    summary="Driver: Atomically reserve next ride to start after current dropoff",
)
async def reserve_back_to_back_ride(
    ride_id: str,
    request: ReserveNextRideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.back_to_back_service import BackToBackService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = BackToBackService(db)
    res = await service.reserve_next_ride(
        driver_id=driver.id,
        current_ride_id=uuid.UUID(ride_id),
        next_ride_id=uuid.UUID(request.next_ride_id),
    )
    return SuccessResponse(success=True, message=res["message"], data=res)


@router.post(
    "/rides/{ride_id}/back-to-back/release",
    response_model=SuccessResponse,
    summary="Driver: Release reserved next ride if delayed or detoured",
)
async def release_back_to_back_ride(
    ride_id: str,
    request: ReleaseNextRideRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.back_to_back_service import BackToBackService
    service = BackToBackService(db)
    res = await service.release_next_ride_reservation(
        current_ride_id=uuid.UUID(ride_id),
        reason=request.reason or "Driver requested release",
    )
    return SuccessResponse(success=True, message=res["message"], data=res)


# ============================================================
# FEATURE 22: DRIVER SAFETY INTELLIGENCE API
# ============================================================

class SafetySOSTriggerRequest(BaseModel):
    ride_id: str
    latitude: float
    longitude: float
    accuracy: float = 10.0
    reason: Optional[str] = "Emergency SOS triggered from driver app"


class AddTrustedContactRequest(BaseModel):
    name: str
    phone: str
    relationship: str = "Family"


class SafetyAlertRecordRequest(BaseModel):
    ride_id: Optional[str] = None
    alert_type: str  # ROUTE_DEVIATION, LONG_STOP, OVERSPEED
    severity: str = "WARNING"
    latitude: float
    longitude: float
    details: dict = {}


class SafetyAlertResolveRequest(BaseModel):
    resolution_type: str = "IM_SAFE"  # IM_SAFE, DISMISSED, SUPPORT_CALL


class SafetyIncidentSubmitRequest(BaseModel):
    ride_id: Optional[str] = None
    incident_category: str  # UNSAFE_PASSENGER, ACCIDENT, ROAD_HAZARD, VEHICLE_ISSUE, MEDICAL_EMERGENCY, HARASSMENT, OTHER
    severity: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    description: str
    evidence_urls: list[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@router.post(
    "/safety/sos",
    response_model=SuccessResponse,
    summary="Customer/Driver: Authoritative Emergency SOS Trigger with 112 Police Alert",
)
async def trigger_emergency_sos(
    request: SafetySOSTriggerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.safety_sos_service import SafetySOSService
    from common.models.all_models import Driver, RideRequest

    ride_res = await db.execute(select(RideRequest).where(RideRequest.id == uuid.UUID(request.ride_id)))
    ride = ride_res.scalar_one_or_none()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride request not found")

    # Determine role & verify participation
    if current_user.role == "driver":
        d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
        driver = d_res.scalar_one_or_none()
        if not driver or ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized: Driver not assigned to this ride")
        role = "driver"
    else:
        if ride.customer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized: User did not participate in this ride")
        role = "customer"

    service = SafetySOSService(db)
    res = await service.trigger_sos(
        user_id=current_user.user_id_str,
        role=role,
        ride_id=ride.id,
        latitude=request.latitude,
        longitude=request.longitude,
        accuracy=request.accuracy,
        reason=request.reason or f"{role.capitalize()} Emergency SOS",
    )
    return SuccessResponse(success=True, message=res["message"], data=res)


@router.post(
    "/safety/trusted-contacts",
    response_model=SuccessResponse,
    summary="Driver: Add emergency trusted contact",
)
async def add_trusted_contact(
    request: AddTrustedContactRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.add_trusted_contact(
        driver_id=driver.id,
        name=request.name,
        phone=request.phone,
        relationship=request.relationship,
    )
    return SuccessResponse(success=True, message="Trusted contact added", data=res)


@router.get(
    "/safety/trusted-contacts",
    response_model=SuccessResponse,
    summary="Driver: Get list of trusted emergency contacts",
)
async def get_trusted_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    contacts = await service.get_trusted_contacts(driver.id)
    return SuccessResponse(success=True, message=f"Loaded {len(contacts)} contacts", data=contacts)


@router.delete(
    "/safety/trusted-contacts/{contact_id}",
    response_model=SuccessResponse,
    summary="Driver: Remove trusted contact",
)
async def delete_trusted_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.delete_trusted_contact(driver.id, uuid.UUID(contact_id))
    return SuccessResponse(success=True, message=res["message"], data=res)


@router.post(
    "/safety/rides/{ride_id}/share",
    response_model=SuccessResponse,
    summary="Customer/Driver: Create tokenized live trip sharing link",
)
async def create_live_trip_share(
    ride_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver, RideRequest

    r_res = await db.execute(select(RideRequest).where(RideRequest.id == uuid.UUID(ride_id)))
    ride = r_res.scalar_one_or_none()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    driver_id = ride.assigned_driver_id
    if not driver_id:
        d_res = await db.execute(select(Driver).limit(1))
        d_sample = d_res.scalar_one_or_none()
        driver_id = d_sample.id if d_sample else uuid.uuid4()

    service = DriverSafetyService(db)
    res = await service.create_live_trip_share(driver_id, ride.id)
    return SuccessResponse(success=True, message=res["message"], data=res)


@router.get(
    "/safety/share/{share_token}",
    response_model=SuccessResponse,
    summary="Public: Track live trip by share token (read-only, no PII)",
)
async def get_shared_trip_telemetry(
    share_token: str,
    db: AsyncSession = Depends(get_db),
):
    from app.services.driver_safety_service import DriverSafetyService
    service = DriverSafetyService(db)
    res = await service.get_shared_trip_telemetry(share_token)
    return SuccessResponse(success=True, message="Shared trip telemetry fetched", data=res)


@router.post(
    "/safety/alerts",
    response_model=SuccessResponse,
    summary="Driver: Record safety alert anomaly (deviation, long stop, speed)",
)
async def record_safety_alert(
    request: SafetyAlertRecordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.record_safety_alert(
        driver_id=driver.id,
        ride_id=uuid.UUID(request.ride_id) if request.ride_id else None,
        alert_type=request.alert_type,
        severity=request.severity,
        latitude=request.latitude,
        longitude=request.longitude,
        details=request.details,
    )
    return SuccessResponse(success=True, message="Safety alert logged", data=res)


@router.post(
    "/safety/alerts/{alert_id}/resolve",
    response_model=SuccessResponse,
    summary="Driver: Resolve safety warning ('I'm Safe' acknowledgment)",
)
async def resolve_safety_alert(
    alert_id: str,
    request: SafetyAlertResolveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.resolve_safety_alert(
        driver_id=driver.id,
        alert_id=uuid.UUID(alert_id),
        resolution_type=request.resolution_type,
    )
    return SuccessResponse(success=True, message=res["message"], data=res)


@router.post(
    "/safety/incidents",
    response_model=SuccessResponse,
    summary="Driver: Report safety incident (unsafe passenger, accident, harassment)",
)
async def report_safety_incident(
    request: SafetyIncidentSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.driver_safety_service import DriverSafetyService
    from common.models.all_models import Driver
    d_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = d_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSafetyService(db)
    res = await service.report_safety_incident(
        driver_id=driver.id,
        ride_id=uuid.UUID(request.ride_id) if request.ride_id else None,
        incident_category=request.incident_category,
        severity=request.severity,
        description=request.description,
        evidence_urls=request.evidence_urls,
        latitude=request.latitude,
        longitude=request.longitude,
    )
    return SuccessResponse(success=True, message=res["message"], data=res)


# ============================================================
# FEATURE 23: AI / SMART DRIVER ASSISTANCE ENDPOINTS
# ============================================================

@router.get("/ai/driver-insights")
async def get_driver_ai_insights(
    lat: Optional[float] = 18.5204,
    lng: Optional[float] = 73.8567,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns real-time AI summary: predicted hourly rate, demand trend, best zone, and fatigue state.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = AISmartDriverService(db)
    return await service.get_driver_ai_insights(driver.id, current_lat=lat, current_lng=lng)


@router.get("/ai/demand-forecast")
async def get_demand_forecast(
    lat: Optional[float] = 18.5204,
    lng: Optional[float] = 73.8567,
    radius_km: Optional[float] = 20.0,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns spatial demand forecast zones with 15m/30m/60m surge projections (PostGIS-backed).
    """
    service = AISmartDriverService(db)
    return await service.get_demand_forecast(lat=lat, lng=lng, radius_km=radius_km)


@router.get("/ai/best-zones")
async def get_best_zones(
    lat: Optional[float] = 18.5204,
    lng: Optional[float] = 73.8567,
    limit: Optional[int] = 5,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns ranked high-opportunity zones near driver with distance, road ETA, and surge multiplier.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = AISmartDriverService(db)
    return await service.get_best_zones(driver.id, lat=lat, lng=lng, limit=limit)


@router.get("/ai/earnings-prediction")
async def get_earnings_prediction(
    timeframe: Optional[str] = "hourly",
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns estimated earnings projections based on historical double-entry ledger.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = AISmartDriverService(db)
    return await service.get_earnings_prediction(driver.id, timeframe=timeframe)


@router.get("/ai/fatigue-status")
async def get_fatigue_status(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns continuous driving duration and safe break recommendations.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = AISmartDriverService(db)
    return await service.get_fatigue_status(driver.id)


@router.post("/ai/fatigue-break-taken")
async def record_fatigue_break_taken(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Acknowledge rest break taken by driver and log to fatigue ledger.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = AISmartDriverService(db)
    return await service.record_fatigue_break(driver.id)


@router.post("/ai/report-risk-signal")
async def report_risk_signal(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Records internal GPS/telemetry anomalies (impossible speed, fake GPS jump).
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    signal_type = payload.get("signal_type", "SENSOR_MISMATCH")
    details = payload.get("details_json", {})
    ride_id = uuid.UUID(payload["ride_id"]) if payload.get("ride_id") else None

    service = AISmartDriverService(db)
    return await service.evaluate_risk_signal(driver.id, signal_type, details, ride_id=ride_id)


@router.post("/ai/dev-simulate")
async def simulate_ai_dev_scenario(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Developer Mode simulator for testing 10+ AI states safely.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    scenario_key = payload.get("scenario_key", "RESET_ALL")
    service = AISmartDriverService(db)
    return await service.simulate_dev_scenario(driver.id, scenario_key)


# ============================================================
# FEATURE 24: IN-APP SUPPORT & TICKET SYSTEM ENDPOINTS
# ============================================================

@router.get("/support/faq-categories")
async def get_support_faq_categories(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns 9 structured support categories with article counts.
    """
    service = SupportTicketService(db)
    return await service.get_faq_categories()


@router.get("/support/faqs")
async def get_faqs(
    category: Optional[str] = None,
    q: Optional[str] = None,
    limit: Optional[int] = 20,
    offset: Optional[int] = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Searches and filters FAQ articles by category and search keyword.
    """
    service = SupportTicketService(db)
    return await service.get_faqs(category=category, search_query=q, limit=limit, offset=offset)


@router.post("/support/faqs/{faq_id}/feedback")
async def vote_faq_feedback(
    faq_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Votes helpful (+1) or unhelpful (+1) on an FAQ article.
    """
    is_helpful = payload.get("is_helpful", True)
    service = SupportTicketService(db)
    return await service.vote_faq_feedback(faq_id, is_helpful)


@router.post("/support/tickets")
async def create_support_ticket(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Raises a new support ticket with strict driver ownership validation on ride_id.
    """
    category = payload.get("category", "GENERAL")
    subcategory = payload.get("subcategory", "OTHER")
    subject = payload.get("subject", "Support Request")
    description = payload.get("description", "")
    priority = payload.get("priority", "normal")
    ride_id = uuid.UUID(payload["ride_id"]) if payload.get("ride_id") else None
    payout_id = uuid.UUID(payload["payout_request_id"]) if payload.get("payout_request_id") else None

    if not description:
        raise HTTPException(status_code=400, detail="Ticket description is required")

    service = SupportTicketService(db)
    return await service.create_ticket(
        user_id=current_user.id,
        category=category,
        subcategory=subcategory,
        subject=subject,
        description=description,
        priority=priority,
        ride_id=ride_id,
        payout_request_id=payout_id
    )


@router.get("/support/tickets")
async def get_driver_tickets(
    status: Optional[str] = None,
    limit: Optional[int] = 20,
    offset: Optional[int] = 0,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns paginated ticket history scoped strictly to authenticated driver.
    """
    service = SupportTicketService(db)
    return await service.get_driver_tickets(
        user_id=current_user.id,
        status_filter=status,
        limit=limit,
        offset=offset
    )


@router.get("/support/tickets/{ticket_id}")
async def get_ticket_details(
    ticket_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns ticket details and full conversation history. Scoped strictly to owner.
    """
    service = SupportTicketService(db)
    return await service.get_ticket_details(user_id=current_user.id, ticket_id=ticket_id)


@router.post("/support/tickets/{ticket_id}/messages")
async def send_ticket_message(
    ticket_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sends a message in the ticket thread (Driver -> Agent).
    """
    message_text = payload.get("message_text", "")
    if not message_text.strip():
        raise HTTPException(status_code=400, detail="Message text is required")

    service = SupportTicketService(db)
    return await service.send_ticket_message(
        user_id=current_user.id,
        ticket_id=ticket_id,
        message_text=message_text,
        sender_type="DRIVER"
    )


@router.post("/support/tickets/{ticket_id}/reopen")
async def reopen_ticket(
    ticket_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reopens a resolved or closed ticket if driver needs further assistance.
    """
    reason = payload.get("reason", "Issue still not resolved")
    service = SupportTicketService(db)
    return await service.reopen_ticket(user_id=current_user.id, ticket_id=ticket_id, reason=reason)


@router.post("/support/dev-simulate")
async def simulate_support_dev_scenario(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Developer Mode simulator for Support Agent replies and resolutions.
    """
    scenario_key = payload.get("scenario_key", "AGENT_REPLY")
    ticket_id = uuid.UUID(payload["ticket_id"]) if payload.get("ticket_id") else None
    service = SupportTicketService(db)
    return await service.simulate_dev_scenario(
        user_id=current_user.id,
        scenario_key=scenario_key,
        ticket_id=ticket_id
    )


# ============================================================
# FEATURE 18: INCENTIVES & PROMOTIONS ENDPOINTS
# ============================================================

@router.get("/driver/incentives/hub")
async def get_driver_incentives_hub(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns unified Opportunities & Incentives hub with active quests, shift guarantee,
    referral stats, and potential bonus earnings.
    """
    service = IncentivesPromotionsService(db)
    return await service.get_driver_promotions_hub(str(current_user.id))


@router.get("/driver/referrals/summary")
async def get_driver_referrals_summary(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns driver referral code, invited partners progress, and total referral earnings.
    """
    service = IncentivesPromotionsService(db)
    return await service.get_referral_summary(str(current_user.id))


class DevIncentiveSimulateRequest(BaseModel):
    scenario: str  # PROGRESS_DAILY_QUEST, COMPLETE_DAILY_QUEST, TRIGGER_GUARANTEE_TOPUP, SIMULATE_REFERRAL_QUALIFIED, RESET_DEFAULTS


@router.post("/driver/incentives/dev-simulate")
async def simulate_driver_incentive_dev(
    body: DevIncentiveSimulateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Developer sandbox simulator for Feature 18 testing.
    """
    service = IncentivesPromotionsService(db)
    return await service.simulate_incentives_dev_mode(
        driver_user_id=str(current_user.id),
        scenario=body.scenario,
    )


# ============================================================
# FEATURE 19: DEMAND / HEATMAP & SURGE ENDPOINTS
# ============================================================

@router.get("/demand/heatmap")
async def get_demand_heatmap(
    city: str = "Pune",
    lat: float = 18.5204,
    lng: float = 73.8567,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns weighted PostGIS heatmap coordinates with 200m privacy blurring.
    Backed by 30s Redis cache. Zero Google Maps API calls.
    """
    service = DemandHeatmapService(db)
    return await service.get_heatmap_points(city_name=city, driver_lat=lat, driver_lng=lng)


@router.get("/demand/hotspots")
async def get_demand_hotspots(
    lat: float = 18.5204,
    lng: float = 73.8567,
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns ranked high-demand surge zones with internal distance and road ETA.
    """
    service = DemandHeatmapService(db)
    return await service.get_active_hotspots(driver_lat=lat, driver_lng=lng, limit=limit)


@router.get("/demand/expected-timeline")
async def get_expected_demand_timeline(
    lat: float = 18.5204,
    lng: float = 73.8567,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns predictive 6-hour expected demand curve and surge projections.
    """
    service = DemandHeatmapService(db)
    return await service.get_expected_demand_timeline(driver_lat=lat, driver_lng=lng)


class DevDemandSimulateRequest(BaseModel):
    scenario: str  # INJECT_AIRPORT_SURGE, RAIN_SPIKE_HEATMAP, HINJAWADI_EVENING_RUSH, RESET_DEFAULTS


@router.post("/demand/dev-simulate")
async def simulate_demand_dev(
    body: DevDemandSimulateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Developer sandbox simulator for Feature 19.
    """
    service = DemandHeatmapService(db)
    return await service.simulate_demand_dev_mode(scenario=body.scenario)


# ============================================================
# FEATURE 25: NOTIFICATION CENTER & PREFERENCES ENDPOINTS
# ============================================================

@router.get("/notifications")
async def get_notifications_feed(
    category: Optional[str] = None,
    unread_only: Optional[bool] = False,
    limit: Optional[int] = 30,
    offset: Optional[int] = 0,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns paginated notification feed strictly scoped to authenticated user.
    """
    service = NotificationCenterService(db)
    return await service.get_notifications(
        user_id=current_user.id,
        category=category,
        is_unread_only=unread_only or False,
        limit=limit,
        offset=offset
    )


@router.get("/notifications/unread-count")
async def get_notification_unread_count(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns active unread notification counter for badges.
    """
    service = NotificationCenterService(db)
    count = await service.get_unread_count(user_id=current_user.id)
    return {"unread_count": count}


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marks single notification as read.
    """
    service = NotificationCenterService(db)
    return await service.mark_as_read(user_id=current_user.id, notification_id=notification_id)


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk marks all unread notifications for authenticated user as read.
    """
    service = NotificationCenterService(db)
    return await service.mark_all_as_read(user_id=current_user.id)


@router.delete("/notifications/{notification_id}")
async def delete_notification_item(
    notification_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dismisses / deletes a notification item.
    """
    service = NotificationCenterService(db)
    return await service.delete_notification(user_id=current_user.id, notification_id=notification_id)


@router.get("/notifications/preferences")
async def get_driver_notification_preferences(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches driver notification category preferences.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = NotificationCenterService(db)
    return await service.get_preferences(driver_id=driver.id)


@router.put("/notifications/preferences")
async def update_driver_notification_preferences(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates driver notification category preferences.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = NotificationCenterService(db)
    return await service.update_preferences(driver_id=driver.id, payload=payload)


@router.post("/notifications/dev-simulate")
async def simulate_notification_dev_scenario(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Developer Mode sandbox simulator for dispatching test notification alerts.
    """
    scenario_key = payload.get("scenario_key", "TRIP_ALERT")
    service = NotificationCenterService(db)
    return await service.simulate_dev_scenario(user_id=current_user.id, scenario_key=scenario_key)


# ============================================================
# FEATURE 26: SCHEDULED / RESERVED TRIPS ENDPOINTS
# ============================================================

@router.get("/scheduled/available")
async def get_available_scheduled_rides(
    limit: Optional[int] = 20,
    offset: Optional[int] = 0,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of open, unassigned advance scheduled bookings.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    service = ScheduledRideService(db)
    return await service.get_available_scheduled_rides(
        driver_id=driver.id if driver else None,
        limit=limit,
        offset=offset
    )


@router.post("/scheduled/{ride_id}/accept")
async def accept_scheduled_reservation(
    ride_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Atomically claims an advance scheduled booking for driver with SELECT FOR UPDATE row locking.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = ScheduledRideService(db)
    return await service.accept_scheduled_reservation(driver_id=driver.id, ride_id=ride_id)


@router.get("/scheduled/upcoming")
async def get_upcoming_scheduled_trips(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns upcoming confirmed advance reservations for the authenticated driver.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = ScheduledRideService(db)
    return await service.get_driver_scheduled_trips(driver_id=driver.id)


@router.post("/scheduled/{ride_id}/start-heading")
async def start_heading_to_scheduled_pickup(
    ride_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Transitions reserved scheduled trip into active DISPATCHED state.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = ScheduledRideService(db)
    return await service.start_heading_to_scheduled_pickup(driver_id=driver.id, ride_id=ride_id)


@router.post("/scheduled/{ride_id}/cancel")
async def cancel_scheduled_reservation(
    ride_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancels a reserved scheduled ride with early vs late policy enforcement.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    reason = payload.get("reason", "Driver emergency")
    service = ScheduledRideService(db)
    return await service.cancel_scheduled_reservation(driver_id=driver.id, ride_id=ride_id, reason=reason)


@router.post("/scheduled/auto-release-check")
async def check_scheduled_auto_releases(
    db: AsyncSession = Depends(get_db)
):
    """
    Background worker endpoint: Automatically releases unfulfilled reservations back to open pool.
    """
    service = ScheduledRideService(db)
    return await service.check_and_auto_release_expired()


@router.post("/scheduled/dev-simulate")
async def simulate_scheduled_dev_scenario(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Developer Mode sandbox simulator for seeding scheduled bookings and testing edge cases.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    scenario_key = payload.get("scenario_key", "SEED_AVAILABLE_SCHEDULED_RIDES")

    service = ScheduledRideService(db)
    return await service.simulate_dev_scenario(
        driver_id=driver.id if driver else uuid.uuid4(),
        scenario_key=scenario_key
    )


# ============================================================
# FEATURE 27: TRIP HISTORY & DETAILED RECEIPTS ENDPOINTS
# ============================================================

@router.get("/history/trips")
async def get_driver_trip_history(
    status: Optional[str] = "ALL",
    period: Optional[str] = "ALL_TIME",
    limit: Optional[int] = 25,
    offset: Optional[int] = 0,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns paginated trip history feed strictly scoped to authenticated driver.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = TripHistoryService(db)
    return await service.get_driver_trip_history(
        driver_id=driver.id,
        status_filter=status or "ALL",
        date_filter=period or "ALL_TIME",
        limit=limit or 25,
        offset=offset or 0
    )


@router.get("/history/trips/{ride_id}")
async def get_trip_receipt_details(
    ride_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns full transparent itemized financial breakdown, route timeline, and customer feedback.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = TripHistoryService(db)
    return await service.get_trip_receipt_details(driver_id=driver.id, ride_id=ride_id)


@router.get("/history/trips/{ride_id}/export")
async def export_trip_receipt_statement(
    ride_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates formatted receipt document text for printing or export.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = TripHistoryService(db)
    return await service.export_trip_receipt(driver_id=driver.id, ride_id=ride_id)


@router.post("/history/dev-simulate")
async def simulate_history_dev_scenario(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Developer Mode sandbox simulator for seeding historical trips and receipts.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    scenario_key = payload.get("scenario_key", "SEED_COMPLETED_TRIP_HISTORY")

    service = TripHistoryService(db)
    return await service.simulate_dev_scenario(
        driver_id=driver.id if driver else uuid.uuid4(),
        scenario_key=scenario_key
    )


# ============================================================
# FEATURE 28: DRIVER APP SETTINGS & PREFERENCES ENDPOINTS
# ============================================================

@router.get("/settings")
async def get_driver_settings(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves app preferences and configuration for authenticated driver.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSettingsService(db)
    return await service.get_driver_settings(driver_id=driver.id)


@router.patch("/settings")
async def update_driver_settings(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates driver app preferences (language, navigation, audio, auto-accept).
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSettingsService(db)
    return await service.update_driver_settings(driver_id=driver.id, payload=payload)


@router.get("/settings/diagnostics")
async def run_driver_diagnostics(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Runs device, network latency, and spatial telemetry diagnostic check.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSettingsService(db)
    return await service.run_diagnostics(driver_id=driver.id)


@router.post("/settings/deactivate")
async def request_account_deactivation(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits self-service account deactivation / data privacy request.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service = DriverSettingsService(db)
    reason = payload.get("reason", "Driver personal decision")
    return await service.request_account_deactivation(driver_id=driver.id, reason=reason)


@router.post("/settings/dev-simulate")
async def simulate_settings_dev_scenario(
    payload: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Developer Mode sandbox simulator for settings testing.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    scenario_key = payload.get("scenario_key", "RESET_SETTINGS_DEFAULTS")

    service = DriverSettingsService(db)
    return await service.simulate_dev_scenario(
        driver_id=driver.id if driver else uuid.uuid4(),
        scenario_key=scenario_key
    )
