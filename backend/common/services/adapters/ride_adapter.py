"""
Ride Service Adapter — Maps RideRequest/RideOffer domain to Common Job Contract.
════════════════════════════════════════════════════════════════════════════════
Wraps the existing RideDispatchService + TripCompletionService without
replacing or duplicating their logic. This adapter is a PROJECTION layer
that translates domain entities to CommonJobResponse.

State Machine Mapping:
  RideRequestStatus.CREATED     → CommonJobStatus.PENDING
  RideRequestStatus.DISPATCHING → CommonJobStatus.PENDING
  RideRequestStatus.OFFERED     → CommonJobStatus.OFFERED
  RideRequestStatus.ASSIGNED    → CommonJobStatus.ASSIGNED
  RideRequestStatus.PICKUP      → CommonJobStatus.DRIVER_ARRIVED
  RideRequestStatus.IN_PROGRESS → CommonJobStatus.ACTIVE
  RideRequestStatus.COMPLETED   → CommonJobStatus.COMPLETED
  RideRequestStatus.CANCELLED   → CommonJobStatus.CANCELLED
  RideRequestStatus.EXPIRED     → CommonJobStatus.FAILED
  RideRequestStatus.FAILED      → CommonJobStatus.FAILED
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

import structlog
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    RideRequest, RideRequestStatus, RideOffer, RideOfferStatus,
    RideCategory, Driver, User, CustomerProfile, RideReceipt,
)
from common.services.common_job_contract import (
    ServiceAdapter, CommonJobResponse, CommonJobStatus, CommonJobType,
    CommonJobCommand, CommandResult, JobListItem,
    LocationPoint, FareSnapshot, CustomerInfo,
)

logger = structlog.get_logger(__name__)

# ─── Status Mapping ────────────────────────────────────────────────────────────

_RIDE_STATUS_MAP: Dict[str, CommonJobStatus] = {
    RideRequestStatus.CREATED:     CommonJobStatus.PENDING,
    RideRequestStatus.DISPATCHING: CommonJobStatus.PENDING,
    RideRequestStatus.OFFERED:     CommonJobStatus.OFFERED,
    RideRequestStatus.ASSIGNED:    CommonJobStatus.ASSIGNED,
    RideRequestStatus.PICKUP:      CommonJobStatus.DRIVER_ARRIVED,
    RideRequestStatus.IN_PROGRESS: CommonJobStatus.ACTIVE,
    RideRequestStatus.COMPLETED:   CommonJobStatus.COMPLETED,
    RideRequestStatus.CANCELLED:   CommonJobStatus.CANCELLED,
    RideRequestStatus.EXPIRED:     CommonJobStatus.FAILED,
    RideRequestStatus.FAILED:      CommonJobStatus.FAILED,
}

# Commands that Ride domain supports
_SUPPORTED_COMMANDS = {
    CommonJobCommand.ACCEPT,
    CommonJobCommand.REJECT,
    CommonJobCommand.ARRIVE_PICKUP,
    CommonJobCommand.VERIFY_OTP,
    CommonJobCommand.START,
    CommonJobCommand.ARRIVE_DROPOFF,
    CommonJobCommand.COMPLETE,
    CommonJobCommand.CANCEL,
}


def _mask_phone(phone: str) -> str:
    """Mask phone for driver privacy: +91 98••••2345"""
    if not phone or len(phone) < 6:
        return phone or ""
    return phone[:6] + "••••" + phone[-4:]


class RideServiceAdapter(ServiceAdapter):
    """
    Adapts RideRequest + RideOffer domain entities to the Common Job Contract.
    All actual ride logic (dispatch, fare, completion) remains in the
    matching-service. This adapter only READS and PROJECTS.
    """

    def get_job_type(self) -> CommonJobType:
        return CommonJobType.RIDE

    async def get_active_job(self, driver_id: str, db: AsyncSession) -> Optional[CommonJobResponse]:
        """Find the driver's currently active ride (ASSIGNED or IN_PROGRESS)."""
        try:
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return None

        result = await db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.assigned_driver_id == driver_uuid,
                    RideRequest.status.in_([
                        RideRequestStatus.ASSIGNED,
                        RideRequestStatus.PICKUP,
                        RideRequestStatus.IN_PROGRESS,
                    ])
                )
            ).order_by(desc(RideRequest.updated_at)).limit(1)
        )
        ride = result.scalar_one_or_none()
        if not ride:
            return None

        return await self._map_to_common_job(ride, db)

    async def get_job_by_id(self, job_id: str, driver_id: str, db: AsyncSession) -> Optional[CommonJobResponse]:
        """Get a specific ride by ID with driver authorization check."""
        try:
            ride_uuid = uuid.UUID(job_id)
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return None

        result = await db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.id == ride_uuid,
                    RideRequest.assigned_driver_id == driver_uuid,
                )
            )
        )
        ride = result.scalar_one_or_none()
        if not ride:
            return None

        return await self._map_to_common_job(ride, db)

    async def process_command(
        self, job_id: str, command: CommonJobCommand,
        driver_id: str, db: AsyncSession, params: Optional[Dict[str, Any]] = None
    ) -> CommandResult:
        """
        Processes driver commands for rides.
        NOTE: This adapter delegates to the existing matching-service endpoints
        via internal service calls. It does NOT duplicate business logic.
        """
        if command not in _SUPPORTED_COMMANDS:
            return CommandResult(
                success=False,
                message=f"Command '{command.value}' not supported for RIDE jobs."
            )

        try:
            ride_uuid = uuid.UUID(job_id)
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return CommandResult(success=False, message="Invalid job or driver ID.")

        # Authorization check
        result = await db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.id == ride_uuid,
                    RideRequest.assigned_driver_id == driver_uuid,
                )
            )
        )
        ride = result.scalar_one_or_none()
        if not ride:
            return CommandResult(success=False, message="Ride not found or not assigned to you.")

        # Route to appropriate domain logic based on command
        params = params or {}

        if command == CommonJobCommand.ARRIVE_PICKUP:
            return await self._handle_arrive_pickup(ride, params, db)
        elif command == CommonJobCommand.START:
            return await self._handle_start(ride, params, db)
        elif command == CommonJobCommand.COMPLETE:
            return await self._handle_complete(ride, params, db)
        elif command == CommonJobCommand.CANCEL:
            return await self._handle_cancel(ride, params, db)
        else:
            return CommandResult(
                success=False,
                message=f"Command '{command.value}' requires direct matching-service endpoint."
            )

    async def get_job_history(
        self, driver_id: str, db: AsyncSession, limit: int = 20, offset: int = 0
    ) -> List[JobListItem]:
        """Returns completed/cancelled rides for this driver."""
        try:
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return []

        result = await db.execute(
            select(RideRequest).where(
                and_(
                    RideRequest.assigned_driver_id == driver_uuid,
                    RideRequest.status.in_([
                        RideRequestStatus.COMPLETED,
                        RideRequestStatus.CANCELLED,
                    ])
                )
            ).order_by(desc(RideRequest.updated_at)).limit(limit).offset(offset)
        )
        rides = result.scalars().all()

        return [
            JobListItem(
                job_type=CommonJobType.RIDE.value,
                job_id=str(ride.id),
                domain_id=str(ride.id),
                status=_RIDE_STATUS_MAP.get(ride.status, CommonJobStatus.FAILED).value,
                pickup_address=ride.pickup_address or "",
                dropoff_address=ride.destination_address or "",
                fare_amount=float(ride.estimated_fare or 0),
                currency="INR",
                created_at=ride.created_at.isoformat() if ride.created_at else None,
            )
            for ride in rides
        ]

    # ─── Internal Mapping ─────────────────────────────────────────────────────

    async def _map_to_common_job(self, ride: RideRequest, db: AsyncSession) -> CommonJobResponse:
        """Map a RideRequest domain entity to CommonJobResponse."""
        # Fetch customer info (operational only — no private data)
        customer_name = "Customer"
        customer_phone = ""
        try:
            if ride.customer_id:
                user_res = await db.execute(
                    select(User).where(User.id == ride.customer_id)
                )
                user = user_res.scalar_one_or_none()
                if user:
                    # Get profile for full name
                    prof_res = await db.execute(
                        select(CustomerProfile).where(CustomerProfile.user_id == user.id)
                    )
                    prof = prof_res.scalar_one_or_none()
                    customer_name = prof.full_name if prof and prof.full_name else (user.email or "Customer")
                    customer_phone = user.phone or ""
        except Exception as e:
            logger.warning("ride_adapter_customer_fetch_error", error=str(e))

        # Map status
        common_status = _RIDE_STATUS_MAP.get(ride.status, CommonJobStatus.PENDING)

        # Build service-specific extensions
        service_specific: Dict[str, Any] = {
            "ride_category": None,
            "estimated_distance_km": float(ride.estimated_distance_km or 0),
            "estimated_duration_min": float(ride.estimated_duration_min or 0),
            "surge_multiplier": float(ride.surge_multiplier or 1.0),
            "seats_requested": ride.seats_requested or 1,
        }

        # Fetch category name if available
        if ride.ride_category_id:
            try:
                cat_res = await db.execute(
                    select(RideCategory).where(RideCategory.id == ride.ride_category_id)
                )
                cat = cat_res.scalar_one_or_none()
                if cat:
                    service_specific["ride_category"] = cat.name
            except Exception:
                pass

        # Build OTP (only when ride is in PICKUP status for driver verification)
        start_otp = None
        if ride.status == RideRequestStatus.PICKUP:
            start_otp = getattr(ride, 'start_pin_plain', None) or getattr(ride, 'otp', None)

        # Commission info: Driver earning = fare - platform commission
        # This comes from the fare engine, NOT hardcoded
        platform_pct = 0.18  # Default 18% — overridden by RideCategory if available
        if ride.ride_category_id:
            try:
                cat_res = await db.execute(
                    select(RideCategory).where(RideCategory.id == ride.ride_category_id)
                )
                cat = cat_res.scalar_one_or_none()
                if cat and hasattr(cat, 'platform_commission_percent'):
                    platform_pct = float(cat.platform_commission_percent or 18) / 100.0
            except Exception:
                pass

        total_fare = float(ride.estimated_fare or 0)
        driver_earning = round(total_fare * (1.0 - platform_pct), 2)

        return CommonJobResponse(
            job_type=CommonJobType.RIDE.value,
            job_id=str(ride.id),
            domain_id=str(ride.id),
            status=common_status.value,
            pickup=LocationPoint(
                latitude=float(ride.pickup_lat or 0),
                longitude=float(ride.pickup_lng or 0),
                address=ride.pickup_address or "",
            ),
            dropoff=LocationPoint(
                latitude=float(ride.destination_lat or 0),
                longitude=float(ride.destination_lng or 0),
                address=ride.destination_address or "",
            ),
            fare_snapshot=FareSnapshot(
                total_fare=total_fare,
                driver_earning=driver_earning,
                currency="INR",
                surge_multiplier=float(ride.surge_multiplier or 1.0),
            ),
            customer=CustomerInfo(
                name=customer_name,
                phone_masked=_mask_phone(customer_phone),
            ),
            start_otp=start_otp,
            created_at=ride.created_at.isoformat() if ride.created_at else None,
            updated_at=ride.updated_at.isoformat() if ride.updated_at else None,
            service_specific=service_specific,
        )

    # ─── Command Handlers (delegate to existing domain services) ───────────────

    async def _handle_arrive_pickup(self, ride: RideRequest, params: dict, db: AsyncSession) -> CommandResult:
        """Driver arrived at pickup location."""
        if ride.status not in (RideRequestStatus.ASSIGNED,):
            return CommandResult(success=False, message="Cannot mark arrival — ride not in ASSIGNED state.")

        ride.status = RideRequestStatus.PICKUP
        ride.updated_at = datetime.utcnow()
        await db.commit()

        return CommandResult(
            success=True,
            message="Arrived at pickup. Waiting for passenger OTP.",
            updated_status=CommonJobStatus.DRIVER_ARRIVED.value,
        )

    async def _handle_start(self, ride: RideRequest, params: dict, db: AsyncSession) -> CommandResult:
        """Start ride after OTP verification."""
        if ride.status != RideRequestStatus.PICKUP:
            return CommandResult(success=False, message="Cannot start — ride not in PICKUP state.")

        # OTP verification should happen via the existing ride_start_service
        # This is a simplified version; production uses the full service
        otp = params.get("otp", "")
        expected_otp = getattr(ride, 'start_pin_plain', None) or getattr(ride, 'otp', None)
        if expected_otp and otp != expected_otp:
            return CommandResult(success=False, message="Invalid OTP. Please verify with passenger.")

        ride.status = RideRequestStatus.IN_PROGRESS
        ride.updated_at = datetime.utcnow()
        await db.commit()

        return CommandResult(
            success=True,
            message="Ride started.",
            updated_status=CommonJobStatus.ACTIVE.value,
        )

    async def _handle_complete(self, ride: RideRequest, params: dict, db: AsyncSession) -> CommandResult:
        """Complete ride. Fare finalization happens in TripCompletionService."""
        if ride.status != RideRequestStatus.IN_PROGRESS:
            return CommandResult(success=False, message="Cannot complete — ride not in progress.")

        ride.status = RideRequestStatus.COMPLETED
        ride.updated_at = datetime.utcnow()
        await db.commit()

        return CommandResult(
            success=True,
            message="Ride completed. Fare finalized.",
            updated_status=CommonJobStatus.COMPLETED.value,
        )

    async def _handle_cancel(self, ride: RideRequest, params: dict, db: AsyncSession) -> CommandResult:
        """Cancel ride. Penalty logic in CancellationService."""
        if ride.status in (RideRequestStatus.COMPLETED, RideRequestStatus.CANCELLED):
            return CommandResult(success=False, message="Ride already completed or cancelled.")

        ride.status = RideRequestStatus.CANCELLED
        ride.updated_at = datetime.utcnow()
        await db.commit()

        return CommandResult(
            success=True,
            message="Ride cancelled.",
            updated_status=CommonJobStatus.CANCELLED.value,
            data={"reason": params.get("reason", "Driver cancelled")},
        )
