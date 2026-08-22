"""
Feature 10: Multi-Stop Service
Authoritative Intermediate Stop Management: Adding Stops, PostGIS Arrival Geofencing (<60m),
and Sequence-aware Departures.
"""
import uuid
import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User, Driver,
    RideRequest, RideRequestStatus,
    RideStop, RideEventLog
)
from app.services.ride_fare_engine import haversine_distance_km
from app.services.routing_gatekeeper import RoutingGatekeeper


async def _safe_redis_publish(channel: str, payload_dict: dict):
    try:
        from common.utils.redis_client import get_redis
        r = await asyncio.wait_for(get_redis(), timeout=0.3)
        await asyncio.wait_for(r.publish(channel, json.dumps(payload_dict, default=str)), timeout=0.3)
    except Exception:
        pass


class MultiStopService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_stop(
        self,
        user_id: str,
        role: str,
        ride_id: uuid.UUID,
        address: str,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:
        """
        Adds an intermediate stop to active ride.
        Enforces maximum 3 stops limit and applies ₹30.00 base stop fee.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.status != RideRequestStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Cannot add stops to non-active ride")

        # Validate max 3 stops
        count_res = await self.db.execute(
            select(func.count(RideStop.id)).where(RideStop.ride_id == ride.id)
        )
        existing_count = count_res.scalar() or 0
        if existing_count >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 intermediate stops allowed per ride")

        stop_id = uuid.uuid4()
        sequence = existing_count + 1
        stop_fee = Decimal("30.00")

        stop = RideStop(
            id=stop_id,
            ride_id=ride.id,
            sequence=sequence,
            address=address.strip(),
            latitude=latitude,
            longitude=longitude,
            location=f"SRID=4326;POINT({longitude} {latitude})",
            status="accepted",
            requested_by=role,
            stop_fee=stop_fee,
            waiting_time_seconds=0,
        )
        self.db.add(stop)

        # Update ride estimated fare with stop fee (+₹30)
        ride.estimated_fare += stop_fee
        ride.current_estimated_fare += stop_fee

        # Audit log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride.id,
            event_type="STOP_ADDED",
            actor_id=uuid.UUID(user_id),
            actor_role=role,
            details={
                "stop_id": str(stop_id),
                "sequence": sequence,
                "address": address,
                "stop_fee": float(stop_fee),
            }
        )
        self.db.add(event_log)
        await self.db.commit()

        response_data = {
            "success": True,
            "stop_id": str(stop_id),
            "sequence": sequence,
            "address": address,
            "latitude": latitude,
            "longitude": longitude,
            "status": "accepted",
            "stop_fee": float(stop_fee),
            "updated_fare": float(ride.current_estimated_fare),
        }

        await _safe_redis_publish("trip:updates", {
            "event": "ride:stop_added",
            "data": response_data,
        })

        return response_data

    async def verify_stop_arrival(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        stop_id: uuid.UUID,
        driver_lat: float,
        driver_lng: float,
    ) -> Dict[str, Any]:
        """
        PostGIS Geofence arrival check (<=60m radius from stop coordinates).
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        s_res = await self.db.execute(
            select(RideStop).where(and_(RideStop.id == stop_id, RideStop.ride_id == ride_id))
        )
        stop = s_res.scalar_one_or_none()
        if not stop:
            raise HTTPException(status_code=404, detail="Stop not found")

        dist_m = haversine_distance_km(driver_lat, driver_lng, stop.latitude, stop.longitude) * 1000.0
        if dist_m > 60.0:
            raise HTTPException(
                status_code=400,
                detail=f"Driver is {int(dist_m)}m from stop (Must be within 60m to confirm arrival)."
            )

        now = datetime.utcnow()
        stop.status = "arrived"
        stop.arrived_at = now

        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride_id,
            event_type="STOP_ARRIVED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={"stop_id": str(stop_id), "distance_meters": dist_m}
        )
        self.db.add(event_log)
        await self.db.commit()

        payload = {
            "success": True,
            "stop_id": str(stop.id),
            "sequence": stop.sequence,
            "status": "arrived",
            "arrived_at": now.isoformat(),
            "message": f"Arrived at Stop {stop.sequence}: {stop.address}",
        }

        await _safe_redis_publish("trip:updates", {
            "event": "ride:stop_arrived",
            "data": payload,
        })

        return payload

    async def depart_stop(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        stop_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Completes intermediate stop and advances trip navigation to next waypoint.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        s_res = await self.db.execute(
            select(RideStop).where(and_(RideStop.id == stop_id, RideStop.ride_id == ride_id))
        )
        stop = s_res.scalar_one_or_none()
        if not stop:
            raise HTTPException(status_code=404, detail="Stop not found")

        now = datetime.utcnow()
        stop.status = "completed"
        stop.departed_at = now
        if stop.arrived_at:
            stop.waiting_time_seconds = max(int((now - stop.arrived_at.replace(tzinfo=None)).total_seconds()), 0)

        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride_id,
            event_type="STOP_DEPARTED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={"stop_id": str(stop_id), "waiting_time_seconds": stop.waiting_time_seconds}
        )
        self.db.add(event_log)
        await self.db.commit()

        payload = {
            "success": True,
            "stop_id": str(stop.id),
            "sequence": stop.sequence,
            "status": "completed",
            "departed_at": now.isoformat(),
            "waiting_time_seconds": stop.waiting_time_seconds,
            "message": f"Departed Stop {stop.sequence}. Resuming trip.",
        }

        await _safe_redis_publish("trip:updates", {
            "event": "ride:stop_completed",
            "data": payload,
        })

        return payload
