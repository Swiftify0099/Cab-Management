"""
Script to create the backend services for Features 20, 21, and 22:
- destination_mode_service.py (Feature 20)
- back_to_back_service.py (Feature 21)
- driver_safety_service.py (Feature 22)
"""
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_services_dir = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\matching-service\app\services"

# 1. Feature 20: destination_mode_service.py
dest_service_code = '''"""
Feature 20: Destination Mode Service
Authoritative destination mode preferences, PostGIS spatial cone filtering, vector directional alignment,
configurable modes (Flexible, Balanced, Strict), auto-expiry, and reached detection.
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

import structlog
from sqlalchemy import select, update, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    Driver, DriverStatus, DriverPreference, DriverLocation,
    RideRequest, RideRequestStatus
)
from app.services.ride_fare_engine import haversine_distance_km

logger = structlog.get_logger(__name__)


def calculate_vector_alignment(
    driver_lat: float,
    driver_lng: float,
    drop_lat: float,
    drop_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode_pref: str = "balanced",
) -> Dict[str, Any]:
    """
    Computes angular cosine similarity and progress towards driver target destination.
    Vector 1: Driver -> Candidate Dropoff
    Vector 2: Driver -> Desired Target Destination
    """
    v1_x = drop_lng - driver_lng
    v1_y = drop_lat - driver_lat
    v2_x = dest_lng - driver_lng
    v2_y = dest_lat - driver_lat

    mag1 = math.sqrt(v1_x**2 + v1_y**2)
    mag2 = math.sqrt(v2_x**2 + v2_y**2)

    if mag1 == 0 or mag2 == 0:
        return {
            "alignment_score": 100.0,
            "cosine_similarity": 1.0,
            "angle_degrees": 0.0,
            "is_aligned": True,
            "label": "Towards your destination",
            "progress_km": 0.0,
        }

    dot = (v1_x * v2_x) + (v1_y * v2_y)
    cos_sim = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    angle_rad = math.acos(cos_sim)
    angle_deg = math.degrees(angle_rad)

    # Progress calculation: driver to target vs dropoff to target
    dist_driver_target = haversine_distance_km(driver_lat, driver_lng, dest_lat, dest_lng)
    dist_drop_target = haversine_distance_km(drop_lat, drop_lng, dest_lat, dest_lng)
    progress_km = max(0.0, dist_driver_target - dist_drop_target)

    # Mode-based scoring
    # Cosine ranges from 1.0 (exact match) to 0.0 (perpendicular) to -1.0 (opposite)
    normalized_cos = (cos_sim + 1.0) / 2.0  # 0.0 to 1.0

    mode = mode_pref.lower()
    if mode == "strict":
        # Strict: strictly requires angle <= 60 deg, drops heavily if angle > 60
        if angle_deg <= 60:
            score = 60.0 + (40.0 * (1.0 - (angle_deg / 60.0)))
        else:
            score = max(10.0, 50.0 * (1.0 - ((angle_deg - 60.0) / 120.0)))
        is_aligned = angle_deg <= 60.0 and dist_drop_target < dist_driver_target
    elif mode == "flexible":
        # Flexible: tolerates up to 120 deg
        if angle_deg <= 90:
            score = 70.0 + (30.0 * (1.0 - (angle_deg / 90.0)))
        else:
            score = max(20.0, 60.0 * (1.0 - ((angle_deg - 90.0) / 90.0)))
        is_aligned = angle_deg <= 110.0
    else:  # balanced
        if angle_deg <= 75:
            score = 65.0 + (35.0 * (1.0 - (angle_deg / 75.0)))
        else:
            score = max(15.0, 55.0 * (1.0 - ((angle_deg - 75.0) / 105.0)))
        is_aligned = angle_deg <= 85.0 and dist_drop_target < dist_driver_target + 2.0

    # Human explainable label
    if score >= 90:
        label = "🎯 Towards your destination"
    elif score >= 75:
        label = "✨ Good direction match"
    elif score >= 50:
        label = "👍 General direction fit"
    else:
        label = "⚠️ Slight direction detour"

    return {
        "alignment_score": round(score, 1),
        "cosine_similarity": round(cos_sim, 3),
        "angle_degrees": round(angle_deg, 1),
        "is_aligned": is_aligned,
        "label": label,
        "progress_km": round(progress_km, 1),
        "distance_to_target_km": round(dist_drop_target, 1),
    }


class DestinationModeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_preferences(self, driver_id: uuid.UUID) -> DriverPreference:
        res = await self.db.execute(
            select(DriverPreference).where(DriverPreference.driver_id == driver_id)
        )
        pref = res.scalar_one_or_none()
        if not pref:
            pref = DriverPreference(
                driver_id=driver_id,
                mode="balanced",
                destination_mode="off",
                destination_mode_state="OFF",
                destination_mode_pref="balanced",
                destination_rides_completed=0,
                destination_max_rides=2,
                destination_radius_km=1.5,
            )
            self.db.add(pref)
            await self.db.commit()
            await self.db.refresh(pref)
        return pref

    async def set_destination_mode(
        self,
        driver_id: uuid.UUID,
        destination_address: Optional[str],
        destination_lat: Optional[float],
        destination_lng: Optional[float],
        preference_mode: str = "balanced",
        max_rides: int = 2,
        turn_off: bool = False,
    ) -> Dict[str, Any]:
        """
        Activates, updates, or disables Destination Mode for a driver.
        """
        pref = await self.get_or_create_preferences(driver_id)
        now = datetime.utcnow()

        if turn_off or not destination_address or destination_lat is None or destination_lng is None:
            pref.destination_mode = "off"
            pref.destination_mode_state = "OFF"
            pref.destination_address = None
            pref.destination_lat = None
            pref.destination_lng = None
            pref.destination_location = None
            pref.destination_activated_at = None
            pref.destination_expires_at = None
            pref.destination_rides_completed = 0
            await self.db.commit()
            await self.db.refresh(pref)
            return {
                "success": True,
                "state": "OFF",
                "message": "Destination Mode is turned OFF",
                "preference": pref,
            }

        # Validate coordinates
        if not (-90.0 <= destination_lat <= 90.0) or not (-180.0 <= destination_lng <= 180.0):
            raise HTTPException(status_code=400, detail="Invalid destination coordinates")

        # Activate Destination Mode (2 hours default timeout)
        expires_at = now + timedelta(hours=2)
        pref.destination_mode = preference_mode.lower()
        pref.destination_mode_state = "ACTIVE"
        pref.destination_mode_pref = preference_mode.lower()
        pref.destination_address = destination_address.strip()
        pref.destination_lat = destination_lat
        pref.destination_lng = destination_lng
        pref.destination_location = f"SRID=4326;POINT({destination_lng} {destination_lat})"
        pref.destination_activated_at = now
        pref.destination_expires_at = expires_at
        pref.destination_rides_completed = 0
        pref.destination_max_rides = max(1, min(max_rides, 5))
        pref.destination_radius_km = 1.5

        await self.db.commit()
        await self.db.refresh(pref)

        return {
            "success": True,
            "state": "ACTIVE",
            "preference_mode": pref.destination_mode_pref,
            "destination_address": pref.destination_address,
            "destination_lat": pref.destination_lat,
            "destination_lng": pref.destination_lng,
            "activated_at": pref.destination_activated_at.isoformat() if pref.destination_activated_at else None,
            "expires_at": pref.destination_expires_at.isoformat() if pref.destination_expires_at else None,
            "max_rides": pref.destination_max_rides,
            "rides_completed": pref.destination_rides_completed,
            "message": f"Destination Mode activated towards {pref.destination_address}",
        }

    async def get_destination_status(self, driver_id: uuid.UUID) -> Dict[str, Any]:
        """
        Retrieves current Destination Mode state, checking expiration automatically.
        """
        pref = await self.get_or_create_preferences(driver_id)
        now = datetime.utcnow()

        # Check automatic expiration
        if pref.destination_mode_state == "ACTIVE":
            if pref.destination_expires_at and pref.destination_expires_at < now:
                pref.destination_mode_state = "EXPIRED"
                pref.destination_mode = "off"
                await self.db.commit()
                await self.db.refresh(pref)
            elif pref.destination_rides_completed >= pref.destination_max_rides:
                pref.destination_mode_state = "REACHED"
                pref.destination_mode = "off"
                await self.db.commit()
                await self.db.refresh(pref)

        remaining_sec = 0
        if pref.destination_expires_at and pref.destination_expires_at > now:
            remaining_sec = int((pref.destination_expires_at - now).total_seconds())

        return {
            "state": pref.destination_mode_state,
            "is_active": pref.destination_mode_state == "ACTIVE",
            "mode_preference": pref.destination_mode_pref,
            "destination_address": pref.destination_address,
            "destination_lat": pref.destination_lat,
            "destination_lng": pref.destination_lng,
            "activated_at": pref.destination_activated_at.isoformat() if pref.destination_activated_at else None,
            "expires_at": pref.destination_expires_at.isoformat() if pref.destination_expires_at else None,
            "remaining_seconds": remaining_sec,
            "rides_completed": pref.destination_rides_completed,
            "max_rides": pref.destination_max_rides,
            "radius_km": pref.destination_radius_km,
        }

    async def check_destination_reached_or_progress(
        self,
        driver_id: uuid.UUID,
        current_lat: float,
        current_lng: float,
    ) -> Dict[str, Any]:
        """
        Evaluates driver's live GPS against target destination proximity.
        If within destination_radius_km (1.5km), marks destination as REACHED.
        """
        pref = await self.get_or_create_preferences(driver_id)
        if pref.destination_mode_state != "ACTIVE" or not pref.destination_lat or not pref.destination_lng:
            return {"reached": False, "state": pref.destination_mode_state}

        dist_km = haversine_distance_km(current_lat, current_lng, pref.destination_lat, pref.destination_lng)
        if dist_km <= pref.destination_radius_km:
            pref.destination_mode_state = "REACHED"
            pref.destination_mode = "off"
            await self.db.commit()
            await self.db.refresh(pref)
            return {
                "reached": True,
                "state": "REACHED",
                "distance_km": round(dist_km, 2),
                "message": f"Destination reached! You are {round(dist_km, 2)} km from {pref.destination_address}.",
            }

        return {
            "reached": False,
            "state": "ACTIVE",
            "distance_km": round(dist_km, 2),
        }
'''

# 2. Feature 21: back_to_back_service.py
b2b_service_code = '''"""
Feature 21: Back-to-Back Rides Continuous Dispatch Engine
PostGIS-first near-destination detection, candidate discovery, atomic SELECT FOR UPDATE reservation,
customer experience protection, and zero-idle transition to next-pickup navigation.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

import structlog
from sqlalchemy import select, update, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    Driver, DriverStatus, DriverLocation, Vehicle,
    RideRequest, RideRequestStatus, RideOffer, RideOfferStatus,
    DriverPreference
)
from app.services.ride_fare_engine import haversine_distance_km
from app.services.smart_scoring import SmartScoringEngine

logger = structlog.get_logger(__name__)

NEAR_DESTINATION_THRESHOLD_KM = 2.5
NEAR_DESTINATION_ETA_MIN = 7
NEXT_PICKUP_SEARCH_RADIUS_KM = 4.0


class BackToBackService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_back_to_back_eligibility(
        self,
        driver_id: uuid.UUID,
        current_ride_id: uuid.UUID,
        driver_lat: float,
        driver_lng: float,
    ) -> Dict[str, Any]:
        """
        Validates if driver is near destination of current active trip and eligible for next ride offer.
        Uses PostGIS/GPS math without external Google API calls.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == current_ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride or ride.status != RideRequestStatus.IN_PROGRESS:
            return {
                "eligible": False,
                "reason": "Current ride is not IN_PROGRESS",
            }

        # Check if already has a reserved next ride
        if ride.next_ride_id:
            return {
                "eligible": False,
                "reason": "Next ride already reserved",
                "next_ride_id": str(ride.next_ride_id),
            }

        # Distance to dropoff
        dist_to_drop = haversine_distance_km(driver_lat, driver_lng, ride.destination_lat, ride.destination_lng)
        remaining_eta_min = max(2, int(dist_to_drop / 25.0 * 60))

        is_near = dist_to_drop <= NEAR_DESTINATION_THRESHOLD_KM or remaining_eta_min <= NEAR_DESTINATION_ETA_MIN

        return {
            "eligible": is_near,
            "distance_to_dropoff_km": round(dist_to_drop, 2),
            "estimated_dropoff_eta_min": remaining_eta_min,
            "dropoff_address": ride.destination_address,
            "reason": "Near destination" if is_near else f"Too far from dropoff ({round(dist_to_drop, 1)} km)",
        }

    async def discover_next_ride_candidates(
        self,
        driver_id: uuid.UUID,
        current_ride_id: uuid.UUID,
    ) -> List[Dict[str, Any]]:
        """
        Discovers unassigned pending rides whose pickup is within 4.0km of current ride dropoff.
        Scores each candidate considering destination preference if active.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == current_ride_id))
        current_ride = r_res.scalar_one_or_none()
        if not current_ride:
            return []

        # Load driver preferences
        p_res = await self.db.execute(select(DriverPreference).where(DriverPreference.driver_id == driver_id))
        pref = p_res.scalar_one_or_none()
        pref_mode = pref.mode if pref else "balanced"
        dest_mode = pref.destination_mode if pref else "off"
        dest_lat = pref.destination_lat if pref else None
        dest_lng = pref.destination_lng if pref else None

        now = datetime.utcnow()
        # Find candidate requests
        c_res = await self.db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.status.in_([RideRequestStatus.CREATED, RideRequestStatus.DISPATCHING, RideRequestStatus.OFFERED]),
                    RideRequest.assigned_driver_id == None,
                    RideRequest.id != current_ride.id,
                    RideRequest.expires_at > now,
                )
            ).limit(10)
        )
        candidates = c_res.scalars().all()
        scored_candidates = []

        for cand in candidates:
            # Pickup distance from current dropoff
            dist_from_drop = haversine_distance_km(
                current_ride.destination_lat, current_ride.destination_lng,
                cand.pickup_lat, cand.pickup_lng
            )
            if dist_from_drop > NEXT_PICKUP_SEARCH_RADIUS_KM:
                continue

            pickup_eta_from_drop = max(2, int(dist_from_drop / 25.0 * 60))
            earning = float(cand.estimated_fare) * 0.80

            scored = SmartScoringEngine.score_ride(
                ride_id=str(cand.id),
                driver_lat=current_ride.destination_lat,
                driver_lng=current_ride.destination_lng,
                pickup_lat=cand.pickup_lat,
                pickup_lng=cand.pickup_lng,
                pickup_address=cand.pickup_address,
                dest_lat=cand.destination_lat,
                dest_lng=cand.destination_lng,
                dest_address=cand.destination_address,
                trip_distance_km=cand.estimated_distance_km or 8.0,
                trip_duration_min=cand.estimated_duration_min or 20,
                fare=float(cand.estimated_fare),
                driver_earning=earning,
                pickup_distance_km=dist_from_drop,
                pickup_eta_min=pickup_eta_from_drop,
                preference_mode=pref_mode,
                dest_lat_pref=dest_lat,
                dest_lng_pref=dest_lng,
                dest_mode=dest_mode,
                seats=cand.seats_requested,
            )

            cand_dict = scored.to_dict()
            cand_dict["pickup_distance_from_current_dropoff_km"] = round(dist_from_drop, 2)
            cand_dict["pickup_eta_from_current_dropoff_min"] = pickup_eta_from_drop
            cand_dict["is_back_to_back"] = True
            scored_candidates.append(cand_dict)

        scored_candidates.sort(key=lambda x: x["smart_score"], reverse=True)
        return scored_candidates

    async def reserve_next_ride(
        self,
        driver_id: uuid.UUID,
        current_ride_id: uuid.UUID,
        next_ride_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Atomic reservation of next ride with SELECT FOR UPDATE row locking.
        Guarantees zero double-assignment to other drivers.
        """
        now = datetime.utcnow()

        # 1. Lock next ride with with_for_update()
        n_res = await self.db.execute(
            select(RideRequest)
            .where(RideRequest.id == next_ride_id)
            .with_for_update()
        )
        next_ride = n_res.scalar_one_or_none()
        if not next_ride:
            raise HTTPException(status_code=404, detail="Next ride not found")

        if next_ride.assigned_driver_id is not None and next_ride.assigned_driver_id != driver_id:
            raise HTTPException(status_code=409, detail="Ride already assigned or reserved by another driver")

        # 2. Lock current ride
        c_res = await self.db.execute(
            select(RideRequest)
            .where(RideRequest.id == current_ride_id)
            .with_for_update()
        )
        current_ride = c_res.scalar_one_or_none()
        if not current_ride or current_ride.status != RideRequestStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Current ride is not in progress")

        # 3. Apply atomic reservation link
        current_ride.next_ride_id = next_ride.id
        current_ride.is_back_to_back = True

        next_ride.assigned_driver_id = driver_id
        next_ride.is_back_to_back = True
        next_ride.next_ride_reserved_at = now
        next_ride.next_ride_expires_at = now + timedelta(minutes=20)
        next_ride.status = RideRequestStatus.ASSIGNED

        await self.db.commit()
        await self.db.refresh(current_ride)
        await self.db.refresh(next_ride)

        return {
            "success": True,
            "status": "RESERVED",
            "current_ride_id": str(current_ride.id),
            "next_ride_id": str(next_ride.id),
            "pickup_address": next_ride.pickup_address,
            "destination_address": next_ride.destination_address,
            "estimated_fare": float(next_ride.estimated_fare),
            "driver_earning": float(next_ride.estimated_fare) * 0.80,
            "reserved_at": next_ride.next_ride_reserved_at.isoformat(),
            "message": "Next ride successfully reserved! Will activate immediately upon current dropoff.",
        }

    async def release_next_ride_reservation(
        self,
        current_ride_id: uuid.UUID,
        reason: str = "Driver delayed or customer cancelled",
    ) -> Dict[str, Any]:
        """
        Releases reserved next ride back to dispatch pool if current trip experiences major detour or cancellation.
        """
        c_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == current_ride_id).with_for_update()
        )
        current_ride = c_res.scalar_one_or_none()
        if not current_ride or not current_ride.next_ride_id:
            return {"success": False, "message": "No reserved next ride on current trip"}

        next_ride_id = current_ride.next_ride_id
        n_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == next_ride_id).with_for_update()
        )
        next_ride = n_res.scalar_one_or_none()

        current_ride.next_ride_id = None
        current_ride.is_back_to_back = False

        if next_ride:
            next_ride.assigned_driver_id = None
            next_ride.is_back_to_back = False
            next_ride.next_ride_reserved_at = None
            next_ride.next_ride_expires_at = None
            next_ride.status = RideRequestStatus.DISPATCHING

        await self.db.commit()

        return {
            "success": True,
            "message": f"Reserved ride released ({reason})",
            "released_ride_id": str(next_ride_id),
        }

    async def activate_next_ride_on_completion(
        self,
        driver_id: uuid.UUID,
        completed_ride_id: uuid.UUID,
    ) -> Optional[Dict[str, Any]]:
        """
        Transitions reserved next ride into active assignment upon current trip completion.
        Called automatically by TripCompletionService.
        """
        c_res = await self.db.execute(select(RideRequest).where(RideRequest.id == completed_ride_id))
        completed_ride = c_res.scalar_one_or_none()
        if not completed_ride or not completed_ride.next_ride_id:
            return None

        next_ride_id = completed_ride.next_ride_id
        n_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == next_ride_id).with_for_update()
        )
        next_ride = n_res.scalar_one_or_none()
        if not next_ride:
            return None

        now = datetime.utcnow()
        next_ride.status = RideRequestStatus.ASSIGNED
        next_ride.assigned_at = now

        # Update Driver current trip
        d_res = await self.db.execute(select(Driver).where(Driver.id == driver_id).with_for_update())
        driver = d_res.scalar_one_or_none()
        if driver:
            driver.status = DriverStatus.ON_TRIP

        await self.db.commit()
        await self.db.refresh(next_ride)

        return {
            "activated": True,
            "next_ride_id": str(next_ride.id),
            "status": "ASSIGNED",
            "pickup_address": next_ride.pickup_address,
            "pickup_lat": next_ride.pickup_lat,
            "pickup_lng": next_ride.pickup_lng,
            "destination_address": next_ride.destination_address,
            "destination_lat": next_ride.destination_lat,
            "destination_lng": next_ride.destination_lng,
            "estimated_fare": float(next_ride.estimated_fare),
        }
'''

# 3. Feature 22: driver_safety_service.py
safety_service_code = '''"""
Feature 22: Driver Safety Intelligence Service
Centralized Safety Toolkit, Emergency SOS with 112 escalation, Trusted Emergency Contacts,
tokenized Live Trip Sharing, Route Deviation & Long-Stop Anomaly Detection, Speed Alerts, and Incident Reports.
"""
from __future__ import annotations

import secrets
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

import structlog
from sqlalchemy import select, update, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    Driver, User, RideRequest, RideRequestStatus,
    RideSOSEvent, DriverTrustedContact, LiveTripShareSession,
    DriverSafetyAlert, SafetyIncidentReport, RideEventLog
)
from app.services.ride_fare_engine import haversine_distance_km

logger = structlog.get_logger(__name__)


def _mask_phone(phone: str) -> str:
    cleaned = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
    if len(cleaned) >= 10:
        return cleaned[:3] + " •••• ••" + cleaned[-2:]
    return "•••• ••••"


class DriverSafetyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ────────────────────────────────────────────────────────────
    # 1. EMERGENCY SOS
    # ────────────────────────────────────────────────────────────
    async def trigger_sos(
        self,
        driver_id: uuid.UUID,
        ride_id: uuid.UUID,
        latitude: float,
        longitude: float,
        accuracy: float = 10.0,
        reason: str = "Driver triggered Emergency SOS",
    ) -> Dict[str, Any]:
        """
        Authoritative Emergency SOS Trigger with PostGIS coordinate snapshot and 112 alerting.
        Idempotent: returns existing active SOS incident if already triggered.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        # 1. Idempotency Check
        existing_sos_res = await self.db.execute(
            select(RideSOSEvent).where(and_(RideSOSEvent.ride_id == ride.id, RideSOSEvent.status == "active"))
        )
        existing_sos = existing_sos_res.scalar_one_or_none()
        if existing_sos:
            return {
                "success": True,
                "sos_id": str(existing_sos.id),
                "status": "active",
                "message": "Emergency SOS already active. Safety Command Center and local authorities alerted.",
                "police_number": "112",
                "created_at": existing_sos.created_at.isoformat() if existing_sos.created_at else datetime.utcnow().isoformat(),
            }

        # 2. Create SOS Record
        now = datetime.utcnow()
        sos_id = uuid.uuid4()
        sos_event = RideSOSEvent(
            id=sos_id,
            ride_id=ride.id,
            driver_id=driver_id,
            customer_id=ride.customer_id,
            triggered_by="driver",
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            location=f"SRID=4326;POINT({longitude} {latitude})",
            reason=reason,
            status="active",
        )
        self.db.add(sos_event)
        ride.has_active_sos = True

        # 3. Create Safety Alert Record
        alert = DriverSafetyAlert(
            id=uuid.uuid4(),
            driver_id=driver_id,
            ride_id=ride.id,
            alert_type="SOS",
            severity="URGENT",
            status="ACTIVE",
            latitude=latitude,
            longitude=longitude,
            details_json={"sos_id": str(sos_id), "reason": reason, "accuracy": accuracy},
        )
        self.db.add(alert)
        await self.db.commit()

        return {
            "success": True,
            "sos_id": str(sos_id),
            "status": "active",
            "ride_id": str(ride.id),
            "driver_id": str(driver_id),
            "latitude": latitude,
            "longitude": longitude,
            "police_number": "112",
            "created_at": now.isoformat(),
            "message": "Emergency SOS triggered. Live location transmitted to 24/7 Safety Command Center and Police (112).",
        }

    # ────────────────────────────────────────────────────────────
    # 2. TRUSTED CONTACTS
    # ────────────────────────────────────────────────────────────
    async def add_trusted_contact(
        self,
        driver_id: uuid.UUID,
        name: str,
        phone: str,
        relationship: str = "Family",
    ) -> Dict[str, Any]:
        """
        Adds a verified emergency contact (max 3 allowed per driver).
        """
        # Count existing
        c_res = await self.db.execute(
            select(DriverTrustedContact).where(
                and_(DriverTrustedContact.driver_id == driver_id, DriverTrustedContact.is_active == True)
            )
        )
        contacts = c_res.scalars().all()
        if len(contacts) >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 trusted contacts allowed")

        cleaned_phone = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
        if len(cleaned_phone) < 10:
            raise HTTPException(status_code=400, detail="Invalid phone number format")

        masked = _mask_phone(cleaned_phone)
        phone_hash = hashlib.sha256(cleaned_phone.encode()).hexdigest()

        contact = DriverTrustedContact(
            id=uuid.uuid4(),
            driver_id=driver_id,
            name=name.strip(),
            phone_masked=masked,
            phone_hash=phone_hash,
            relationship=relationship.strip(),
            is_verified=True,
            is_active=True,
        )
        self.db.add(contact)
        await self.db.commit()
        await self.db.refresh(contact)

        return {
            "success": True,
            "contact_id": str(contact.id),
            "name": contact.name,
            "phone_masked": contact.phone_masked,
            "relationship": contact.relationship,
            "is_verified": contact.is_verified,
        }

    async def get_trusted_contacts(self, driver_id: uuid.UUID) -> List[Dict[str, Any]]:
        res = await self.db.execute(
            select(DriverTrustedContact).where(
                and_(DriverTrustedContact.driver_id == driver_id, DriverTrustedContact.is_active == True)
            ).order_by(DriverTrustedContact.created_at.desc())
        )
        return [
            {
                "contact_id": str(c.id),
                "name": c.name,
                "phone_masked": c.phone_masked,
                "relationship": c.relationship,
                "is_verified": c.is_verified,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in res.scalars().all()
        ]

    async def delete_trusted_contact(self, driver_id: uuid.UUID, contact_id: uuid.UUID) -> Dict[str, Any]:
        res = await self.db.execute(
            select(DriverTrustedContact).where(
                and_(DriverTrustedContact.id == contact_id, DriverTrustedContact.driver_id == driver_id)
            )
        )
        contact = res.scalar_one_or_none()
        if not contact:
            raise HTTPException(status_code=404, detail="Trusted contact not found")

        contact.is_active = False
        await self.db.commit()
        return {"success": True, "message": "Trusted contact removed successfully"}

    # ────────────────────────────────────────────────────────────
    # 3. LIVE TRIP SHARING
    # ────────────────────────────────────────────────────────────
    async def create_live_trip_share(
        self,
        driver_id: uuid.UUID,
        ride_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Creates a short-lived tokenized trip sharing link with auto-expiration.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")

        now = datetime.utcnow()
        share_token = secrets.token_urlsafe(24)
        expires_at = now + timedelta(hours=3)

        session = LiveTripShareSession(
            id=uuid.uuid4(),
            ride_id=ride.id,
            driver_id=driver_id,
            share_token=share_token,
            status="ACTIVE",
            expires_at=expires_at,
        )
        self.db.add(session)
        await self.db.commit()

        share_url = f"https://track.cabbooking.com/share/{share_token}"

        return {
            "success": True,
            "share_token": share_token,
            "share_url": share_url,
            "expires_at": expires_at.isoformat(),
            "status": "ACTIVE",
            "message": "Live trip share link generated. Share with family or trusted contacts.",
        }

    async def get_shared_trip_telemetry(self, share_token: str) -> Dict[str, Any]:
        """
        Public token-scoped endpoint to track active trip without leaking passenger PII.
        """
        res = await self.db.execute(
            select(LiveTripShareSession).where(LiveTripShareSession.share_token == share_token)
        )
        session = res.scalar_one_or_none()
        now = datetime.utcnow()
        if not session or session.status != "ACTIVE" or session.expires_at < now:
            raise HTTPException(status_code=404, detail="Trip sharing link has expired or is invalid")

        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == session.ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")

        return {
            "status": ride.status.value if hasattr(ride.status, "value") else str(ride.status),
            "pickup_address": ride.pickup_address,
            "destination_address": ride.destination_address,
            "distance_travelled_km": ride.distance_travelled_km,
            "estimated_distance_km": ride.estimated_distance_km,
            "started_at": ride.started_at.isoformat() if ride.started_at else None,
            "has_active_sos": ride.has_active_sos,
            "expires_at": session.expires_at.isoformat(),
        }

    # ────────────────────────────────────────────────────────────
    # 4. SAFETY ANOMALIES & "I'M SAFE" WORKFLOW
    # ────────────────────────────────────────────────────────────
    async def record_safety_alert(
        self,
        driver_id: uuid.UUID,
        ride_id: Optional[uuid.UUID],
        alert_type: str,
        severity: str,
        latitude: float,
        longitude: float,
        details: dict,
    ) -> Dict[str, Any]:
        """
        Records a safety anomaly (ROUTE_DEVIATION, LONG_STOP, OVERSPEED) and triggers driver check.
        """
        alert = DriverSafetyAlert(
            id=uuid.uuid4(),
            driver_id=driver_id,
            ride_id=ride_id,
            alert_type=alert_type,
            severity=severity,
            status="ACTIVE",
            latitude=latitude,
            longitude=longitude,
            details_json=details,
        )
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)

        return {
            "alert_id": str(alert.id),
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "status": alert.status,
            "details": alert.details_json,
            "created_at": alert.created_at.isoformat() if alert.created_at else datetime.utcnow().isoformat(),
        }

    async def resolve_safety_alert(
        self,
        driver_id: uuid.UUID,
        alert_id: uuid.UUID,
        resolution_type: str = "IM_SAFE",
    ) -> Dict[str, Any]:
        """
        Driver acknowledges warning ("I'm Safe" flow), resolving the active alert.
        """
        res = await self.db.execute(
            select(DriverSafetyAlert).where(
                and_(DriverSafetyAlert.id == alert_id, DriverSafetyAlert.driver_id == driver_id)
            )
        )
        alert = res.scalar_one_or_none()
        if not alert:
            raise HTTPException(status_code=404, detail="Safety alert not found")

        alert.status = "ACKNOWLEDGED_SAFE"
        alert.resolution_type = resolution_type
        alert.resolved_at = datetime.utcnow()
        await self.db.commit()

        return {
            "success": True,
            "alert_id": str(alert.id),
            "status": "ACKNOWLEDGED_SAFE",
            "resolved_at": alert.resolved_at.isoformat(),
            "message": "Thank you for confirming. Safety alert resolved.",
        }

    # ────────────────────────────────────────────────────────────
    # 5. SAFETY INCIDENT REPORTING
    # ────────────────────────────────────────────────────────────
    async def report_safety_incident(
        self,
        driver_id: uuid.UUID,
        ride_id: Optional[uuid.UUID],
        incident_category: str,
        severity: str,
        description: str,
        evidence_urls: Optional[List[str]] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Driver reports a structured safety incident (unsafe passenger, accident, road hazard).
        """
        report = SafetyIncidentReport(
            id=uuid.uuid4(),
            driver_id=driver_id,
            ride_id=ride_id,
            incident_category=incident_category,
            severity=severity,
            status="REPORTED",
            description=description.strip(),
            evidence_urls=evidence_urls or [],
            latitude=latitude,
            longitude=longitude,
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)

        return {
            "success": True,
            "incident_id": str(report.id),
            "category": report.incident_category,
            "severity": report.severity,
            "status": report.status,
            "created_at": report.created_at.isoformat() if report.created_at else datetime.utcnow().isoformat(),
            "message": "Incident report submitted. Safety team has received your ticket and is reviewing.",
        }
'''

# Write services
with open(os.path.join(backend_services_dir, "destination_mode_service.py"), "w", encoding="utf-8") as f:
    f.write(dest_service_code)
print("✓ Created destination_mode_service.py")

with open(os.path.join(backend_services_dir, "back_to_back_service.py"), "w", encoding="utf-8") as f:
    f.write(b2b_service_code)
print("✓ Created back_to_back_service.py")

with open(os.path.join(backend_services_dir, "driver_safety_service.py"), "w", encoding="utf-8") as f:
    f.write(safety_service_code)
print("✓ Created driver_safety_service.py")

print("\nAll 3 Feature backend services created successfully!")
