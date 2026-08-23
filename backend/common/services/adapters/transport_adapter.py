"""
Transport Service Adapter — Maps TransportOrder domain to Common Job Contract.
════════════════════════════════════════════════════════════════════════════════
Wraps the existing TransportService without replacing or duplicating logic.

State Machine Mapping:
  TransportOrderStatus.CREATED              → CommonJobStatus.PENDING
  TransportOrderStatus.QUOTE_REQUESTED      → CommonJobStatus.PENDING
  TransportOrderStatus.PRICED               → CommonJobStatus.PENDING
  TransportOrderStatus.QUOTES_RECEIVED      → CommonJobStatus.PENDING
  TransportOrderStatus.NEGOTIATING          → CommonJobStatus.PENDING
  TransportOrderStatus.TRANSPORTER_SELECTED → CommonJobStatus.ASSIGNED
  TransportOrderStatus.DRIVER_ASSIGNED      → CommonJobStatus.ASSIGNED
  TransportOrderStatus.DRIVER_EN_ROUTE      → CommonJobStatus.DRIVER_ARRIVING
  TransportOrderStatus.ARRIVED_PICKUP       → CommonJobStatus.DRIVER_ARRIVED
  TransportOrderStatus.LOADING_STARTED      → CommonJobStatus.ACTIVE
  TransportOrderStatus.LOADED               → CommonJobStatus.ACTIVE
  TransportOrderStatus.IN_TRANSIT           → CommonJobStatus.ACTIVE
  TransportOrderStatus.NEAR_DESTINATION     → CommonJobStatus.NEAR_COMPLETION
  TransportOrderStatus.ARRIVED_DESTINATION  → CommonJobStatus.NEAR_COMPLETION
  TransportOrderStatus.UNLOADING_STARTED    → CommonJobStatus.ACTIVE
  TransportOrderStatus.POD_VERIFICATION     → CommonJobStatus.VERIFICATION
  TransportOrderStatus.DELIVERED            → CommonJobStatus.COMPLETED
  TransportOrderStatus.CANCELLED            → CommonJobStatus.CANCELLED
  TransportOrderStatus.FAILED               → CommonJobStatus.FAILED
  TransportOrderStatus.RETURN_REQUIRED      → CommonJobStatus.RETURN_REQUIRED
  TransportOrderStatus.RETURNED             → CommonJobStatus.COMPLETED
  TransportOrderStatus.EXPIRED              → CommonJobStatus.FAILED
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

import structlog
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    TransportOrder, TransportOrderStatus, Driver, User,
)
from common.services.common_job_contract import (
    ServiceAdapter, CommonJobResponse, CommonJobStatus, CommonJobType,
    CommonJobCommand, CommandResult, JobListItem,
    LocationPoint, FareSnapshot, CustomerInfo,
)

logger = structlog.get_logger(__name__)

# ─── Status Mapping ────────────────────────────────────────────────────────────

_TRANSPORT_STATUS_MAP: Dict[str, CommonJobStatus] = {
    TransportOrderStatus.CREATED:              CommonJobStatus.PENDING,
    TransportOrderStatus.QUOTE_REQUESTED:      CommonJobStatus.PENDING,
    TransportOrderStatus.PRICED:               CommonJobStatus.PENDING,
    TransportOrderStatus.QUOTES_RECEIVED:      CommonJobStatus.PENDING,
    TransportOrderStatus.NEGOTIATING:          CommonJobStatus.PENDING,
    TransportOrderStatus.TRANSPORTER_SELECTED: CommonJobStatus.ASSIGNED,
    TransportOrderStatus.DRIVER_ASSIGNED:      CommonJobStatus.ASSIGNED,
    TransportOrderStatus.DRIVER_EN_ROUTE:      CommonJobStatus.DRIVER_ARRIVING,
    TransportOrderStatus.ARRIVED_PICKUP:       CommonJobStatus.DRIVER_ARRIVED,
    TransportOrderStatus.LOADING_STARTED:      CommonJobStatus.ACTIVE,
    TransportOrderStatus.LOADED:               CommonJobStatus.ACTIVE,
    TransportOrderStatus.IN_TRANSIT:           CommonJobStatus.ACTIVE,
    TransportOrderStatus.NEAR_DESTINATION:     CommonJobStatus.NEAR_COMPLETION,
    TransportOrderStatus.ARRIVED_DESTINATION:  CommonJobStatus.NEAR_COMPLETION,
    TransportOrderStatus.UNLOADING_STARTED:    CommonJobStatus.ACTIVE,
    TransportOrderStatus.POD_VERIFICATION:     CommonJobStatus.VERIFICATION,
    TransportOrderStatus.DELIVERED:            CommonJobStatus.COMPLETED,
    TransportOrderStatus.CANCELLED:            CommonJobStatus.CANCELLED,
    TransportOrderStatus.FAILED:               CommonJobStatus.FAILED,
    TransportOrderStatus.RETURN_REQUIRED:      CommonJobStatus.RETURN_REQUIRED,
    TransportOrderStatus.RETURNED:             CommonJobStatus.COMPLETED,
    TransportOrderStatus.EXPIRED:              CommonJobStatus.FAILED,
}

_TRANSPORT_ACTIVE_STATUSES = [
    TransportOrderStatus.DRIVER_ASSIGNED,
    TransportOrderStatus.DRIVER_EN_ROUTE,
    TransportOrderStatus.ARRIVED_PICKUP,
    TransportOrderStatus.LOADING_STARTED,
    TransportOrderStatus.LOADED,
    TransportOrderStatus.IN_TRANSIT,
    TransportOrderStatus.NEAR_DESTINATION,
    TransportOrderStatus.ARRIVED_DESTINATION,
    TransportOrderStatus.UNLOADING_STARTED,
    TransportOrderStatus.POD_VERIFICATION,
    TransportOrderStatus.RETURN_REQUIRED,
]

_SUPPORTED_COMMANDS = {
    CommonJobCommand.ACCEPT,
    CommonJobCommand.REJECT,
    CommonJobCommand.ARRIVE_PICKUP,
    CommonJobCommand.START_LOADING,
    CommonJobCommand.FINISH_LOADING,
    CommonJobCommand.START,
    CommonJobCommand.ARRIVE_DROPOFF,
    CommonJobCommand.START_UNLOADING,
    CommonJobCommand.CONFIRM_DELIVERY,
    CommonJobCommand.COMPLETE,
    CommonJobCommand.CANCEL,
}


def _mask_phone(phone: str) -> str:
    if not phone or len(phone) < 6:
        return phone or ""
    return phone[:6] + "••••" + phone[-4:]


class TransportServiceAdapter(ServiceAdapter):
    """
    Adapts TransportOrder domain entities to the Common Job Contract.
    """

    def get_job_type(self) -> CommonJobType:
        return CommonJobType.TRANSPORT

    async def get_active_job(self, driver_id: str, db: AsyncSession) -> Optional[CommonJobResponse]:
        """Find the driver's currently active freight transport job."""
        try:
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return None

        result = await db.execute(
            select(TransportOrder).where(
                and_(
                    TransportOrder.assigned_driver_id == driver_uuid,
                    TransportOrder.status.in_(_TRANSPORT_ACTIVE_STATUSES),
                )
            ).order_by(desc(TransportOrder.updated_at)).limit(1)
        )
        order = result.scalar_one_or_none()
        if not order:
            return None

        return await self._map_to_common_job(order, db)

    async def get_job_by_id(self, job_id: str, driver_id: str, db: AsyncSession) -> Optional[CommonJobResponse]:
        """Get a specific transport order by ID with authorization check."""
        try:
            order_uuid = uuid.UUID(job_id)
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return None

        result = await db.execute(
            select(TransportOrder).where(
                and_(
                    TransportOrder.id == order_uuid,
                    TransportOrder.assigned_driver_id == driver_uuid,
                )
            )
        )
        order = result.scalar_one_or_none()
        if not order:
            return None

        return await self._map_to_common_job(order, db)

    async def process_command(
        self, job_id: str, command: CommonJobCommand,
        driver_id: str, db: AsyncSession, params: Optional[Dict[str, Any]] = None
    ) -> CommandResult:
        if command not in _SUPPORTED_COMMANDS:
            return CommandResult(
                success=False,
                message=f"Command '{command.value}' not supported for TRANSPORT jobs."
            )

        try:
            order_uuid = uuid.UUID(job_id)
            driver_uuid = uuid.UUID(driver_id)
        except ValueError:
            return CommandResult(success=False, message="Invalid job or driver ID.")

        result = await db.execute(
            select(TransportOrder).where(
                and_(
                    TransportOrder.id == order_uuid,
                    TransportOrder.assigned_driver_id == driver_uuid,
                )
            )
        )
        order = result.scalar_one_or_none()
        if not order:
            return CommandResult(success=False, message="Transport order not found or not assigned to you.")

        params = params or {}

        if command == CommonJobCommand.ARRIVE_PICKUP:
            order.status = TransportOrderStatus.ARRIVED_PICKUP
            order.arrived_pickup_at = datetime.utcnow()
            order.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Arrived at loading location.",
                updated_status=CommonJobStatus.DRIVER_ARRIVED.value,
            )
        elif command == CommonJobCommand.START_LOADING:
            order.status = TransportOrderStatus.LOADING_STARTED
            order.loading_started_at = datetime.utcnow()
            order.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Loading goods started.",
                updated_status=CommonJobStatus.ACTIVE.value,
            )
        elif command == CommonJobCommand.FINISH_LOADING or command == CommonJobCommand.START:
            order.status = TransportOrderStatus.IN_TRANSIT
            order.in_transit_at = datetime.utcnow()
            order.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Goods loaded. In transit to destination.",
                updated_status=CommonJobStatus.ACTIVE.value,
            )
        elif command == CommonJobCommand.ARRIVE_DROPOFF:
            order.status = TransportOrderStatus.ARRIVED_DESTINATION
            order.arrived_destination_at = datetime.utcnow()
            order.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Arrived at destination for unloading.",
                updated_status=CommonJobStatus.NEAR_COMPLETION.value,
            )
        elif command == CommonJobCommand.CONFIRM_DELIVERY or command == CommonJobCommand.COMPLETE:
            otp = params.get("otp", "")
            if order.delivery_otp and otp != order.delivery_otp:
                return CommandResult(success=False, message="Invalid delivery verification OTP.")
            order.status = TransportOrderStatus.DELIVERED
            order.delivered_at = datetime.utcnow()
            order.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Freight delivered successfully.",
                updated_status=CommonJobStatus.COMPLETED.value,
            )
        elif command == CommonJobCommand.CANCEL:
            if order.status in (TransportOrderStatus.DELIVERED, TransportOrderStatus.CANCELLED):
                return CommandResult(success=False, message="Transport order already finalized.")
            order.status = TransportOrderStatus.CANCELLED
            order.cancelled_at = datetime.utcnow()
            order.cancellation_reason = params.get("reason", "Cancelled by driver")
            order.updated_at = datetime.utcnow()
            await db.commit()
            return CommandResult(
                success=True,
                message="Transport order cancelled.",
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
            select(TransportOrder).where(
                and_(
                    TransportOrder.assigned_driver_id == driver_uuid,
                    TransportOrder.status.in_([
                        TransportOrderStatus.DELIVERED,
                        TransportOrderStatus.RETURNED,
                        TransportOrderStatus.CANCELLED,
                        TransportOrderStatus.FAILED,
                    ])
                )
            ).order_by(desc(TransportOrder.updated_at)).limit(limit).offset(offset)
        )
        orders = result.scalars().all()

        return [
            JobListItem(
                job_type=CommonJobType.TRANSPORT.value,
                job_id=str(o.id),
                domain_id=str(o.id),
                status=_TRANSPORT_STATUS_MAP.get(o.status, CommonJobStatus.FAILED).value,
                pickup_address=o.pickup_address or "",
                dropoff_address=o.drop_address or "",
                fare_amount=float(o.total_fare or 0),
                currency="INR",
                created_at=o.created_at.isoformat() if o.created_at else None,
            )
            for o in orders
        ]

    # ─── Internal Mapping ─────────────────────────────────────────────────────

    async def _map_to_common_job(self, order: TransportOrder, db: AsyncSession) -> CommonJobResponse:
        common_status = _TRANSPORT_STATUS_MAP.get(order.status, CommonJobStatus.PENDING)

        service_specific: Dict[str, Any] = {
            "order_reference": order.order_reference,
            "vehicle_category_required": order.vehicle_category_required,
            "helpers_count": order.helpers_count,
            "loading_required": order.loading_required,
            "unloading_required": order.unloading_required,
            "distance_km": float(order.distance_km or 0),
            "drop_contact_name": order.drop_contact_name,
            "drop_contact_phone_masked": _mask_phone(order.drop_contact_phone),
            "delivery_otp": order.delivery_otp,
        }

        total_fare = float(order.total_fare or 0)
        driver_earning = float(order.driver_earning or total_fare * 0.85)

        return CommonJobResponse(
            job_type=CommonJobType.TRANSPORT.value,
            job_id=str(order.id),
            domain_id=str(order.id),
            status=common_status.value,
            pickup=LocationPoint(
                latitude=float(order.pickup_lat or 0),
                longitude=float(order.pickup_lng or 0),
                address=order.pickup_address or "",
            ),
            dropoff=LocationPoint(
                latitude=float(order.drop_lat or 0),
                longitude=float(order.drop_lng or 0),
                address=order.drop_address or "",
            ),
            fare_snapshot=FareSnapshot(
                total_fare=total_fare,
                driver_earning=driver_earning,
                currency="INR",
                payment_method=order.payment_method or "WALLET",
            ),
            customer=CustomerInfo(
                name=order.pickup_contact_name or "Sender",
                phone_masked=_mask_phone(order.pickup_contact_phone or ""),
                special_notes=order.special_instructions or order.pickup_notes or "",
            ),
            start_otp=None,
            created_at=order.created_at.isoformat() if order.created_at else None,
            updated_at=order.updated_at.isoformat() if order.updated_at else None,
            service_specific=service_specific,
        )
