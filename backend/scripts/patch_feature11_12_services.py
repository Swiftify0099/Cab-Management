import os, sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
matching_services_dir = os.path.join(backend_root, "matching-service", "app", "services")
matching_api_file = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")
gateway_file = os.path.join(backend_root, "local_gateway.py")

# ============================================================
# 1. waiting_service.py
# ============================================================
waiting_service_code = '''"""
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
'''

# ============================================================
# 2. cancellation_service.py
# ============================================================
cancellation_service_code = '''"""
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
'''

with open(os.path.join(matching_services_dir, "waiting_service.py"), "w", encoding="utf-8") as f:
    f.write(waiting_service_code)
print("[✓] waiting_service.py created")

with open(os.path.join(matching_services_dir, "cancellation_service.py"), "w", encoding="utf-8") as f:
    f.write(cancellation_service_code)
print("[✓] cancellation_service.py created")

# ============================================================
# 3. Patch matching.py with Feature 11 & 12 REST Endpoints
# ============================================================
with open(matching_api_file, "r", encoding="utf-8") as f:
    matching_content = f.read()

feature11_12_api_routes = '''

# ============================================================
# FEATURES 11 & 12: WAITING & CANCELLATION ENDPOINTS
# ============================================================

class CancelRideSchema(BaseModel):
    reason_code: str
    reason_details: Optional[str] = None


@router.get(
    "/rides/{ride_id}/waiting-status",
    response_model=SuccessResponse,
    summary="Driver: Get server-authoritative live waiting status & charges",
)
async def get_live_waiting_status_endpoint(
    ride_id: str,
    latitude: float = Query(...),
    longitude: float = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.waiting_service import WaitingService
    service = WaitingService(db)
    result = await service.get_live_waiting_status(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        driver_lat=latitude,
        driver_lng=longitude,
    )
    return SuccessResponse(success=True, message="Waiting status retrieved", data=result)


@router.get(
    "/cancellation/reasons",
    response_model=SuccessResponse,
    summary="Driver/Customer: Get structured cancellation reason catalog",
)
async def get_cancellation_reasons_endpoint(
    db: AsyncSession = Depends(get_db),
):
    from app.services.cancellation_service import CancellationService
    service = CancellationService(db)
    reasons = service.get_reason_catalog()
    return SuccessResponse(success=True, message="Cancellation reasons retrieved", data=reasons)


@router.post(
    "/rides/{ride_id}/cancel-by-driver",
    response_model=SuccessResponse,
    summary="Driver: Structured cancellation with penalty & metric update",
)
async def cancel_ride_by_driver_endpoint(
    ride_id: str,
    request: CancelRideSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.cancellation_service import CancellationService
    service = CancellationService(db)
    result = await service.cancel_ride_by_driver(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        reason_code=request.reason_code,
        reason_details=request.reason_details,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/drivers/cancellation-metrics",
    response_model=SuccessResponse,
    summary="Driver: Get cancellation performance score & standing",
)
async def get_driver_cancellation_metrics_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.cancellation_service import CancellationService
    service = CancellationService(db)
    result = await service.get_driver_metrics(driver_user_id=current_user.user_id_str)
    return SuccessResponse(success=True, message="Cancellation metrics retrieved", data=result)


@router.get(
    "/drivers/cancellation-history",
    response_model=SuccessResponse,
    summary="Driver: Get cancellation history audit log",
)
async def get_driver_cancellation_history_endpoint(
    limit: int = Query(20),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.cancellation_service import CancellationService
    service = CancellationService(db)
    result = await service.get_cancellation_history(driver_user_id=current_user.user_id_str, limit=limit)
    return SuccessResponse(success=True, message="Cancellation history retrieved", data=result)
'''

if "/rides/{ride_id}/waiting-status" not in matching_content:
    matching_content += feature11_12_api_routes
    with open(matching_api_file, "w", encoding="utf-8") as f:
        f.write(matching_content)
    print("[✓] matching.py updated with Feature 11 & 12 routes")
else:
    print("[i] matching.py already contains Feature 11 & 12 routes")

print("\nALL FEATURE 11 & 12 BACKEND SERVICES AND APIS APPLIED SUCCESSFULLY!")
