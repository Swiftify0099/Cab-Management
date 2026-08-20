"""
Feature 12: Cancellation Service
Structured cancellation reason validation, penalty exemption rules,
atomic concurrency control, driver performance metrics, and tiered auto-restrictions.
"""
import uuid
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User, Driver, DriverStatus,
    RideRequest, RideRequestStatus,
    DriverPointWallet, DriverPointTransaction,
    RideEventLog, RideCancellationEvent
)

# Structured Reason Catalog with Exemption Policies
CANCELLATION_REASONS = {
    "CUST_REQ": {
        "label": "Customer requested cancellation",
        "is_penalty_exempt": True,
        "requires_arrival": False,
        "requires_waiting_sec": 0,
        "sets_driver_offline": False,
    },
    "CANT_FIND": {
        "label": "Cannot find customer",
        "is_penalty_exempt": True,
        "requires_arrival": True,
        "requires_waiting_sec": 180,
        "sets_driver_offline": False,
    },
    "UNSAFE_LOC": {
        "label": "Unsafe pickup location / road hazard",
        "is_penalty_exempt": True,
        "requires_arrival": False,
        "requires_waiting_sec": 0,
        "sets_driver_offline": False,
    },
    "VEHICLE_ISSUE": {
        "label": "Vehicle breakdown / flat tyre",
        "is_penalty_exempt": True,
        "requires_arrival": False,
        "requires_waiting_sec": 0,
        "sets_driver_offline": True,
    },
    "EMERGENCY": {
        "label": "Personal or medical emergency",
        "is_penalty_exempt": True,
        "requires_arrival": False,
        "requires_waiting_sec": 0,
        "sets_driver_offline": True,
    },
    "WRONG_ADDR": {
        "label": "Wrong pickup address given by customer",
        "is_penalty_exempt": True,
        "requires_arrival": False,
        "requires_waiting_sec": 0,
        "sets_driver_offline": False,
    },
    "UNREACHABLE": {
        "label": "Customer phone unreachable",
        "is_penalty_exempt": True,
        "requires_arrival": False,
        "requires_waiting_sec": 0,
        "sets_driver_offline": False,
    },
    "LONG_WAIT": {
        "label": "Excessive customer waiting time",
        "is_penalty_exempt": True,
        "requires_arrival": True,
        "requires_waiting_sec": 300,
        "sets_driver_offline": False,
    },
    "DRIVER_OTHER": {
        "label": "Driver personal reason",
        "is_penalty_exempt": False, # Unexcused -> counts to driver cancellation penalty
        "requires_arrival": False,
        "requires_waiting_sec": 0,
        "sets_driver_offline": False,
    },
}


async def _safe_redis_publish(channel: str, payload_dict: dict):
    try:
        from common.utils.redis_client import get_redis
        r = await asyncio.wait_for(get_redis(), timeout=0.3)
        await asyncio.wait_for(r.publish(channel, json.dumps(payload_dict, default=str)), timeout=0.3)
    except Exception:
        pass


class CancellationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def get_reason_catalog(self) -> List[Dict[str, Any]]:
        """Returns structured cancellation reason options for mobile UI."""
        return [
            {
                "code": code,
                "label": meta["label"],
                "is_penalty_exempt": meta["is_penalty_exempt"],
                "requires_arrival": meta["requires_arrival"],
            }
            for code, meta in CANCELLATION_REASONS.items()
        ]

    async def cancel_ride_by_driver(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        reason_code: str,
        reason_details: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Atomic Driver Cancellation.
        Validates reason rules, determines penalty exemption, updates driver metrics,
        and enforces auto-restriction policies.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # Atomic Row Lock on RideRequest
        r_res = await self.db.execute(
            select(RideRequest).where(RideRequest.id == ride_id).with_for_update()
        )
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized for this ride")

        if ride.status in [RideRequestStatus.CANCELLED, RideRequestStatus.COMPLETED]:
            return {
                "success": True,
                "ride_id": str(ride.id),
                "status": ride.status.value,
                "message": f"Ride already {ride.status.value} (Idempotent response).",
            }

        if ride.status == RideRequestStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Cannot cancel an in-progress trip. Use Emergency or complete trip.")

        # Validate reason
        reason_meta = CANCELLATION_REASONS.get(reason_code)
        if not reason_meta:
            reason_code = "DRIVER_OTHER"
            reason_meta = CANCELLATION_REASONS["DRIVER_OTHER"]

        now = datetime.utcnow()

        # Check reason constraints
        if reason_meta["requires_arrival"] and not ride.pickup_arrived_at:
            raise HTTPException(status_code=400, detail=f"Reason '{reason_meta['label']}' requires driver arrival at pickup.")

        if reason_meta["requires_waiting_sec"] > 0:
            elapsed = (now - ride.pickup_arrived_at.replace(tzinfo=None)).total_seconds() if ride.pickup_arrived_at else 0
            if elapsed < reason_meta["requires_waiting_sec"]:
                rem = int(reason_meta["requires_waiting_sec"] - elapsed)
                raise HTTPException(status_code=400, detail=f"Please wait {rem}s more to use reason '{reason_meta['label']}'.")

        # Update Ride State
        ride.status = RideRequestStatus.CANCELLED
        ride.cancelled_by = "driver"
        ride.cancellation_reason = reason_code
        ride.cancelled_at = now

        # Handle Driver Status if vehicle issue or emergency
        if reason_meta["sets_driver_offline"]:
            driver.status = DriverStatus.OFFLINE
            driver._is_online = False

        # Update Driver Metrics
        driver.total_cancellations = (driver.total_cancellations or 0) + 1
        if not reason_meta["is_penalty_exempt"]:
            driver.penalty_cancellations = (driver.penalty_cancellations or 0) + 1

        # Calculate new cancellation rate
        total_accepted = max(driver.total_trips or 0, 1)
        driver.cancellation_rate = round(float(driver.penalty_cancellations or 0) / float(total_accepted), 3)

        # Evaluate Auto-Restrictions
        restriction_status = "NORMAL"
        restriction_reason = None
        suspension_until = None

        if driver.cancellation_rate >= 0.30 or (driver.penalty_cancellations or 0) >= 5:
            restriction_status = "TEMPORARILY_SUSPENDED"
            restriction_reason = f"High unexcused cancellation rate ({int(driver.cancellation_rate * 100)}%). Account suspended for 24h."
            suspension_until = now + timedelta(hours=24)
            driver.suspension_until = suspension_until
            driver.status = DriverStatus.SUSPENDED
        elif driver.cancellation_rate >= 0.20:
            restriction_status = "RESTRICTED"
            restriction_reason = f"Elevated cancellation rate ({int(driver.cancellation_rate * 100)}%). Dispatch priority reduced."
        elif driver.cancellation_rate >= 0.10:
            restriction_status = "WARNING"
            restriction_reason = f"Cancellation rate is {int(driver.cancellation_rate * 100)}%. Avoid further unexcused cancellations."

        driver.restriction_status = restriction_status
        driver.restriction_reason = restriction_reason

        # Create Canonical Cancellation Event
        cancel_event = RideCancellationEvent(
            id=uuid.uuid4(),
            ride_id=ride.id,
            actor_type="driver",
            actor_id=driver.user_id,
            reason_code=reason_code,
            reason_details=reason_details or reason_meta["label"],
            cancellation_fee=Decimal("0.00"),
            driver_penalty=Decimal("0.00") if reason_meta["is_penalty_exempt"] else Decimal("25.00"),
            driver_payout=Decimal("0.00"),
            is_penalty_exempt=reason_meta["is_penalty_exempt"],
            policy_version="v1.0",
        )
        self.db.add(cancel_event)

        # Audit Event Log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride.id,
            event_type="DRIVER_CANCELLED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={
                "reason_code": reason_code,
                "is_penalty_exempt": reason_meta["is_penalty_exempt"],
                "cancellation_rate": driver.cancellation_rate,
                "restriction_status": restriction_status,
            }
        )
        self.db.add(event_log)
        await self.db.commit()

        # Broadcast
        await _safe_redis_publish("trip:updates", {
            "event": "ride:cancelled",
            "ride_id": str(ride.id),
            "reason": reason_code,
            "cancelled_by": "driver",
        })

        return {
            "success": True,
            "ride_id": str(ride.id),
            "status": "cancelled",
            "reason_code": reason_code,
            "is_penalty_exempt": reason_meta["is_penalty_exempt"],
            "driver_cancellation_rate": driver.cancellation_rate,
            "restriction_status": restriction_status,
            "restriction_reason": restriction_reason,
            "message": f"Ride cancelled. Reason: {reason_meta['label']}.",
        }

    async def get_driver_metrics(self, driver_user_id: str) -> Dict[str, Any]:
        """Returns driver cancellation performance, rates, and active warnings."""
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        return {
            "driver_id": str(driver.id),
            "total_trips": driver.total_trips or 0,
            "total_cancellations": driver.total_cancellations or 0,
            "penalty_cancellations": driver.penalty_cancellations or 0,
            "cancellation_rate": driver.cancellation_rate or 0.0,
            "cancellation_rate_percentage": f"{round((driver.cancellation_rate or 0.0) * 100, 1)}%",
            "restriction_status": driver.restriction_status or "NORMAL",
            "restriction_reason": driver.restriction_reason,
            "is_suspended": driver.status == DriverStatus.SUSPENDED,
            "suspension_until": driver.suspension_until.isoformat() if driver.suspension_until else None,
        }

    async def get_cancellation_history(self, driver_user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Returns paginated cancellation history log for driver."""
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        events_res = await self.db.execute(
            select(RideCancellationEvent)
            .where(RideCancellationEvent.actor_id == driver.user_id)
            .order_by(RideCancellationEvent.created_at.desc())
            .limit(limit)
        )
        events = events_res.scalars().all()

        return [
            {
                "id": str(e.id),
                "ride_id": str(e.ride_id),
                "reason_code": e.reason_code,
                "reason_details": e.reason_details,
                "cancellation_fee": float(e.cancellation_fee),
                "driver_payout": float(e.driver_payout),
                "is_penalty_exempt": e.is_penalty_exempt,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ]
