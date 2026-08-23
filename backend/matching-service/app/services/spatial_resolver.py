"""
Spatial Resolver Service — PostGIS + H3 powered.

Resolves pickup coordinates → ServiceCity / ServiceZone / ServiceHex.
Used by the fanout dispatch engine to determine which drivers should see a ride request
based on their coverage preferences.

Resolution cascade:
  1. PostGIS ST_Contains against city boundary polygons (production)
  2. Fallback: ST_DWithin against city center + radius (bootstrap/dev)
  3. H3 index for hex cell resolution

Coverage queries:
  - get_eligible_drivers_for_request: The core matching query
  - get_cities_for_driver: All cities a driver covers
  - get_hexes_for_driver: All hex cells a driver covers
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import List, Optional

import structlog
from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    ServiceCity, ServiceZone, ServiceHex,
    DriverCityCoverage, DriverHexCoverage,
    DriverPreference, Driver, DriverStatus,
    Vehicle, RideOffer, RideOfferStatus,
)

logger = structlog.get_logger(__name__)

# H3 resolution for ride matching hex cells
DEFAULT_H3_RESOLUTION = 7  # ~5.16 km² per cell — good for city-level coverage


@dataclass
class SpatialResolution:
    """Result of resolving a pickup coordinate to the spatial hierarchy."""
    city_id: Optional[uuid.UUID] = None
    city_name: Optional[str] = None
    zone_id: Optional[uuid.UUID] = None
    zone_name: Optional[str] = None
    hex_id: Optional[uuid.UUID] = None
    h3_index: Optional[str] = None


class SpatialResolverService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ─────────────────────────────────────────────────────────────────────────
    # 1. RESOLVE PICKUP → City / Zone / Hex
    # ─────────────────────────────────────────────────────────────────────────

    async def resolve_pickup(self, lat: float, lng: float) -> SpatialResolution:
        """
        Resolve pickup coordinates to ServiceCity, ServiceZone, and ServiceHex.

        Strategy:
          1. Try ST_Contains on city boundary polygons (production)
          2. Fallback to ST_DWithin on city center + radius (dev/seed)
          3. Resolve zone via ST_Contains on zone boundary
          4. Compute H3 index and match to ServiceHex
        """
        result = SpatialResolution()

        # ── Step 1: Resolve City ──
        # Try polygon boundary first (production)
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
        city_res = await self.db.execute(city_sql, {"lat": lat, "lng": lng})
        city_row = city_res.first()

        if not city_row:
            # Fallback: center + radius match
            city_fallback_sql = text("""
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
            city_res = await self.db.execute(city_fallback_sql, {"lat": lat, "lng": lng})
            city_row = city_res.first()

        if city_row:
            result.city_id = city_row.id
            result.city_name = city_row.name
        else:
            logger.warning("Pickup location not in any service city", lat=lat, lng=lng)
            return result

        # ── Step 2: Resolve Zone ──
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
        zone_res = await self.db.execute(
            zone_sql, {"city_id": str(result.city_id), "lat": lat, "lng": lng}
        )
        zone_row = zone_res.first()
        if zone_row:
            result.zone_id = zone_row.id
            result.zone_name = zone_row.name

        # ── Step 3: Resolve H3 Hex ──
        h3_index = self._compute_h3_index(lat, lng)
        if h3_index:
            result.h3_index = h3_index
            hex_res = await self.db.execute(
                select(ServiceHex).where(
                    and_(
                        ServiceHex.h3_index == h3_index,
                        ServiceHex.is_active == True,
                    )
                )
            )
            hex_row = hex_res.scalar_one_or_none()
            if hex_row:
                result.hex_id = hex_row.id

        logger.info(
            "Spatial resolution complete",
            lat=lat, lng=lng,
            city=result.city_name,
            zone=result.zone_name,
            h3_index=result.h3_index,
        )
        return result

    # ─────────────────────────────────────────────────────────────────────────
    # 2. FIND ELIGIBLE DRIVERS FOR REQUEST (Core fanout query)
    # ─────────────────────────────────────────────────────────────────────────

    async def find_eligible_drivers_for_request(
        self,
        pickup_lat: float,
        pickup_lng: float,
        pickup_city_id: Optional[uuid.UUID],
        pickup_hex_id: Optional[uuid.UUID],
        ride_request_id: uuid.UUID,
        max_pickup_radius_km: float = 15.0,
        excluded_driver_ids: Optional[List[str]] = None,
    ) -> List[dict]:
        """
        Find all online, eligible drivers whose coverage preference matches
        the request's spatial classification AND who are within physical
        pickup proximity.

        Coverage logic:
          - ALL_CITY: Driver has pickup_city_id in their city coverage
          - SPECIFIC_CITY: Driver has pickup_city_id in selected cities
          - SPECIFIC_HEX: Driver has pickup_hex_id in selected hexes

        Physical filter:
          - Driver's current_location within max_pickup_radius_km of pickup

        Exclusions:
          - Already rejected this request
          - Already has an active offer for this request
          - Offline / KYC not approved / has conflicting active ride
        """
        excluded = excluded_driver_ids or []
        excluded_clause = ""
        if excluded:
            ids_str = ", ".join(f"'{eid}'" for eid in excluded)
            excluded_clause = f"AND d.id::text NOT IN ({ids_str})"

        city_id_str = str(pickup_city_id) if pickup_city_id else None
        hex_id_str = str(pickup_hex_id) if pickup_hex_id else None

        sql = text(f"""
            SELECT DISTINCT
                d.id AS driver_id,
                d.user_id AS user_id,
                d.full_name,
                d.rating,
                dp.visibility_mode,
                v.id AS vehicle_id,
                v.make,
                v.model,
                v.registration_number,
                v.vehicle_type,
                v.seat_capacity,
                ST_Distance(
                    d.current_location,
                    ST_SetSRID(ST_MakePoint(:pickup_lng, :pickup_lat), 4326)::geography
                ) / 1000.0 AS distance_km
            FROM drivers d
            JOIN driver_preferences dp ON dp.driver_id = d.id
            JOIN vehicles v ON v.driver_id = d.id
            LEFT JOIN driver_city_coverage dcc ON dcc.driver_id = d.id AND dcc.is_active = TRUE
            LEFT JOIN driver_hex_coverage dhc ON dhc.driver_id = d.id AND dhc.is_active = TRUE
            WHERE
                d.status::text IN ('ONLINE', 'online')
                AND d.kyc_status::text IN ('APPROVED', 'approved')
                AND d.current_location IS NOT NULL
                -- Physical proximity filter
                AND ST_DWithin(
                    d.current_location,
                    ST_SetSRID(ST_MakePoint(:pickup_lng, :pickup_lat), 4326)::geography,
                    :max_radius_m
                )
                -- Coverage preference filter
                AND (
                    -- ALL_CITY: driver's city coverage includes pickup city
                    (dp.visibility_mode = 'all_city' AND dcc.city_id = CAST(:city_id AS uuid))
                    OR
                    -- SPECIFIC_CITY: driver explicitly selected this city
                    (dp.visibility_mode = 'specific_city' AND dcc.city_id = CAST(:city_id AS uuid) AND dcc.is_selected = TRUE)
                    OR
                    -- SPECIFIC_HEX: driver selected hex that contains pickup
                    (dp.visibility_mode = 'specific_hex' AND dhc.hex_id = CAST(:hex_id AS uuid))
                    OR
                    -- Fallback: if no city_id resolved (location outside service area), skip coverage check
                    (CAST(:city_id AS text) IS NULL)
                )
                -- Exclude drivers who already rejected this request
                AND d.id NOT IN (
                    SELECT ro.driver_id FROM ride_offers ro
                    WHERE ro.ride_request_id = CAST(:ride_request_id AS uuid)
                      AND ro.status::text IN ('rejected', 'REJECTED', 'expired', 'EXPIRED', 'removed', 'REMOVED', 'superseded', 'SUPERSEDED')
                )
                -- Exclude drivers who already have a pending/accepted offer for this request
                AND d.id NOT IN (
                    SELECT ro.driver_id FROM ride_offers ro
                    WHERE ro.ride_request_id = CAST(:ride_request_id AS uuid)
                      AND ro.status::text IN ('pending', 'PENDING', 'accepted', 'ACCEPTED')
                )
                -- Exclude drivers currently on an active ride
                AND d.id NOT IN (
                    SELECT rr.assigned_driver_id FROM ride_requests rr
                    WHERE rr.assigned_driver_id IS NOT NULL
                      AND rr.status::text IN ('assigned', 'ASSIGNED', 'pickup', 'PICKUP', 'in_progress', 'IN_PROGRESS')
                )
                {excluded_clause}
            ORDER BY distance_km ASC
            LIMIT 50
        """)

        result = await self.db.execute(sql, {
            "pickup_lat": pickup_lat,
            "pickup_lng": pickup_lng,
            "max_radius_m": max_pickup_radius_km * 1000.0,
            "city_id": city_id_str,
            "hex_id": hex_id_str,
            "ride_request_id": str(ride_request_id),
        })
        rows = result.fetchall()

        candidates = []
        for r in rows:
            candidates.append({
                "driver_id": str(r.driver_id),
                "user_id": str(r.user_id),
                "full_name": r.full_name,
                "rating": float(r.rating or 4.8),
                "visibility_mode": r.visibility_mode,
                "vehicle_id": str(r.vehicle_id),
                "vehicle_name": f"{r.make} {r.model}",
                "registration_number": r.registration_number,
                "vehicle_type": str(r.vehicle_type),
                "seat_capacity": r.seat_capacity,
                "distance_km": round(float(r.distance_km), 2),
            })

        logger.info(
            "Eligible drivers found",
            pickup_city_id=city_id_str,
            pickup_hex_id=hex_id_str,
            total_candidates=len(candidates),
        )
        return candidates

    # ─────────────────────────────────────────────────────────────────────────
    # 3. DRIVER COVERAGE QUERIES
    # ─────────────────────────────────────────────────────────────────────────

    async def get_cities_for_driver(self, driver_id: uuid.UUID) -> List[dict]:
        """Get all cities a driver covers."""
        sql = text("""
            SELECT sc.id, sc.name, sc.state, sc.center_lat, sc.center_lng,
                   dcc.is_selected, dcc.is_active
            FROM driver_city_coverage dcc
            JOIN service_cities sc ON sc.id = dcc.city_id
            WHERE dcc.driver_id = :driver_id AND dcc.is_active = TRUE
            ORDER BY sc.name ASC
        """)
        result = await self.db.execute(sql, {"driver_id": str(driver_id)})
        return [
            {
                "city_id": str(r.id),
                "name": r.name,
                "state": r.state,
                "center_lat": r.center_lat,
                "center_lng": r.center_lng,
                "is_selected": r.is_selected,
                "is_active": r.is_active,
            }
            for r in result.fetchall()
        ]

    async def get_hexes_for_driver(self, driver_id: uuid.UUID) -> List[dict]:
        """Get all H3 hex cells a driver covers."""
        sql = text("""
            SELECT sh.id, sh.h3_index, sh.display_name, sh.center_lat, sh.center_lng,
                   sh.resolution, sc.name AS city_name
            FROM driver_hex_coverage dhc
            JOIN service_hexes sh ON sh.id = dhc.hex_id
            JOIN service_cities sc ON sc.id = sh.city_id
            WHERE dhc.driver_id = :driver_id AND dhc.is_active = TRUE
            ORDER BY sc.name, sh.display_name ASC
        """)
        result = await self.db.execute(sql, {"driver_id": str(driver_id)})
        return [
            {
                "hex_id": str(r.id),
                "h3_index": r.h3_index,
                "display_name": r.display_name,
                "center_lat": r.center_lat,
                "center_lng": r.center_lng,
                "resolution": r.resolution,
                "city_name": r.city_name,
            }
            for r in result.fetchall()
        ]

    async def get_all_service_cities(self, active_only: bool = True) -> List[dict]:
        """Get all service cities (for driver coverage UI)."""
        conditions = [ServiceCity.is_active == True] if active_only else []
        result = await self.db.execute(
            select(ServiceCity).where(*conditions).order_by(ServiceCity.name)
        )
        cities = result.scalars().all()
        return [
            {
                "city_id": str(c.id),
                "name": c.name,
                "state": c.state,
                "country": c.country,
                "center_lat": c.center_lat,
                "center_lng": c.center_lng,
                "is_active": c.is_active,
            }
            for c in cities
        ]

    async def get_zones_for_city(self, city_id: uuid.UUID) -> List[dict]:
        """Get all zones within a city."""
        result = await self.db.execute(
            select(ServiceZone).where(
                and_(ServiceZone.city_id == city_id, ServiceZone.is_active == True)
            ).order_by(ServiceZone.name)
        )
        zones = result.scalars().all()
        return [
            {
                "zone_id": str(z.id),
                "city_id": str(z.city_id),
                "name": z.name,
                "center_lat": z.center_lat,
                "center_lng": z.center_lng,
            }
            for z in zones
        ]

    async def get_hexes_for_zone(self, zone_id: uuid.UUID) -> List[dict]:
        """Get all H3 hex cells within a zone."""
        result = await self.db.execute(
            select(ServiceHex).where(
                and_(ServiceHex.zone_id == zone_id, ServiceHex.is_active == True)
            ).order_by(ServiceHex.display_name)
        )
        hexes = result.scalars().all()
        return [
            {
                "hex_id": str(h.id),
                "h3_index": h.h3_index,
                "display_name": h.display_name,
                "center_lat": h.center_lat,
                "center_lng": h.center_lng,
                "resolution": h.resolution,
            }
            for h in hexes
        ]

    # ─────────────────────────────────────────────────────────────────────────
    # 4. UPDATE DRIVER COVERAGE
    # ─────────────────────────────────────────────────────────────────────────

    async def update_driver_visibility(
        self,
        driver_id: uuid.UUID,
        visibility_mode: str,
        city_ids: Optional[List[str]] = None,
        hex_ids: Optional[List[str]] = None,
    ) -> dict:
        """
        Update driver's visibility mode and coverage selections.
        Returns the updated configuration.
        """
        # Update visibility mode on driver_preferences
        pref_res = await self.db.execute(
            select(DriverPreference).where(DriverPreference.driver_id == driver_id)
        )
        pref = pref_res.scalar_one_or_none()
        if not pref:
            pref = DriverPreference(driver_id=driver_id, visibility_mode=visibility_mode)
            self.db.add(pref)
        else:
            pref.visibility_mode = visibility_mode

        # Update city coverage if provided
        if city_ids is not None:
            # Deactivate all current city coverages
            await self.db.execute(
                text("UPDATE driver_city_coverage SET is_active = FALSE WHERE driver_id = :did"),
                {"did": str(driver_id)}
            )
            # Activate/create selected cities
            for cid_str in city_ids:
                cid = uuid.UUID(cid_str)
                existing = await self.db.execute(
                    select(DriverCityCoverage).where(
                        and_(DriverCityCoverage.driver_id == driver_id, DriverCityCoverage.city_id == cid)
                    )
                )
                coverage = existing.scalar_one_or_none()
                if coverage:
                    coverage.is_active = True
                    coverage.is_selected = True
                else:
                    self.db.add(DriverCityCoverage(
                        driver_id=driver_id, city_id=cid, is_active=True, is_selected=True
                    ))

        # Update hex coverage if provided
        if hex_ids is not None:
            await self.db.execute(
                text("UPDATE driver_hex_coverage SET is_active = FALSE WHERE driver_id = :did"),
                {"did": str(driver_id)}
            )
            for hid_str in hex_ids:
                hid = uuid.UUID(hid_str)
                existing = await self.db.execute(
                    select(DriverHexCoverage).where(
                        and_(DriverHexCoverage.driver_id == driver_id, DriverHexCoverage.hex_id == hid)
                    )
                )
                coverage = existing.scalar_one_or_none()
                if coverage:
                    coverage.is_active = True
                else:
                    self.db.add(DriverHexCoverage(
                        driver_id=driver_id, hex_id=hid, is_active=True
                    ))

        await self.db.commit()

        return {
            "visibility_mode": visibility_mode,
            "city_ids": city_ids or [],
            "hex_ids": hex_ids or [],
        }

    # ─────────────────────────────────────────────────────────────────────────
    # H3 HELPER
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _compute_h3_index(lat: float, lng: float, resolution: int = DEFAULT_H3_RESOLUTION) -> Optional[str]:
        """
        Compute H3 hex index for coordinates.
        Falls back gracefully if h3 library is not installed.
        """
        try:
            import h3
            return h3.latlng_to_cell(lat, lng, resolution)
        except ImportError:
            logger.warning("h3 library not installed — hex resolution disabled")
            return None
        except Exception as e:
            logger.warning("H3 index computation failed", error=str(e))
            return None
