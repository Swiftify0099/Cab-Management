"""
Admin Service  Phase 9.
Aggregates data from all services for dashboard, fleet, KYC, support.
Exposes /api/v1/admin/* endpoints.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import structlog
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Customer, Driver, Trip, TripStatus, Booking, BookingStatus,
    Parcel, ParcelStatus, Payment, PaymentStatus,
    KYCDocument, KYCStatus, Complaint, ComplaintStatus,
    DriverLocation,
)

logger = structlog.get_logger(__name__)


class AdminDashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_stats(self) -> dict:
        """Returns aggregate KPIs for the admin dashboard."""
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Customer count
        cust_count = await self._count(Customer)
        # Driver count
        driver_count = await self._count(Driver)
        # Active trips
        active_trips = await self._count(Trip, Trip.status == TripStatus.IN_PROGRESS)
        # Today's bookings
        today_bookings = await self._count(
            Booking,
            and_(Booking.created_at >= today_start, Booking.status != BookingStatus.CANCELLED)
        )
        # Monthly revenue
        monthly_revenue = await self._sum(
            Payment, Payment.amount,
            and_(Payment.status == PaymentStatus.CAPTURED, Payment.created_at >= this_month)
        )
        # Total completed trips
        completed_trips = await self._count(Trip, Trip.status == TripStatus.COMPLETED)
        # Pending KYC
        pending_kyc = await self._count(KYCDocument, KYCDocument.status == KYCStatus.PENDING)
        # Open complaints
        open_complaints = await self._count(Complaint, Complaint.status == ComplaintStatus.OPEN)

        return {
            "customers": cust_count,
            "drivers": driver_count,
            "active_trips": active_trips,
            "today_bookings": today_bookings,
            "monthly_revenue": float(monthly_revenue or 0),
            "completed_trips": completed_trips,
            "pending_kyc": pending_kyc,
            "open_complaints": open_complaints,
        }

    async def get_revenue_chart(self, days: int = 30) -> list[dict]:
        """Daily revenue for the past N days."""
        from sqlalchemy import cast, Date
        result = await self.db.execute(
            select(
                cast(Payment.created_at, Date).label("date"),
                func.sum(Payment.amount).label("revenue"),
                func.count(Payment.id).label("transactions"),
            )
            .where(
                and_(
                    Payment.status == PaymentStatus.CAPTURED,
                    Payment.created_at >= datetime.utcnow() - timedelta(days=days),
                )
            )
            .group_by(cast(Payment.created_at, Date))
            .order_by(cast(Payment.created_at, Date))
        )
        return [
            {"date": str(row.date), "revenue": float(row.revenue or 0), "transactions": row.transactions}
            for row in result.all()
        ]

    async def get_online_drivers(self) -> list[dict]:
        """Returns all drivers currently online with their last GPS location."""
        result = await self.db.execute(
            select(Driver, DriverLocation)
            .outerjoin(DriverLocation, DriverLocation.driver_id == Driver.id)
            .where(Driver.is_online == True)
            .order_by(DriverLocation.updated_at.desc())
        )
        rows = result.all()
        return [
            {
                "driver_id": str(row.Driver.id),
                "full_name": row.Driver.full_name,
                "latitude": row.DriverLocation.latitude if row.DriverLocation else None,
                "longitude": row.DriverLocation.longitude if row.DriverLocation else None,
                "speed_kmh": row.DriverLocation.speed_kmh if row.DriverLocation else 0,
                "heading": row.DriverLocation.heading if row.DriverLocation else 0,
                "status": "on_trip" if row.Driver.current_trip_id else "online",
                "vehicle_type": row.Driver.vehicle_type,
                "current_trip_id": str(row.Driver.current_trip_id) if row.Driver.current_trip_id else None,
                "last_seen": row.DriverLocation.updated_at.isoformat() if row.DriverLocation else None,
            }
            for row in rows
        ]

    async def get_kyc_queue(self, page: int = 1, page_size: int = 20) -> list[dict]:
        """Pending KYC documents for review."""
        result = await self.db.execute(
            select(KYCDocument, Driver)
            .join(Driver, Driver.id == KYCDocument.driver_id)
            .where(KYCDocument.status == KYCStatus.PENDING)
            .order_by(KYCDocument.created_at.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return [
            {
                "id": str(row.KYCDocument.id),
                "driver_id": str(row.KYCDocument.driver_id),
                "driver_name": row.Driver.full_name,
                "document_type": row.KYCDocument.document_type,
                "file_url": row.KYCDocument.file_url,
                "submitted_at": row.KYCDocument.created_at.isoformat(),
            }
            for row in result.all()
        ]

    async def approve_kyc(self, doc_id: str, approved: bool, admin_notes: str = "") -> dict:
        """Approve or reject a KYC document."""
        result = await self.db.execute(
            select(KYCDocument).where(KYCDocument.id == UUID(doc_id))
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise ValueError("Document not found")

        doc.status = KYCStatus.APPROVED if approved else KYCStatus.REJECTED
        doc.admin_notes = admin_notes
        doc.reviewed_at = datetime.utcnow()
        await self.db.commit()

        return {"id": doc_id, "status": doc.status.value, "action": "approved" if approved else "rejected"}

    async def get_complaints(self, status: Optional[str] = None, page: int = 1) -> list[dict]:
        """Get support complaints with optional status filter."""
        query = select(Complaint).order_by(desc(Complaint.created_at)).offset((page - 1) * 20).limit(20)
        if status:
            query = query.where(Complaint.status == ComplaintStatus(status))
        result = await self.db.execute(query)
        complaints = result.scalars().all()
        return [
            {
                "id": str(c.id),
                "customer_id": str(c.customer_id),
                "booking_id": str(c.booking_id) if c.booking_id else None,
                "subject": c.subject,
                "description": c.description,
                "status": c.status.value,
                "created_at": c.created_at.isoformat(),
            }
            for c in complaints
        ]

    async def _count(self, model, *conditions) -> int:
        q = select(func.count(model.id))
        if conditions:
            q = q.where(*conditions)
        result = await self.db.execute(q)
        return result.scalar_one() or 0

    async def _sum(self, model, column, *conditions) -> float:
        q = select(func.sum(column))
        if conditions:
            q = q.where(*conditions)
        result = await self.db.execute(q)
        return result.scalar_one() or 0
