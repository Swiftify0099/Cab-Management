"""
Seat Booking Service  Customer books seats on a driver's Trip.
Aligned with the Booking model which links to trip_id + customer_profile.id.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Booking, BookingStatus, Trip, TripStatus, CustomerProfile
)
from app.services.fare_engine import calculate_fare


class BookingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_customer_profile(self, user_id: str) -> Optional[CustomerProfile]:
        result = await self.db.execute(
            select(CustomerProfile).where(CustomerProfile.user_id == uuid.UUID(user_id))
        )
        return result.scalar_one_or_none()

    async def create_booking(
        self,
        customer_user_id: str,
        trip_id: str,
        seat_count: int = 1,
        window_seat: bool = False,
        window_seat_count: int = 0,
        has_parcel: bool = False,
        pickup_address: Optional[str] = None,
        drop_address: Optional[str] = None,
    ) -> dict:
        """Customer books seats on a published trip."""
        # Resolve customer profile
        customer = await self._get_customer_profile(customer_user_id)
        if not customer:
            raise ValueError("Customer profile not found")

        # Get and validate the trip
        trip_res = await self.db.execute(
            select(Trip).where(
                and_(Trip.id == trip_id, Trip.status == TripStatus.PUBLISHED)
            )
        )
        trip = trip_res.scalar_one_or_none()
        if not trip:
            raise ValueError("Trip not found or not available for booking")
        if trip.available_seats < seat_count:
            raise ValueError(f"Only {trip.available_seats} seats available")

        # Calculate fare
        base_fare = float(trip.base_fare) * seat_count
        window_charge = float(trip.window_seat_charge) * window_seat_count if window_seat else 0.0
        platform_fee = 10.0 * seat_count
        parcel_charge = 50.0 if has_parcel else 0.0
        total_fare = base_fare + window_charge + platform_fee + parcel_charge

        booking = Booking(
            id=str(uuid.uuid4()),
            trip_id=trip.id,
            customer_id=customer.id,
            seat_count=seat_count,
            window_seat=window_seat,
            window_seat_count=window_seat_count,
            has_parcel=has_parcel,
            base_fare=base_fare,
            window_seat_charge=window_charge,
            platform_fee=platform_fee,
            total_fare=total_fare,
            pickup_address=pickup_address,
            drop_address=drop_address,
            status=BookingStatus.PENDING,
        )
        self.db.add(booking)

        # Decrement available seats
        trip.available_seats -= seat_count
        if trip.available_seats <= 0:
            trip.status = TripStatus.FULL

        await self.db.commit()
        await self.db.refresh(booking)
        return self._serialize(booking)

    async def get_customer_trips(
        self,
        customer_user_id: str,
        status_filter: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict]:
        customer = await self._get_customer_profile(customer_user_id)
        if not customer:
            return []

        filters = [Booking.customer_id == customer.id]
        if status_filter:
            try:
                filters.append(Booking.status == BookingStatus(status_filter))
            except ValueError:
                pass

        result = await self.db.execute(
            select(Booking)
            .where(and_(*filters))
            .order_by(desc(Booking.created_at))
            .limit(limit)
            .offset(offset)
        )
        return [self._serialize(b) for b in result.scalars().all()]

    async def get_booking(self, booking_id: str, customer_user_id: str) -> Optional[dict]:
        customer = await self._get_customer_profile(customer_user_id)
        if not customer:
            return None
        result = await self.db.execute(
            select(Booking).where(
                and_(Booking.id == booking_id, Booking.customer_id == customer.id)
            )
        )
        booking = result.scalar_one_or_none()
        return self._serialize(booking) if booking else None

    async def cancel_booking(
        self, booking_id: str, customer_user_id: str, reason: str
    ) -> bool:
        customer = await self._get_customer_profile(customer_user_id)
        if not customer:
            return False
        result = await self.db.execute(
            select(Booking).where(
                and_(Booking.id == booking_id, Booking.customer_id == customer.id)
            )
        )
        booking = result.scalar_one_or_none()
        if not booking:
            return False

        cancellable = {BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.PAYMENT_PENDING}
        if booking.status not in cancellable:
            return False

        booking.status = BookingStatus.CANCELLED
        booking.cancellation_reason = reason
        booking.cancelled_at = datetime.utcnow()

        # Restore seats to the trip
        trip_res = await self.db.execute(select(Trip).where(Trip.id == booking.trip_id))
        trip = trip_res.scalar_one_or_none()
        if trip and trip.status in {TripStatus.PUBLISHED, TripStatus.FULL}:
            trip.available_seats += booking.seat_count
            if trip.status == TripStatus.FULL:
                trip.status = TripStatus.PUBLISHED

        await self.db.commit()
        return True

    @staticmethod
    def _serialize(booking: Booking) -> dict:
        return {
            "id": str(booking.id),
            "trip_id": str(booking.trip_id),
            "seat_count": booking.seat_count,
            "window_seat": booking.window_seat,
            "has_parcel": booking.has_parcel,
            "base_fare": float(booking.base_fare),
            "platform_fee": float(booking.platform_fee),
            "total_fare": float(booking.total_fare),
            "status": booking.status.value if booking.status else None,
            "pickup_address": booking.pickup_address,
            "drop_address": booking.drop_address,
            "cancellation_reason": booking.cancellation_reason,
            "cancelled_at": booking.cancelled_at.isoformat() if booking.cancelled_at else None,
            "created_at": booking.created_at.isoformat() if booking.created_at else None,
        }
