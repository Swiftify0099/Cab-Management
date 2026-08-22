"""
Feature 11: Waiting Service
Server-authoritative waiting timer, free-to-paid waiting transition,
realtime waiting charges, and anti-fraud no-show resolution.
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
    User, Driver,
    RideRequest, RideRequestStatus,
    DriverPointWallet, DriverPointTransaction,
    RideEventLog, RideCancellationEvent
)
from app.services.ride_fare_engine import haversine_distance_km

FREE_WAITING_SECONDS = 180      # 3 minutes free waiting
PAID_WAITING_RATE_PER_MIN = 2.0  # ₹2.00 per minute paid waiting
NO_SHOW_WAITING_SECONDS = 300   # 5 minutes minimum for No-Show
NO_SHOW_MAX_DISTANCE_M = 150.0  # Driver must be within 150m of pickup


async def _safe_redis_publish(channel: str, payload_dict: dict):
    try:
        from common.utils.redis_client import get_redis
        r = await asyncio.wait_for(get_redis(), timeout=0.3)
        await asyncio.wait_for(r.publish(channel, json.dumps(payload_dict, default=str)), timeout=0.3)
    except Exception:
        pass


class WaitingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_live_waiting_status(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        driver_lat: float,
        driver_lng: float,
    ) -> Dict[str, Any]:
        """
        Server-authoritative live waiting status.
        Computes elapsed seconds, free remaining, paid waiting charges, and no-show eligibility.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride or ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized for this ride")

        if not ride.pickup_arrived_at:
            return {
                "ride_id": str(ride.id),
                "is_arrived": False,
                "message": "Driver has not officially marked arrival at pickup yet.",
                "elapsed_seconds": 0,
                "free_waiting_remaining_seconds": FREE_WAITING_SECONDS,
                "paid_waiting_seconds": 0,
                "waiting_charge": 0.0,
                "is_no_show_eligible": False,
            }

        now = datetime.utcnow()
        elapsed_sec = max(int((now - ride.pickup_arrived_at.replace(tzinfo=None)).total_seconds()), 0)
        
        # Calculate Free vs Paid
        free_remaining = max(FREE_WAITING_SECONDS - elapsed_sec, 0)
        paid_sec = max(elapsed_sec - FREE_WAITING_SECONDS, 0)
        paid_mins = int((paid_sec + 59) // 60) if paid_sec > 0 else 0
        waiting_charge = round(paid_mins * PAID_WAITING_RATE_PER_MIN, 2)

        # Update ride record
        ride.pickup_waiting_seconds = elapsed_sec
        ride.pickup_waiting_fare = Decimal(str(waiting_charge))

        # Check PostGIS distance to pickup
        dist_m = haversine_distance_km(driver_lat, driver_lng, ride.pickup_lat, ride.pickup_lng) * 1000.0
        contact_count = ride.contact_attempts_count or 0

        # No-Show Eligibility: >= 300s (5m), <= 150m, >= 1 contact
        is_no_show_eligible = (elapsed_sec >= NO_SHOW_WAITING_SECONDS) and (dist_m <= NO_SHOW_MAX_DISTANCE_M) and (contact_count >= 1)
        ride.is_no_show_eligible = is_no_show_eligible

        await self.db.commit()

        payload = {
            "ride_id": str(ride.id),
            "is_arrived": True,
            "pickup_arrived_at": ride.pickup_arrived_at.isoformat(),
            "elapsed_seconds": elapsed_sec,
            "free_waiting_seconds_total": FREE_WAITING_SECONDS,
            "free_waiting_remaining_seconds": free_remaining,
            "is_free_waiting": free_remaining > 0,
            "paid_waiting_seconds": paid_sec,
            "is_paid_waiting": paid_sec > 0,
            "waiting_rate_per_min": PAID_WAITING_RATE_PER_MIN,
            "waiting_charge": waiting_charge,
            "distance_to_pickup_meters": round(dist_m, 1),
            "contact_attempts": contact_count,
            "is_no_show_eligible": is_no_show_eligible,
        }

        # Broadcast realtime update to ride room
        await _safe_redis_publish("trip:updates", {
            "event": "ride:waiting_update",
            "data": payload,
        })

        return payload

    async def process_no_show_cancellation(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        driver_lat: float,
        driver_lng: float,
    ) -> Dict[str, Any]:
        """
        Anti-fraud No-Show cancellation with atomic row locking.
        Validates 5-min timer, PostGIS proximity (<150m), and contact attempts.
        Credits ₹50.00 compensation to driver wallet.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # Atomic row lock
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
                "message": f"Ride is already {ride.status.value}",
                "cancellation_fee": 50.0,
            }

        if ride.status == RideRequestStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Cannot mark no-show on an in-progress trip.")

        if not ride.pickup_arrived_at:
            raise HTTPException(status_code=400, detail="Driver has not officially marked arrival at pickup yet.")

        now = datetime.utcnow()
        elapsed_sec = (now - ride.pickup_arrived_at.replace(tzinfo=None)).total_seconds()
        if elapsed_sec < NO_SHOW_WAITING_SECONDS:
            rem = int(NO_SHOW_WAITING_SECONDS - elapsed_sec)
            raise HTTPException(
                status_code=400,
                detail=f"Minimum waiting time not reached. Please wait {rem // 60}m {rem % 60}s before reporting No-Show."
            )

        dist_m = haversine_distance_km(driver_lat, driver_lng, ride.pickup_lat, ride.pickup_lng) * 1000.0
        if dist_m > NO_SHOW_MAX_DISTANCE_M:
            raise HTTPException(
                status_code=400,
                detail=f"Driver is {int(dist_m)}m from pickup. Move within 150m to confirm No-Show."
            )

        if (ride.contact_attempts_count or 0) < 1:
            raise HTTPException(
                status_code=400,
                detail="At least 1 contact attempt (Call or Chat) is required before cancelling as No-Show."
            )

        # Transition Ride State
        ride.status = RideRequestStatus.CANCELLED
        ride.cancelled_by = "no_show"
        ride.cancellation_reason = "CUSTOMER_NO_SHOW"
        ride.cancelled_at = now

        # Credit ₹50 to Driver Wallet
        w_res = await self.db.execute(select(DriverPointWallet).where(DriverPointWallet.driver_id == driver.id))
        wallet = w_res.scalar_one_or_none()
        if wallet:
            wallet.balance += 50
            tx = DriverPointTransaction(
                id=uuid.uuid4(),
                driver_id=driver.id,
                wallet_id=wallet.id,
                delta=50,
                reason="Compensation: Customer No-Show",
                ref_id=ride.id,
            )
            self.db.add(tx)

        # Canonical Cancellation Event
        cancel_event = RideCancellationEvent(
            id=uuid.uuid4(),
            ride_id=ride.id,
            actor_type="no_show",
            actor_id=driver.user_id,
            reason_code="CUSTOMER_NO_SHOW",
            reason_details=f"No-Show after {int(elapsed_sec)}s waiting at pickup",
            cancellation_fee=Decimal("50.00"),
            driver_penalty=Decimal("0.00"),
            driver_payout=Decimal("50.00"),
            is_penalty_exempt=True,
            policy_version="v1.0",
        )
        self.db.add(cancel_event)

        # Audit Event Log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride.id,
            event_type="NO_SHOW_CANCELLED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={
                "elapsed_waiting_seconds": elapsed_sec,
                "distance_meters": dist_m,
                "contact_attempts": ride.contact_attempts_count,
                "payout": 50.0,
            }
        )
        self.db.add(event_log)
        await self.db.commit()

        # Broadcast
        await _safe_redis_publish("trip:updates", {
            "event": "ride:cancelled",
            "ride_id": str(ride.id),
            "reason": "CUSTOMER_NO_SHOW",
            "cancelled_by": "no_show",
        })

        return {
            "success": True,
            "ride_id": str(ride.id),
            "status": "cancelled",
            "message": "No-Show confirmed. ₹50.00 compensation credited to your wallet.",
            "cancellation_fee": 50.0,
            "driver_payout": 50.0,
        }
