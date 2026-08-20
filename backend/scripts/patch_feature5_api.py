"""
Patch Feature 5 Ride Dispatch API endpoints and methods:
- Add get_active_ride_for_driver and get_categories to RideDispatchService
- Register POST /rides/respond, GET /rides/active, GET /rides/categories, POST /rides/cancel in matching.py
"""
import os
import sys

matching_service_path = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\matching-service"
dispatch_file = os.path.join(matching_service_path, "app", "services", "ride_dispatch.py")
api_file = os.path.join(matching_service_path, "app", "api", "v1", "matching.py")

# 1. Patch ride_dispatch.py
with open(dispatch_file, "r", encoding="utf-8") as f:
    dispatch_content = f.read()

methods_to_add = '''
    async def get_active_ride_for_driver(self, driver_user_id: str) -> Optional[dict]:
        """
        Fetches the current active ride or pending ride offer for a driver.
        """
        d_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = d_res.scalar_one_or_none()
        if not driver:
            return None

        # 1. Check for active assigned / in-progress ride
        ride_res = await self.db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.assigned_driver_id == driver.id,
                    RideRequest.status.in_([
                        RideRequestStatus.ASSIGNED,
                        RideRequestStatus.PICKUP,
                        RideRequestStatus.IN_PROGRESS
                    ])
                )
            )
        )
        active_ride = ride_res.scalar_one_or_none()
        if active_ride:
            return {
                "ride_id": str(active_ride.id),
                "ride_request_id": str(active_ride.id),
                "status": active_ride.status.value,
                "pickup_address": active_ride.pickup_address,
                "pickup_lat": active_ride.pickup_lat,
                "pickup_lng": active_ride.pickup_lng,
                "destination_address": active_ride.destination_address,
                "destination_lat": active_ride.destination_lat,
                "destination_lng": active_ride.destination_lng,
                "fare": float(active_ride.estimated_fare or 0),
                "distance_km": active_ride.estimated_distance_km,
                "duration_min": active_ride.estimated_duration_min,
                "seats_requested": active_ride.seats_requested,
                "is_active": True
            }

        # 2. Check for active pending offer
        now = datetime.utcnow()
        offer_res = await self.db.execute(
            select(RideOffer).where(
                and_(
                    RideOffer.driver_id == driver.id,
                    RideOffer.status == RideOfferStatus.PENDING,
                    RideOffer.expires_at > now
                )
            ).order_by(RideOffer.created_at.desc())
        )
        pending_offer = offer_res.scalar_one_or_none()
        if pending_offer:
            req_res = await self.db.execute(
                select(RideRequest).where(RideRequest.id == pending_offer.ride_request_id)
            )
            req = req_res.scalar_one_or_none()
            if req:
                return {
                    "offer_id": str(pending_offer.id),
                    "ride_id": str(req.id),
                    "ride_request_id": str(req.id),
                    "status": "OFFERED",
                    "pickup_address": req.pickup_address,
                    "pickup_lat": req.pickup_lat,
                    "pickup_lng": req.pickup_lng,
                    "destination_address": req.destination_address,
                    "destination_lat": req.destination_lat,
                    "destination_lng": req.destination_lng,
                    "fare": float(req.estimated_fare or 0),
                    "earning": float(pending_offer.estimated_earning or 0),
                    "distance_km": req.estimated_distance_km,
                    "duration_min": req.estimated_duration_min,
                    "seats_requested": req.seats_requested,
                    "expires_at": pending_offer.expires_at.isoformat() if pending_offer.expires_at else None,
                    "is_active": False,
                    "is_offer": True
                }

        return None

    async def get_categories(self) -> List[dict]:
        """
        Returns all active ride categories.
        """
        res = await self.db.execute(
            select(RideCategory).where(RideCategory.is_active == True).order_by(RideCategory.sort_order.asc())
        )
        cats = res.scalars().all()
        return [
            {
                "id": str(c.id),
                "name": c.name,
                "display_name": c.display_name,
                "base_fare": float(c.base_fare),
                "per_km_rate": float(c.per_km_rate),
                "per_min_rate": float(c.per_min_rate),
                "min_fare": float(c.min_fare),
                "platform_commission_pct": c.platform_commission_pct,
                "icon_name": c.icon_name,
            }
            for c in cats
        ]
'''

if "def get_active_ride_for_driver" not in dispatch_content:
    # Append inside class RideDispatchService
    dispatch_content += "\n" + methods_to_add
    with open(dispatch_file, "w", encoding="utf-8") as f:
        f.write(dispatch_content)
    print("Patched ride_dispatch.py with get_active_ride_for_driver and get_categories")
else:
    print("ride_dispatch.py already contains get_active_ride_for_driver")

# 2. Patch matching.py with routes
with open(api_file, "r", encoding="utf-8") as f:
    api_content = f.read()

routes_to_add = '''

# ============================================================
# FEATURE 5: ON-DEMAND RIDE DISPATCH ENDPOINTS
# ============================================================

class RideRespondRequest(BaseModel):
    offer_id: str
    accepted: bool
    rejection_reason: Optional[str] = None


@router.post("/rides/respond")
async def respond_to_ride_offer(
    payload: RideRespondRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Accepts or rejects an incoming 180s on-demand ride offer.
    """
    from app.services.ride_dispatch import RideDispatchService
    service = RideDispatchService(db)
    res = await service.respond_to_offer(
        driver_user_id=str(current_user.id),
        offer_id=payload.offer_id,
        accepted=payload.accepted,
        rejection_reason=payload.rejection_reason
    )
    return res


@router.get("/rides/active")
async def get_driver_active_ride(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the current active ride or pending ride offer for the driver.
    """
    from app.services.ride_dispatch import RideDispatchService
    service = RideDispatchService(db)
    active = await service.get_active_ride_for_driver(str(current_user.id))
    return {"success": True, "data": active}


@router.get("/rides/categories")
async def get_ride_categories(
    db: AsyncSession = Depends(get_db)
):
    """
    Returns available ride categories with fare rates and commission percentages.
    """
    from app.services.ride_dispatch import RideDispatchService
    service = RideDispatchService(db)
    categories = await service.get_categories()
    return {"success": True, "data": categories}
'''

if "def respond_to_ride_offer" not in api_content:
    api_content += "\n" + routes_to_add
    with open(api_file, "w", encoding="utf-8") as f:
        f.write(api_content)
    print("Patched matching.py with Feature 5 routes")
else:
    print("matching.py already contains Feature 5 routes")
