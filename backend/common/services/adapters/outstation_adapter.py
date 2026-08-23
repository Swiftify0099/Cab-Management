"""
Outstation Service Adapter — Maps OutstationBooking domain to Common Job Contract.
════════════════════════════════════════════════════════════════════════════════
State Machine Mapping:
  OutstationBookingStatus.CONFIRMED        → CommonJobStatus.PENDING
  OutstationBookingStatus.DRIVER_ASSIGNED  → CommonJobStatus.ASSIGNED
  OutstationBookingStatus.DRIVER_EN_ROUTE  → CommonJobStatus.DRIVER_ARRIVING
  OutstationBookingStatus.DRIVER_ARRIVED   → CommonJobStatus.DRIVER_ARRIVED
  OutstationBookingStatus.OUTBOUND_STARTED → CommonJobStatus.ACTIVE
  OutstationBookingStatus.AT_DESTINATION   → CommonJobStatus.NEAR_COMPLETION
  OutstationBookingStatus.RETURN_STARTED   → CommonJobStatus.ACTIVE
  OutstationBookingStatus.COMPLETED        → CommonJobStatus.COMPLETED
  OutstationBookingStatus.CANCELLED        → CommonJobStatus.CANCELLED
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

import structlog
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    OutstationBooking, OutstationBookingStatus, Driver, User, CustomerProfile,
)
from common.services.common_job_contract import (
    ServiceAdapter, CommonJobResponse, CommonJobStatus, CommonJobType,
    CommonJobCommand, CommandResult, JobListItem,
    LocationPoint, FareSnapshot, CustomerInfo,
)

logger = structlog.get_logger(__name__)

_OUTSTATION_STATUS_MAP: Dict[str, CommonJobStatus] = {
    OutstationBookingStatus.CONFIRMED:        CommonJobStatus.PENDING,
    OutstationBookingStatus.DRIVER_ASSIGNED:  CommonJobStatus.ASSIGNED,
    OutstationBookingStatus.DRIVER_EN_ROUTE:  CommonJobStatus.DRIVER_ARRIVING,
    OutstationBookingStatus.DRIVER_ARRIVED:   CommonJobStatus.DRIVER_ARRIVED,
    OutstationBookingStatus.OUTBOUND_STARTED: CommonJobStatus.ACTIVE,
    OutstationBookingStatus.AT_DESTINATION:   CommonJobStatus.NEAR_COMPLETION,
    OutstationBookingStatus.RETURN_STARTED:   CommonJobStatus.ACTIVE,
    OutstationBookingStatus.COMPLETED:        CommonJobStatus.COMPLETED,
    OutstationBookingStatus.CANCELLED:        CommonJobStatus.CANCELLED,
}

_OUTSTATION_ACTIVE_STATUSES = [
    OutstationBookingStatus.DRIVER_ASSIGNED,
    OutstationBookingStatus.DRIVER_EN_ROUTE,
    OutstationBookingStatus.DRIVER_ARRIVED,
    OutstationBookingStatus.OUTBOUND_STARTED,
    OutstationBookingStatus.AT_DESTINATION,
    OutstationBookingStatus.RETURN_STARTED,
]

_SUPPORTED_COMMANDS = {
    CommonJobCommand.ACCEPT,
    CommonJobCommand.REJECT,
    CommonJobCommand.ARRIVE_PICKUP,
    CommonJobCommand.START,
    CommonJobCommand.ARRIVE_DROPOFF,
    CommonJobCommand.COMPLETE,
    CommonJobCommand.CANCEL,
}


def _mask_phone(phone: str) -> str:
    if not phone or len(phone) < 6:
        return phone or ""
    return phone[:6] + "••••" + phone[-4:]


class OutstationServiceAdapter(ServiceAdapter):
    """
    Adapts OutstationBooking domain entities to Common Job Contract.
    """

    def get_job_type(self) -> CommonJobType:
        return CommonJobType.OUTSTATION

    async def get_active_job(self, driver_id: str, db: AsyncSession) -> Optional[CommonJobResponse]:
        try:
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return None

        result = await db.execute(
            select(OutstationBooking).where(
                and_(
                    OutstationBooking.driver_id == driver_uuid,
                    OutstationBooking.status.in_(_OUTSTATION_ACTIVE_STATUSES),
                )
            ).order_by(desc(OutstationBooking.updated_at)).limit(1)
        )
        booking = result.scalar_one_or_none()
        if not booking:
            return None

        return await self._map_to_common_job(booking, db)

    async def get_job_by_id(self, job_id: str, driver_id: str, db: AsyncSession) -> Optional[CommonJobResponse]:
        try:
            booking_uuid = uuid.UUID(job_id)
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return None

        result = await db.execute(
            select(OutstationBooking).where(
                and_(
                    OutstationBooking.id == booking_uuid,
                    OutstationBooking.driver_id == driver_uuid,
                )
            )
        )
        booking = result.scalar_one_or_none()
        if not booking:
            return None

        return await self._map_to_common_job(booking, db)

    async def process_command(
        self, job_id: str, command: CommonJobCommand,
        driver_id: str, db: AsyncSession, params: Optional[Dict[str, Any]] = None
    ) -> CommandResult:
        if command not in _SUPPORTED_COMMANDS:
            return CommandResult(
                success=False,
                message=f"Command '{command.value}' not supported for OUTSTATION jobs."
            )

        try:
            booking_uuid = uuid.UUID(job_id)
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return CommandResult(success=False, message="Invalid job or driver ID.")

        result = await db.execute(
            select(OutstationBooking).where(
                and_(
                    OutstationBooking.id == booking_uuid,
                    OutstationBooking.driver_id == driver_uuid,
                )
            )
        )
        booking = result.scalar_one_or_none()
        if not booking:
            return CommandResult(success=False, message="Outstation booking not found or not assigned to you.")

        params = params or {}

        if command == CommonJobCommand.ARRIVE_PICKUP:
            booking.status = OutstationBookingStatus.DRIVER_ARRIVED
            booking.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Arrived at origin pickup address.",
                updated_status=CommonJobStatus.DRIVER_ARRIVED.value,
            )
        elif command == CommonJobCommand.START:
            booking.status = OutstationBookingStatus.OUTBOUND_STARTED
            booking.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Outstation journey started.",
                updated_status=CommonJobStatus.ACTIVE.value,
            )
        elif command == CommonJobCommand.ARRIVE_DROPOFF:
            booking.status = OutstationBookingStatus.AT_DESTINATION
            booking.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Arrived at outstation destination.",
                updated_status=CommonJobStatus.NEAR_COMPLETION.value,
            )
        elif command == CommonJobCommand.COMPLETE:
            booking.status = OutstationBookingStatus.COMPLETED
            booking.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Outstation trip completed.",
                updated_status=CommonJobStatus.COMPLETED.value,
            )
        elif command == CommonJobCommand.CANCEL:
            if booking.status in (OutstationBookingStatus.COMPLETED, OutstationBookingStatus.CANCELLED):
                return CommandResult(success=False, message="Outstation booking already finalized.")
            booking.status = OutstationBookingStatus.CANCELLED
            booking.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Outstation booking cancelled.",
                updated_status=CommonJobStatus.CANCELLED.value,
            )
        else:
            return CommandResult(success=False, message=f"Unhandled command '{command.value}'.")

    async def get_job_history(
        self, driver_id: str, db: AsyncSession, limit: int = 20, offset: int = 0
    ) -> List[JobListItem]:
        try:
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return []

        result = await db.execute(
            select(OutstationBooking).where(
                and_(
                    OutstationBooking.driver_id == driver_uuid,
                    OutstationBooking.status.in_([
                        OutstationBookingStatus.COMPLETED,
                        OutstationBookingStatus.CANCELLED,
                    ])
                )
            ).order_by(desc(OutstationBooking.updated_at)).limit(limit).offset(offset)
        )
        bookings = result.scalars().all()

        return [
            JobListItem(
                job_type=CommonJobType.OUTSTATION.value,
                job_id=str(b.id),
                domain_id=str(b.id),
                status=_OUTSTATION_STATUS_MAP.get(b.status, CommonJobStatus.FAILED).value,
                pickup_address=b.origin_address or "",
                dropoff_address=b.final_destination_address or "",
                fare_amount=float(b.final_fare or b.estimated_fare or 0),
                currency="INR",
                created_at=b.created_at.isoformat() if b.created_at else None,
            )
            for b in bookings
        ]

    # ─── Internal Mapping ─────────────────────────────────────────────────────

    async def _map_to_common_job(self, booking: OutstationBooking, db: AsyncSession) -> CommonJobResponse:
        common_status = _OUTSTATION_STATUS_MAP.get(booking.status, CommonJobStatus.PENDING)

        service_specific: Dict[str, Any] = {
            "reference": booking.reference,
            "journey_type": booking.journey_type.value if hasattr(booking.journey_type, 'value') else str(booking.journey_type),
            "vehicle_category": booking.vehicle_category,
            "estimated_distance_km": float(booking.estimated_distance_km or 0),
            "estimated_duration_hours": float(booking.estimated_duration_hours or 0),
            "driver_allowance": float(booking.driver_allowance or 0),
            "night_halt_charge": float(booking.night_halt_charge or 0),
        }

        total_fare = float(booking.final_fare or booking.estimated_fare or 0)
        driver_earning = round(total_fare * 0.85, 2)

        return CommonJobResponse(
            job_type=CommonJobType.OUTSTATION.value,
            job_id=str(booking.id),
            domain_id=str(booking.id),
            status=common_status.value,
            pickup=LocationPoint(
                latitude=float(booking.origin_lat or 0),
                longitude=float(booking.origin_lng or 0),
                address=booking.origin_address or "",
            ),
            dropoff=LocationPoint(
                latitude=float(booking.final_destination_lat or 0),
                longitude=float(booking.final_destination_lng or 0),
                address=booking.final_destination_address or "",
            ),
            fare_snapshot=FareSnapshot(
                total_fare=total_fare,
                driver_earning=driver_earning,
                currency="INR",
                payment_method=booking.payment_method or "WALLET",
            ),
            customer=CustomerInfo(
                name="Outstation Traveler",
                phone_masked="",
                special_notes=f"Outstation {service_specific['journey_type']} • {booking.passenger_count} Pax",
            ),
            start_otp=None,
            created_at=booking.created_at.isoformat() if booking.created_at else None,
            updated_at=booking.updated_at.isoformat() if booking.updated_at else None,
            service_specific=service_specific,
        )
