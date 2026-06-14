"""
Razorpay Payment Gateway  Phase 6.

Handles:
  - Create payment order (returns order_id for frontend SDK)
  - Verify payment signature (HMAC-SHA256)
  - Webhook processing (payment.captured, payment.failed, refund.created)
  - Settlement: booking payment  driver wallet (90%) + platform (10%)
"""
from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

import razorpay
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Booking, BookingStatus, Driver,
    PaymentStatus, Transaction, PaymentMethod, LedgerType,
    CustomerProfile
)
from common.utils.redis_client import publish_event
from app.core.config import payment_settings

logger = structlog.get_logger(__name__)


def get_razorpay_client() -> razorpay.Client:
    return razorpay.Client(
        auth=(payment_settings.RAZORPAY_KEY_ID, payment_settings.RAZORPAY_KEY_SECRET)
    )


class RazorpayService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.rp = get_razorpay_client()

    async def create_order(
        self,
        booking_id: str,
        amount_rupees: Decimal,
        customer_id: str,
        notes: Optional[dict] = None,
    ) -> dict:
        """
        Create a Razorpay order. Returns order data for frontend SDK.
        Amount in rupees  converted to paise for Razorpay.
        """
        amount_paise = int(amount_rupees * 100)

        order_data = self.rp.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"booking_{booking_id[:12]}",
            "notes": {
                "booking_id": booking_id,
                "customer_id": customer_id,
                **(notes or {}),
            },
        })

        # Safely parse booking_id (to allow frontend mock IDs like 'req_zbw36oe')
        parsed_booking_id = None
        if booking_id and not booking_id.startswith("wallet_"):
            try:
                parsed_booking_id = UUID(booking_id)
            except ValueError:
                pass  # Keep as None for mocked/dummy IDs

        # Persist the pending transaction record
        tx = Transaction(
            booking_id=parsed_booking_id,
            user_id=UUID(customer_id),
            gateway_order_id=order_data["id"],
            amount=amount_rupees,
            currency="INR",
            status=PaymentStatus.PENDING,
            payment_method=PaymentMethod.RAZORPAY,
            ledger_type=LedgerType.BOOKING if not booking_id.startswith("wallet_") else LedgerType.WALLET_CREDIT,
            tx_metadata=notes or {}
        )
        self.db.add(tx)
        await self.db.commit()
        await self.db.refresh(tx)

        logger.info(
            "Razorpay order created",
            order_id=order_data["id"],
            booking_id=booking_id,
            amount=str(amount_rupees),
        )

        return {
            "order_id": order_data["id"],
            "amount_paise": amount_paise,
            "currency": "INR",
            "key_id": payment_settings.RAZORPAY_KEY_ID,
            "payment_id": str(tx.id),
            "booking_id": booking_id,
        }

    def verify_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """
        Verify Razorpay payment signature using HMAC-SHA256.
        Returns True if signature is valid.
        """
        message = f"{razorpay_order_id}|{razorpay_payment_id}"
        expected = hmac.new(
            payment_settings.RAZORPAY_KEY_SECRET.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, razorpay_signature)

    async def capture_payment(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> dict:
        """
        After frontend SDK completes payment:
        1. Verify signature
        2. Update payment record to CAPTURED
        3. Update booking to PAID
        4. Credit driver wallet (90%)
        5. Award reward points to customer
        6. Notify all parties via pub/sub
        """
        # Verify signature
        if not self.verify_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
            raise ValueError("Invalid payment signature")

        # Load payment record
        result = await self.db.execute(
            select(Transaction).where(Transaction.gateway_order_id == razorpay_order_id)
        )
        tx = result.scalar_one_or_none()
        if not tx:
            raise ValueError(f"Transaction not found for order {razorpay_order_id}")

        tx.gateway_ref = razorpay_payment_id
        tx.tx_metadata["signature"] = razorpay_signature
        tx.status = PaymentStatus.CAPTURED
        await self.db.commit()

        # Deduct wallet and points if specified in metadata
        wallet_amount = Decimal(str(tx.tx_metadata.get("wallet_amount", "0.0") or "0.0"))
        points_used = int(float(tx.tx_metadata.get("points_used", "0") or "0"))

        if wallet_amount > 0 or points_used > 0:
            from app.services.wallet_service import WalletService
            wallet_service = WalletService(self.db)
            
            if points_used > 0:
                await wallet_service.redeem_points(
                    customer_id=str(tx.user_id),
                    points=points_used
                )
                await wallet_service.deduct_wallet(
                    customer_id=str(tx.user_id),
                    amount=Decimal(str(round(points_used * payment_settings.REWARD_RUPEE_VALUE, 2))),
                    description=f"Points redeemed for booking {tx.booking_id}",
                    reference_id=str(tx.booking_id) if tx.booking_id else None
                )

            if wallet_amount > 0:
                await wallet_service.deduct_wallet(
                    customer_id=str(tx.user_id),
                    amount=wallet_amount,
                    description=f"Payment for booking {tx.booking_id}",
                    reference_id=str(tx.booking_id) if tx.booking_id else None
                )

        if tx.booking_id:
            # Update booking status
            booking_result = await self.db.execute(
                select(Booking).where(Booking.id == tx.booking_id)
            )
            booking = booking_result.scalar_one_or_none()
            if booking:
                booking.status = BookingStatus.PAID
                await self.db.commit()

                # Credit driver wallet (90%)
                await self._credit_driver(booking, tx)

                # Award reward points to customer
                await self._award_reward_points(str(tx.user_id), tx.amount)

                # Notify customer
                await publish_event(
                    f"customer:{tx.user_id}:events",
                    {
                        "event": "PAYMENT_CAPTURED",
                        "booking_id": str(tx.booking_id),
                        "amount": str(tx.amount),
                        "points_earned": int(float(tx.amount) * payment_settings.REWARD_POINTS_PER_RUPEE),
                    },
                )

                # ── Re-notify driver after payment so siren fires ──────────────
                # The initial INCOMING_TRIP_REQUEST was sent at booking creation (PENDING).
                # After customer pays, we must re-emit so driver app gets the paid alert.
                await self._notify_driver_payment_confirmed(booking)

        logger.info(
            "Payment captured",
            payment_id=razorpay_payment_id,
            booking_id=str(tx.booking_id),
            amount=str(tx.amount),
        )

        return {
            "payment_id": str(tx.id),
            "razorpay_payment_id": razorpay_payment_id,
            "status": "captured",
            "amount": str(tx.amount),
            "booking_id": str(tx.booking_id),
        }

    async def process_webhook(self, payload: dict, signature: str) -> bool:
        """
        Process Razorpay webhook events.
        Validates webhook signature before processing.
        """
        # Validate webhook signature
        payload_str = json.dumps(payload, separators=(",", ":"))
        expected = hmac.new(
            payment_settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            payload_str.encode(),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            logger.warning("Invalid webhook signature")
            return False

        event = payload.get("event")
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})

        if event == "payment.captured":
            order_id = entity.get("order_id")
            payment_id = entity.get("id")
            logger.info("Webhook: payment captured", order_id=order_id, payment_id=payment_id)

        elif event == "payment.failed":
            order_id = entity.get("order_id")
            result = await self.db.execute(
                select(Transaction).where(Transaction.gateway_order_id == order_id)
            )
            tx = result.scalar_one_or_none()
            if tx:
                tx.status = PaymentStatus.FAILED
                await self.db.commit()
            logger.warning("Webhook: payment failed", order_id=order_id)

        elif event == "refund.created":
            refund_id = entity.get("id")
            payment_id = entity.get("payment_id")
            logger.info("Webhook: refund created", payment_id=payment_id, refund_id=refund_id)

        return True

    async def _credit_driver(self, booking: Booking, tx: Transaction) -> None:
        """Credit 90% of booking fare to driver's wallet."""
        from common.models.all_models import Trip
        
        # We need the driver_id which is in the Trip
        trip_result = await self.db.execute(
            select(Trip).where(Trip.id == booking.trip_id)
        )
        trip = trip_result.scalar_one_or_none()
        if not trip or not trip.driver_id:
            return

        driver_earning = Decimal(str(tx.amount)) * Decimal("0.90")
        platform_fee = Decimal(str(tx.amount)) - driver_earning

        # Find driver — trip.driver_id is FK to drivers.id (not user_id)
        result = await self.db.execute(
            select(Driver).where(Driver.id == trip.driver_id)
        )
        driver = result.scalar_one_or_none()

        if driver:
            driver.wallet_balance = (driver.wallet_balance or Decimal("0")) + driver_earning
            # Add transaction record
            from common.models.all_models import WalletTransaction
            wtx = WalletTransaction(
                user_id=driver.user_id,
                amount=driver_earning,
                transaction_type=LedgerType.WALLET_CREDIT,
                balance_after=driver.wallet_balance,
                ref_id=tx.id,
                description=f"Earning from booking {booking.id}"
            )
            self.db.add(wtx)
            await self.db.commit()

            # Notify driver
            await publish_event(
                f"driver:{driver.user_id}:events",
                {
                    "event": "EARNING_CREDITED",
                    "booking_id": str(booking.id),
                    "amount": str(driver_earning),
                    "platform_fee": str(platform_fee),
                },
            )
            logger.info(
                "Driver earning credited",
                driver_id=str(driver.user_id),
                amount=str(driver_earning),
            )

    async def _award_reward_points(self, customer_id: str, amount: Decimal) -> None:
        """Award reward points to customer (1 point per 1 spent)."""
        points = int(float(amount) * payment_settings.REWARD_POINTS_PER_RUPEE)
        result = await self.db.execute(
            select(CustomerProfile).where(CustomerProfile.user_id == UUID(customer_id))
        )
        customer = result.scalar_one_or_none()
        if customer:
            customer.reward_points = (customer.reward_points or 0) + points
            await self.db.commit()

    async def _notify_driver_payment_confirmed(self, booking: Booking) -> None:
        """
        Re-emit INCOMING_TRIP_REQUEST and NEW_PENDING_CUSTOMER to driver after payment.
        This fires the siren / vibration again so the driver is alerted that a customer
        has *paid* and is confirmed — not just pending.
        """
        from common.models.all_models import Trip, Driver
        from datetime import datetime

        try:
            # Load trip
            trip_result = await self.db.execute(
                select(Trip).where(Trip.id == booking.trip_id)
            )
            trip = trip_result.scalar_one_or_none()
            if not trip or not trip.driver_id:
                return

            # Load driver
            driver_result = await self.db.execute(
                select(Driver).where(Driver.id == trip.driver_id)
            )
            driver = driver_result.scalar_one_or_none()
            if not driver:
                return

            driver_user_id = str(driver.user_id)
            booking_id = str(booking.id)

            # Re-send INCOMING_TRIP_REQUEST (with PAID flag so driver knows it is confirmed)
            await publish_event(
                f"driver:{driver_user_id}:events",
                {
                    "event": "INCOMING_TRIP_REQUEST",
                    "booking_id": booking_id,
                    "pickup_address": booking.pickup_address or "Pickup point",
                    "destination_address": booking.drop_address or "Destination",
                    "pickup_lat": trip.pickup_latitude,
                    "pickup_lng": trip.pickup_longitude,
                    "seats": booking.seat_count,
                    "parcel": booking.has_parcel,
                    "fare": float(booking.total_fare),
                    "paid": True,  # marks this as a confirmed paid request
                    "timeout_sec": 40,
                    "timestamp": datetime.utcnow().isoformat(),
                },
            )

            # Also push to driver_scan radar room (so dot appears on radar)
            await publish_event(
                f"driver_scan:{str(trip.id)}",
                {
                    "event": "NEW_PENDING_CUSTOMER",
                    "booking_id": booking_id,
                    "customer_name": "Paid Customer",
                    "pickup_address": booking.pickup_address or "Pickup",
                    "pickup_lat": trip.pickup_latitude,
                    "pickup_lng": trip.pickup_longitude,
                    "destination_address": booking.drop_address or "Drop",
                    "destination_lat": trip.destination_latitude,
                    "destination_lng": trip.destination_longitude,
                    "seats_required": booking.seat_count,
                    "parcel": booking.has_parcel,
                    "from_time": datetime.utcnow().isoformat(),
                    "to_time": datetime.utcnow().isoformat(),
                    "women_only": False,
                    "pickup_distance_km": 0,
                    "destination_distance_km": 0,
                    "paid": True,
                },
            )

            logger.info(
                "Driver re-notified after payment",
                booking_id=booking_id,
                driver_user_id=driver_user_id,
            )
        except Exception as e:
            logger.warning("Failed to re-notify driver after payment", exc_info=e)

