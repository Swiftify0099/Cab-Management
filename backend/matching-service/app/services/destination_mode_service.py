"""
Feature 20: Destination Mode Service
Authoritative destination mode preferences, PostGIS spatial cone filtering, vector directional alignment,
configurable modes (Flexible, Balanced, Strict), auto-expiry, and reached detection.
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone, timedelta
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
        destination_address: Optional[str] = None,
        destination_lat: Optional[float] = None,
        destination_lng: Optional[float] = None,
        preference_mode: str = "balanced",
        max_rides: int = 2,
        turn_off: bool = False,
    ) -> Dict[str, Any]:
        """
        Activates, updates, or disables Destination Mode for a driver.
        """
        pref = await self.get_or_create_preferences(driver_id)
        now = datetime.now(timezone.utc)

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
        now = datetime.now(timezone.utc)

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
