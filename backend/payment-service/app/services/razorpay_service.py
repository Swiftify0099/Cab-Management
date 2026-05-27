"""
Razorpay Payment Gateway — Phase 6.

Handles:
  - Create payment order (returns order_id for frontend SDK)
  - Verify payment signature (HMAC-SHA256)
  - Webhook processing (payment.captured, payment.failed, refund.created)
  - Settlement: booking payment → driver wallet (90%) + platform (10%)
"""
from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

import razorpay
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Booking, BookingStatus, Driver, LedgerEntry,
    Payment, PaymentStatus, Transaction, TransactionType,
    Wallet, WalletTransaction,
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
        Amount in rupees → converted to paise for Razorpay.
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

        # Persist the pending payment record
        payment = Payment(
            booking_id=UUID(booking_id),
            customer_id=UUID(customer_id),
            razorpay_order_id=order_data["id"],
            amount=amount_rupees,
            currency="INR",
            status=PaymentStatus.PENDING,
        )
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)

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
            "payment_id": str(payment.id),
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
            select(Payment).where(Payment.razorpay_order_id == razorpay_order_id)
        )
        payment = result.scalar_one_or_none()
        if not payment:
            raise ValueError(f"Payment not found for order {razorpay_order_id}")

        # Update payment
        payment.razorpay_payment_id = razorpay_payment_id
        payment.razorpay_signature = razorpay_signature
        payment.status = PaymentStatus.CAPTURED
        payment.captured_at = datetime.utcnow()
        await self.db.commit()

        # Update booking status
        booking_result = await self.db.execute(
            select(Booking).where(Booking.id == payment.booking_id)
        )
        booking = booking_result.scalar_one_or_none()
        if booking:
            booking.status = BookingStatus.PAID
            await self.db.commit()

            # Credit driver wallet (90%)
            await self._credit_driver(booking, payment)

            # Award reward points to customer
            await self._award_reward_points(str(payment.customer_id), payment.amount)

            # Notify customer
            await publish_event(
                f"customer:{payment.customer_id}:events",
                {
                    "event": "PAYMENT_CAPTURED",
                    "booking_id": str(payment.booking_id),
                    "amount": str(payment.amount),
                    "points_earned": int(float(payment.amount) * payment_settings.REWARD_POINTS_PER_RUPEE),
                },
            )

        logger.info(
            "Payment captured",
            payment_id=razorpay_payment_id,
            booking_id=str(payment.booking_id),
            amount=str(payment.amount),
        )

        return {
            "payment_id": str(payment.id),
            "razorpay_payment_id": razorpay_payment_id,
            "status": "captured",
            "amount": str(payment.amount),
            "booking_id": str(payment.booking_id),
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
                select(Payment).where(Payment.razorpay_order_id == order_id)
            )
            payment = result.scalar_one_or_none()
            if payment:
                payment.status = PaymentStatus.FAILED
                await self.db.commit()
            logger.warning("Webhook: payment failed", order_id=order_id)

        elif event == "refund.created":
            refund_id = entity.get("id")
            payment_id = entity.get("payment_id")
            logger.info("Webhook: refund created", payment_id=payment_id, refund_id=refund_id)

        return True

    async def _credit_driver(self, booking: Booking, payment: Payment) -> None:
        """Credit 90% of booking fare to driver's wallet."""
        if not booking.driver_id:
            return

        driver_earning = Decimal(str(payment.amount)) * Decimal("0.90")
        platform_fee = Decimal(str(payment.amount)) - driver_earning

        # Find or create driver wallet
        result = await self.db.execute(
            select(Wallet).where(Wallet.driver_id == booking.driver_id)
        )
        wallet = result.scalar_one_or_none()

        if wallet:
            wallet.balance += driver_earning
            wallet.pending_settlement += driver_earning
        else:
            wallet = Wallet(
                driver_id=booking.driver_id,
                balance=driver_earning,
                pending_settlement=driver_earning,
            )
            self.db.add(wallet)

        await self.db.commit()

        # Notify driver
        await publish_event(
            f"driver:{booking.driver_id}:events",
            {
                "event": "EARNING_CREDITED",
                "booking_id": str(booking.id),
                "amount": str(driver_earning),
                "platform_fee": str(platform_fee),
            },
        )
        logger.info(
            "Driver earning credited",
            driver_id=str(booking.driver_id),
            amount=str(driver_earning),
        )

    async def _award_reward_points(self, customer_id: str, amount: Decimal) -> None:
        """Award reward points to customer (1 point per ₹1 spent)."""
        points = int(float(amount) * payment_settings.REWARD_POINTS_PER_RUPEE)
        from common.models.all_models import Customer
        result = await self.db.execute(
            select(Customer).where(Customer.id == UUID(customer_id))
        )
        customer = result.scalar_one_or_none()
        if customer and hasattr(customer, "reward_points"):
            customer.reward_points = (customer.reward_points or 0) + points
            await self.db.commit()
