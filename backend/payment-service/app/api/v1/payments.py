"""
Payment API  Phase 6.
Routes: payments, wallet, coupons, referrals, rewards.
"""
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser
from common.schemas.base import SuccessResponse
from app.core.config import payment_settings
from app.services.razorpay_service import RazorpayService
from app.services.wallet_service import WalletService

router = APIRouter()


#  Schemas 

class CreateOrderRequest(BaseModel):
    booking_id: str
    amount: float = Field(..., gt=0, description="Amount in rupees")


class CapturePaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class WalletTopUpRequest(BaseModel):
    amount: float = Field(..., ge=50, le=50000, description="Amount in rupees")


class RedeemPointsRequest(BaseModel):
    points: int = Field(..., ge=10)


class ValidateCouponRequest(BaseModel):
    code: str
    booking_amount: float


class VerifyTopUpRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    amount: float


#  Payment Routes 

@router.post(
    "/payments/create-order",
    response_model=SuccessResponse,
    summary="Create Razorpay payment order for a booking",
)
async def create_payment_order(
    request: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = RazorpayService(db)
    order = await service.create_order(
        booking_id=request.booking_id,
        amount_rupees=Decimal(str(request.amount)),
        customer_id=current_user.user_id_str,
    )
    return SuccessResponse(success=True, message="Order created", data=order)


@router.post(
    "/payments/capture",
    response_model=SuccessResponse,
    summary="Verify and capture a completed Razorpay payment",
)
async def capture_payment(
    request: CapturePaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = RazorpayService(db)
    try:
        result = await service.capture_payment(
            razorpay_order_id=request.razorpay_order_id,
            razorpay_payment_id=request.razorpay_payment_id,
            razorpay_signature=request.razorpay_signature,
        )
        return SuccessResponse(success=True, message="Payment captured", data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/payments/webhook",
    summary="Razorpay webhook endpoint (no auth required)",
    include_in_schema=False,  # Don't expose in docs
)
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_razorpay_signature: str = Header(..., alias="X-Razorpay-Signature"),
):
    payload = await request.json()
    service = RazorpayService(db)
    success = await service.process_webhook(payload, x_razorpay_signature)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
    return {"status": "ok"}


#  Wallet Routes 

@router.get(
    "/wallet",
    response_model=SuccessResponse,
    summary="Get customer wallet balance and reward points",
)
async def get_wallet(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    try:
        wallet = await service.get_or_create_wallet(current_user.user_id_str)
        return SuccessResponse(success=True, message="OK", data=wallet)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post(
    "/wallet/topup",
    response_model=SuccessResponse,
    summary="Initiate wallet top-up via Razorpay",
)
async def wallet_top_up(
    request: WalletTopUpRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    try:
        order = await service.top_up_wallet(
            customer_id=current_user.user_id_str,
            amount_rupees=Decimal(str(request.amount)),
        )
        return SuccessResponse(success=True, message="Top-up order created", data=order)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/wallet/topup/verify",
    response_model=SuccessResponse,
    summary="Verify wallet top-up payment and credit balance",
)
async def verify_wallet_top_up(
    request: VerifyTopUpRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """After Razorpay SDK success callback, verify and credit wallet."""
    rp_service = RazorpayService(db)
    if not rp_service.verify_signature(
        request.razorpay_order_id,
        request.razorpay_payment_id,
        request.razorpay_signature,
    ):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    wallet_service = WalletService(db)
    result = await wallet_service.credit_wallet(
        customer_id=current_user.user_id_str,
        amount=Decimal(str(request.amount)),
        description="Wallet top-up via Razorpay",
        reference_id=request.razorpay_payment_id,
    )
    return SuccessResponse(success=True, message="Wallet credited", data=result)


@router.get(
    "/wallet/transactions",
    response_model=SuccessResponse,
    summary="Wallet transaction history",
)
async def wallet_transactions(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    result = await service.get_transaction_history(
        current_user.user_id_str, page=page, page_size=min(page_size, 50)
    )
    return SuccessResponse(success=True, message="OK", data=result)


@router.post(
    "/wallet/redeem-points",
    response_model=SuccessResponse,
    summary="Redeem reward points to wallet balance",
)
async def redeem_reward_points(
    request: RedeemPointsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    try:
        result = await service.redeem_points(current_user.user_id_str, request.points)
        return SuccessResponse(success=True, message="Points redeemed", data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


#  Coupon Routes 

@router.post(
    "/coupons/validate",
    response_model=SuccessResponse,
    summary="Validate a coupon code for a booking",
)
async def validate_coupon(
    request: ValidateCouponRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    try:
        result = await service.validate_coupon(
            code=request.code,
            customer_id=current_user.user_id_str,
            booking_amount=Decimal(str(request.booking_amount)),
        )
        return SuccessResponse(success=True, message="Coupon valid", data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


#  Referral Routes 

@router.post(
    "/referrals/apply",
    response_model=SuccessResponse,
    summary="Apply referral code and credit both users",
)
async def apply_referral(
    referral_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Validates referral code, credits 100 to both the referrer and referee.
    """
    from common.models.all_models import Customer
    from sqlalchemy import select as sa_select

    # Find referrer
    result = await db.execute(
        sa_select(Customer).where(Customer.referral_code == referral_code.upper())
    )
    referrer = result.scalar_one_or_none()
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    if str(referrer.id) == current_user.user_id_str:
        raise HTTPException(status_code=400, detail="Cannot use your own referral code")

    bonus = Decimal(str(payment_settings.REFERRAL_BONUS_RUPEES))
    wallet = WalletService(db)

    # Credit referrer
    await wallet.credit_wallet(
        customer_id=str(referrer.id),
        amount=bonus,
        description=f"Referral bonus  friend joined",
        reference_id=current_user.user_id_str,
    )
    # Credit new user
    await wallet.credit_wallet(
        customer_id=current_user.user_id_str,
        amount=bonus,
        description=f"Welcome bonus  referral applied",
        reference_id=str(referrer.id),
    )

    return SuccessResponse(
        success=True,
        message=f"Referral applied! {bonus} credited to your wallet.",
        data={"bonus_amount": float(bonus)},
    )
