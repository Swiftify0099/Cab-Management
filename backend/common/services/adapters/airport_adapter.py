"""
Airport Service Adapter — Maps AirportBooking domain to Common Job Contract.
════════════════════════════════════════════════════════════════════════════════
State Machine Mapping:
  AirportBookingStatus.CONFIRMED        → CommonJobStatus.PENDING
  AirportBookingStatus.DRIVER_ASSIGNED  → CommonJobStatus.ASSIGNED
  AirportBookingStatus.DRIVER_EN_ROUTE  → CommonJobStatus.DRIVER_ARRIVING
  AirportBookingStatus.DRIVER_ARRIVED   → CommonJobStatus.DRIVER_ARRIVED
  AirportBookingStatus.WAITING          → CommonJobStatus.DRIVER_ARRIVED
  AirportBookingStatus.IN_PROGRESS      → CommonJobStatus.ACTIVE
  AirportBookingStatus.COMPLETED        → CommonJobStatus.COMPLETED
  AirportBookingStatus.CANCELLED        → CommonJobStatus.CANCELLED
  AirportBookingStatus.FLIGHT_CANCELLED → CommonJobStatus.CANCELLED
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

import structlog
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    AirportBooking, AirportBookingStatus, Driver, User,
)
from common.services.common_job_contract import (
    ServiceAdapter, CommonJobResponse, CommonJobStatus, CommonJobType,
    CommonJobCommand, CommandResult, JobListItem,
    LocationPoint, FareSnapshot, CustomerInfo,
)

logger = structlog.get_logger(__name__)

_AIRPORT_STATUS_MAP: Dict[str, CommonJobStatus] = {
    AirportBookingStatus.CONFIRMED:        CommonJobStatus.PENDING,
    AirportBookingStatus.DRIVER_ASSIGNED:  CommonJobStatus.ASSIGNED,
    AirportBookingStatus.DRIVER_EN_ROUTE:  CommonJobStatus.DRIVER_ARRIVING,
    AirportBookingStatus.DRIVER_ARRIVED:   CommonJobStatus.DRIVER_ARRIVED,
    AirportBookingStatus.WAITING:          CommonJobStatus.DRIVER_ARRIVED,
    AirportBookingStatus.IN_PROGRESS:      CommonJobStatus.ACTIVE,
    AirportBookingStatus.COMPLETED:        CommonJobStatus.COMPLETED,
    AirportBookingStatus.CANCELLED:        CommonJobStatus.CANCELLED,
    AirportBookingStatus.FLIGHT_CANCELLED: CommonJobStatus.CANCELLED,
}

_AIRPORT_ACTIVE_STATUSES = [
    AirportBookingStatus.DRIVER_ASSIGNED,
    AirportBookingStatus.DRIVER_EN_ROUTE,
    AirportBookingStatus.DRIVER_ARRIVED,
    AirportBookingStatus.WAITING,
    AirportBookingStatus.IN_PROGRESS,
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


class AirportServiceAdapter(ServiceAdapter):
    """
    Adapts AirportBooking domain entities to Common Job Contract.
    """

    def get_job_type(self) -> CommonJobType:
        return CommonJobType.AIRPORT

    async def get_active_job(self, driver_id: str, db: AsyncSession) -> Optional[CommonJobResponse]:
        try:
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return None

        result = await db.execute(
            select(AirportBooking).where(
                and_(
                    AirportBooking.driver_id == driver_uuid,
                    AirportBooking.status.in_(_AIRPORT_ACTIVE_STATUSES),
                )
            ).order_by(desc(AirportBooking.updated_at)).limit(1)
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
            select(AirportBooking).where(
                and_(
                    AirportBooking.id == booking_uuid,
                    AirportBooking.driver_id == driver_uuid,
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
                message=f"Command '{command.value}' not supported for AIRPORT jobs."
            )

        try:
            booking_uuid = uuid.UUID(job_id)
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return CommandResult(success=False, message="Invalid job or driver ID.")

        result = await db.execute(
            select(AirportBooking).where(
                and_(
                    AirportBooking.id == booking_uuid,
                    AirportBooking.driver_id == driver_uuid,
                )
            )
        )
        booking = result.scalar_one_or_none()
        if not booking:
            return CommandResult(success=False, message="Airport booking not found or not assigned to you.")

        params = params or {}

        if command == CommonJobCommand.ARRIVE_PICKUP:
            booking.status = AirportBookingStatus.DRIVER_ARRIVED
            booking.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Arrived at airport / pickup terminal.",
                updated_status=CommonJobStatus.DRIVER_ARRIVED.value,
            )
        elif command == CommonJobCommand.START:
            booking.status = AirportBookingStatus.IN_PROGRESS
            booking.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Airport transfer started.",
                updated_status=CommonJobStatus.ACTIVE.value,
            )
        elif command == CommonJobCommand.COMPLETE:
            booking.status = AirportBookingStatus.COMPLETED
            booking.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Airport transfer completed.",
                updated_status=CommonJobStatus.COMPLETED.value,
            )
        elif command == CommonJobCommand.CANCEL:
            if booking.status in (AirportBookingStatus.COMPLETED, AirportBookingStatus.CANCELLED):
                return CommandResult(success=False, message="Airport transfer already finalized.")
            booking.status = AirportBookingStatus.CANCELLED
            booking.cancelled_reason = params.get("reason", "Driver cancelled")
            booking.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Airport booking cancelled.",
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
            select(AirportBooking).where(
                and_(
                    AirportBooking.driver_id == driver_uuid,
                    AirportBooking.status.in_([
                        AirportBookingStatus.COMPLETED,
                        AirportBookingStatus.CANCELLED,
                        AirportBookingStatus.FLIGHT_CANCELLED,
                    ])
                )
            ).order_by(desc(AirportBooking.updated_at)).limit(limit).offset(offset)
        )
        bookings = result.scalars().all()

        return [
            JobListItem(
                job_type=CommonJobType.AIRPORT.value,
                job_id=str(b.id),
                domain_id=str(b.id),
                status=_AIRPORT_STATUS_MAP.get(b.status, CommonJobStatus.FAILED).value,
                pickup_address=b.pickup_address or "",
                dropoff_address=b.drop_address or "",
                fare_amount=float(b.total_fare or 0),
                currency="INR",
                created_at=b.created_at.isoformat() if b.created_at else None,
            )
            for b in bookings
        ]

    # ─── Internal Mapping ─────────────────────────────────────────────────────

    async def _map_to_common_job(self, booking: AirportBooking, db: AsyncSession) -> CommonJobResponse:
        common_status = _AIRPORT_STATUS_MAP.get(booking.status, CommonJobStatus.PENDING)

        service_specific: Dict[str, Any] = {
            "booking_reference": booking.booking_reference,
            "transfer_type": booking.transfer_type.value if hasattr(booking.transfer_type, 'value') else str(booking.transfer_type),
            "flight_number": booking.flight_number,
            "flight_status": booking.flight_status.value if hasattr(booking.flight_status, 'value') else str(booking.flight_status),
            "flight_delay_minutes": booking.flight_delay_minutes,
            "meet_and_greet_required": booking.meet_and_greet_required,
            "meet_and_greet_name": booking.meet_and_greet_name,
            "passenger_count": booking.passenger_count,
            "large_luggage_count": booking.large_luggage_count,
            "cabin_luggage_count": booking.cabin_luggage_count,
            "vehicle_category": booking.vehicle_category,
        }

        total_fare = float(booking.total_fare or 0)
        driver_earning = round(total_fare * 0.82, 2)

        return CommonJobResponse(
            job_type=CommonJobType.AIRPORT.value,
            job_id=str(booking.id),
            domain_id=str(booking.id),
            status=common_status.value,
            pickup=LocationPoint(
                latitude=float(booking.pickup_lat or 0),
                longitude=float(booking.pickup_lng or 0),
                address=booking.pickup_address or "",
            ),
            dropoff=LocationPoint(
                latitude=float(booking.drop_lat or 0),
                longitude=float(booking.drop_lng or 0),
                address=booking.drop_address or "",
            ),
            fare_snapshot=FareSnapshot(
                total_fare=total_fare,
                driver_earning=driver_earning,
                currency="INR",
                payment_method=booking.payment_method or "WALLET",
            ),
            customer=CustomerInfo(
                name=booking.meet_and_greet_name or "Airport Passenger",
                phone_masked="",
                special_notes=booking.special_instructions or "",
            ),
            start_otp=None,
            created_at=booking.created_at.isoformat() if booking.created_at else None,
            updated_at=booking.updated_at.isoformat() if booking.updated_at else None,
            service_specific=service_specific,
        )
