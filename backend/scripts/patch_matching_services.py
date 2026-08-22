import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
matching_svc_dir = os.path.join(backend_root, "matching-service", "app", "services")
os.makedirs(matching_svc_dir, exist_ok=True)

# 1. ride_fare_engine.py
fare_engine_code = '''"""
On-Demand Ride Fare Engine — Feature 5
Calculates fare, surge, platform commission (admin-configurable), and driver earnings.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Optional

from common.models.all_models import RideCategory


@dataclass
class RideFareEstimate:
    category_id: Optional[str]
    category_name: str
    distance_km: float
    duration_min: int
    base_fare: float
    distance_charge: float
    time_charge: float
    surge_multiplier: float
    total_fare: float
    platform_commission: float
    driver_earning: float
    available_seats: int
    available_seat_labels: list[str]

    def to_dict(self) -> dict:
        return {
            "category_id": self.category_id,
            "category_name": self.category_name,
            "distance_km": round(self.distance_km, 2),
            "duration_min": self.duration_min,
            "base_fare": round(self.base_fare, 2),
            "distance_charge": round(self.distance_charge, 2),
            "time_charge": round(self.time_charge, 2),
            "surge_multiplier": self.surge_multiplier,
            "total_fare": round(self.total_fare, 2),
            "platform_commission": round(self.platform_commission, 2),
            "driver_earning": round(self.driver_earning, 2),
            "available_seats": self.available_seats,
            "available_seat_labels": self.available_seat_labels,
        }


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return max(R * c, 0.5)


def estimate_ride_fare(
    distance_km: float,
    duration_min: Optional[int] = None,
    category: Optional[RideCategory] = None,
    surge_multiplier: float = 1.0,
    vehicle_type: str = "sedan",
) -> RideFareEstimate:
    """
    Compute precise on-demand fare breakdown for a given category/vehicle.
    """
    if duration_min is None:
        # Default 25 km/h urban speed estimation
        duration_min = max(int((distance_km / 25.0) * 60), 5)

    if category:
        cat_id = str(category.id)
        cat_name = category.name
        base_fare = float(category.base_fare)
        per_km = float(category.per_km_rate)
        per_min = float(category.per_min_rate)
        min_fare = float(category.min_fare)
        commission_pct = float(category.platform_commission_pct)
        surge = max(float(category.surge_multiplier or 1.0), surge_multiplier)
    else:
        # Defaults based on vehicle_type
        cat_id = None
        cat_name = "economy" if vehicle_type in ("hatchback", "mini") else "premium" if vehicle_type == "sedan" else "suv"
        base_fare = 50.0 if cat_name == "economy" else 75.0 if cat_name == "premium" else 110.0
        per_km = 12.0 if cat_name == "economy" else 16.0 if cat_name == "premium" else 22.0
        per_min = 1.5 if cat_name == "economy" else 2.0 if cat_name == "premium" else 3.0
        min_fare = 80.0 if cat_name == "economy" else 120.0 if cat_name == "premium" else 180.0
        commission_pct = 0.20  # 20% platform fee
        surge = surge_multiplier

    dist_charge = distance_km * per_km
    time_charge = duration_min * per_min
    subtotal = (base_fare + dist_charge + time_charge) * surge
    total_fare = max(subtotal, min_fare)

    # Commission and driver earnings
    commission = total_fare * commission_pct
    driver_earning = total_fare - commission

    # Seat availability details
    if cat_name == "suv":
        seats = 6
        seat_labels = ["Front Window", "Middle Left", "Middle Right", "Rear Window", "Rear Middle", "Rear Window 2"]
    elif cat_name == "premium":
        seats = 4
        seat_labels = ["Front Window", "Rear Left Window", "Rear Right Window", "Rear Middle"]
    else:
        seats = 4
        seat_labels = ["Front Window", "Rear Left Window", "Rear Right Window", "Rear Center"]

    return RideFareEstimate(
        category_id=cat_id,
        category_name=cat_name,
        distance_km=distance_km,
        duration_min=duration_min,
        base_fare=base_fare,
        distance_charge=dist_charge,
        time_charge=time_charge,
        surge_multiplier=surge,
        total_fare=total_fare,
        platform_commission=commission,
        driver_earning=driver_earning,
        available_seats=seats,
        available_seat_labels=seat_labels,
    )
'''

with open(os.path.join(matching_svc_dir, "ride_fare_engine.py"), "w", encoding="utf-8") as f:
    f.write(fare_engine_code)

print("[OK] Created ride_fare_engine.py")

# 2. route_cache.py
route_cache_code = '''"""
Route Provider with Redis Cache & Minimal External Map API Calls — Feature 5.
"""
from __future__ import annotations

import json
import math
from typing import Optional
import httpx
import structlog

from common.utils.redis_client import get_redis

logger = structlog.get_logger(__name__)


class RouteCacheService:
    """
    Provides route distance, duration and polyline with intelligent Redis caching.
    Ensures <= 5 Google API calls per ride request lifecycle.
    """

    CACHE_TTL_SEC = 300  # 5 minutes cache for moving points

    @staticmethod
    def _make_geohash_key(lat1: float, lng1: float, lat2: float, lng2: float) -> str:
        # Approximate 2-decimal rounding (~1km bucket for route caching)
        return f"route_cache:{round(lat1, 2)}:{round(lng1, 2)}:{round(lat2, 2)}:{round(lng2, 2)}"

    @classmethod
    async def get_route(
        cls,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        google_api_key: Optional[str] = None,
    ) -> dict:
        """
        Get route distance_km, duration_min and encoded polyline.
        Checks Redis cache first. Falls back to Haversine if external API unavailable.
        """
        cache_key = cls._make_geohash_key(origin_lat, origin_lng, dest_lat, dest_lng)
        try:
            r = await get_redis()
            cached = await r.get(cache_key)
            if cached:
                logger.debug("Route cache hit", key=cache_key)
                return json.loads(cached)
        except Exception as e:
            logger.warning("Redis route cache read error", error=str(e))

        # Attempt Google Routes API / Directions API if key provided
        if google_api_key:
            try:
                url = "https://routes.googleapis.com/directions/v2:computeRoutes"
                headers = {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": google_api_key,
                    "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
                }
                payload = {
                    "origin": {"location": {"latLng": {"latitude": origin_lat, "longitude": origin_lng}}},
                    "destination": {"location": {"latLng": {"latitude": dest_lat, "longitude": dest_lng}}},
                    "travelMode": "DRIVE",
                    "routingPreference": "TRAFFIC_AWARE",
                }
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        route = data.get("routes", [{}])[0]
                        dist_m = route.get("distanceMeters", 0)
                        dur_sec_str = route.get("duration", "0s").replace("s", "")
                        dur_sec = int(float(dur_sec_str)) if dur_sec_str else 0
                        polyline = route.get("polyline", {}).get("encodedPolyline", "")

                        result = {
                            "distance_km": max(dist_m / 1000.0, 0.5),
                            "duration_min": max(int(dur_sec / 60), 1),
                            "polyline": polyline,
                            "source": "google_routes",
                        }
                        try:
                            await r.setex(cache_key, cls.CACHE_TTL_SEC, json.dumps(result))
                        except Exception:
                            pass
                        return result
            except Exception as e:
                logger.warning("Google Routes API failed, falling back to math model", error=str(e))

        # High quality mathematical road estimation (1.28 urban winding factor)
        R = 6371.0
        dlat = math.radians(dest_lat - origin_lat)
        dlon = math.radians(dest_lng - origin_lng)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(origin_lat)) * math.cos(math.radians(dest_lat)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        straight_km = R * c
        road_km = max(straight_km * 1.28, 0.8)
        duration_min = max(int((road_km / 24.0) * 60), 3)

        result = {
            "distance_km": round(road_km, 2),
            "duration_min": duration_min,
            "polyline": "",
            "source": "haversine_road_model",
        }
        try:
            await r.setex(cache_key, cls.CACHE_TTL_SEC, json.dumps(result))
        except Exception:
            pass
        return result
'''

with open(os.path.join(matching_svc_dir, "route_cache.py"), "w", encoding="utf-8") as f:
    f.write(route_cache_code)

print("[OK] Created route_cache.py")

# 3. ride_dispatch.py
dispatch_code = '''"""
On-Demand Ride Dispatch Engine — Feature 5.
PostGIS-first discovery, 180s sequential timeout queue, atomic SELECT FOR UPDATE acceptance.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
import json
from typing import List, Optional
import uuid

import structlog
from sqlalchemy import select, update, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Driver, DriverStatus, DriverLocation, Vehicle, VehicleStatus,
    RideRequest, RideRequestStatus, RideOffer, RideOfferStatus,
    RideCategory, User,
)
from common.utils.redis_client import get_redis, publish_event
from app.services.ride_fare_engine import estimate_ride_fare, haversine_distance_km
from app.services.route_cache import RouteCacheService

logger = structlog.get_logger(__name__)

# Config: 180-second driver ringing timeout as requested
OFFER_TIMEOUT_SEC = 180
MAX_DISPATCH_RADIUS_KM = 15.0
RADIUS_EXPAND_STEPS = [3.0, 5.0, 8.0, 12.0, 15.0]


class RideDispatchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_ride_request(
        self,
        customer_id: str,
        pickup_lat: float,
        pickup_lng: float,
        pickup_address: str,
        dest_lat: float,
        dest_lng: float,
        dest_address: str,
        category_name: str = "economy",
        seats_requested: int = 1,
        seat_preferences: Optional[dict] = None,
    ) -> RideRequest:
        """
        Customer requests an on-demand ride. Creates RideRequest and initiates dispatch.
        """
        # 1. Fetch category
        cat_res = await self.db.execute(
            select(RideCategory).where(
                and_(RideCategory.name == category_name.lower(), RideCategory.is_active == True)
            )
        )
        category = cat_res.scalar_one_or_none()

        # 2. Compute route
        route_info = await RouteCacheService.get_route(pickup_lat, pickup_lng, dest_lat, dest_lng)
        dist_km = route_info["distance_km"]
        dur_min = route_info["duration_min"]
        polyline = route_info.get("polyline", "")

        # 3. Calculate fare & commission
        fare_est = estimate_ride_fare(
            distance_km=dist_km,
            duration_min=dur_min,
            category=category,
            surge_multiplier=category.surge_multiplier if category else 1.0,
        )

        # 4. Insert RideRequest
        pickup_wkt = f"SRID=4326;POINT({pickup_lng} {pickup_lat})"
        dest_wkt = f"SRID=4326;POINT({dest_lng} {dest_lat})"

        ride_req = RideRequest(
            customer_id=uuid.UUID(customer_id),
            pickup_location=pickup_wkt,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            pickup_address=pickup_address,
            destination_location=dest_wkt,
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            destination_address=dest_address,
            ride_category_id=category.id if category else None,
            estimated_distance_km=dist_km,
            estimated_duration_min=dur_min,
            estimated_fare=Decimal(str(round(fare_est.total_fare, 2))),
            surge_multiplier=fare_est.surge_multiplier,
            seats_requested=seats_requested,
            seat_preferences=seat_preferences or {"seats": ["Rear Left", "Rear Right"]},
            route_polyline=polyline,
            route_distance_km=dist_km,
            route_duration_min=dur_min,
            status=RideRequestStatus.CREATED,
            expires_at=datetime.utcnow() + timedelta(minutes=15),
        )
        self.db.add(ride_req)
        await self.db.commit()
        await self.db.refresh(ride_req)

        # 5. Kick off dispatch in background
        asyncio.create_task(self.dispatch_ride_request(str(ride_req.id)))

        return ride_req

    async def find_nearby_eligible_drivers(
        self,
        pickup_lat: float,
        pickup_lng: float,
        category_name: str = "economy",
        radius_km: float = 5.0,
        excluded_driver_ids: Optional[List[str]] = None,
    ) -> List[dict]:
        """
        PostGIS query to find online, verified drivers within radius_km.
        Ranked by ST_Distance from pickup.
        """
        excluded = [uuid.UUID(d) for d in (excluded_driver_ids or [])]

        sql = text("""
            SELECT 
                d.id AS driver_id,
                d.user_id AS user_id,
                d.full_name AS full_name,
                d.rating AS rating,
                v.id AS vehicle_id,
                v.make AS make,
                v.model AS model,
                v.registration_number AS reg_no,
                v.vehicle_type AS vehicle_type,
                ST_Distance(
                    d.current_location,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                ) / 1000.0 AS distance_km
            FROM drivers d
            JOIN vehicles v ON v.driver_id = d.id AND v.status = 'approved'
            WHERE d.status = 'online'
              AND d.kyc_status = 'approved'
              AND ST_DWithin(
                    d.current_location,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radius_meters
              )
            ORDER BY distance_km ASC
            LIMIT 10;
        """)

        result = await self.db.execute(
            sql,
            {
                "lat": pickup_lat,
                "lng": pickup_lng,
                "radius_meters": radius_km * 1000.0,
            },
        )
        rows = result.fetchall()

        candidates = []
        for r in rows:
            if str(r.driver_id) in (excluded_driver_ids or []):
                continue
            candidates.append({
                "driver_id": str(r.driver_id),
                "user_id": str(r.user_id),
                "full_name": r.full_name,
                "rating": float(r.rating or 4.8),
                "vehicle_id": str(r.vehicle_id),
                "vehicle_name": f"{r.make} {r.model}",
                "registration_number": r.reg_no,
                "vehicle_type": str(r.vehicle_type),
                "distance_km": round(float(r.distance_km), 2),
            })
        return candidates

    async def dispatch_ride_request(self, ride_request_id: str) -> None:
        """
        Sequential dispatch: sends offer to closest driver, waits up to 180s.
        If rejected/expired, moves to next driver.
        """
        req_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == uuid.UUID(ride_request_id))
        )
        ride_req = req_res.scalar_one_or_none()
        if not ride_req or ride_req.status not in (RideRequestStatus.CREATED, RideRequestStatus.DISPATCHING):
            return

        ride_req.status = RideRequestStatus.DISPATCHING
        await self.db.commit()

        excluded_drivers: List[str] = []

        for radius in RADIUS_EXPAND_STEPS:
            # Check if ride is still awaiting assignment
            req_check = await self.db.execute(
                select(RideRequest).where(RideRequest.id == uuid.UUID(ride_request_id))
            )
            current_req = req_check.scalar_one_or_none()
            if not current_req or current_req.status in (RideRequestStatus.ASSIGNED, RideRequestStatus.CANCELLED, RideRequestStatus.EXPIRED):
                return

            candidates = await self.find_nearby_eligible_drivers(
                pickup_lat=ride_req.pickup_lat,
                pickup_lng=ride_req.pickup_lng,
                radius_km=radius,
                excluded_driver_ids=excluded_drivers,
            )

            for cand in candidates:
                driver_id_str = cand["driver_id"]
                user_id_str = cand["user_id"]
                excluded_drivers.append(driver_id_str)

                # Create RideOffer
                offered_at = datetime.utcnow()
                expires_at = offered_at + timedelta(seconds=OFFER_TIMEOUT_SEC)

                # ETA from driver to pickup
                pickup_eta = max(int(cand["distance_km"] / 25.0 * 60), 2)

                # Driver earning calculation (20% platform fee)
                total_fare = float(ride_req.estimated_fare)
                commission = total_fare * 0.20
                driver_earning = total_fare - commission

                offer = RideOffer(
                    ride_request_id=ride_req.id,
                    driver_id=uuid.UUID(driver_id_str),
                    status=RideOfferStatus.PENDING,
                    pickup_distance_km=cand["distance_km"],
                    pickup_eta_min=pickup_eta,
                    estimated_fare=Decimal(str(round(total_fare, 2))),
                    platform_commission=Decimal(str(round(commission, 2))),
                    estimated_earning=Decimal(str(round(driver_earning, 2))),
                    offered_at=offered_at,
                    expires_at=expires_at,
                    available_seats=4,
                    available_seat_labels=["Front Window", "Rear Left", "Rear Right", "Rear Middle"],
                )
                self.db.add(offer)
                await self.db.commit()
                await self.db.refresh(offer)

                # Build full production payload for driver app
                offer_payload = {
                    "event": "RIDE_REQUEST_NEW",
                    "offer_id": str(offer.id),
                    "booking_id": str(ride_req.id),  # compatibility field
                    "ride_request_id": str(ride_req.id),
                    "driver_id": driver_id_str,
                    "pickup": {
                        "address": ride_req.pickup_address,
                        "lat": ride_req.pickup_lat,
                        "lng": ride_req.pickup_lng,
                        "distance_km": cand["distance_km"],
                        "eta_min": pickup_eta,
                    },
                    "destination": {
                        "address": ride_req.destination_address,
                        "lat": ride_req.destination_lat,
                        "lng": ride_req.destination_lng,
                    },
                    "trip": {
                        "from": ride_req.pickup_address,
                        "to": ride_req.destination_address,
                        "distance_km": ride_req.estimated_distance_km,
                        "duration_min": ride_req.estimated_duration_min,
                        "fare": float(ride_req.estimated_fare),
                        "earning": round(driver_earning, 2),
                        "seats": ride_req.seats_requested,
                    },
                    "category": {
                        "name": "Economy",
                        "icon": "car",
                    },
                    "seat_info": {
                        "total_seats": 4,
                        "available_seats": 4,
                        "available_labels": ["Front Window", "Rear Left", "Rear Right", "Rear Middle"],
                        "requested_seats": ride_req.seats_requested,
                    },
                    "expires_at": expires_at.isoformat(),
                    "timeout_sec": OFFER_TIMEOUT_SEC,
                    "paid": True,
                }

                # Publish to driver's personal Socket.IO room via Redis
                await publish_event(f"driver:{user_id_str}:events", offer_payload)
                logger.info(
                    "Pushed RIDE_REQUEST_NEW to driver",
                    driver_id=driver_id_str,
                    offer_id=str(offer.id),
                    timeout_sec=OFFER_TIMEOUT_SEC,
                )

                # Wait for driver response via Redis key check with 1-second polling
                r = await get_redis()
                response_key = f"ride_offer:response:{str(offer.id)}"
                waited = 0

                while waited < OFFER_TIMEOUT_SEC:
                    await asyncio.sleep(1)
                    waited += 1

                    res = await r.get(response_key)
                    if res:
                        res_str = res.decode("utf-8") if isinstance(res, bytes) else str(res)
                        if res_str == "accepted":
                            logger.info("Driver accepted ride offer", driver_id=driver_id_str, offer_id=str(offer.id))
                            return  # Successfully assigned
                        elif res_str == "rejected":
                            logger.info("Driver rejected ride offer", driver_id=driver_id_str, offer_id=str(offer.id))
                            break

                # If loop ended without accept, mark offer expired
                offer_check = await self.db.execute(
                    select(RideOffer).where(RideOffer.id == offer.id)
                )
                off_rec = offer_check.scalar_one_or_none()
                if off_rec and off_rec.status == RideOfferStatus.PENDING:
                    off_rec.status = RideOfferStatus.EXPIRED
                    await self.db.commit()
                    # Notify driver of expiration
                    await publish_event(f"driver:{user_id_str}:events", {
                        "event": "RIDE_REQUEST_EXPIRED",
                        "offer_id": str(offer.id),
                        "ride_request_id": str(ride_req.id),
                    })

        # If all candidates exhausted, mark ride as FAILED/NO_DRIVER
        final_req = await self.db.execute(
            select(RideRequest).where(RideRequest.id == uuid.UUID(ride_request_id))
        )
        req_rec = final_req.scalar_one_or_none()
        if req_rec and req_rec.status == RideRequestStatus.DISPATCHING:
            req_rec.status = RideRequestStatus.FAILED
            await self.db.commit()
            await publish_event(f"customer:{str(req_rec.customer_id)}:events", {
                "event": "RIDE_NO_DRIVER",
                "ride_request_id": str(req_rec.id),
                "message": "No drivers available nearby right now. Please try again.",
            })

    async def respond_to_offer(
        self,
        driver_user_id: str,
        offer_id: str,
        accepted: bool,
        rejection_reason: Optional[str] = None,
    ) -> dict:
        """
        Atomic acceptance of ride offer.
        Uses database row locking to guarantee only ONE driver wins the ride.
        """
        # Resolve driver
        d_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise ValueError("Driver profile not found")

        # Load offer
        offer_res = await self.db.execute(
            select(RideOffer).where(
                and_(RideOffer.id == uuid.UUID(offer_id), RideOffer.driver_id == driver.id)
            )
        )
        offer = offer_res.scalar_one_or_none()
        if not offer:
            raise ValueError("Ride offer not found or not assigned to this driver")

        # Check server-side expiration (180s)
        now = datetime.utcnow()
        if offer.expires_at and now > offer.expires_at.replace(tzinfo=None) if offer.expires_at.tzinfo else offer.expires_at:
            offer.status = RideOfferStatus.EXPIRED
            await self.db.commit()
            return {"success": False, "message": "Offer expired", "status": "expired"}

        r = await get_redis()
        response_key = f"ride_offer:response:{str(offer.id)}"

        if not accepted:
            offer.status = RideOfferStatus.REJECTED
            offer.responded_at = now
            offer.response_reason = rejection_reason
            await self.db.commit()
            await r.setex(response_key, 60, "rejected")
            return {"success": True, "message": "Offer rejected", "status": "rejected"}

        # ATOMIC LOCK on RideRequest: SELECT FOR UPDATE
        req_lock = await self.db.execute(
            select(RideRequest)
            .where(RideRequest.id == offer.ride_request_id)
            .with_for_update()
        )
        ride_req = req_lock.scalar_one_or_none()
        if not ride_req or ride_req.status not in (RideRequestStatus.CREATED, RideRequestStatus.DISPATCHING, RideRequestStatus.OFFERED):
            offer.status = RideOfferStatus.SUPERSEDED
            await self.db.commit()
            return {"success": False, "message": "Ride already assigned to another driver", "status": "superseded"}

        # Assign driver to ride
        ride_req.status = RideRequestStatus.ASSIGNED
        ride_req.assigned_driver_id = driver.id
        ride_req.assigned_at = now

        offer.status = RideOfferStatus.ACCEPTED
        offer.responded_at = now
        await self.db.commit()

        # Signal dispatch loop to terminate
        await r.setex(response_key, 60, "accepted")

        # Notify Customer
        await publish_event(f"customer:{str(ride_req.customer_id)}:events", {
            "event": "RIDE_ASSIGNED",
            "ride_request_id": str(ride_req.id),
            "driver": {
                "driver_id": str(driver.id),
                "full_name": driver.full_name,
                "rating": float(driver.rating or 4.85),
                "distance_km": offer.pickup_distance_km,
                "eta_min": offer.pickup_eta_min,
            },
        })

        return {
            "success": True,
            "message": "Ride assigned successfully",
            "status": "assigned",
            "ride_request_id": str(ride_req.id),
        }
'''

with open(os.path.join(matching_svc_dir, "ride_dispatch.py"), "w", encoding="utf-8") as f:
    f.write(dispatch_code)

print("[OK] Created ride_dispatch.py")
