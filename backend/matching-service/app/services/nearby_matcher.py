"""
Uber-Style Nearby Matching, Coverage Engine & Candidate Ranking
════════════════════════════════════════════════════════════════════════════════
Pipeline:
1. Spatial Hierarchy Resolution:
   Pickup (lat, lng) ──> City ID (Polygon/Radius) + Zone ID + H3 Hex ID
2. Coverage Mode Gating (ALL_CITY, SPECIFIC_CITY, SPECIFIC_HEX, ZONE):
   - ALL_CITY: Partner receives requests from all cities configured for that service.
   - SPECIFIC_CITY: Request pickup must fall inside configured city boundary and driver selected it.
   - SPECIFIC_HEX: Request pickup must fall inside configured H3 cells.
   - ZONE: Request pickup must fall inside configured zone.
3. PostGIS Spatial Candidate Search (ST_DWithin & ST_Distance)
4. Location Freshness & Stale Protection (last_location_updated_at <= 60s)
5. Cross-Service & Vehicle Capability Filtering (strict Hotel & Freight/Cab isolation)
6. Document Compliance Verification (Insurance, PUC, Fitness, Permit)
7. Multi-Factor Composite Driver Ranking:
   - Distance (30 pts)
   - ETA (20 pts)
   - Rating (20 pts)
   - Performance & Cancellation Rate (15 pts)
   - Preferred Vehicle Match (10 pts)
   - Workload / Fatigue (5 pts)
8. PostGIS-First Invariant: No external routing API calls for candidate search;
   selective routing only for top shortlisted candidates.
"""
from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple

import structlog
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Driver,
    DriverCityCoverage,
    DriverDocument,
    DriverHexCoverage,
    DriverPreference,
    DriverStatus,
    KYCStatus,
    ServiceCity,
    ServiceHex,
    ServiceZone,
    Vehicle,
    VehicleType,
)
from common.models.service_catalog import (
    ServiceCatalogType,
    ServiceCategory,
    ServiceEligibilityEngine,
    SERVICE_CATALOG_REGISTRY,
)

logger = structlog.get_logger(__name__)

DEFAULT_SEARCH_RADIUS_KM = 10.0
MAX_SEARCH_RADIUS_KM = 30.0
STALE_GPS_THRESHOLD_SECONDS = 60.0
TOP_SHORTLIST_LIMIT = 5
DEFAULT_H3_RESOLUTION = 7


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Request & Response Schemas
# ──────────────────────────────────────────────────────────────────────────────
class NearbySearchRequest(BaseModel):
    pickup_lat: float = Field(..., ge=-90.0, le=90.0)
    pickup_lng: float = Field(..., ge=-180.0, le=180.0)
    pickup_address: Optional[str] = None
    drop_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    drop_lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    drop_address: Optional[str] = None
    service_type: str = Field("CAB_LOCAL", description="CAB_LOCAL, AIRPORT, RENTAL, OUTSTATION, TRANSPORT, PARCEL, etc.")
    requested_vehicle_type: Optional[str] = Field(None, description="SEDAN, SUV, HATCHBACK, TRUCK, BIKE")
    requested_category: Optional[str] = Field("economy", description="economy, comfort, premium, freight")
    seats_requested: int = Field(1, ge=1, le=50)
    weight_kg: Optional[float] = Field(None, ge=0.0)
    search_radius_km: float = Field(DEFAULT_SEARCH_RADIUS_KM, ge=1.0, le=MAX_SEARCH_RADIUS_KM)
    limit: int = Field(TOP_SHORTLIST_LIMIT, ge=1, le=20)
    excluded_driver_ids: Optional[List[str]] = Field(default_factory=list)


class RankedDriverCandidate(BaseModel):
    driver_id: uuid.UUID
    full_name: str
    phone_masked: str
    rating: float
    cancellation_rate: float
    distance_km: float
    estimated_eta_min: int
    composite_score: float  # 0.0 to 100.0
    rank: int
    score_breakdown: Dict[str, float]
    active_vehicle_id: uuid.UUID
    vehicle_make: str
    vehicle_model: str
    vehicle_color: str
    vehicle_registration: str
    vehicle_type: str
    comfort_level: Optional[str] = None
    service_capabilities: List[str] = []
    location_age_seconds: float
    is_preferred_vehicle_match: bool
    coverage_mode: str = "all_city"


class NearbySearchResponse(BaseModel):
    service_type: str
    pickup_lat: float
    pickup_lng: float
    search_radius_km: float
    resolved_city_id: Optional[uuid.UUID] = None
    resolved_city_name: Optional[str] = None
    resolved_zone_id: Optional[uuid.UUID] = None
    resolved_zone_name: Optional[str] = None
    resolved_hex_id: Optional[uuid.UUID] = None
    resolved_h3_index: Optional[str] = None
    total_candidates_found: int
    candidates: List[RankedDriverCandidate]
    fastest_eta_min: Optional[int] = None
    closest_distance_km: Optional[float] = None
    applied_filters: List[str]


class NearbyEstimateRequest(BaseModel):
    pickup_lat: float = Field(..., ge=-90.0, le=90.0)
    pickup_lng: float = Field(..., ge=-180.0, le=180.0)
    service_type: str = Field("CAB_LOCAL")
    search_radius_km: float = Field(5.0, ge=1.0, le=MAX_SEARCH_RADIUS_KM)


class NearbyEstimateResponse(BaseModel):
    available_drivers_count: int
    nearest_driver_distance_km: Optional[float] = None
    estimated_pickup_eta_min: Optional[int] = None
    service_type: str
    service_available: bool
    resolved_city_name: Optional[str] = None


@dataclass
class SpatialResolutionResult:
    city_id: Optional[uuid.UUID] = None
    city_name: Optional[str] = None
    zone_id: Optional[uuid.UUID] = None
    zone_name: Optional[str] = None
    hex_id: Optional[uuid.UUID] = None
    h3_index: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# CORE NEARBY MATCHING & RANKING ENGINE WITH COVERAGE GATING
# ──────────────────────────────────────────────────────────────────────────────
class NearbyMatchingEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def resolve_spatial_hierarchy(self, lat: float, lng: float) -> SpatialResolutionResult:
        """
        Resolves pickup coordinates to City, Zone, and H3 Hex.
        1. City: PostGIS boundary polygon ST_Contains, fallback to center_location + radius_km ST_DWithin.
        2. Zone: PostGIS boundary ST_Contains.
        3. H3 Hex: h3 index calculation & ServiceHex mapping.
        """
        res = SpatialResolutionResult()

        # Step 1: City Resolution
        # 1A: Polygon boundary (Production)
        city_sql = text("""
            SELECT id, name FROM service_cities
            WHERE is_active = TRUE
              AND boundary IS NOT NULL
              AND ST_Contains(
                  boundary::geometry,
                  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
              )
            LIMIT 1
        """)
        city_exec = await self.db.execute(city_sql, {"lat": lat, "lng": lng})
        city_row = city_exec.first()

        if not city_row:
            # 1B: Center + Radius fallback
            city_fb_sql = text("""
                SELECT id, name FROM service_cities
                WHERE is_active = TRUE
                  AND center_location IS NOT NULL
                  AND ST_DWithin(
                      center_location,
                      ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                      radius_km * 1000.0
                  )
                ORDER BY ST_Distance(
                    center_location,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                ) ASC
                LIMIT 1
            """)
            city_exec = await self.db.execute(city_fb_sql, {"lat": lat, "lng": lng})
            city_row = city_exec.first()

        if city_row:
            res.city_id = city_row.id
            res.city_name = city_row.name

        # Step 2: Zone Resolution
        if res.city_id:
            zone_sql = text("""
                SELECT id, name FROM service_zones
                WHERE city_id = CAST(:city_id AS uuid)
                  AND is_active = TRUE
                  AND boundary IS NOT NULL
                  AND ST_Contains(
                      boundary::geometry,
                      ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                  )
                LIMIT 1
            """)
            zone_exec = await self.db.execute(zone_sql, {"city_id": str(res.city_id), "lat": lat, "lng": lng})
            zone_row = zone_exec.first()
            if zone_row:
                res.zone_id = zone_row.id
                res.zone_name = zone_row.name

        # Step 3: H3 Hex Resolution
        try:
            import h3
            h3_idx = h3.latlng_to_cell(lat, lng, DEFAULT_H3_RESOLUTION)
            res.h3_index = h3_idx
            hex_exec = await self.db.execute(
                select(ServiceHex.id).where(
                    and_(ServiceHex.h3_index == h3_idx, ServiceHex.is_active == True)
                ).limit(1)
            )
            hex_id = hex_exec.scalar_one_or_none()
            res.hex_id = hex_id
        except Exception as e:
            logger.debug("H3 index computation skipped", error=str(e))

        return res

    async def find_and_rank_nearby_drivers(
        self,
        request: NearbySearchRequest,
    ) -> NearbySearchResponse:
        """
        Executes the authoritative Uber-Style nearby matching pipeline with Coverage Engine:
        Spatial Hierarchy Resolution -> Coverage Gating (ALL_CITY, SPECIFIC_CITY, SPECIFIC_HEX, ZONE) ->
        PostGIS Spatial Search -> Service Eligibility -> Vehicle Eligibility ->
        Document Compliance -> Stale GPS Filter -> Multi-Factor Ranking
        """
        applied_filters: List[str] = [
            "Spatial Hierarchy Resolution (City / Zone / H3)",
            "Coverage Mode Gating (ALL_CITY, SPECIFIC_CITY, SPECIFIC_HEX, ZONE)",
            "PostGIS ST_DWithin Proximity",
            "Online Status (DriverStatus.ONLINE)",
            "KYC Approved & Verified",
            "Active Operational Vehicle Required",
            "Stale-Location Protection (<= 60s)",
        ]

        # ── Step 0: Service Code Normalization & Hotel Isolation Invariant ──
        service_enum = ServiceEligibilityEngine.parse_service_code(request.service_type)
        if not service_enum or service_enum == ServiceCatalogType.HOTEL:
            # HOTEL ISOLATION INVARIANT: Hotel stays never enter driver dispatch
            return NearbySearchResponse(
                service_type=request.service_type,
                pickup_lat=request.pickup_lat,
                pickup_lng=request.pickup_lng,
                search_radius_km=request.search_radius_km,
                total_candidates_found=0,
                candidates=[],
                fastest_eta_min=None,
                closest_distance_km=None,
                applied_filters=applied_filters + ["Hotel Service Dispatch Isolation"],
            )

        # ── Step 1: Spatial Hierarchy Resolution ──
        spatial = await self.resolve_spatial_hierarchy(request.pickup_lat, request.pickup_lng)

        # ── Step 2: Vehicle Capability & Service SQL Filters ──
        st_val = service_enum.value.lower()
        veh_clause = ""
        if st_val in ("cab", "cab_local", "local"):
            veh_clause = """
                AND v.vehicle_type::text IN ('SEDAN', 'SUV', 'HATCHBACK', 'TEMPO_TRAVELLER', 'MINI_BUS', 'sedan', 'suv', 'hatchback', 'tempo_traveller', 'mini_bus')
                AND (v.service_capabilities IS NULL OR 'cab' = ANY(v.service_capabilities) OR 'local' = ANY(v.service_capabilities))
            """
        elif st_val == "airport":
            veh_clause = """
                AND v.vehicle_type::text IN ('SEDAN', 'SUV', 'HATCHBACK', 'sedan', 'suv', 'hatchback')
                AND (v.service_capabilities IS NULL OR 'airport' = ANY(v.service_capabilities) OR 'cab' = ANY(v.service_capabilities))
            """
        elif st_val in ("outstation", "intercity"):
            veh_clause = """
                AND v.vehicle_type::text IN ('SEDAN', 'SUV', 'TEMPO_TRAVELLER', 'sedan', 'suv', 'tempo_traveller')
                AND (v.service_capabilities IS NULL OR 'outstation' = ANY(v.service_capabilities) OR 'cab' = ANY(v.service_capabilities))
            """
        elif st_val == "rental":
            veh_clause = """
                AND v.vehicle_type::text IN ('SEDAN', 'SUV', 'HATCHBACK', 'sedan', 'suv', 'hatchback')
                AND (v.service_capabilities IS NULL OR 'rental' = ANY(v.service_capabilities) OR 'cab' = ANY(v.service_capabilities))
            """
        elif st_val == "parcel":
            veh_clause = """
                AND (v.parcel_capable = TRUE OR v.service_capabilities IS NULL OR 'parcel' = ANY(v.service_capabilities))
            """
        elif st_val in ("transport", "goods"):
            veh_clause = """
                AND v.vehicle_type::text IN ('TRUCK', 'TEMPO_TRAVELLER', 'truck', 'tempo_traveller')
                AND (v.service_capabilities IS NULL OR 'transport' = ANY(v.service_capabilities))
            """
        elif st_val in ("packers", "packers_movers"):
            veh_clause = """
                AND v.vehicle_type::text IN ('TRUCK', 'truck')
                AND (v.service_capabilities IS NULL OR 'packers' = ANY(v.service_capabilities) OR 'transport' = ANY(v.service_capabilities))
            """
        elif st_val == "carpool":
            veh_clause = """
                AND v.vehicle_type::text IN ('SEDAN', 'SUV', 'HATCHBACK', 'sedan', 'suv', 'hatchback')
                AND (v.service_capabilities IS NULL OR 'carpool' = ANY(v.service_capabilities) OR 'cab' = ANY(v.service_capabilities))
            """

        # Excluded drivers clause
        excluded_clause = ""
        if request.excluded_driver_ids:
            clean_ids = [f"'{uuid.UUID(eid)}'" for eid in request.excluded_driver_ids if eid]
            if clean_ids:
                excluded_clause = f"AND d.id NOT IN ({', '.join(clean_ids)})"

        # ── Step 3: PostGIS Spatial Candidate Search with 4 Coverage Modes ──
        radius_m = request.search_radius_km * 1000.0
        city_id_str = str(spatial.city_id) if spatial.city_id else None
        hex_id_str = str(spatial.hex_id) if spatial.hex_id else None
        zone_id_str = str(spatial.zone_id) if spatial.zone_id else None

        # Coverage SQL condition:
        # ALL_CITY: Matches all drivers with visibility_mode = 'all_city' or NULL
        # SPECIFIC_CITY: Driver must have selected this resolved city in DriverCityCoverage
        # SPECIFIC_HEX: Driver must have selected this resolved H3 hex in DriverHexCoverage
        # ZONE: Driver must have selected this resolved zone in service_customizations
        coverage_condition = f"""
            AND (
                -- 1. ALL_CITY mode
                (COALESCE(dp.visibility_mode, 'all_city') = 'all_city')
                OR
                -- 2. SPECIFIC_CITY mode
                (
                    dp.visibility_mode = 'specific_city'
                    AND {'CAST(:resolved_city_id AS uuid)' if city_id_str else 'NULL'} IS NOT NULL
                    AND dcc.city_id = {'CAST(:resolved_city_id AS uuid)' if city_id_str else 'NULL'}
                    AND dcc.is_selected = TRUE
                    AND dcc.is_active = TRUE
                )
                OR
                -- 3. SPECIFIC_HEX mode
                (
                    dp.visibility_mode = 'specific_hex'
                    AND {'CAST(:resolved_hex_id AS uuid)' if hex_id_str else 'NULL'} IS NOT NULL
                    AND dhc.hex_id = {'CAST(:resolved_hex_id AS uuid)' if hex_id_str else 'NULL'}
                    AND dhc.is_active = TRUE
                )
                OR
                -- 4. ZONE mode
                (
                    dp.visibility_mode IN ('zone', 'specific_zone')
                    AND {'CAST(:resolved_zone_id AS uuid)' if zone_id_str else 'NULL'} IS NOT NULL
                    AND (
                        dp.service_customizations->>'zone_id' = '{zone_id_str or ""}'
                    )
                )
            )
        """

        spatial_query = text(f"""
            SELECT DISTINCT ON (d.id)
                d.id AS driver_id,
                d.full_name,
                d.phone,
                d.rating,
                d.cancellation_rate,
                d.fatigue_score,
                d.last_location_updated_at,
                ST_Y(d.current_location::geometry) AS current_lat,
                ST_X(d.current_location::geometry) AS current_lng,
                ST_Distance(
                    d.current_location,
                    ST_SetSRID(ST_MakePoint(:pickup_lng, :pickup_lat), 4326)::geography
                ) / 1000.0 AS distance_km,
                v.id AS vehicle_id,
                v.make AS vehicle_make,
                v.model AS vehicle_model,
                v.color AS vehicle_color,
                v.registration_number AS vehicle_registration,
                v.vehicle_type::text AS vehicle_type,
                v.comfort_level,
                v.seat_capacity,
                v.max_payload_kg,
                v.insurance_expiry,
                v.pollution_expiry,
                v.fitness_expiry,
                v.permit_expiry,
                v.service_capabilities,
                v.status AS vehicle_status,
                COALESCE(dp.visibility_mode, 'all_city') AS coverage_mode
            FROM drivers d
            JOIN vehicles v ON v.driver_id = d.id AND v.is_active = TRUE
            LEFT JOIN driver_preferences dp ON dp.driver_id = d.id
            LEFT JOIN driver_city_coverage dcc ON dcc.driver_id = d.id
            LEFT JOIN driver_hex_coverage dhc ON dhc.driver_id = d.id
            WHERE
                (d.status::text IN ('ONLINE', 'online') OR d.is_online = TRUE)
                AND d.is_active = TRUE
                AND (
                    d.kyc_status::text IN ('APPROVED', 'approved', 'VERIFIED', 'verified')
                    OR d.is_verified = TRUE
                )
                AND d.current_location IS NOT NULL
                -- Stale Location Protection Invariant (telemetry fix <= 60 seconds)
                AND (
                    d.last_location_updated_at IS NOT NULL
                    AND d.last_location_updated_at >= NOW() - INTERVAL '{int(STALE_GPS_THRESHOLD_SECONDS)} seconds'
                )
                -- Physical Proximity Filter (PostGIS Indexed ST_DWithin)
                AND ST_DWithin(
                    d.current_location,
                    ST_SetSRID(ST_MakePoint(:pickup_lng, :pickup_lat), 4326)::geography,
                    :radius_m
                )
                {coverage_condition}
                {veh_clause}
                {excluded_clause}
            ORDER BY d.id, distance_km ASC
            LIMIT 50;
        """)

        params: Dict[str, Any] = {
            "pickup_lat": request.pickup_lat,
            "pickup_lng": request.pickup_lng,
            "radius_m": radius_m,
        }
        if city_id_str:
            params["resolved_city_id"] = city_id_str
        if hex_id_str:
            params["resolved_hex_id"] = hex_id_str
        if zone_id_str:
            params["resolved_zone_id"] = zone_id_str

        res = await self.db.execute(spatial_query, params)
        rows = res.fetchall()

        if not rows:
            return NearbySearchResponse(
                service_type=service_enum.value,
                pickup_lat=request.pickup_lat,
                pickup_lng=request.pickup_lng,
                search_radius_km=request.search_radius_km,
                resolved_city_id=spatial.city_id,
                resolved_city_name=spatial.city_name,
                resolved_zone_id=spatial.zone_id,
                resolved_zone_name=spatial.zone_name,
                resolved_hex_id=spatial.hex_id,
                resolved_h3_index=spatial.h3_index,
                total_candidates_found=0,
                candidates=[],
                fastest_eta_min=None,
                closest_distance_km=None,
                applied_filters=applied_filters,
            )

        # ── Step 4: Candidate Compliance & Multi-Factor Composite Scoring ──
        today = date.today()
        now_utc = datetime.now(timezone.utc)
        scored_candidates: List[RankedDriverCandidate] = []

        for row in rows:
            # 4A. Document Expiry Compliance Guard
            if row.insurance_expiry and row.insurance_expiry < today:
                continue
            if row.pollution_expiry and row.pollution_expiry < today:
                continue
            if row.fitness_expiry and row.fitness_expiry < today:
                continue
            if row.permit_expiry and row.permit_expiry < today:
                continue
            if row.vehicle_status != "APPROVED":
                continue

            # 4B. Seating & Payload Capacity Checks
            if request.seats_requested and row.seat_capacity and row.seat_capacity < request.seats_requested:
                continue
            if request.weight_kg and row.max_payload_kg and row.max_payload_kg < request.weight_kg:
                continue

            # 4C. Calculate Location Age
            last_ts = row.last_location_updated_at
            if last_ts and last_ts.tzinfo is None:
                last_ts = last_ts.replace(tzinfo=timezone.utc)
            location_age_sec = (now_utc - last_ts).total_seconds() if last_ts else 0.0

            dist_km = float(row.distance_km)

            # 4D. Fast ETA Estimation (PostGIS / Haversine based: 25 km/h urban speed + 2 min buffer)
            eta_min = max(int((dist_km / 25.0) * 60.0) + 1, 2)

            # 4E. Multi-Factor Scoring Formula (0 to 100)
            # Factor 1: Proximity Score (0 to 30 pts)
            proximity_pct = max(0.0, 1.0 - (dist_km / request.search_radius_km))
            score_dist = round(30.0 * proximity_pct, 2)

            # Factor 2: ETA Score (0 to 20 pts)
            eta_pct = max(0.0, 1.0 - (eta_min / 30.0))
            score_eta = round(20.0 * eta_pct, 2)

            # Factor 3: Driver Rating Score (0 to 20 pts)
            rating_val = float(row.rating or 5.0)
            score_rating = round(20.0 * (min(5.0, max(0.0, rating_val)) / 5.0), 2)

            # Factor 4: Performance / Cancellation Penalty Score (0 to 15 pts)
            canc_rate = float(row.cancellation_rate or 0.0)
            score_perf = round(15.0 * max(0.0, 1.0 - canc_rate), 2)

            # Factor 5: Preferred Vehicle Match Bonus (0 to 10 pts)
            is_pref_match = False
            v_type_str = str(row.vehicle_type).upper()
            if request.requested_vehicle_type:
                if v_type_str == request.requested_vehicle_type.upper():
                    score_veh = 10.0
                    is_pref_match = True
                else:
                    score_veh = 4.0
            else:
                score_veh = 8.0  # standard neutral bonus

            # Factor 6: Workload & Fatigue Score (0 to 5 pts)
            fatigue = float(row.fatigue_score or 0.0)
            score_workload = round(5.0 * max(0.0, 1.0 - fatigue), 2)

            # Total Composite Score
            total_score = round(score_dist + score_eta + score_rating + score_perf + score_veh + score_workload, 2)

            # Mask phone for privacy
            phone_str = row.phone or "+919800000000"
            phone_masked = phone_str[:6] + "••••" + phone_str[-4:] if len(phone_str) >= 6 else phone_str

            candidate = RankedDriverCandidate(
                driver_id=row.driver_id,
                full_name=row.full_name,
                phone_masked=phone_masked,
                rating=rating_val,
                cancellation_rate=canc_rate,
                distance_km=round(dist_km, 2),
                estimated_eta_min=eta_min,
                composite_score=total_score,
                rank=1,  # will be assigned after sorting
                score_breakdown={
                    "proximity_score": score_dist,
                    "eta_score": score_eta,
                    "rating_score": score_rating,
                    "performance_score": score_perf,
                    "vehicle_match_score": score_veh,
                    "workload_score": score_workload,
                },
                active_vehicle_id=row.vehicle_id,
                vehicle_make=row.vehicle_make or "Standard",
                vehicle_model=row.vehicle_model or "Cab",
                vehicle_color=row.vehicle_color or "White",
                vehicle_registration=row.vehicle_registration,
                vehicle_type=v_type_str,
                comfort_level=row.comfort_level,
                service_capabilities=row.service_capabilities or [],
                location_age_seconds=round(location_age_sec, 1),
                is_preferred_vehicle_match=is_pref_match,
                coverage_mode=row.coverage_mode or "all_city",
            )
            scored_candidates.append(candidate)

        # ── Step 5: Sort by Composite Score Descending & Assign Ranks ──
        scored_candidates.sort(key=lambda c: c.composite_score, reverse=True)

        # Take Top N Shortlist
        shortlist = scored_candidates[: request.limit]
        for idx, cand in enumerate(shortlist):
            cand.rank = idx + 1

        fastest_eta = min((c.estimated_eta_min for c in shortlist), default=None)
        closest_dist = min((c.distance_km for c in shortlist), default=None)

        logger.info(
            "nearby_matching_completed",
            service=service_enum.value,
            resolved_city=spatial.city_name,
            resolved_hex=spatial.h3_index,
            found_count=len(shortlist),
            fastest_eta_min=fastest_eta,
            closest_dist_km=closest_dist,
        )

        return NearbySearchResponse(
            service_type=service_enum.value,
            pickup_lat=request.pickup_lat,
            pickup_lng=request.pickup_lng,
            search_radius_km=request.search_radius_km,
            resolved_city_id=spatial.city_id,
            resolved_city_name=spatial.city_name,
            resolved_zone_id=spatial.zone_id,
            resolved_zone_name=spatial.zone_name,
            resolved_hex_id=spatial.hex_id,
            resolved_h3_index=spatial.h3_index,
            total_candidates_found=len(shortlist),
            candidates=shortlist,
            fastest_eta_min=fastest_eta,
            closest_distance_km=closest_dist,
            applied_filters=applied_filters,
        )

    async def estimate_pickup(
        self,
        request: NearbyEstimateRequest,
    ) -> NearbyEstimateResponse:
        """
        Fast aggregated estimate of nearest driver distance, ETA, and availability count.
        Runs PostGIS search with minimal overhead.
        """
        search_req = NearbySearchRequest(
            pickup_lat=request.pickup_lat,
            pickup_lng=request.pickup_lng,
            service_type=request.service_type,
            search_radius_km=request.search_radius_km,
            limit=5,
        )
        res = await self.find_and_rank_nearby_drivers(search_req)

        available_count = res.total_candidates_found
        return NearbyEstimateResponse(
            available_drivers_count=available_count,
            nearest_driver_distance_km=res.closest_distance_km,
            estimated_pickup_eta_min=res.fastest_eta_min,
            service_type=res.service_type,
            service_available=(available_count > 0),
            resolved_city_name=res.resolved_city_name,
        )
