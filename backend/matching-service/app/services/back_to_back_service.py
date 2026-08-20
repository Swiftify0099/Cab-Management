"""
Feature 21: Back-to-Back Rides Continuous Dispatch Engine
PostGIS-first near-destination detection, candidate discovery, atomic SELECT FOR UPDATE reservation,
customer experience protection, and zero-idle transition to next-pickup navigation.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
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

        now = datetime.now(timezone.utc)
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
        now = datetime.now(timezone.utc)

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

        now = datetime.now(timezone.utc)
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
