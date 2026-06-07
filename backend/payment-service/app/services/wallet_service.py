"""
Wallet Service  Phase 6.
Manages customer wallet: top-up via Razorpay, deduction, transaction history.
Also handles reward points redemption and referral bonuses.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

import structlog
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    CustomerProfile, WalletTransaction,
    LedgerType, Coupon
)
from app.core.config import payment_settings
from app.services.razorpay_service import RazorpayService

logger = structlog.get_logger(__name__)


class WalletService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_wallet(self, customer_id: str) -> dict:
        """Get customer wallet; create with 0 if first time."""
        result = await self.db.execute(
            select(CustomerProfile).where(CustomerProfile.user_id == UUID(customer_id))
        )
        customer = result.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer not found")

        return {
            "balance": float(customer.wallet_balance or 0),
            "reward_points": customer.reward_points or 0,
            "reward_value": round((customer.reward_points or 0) * payment_settings.REWARD_RUPEE_VALUE, 2),
        }

    async def top_up_wallet(
        self, customer_id: str, amount_rupees: Decimal
    ) -> dict:
        """
        Initiate wallet top-up via Razorpay.
        Returns order details for frontend SDK.
        """
        if amount_rupees < payment_settings.WALLET_MIN_RECHARGE:
            raise ValueError(f"Minimum recharge amount is {payment_settings.WALLET_MIN_RECHARGE}")

        # Check wallet won't exceed max
        wallet = await self.get_or_create_wallet(customer_id)
        if wallet["balance"] + float(amount_rupees) > payment_settings.WALLET_MAX_BALANCE:
            raise ValueError(f"Wallet balance cannot exceed {payment_settings.WALLET_MAX_BALANCE}")

        # Create Razorpay order for wallet top-up
        rp = RazorpayService(self.db)
        order = await rp.create_order(
            booking_id=f"wallet_{customer_id}_{uuid.uuid4().hex[:8]}",
            amount_rupees=amount_rupees,
            customer_id=customer_id,
            notes={"type": "wallet_topup"},
        )
        return order

    async def credit_wallet(
        self,
        customer_id: str,
        amount: Decimal,
        description: str,
        reference_id: Optional[str] = None,
        tx_type: str = "credit",
    ) -> dict:
        """Directly credit wallet (after successful Razorpay payment for top-up)."""
        result = await self.db.execute(
            select(CustomerProfile).where(CustomerProfile.user_id == UUID(customer_id))
        )
        customer = result.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer not found")

        old_balance = customer.wallet_balance or Decimal("0")
        new_balance = old_balance + amount
        customer.wallet_balance = new_balance

        # Record transaction
        tx = WalletTransaction(
            user_id=UUID(customer_id),
            amount=amount,
            transaction_type=LedgerType.WALLET_CREDIT,
            description=description,
            ref_id=UUID(reference_id) if reference_id and len(reference_id) == 36 else None,
            balance_after=new_balance,
        )
        self.db.add(tx)
        await self.db.commit()

        logger.info("Wallet credited", customer_id=customer_id, amount=str(amount), balance=str(new_balance))
        return {"balance": float(new_balance), "credited": float(amount)}

    async def deduct_wallet(
        self, customer_id: str, amount: Decimal, description: str, reference_id: Optional[str] = None
    ) -> dict:
        """Deduct amount from wallet for booking payment."""
        result = await self.db.execute(
            select(CustomerProfile).where(CustomerProfile.user_id == UUID(customer_id))
        )
        customer = result.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer not found")

        balance = customer.wallet_balance or Decimal("0")
        if balance < amount:
            raise ValueError(f"Insufficient wallet balance. Available: {balance}")

        new_balance = balance - amount
        customer.wallet_balance = new_balance

        tx = WalletTransaction(
            user_id=UUID(customer_id),
            amount=amount,
            transaction_type=LedgerType.WALLET_DEBIT,
            description=description,
            ref_id=UUID(reference_id) if reference_id and len(reference_id) == 36 else None,
            balance_after=new_balance,
        )
        self.db.add(tx)
        await self.db.commit()

        return {"balance": float(new_balance), "deducted": float(amount)}

    async def redeem_points(self, customer_id: str, points: int) -> dict:
        """
        Convert reward points to wallet balance.
        Min 10 points = 1.
        """
        if points < 10:
            raise ValueError("Minimum 10 points required for redemption")

        result = await self.db.execute(
            select(CustomerProfile).where(CustomerProfile.user_id == UUID(customer_id))
        )
        customer = result.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer not found")

        if (customer.reward_points or 0) < points:
            raise ValueError(f"Insufficient points. You have {customer.reward_points or 0} points.")

        rupee_value = Decimal(str(round(points * payment_settings.REWARD_RUPEE_VALUE, 2)))
        customer.reward_points = (customer.reward_points or 0) - points
        await self.db.commit()

        # Credit wallet
        result_credit = await self.credit_wallet(
            customer_id=customer_id,
            amount=rupee_value,
            description=f"Reward points redemption ({points} pts)",
        )

        logger.info("Points redeemed", customer_id=customer_id, points=points, rupees=str(rupee_value))
        return {"points_used": points, "rupees_credited": float(rupee_value), **result_credit}

    async def get_transaction_history(
        self, customer_id: str, page: int = 1, page_size: int = 20
    ) -> dict:
        """Get paginated wallet transaction history."""
        offset = (page - 1) * page_size
        result = await self.db.execute(
            select(WalletTransaction)
            .where(WalletTransaction.user_id == UUID(customer_id))
            .order_by(desc(WalletTransaction.created_at))
            .offset(offset)
            .limit(page_size)
        )
        txs = result.scalars().all()

        return {
            "page": page,
            "transactions": [
                {
                    "id": str(tx.id),
                    "type": tx.transaction_type.value,
                    "amount": float(tx.amount),
                    "description": tx.description,
                    "balance_after": float(tx.balance_after),
                    "created_at": tx.created_at.isoformat(),
                }
                for tx in txs
            ],
        }

    async def validate_coupon(
        self, code: str, customer_id: str, booking_amount: Decimal
    ) -> dict:
        """Validate a coupon code and return discount amount."""
        result = await self.db.execute(
            select(Coupon).where(
                and_(
                    Coupon.code == code.upper(),
                    Coupon.is_active == True,
                )
            )
        )
        coupon = result.scalar_one_or_none()

        if not coupon:
            raise ValueError("Invalid or expired coupon code")

        if coupon.valid_until and coupon.valid_until < datetime.utcnow():
            raise ValueError("Coupon has expired")
            
        if coupon.valid_from and coupon.valid_from > datetime.utcnow():
            raise ValueError("Coupon is not active yet")

        if coupon.min_fare and booking_amount < coupon.min_fare:
            raise ValueError(f"Minimum booking amount {coupon.min_fare} required")

        if coupon.uses_count >= (coupon.max_uses or 999999):
            raise ValueError("Coupon usage limit reached")

        # Calculate discount
        if coupon.discount_type.value == "percentage":
            discount = min(
                booking_amount * Decimal(str(coupon.discount_value)) / 100,
                Decimal(str(coupon.max_discount_amount or 9999)),
            )
        else:
            discount = min(Decimal(str(coupon.discount_value)), booking_amount)

        return {
            "coupon_id": str(coupon.id),
            "code": coupon.code,
            "discount_amount": float(discount),
            "discount_type": coupon.discount_type.value,
            "final_amount": float(booking_amount - discount),
        }
