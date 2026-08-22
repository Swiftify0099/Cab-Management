import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
services_dir = os.path.join(backend_root, "matching-service", "app", "services")

# 1. ride_classification.py
classification_code = '''"""
Ride Classification Engine — Feature 6
Classifies rides by trip type, distance class, demand level, and earning efficiency.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

# Configurable thresholds
SHORT_TRIP_MAX_KM = 6.0
LONG_TRIP_MIN_KM = 18.0
OUTSTATION_MIN_KM = 45.0

AIRPORT_KEYWORDS = ["airport", "pnq", "terminal 1", "terminal 2", "aerodrome", "flight", "departure gate"]
PUNE_AIRPORT_COORDS = (18.5822, 73.9197)


@dataclass
class RideClassification:
    trip_type: str            # LOCAL, AIRPORT, OUTSTATION, SCHEDULED
    distance_class: str       # SHORT, MEDIUM, LONG
    demand_level: str         # NORMAL, HIGH, VERY_HIGH
    earning_class: str        # NORMAL, HIGH_EARNING
    badge_label: str          # e.g., "✈️ Airport Trip", "🔥 High Demand", "⚡ Short Trip"
    badge_color: str          # purple, orange, blue, green
    earning_per_km: float
    earning_per_hour: float

    def to_dict(self) -> dict:
        return {
            "trip_type": self.trip_type,
            "distance_class": self.distance_class,
            "demand_level": self.demand_level,
            "earning_class": self.earning_class,
            "badge_label": self.badge_label,
            "badge_color": self.badge_color,
            "earning_per_km": round(self.earning_per_km, 2),
            "earning_per_hour": round(self.earning_per_hour, 2),
        }


def _is_airport_location(lat: float, lng: float, address: str) -> bool:
    """Checks coordinate distance to known airport center (< 2.5 km) or address keyword."""
    addr_lower = (address or "").lower()
    if any(k in addr_lower for k in AIRPORT_KEYWORDS):
        return True
    
    # Haversine to Pune airport as baseline
    dlat = math.radians(lat - PUNE_AIRPORT_COORDS[0])
    dlon = math.radians(lng - PUNE_AIRPORT_COORDS[1])
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(PUNE_AIRPORT_COORDS[0])) * math.cos(math.radians(lat)) * math.sin(dlon / 2)**2
    dist_km = 6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return dist_km <= 2.5


def classify_ride(
    distance_km: float,
    duration_min: int,
    driver_earning: float,
    pickup_lat: float,
    pickup_lng: float,
    pickup_address: str,
    dest_lat: float,
    dest_lng: float,
    dest_address: str,
    surge_multiplier: float = 1.0,
    is_scheduled: bool = False,
) -> RideClassification:
    """
    Authoritative domain classification of an eligible ride.
    """
    # 1. Distance Class
    if distance_km <= SHORT_TRIP_MAX_KM:
        dist_class = "SHORT"
    elif distance_km >= LONG_TRIP_MIN_KM:
        dist_class = "LONG"
    else:
        dist_class = "MEDIUM"

    # 2. Trip Type
    if is_scheduled:
        trip_type = "SCHEDULED"
    elif _is_airport_location(pickup_lat, pickup_lng, pickup_address) or _is_airport_location(dest_lat, dest_lng, dest_address):
        trip_type = "AIRPORT"
    elif distance_km >= OUTSTATION_MIN_KM:
        trip_type = "OUTSTATION"
    else:
        trip_type = "LOCAL"

    # 3. Demand Level
    if surge_multiplier >= 1.5:
        demand = "VERY_HIGH"
    elif surge_multiplier >= 1.2:
        demand = "HIGH"
    else:
        demand = "NORMAL"

    # 4. Earning efficiency
    earn_per_km = driver_earning / max(distance_km, 1.0)
    earn_per_hr = (driver_earning / max(duration_min, 5.0)) * 60.0

    if earn_per_km >= 24.0 or earn_per_hr >= 450.0:
        earn_class = "HIGH_EARNING"
    else:
        earn_class = "NORMAL"

    # 5. Human Badge
    if trip_type == "AIRPORT":
        badge = "✈️ Airport Trip"
        color = "purple"
    elif demand in ("HIGH", "VERY_HIGH"):
        badge = f"🔥 High Demand • ₹{round(earn_per_km)}/km"
        color = "orange"
    elif earn_class == "HIGH_EARNING":
        badge = f"💰 Best Earning • ₹{round(driver_earning)}"
        color = "green"
    elif dist_class == "SHORT":
        badge = f"⚡ Quick Trip • {round(distance_km, 1)} km"
        color = "blue"
    elif dist_class == "LONG":
        badge = f"🛣️ Long Route • {round(distance_km, 1)} km"
        color = "indigo"
    else:
        badge = "★ Great Match"
        color = "cyan"

    return RideClassification(
        trip_type=trip_type,
        distance_class=dist_class,
        demand_level=demand,
        earning_class=earn_class,
        badge_label=badge,
        badge_color=color,
        earning_per_km=earn_per_km,
        earning_per_hour=earn_per_hr,
    )
'''

with open(os.path.join(services_dir, "ride_classification.py"), "w", encoding="utf-8") as f:
    f.write(classification_code)

print("[OK] Created ride_classification.py")

# 2. smart_scoring.py
scoring_code = '''"""
Versioned Smart Scoring & Driver-Personalized Ranking Engine (v1) — Feature 6.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional
from app.services.ride_classification import RideClassification, classify_ride

# Central Versioned Weights (v1)
SCORING_VERSION = "v1"
WEIGHTS_V1 = {
    "proximity": 0.25,
    "pickup_eta": 0.20,
    "earning": 0.25,
    "preference": 0.15,
    "destination": 0.15,
}


@dataclass
class ScoredRide:
    ride_id: str
    smart_score: float         # 0 - 100
    match_percentage: int      # 0 - 100
    human_reason: str          # "95% Match • Airport Express"
    classification: RideClassification
    pickup_distance_km: float
    pickup_eta_min: int
    trip_distance_km: float
    trip_duration_min: int
    fare: float
    driver_earning: float
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    destination_address: str
    destination_lat: float
    destination_lng: float
    seats: int
    category_name: str
    scoring_version: str = SCORING_VERSION

    def to_dict(self) -> dict:
        return {
            "ride_id": self.ride_id,
            "smart_score": round(self.smart_score, 1),
            "match_percentage": self.match_percentage,
            "human_reason": self.human_reason,
            "classification": self.classification.to_dict(),
            "pickup_distance_km": round(self.pickup_distance_km, 2),
            "pickup_eta_min": self.pickup_eta_min,
            "trip_distance_km": round(self.trip_distance_km, 2),
            "trip_duration_min": self.trip_duration_min,
            "fare": round(self.fare, 2),
            "driver_earning": round(self.driver_earning, 2),
            "pickup": {
                "address": self.pickup_address,
                "lat": self.pickup_lat,
                "lng": self.pickup_lng,
                "distance_km": round(self.pickup_distance_km, 2),
                "eta_min": self.pickup_eta_min,
            },
            "destination": {
                "address": self.destination_address,
                "lat": self.destination_lat,
                "lng": self.destination_lng,
            },
            "seats": self.seats,
            "category_name": self.category_name,
            "scoring_version": self.scoring_version,
        }


def _calculate_destination_alignment(
    driver_lat: float,
    driver_lng: float,
    drop_lat: float,
    drop_lng: float,
    dest_lat: Optional[float],
    dest_lng: Optional[float],
) -> float:
    """
    Computes vector alignment (0.0 to 1.0) between trip direction and driver's home/destination target.
    """
    if dest_lat is None or dest_lng is None:
        return 1.0  # neutral if destination mode is off

    # Vector 1: Driver -> Dropoff
    v1_x = drop_lng - driver_lng
    v1_y = drop_lat - driver_lat

    # Vector 2: Driver -> Desired Destination
    v2_x = dest_lng - driver_lng
    v2_y = dest_lat - driver_lat

    mag1 = math.sqrt(v1_x**2 + v1_y**2)
    mag2 = math.sqrt(v2_x**2 + v2_y**2)

    if mag1 == 0 or mag2 == 0:
        return 1.0

    dot = (v1_x * v2_x) + (v1_y * v2_y)
    cos_sim = dot / (mag1 * mag2)
    # Map [-1, 1] to [0.0, 1.0]
    return max(0.0, min(1.0, (cos_sim + 1.0) / 2.0))


class SmartScoringEngine:
    """
    Personalized multi-factor scoring engine that scores candidate rides in the context of a driver.
    """

    @classmethod
    def score_ride(
        cls,
        ride_id: str,
        driver_lat: float,
        driver_lng: float,
        pickup_lat: float,
        pickup_lng: float,
        pickup_address: str,
        dest_lat: float,
        dest_lng: float,
        dest_address: str,
        trip_distance_km: float,
        trip_duration_min: int,
        fare: float,
        driver_earning: float,
        pickup_distance_km: float,
        pickup_eta_min: int,
        preference_mode: str = "balanced",
        dest_lat_pref: Optional[float] = None,
        dest_lng_pref: Optional[float] = None,
        dest_mode: str = "off",
        seats: int = 1,
        category_name: str = "Economy",
        surge_multiplier: float = 1.0,
    ) -> ScoredRide:
        # 1. Proximity subscore (0 to 100): closer pickup = higher score
        s_prox = max(0.0, 100.0 * (1.0 - (pickup_distance_km / 10.0)))

        # 2. Pickup ETA subscore (0 to 100): shorter ETA = higher score
        s_eta = max(0.0, 100.0 * (1.0 - (pickup_eta_min / 20.0)))

        # 3. Earning Efficiency subscore (0 to 100)
        # Target: ₹450/hr = 100 score
        earn_per_hr = (driver_earning / max(trip_duration_min + pickup_eta_min, 10)) * 60.0
        s_earn = min(100.0, (earn_per_hr / 450.0) * 100.0)

        # 4. Classify Ride
        classification = classify_ride(
            distance_km=trip_distance_km,
            duration_min=trip_duration_min,
            driver_earning=driver_earning,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            pickup_address=pickup_address,
            dest_lat=dest_lat,
            dest_lng=dest_lng,
            dest_address=dest_address,
            surge_multiplier=surge_multiplier,
        )

        # 5. Preference Alignment subscore
        s_pref = 70.0  # baseline
        mode_lower = preference_mode.lower()
        if mode_lower == "earnings_focus":
            s_pref = 100.0 if classification.earning_class == "HIGH_EARNING" else 60.0
        elif mode_lower == "nearby_focus":
            s_pref = 100.0 if pickup_distance_km <= 3.0 else 50.0
        elif mode_lower == "short_trips":
            s_pref = 100.0 if classification.distance_class == "SHORT" else 40.0
        elif mode_lower == "long_trips":
            s_pref = 100.0 if classification.distance_class == "LONG" else 50.0
        elif mode_lower == "airport_focus":
            s_pref = 100.0 if classification.trip_type == "AIRPORT" else 55.0

        # 6. Destination Alignment subscore
        if dest_mode in ("flexible", "strict") and dest_lat_pref and dest_lng_pref:
            align_val = _calculate_destination_alignment(
                driver_lat=driver_lat,
                driver_lng=driver_lng,
                drop_lat=dest_lat,
                drop_lng=dest_lng,
                dest_lat=dest_lat_pref,
                dest_lng=dest_lng_pref,
            )
            s_dest = align_val * 100.0
        else:
            s_dest = 80.0

        # Dynamic mode weight adjustment
        w = dict(WEIGHTS_V1)
        if mode_lower == "earnings_focus":
            w["earning"] = 0.40
            w["proximity"] = 0.15
        elif mode_lower == "nearby_focus":
            w["proximity"] = 0.40
            w["pickup_eta"] = 0.30
            w["earning"] = 0.10
        elif mode_lower == "short_trips":
            w["preference"] = 0.35
            w["proximity"] = 0.25

        # Total Smart Score (0 - 100)
        smart_score = (
            w["proximity"] * s_prox
            + w["pickup_eta"] * s_eta
            + w["earning"] * s_earn
            + w["preference"] * s_pref
            + w["destination"] * s_dest
        )
        smart_score = max(10.0, min(99.0, smart_score))
        match_pct = int(smart_score)

        # Human explainability tag
        if match_pct >= 90:
            human_reason = f"{match_pct}% Match • {classification.badge_label}"
        elif match_pct >= 75:
            human_reason = f"Great Fit • {classification.badge_label}"
        else:
            human_reason = f"Available • {classification.badge_label}"

        return ScoredRide(
            ride_id=ride_id,
            smart_score=smart_score,
            match_percentage=match_pct,
            human_reason=human_reason,
            classification=classification,
            pickup_distance_km=pickup_distance_km,
            pickup_eta_min=pickup_eta_min,
            trip_distance_km=trip_distance_km,
            trip_duration_min=trip_duration_min,
            fare=fare,
            driver_earning=driver_earning,
            pickup_address=pickup_address,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            destination_address=dest_address,
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            seats=seats,
            category_name=category_name,
        )
'''

with open(os.path.join(services_dir, "smart_scoring.py"), "w", encoding="utf-8") as f:
    f.write(scoring_code)

print("[OK] Created smart_scoring.py")

# 3. smart_radar.py
radar_code = '''"""
Smart Ride Radar Service — Feature 6.
Manages candidate ride pool discovery, preference filtering, personalized ranking, and real-time Socket.IO sync.
"""
from __future__ import annotations

from datetime import datetime, timedelta
import json
import uuid
from typing import List, Optional

import structlog
from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Driver, DriverStatus, DriverPreference,
    RideRequest, RideRequestStatus, Vehicle, VehicleStatus,
)
from common.utils.redis_client import get_redis, publish_event
from app.services.smart_scoring import SmartScoringEngine, ScoredRide
from app.services.ride_fare_engine import haversine_distance_km

logger = structlog.get_logger(__name__)

SMART_RADAR_MAX_CANDIDATES = 5
RADAR_SEARCH_RADIUS_KM = 8.0


class SmartRadarService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_driver_preferences(self, driver_id: uuid.UUID) -> DriverPreference:
        """Fetch driver preferences or initialize with balanced defaults."""
        res = await self.db.execute(
            select(DriverPreference).where(DriverPreference.driver_id == driver_id)
        )
        pref = res.scalar_one_or_none()
        if not pref:
            pref = DriverPreference(
                driver_id=driver_id,
                mode="balanced",
                allow_local=True,
                allow_airport=True,
                allow_outstation=False,
                allow_scheduled=True,
                min_earning_cutoff=0.0,
                max_pickup_distance_km=7.0,
                max_pickup_eta_min=15,
                destination_mode="off",
            )
            self.db.add(pref)
            await self.db.commit()
            await self.db.refresh(pref)
        return pref

    async def update_driver_preferences(
        self,
        driver_id: uuid.UUID,
        mode: Optional[str] = None,
        allow_local: Optional[bool] = None,
        allow_airport: Optional[bool] = None,
        allow_outstation: Optional[bool] = None,
        allow_scheduled: Optional[bool] = None,
        min_earning_cutoff: Optional[float] = None,
        max_pickup_distance_km: Optional[float] = None,
        max_pickup_eta_min: Optional[int] = None,
        destination_mode: Optional[str] = None,
        destination_address: Optional[str] = None,
        destination_lat: Optional[float] = None,
        destination_lng: Optional[float] = None,
    ) -> DriverPreference:
        pref = await self.get_or_create_driver_preferences(driver_id)
        if mode is not None: pref.mode = mode
        if allow_local is not None: pref.allow_local = allow_local
        if allow_airport is not None: pref.allow_airport = allow_airport
        if allow_outstation is not None: pref.allow_outstation = allow_outstation
        if allow_scheduled is not None: pref.allow_scheduled = allow_scheduled
        if min_earning_cutoff is not None: pref.min_earning_cutoff = min_earning_cutoff
        if max_pickup_distance_km is not None: pref.max_pickup_distance_km = max_pickup_distance_km
        if max_pickup_eta_min is not None: pref.max_pickup_eta_min = max_pickup_eta_min
        if destination_mode is not None: pref.destination_mode = destination_mode
        if destination_address is not None: pref.destination_address = destination_address
        if destination_lat is not None: pref.destination_lat = destination_lat
        if destination_lng is not None: pref.destination_lng = destination_lng

        await self.db.commit()
        await self.db.refresh(pref)
        return pref

    async def get_smart_radar_rides(
        self,
        driver_user_id: str,
        filter_type: str = "all",
    ) -> List[dict]:
        """
        Discovers, hard-filters, scores, and ranks candidate rides for the driver's Smart Radar.
        """
        # 1. Resolve driver & verify HARD ELIGIBILITY
        d_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = d_res.scalar_one_or_none()
        if not driver:
            return []

        if driver.status != DriverStatus.ONLINE or driver.kyc_status.value != "approved":
            return []

        # Load preferences
        pref = await self.get_or_create_driver_preferences(driver.id)

        # 2. Get driver coordinates
        from common.models.all_models import DriverLocation
        loc_res = await self.db.execute(
            select(DriverLocation).where(DriverLocation.driver_id == driver.id)
        )
        driver_loc = loc_res.scalar_one_or_none()
        driver_lat = driver_loc.latitude if driver_loc else 18.5204
        driver_lng = driver_loc.longitude if driver_loc else 73.8567

        # 3. PostGIS search for waiting on-demand ride requests
        now = datetime.utcnow()
        req_res = await self.db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.status.in_([RideRequestStatus.CREATED, RideRequestStatus.DISPATCHING, RideRequestStatus.OFFERED]),
                    RideRequest.assigned_driver_id == None,
                    RideRequest.expires_at > now,
                )
            ).limit(20)
        )
        candidate_requests = req_res.scalars().all()

        scored_list: List[ScoredRide] = []

        for req in candidate_requests:
            # Straight line pickup distance
            pickup_dist = haversine_distance_km(driver_lat, driver_lng, req.pickup_lat, req.pickup_lng)
            if pickup_dist > pref.max_pickup_distance_km:
                continue

            pickup_eta = max(int(pickup_dist / 25.0 * 60), 2)
            if pickup_eta > pref.max_pickup_eta_min:
                continue

            total_fare = float(req.estimated_fare)
            earning = total_fare * 0.80  # 80% earning after 20% platform fee

            if earning < pref.min_earning_cutoff:
                continue

            scored = SmartScoringEngine.score_ride(
                ride_id=str(req.id),
                driver_lat=driver_lat,
                driver_lng=driver_lng,
                pickup_lat=req.pickup_lat,
                pickup_lng=req.pickup_lng,
                pickup_address=req.pickup_address,
                dest_lat=req.destination_lat,
                dest_lng=req.destination_lng,
                dest_address=req.destination_address,
                trip_distance_km=req.estimated_distance_km or 10.0,
                trip_duration_min=req.estimated_duration_min or 25,
                fare=total_fare,
                driver_earning=earning,
                pickup_distance_km=pickup_dist,
                pickup_eta_min=pickup_eta,
                preference_mode=pref.mode,
                dest_lat_pref=pref.destination_lat,
                dest_lng_pref=pref.destination_lng,
                dest_mode=pref.destination_mode,
                seats=req.seats_requested,
                surge_multiplier=req.surge_multiplier,
            )

            # Filter by Trip Types preference
            if scored.classification.trip_type == "AIRPORT" and not pref.allow_airport:
                continue
            if scored.classification.trip_type == "OUTSTATION" and not pref.allow_outstation:
                continue
            if scored.classification.trip_type == "SCHEDULED" and not pref.allow_scheduled:
                continue
            if scored.classification.trip_type == "LOCAL" and not pref.allow_local:
                continue

            # Optional client filter pill application
            if filter_type == "airport" and scored.classification.trip_type != "AIRPORT":
                continue
            if filter_type == "best_earnings" and scored.classification.earning_class != "HIGH_EARNING":
                continue
            if filter_type == "closest" and scored.pickup_distance_km > 3.5:
                continue

            scored_list.append(scored)

        # Sort by Smart Score descending
        scored_list.sort(key=lambda s: s.smart_score, reverse=True)

        top_candidates = scored_list[:SMART_RADAR_MAX_CANDIDATES]
        return [c.to_dict() for c in top_candidates]
'''

with open(os.path.join(services_dir, "smart_radar.py"), "w", encoding="utf-8") as f:
    f.write(radar_code)

print("[OK] Created smart_radar.py")

# 4. atomic_matching.py
atomic_code = '''"""
Atomic Multi-Driver Matching Engine — Feature 6.
Ensures zero race conditions and single authoritative assignment when multiple drivers express interest in Smart Radar rides.
"""
from __future__ import annotations

import asyncio
from datetime import datetime
import json
import uuid
from typing import List, Optional

import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Driver, DriverStatus, RideRequest, RideRequestStatus,
    RideOffer, RideOfferStatus,
)
from common.utils.redis_client import get_redis, publish_event

logger = structlog.get_logger(__name__)


class AtomicMatchingEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def submit_radar_match_interest(
        self,
        driver_user_id: str,
        selected_ride_ids: List[str],
    ) -> dict:
        """
        Driver expresses interest in 1 or more Smart Radar candidate rides.
        Attempts atomic assignment for the best available ride using SELECT FOR UPDATE.
        """
        if not selected_ride_ids:
            return {"success": False, "message": "No rides selected", "matched_ride_id": None}

        # Resolve driver
        d_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = d_res.scalar_one_or_none()
        if not driver or driver.status != DriverStatus.ONLINE:
            return {"success": False, "message": "Driver not eligible or offline", "matched_ride_id": None}

        now = datetime.utcnow()

        for ride_id_str in selected_ride_ids:
            try:
                ride_uuid = uuid.UUID(ride_id_str)
            except ValueError:
                continue

            # ATOMIC LOCK: SELECT FOR UPDATE on RideRequest
            req_lock = await self.db.execute(
                select(RideRequest)
                .where(RideRequest.id == ride_uuid)
                .with_for_update()
            )
            ride_req = req_lock.scalar_one_or_none()

            if ride_req and ride_req.status in (RideRequestStatus.CREATED, RideRequestStatus.DISPATCHING, RideRequestStatus.OFFERED) and ride_req.assigned_driver_id is None:
                # Assign ride atomically to this driver
                ride_req.status = RideRequestStatus.ASSIGNED
                ride_req.assigned_driver_id = driver.id
                ride_req.assigned_at = now
                await self.db.commit()

                # Publish success to driver
                await publish_event(f"driver:{driver_user_id}:events", {
                    "event": "RIDE_MATCHED",
                    "ride_request_id": str(ride_req.id),
                    "booking_id": str(ride_req.id),
                    "pickup": {
                        "address": ride_req.pickup_address,
                        "lat": ride_req.pickup_lat,
                        "lng": ride_req.pickup_lng,
                    },
                    "destination": {
                        "address": ride_req.destination_address,
                        "lat": ride_req.destination_lat,
                        "lng": ride_req.destination_lng,
                    },
                    "fare": float(ride_req.estimated_fare),
                    "driver_earning": float(ride_req.estimated_fare) * 0.80,
                })

                # Publish customer confirmation
                await publish_event(f"customer:{str(ride_req.customer_id)}:events", {
                    "event": "RIDE_ASSIGNED",
                    "ride_request_id": str(ride_req.id),
                    "driver": {
                        "driver_id": str(driver.id),
                        "full_name": driver.full_name,
                        "rating": float(driver.rating or 4.85),
                    },
                })

                return {
                    "success": True,
                    "message": "Ride successfully matched and assigned!",
                    "status": "matched",
                    "matched_ride_id": str(ride_req.id),
                }

        # If none of the selected rides were won
        return {
            "success": False,
            "message": "Selected rides were claimed by closer drivers. Checking new opportunities...",
            "status": "not_matched",
            "matched_ride_id": None,
        }
'''

with open(os.path.join(services_dir, "atomic_matching.py"), "w", encoding="utf-8") as f:
    f.write(atomic_code)

print("[OK] Created atomic_matching.py")
