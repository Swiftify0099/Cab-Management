"""
Smart Ride Radar Service — Feature 6.
Manages candidate ride pool discovery, visibility preference filtering (ALL_CITY, SPECIFIC_CITY, SPECIFIC_HEX),
rejection exclusion, personalized scoring/ranking, and real-time Socket.IO sync.
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
    RideRequest, RideRequestStatus, Vehicle,
    RideOffer, RideOfferStatus,
    DriverCityCoverage, DriverHexCoverage,
)
from common.utils.redis_client import get_redis, publish_event
from app.services.smart_scoring import SmartScoringEngine, ScoredRide
from app.services.ride_fare_engine import haversine_distance_km

logger = structlog.get_logger(__name__)

SMART_RADAR_MAX_CANDIDATES = 10
RADAR_SEARCH_RADIUS_KM = 15.0


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
                visibility_mode="all_city",
                allow_local=True,
                allow_airport=True,
                allow_outstation=False,
                allow_scheduled=True,
                min_earning_cutoff=0.0,
                max_pickup_distance_km=15.0,
                max_pickup_eta_min=30,
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
        visibility_mode: Optional[str] = None,
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
        if visibility_mode is not None: pref.visibility_mode = visibility_mode
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

    async def get_smart_radar_count(self, driver_user_id: str) -> int:
        """
        Calculates COUNT of active ride requests eligible for this driver:
        - status IN (CREATED, MATCHING, DISPATCHING, OFFERED)
        - not expired
        - not assigned
        - not cancelled
        - not already rejected by this driver
        - matches driver visibility preference (ALL_CITY, SPECIFIC_CITY, SPECIFIC_HEX)
        """
        rides = await self.get_smart_radar_rides(driver_user_id, filter_type="all")
        return len(rides)

    async def get_smart_radar_rides(
        self,
        driver_user_id: str,
        filter_type: str = "all",
    ) -> List[dict]:
        """
        Discovers, hard-filters (coverage + rejection + proximity), scores, and ranks
        candidate rides for the driver's Smart Radar.
        """
        # 1. Resolve driver & verify HARD ELIGIBILITY
        d_res = await self.db.execute(
            select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id))
        )
        driver = d_res.scalar_one_or_none()
        if not driver:
            return []

        status_val = driver.status.value if hasattr(driver.status, "value") else str(driver.status)
        kyc_val = driver.kyc_status.value if hasattr(driver.kyc_status, "value") else str(driver.kyc_status)
        if status_val.lower() not in ("online",) or kyc_val.lower() not in ("approved",):
            return []

        # Load preferences
        pref = await self.get_or_create_driver_preferences(driver.id)
        visibility_mode = pref.visibility_mode or "all_city"

        # 2. Get driver coordinates
        from common.models.all_models import DriverLocation
        loc_res = await self.db.execute(
            select(DriverLocation).where(DriverLocation.driver_id == driver.id)
        )
        driver_loc = loc_res.scalar_one_or_none()
        driver_lat = driver_loc.latitude if driver_loc else 18.5204
        driver_lng = driver_loc.longitude if driver_loc else 73.8567

        # 3. Fetch driver's city coverage IDs & hex coverage IDs
        city_cov_res = await self.db.execute(
            select(DriverCityCoverage).where(
                and_(DriverCityCoverage.driver_id == driver.id, DriverCityCoverage.is_active == True)
            )
        )
        city_coverages = city_cov_res.scalars().all()
        all_covered_city_ids = {c.city_id for c in city_coverages}
        selected_city_ids = {c.city_id for c in city_coverages if c.is_selected}

        hex_cov_res = await self.db.execute(
            select(DriverHexCoverage.hex_id).where(
                and_(DriverHexCoverage.driver_id == driver.id, DriverHexCoverage.is_active == True)
            )
        )
        covered_hex_ids = set(hex_cov_res.scalars().all())

        # 4. Fetch list of ride_request_ids this driver has already rejected or superseded
        rej_res = await self.db.execute(
            select(RideOffer.ride_request_id).where(
                and_(
                    RideOffer.driver_id == driver.id,
                    RideOffer.status.in_([RideOfferStatus.REJECTED, RideOfferStatus.EXPIRED, RideOfferStatus.REMOVED])
                )
            )
        )
        excluded_req_ids = set(rej_res.scalars().all())

        # 5. Query candidate requests
        now = datetime.utcnow()
        req_res = await self.db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.status.in_([
                        RideRequestStatus.CREATED,
                        RideRequestStatus.MATCHING,
                        RideRequestStatus.DISPATCHING,
                        RideRequestStatus.OFFERED,
                    ]),
                    RideRequest.assigned_driver_id == None,
                    RideRequest.expires_at > now,
                )
            ).order_by(RideRequest.created_at.desc()).limit(50)
        )
        candidate_requests = req_res.scalars().all()

        scored_list: List[ScoredRide] = []

        for req in candidate_requests:
            # Exclude already rejected / removed by this driver
            if req.id in excluded_req_ids:
                continue

            # ── VISIBILITY MODE COVERAGE FILTER ──
            if visibility_mode == "all_city":
                # In all_city mode, all cities are eligible
                pass
            elif visibility_mode == "specific_city":
                if req.pickup_city_id and selected_city_ids and req.pickup_city_id not in selected_city_ids:
                    continue
            elif visibility_mode == "specific_hex":
                if req.pickup_hex_id and covered_hex_ids and req.pickup_hex_id not in covered_hex_ids:
                    continue

            # Straight line pickup distance (Physical proximity check)
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

            # Ensure an active RideOffer exists for this driver so they can accept/reject directly
            offer_res = await self.db.execute(
                select(RideOffer).where(
                    and_(RideOffer.ride_request_id == req.id, RideOffer.driver_id == driver.id)
                )
            )
            existing_offer = offer_res.scalar_one_or_none()
            offer_id_str = str(existing_offer.id) if existing_offer else f"off-{req.id}-{driver.id}"

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

            # Add offer_id & created_at timestamp metadata for UI
            scored_dict = scored.to_dict()
            scored_dict["offer_id"] = offer_id_str
            scored_dict["ride_request_id"] = str(req.id)
            scored_dict["created_at"] = req.created_at.isoformat() if req.created_at else None
            scored_dict["age_seconds"] = int((now - req.created_at).total_seconds()) if req.created_at else 0

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

            scored_list.append(scored_dict)

        # Sort by Smart Score descending
        scored_list.sort(key=lambda s: s.get("smart_score", 0), reverse=True)

        return scored_list[:SMART_RADAR_MAX_CANDIDATES]
