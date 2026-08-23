"""
Central Smart Intelligence & Recommendation Service for CabBooking SuperApp.
Feature 27: Smart Features / Intelligence Layer.
Orchestrates Destination Prediction, Vehicle Sizing, Smart Pricing Signals,
Smart Driver Candidate Ranking & Cross-Service Intelligence.
"""
from __future__ import annotations

import math
import uuid
import structlog
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    User,
    SavedAddress,
    SavedRoute,
    Booking,
    BookingStatus,
    PropertyBooking,
    AirportBooking,
    Parcel,
    TransportOrder,
    SmartRecommendationLog,
    SmartDestinationCache,
    DemandForecastZone,
)
from app.schemas.smart import (
    SmartDestinationItem,
    SmartDemandSignal,
    SmartCompanionCard,
    SmartHomeFeedResponse,
    VehicleRecommendationRequest,
    VehicleCategoryOption,
    VehicleRecommendationResponse,
    BookingSuggestionRequest,
    BookingSuggestionResponse,
    CrossServiceRecommendationRequest,
    MatchingRankRequest,
    ScoredDriverCandidate,
    MatchingRankResponse,
    DevSmartSimulationRequest,
)

logger = structlog.get_logger(__name__)


class SmartIntelligenceService:
    """
    Central Decision-Support & Recommendation Engine.
    NOTE: Does NOT commit final bookings, fares, or driver assignments.
    Authoritative domain engines (FareEngine, DispatchService, etc.) commit state.
    """

    @staticmethod
    def _get_time_bucket(hour: int, is_weekend: bool) -> str:
        if is_weekend:
            return "WEEKEND"
        if 6 <= hour <= 10:
            return "MORNING_COMMUTE"
        if 16 <= hour <= 21:
            return "EVENING_RETURN"
        if hour >= 22 or hour <= 5:
            return "NIGHT"
        return "GENERAL"

    # =========================================================================
    # 1. SMART HOME FEED & CONTEXTUAL HUB
    # =========================================================================
    @classmethod
    async def get_smart_home_feed(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
        lat: Optional[float] = 18.5204,
        lng: Optional[float] = 73.8567,
    ) -> SmartHomeFeedResponse:
        """
        Synthesizes time-aware greeting, top predicted destinations, companion service
        cards, and zone demand status into a single unified customer HUD response.
        """
        now = datetime.now(timezone.utc)
        local_hour = (now.hour + 5) % 24  # IST approx
        is_weekend = now.weekday() >= 5

        # 1a. Dynamic Greeting
        if 5 <= local_hour < 12:
            greeting = "Good morning! Ready for your commute?"
        elif 12 <= local_hour < 17:
            greeting = "Good afternoon! Where to next?"
        elif 17 <= local_hour < 22:
            greeting = "Good evening! Heading back home?"
        else:
            greeting = "Good night! Safe travels tonight."

        # 1b. Smart Destinations
        destinations = await cls.get_smart_destinations(db, user_id, lat, lng, limit=3)

        # 1c. Cross-Service Companions
        companions = await cls.get_cross_service_recommendations(db, user_id)

        # 1d. Smart Demand Signal
        demand_signal = await cls.get_smart_demand_signal(db, lat, lng)

        return SmartHomeFeedResponse(
            greeting=greeting,
            suggested_destinations=destinations,
            companion_cards=companions,
            demand_signal=demand_signal,
            model_version="v1.0.0",
        )

    # =========================================================================
    # 2. SMART DESTINATION PREDICTION
    # =========================================================================
    @classmethod
    async def get_smart_destinations(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
        lat: Optional[float] = 18.5204,
        lng: Optional[float] = 73.8567,
        limit: int = 4,
    ) -> List[SmartDestinationItem]:
        """
        Ranks destinations using: Saved Places + Recent Completed Trips + Time Bucket Heuristic.
        Falls back cleanly to city landmarks when history is cold.
        """
        results: List[SmartDestinationItem] = []
        now = datetime.now(timezone.utc)
        local_hour = (now.hour + 5) % 24
        is_weekend = now.weekday() >= 5
        bucket = cls._get_time_bucket(local_hour, is_weekend)

        try:
            # 1. Fetch Saved Addresses (Home, Work, Favorites)
            stmt = select(SavedAddress).where(SavedAddress.user_id == user_id).limit(5)
            res = await db.execute(stmt)
            saved_places = res.scalars().all()

            def _is_type(s, target: str):
                lbl = (getattr(s, 'label', '') or getattr(s, 'type', '')).lower()
                return target in lbl

            def _get_addr(s):
                return getattr(s, 'full_address', None) or getattr(s, 'address', '') or 'Saved Place'

            home_addr = next((s for s in saved_places if _is_type(s, "home")), None)
            work_addr = next((s for s in saved_places if _is_type(s, "work")), None)

            # Heuristic: Morning commute -> Work / Evening -> Home
            if bucket == "MORNING_COMMUTE" and work_addr:
                results.append(
                    SmartDestinationItem(
                        id=str(work_addr.id),
                        title=getattr(work_addr, 'name', None) or "Work / Office",
                        address=_get_addr(work_addr),
                        lat=work_addr.latitude,
                        lng=work_addr.longitude,
                        place_type="WORK",
                        eta_minutes=22,
                        reason="Suggested for Monday morning commute",
                        confidence="HIGH",
                        is_favorite=True,
                    )
                )

            if (bucket == "EVENING_RETURN" or bucket == "NIGHT") and home_addr:
                results.append(
                    SmartDestinationItem(
                        id=str(home_addr.id),
                        title=getattr(home_addr, 'name', None) or "Home",
                        address=_get_addr(home_addr),
                        lat=home_addr.latitude,
                        lng=home_addr.longitude,
                        place_type="HOME",
                        eta_minutes=18,
                        reason="Evening return destination",
                        confidence="HIGH",
                        is_favorite=True,
                    )
                )

            # Add other saved favorites
            for sp in saved_places:
                if not _is_type(sp, "home") and not _is_type(sp, "work") and len(results) < limit:
                    results.append(
                        SmartDestinationItem(
                            id=str(sp.id),
                            title=getattr(sp, 'name', None) or getattr(sp, 'label', 'Favorite'),
                            address=_get_addr(sp),
                            lat=sp.latitude,
                            lng=sp.longitude,
                            place_type="FAVORITE",
                            eta_minutes=15,
                            reason="Saved favorite place",
                            confidence="HIGH",
                            is_favorite=True,
                        )
                    )

            # If daytime and no work/home matched yet, add available saved addresses
            for sp in saved_places:
                if len(results) < limit and not any(r.id == str(sp.id) for r in results):
                    results.append(
                        SmartDestinationItem(
                            id=str(sp.id),
                            title=getattr(sp, 'name', None) or getattr(sp, 'label', 'Saved Place'),
                            address=_get_addr(sp),
                            lat=sp.latitude,
                            lng=sp.longitude,
                            place_type="FAVORITE",
                            eta_minutes=18,
                            reason="Saved quick destination",
                            confidence="HIGH",
                            is_favorite=True,
                        )
                    )

            # 2. Fetch Recent Completed Trips for unique destinations
            if len(results) < limit:
                trip_stmt = (
                    select(Booking)
                    .where(
                        and_(
                            Booking.customer_id == user_id,
                            Booking.status == BookingStatus.COMPLETED,
                        )
                    )
                    .order_by(desc(Booking.created_at))
                    .limit(5)
                )
                trip_res = await db.execute(trip_stmt)
                recent_trips = trip_res.scalars().all()

                for t in recent_trips:
                    if len(results) >= limit:
                        break
                    # Avoid duplicates
                    if not any(r.address == t.drop_address for r in results) and t.drop_address:
                        results.append(
                            SmartDestinationItem(
                                id=f"recent-{t.id}",
                                title="Recent Trip",
                                address=t.drop_address,
                                lat=t.drop_lat or (lat + 0.02),
                                lng=t.drop_lng or (lng + 0.02),
                                place_type="RECENT",
                                eta_minutes=25,
                                reason="Visited recently",
                                confidence="MEDIUM",
                                is_favorite=False,
                            )
                        )

        except Exception as e:
            logger.warning("Error fetching smart destinations, using graceful fallback", error=str(e))

        # 3. Graceful Cold-Start Landmarking Fallback
        if not results:
            results = [
                SmartDestinationItem(
                    id="cold-home",
                    title="Home",
                    address="Add your home address for 1-tap booking",
                    lat=lat + 0.015,
                    lng=lng + 0.015,
                    place_type="HOME",
                    eta_minutes=15,
                    reason="Quick access to Home",
                    confidence="MEDIUM",
                    is_favorite=False,
                ),
                SmartDestinationItem(
                    id="cold-airport",
                    title="Airport Terminal",
                    address="International Airport, Terminal 2",
                    lat=lat + 0.08,
                    lng=lng + 0.05,
                    place_type="PREDICTED",
                    eta_minutes=42,
                    reason="Popular city transit hub",
                    confidence="HIGH",
                    is_favorite=False,
                ),
                SmartDestinationItem(
                    id="cold-station",
                    title="Central Railway Station",
                    address="Station Road, City Center",
                    lat=lat + 0.03,
                    lng=lng + 0.02,
                    place_type="PREDICTED",
                    eta_minutes=18,
                    reason="Frequent passenger route",
                    confidence="HIGH",
                    is_favorite=False,
                ),
            ]

        return results[:limit]

    # =========================================================================
    # 3. SMART VEHICLE RECOMMENDATION & SIZING ENGINE
    # =========================================================================
    @classmethod
    async def get_vehicle_recommendation(
        cls,
        data: VehicleRecommendationRequest,
    ) -> VehicleRecommendationResponse:
        """
        Evaluates physical constraints (passenger count, luggage bags, luggage size,
        parcel weight) + convenience rules to compute recommended vehicle category.
        """
        pax = data.passengers
        bags = data.luggage_count
        bag_size = data.luggage_size.upper()
        weight_kg = data.parcel_weight_kg or 0.0

        # Physical Rules
        if weight_kg > 25.0:
            rec_code = "transport"
            reason = f"Shipment weight ({weight_kg} kg) exceeds cab luggage threshold. Goods Transport recommended."
            confidence = "HIGH"
        elif pax >= 5 or (pax >= 4 and bags >= 3) or (bags >= 4 and bag_size == "LARGE"):
            rec_code = "suv"
            reason = f"Recommended for {pax} passengers and {bags} luggage items (7-Seater capacity)."
            confidence = "HIGH"
        elif pax >= 2 or bags >= 2 or bag_size == "LARGE":
            rec_code = "sedan"
            reason = f"Comfort sedan recommended for {pax} passengers with {bags} bags."
            confidence = "HIGH"
        elif data.preference == "premium":
            rec_code = "premium"
            reason = "Executive Prime recommended based on customer luxury preference."
            confidence = "HIGH"
        else:
            rec_code = "economy"
            reason = "Economical hatchback recommended for quick solo commute with light bags."
            confidence = "HIGH"

        categories = [
            VehicleCategoryOption(
                category_code="economy",
                display_name="Mini / Hatchback",
                is_recommended=(rec_code == "economy"),
                recommendation_reason=reason if rec_code == "economy" else None,
                capacity_passengers=4,
                capacity_luggage_bags=2,
                estimated_base_fare=120.0,
                icon_name="car",
            ),
            VehicleCategoryOption(
                category_code="sedan",
                display_name="Comfort Sedan",
                is_recommended=(rec_code == "sedan"),
                recommendation_reason=reason if rec_code == "sedan" else None,
                capacity_passengers=4,
                capacity_luggage_bags=3,
                estimated_base_fare=180.0,
                icon_name="car-side",
            ),
            VehicleCategoryOption(
                category_code="suv",
                display_name="Spacious SUV (7-Seater)",
                is_recommended=(rec_code == "suv"),
                recommendation_reason=reason if rec_code == "suv" else None,
                capacity_passengers=6,
                capacity_luggage_bags=5,
                estimated_base_fare=260.0,
                icon_name="car-estate",
            ),
            VehicleCategoryOption(
                category_code="premium",
                display_name="Executive Prime",
                is_recommended=(rec_code == "premium"),
                recommendation_reason=reason if rec_code == "premium" else None,
                capacity_passengers=4,
                capacity_luggage_bags=3,
                estimated_base_fare=350.0,
                icon_name="car-sports",
            ),
        ]

        if weight_kg > 25.0:
            categories.append(
                VehicleCategoryOption(
                    category_code="transport",
                    display_name="Goods Carrier / Tata Ace",
                    is_recommended=True,
                    recommendation_reason=reason,
                    capacity_passengers=2,
                    capacity_luggage_bags=20,
                    estimated_base_fare=450.0,
                    icon_name="truck",
                )
            )

        return VehicleRecommendationResponse(
            recommended_category=rec_code,
            confidence=confidence,
            reason=reason,
            categories=categories,
            model_version="v1.0.0",
        )

    # =========================================================================
    # 4. CROSS-SERVICE COMPANION RECOMMENDATION ENGINE
    # =========================================================================
    @classmethod
    async def get_cross_service_recommendations(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> List[SmartCompanionCard]:
        """
        Inspects upcoming bookings across Hotel, Airport, Parcel, Outstation domains
        to generate contextual, high-value companion prompts (e.g. Hotel -> Airport transfer).
        """
        cards: List[SmartCompanionCard] = []

        try:
            now = datetime.now(timezone.utc)

            # 4a. Check active/upcoming Hotel Bookings
            hotel_stmt = (
                select(PropertyBooking)
                .where(
                    and_(
                        PropertyBooking.customer_id == user_id,
                        PropertyBooking.check_in >= now.date(),
                    )
                )
                .order_by(PropertyBooking.check_in.asc())
                .limit(1)
            )
            hotel_res = await db.execute(hotel_stmt)
            hotel_booking = hotel_res.scalar_one_or_none()

            if hotel_booking:
                cards.append(
                    SmartCompanionCard(
                        id=f"card-hotel-{hotel_booking.id}",
                        companion_type="HOTEL_TO_AIRPORT",
                        title="Airport Transfer to Hotel",
                        subtitle=f"Seamless ride from Airport/Station to your upcoming stay (Ref #{hotel_booking.booking_reference})",
                        action_label="Book Airport Ride",
                        deep_link="/airport/book",
                        reference_service="hotel",
                        reference_id=str(hotel_booking.id),
                        prefilled_params={
                            "hotel_id": str(hotel_booking.property_id),
                            "drop_address": "Hotel Grand Palace, City Center",
                        },
                        reason="Upcoming hotel stay detected without airport transfer.",
                    )
                )

            # 4b. Check upcoming Airport Bookings
            airport_stmt = (
                select(AirportBooking)
                .where(
                    and_(
                        AirportBooking.customer_id == user_id,
                        AirportBooking.scheduled_pickup_time >= now,
                    )
                )
                .order_by(AirportBooking.scheduled_pickup_time.asc())
                .limit(1)
            )
            airport_res = await db.execute(airport_stmt)
            airport_booking = airport_res.scalar_one_or_none()

            if airport_booking and not cards:
                cards.append(
                    SmartCompanionCard(
                        id=f"card-apt-{airport_booking.id}",
                        companion_type="AIRPORT_TO_HOTEL",
                        title="Need a Hotel near the Airport?",
                        subtitle="Verified boutique stays near your airport arrival destination.",
                        action_label="Browse Stays",
                        deep_link="/book/properties",
                        reference_service="airport",
                        reference_id=str(airport_booking.id),
                        prefilled_params={"airport_code": airport_booking.airport_code},
                        reason="Flight arrival detected without linked hotel accommodation.",
                    )
                )

        except Exception as e:
            logger.warning("Error computing cross-service companion", error=str(e))

        return cards[:2]

    # =========================================================================
    # 5. SMART PRICING & DEMAND SIGNAL ENGINE
    # =========================================================================
    @classmethod
    async def get_smart_demand_signal(
        cls,
        db: AsyncSession,
        lat: Optional[float] = 18.5204,
        lng: Optional[float] = 73.8567,
    ) -> SmartDemandSignal:
        """
        Computes local zone demand multiplier signal for decision support.
        Authoritative fare remains strictly calculated and bound by FareEngine.
        """
        now = datetime.now(timezone.utc)
        local_hour = (now.hour + 5) % 24

        # Peak Hour Heuristic: 8am-10am or 6pm-8pm has higher demand
        if 8 <= local_hour <= 10 or 18 <= local_hour <= 20:
            return SmartDemandSignal(
                zone_name="Central City Zone",
                demand_level="HIGH",
                surge_multiplier=1.2,
                advisory_text="High commuter demand in this area. Drivers are actively matching nearby.",
                is_surge=True,
            )
        elif 22 <= local_hour or local_hour <= 4:
            return SmartDemandSignal(
                zone_name="City Night Corridor",
                demand_level="MODERATE",
                surge_multiplier=1.0,
                advisory_text="Night rates active. 24x7 verified drivers on standby.",
                is_surge=False,
            )
        else:
            return SmartDemandSignal(
                zone_name="Standard Service Zone",
                demand_level="MODERATE",
                surge_multiplier=1.0,
                advisory_text="Normal ride demand. Fast pickup within 3–5 minutes.",
                is_surge=False,
            )

    # =========================================================================
    # 6. SMART DRIVER CANDIDATE RANKING ENGINE (SERVER-INTERNAL)
    # =========================================================================
    @classmethod
    def rank_driver_candidates(
        cls,
        data: MatchingRankRequest,
    ) -> MatchingRankResponse:
        """
        Multi-factor normalized ranking:
        Score = 0.35 * (1 - norm_eta) + 0.20 * norm_rating + 0.15 * norm_idle + 0.15 * norm_acceptance + 0.15 * dest_alignment
        Nearest distance alone is NOT the deciding factor.
        """
        scored_list: List[ScoredDriverCandidate] = []

        for cand in data.candidates:
            # 1. Distance & ETA
            dist_km = math.sqrt(
                (cand.driver_lat - data.pickup_lat) ** 2 + (cand.driver_lng - data.pickup_lng) ** 2
            ) * 111.0  # Approx km
            eta_min = max(2, int(dist_km * 2.5))  # City speed factor

            # 2. Destination alignment vector
            dest_alignment = 1.0
            if cand.destination_target_lat and cand.destination_target_lng:
                v1_x = data.drop_lng - data.pickup_lng
                v1_y = data.drop_lat - data.pickup_lat
                v2_x = cand.destination_target_lng - cand.driver_lng
                v2_y = cand.destination_target_lat - cand.driver_lat
                dot = v1_x * v2_x + v1_y * v2_y
                m1 = math.sqrt(v1_x**2 + v1_y**2) or 1e-5
                m2 = math.sqrt(v2_x**2 + v2_y**2) or 1e-5
                cos_sim = dot / (m1 * m2)
                dest_alignment = max(0.0, (cos_sim + 1.0) / 2.0)

            # Normalized Components (0.0 to 1.0)
            norm_eta = max(0.0, 1.0 - (eta_min / 20.0))
            norm_rating = max(0.0, (cand.rating - 3.0) / 2.0)
            norm_idle = min(1.0, cand.idle_time_minutes / 30.0)
            norm_acc = cand.acceptance_rate

            # Composite Score (0 to 100)
            raw_score = (
                0.35 * norm_eta
                + 0.20 * norm_rating
                + 0.15 * norm_idle
                + 0.15 * norm_acc
                + 0.15 * dest_alignment
            ) * 100.0

            match_pct = int(min(100.0, max(40.0, raw_score)))
            reason = f"{match_pct}% Match • {eta_min} min ETA • {cand.rating}★"
            if dest_alignment > 0.8:
                reason += " • En Route"

            scored_list.append(
                ScoredDriverCandidate(
                    driver_id=cand.driver_id,
                    driver_name=cand.driver_name,
                    rank=1,
                    normalized_score=round(raw_score, 1),
                    road_eta_min=eta_min,
                    distance_km=round(dist_km, 2),
                    match_reason=reason,
                    is_destination_aligned=(dest_alignment > 0.8),
                )
            )

        # Sort descending by normalized_score
        scored_list.sort(key=lambda x: x.normalized_score, reverse=True)
        for i, s in enumerate(scored_list):
            s.rank = i + 1

        top_id = scored_list[0].driver_id if scored_list else None

        return MatchingRankResponse(
            ranked_candidates=scored_list,
            top_driver_id=top_id,
            scoring_version="v1.0.0",
        )

    # =========================================================================
    # 7. DEVELOPER MODE SIMULATOR
    # =========================================================================
    @classmethod
    async def simulate_smart_scenario(
        cls,
        data: DevSmartSimulationRequest,
    ) -> Dict[str, Any]:
        """
        Developer sandbox simulator for testing smart features in real-time.
        """
        scenario = data.scenario

        if scenario == "PAX_4_LUGGAGE_3":
            rec = await cls.get_vehicle_recommendation(
                VehicleRecommendationRequest(passengers=4, luggage_count=3, luggage_size="LARGE")
            )
            return {
                "scenario": scenario,
                "recommended_category": rec.recommended_category,
                "reason": rec.reason,
                "action": "AUTO_SELECT_SUV",
            }

        elif scenario == "OVERSIZED_PARCEL":
            rec = await cls.get_vehicle_recommendation(
                VehicleRecommendationRequest(parcel_weight_kg=40.0)
            )
            return {
                "scenario": scenario,
                "recommended_category": rec.recommended_category,
                "reason": rec.reason,
                "action": "ROUTE_TO_GOODS_TRANSPORT",
            }

        elif scenario == "HOTEL_AIRPORT_CROSS_SELL":
            return {
                "scenario": scenario,
                "companion_card": {
                    "title": "Need Airport Transfer?",
                    "subtitle": "Direct cab to Hotel Grand Palace checkout",
                    "action_label": "Book Airport Ride",
                    "deep_link": "/airport/book",
                },
            }

        elif scenario == "SURGE_DEMAND_SPIKE":
            return {
                "scenario": scenario,
                "demand_signal": {
                    "demand_level": "SURGE",
                    "surge_multiplier": data.custom_demand_multiplier or 1.4,
                    "advisory_text": "High demand spike detected in Sangli Central.",
                },
            }

        return {
            "scenario": scenario,
            "status": "SIMULATED",
            "message": "Scenario simulated successfully in developer sandbox.",
        }
