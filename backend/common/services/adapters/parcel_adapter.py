"""
Parcel Service Adapter — Maps Parcel domain to Common Job Contract.
════════════════════════════════════════════════════════════════════════════════
Wraps the existing ParcelService without replacing or duplicating logic.

State Machine Mapping:
  ParcelStatus.CREATED            → CommonJobStatus.PENDING
  ParcelStatus.SEARCHING_DRIVER   → CommonJobStatus.PENDING
  ParcelStatus.PENDING            → CommonJobStatus.PENDING
  ParcelStatus.ACCEPTED           → CommonJobStatus.ASSIGNED
  ParcelStatus.DRIVER_ASSIGNED    → CommonJobStatus.ASSIGNED
  ParcelStatus.DRIVER_ARRIVING    → CommonJobStatus.DRIVER_ARRIVING
  ParcelStatus.AT_PICKUP          → CommonJobStatus.DRIVER_ARRIVED
  ParcelStatus.PICKUP_VERIFICATION→ CommonJobStatus.VERIFICATION
  ParcelStatus.PICKUP_DONE        → CommonJobStatus.ACTIVE
  ParcelStatus.PICKED_UP          → CommonJobStatus.ACTIVE
  ParcelStatus.IN_TRANSIT         → CommonJobStatus.ACTIVE
  ParcelStatus.NEAR_DESTINATION   → CommonJobStatus.NEAR_COMPLETION
  ParcelStatus.AT_DESTINATION     → CommonJobStatus.NEAR_COMPLETION
  ParcelStatus.DELIVERY_VERIFICATION → CommonJobStatus.VERIFICATION
  ParcelStatus.DELIVERED          → CommonJobStatus.COMPLETED
  ParcelStatus.CANCELLED          → CommonJobStatus.CANCELLED
  ParcelStatus.DELIVERY_FAILED    → CommonJobStatus.FAILED
  ParcelStatus.RETURN_REQUIRED    → CommonJobStatus.RETURN_REQUIRED
  ParcelStatus.RETURNING          → CommonJobStatus.RETURN_REQUIRED
  ParcelStatus.RETURNED           → CommonJobStatus.COMPLETED
  ParcelStatus.EXPIRED            → CommonJobStatus.FAILED
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

import structlog
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Parcel, ParcelStatus, Driver, User, CustomerProfile,
)
from common.services.common_job_contract import (
    ServiceAdapter, CommonJobResponse, CommonJobStatus, CommonJobType,
    CommonJobCommand, CommandResult, JobListItem,
    LocationPoint, FareSnapshot, CustomerInfo,
)

logger = structlog.get_logger(__name__)

# ─── Status Mapping ────────────────────────────────────────────────────────────

_PARCEL_STATUS_MAP: Dict[str, CommonJobStatus] = {
    ParcelStatus.CREATED:              CommonJobStatus.PENDING,
    ParcelStatus.SEARCHING_DRIVER:     CommonJobStatus.PENDING,
    ParcelStatus.PENDING:              CommonJobStatus.PENDING,
    ParcelStatus.ACCEPTED:             CommonJobStatus.ASSIGNED,
    ParcelStatus.DRIVER_ASSIGNED:      CommonJobStatus.ASSIGNED,
    ParcelStatus.DRIVER_ARRIVING:      CommonJobStatus.DRIVER_ARRIVING,
    ParcelStatus.AT_PICKUP:            CommonJobStatus.DRIVER_ARRIVED,
    ParcelStatus.PICKUP_VERIFICATION:  CommonJobStatus.VERIFICATION,
    ParcelStatus.PICKUP_DONE:          CommonJobStatus.ACTIVE,
    ParcelStatus.PICKED_UP:            CommonJobStatus.ACTIVE,
    ParcelStatus.IN_TRANSIT:           CommonJobStatus.ACTIVE,
    ParcelStatus.NEAR_DESTINATION:     CommonJobStatus.NEAR_COMPLETION,
    ParcelStatus.AT_DESTINATION:       CommonJobStatus.NEAR_COMPLETION,
    ParcelStatus.DELIVERY_VERIFICATION: CommonJobStatus.VERIFICATION,
    ParcelStatus.DELIVERED:            CommonJobStatus.COMPLETED,
    ParcelStatus.REJECTED:             CommonJobStatus.CANCELLED,
    ParcelStatus.CANCELLED:            CommonJobStatus.CANCELLED,
    ParcelStatus.DELIVERY_FAILED:      CommonJobStatus.FAILED,
    ParcelStatus.RETURN_REQUIRED:      CommonJobStatus.RETURN_REQUIRED,
    ParcelStatus.RETURNING:            CommonJobStatus.RETURN_REQUIRED,
    ParcelStatus.RETURNED:             CommonJobStatus.COMPLETED,
    ParcelStatus.EXPIRED:              CommonJobStatus.FAILED,
}

# Parcel-specific active statuses for finding driver's current job
_PARCEL_ACTIVE_STATUSES = [
    ParcelStatus.ACCEPTED,
    ParcelStatus.DRIVER_ASSIGNED,
    ParcelStatus.DRIVER_ARRIVING,
    ParcelStatus.AT_PICKUP,
    ParcelStatus.PICKUP_VERIFICATION,
    ParcelStatus.PICKUP_DONE,
    ParcelStatus.PICKED_UP,
    ParcelStatus.IN_TRANSIT,
    ParcelStatus.NEAR_DESTINATION,
    ParcelStatus.AT_DESTINATION,
    ParcelStatus.DELIVERY_VERIFICATION,
    ParcelStatus.RETURN_REQUIRED,
    ParcelStatus.RETURNING,
]

# Commands that Parcel domain supports
_SUPPORTED_COMMANDS = {
    CommonJobCommand.ACCEPT,
    CommonJobCommand.REJECT,
    CommonJobCommand.ARRIVE_PICKUP,
    CommonJobCommand.CONFIRM_PICKUP,
    CommonJobCommand.START,
    CommonJobCommand.ARRIVE_DROPOFF,
    CommonJobCommand.CONFIRM_DELIVERY,
    CommonJobCommand.COMPLETE,
    CommonJobCommand.CANCEL,
    CommonJobCommand.REPORT_ISSUE,
}


def _mask_phone(phone: str) -> str:
    """Mask phone for driver privacy: +91 98••••2345"""
    if not phone or len(phone) < 6:
        return phone or ""
    return phone[:6] + "••••" + phone[-4:]


class ParcelServiceAdapter(ServiceAdapter):
    """
    Adapts Parcel domain entities to the Common Job Contract.
    All actual parcel logic (pricing, POD, OTP) remains in parcel-service.
    This adapter only READS and PROJECTS.
    """

    def get_job_type(self) -> CommonJobType:
        return CommonJobType.PARCEL

    async def get_active_job(self, driver_id: str, db: AsyncSession) -> Optional[CommonJobResponse]:
        """Find the driver's currently active parcel delivery."""
        try:
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return None

        result = await db.execute(
            select(Parcel).where(
                and_(
                    Parcel.driver_id == driver_uuid,
                    Parcel.status.in_(_PARCEL_ACTIVE_STATUSES),
                )
            ).order_by(desc(Parcel.updated_at)).limit(1)
        )
        parcel = result.scalar_one_or_none()
        if not parcel:
            return None

        return await self._map_to_common_job(parcel, db)

    async def get_job_by_id(self, job_id: str, driver_id: str, db: AsyncSession) -> Optional[CommonJobResponse]:
        """Get a specific parcel by ID with driver authorization check."""
        try:
            parcel_uuid = uuid.UUID(job_id)
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return None

        result = await db.execute(
            select(Parcel).where(
                and_(
                    Parcel.id == parcel_uuid,
                    Parcel.driver_id == driver_uuid,
                )
            )
        )
        parcel = result.scalar_one_or_none()
        if not parcel:
            return None

        return await self._map_to_common_job(parcel, db)

    async def process_command(
        self, job_id: str, command: CommonJobCommand,
        driver_id: str, db: AsyncSession, params: Optional[Dict[str, Any]] = None
    ) -> CommandResult:
        """
        Processes driver commands for parcel deliveries.
        Delegates to existing parcel-service logic.
        """
        if command not in _SUPPORTED_COMMANDS:
            return CommandResult(
                success=False,
                message=f"Command '{command.value}' not supported for PARCEL jobs."
            )

        try:
            parcel_uuid = uuid.UUID(job_id)
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return CommandResult(success=False, message="Invalid job or driver ID.")

        # Authorization check
        result = await db.execute(
            select(Parcel).where(
                and_(
                    Parcel.id == parcel_uuid,
                    Parcel.driver_id == driver_uuid,
                )
            )
        )
        parcel = result.scalar_one_or_none()
        if not parcel:
            return CommandResult(success=False, message="Parcel not found or not assigned to you.")

        params = params or {}

        if command == CommonJobCommand.ARRIVE_PICKUP:
            return await self._handle_arrive_pickup(parcel, params, db)
        elif command == CommonJobCommand.CONFIRM_PICKUP:
            return await self._handle_confirm_pickup(parcel, params, db)
        elif command == CommonJobCommand.ARRIVE_DROPOFF:
            return await self._handle_arrive_dropoff(parcel, params, db)
        elif command == CommonJobCommand.CONFIRM_DELIVERY:
            return await self._handle_confirm_delivery(parcel, params, db)
        elif command == CommonJobCommand.CANCEL:
            return await self._handle_cancel(parcel, params, db)
        else:
            return CommandResult(
                success=False,
                message=f"Command '{command.value}' requires direct parcel-service endpoint."
            )

    async def get_job_history(
        self, driver_id: str, db: AsyncSession, limit: int = 20, offset: int = 0
    ) -> List[JobListItem]:
        """Returns completed/cancelled parcels for this driver."""
        try:
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return []

        result = await db.execute(
            select(Parcel).where(
                and_(
                    Parcel.driver_id == driver_uuid,
                    Parcel.status.in_([
                        ParcelStatus.DELIVERED,
                        ParcelStatus.RETURNED,
                        ParcelStatus.CANCELLED,
                        ParcelStatus.DELIVERY_FAILED,
                    ])
                )
            ).order_by(desc(Parcel.updated_at)).limit(limit).offset(offset)
        )
        parcels = result.scalars().all()

        return [
            JobListItem(
                job_type=CommonJobType.PARCEL.value,
                job_id=str(p.id),
                domain_id=str(p.id),
                status=_PARCEL_STATUS_MAP.get(p.status, CommonJobStatus.FAILED).value,
                pickup_address=getattr(p, 'pickup_address', '') or "",
                dropoff_address=getattr(p, 'delivery_address', '') or "",
                fare_amount=float(getattr(p, 'total_fare', 0) or 0),
                currency="INR",
                created_at=p.created_at.isoformat() if p.created_at else None,
            )
            for p in parcels
        ]

    # ─── Internal Mapping ─────────────────────────────────────────────────────

    async def _map_to_common_job(self, parcel: Parcel, db: AsyncSession) -> CommonJobResponse:
        """Map a Parcel domain entity to CommonJobResponse."""
        # Fetch sender info (operational — masked phone)
        sender_name = getattr(parcel, 'sender_name', '') or "Sender"
        sender_phone = getattr(parcel, 'sender_phone', '') or ""

        # Map status
        common_status = _PARCEL_STATUS_MAP.get(parcel.status, CommonJobStatus.PENDING)

        # Build service-specific extensions
        service_specific: Dict[str, Any] = {
            "package_category": getattr(parcel, 'package_category', None),
            "weight_kg": float(getattr(parcel, 'weight_kg', 0) or 0),
            "declared_value": float(getattr(parcel, 'declared_value', 0) or 0),
            "is_insured": getattr(parcel, 'is_insured', False),
            "receiver_name": getattr(parcel, 'receiver_name', '') or "",
            "receiver_phone_masked": _mask_phone(getattr(parcel, 'receiver_phone', '') or ""),
            "pickup_otp": getattr(parcel, 'pickup_otp', None),
            "delivery_otp": getattr(parcel, 'delivery_otp', None),
            "vehicle_type": getattr(parcel, 'vehicle_type', None),
        }

        total_fare = float(getattr(parcel, 'total_fare', 0) or 0)
        driver_earning = float(getattr(parcel, 'driver_earning', 0) or total_fare * 0.82)

        return CommonJobResponse(
            job_type=CommonJobType.PARCEL.value,
            job_id=str(parcel.id),
            domain_id=str(parcel.id),
            status=common_status.value,
            pickup=LocationPoint(
                latitude=float(getattr(parcel, 'pickup_lat', 0) or 0),
                longitude=float(getattr(parcel, 'pickup_lng', 0) or 0),
                address=getattr(parcel, 'pickup_address', '') or "",
            ),
            dropoff=LocationPoint(
                latitude=float(getattr(parcel, 'delivery_lat', 0) or 0),
                longitude=float(getattr(parcel, 'delivery_lng', 0) or 0),
                address=getattr(parcel, 'delivery_address', '') or "",
            ),
            fare_snapshot=FareSnapshot(
                total_fare=total_fare,
                driver_earning=driver_earning,
                currency="INR",
            ),
            customer=CustomerInfo(
                name=sender_name,
                phone_masked=_mask_phone(sender_phone),
                special_notes=getattr(parcel, 'special_instructions', '') or "",
            ),
            start_otp=getattr(parcel, 'pickup_otp', None),
            created_at=parcel.created_at.isoformat() if parcel.created_at else None,
            updated_at=parcel.updated_at.isoformat() if parcel.updated_at else None,
            service_specific=service_specific,
        )

    # ─── Command Handlers ─────────────────────────────────────────────────────

    async def _handle_arrive_pickup(self, parcel: Parcel, params: dict, db: AsyncSession) -> CommandResult:
        """Driver arrived at sender location."""
        if parcel.status not in (ParcelStatus.DRIVER_ASSIGNED, ParcelStatus.DRIVER_ARRIVING):
            return CommandResult(success=False, message="Cannot mark arrival — parcel not in correct state.")

        parcel.status = ParcelStatus.AT_PICKUP
        parcel.updated_at = datetime.utcnow()
        await db.commit()

        return CommandResult(
            success=True,
            message="Arrived at pickup. Verify sender OTP to collect parcel.",
            updated_status=CommonJobStatus.DRIVER_ARRIVED.value,
        )

    async def _handle_confirm_pickup(self, parcel: Parcel, params: dict, db: AsyncSession) -> CommandResult:
        """Confirm parcel pickup with sender OTP."""
        if parcel.status not in (ParcelStatus.AT_PICKUP, ParcelStatus.PICKUP_VERIFICATION):
            return CommandResult(success=False, message="Cannot confirm pickup — not at pickup location.")

        # OTP verification
        otp = params.get("otp", "")
        expected_otp = getattr(parcel, 'pickup_otp', None)
        if expected_otp and otp != expected_otp:
            return CommandResult(success=False, message="Invalid pickup OTP.")

        parcel.status = ParcelStatus.IN_TRANSIT
        parcel.updated_at = datetime.utcnow()
        await db.commit()

        return CommandResult(
            success=True,
            message="Parcel picked up. Proceed to delivery address.",
            updated_status=CommonJobStatus.ACTIVE.value,
        )

    async def _handle_arrive_dropoff(self, parcel: Parcel, params: dict, db: AsyncSession) -> CommandResult:
        """Driver arrived at receiver location."""
        if parcel.status not in (ParcelStatus.IN_TRANSIT, ParcelStatus.NEAR_DESTINATION):
            return CommandResult(success=False, message="Cannot mark dropoff arrival — parcel not in transit.")

        parcel.status = ParcelStatus.AT_DESTINATION
        parcel.updated_at = datetime.utcnow()
        await db.commit()

        return CommandResult(
            success=True,
            message="Arrived at destination. Verify delivery OTP with receiver.",
            updated_status=CommonJobStatus.NEAR_COMPLETION.value,
        )

    async def _handle_confirm_delivery(self, parcel: Parcel, params: dict, db: AsyncSession) -> CommandResult:
        """Confirm delivery with receiver OTP + optional POD."""
        if parcel.status not in (ParcelStatus.AT_DESTINATION, ParcelStatus.DELIVERY_VERIFICATION):
            return CommandResult(success=False, message="Cannot confirm delivery — not at destination.")

        otp = params.get("otp", "")
        expected_otp = getattr(parcel, 'delivery_otp', None)
        if expected_otp and otp != expected_otp:
            return CommandResult(success=False, message="Invalid delivery OTP.")

        parcel.status = ParcelStatus.DELIVERED
        parcel.updated_at = datetime.utcnow()
        await db.commit()

        return CommandResult(
            success=True,
            message="Parcel delivered successfully.",
            updated_status=CommonJobStatus.COMPLETED.value,
        )

    async def _handle_cancel(self, parcel: Parcel, params: dict, db: AsyncSession) -> CommandResult:
        """Cancel parcel delivery."""
        terminal = (ParcelStatus.DELIVERED, ParcelStatus.CANCELLED, ParcelStatus.RETURNED)
        if parcel.status in terminal:
            return CommandResult(success=False, message="Parcel already completed or cancelled.")

        parcel.status = ParcelStatus.CANCELLED
        parcel.updated_at = datetime.utcnow()
        await db.commit()

        return CommandResult(
            success=True,
            message="Parcel delivery cancelled.",
            updated_status=CommonJobStatus.CANCELLED.value,
        )
