import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
matching_api_path = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")
ws_main_path = os.path.join(backend_root, "websocket-gateway", "app", "main.py")

# 1. Update matching.py
with open(matching_api_path, "r", encoding="utf-8") as f:
    matching_content = f.read()

new_routes_code = '''
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
'''

if "/rides/respond" not in matching_content:
    matching_content += "\n" + new_routes_code
    with open(matching_api_path, "w", encoding="utf-8") as f:
        f.write(matching_content)
    print("[OK] Updated matching.py with ride endpoints")

# 2. Update websocket-gateway main.py with ride_request_respond handler
with open(ws_main_path, "r", encoding="utf-8") as f:
    ws_content = f.read()

ws_ride_handler = '''
@sio.event
async def ride_request_respond(sid, data):
    """
    Driver accepts or rejects an on-demand RIDE_REQUEST_NEW offer.
    Stores response in Redis for RideDispatchService sequential queue.
    """
    client = _connected_clients.get(sid, {})
    offer_id = data.get("offer_id")
    accepted = data.get("accepted", False)
    rejection_reason = data.get("rejection_reason")
    driver_id = client.get("user_id")

    if not offer_id:
        return

    r = await get_redis()
    response_key = f"ride_offer:response:{offer_id}"
    await r.setex(response_key, 60, "accepted" if accepted else "rejected")
    logger.info("Driver responded to ride offer via WS", driver_id=driver_id, offer_id=offer_id, accepted=accepted)

    await sio.emit("RIDE_OFFER_ACK", {
        "offer_id": offer_id,
        "accepted": accepted,
    }, to=sid)
'''

if "async def ride_request_respond" not in ws_content:
    # Insert before socket_app = socketio.ASGIApp
    target = "# \n# Mount as ASGI"
    if target in ws_content:
        ws_content = ws_content.replace(target, ws_ride_handler + "\n\n" + target)
    else:
        ws_content += "\n" + ws_ride_handler

    with open(ws_main_path, "w", encoding="utf-8") as f:
        f.write(ws_content)
    print("[OK] Updated websocket-gateway main.py with ride_request_respond handler")
