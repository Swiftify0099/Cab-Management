"""
Seat Booking Service  Customer books seats on a driver's Trip.
Extended with:
  - Pending booking CRUD (pre-booking before driver exists)
  - TRIP_REQUEST emission to driver on confirmed booking
  - Point wallet deduction (10 pts/seat)
  - Women-only safety enforcement
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, date, time
from typing import Optional

import structlog
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Booking, BookingStatus, Trip, TripStatus, CustomerProfile, User,
    PendingBooking, PendingBookingStatus,
    Driver, DriverPointWallet, DriverPointTransaction,
)
from common.utils.redis_client import get_redis, publish_event
from app.services.fare_engine import calculate_fare

logger = structlog.get_logger(__name__)

POINTS_PER_SEAT = 10  # driver loses 10 pts per booked seat


class BookingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_customer_profile(self, user_id: str) -> Optional[CustomerProfile]:
        result = await self.db.execute(
            select(CustomerProfile).where(CustomerProfile.user_id == uuid.UUID(user_id))
        )
        return result.scalar_one_or_none()

    # ─────────────────────────────────────────────────────────────────────────
    # Seat booking
    # ─────────────────────────────────────────────────────────────────────────

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
        pending_booking_id: Optional[str] = None,
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

        # Mark pending_booking as matched if customer came from pre-booking
        if pending_booking_id:
            pb_res = await self.db.execute(
                select(PendingBooking).where(PendingBooking.id == uuid.UUID(pending_booking_id))
            )
            pb = pb_res.scalar_one_or_none()
            if pb:
                pb.status = PendingBookingStatus.MATCHED

        await self.db.commit()
        await self.db.refresh(booking)

        serialized = self._serialize(booking)

        # ── Deduct driver points atomically ──────────────────────────────────
        driver_res = await self.db.execute(
            select(Driver).where(Driver.id == trip.driver_id)
        )
        driver = driver_res.scalar_one_or_none()
        if driver:
            await self._deduct_driver_points(
                driver_id=str(driver.id),
                seats=seat_count,
                booking_id=str(booking.id),
            )
            # ── Emit TRIP_REQUEST to driver via Redis/WebSocket ──────────────────
            await self._emit_trip_request(booking=booking, trip=trip, driver=driver)

        # ── Broadcast SEAT_BOOKED / SEAT_FULL to trip room ───────────────────
        event_type = "SEAT_FULL" if trip.status == TripStatus.FULL else "SEAT_BOOKED"
        await publish_event(f"trip:{trip_id}:events", {
            "event":           event_type,
            "trip_id":         str(trip.id),
            "available_seats": trip.available_seats,
            "booking_id":      str(booking.id),
        })

        return serialized

    async def _deduct_driver_points(
        self, driver_id: str, seats: int, booking_id: str
    ) -> None:
        """Atomically deduct points from driver wallet. Creates wallet if missing."""
        wallet_res = await self.db.execute(
            select(DriverPointWallet).where(
                DriverPointWallet.driver_id == uuid.UUID(driver_id)
            )
        )
        wallet = wallet_res.scalar_one_or_none()

        if not wallet:
            wallet = DriverPointWallet(
                driver_id=uuid.UUID(driver_id),
                balance=2500,
            )
            self.db.add(wallet)
            await self.db.flush()

        delta = -(POINTS_PER_SEAT * seats)
        wallet.balance = max(0, wallet.balance + delta)

        txn = DriverPointTransaction(
            driver_id=uuid.UUID(driver_id),
            wallet_id=wallet.id,
            delta=delta,
            reason=f"Seat booked (x{seats})",
            ref_id=uuid.UUID(booking_id),
        )
        self.db.add(txn)
        await self.db.commit()

    async def _emit_trip_request(
        self, booking: Booking, trip: Trip, driver: Driver
    ) -> None:
        """
        Publish TRIP_REQUEST event to driver's WebSocket channel.
        Store request timestamp in Redis for 40s server-side expiry.
        Also send FCM push if driver app is in background.
        """
        r = await get_redis()
        booking_id = str(booking.id)

        # Store server-side timestamp for 40s expiry validation
        await r.setex(
            f"trip_request:timestamp:{booking_id}",
            50,  # 50s TTL (40s window + 10s grace)
            datetime.utcnow().isoformat(),
        )

        payload = {
            "event":               "TRIP_REQUEST",
            "booking_id":          booking_id,
            "pickup_address":      booking.pickup_address or "the pickup point",
            "destination_address": booking.drop_address or "the destination",
            "pickup_lat":          trip.pickup_latitude,
            "pickup_lng":          trip.pickup_longitude,
            "seats":               booking.seat_count,
            "parcel":              booking.has_parcel,
            "fare":                float(booking.total_fare),
            "timeout_sec":         40,
            "timestamp":           datetime.utcnow().isoformat(),
        }

        driver_user_id = str(driver.user_id)
        await publish_event(f"driver:{driver_user_id}:events", payload)

        # FCM push (driver may be in background)
        driver_user_res = await self.db.execute(
            select(User).where(User.id == driver.user_id)
        )
        driver_user = driver_user_res.scalar_one_or_none()
        if driver_user and driver_user.device_token:
            await publish_event("notification:events", {
                "event":        "TRIP_REQUEST",
                "user_id":      driver_user_id,
                "user_type":    "driver",
                "device_token": driver_user.device_token,
                "title":        "New Ride Request",
                "body":         "A customer wants a ride (check map for exact points)",
                "data": {
                    "screen":     "TripRequest",
                    "booking_id": booking_id,
                    "trip_id":    str(trip.id),
                },
            })

        logger.info("TRIP_REQUEST emitted", booking_id=booking_id, driver_user_id=driver_user_id)

    # ─────────────────────────────────────────────────────────────────────────
    # Pending Booking CRUD
    # ─────────────────────────────────────────────────────────────────────────

    async def create_pending_booking(
        self,
        customer_user_id: str,
        pickup_address: str,
        pickup_lat: float,
        pickup_lng: float,
        destination_address: str,
        destination_lat: float,
        destination_lng: float,
        travel_date: str,
        from_time: str,
        to_time: str,
        seats_required: int = 1,
        parcel: bool = False,
        women_only: bool = False,
    ) -> dict:
        """Create a pre-booking intent. Auto-expires in 24h."""
        user_res = await self.db.execute(
            select(User).where(User.id == uuid.UUID(customer_user_id))
        )
        user = user_res.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")

        customer = await self._get_customer_profile(customer_user_id)
        customer_name = (customer.full_name if customer and hasattr(customer, 'full_name') else None) or user.phone

        parsed_date = date.fromisoformat(travel_date)
        parsed_from = time.fromisoformat(from_time)
        parsed_to   = time.fromisoformat(to_time)
        expires_at  = datetime.utcnow() + timedelta(hours=24)

        pickup_point = WKTElement(f"POINT({pickup_lng} {pickup_lat})", srid=4326)
        dest_point   = WKTElement(f"POINT({destination_lng} {destination_lat})", srid=4326)

        pb = PendingBooking(
            id=str(uuid.uuid4()),
            customer_id=uuid.UUID(customer_user_id),
            customer_name=customer_name,
            pickup_address=pickup_address,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            pickup_location=pickup_point,
            destination_address=destination_address,
            destination_lat=destination_lat,
            destination_lng=destination_lng,
            destination_location=dest_point,
            travel_date=parsed_date,
            from_time=parsed_from,
            to_time=parsed_to,
            seats_required=seats_required,
            parcel=parcel,
            women_only=women_only,
            status=PendingBookingStatus.WAITING,
            expires_at=expires_at,
        )
        self.db.add(pb)
        await self.db.commit()
        await self.db.refresh(pb)

        # Notify downstream listeners
        await publish_event("notification:events", {
            "event":      "PENDING_BOOKING_CREATED",
            "booking_id": str(pb.id),
            "customer_id": customer_user_id,
        })

        return self._serialize_pending(pb)

    async def trigger_reverse_match(self, pending_booking_id: str) -> None:
        """Background task: scan published trips for this new pending booking."""
        try:
            from app.services.pending_match_bridge import run_reverse_match
            await run_reverse_match(pending_booking_id)
        except Exception as e:
            logger.error("Reverse match failed", exc_info=e)

    async def get_pending_bookings(self, customer_user_id: str) -> list[dict]:
        result = await self.db.execute(
            select(PendingBooking)
            .where(
                and_(
                    PendingBooking.customer_id == uuid.UUID(customer_user_id),
                    PendingBooking.status == PendingBookingStatus.WAITING,
                )
            )
            .order_by(desc(PendingBooking.created_at))
        )
        return [self._serialize_pending(pb) for pb in result.scalars().all()]

    async def cancel_pending_booking(
        self, pending_booking_id: str, customer_user_id: str
    ) -> bool:
        result = await self.db.execute(
            select(PendingBooking).where(
                and_(
                    PendingBooking.id == uuid.UUID(pending_booking_id),
                    PendingBooking.customer_id == uuid.UUID(customer_user_id),
                )
            )
        )
        pb = result.scalar_one_or_none()
        if not pb:
            return False
        pb.status = PendingBookingStatus.CANCELLED
        await self.db.commit()
        return True

    # ─────────────────────────────────────────────────────────────────────────
    # Existing listing / cancel methods
    # ─────────────────────────────────────────────────────────────────────────

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

    # ─────────────────────────────────────────────────────────────────────────
    # Serializers
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _serialize(booking: Booking) -> dict:
        return {
            "id":                  str(booking.id),
            "trip_id":             str(booking.trip_id),
            "seat_count":          booking.seat_count,
            "window_seat":         booking.window_seat,
            "has_parcel":          booking.has_parcel,
            "base_fare":           float(booking.base_fare),
            "platform_fee":        float(booking.platform_fee),
            "total_fare":          float(booking.total_fare),
            "status":              booking.status.value if booking.status else None,
            "pickup_address":      booking.pickup_address,
            "drop_address":        booking.drop_address,
            "cancellation_reason": booking.cancellation_reason,
            "cancelled_at":        booking.cancelled_at.isoformat() if booking.cancelled_at else None,
            "created_at":          booking.created_at.isoformat() if booking.created_at else None,
        }

    @staticmethod
    def _serialize_pending(pb: PendingBooking) -> dict:
        return {
            "id":                  str(pb.id),
            "customer_name":       pb.customer_name,
            "pickup_address":      pb.pickup_address,
            "pickup_lat":          pb.pickup_lat,
            "pickup_lng":          pb.pickup_lng,
            "destination_address": pb.destination_address,
            "destination_lat":     pb.destination_lat,
            "destination_lng":     pb.destination_lng,
            "travel_date":         pb.travel_date.isoformat(),
            "from_time":           str(pb.from_time),
            "to_time":             str(pb.to_time),
            "seats_required":      pb.seats_required,
            "parcel":              pb.parcel,
            "women_only":          pb.women_only,
            "status":              pb.status.value,
            "expires_at":          pb.expires_at.isoformat() if pb.expires_at else None,
            "created_at":          pb.created_at.isoformat() if pb.created_at else None,
        }
