"""
Unified Promotion & Campaign Engine — Feature 13.
Centralized server-authoritative service for:
- Coupons & Promo Codes
- Auto-Applied Offers (First Ride, Festival, Time/Area Discounts)
- Cashback Campaigns with double-entry post-trip ledger credit
- Concurrency & 1-redemption-per-ride enforcement
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID

import structlog
from fastapi import HTTPException
from sqlalchemy import select, and_, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    PromotionCampaign, PromotionRedemption,
    RideRequest, RideRequestStatus, Booking,
    CustomerProfile, WalletTransaction, LedgerType, User
)

logger = structlog.get_logger(__name__)


class PromotionService:
    def __init__(self, db: AsyncSession, wallet_service: Optional[Any] = None):
        self.db = db
        self.wallet_service = wallet_service

    async def check_first_ride_eligibility(self, customer_id: str) -> bool:
        """
        Authoritatively checks if customer has 0 completed rides in canonical ride history.
        """
        c_uuid = UUID(customer_id)
        result = await self.db.execute(
            select(func.count(RideRequest.id)).where(
                and_(
                    RideRequest.customer_id == c_uuid,
                    RideRequest.status == RideRequestStatus.COMPLETED,
                )
            )
        )
        count = result.scalar() or 0
        return count == 0

    async def get_available_promotions(
        self,
        customer_id: str,
        service_type: str = "ALL",
        pickup_lat: Optional[float] = None,
        pickup_lng: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieves all active promotions for which the customer is currently eligible.
        """
        now = datetime.now(timezone.utc)
        c_uuid = UUID(customer_id)

        # 1. Fetch active campaigns within time range and usage limits
        query = select(PromotionCampaign).where(
            and_(
                PromotionCampaign.is_active == True,
                (PromotionCampaign.valid_from == None) | (PromotionCampaign.valid_from <= now),
                (PromotionCampaign.expires_at == None) | (PromotionCampaign.expires_at >= now),
                PromotionCampaign.uses_count < PromotionCampaign.max_uses,
            )
        ).order_by(desc(PromotionCampaign.priority), desc(PromotionCampaign.created_at))

        res = await self.db.execute(query)
        campaigns = res.scalars().all()

        is_first_ride = await self.check_first_ride_eligibility(customer_id)

        eligible = []
        for camp in campaigns:
            # Service type filter
            if camp.service_type != "ALL" and service_type != "ALL":
                if camp.service_type.upper() != service_type.upper():
                    continue

            # First ride eligibility
            if camp.campaign_type == "FIRST_RIDE" and not is_first_ride:
                continue

            # Per-customer redemption limit check
            redemptions_res = await self.db.execute(
                select(func.count(PromotionRedemption.id)).where(
                    and_(
                        PromotionRedemption.campaign_id == camp.id,
                        PromotionRedemption.customer_id == c_uuid,
                        PromotionRedemption.status == "COMMITTED",
                    )
                )
            )
            customer_uses = redemptions_res.scalar() or 0
            if customer_uses >= camp.per_customer_limit:
                continue

            # Time window check (if specified in server local time)
            if camp.time_window_start and camp.time_window_end:
                current_time_str = now.strftime("%H:%M")
                if not (camp.time_window_start <= current_time_str <= camp.time_window_end):
                    continue

            eligible.append({
                "campaign_id": str(camp.id),
                "code": camp.code,
                "title": camp.title,
                "description": camp.description,
                "campaign_type": camp.campaign_type,
                "discount_type": camp.discount_type,
                "discount_value": float(camp.discount_value),
                "max_discount_amount": float(camp.max_discount_amount) if camp.max_discount_amount else None,
                "min_fare": float(camp.min_fare),
                "cashback_amount": float(camp.cashback_amount),
                "service_type": camp.service_type,
                "banner_gradient": camp.banner_gradient or ["#4F46E5", "#10B981"],
                "expires_at": camp.expires_at.isoformat() if camp.expires_at else None,
                "is_auto_offer": camp.campaign_type in ["AUTO_OFFER", "FIRST_RIDE", "FESTIVAL_CAMPAIGN"],
                "terms": camp.terms_and_conditions or "Standard promotional terms and conditions apply.",
            })

        return eligible

    async def validate_and_apply_promotion(
        self,
        customer_id: str,
        booking_amount: Decimal,
        code: Optional[str] = None,
        campaign_id: Optional[str] = None,
        service_type: str = "CAB",
        ride_id: Optional[str] = None,
        pickup_lat: Optional[float] = None,
        pickup_lng: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Authoritatively validates and calculates discount/cashback for a booking or ride.
        """
        if booking_amount <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Invalid booking amount")

        c_uuid = UUID(customer_id)
        now = datetime.now(timezone.utc)

        # 1. Locate Campaign by code or campaign_id
        if code:
            q = select(PromotionCampaign).where(
                and_(
                    PromotionCampaign.code == code.upper(),
                    PromotionCampaign.is_active == True,
                )
            )
        elif campaign_id:
            q = select(PromotionCampaign).where(
                and_(
                    PromotionCampaign.id == UUID(campaign_id),
                    PromotionCampaign.is_active == True,
                )
            )
        else:
            # Find best auto-applied offer
            available = await self.get_available_promotions(customer_id, service_type, pickup_lat, pickup_lng)
            auto_offers = [a for a in available if a["is_auto_offer"] and booking_amount >= Decimal(str(a["min_fare"]))]
            if auto_offers:
                best = auto_offers[0]
                return await self.validate_and_apply_promotion(
                    customer_id=customer_id,
                    booking_amount=booking_amount,
                    campaign_id=best["campaign_id"],
                    service_type=service_type,
                    ride_id=ride_id,
                )
            return {
                "is_applied": False,
                "discount_amount": 0.0,
                "cashback_amount": 0.0,
                "final_payable": float(booking_amount),
                "message": "No active promotion applied.",
            }

        res = await self.db.execute(q)
        campaign = res.scalar_one_or_none()
        if not campaign:
            raise HTTPException(status_code=404, detail="Invalid or inactive promotion code.")

        # 2. Date and Expiry checks
        if campaign.valid_from and campaign.valid_from > now:
            raise HTTPException(status_code=400, detail="This promotion is not active yet.")
        if campaign.expires_at and campaign.expires_at < now:
            raise HTTPException(status_code=400, detail="This promotion has expired.")

        # 3. Min Fare check
        if booking_amount < campaign.min_fare:
            raise HTTPException(
                status_code=400,
                detail=f"Minimum fare of ₹{campaign.min_fare} required to use this promotion."
            )

        # 4. Total Usage Cap check
        if campaign.uses_count >= campaign.max_uses:
            raise HTTPException(status_code=400, detail="Promotion total usage limit reached.")

        # 5. First Ride check
        if campaign.campaign_type == "FIRST_RIDE":
            is_first = await self.check_first_ride_eligibility(customer_id)
            if not is_first:
                raise HTTPException(status_code=400, detail="First ride promotion is only valid on your 1st trip.")

        # 6. Per-Customer Usage Cap
        redemptions_res = await self.db.execute(
            select(func.count(PromotionRedemption.id)).where(
                and_(
                    PromotionRedemption.campaign_id == campaign.id,
                    PromotionRedemption.customer_id == c_uuid,
                    PromotionRedemption.status == "COMMITTED",
                )
            )
        )
        user_uses = redemptions_res.scalar() or 0
        if user_uses >= campaign.per_customer_limit:
            raise HTTPException(status_code=400, detail="You have already redeemed this promotion maximum times.")

        # 7. Calculate Discount & Cashback
        discount = Decimal("0.00")
        cashback = Decimal("0.00")

        if campaign.discount_type == "PERCENTAGE":
            raw_discount = booking_amount * (campaign.discount_value / Decimal("100"))
            if campaign.max_discount_amount:
                discount = min(raw_discount, campaign.max_discount_amount)
            else:
                discount = raw_discount
        elif campaign.discount_type == "FLAT":
            discount = min(campaign.discount_value, booking_amount)
        elif campaign.discount_type == "CASHBACK":
            cashback = campaign.cashback_amount or campaign.discount_value

        discount = round(discount, 2)
        cashback = round(cashback, 2)
        final_payable = max(booking_amount - discount, Decimal("0.00"))

        return {
            "is_applied": True,
            "campaign_id": str(campaign.id),
            "code": campaign.code,
            "title": campaign.title,
            "campaign_type": campaign.campaign_type,
            "discount_type": campaign.discount_type,
            "discount_amount": float(discount),
            "cashback_amount": float(cashback),
            "original_fare": float(booking_amount),
            "final_payable": float(final_payable),
            "message": f"🎉 Promotion '{campaign.title}' applied! Saved ₹{discount}.",
        }

    async def commit_promotion_redemption(
        self,
        customer_id: str,
        campaign_id: str,
        ride_id: Optional[str] = None,
        booking_id: Optional[str] = None,
        discount_applied: Decimal = Decimal("0.00"),
        cashback_earned: Decimal = Decimal("0.00"),
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Records the immutable promotion redemption on trip confirmation / completion.
        """
        c_uuid = UUID(customer_id)
        camp_uuid = UUID(campaign_id)
        r_uuid = UUID(ride_id) if ride_id else None
        b_uuid = UUID(booking_id) if booking_id else None
        idemp = idempotency_key or f"REDEMP-{uuid.uuid4().hex[:12]}"

        # Check existing redemption
        if r_uuid:
            existing = await self.db.execute(
                select(PromotionRedemption).where(
                    and_(
                        PromotionRedemption.campaign_id == camp_uuid,
                        PromotionRedemption.ride_id == r_uuid,
                    )
                )
            )
            if existing.scalar_one_or_none():
                return {"success": True, "already_redeemed": True}

        # Increment campaign uses
        await self.db.execute(
            update(PromotionCampaign)
            .where(PromotionCampaign.id == camp_uuid)
            .values(uses_count=PromotionCampaign.uses_count + 1)
        )

        redemption = PromotionRedemption(
            id=uuid.uuid4(),
            campaign_id=camp_uuid,
            customer_id=c_uuid,
            ride_id=r_uuid,
            booking_id=b_uuid,
            discount_applied=discount_applied,
            cashback_earned=cashback_earned,
            idempotency_key=idemp,
            status="COMMITTED",
        )
        self.db.add(redemption)
        await self.db.commit()

        logger.info(
            "Promotion redemption committed",
            campaign_id=campaign_id,
            customer_id=customer_id,
            ride_id=ride_id,
            discount=str(discount_applied),
            cashback=str(cashback_earned),
        )
        return {"success": True, "redemption_id": str(redemption.id)}

    async def process_cashback_on_completion(
        self,
        ride_id: str,
        customer_id: str,
        fare_paid: Decimal,
    ) -> Optional[Dict[str, Any]]:
        """
        Called upon Ride Completion: Checks for pending cashback on this ride and credits customer wallet.
        """
        r_uuid = UUID(ride_id)
        c_uuid = UUID(customer_id)

        res = await self.db.execute(
            select(PromotionRedemption, PromotionCampaign)
            .join(PromotionCampaign, PromotionRedemption.campaign_id == PromotionCampaign.id)
            .where(
                and_(
                    PromotionRedemption.ride_id == r_uuid,
                    PromotionRedemption.customer_id == c_uuid,
                    PromotionRedemption.status == "COMMITTED",
                    PromotionRedemption.cashback_earned > Decimal("0.00"),
                )
            )
        )
        row = res.first()
        if not row:
            return None

        redemption, campaign = row
        cashback_amt = redemption.cashback_earned

        ws = self.wallet_service
        if ws is None:
            try:
                from app.services.wallet_service import WalletService
            except Exception:
                try:
                    from .wallet_service import WalletService
                except Exception:
                    import os, importlib.util
                    _fpath = os.path.join(os.path.dirname(__file__), "wallet_service.py")
                    _spec = importlib.util.spec_from_file_location("ws_mod", _fpath)
                    _mod = importlib.util.module_from_spec(_spec)
                    _spec.loader.exec_module(_mod)
                    WalletService = _mod.WalletService
            ws = WalletService(self.db)

        credit_res = await ws.credit_wallet(
            customer_id=customer_id,
            amount=cashback_amt,
            description=f"Cashback for Ride #{ride_id[:8]} ({campaign.title})",
            reference_id=ride_id,
            bucket="PROMO_CREDIT",
            idempotency_key=f"CASHBACK-{str(redemption.id)}",
        )

        logger.info(
            "Cashback credited to customer wallet",
            customer_id=customer_id,
            ride_id=ride_id,
            cashback_amount=str(cashback_amt),
        )

        return {
            "cashback_credited": float(cashback_amt),
            "campaign_title": campaign.title,
            "wallet_balance": credit_res["balance"],
        }
