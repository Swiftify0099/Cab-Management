"""
Organization & Student Service — Manages Colleges/Organizations, Routes,
Student Membership, and 3 KM Proximity Approaching Alerts.
"""
from __future__ import annotations

import json
import math
import uuid
from typing import List, Optional

import structlog
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Organization, OrganizationMember, OrganizationRoute, Driver, Vehicle, User
)
from common.utils.redis_client import get_redis, publish_event

logger = structlog.get_logger(__name__)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in kilometers between two points."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


class OrganizationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_organizations(self, org_type: Optional[str] = None) -> List[dict]:
        """List active registered organizations/colleges."""
        stmt = select(Organization).where(Organization.is_active == True)
        if org_type:
            stmt = stmt.where(Organization.org_type == org_type)
        res = await self.db.execute(stmt)
        orgs = res.scalars().all()
        return [
            {
                "id": str(o.id),
                "name": o.name,
                "code": o.code,
                "org_type": o.org_type,
                "address": o.address,
                "city": o.city,
                "latitude": o.latitude,
                "longitude": o.longitude,
                "contact_phone": o.contact_phone,
            }
            for o in orgs
        ]

    async def get_organization_routes(self, org_id: uuid.UUID) -> List[dict]:
        """Get pre-configured routes for an organization."""
        stmt = select(OrganizationRoute).where(
            and_(
                OrganizationRoute.organization_id == org_id,
                OrganizationRoute.is_active == True,
            )
        )
        res = await self.db.execute(stmt)
        routes = res.scalars().all()
        return [
            {
                "id": str(r.id),
                "route_name": r.route_name,
                "scheduled_start_time": r.scheduled_start_time,
                "scheduled_end_time": r.scheduled_end_time,
                "capacity": r.capacity,
                "stop_points": r.stop_points or [],
            }
            for r in routes
        ]

    async def get_registered_students(self, org_id: uuid.UUID, route_id: Optional[uuid.UUID] = None) -> List[dict]:
        """Get registered students/members for an organization and route."""
        stmt = select(OrganizationMember, User).join(
            User, OrganizationMember.user_id == User.id
        ).where(
            and_(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.is_active == True,
            )
        )
        if route_id:
            stmt = stmt.where(OrganizationMember.route_id == route_id)
        res = await self.db.execute(stmt)
        rows = res.all()
        return [
            {
                "member_id": str(m.id),
                "user_id": str(m.user_id),
                "full_name": u.full_name or "Student",
                "phone": u.phone or "",
                "registration_no": m.registration_no,
                "pickup_address": m.pickup_address,
                "pickup_lat": m.pickup_latitude,
                "pickup_lng": m.pickup_longitude,
            }
            for m, u in rows
        ]

    async def check_and_dispatch_student_approaching_alerts(
        self,
        driver_id: str,
        driver_lat: float,
        driver_lng: float,
        org_id: str,
        threshold_km: float = 3.0,
    ) -> List[str]:
        """
        Check if the driver is within ~3 KM of any student's registered pickup point.
        Dispatches high-priority push notification + siren event.
        """
        notified_users = []
        students = await self.get_registered_students(uuid.UUID(org_id))
        redis = await get_redis()

        for st in students:
            dist = _haversine_km(driver_lat, driver_lng, st["pickup_lat"], st["pickup_lng"])
            if dist <= threshold_km:
                cache_key = f"org_notif:{driver_id}:{st['user_id']}"
                # Alert once per trip cycle (TTL: 1 hour)
                already_notified = await redis.get(cache_key)
                if not already_notified:
                    await redis.set(cache_key, "1", ex=3600)
                    notified_users.append(st["user_id"])

                    event_payload = {
                        "event": "STUDENT_APPROACHING_ALERT",
                        "user_id": st["user_id"],
                        "driver_id": driver_id,
                        "distance_km": round(dist, 1),
                        "pickup_address": st["pickup_address"],
                        "message": f"College Bus is {round(dist, 1)} KM away! Please proceed to your pickup point.",
                        "sound": "loud_chime",
                        "vibrate": True,
                        "priority": "high",
                    }
                    await publish_event("notifications", json.dumps(event_payload))
                    logger.info("Dispatched 3KM approaching alert to student", user_id=st["user_id"], dist_km=dist)

        return notified_users
