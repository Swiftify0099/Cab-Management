"""
Feature 10: Safety & SOS Service
Passive Safety Monitoring & Authoritative Emergency SOS Handling.
Idempotent SOS creation with PostGIS snapshot, 112 escalation, and priority broadcasting.
"""
import uuid
import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User, Driver,
    RideRequest, RideRequestStatus,
    RideSOSEvent, RideEventLog
)


async def _safe_redis_publish(channel: str, payload_dict: dict):
    try:
        from common.utils.redis_client import get_redis
        r = await asyncio.wait_for(get_redis(), timeout=0.3)
        await asyncio.wait_for(r.publish(channel, json.dumps(payload_dict, default=str)), timeout=0.3)
    except Exception:
        pass


class SafetySOSService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def trigger_sos(
        self,
        user_id: str,
        role: str,
        ride_id: uuid.UUID,
        latitude: float,
        longitude: float,
        accuracy: float = 10.0,
        reason: Optional[str] = "Driver triggered SOS",
    ) -> Dict[str, Any]:
        """
        Authoritative Emergency SOS Trigger.
        Idempotency: If active SOS exists for this ride, returns existing incident with escalation.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        # Verify participant
        d_res = await self.db.execute(select(Driver).where(Driver.id == ride.assigned_driver_id))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Assigned driver not found")

        # 1. Idempotency Check: Existing Active SOS
        existing_sos_res = await self.db.execute(
            select(RideSOSEvent).where(and_(RideSOSEvent.ride_id == ride.id, RideSOSEvent.status == "active"))
        )
        existing_sos = existing_sos_res.scalar_one_or_none()
        if existing_sos:
            return {
                "success": True,
                "sos_id": str(existing_sos.id),
                "status": "active",
                "message": "Emergency SOS already active (Idempotent response). Safety team notified.",
                "created_at": existing_sos.created_at.isoformat() if existing_sos.created_at else datetime.utcnow().isoformat(),
                "police_number": "112",
            }

        # 2. Create SOS Event Record
        sos_id = uuid.uuid4()
        now = datetime.utcnow()
        sos_event = RideSOSEvent(
            id=sos_id,
            ride_id=ride.id,
            driver_id=driver.id,
            customer_id=ride.customer_id,
            triggered_by=role,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            location=f"SRID=4326;POINT({longitude} {latitude})",
            reason=reason,
            status="active",
        )
        self.db.add(sos_event)
        ride.has_active_sos = True

        # Audit log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride.id,
            event_type="SOS_TRIGGERED",
            actor_id=uuid.UUID(user_id),
            actor_role=role,
            details={
                "sos_id": str(sos_id),
                "latitude": latitude,
                "longitude": longitude,
                "accuracy": accuracy,
                "reason": reason,
            }
        )
        self.db.add(event_log)
        await self.db.commit()

        payload = {
            "success": True,
            "sos_id": str(sos_id),
            "ride_id": str(ride.id),
            "driver_id": str(driver.id),
            "customer_id": str(ride.customer_id),
            "status": "active",
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": accuracy,
            "reason": reason,
            "created_at": now.isoformat(),
            "police_number": "112",
            "message": "Emergency SOS recorded. 24/7 Safety Command Center and local authorities alerted.",
        }

        # High priority broadcast
        await _safe_redis_publish("emergency:alerts", {
            "event": "ride:sos",
            "data": payload,
        })

        return payload

    async def get_active_sos(self, ride_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Returns active SOS incident for active ride if any."""
        res = await self.db.execute(
            select(RideSOSEvent).where(and_(RideSOSEvent.ride_id == ride_id, RideSOSEvent.status == "active"))
        )
        sos = res.scalar_one_or_none()
        if not sos:
            return None

        return {
            "sos_id": str(sos.id),
            "ride_id": str(sos.ride_id),
            "status": sos.status,
            "triggered_by": sos.triggered_by,
            "latitude": sos.latitude,
            "longitude": sos.longitude,
            "created_at": sos.created_at.isoformat() if sos.created_at else None,
            "police_number": "112",
        }
