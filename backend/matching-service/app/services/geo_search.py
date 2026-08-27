"""
Geo-Search Service  PostGIS-powered nearest driver finder.
Uses ST_DWithin with progressive radius expansion.
"""
from __future__ import annotations

import json
import uuid
from typing import Optional

from geoalchemy2.elements import WKTElement
from sqlalchemy import select, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import Driver, DriverStatus, KYCStatus, Vehicle, VehicleType
from common.utils.redis_client import get_redis
from app.core.config import matching_settings


class GeoSearchService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_nearest_drivers(
        self,
        latitude: float,
        longitude: float,
        vehicle_type: Optional[str] = None,
        women_only: bool = False,
        parcel_needed: bool = False,
        max_radius_km: float = 50.0,
        limit: int = 10,
        exclude_driver_ids: Optional[list[str]] = None,
    ) -> list[dict]:
        """
        Find nearby available drivers using PostGIS ST_DWithin.
        Tries progressively wider radii until drivers are found.
        """
        radii = matching_settings.RADIUS_EXPAND_STEPS
        exclude_ids = exclude_driver_ids or []

        for radius_km in radii:
            if radius_km > max_radius_km:
                break

            drivers = await self._search_at_radius(
                latitude=latitude,
                longitude=longitude,
                radius_km=radius_km,
                vehicle_type=vehicle_type,
                women_only=women_only,
                parcel_needed=parcel_needed,
                limit=limit,
                exclude_ids=exclude_ids,
            )

            if drivers:
                return drivers

        return []

    async def _search_at_radius(
        self,
        latitude: float,
        longitude: float,
        radius_km: float,
        vehicle_type: Optional[str],
        women_only: bool,
        parcel_needed: bool,
        limit: int,
        exclude_ids: list[str],
    ) -> list[dict]:
        """Raw PostGIS query using ST_DWithin (in meters)."""
        radius_m = radius_km * 1000
        point_wkt = f"SRID=4326;POINT({longitude} {latitude})"

        # Build dynamic WHERE conditions
        conditions = [
            "(d.status::text IN ('ONLINE', 'online') OR d.is_online = TRUE)",
            "(d.kyc_status::text IN ('APPROVED', 'approved', 'VERIFIED', 'verified', 'pending', 'PENDING') OR d.is_verified = TRUE OR d.is_active = TRUE)",
            "d.current_location IS NOT NULL",
            f"ST_DWithin(d.current_location::geography, ST_GeogFromText('{point_wkt}'), {radius_m})",
        ]

        if exclude_ids:
            ids_str = ", ".join(f"'{i}'" for i in exclude_ids)
            conditions.append(f"d.id::text NOT IN ({ids_str})")

        if women_only:
            conditions.append("d.gender = 'female'")

        if vehicle_type:
            vt = vehicle_type.replace("_", " ")
            conditions.append(f"v.vehicle_type = '{vehicle_type}'")

        if parcel_needed:
            conditions.append("v.parcel_capable = true")

        where_clause = " AND ".join(conditions)

        sql = text(f"""
            SELECT
                d.id::text AS driver_id,
                d.full_name,
                d.rating,
                v.vehicle_type,
                v.make,
                v.model,
                v.color,
                v.registration_number,
                v.seat_capacity,
                v.has_ac,
                ST_Distance(
                    d.current_location::geography,
                    ST_GeogFromText('{point_wkt}')
                ) / 1000.0 AS distance_km,
                ST_Y(d.current_location::geometry) AS latitude,
                ST_X(d.current_location::geometry) AS longitude
            FROM drivers d
            LEFT JOIN vehicles v ON v.driver_id = d.id
            WHERE {where_clause}
            ORDER BY distance_km ASC
            LIMIT {limit}
        """)

        result = await self.db.execute(sql)
        rows = result.mappings().all()

        return [
            {
                "driver_id": row["driver_id"],
                "full_name": row["full_name"],
                "rating": float(row["rating"] or 5.0),
                "vehicle_type": row["vehicle_type"] or "sedan",
                "vehicle": f"{row['make'] or 'Standard'} {row['model'] or 'Cab'} ({row['color'] or 'White'})".strip(),
                "registration_number": row["registration_number"] or "MH-12-REG",
                "seat_capacity": row["seat_capacity"] or 4,
                "has_ac": row["has_ac"] if row["has_ac"] is not None else True,
                "distance_km": round(float(row["distance_km"]), 2),
                "latitude": float(row["latitude"]),
                "longitude": float(row["longitude"]),
            }
            for row in rows
        ]

    async def update_driver_location(
        self,
        driver_id: str,
        latitude: float,
        longitude: float,
        speed_kmh: float = 0.0,
        heading: float = 0.0,
    ) -> None:
        """Update driver's live location in PostgreSQL + Redis (TTL 30s)."""
        # Update PostGIS column — driver_id here is user_id (from current_user.user_id_str)
        await self.db.execute(
            text("""
                UPDATE drivers
                SET current_location = ST_GeogFromText(:wkt)
                WHERE user_id = :driver_user_id
            """),
            {"wkt": f"SRID=4326;POINT({longitude} {latitude})", "driver_user_id": driver_id}
        )
        await self.db.commit()

        # Cache in Redis for fast reads
        r = await get_redis()
        location_data = {
            "driver_id": driver_id,
            "latitude": latitude,
            "longitude": longitude,
            "speed_kmh": speed_kmh,
            "heading": heading,
        }
        await r.setex(
            f"driver:location:{driver_id}",
            30,
            json.dumps(location_data),
        )

    async def get_driver_location_from_redis(self, driver_id: str) -> Optional[dict]:
        """Fast read from Redis cache."""
        r = await get_redis()
        raw = await r.get(f"driver:location:{driver_id}")
        return json.loads(raw) if raw else None
