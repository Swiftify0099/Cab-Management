"""
Road Hazard Service with PostGIS Spatial Clustering — Feature 7
"""
from __future__ import annotations

from datetime import datetime, timedelta
import math
import uuid
from typing import List, Optional

import structlog
from sqlalchemy import select, and_, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import RoadHazard, Driver
from common.utils.redis_client import publish_event

logger = structlog.get_logger(__name__)

HAZARD_CLUSTER_RADIUS_METERS = 50.0  # 50m clustering radius
HAZARD_ALERT_RADIUS_METERS = 1500.0  # 1.5 km driver alert radius


class HazardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def report_hazard(
        self,
        driver_id: Optional[uuid.UUID],
        hazard_type: str,
        latitude: float,
        longitude: float,
        description: Optional[str] = None,
        heading: Optional[float] = None,
        speed_kmh: Optional[float] = None,
        ride_id: Optional[uuid.UUID] = None,
    ) -> RoadHazard:
        """
        Submits hazard report.
        If an active hazard of same type exists within 50m, clusters by increasing confidence & report count.
        Otherwise creates a new hazard.
        """
        now = datetime.utcnow()
        # Set expiry based on type: temporary (accidents/traffic: 2h) vs longer (pothole/construction: 7 days)
        if hazard_type in ("accident", "heavy_traffic", "flooding"):
            expires_at = now + timedelta(hours=2)
        elif hazard_type == "road_closed":
            expires_at = now + timedelta(hours=12)
        else:
            expires_at = now + timedelta(days=7)

        # 1. Spatial check for nearby existing hazard (< 50m)
        existing_res = await self.db.execute(
            select(RoadHazard).where(
                and_(
                    RoadHazard.hazard_type == hazard_type,
                    RoadHazard.status.in_(["reported", "verified"]),
                    RoadHazard.expires_at > now,
                    func.ST_DWithin(
                        RoadHazard.location,
                        func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326),
                        HAZARD_CLUSTER_RADIUS_METERS,
                    ),
                )
            )
        )
        existing = existing_res.scalar_one_or_none()

        if existing:
            # Cluster: Increment report count and boost confidence
            existing.report_count += 1
            existing.confidence_score = min(5.0, existing.confidence_score + 0.5)
            if existing.report_count >= 3:
                existing.status = "verified"
            await self.db.commit()
            await self.db.refresh(existing)
            logger.info("Clustered road hazard", hazard_id=str(existing.id), count=existing.report_count)
            return existing

        # 2. Create new hazard
        hazard = RoadHazard(
            hazard_type=hazard_type,
            description=description,
            location=func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326),
            latitude=latitude,
            longitude=longitude,
            heading=heading,
            speed_kmh=speed_kmh,
            status="reported",
            confidence_score=1.0,
            report_count=1,
            reported_by_driver_id=driver_id,
            ride_id=ride_id,
            expires_at=expires_at,
        )
        self.db.add(hazard)
        await self.db.commit()
        await self.db.refresh(hazard)

        # Broadcast nearby alert via Socket.IO
        await publish_event("navigation:hazards:events", {
            "event": "HAZARD_REPORTED",
            "hazard_id": str(hazard.id),
            "hazard_type": hazard.hazard_type,
            "latitude": hazard.latitude,
            "longitude": hazard.longitude,
            "confidence_score": hazard.confidence_score,
        })

        return hazard

    async def get_nearby_hazards(
        self,
        latitude: float,
        longitude: float,
        radius_meters: float = HAZARD_ALERT_RADIUS_METERS,
    ) -> List[dict]:
        """Fetches active road hazards within radius using PostGIS ST_DWithin."""
        now = datetime.utcnow()
        res = await self.db.execute(
            select(RoadHazard).where(
                and_(
                    RoadHazard.status.in_(["reported", "verified"]),
                    RoadHazard.expires_at > now,
                    func.ST_DWithin(
                        RoadHazard.location,
                        func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326),
                        radius_meters,
                    ),
                )
            ).order_by(
                func.ST_Distance(
                    RoadHazard.location,
                    func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326),
                )
            )
        )
        hazards = res.scalars().all()
        return [
            {
                "hazard_id": str(h.id),
                "hazard_type": h.hazard_type,
                "description": h.description,
                "latitude": h.latitude,
                "longitude": h.longitude,
                "confidence_score": h.confidence_score,
                "report_count": h.report_count,
                "status": h.status,
            }
            for h in hazards
        ]
