"""
Payment API — Features 11 & 12.
Routes:
- Payments: create-intent, create-order, capture, wallet-pay, status, webhook, payment-success, checkout.html
- Saved Methods: GET/POST/PATCH/DELETE /payments/methods
- Refunds: /payments/refund
- Multi-Bucket Wallet: /wallet, /wallet/summary, /wallet/topup, /wallet/topup/verify, /wallet/transactions, /wallet/ledger, /wallet/redeem-points
- Promotions & Referrals: /coupons/validate, /referrals/apply
"""
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, Request, status, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser
from common.schemas.base import SuccessResponse
from common.models.all_models import Booking, RideRequest, BookingStatus, RideRequestStatus
from app.core.config import payment_settings
from app.services.razorpay_service import RazorpayService
from app.services.wallet_service import WalletService

router = APIRouter()


# ============================================================
# SCHEMAS
# ============================================================

class CreatePaymentIntentRequest(BaseModel):
    booking_id: Optional[str] = None
    ride_id: Optional[str] = None
    payment_method: str = Field("upi", description="cash, upi, card, wallet")
    saved_method_id: Optional[str] = None
    coupon_code: Optional[str] = None
    use_promo_credits: bool = True
    use_wallet_balance: bool = True
    idempotency_key: Optional[str] = None


class CreateOrderRequest(BaseModel):
    booking_id: Optional[str] = None
    ride_id: Optional[str] = None
    amount: float = Field(..., gt=0, description="Amount in rupees")
    wallet_amount: float = Field(0.0, description="Amount deducted from wallet")
    points_used: int = Field(0, description="Reward points redeemed")


class CapturePaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class AddSavedMethodRequest(BaseModel):
    method_type: str = Field(..., description="UPI or CARD")
    masked_identifier: str = Field(..., description="e.g. p***@okhdfcbank or 4242")
    token_reference: str = Field(..., description="Provider tokenized reference")
    display_title: Optional[str] = None
    card_network: Optional[str] = None
    card_expiry: Optional[str] = None
    is_default: bool = False


class RefundRequest(BaseModel):
    transaction_id: str
    amount: float = Field(..., gt=0, description="Refund amount in rupees")
    reason: str = Field(..., description="Reason for refund")
    destination: str = Field("ORIGINAL_PAYMENT", description="ORIGINAL_PAYMENT, WALLET, CREDITS")
    idempotency_key: Optional[str] = None


class WalletTopUpRequest(BaseModel):
    amount: float = Field(..., ge=50, le=50000, description="Amount in rupees")


class VerifyTopUpRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    amount: float


class RedeemPointsRequest(BaseModel):
    points: int = Field(..., ge=10)


class ValidateCouponRequest(BaseModel):
    code: str
    booking_amount: float


# ============================================================
# UNIFIED PAYMENT INTENT & LIFECYCLE (Feature 11)
# ============================================================

@router.post(
    "/payments/create-intent",
    response_model=SuccessResponse,
    summary="Create authoritative payment intent with itemized discounts and split wallet deduction",
)
async def create_payment_intent(
    request: CreatePaymentIntentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Authoritative server-side payment pipeline:
    1. Look up RideRequest or Booking to get authoritative fare.
    2. Validate and apply coupon discount if provided.
    3. Apply available promotional credits.
    4. Apply available cash wallet balance.
    5. If remaining balance > 0: Generate Razorpay Order.
    6. If remaining == 0 (fully covered by wallet/credits): Atomically commit and mark PAID.
    """
    customer_id = current_user.user_id_str
    wallet_service = WalletService(db)
    rp_service = RazorpayService(db)

    # 1. Fetch authoritative fare
    base_fare = Decimal("0.00")
    identifier_desc = ""

    if request.ride_id:
        ride_res = await db.execute(select(RideRequest).where(RideRequest.id == UUID(request.ride_id)))
        ride = ride_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")
        base_fare = ride.final_fare if ride.final_fare is not None else ride.estimated_fare
        identifier_desc = f"Ride #{request.ride_id[:8]}"
    elif request.booking_id:
        try:
            b_uuid = UUID(request.booking_id)
            book_res = await db.execute(select(Booking).where(Booking.id == b_uuid))
            booking = book_res.scalar_one_or_none()
            if booking:
                base_fare = Decimal(str(booking.total_fare or "0.00"))
                identifier_desc = f"Booking #{request.booking_id[:8]}"
        except (ValueError, AttributeError):
            base_fare = Decimal("450.00")  # Fallback for mocked booking IDs
    else:
        raise HTTPException(status_code=400, detail="Either ride_id or booking_id is required")

    base_fare = max(Decimal(str(base_fare)), Decimal("0.00"))

    # 2. Coupon Discount Calculation
    coupon_discount = Decimal("0.00")
    if request.coupon_code:
        try:
            c_res = await wallet_service.validate_coupon(
                code=request.coupon_code,
                customer_id=customer_id,
                booking_amount=base_fare,
            )
            coupon_discount = Decimal(str(c_res["discount_amount"]))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    fare_after_coupon = max(base_fare - coupon_discount, Decimal("0.00"))

    # 3. Promotional Credits Calculation
    wallet_summary = await wallet_service.get_or_create_wallet(customer_id)
    promo_credits_available = Decimal(str(wallet_summary["promo_credit_balance"]))
    credits_applied = Decimal("0.00")

    if request.use_promo_credits and promo_credits_available > Decimal("0.00") and fare_after_coupon > Decimal("0.00"):
        credits_applied = min(promo_credits_available, fare_after_coupon)

    fare_after_credits = max(fare_after_coupon - credits_applied, Decimal("0.00"))

    # 4. Cash Wallet Split Deduction
    cash_wallet_available = Decimal(str(wallet_summary["cash_balance"]))
    wallet_deducted = Decimal("0.00")

    if request.use_wallet_balance and cash_wallet_available > Decimal("0.00") and fare_after_credits > Decimal("0.00"):
        wallet_deducted = min(cash_wallet_available, fare_after_credits)

    final_gateway_payable = max(fare_after_credits - wallet_deducted, Decimal("0.00"))

    # 5. Handle Cash Payment Selection
    if request.payment_method.lower() == "cash":
        if request.ride_id:
            ride.payment_method = "cash"
            ride.payment_status = "pending"
            await db.commit()

        return SuccessResponse(
            success=True,
            message="Cash payment selected. Pay driver upon arrival.",
            data={
                "payment_mode": "CASH",
                "base_fare": float(base_fare),
                "coupon_discount": float(coupon_discount),
                "credits_applied": float(credits_applied),
                "wallet_deducted": float(wallet_deducted),
                "amount_payable_in_cash": float(final_gateway_payable),
                "status": "PENDING_CASH_COLLECTION",
            }
        )

    # 6. If fully covered by Credits + Wallet (0 gateway payable)
    if final_gateway_payable == Decimal("0.00"):
        if credits_applied > Decimal("0.00"):
            await wallet_service.deduct_wallet(
                customer_id=customer_id,
                amount=credits_applied,
                description=f"Promotional credits for {identifier_desc}",
                reference_id=request.ride_id or request.booking_id,
                bucket="PROMO_CREDIT",
                idempotency_key=f"PROMO-{request.idempotency_key}" if request.idempotency_key else None,
            )

        if wallet_deducted > Decimal("0.00"):
            await wallet_service.deduct_wallet(
                customer_id=customer_id,
                amount=wallet_deducted,
                description=f"Wallet payment for {identifier_desc}",
                reference_id=request.ride_id or request.booking_id,
                bucket="CASH",
                idempotency_key=f"WALLET-{request.idempotency_key}" if request.idempotency_key else None,
            )

        # Update ride/booking status
        if request.ride_id:
            ride.payment_status = "paid"
            ride.payment_method = "wallet"
            await db.commit()
        elif request.booking_id:
            try:
                b_uuid = UUID(request.booking_id)
                book_res = await db.execute(select(Booking).where(Booking.id == b_uuid))
                booking = book_res.scalar_one_or_none()
                if booking:
                    booking.status = BookingStatus.PAID
                    await db.commit()
            except Exception:
                pass

        return SuccessResponse(
            success=True,
            message="Payment completed successfully using wallet and credits!",
            data={
                "payment_mode": "WALLET_FULL",
                "base_fare": float(base_fare),
                "coupon_discount": float(coupon_discount),
                "credits_applied": float(credits_applied),
                "wallet_deducted": float(wallet_deducted),
                "final_gateway_payable": 0.0,
                "status": "CAPTURED",
            }
        )

    # 7. Create Gateway Order for remaining payable
    order_notes = {
        "ride_id": request.ride_id or "",
        "booking_id": request.booking_id or "",
        "coupon_discount": str(coupon_discount),
        "credits_applied": str(credits_applied),
        "wallet_deducted": str(wallet_deducted),
        "saved_method_id": request.saved_method_id or "",
    }

    order = await rp_service.create_order(
        booking_id=request.booking_id,
        ride_id=request.ride_id,
        amount_rupees=final_gateway_payable,
        customer_id=customer_id,
        notes=order_notes,
        idempotency_key=request.idempotency_key,
    )

    return SuccessResponse(
        success=True,
        message="Payment intent created",
        data={
            "payment_mode": "GATEWAY",
            "base_fare": float(base_fare),
            "coupon_discount": float(coupon_discount),
            "credits_applied": float(credits_applied),
            "wallet_deducted": float(wallet_deducted),
            "final_gateway_payable": float(final_gateway_payable),
            "order": order,
        }
    )


@router.post(
    "/payments/create-order",
    response_model=SuccessResponse,
    summary="Create Razorpay payment order for a booking/ride",
)
async def create_payment_order(
    request: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = RazorpayService(db)
    order = await service.create_order(
        booking_id=request.booking_id,
        ride_id=request.ride_id,
        amount_rupees=Decimal(str(request.amount)),
        customer_id=current_user.user_id_str,
        notes={
            "wallet_amount": str(request.wallet_amount),
            "points_used": str(request.points_used)
        }
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
    "/payments/wallet-pay",
    response_model=SuccessResponse,
    summary="Pay for booking/ride using only wallet balance",
)
async def wallet_pay(
    request: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    wallet_service = WalletService(db)
    try:
        if request.points_used > 0:
            await wallet_service.redeem_points(
                customer_id=current_user.user_id_str,
                points=request.points_used
            )
            await wallet_service.deduct_wallet(
                customer_id=current_user.user_id_str,
                amount=Decimal(str(round(request.points_used * payment_settings.REWARD_RUPEE_VALUE, 2))),
                description=f"Points redeemed for {request.booking_id or request.ride_id}",
                reference_id=request.booking_id or request.ride_id
            )

        if request.wallet_amount > 0:
            await wallet_service.deduct_wallet(
                customer_id=current_user.user_id_str,
                amount=Decimal(str(request.wallet_amount)),
                description=f"Payment for {request.booking_id or request.ride_id}",
                reference_id=request.booking_id or request.ride_id
            )

        if request.booking_id:
            try:
                booking_uuid = UUID(request.booking_id)
                res = await db.execute(select(Booking).where(Booking.id == booking_uuid))
                booking = res.scalar_one_or_none()
                if booking:
                    booking.status = BookingStatus.PAID
                    await db.commit()
            except Exception:
                pass

        if request.ride_id:
            try:
                ride_uuid = UUID(request.ride_id)
                res = await db.execute(select(RideRequest).where(RideRequest.id == ride_uuid))
                ride = res.scalar_one_or_none()
                if ride:
                    ride.payment_status = "paid"
                    ride.payment_method = "wallet"
                    await db.commit()
            except Exception:
                pass

        return SuccessResponse(success=True, message="Payment done via wallet", data={})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/payments/status/{order_id}",
    response_model=SuccessResponse,
    summary="Check status of a payment order",
)
async def get_payment_status(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from common.models.all_models import Transaction
    result = await db.execute(
        select(Transaction).where(Transaction.gateway_order_id == order_id)
    )
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Order not found")

    return SuccessResponse(
        success=True,
        message="OK",
        data={"status": tx.status.value.lower(), "amount": float(tx.amount)}
    )


@router.post(
    "/payments/webhook",
    summary="Razorpay webhook endpoint",
    include_in_schema=False,
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


@router.post(
    "/payments/payment-success",
    response_class=HTMLResponse,
    summary="Razorpay callback endpoint",
    include_in_schema=False,
)
async def payment_success(
    request: Request,
    db: AsyncSession = Depends(get_db),
    booking_id: Optional[str] = None,
    ride_id: Optional[str] = None,
    is_topup: Optional[str] = None,
):
    try:
        form_data = await request.form()
        razorpay_payment_id = form_data.get("razorpay_payment_id")
        razorpay_order_id = form_data.get("razorpay_order_id")
        razorpay_signature = form_data.get("razorpay_signature")

        if razorpay_payment_id and razorpay_order_id and razorpay_signature:
            rp = RazorpayService(db)
            if is_topup == "true":
                if not rp.verify_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
                    raise ValueError("Invalid signature")

                from common.models.all_models import Transaction, PaymentStatus
                result = await db.execute(select(Transaction).where(Transaction.gateway_order_id == razorpay_order_id))
                tx = result.scalar_one_or_none()
                if tx and tx.status != PaymentStatus.CAPTURED:
                    tx.status = PaymentStatus.CAPTURED
                    tx.gateway_ref = razorpay_payment_id
                    await db.commit()

                    wallet_service = WalletService(db)
                    await wallet_service.credit_wallet(
                        customer_id=str(tx.user_id),
                        amount=tx.amount,
                        description="Wallet top-up via Razorpay",
                        reference_id=razorpay_payment_id,
                        bucket="CASH",
                    )
            else:
                await rp.capture_payment(razorpay_order_id, razorpay_payment_id, razorpay_signature)

            html = """
            <html>
            <head>
                <script>
                    setTimeout(() => {
                        window.location.href = "cabooking-customer://";
                    }, 1500);
                </script>
            </head>
            <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;text-align:center;background:#f0f9ff;color:#0369a1;">
            <div>
                <h1 style="font-size:3rem;margin-bottom:10px;">✅</h1>
                <h2>Payment Successful!</h2>
                <p>Redirecting back to the app...</p>
            </div>
            </body></html>
            """
            return HTMLResponse(content=html)
    except Exception as e:
        print(f"[PAYMENT CALLBACK ERR] {e}")

    html = """
    <html>
    <head>
        <script>
            setTimeout(() => {
                window.location.href = "cabooking-customer://";
            }, 1500);
        </script>
    </head>
    <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;text-align:center;background:#fff1f2;color:#be123c;">
    <div>
        <h1 style="font-size:3rem;margin-bottom:10px;">❌</h1>
        <h2>Payment Failed</h2>
        <p>Redirecting back to the app...</p>
    </div>
    </body></html>
    """
    return HTMLResponse(content=html)


@router.get(
    "/payments/checkout.html",
    response_class=HTMLResponse,
    summary="Razorpay checkout page for WebView",
    include_in_schema=False,
)
async def razorpay_checkout_page(
    order_id: str,
    key_id: str,
    amount: str,
    currency: str = "INR",
    name: str = "CabBooking",
    description: str = "",
    callback_url: str = "",
):
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Razorpay Checkout</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f4f4f4; }}
            .loader {{ border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }}
            @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
        </style>
    </head>
    <body>
        <div class="loader"></div>
        <form action="{callback_url}" method="POST" id="razorpay-form">
            <script
                src="https://checkout.razorpay.com/v1/checkout.js"
                data-key="{key_id}"
                data-amount="{amount}"
                data-currency="{currency}"
                data-order_id="{order_id}"
                data-name="{name}"
                data-description="{description}"
                data-image="https://cdn-icons-png.flaticon.com/512/3202/3202926.png"
                data-theme.color="#0284C7">
            </script>
            <input type="hidden" custom="Hidden Element" name="hidden">
        </form>
        <script>
            window.onload = function() {{
                const rzpButton = document.querySelector('.razorpay-payment-button');
                if (rzpButton) {{
                    rzpButton.style.display = 'none';
                    rzpButton.click();
                }}
            }};
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


# ============================================================
# SAVED PAYMENT METHODS (Feature 11)
# ============================================================

@router.get(
    "/payments/methods",
    response_model=SuccessResponse,
    summary="Get customer saved payment methods (tokenized)",
)
async def get_saved_payment_methods(
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    methods = await service.get_saved_methods(current_user.user_id_str)
    return SuccessResponse(success=True, message="Saved methods retrieved", data=methods)


@router.post(
    "/payments/methods",
    response_model=SuccessResponse,
    summary="Add new tokenized payment method",
)
async def add_saved_payment_method(
    request: AddSavedMethodRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    method = await service.add_saved_method(
        customer_id=current_user.user_id_str,
        method_type=request.method_type,
        masked_identifier=request.masked_identifier,
        token_reference=request.token_reference,
        display_title=request.display_title,
        card_network=request.card_network,
        card_expiry=request.card_expiry,
        is_default=request.is_default,
    )
    return SuccessResponse(success=True, message="Payment method saved", data=method)


@router.patch(
    "/payments/methods/{method_id}/default",
    response_model=SuccessResponse,
    summary="Set saved payment method as default",
)
async def set_default_payment_method(
    method_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    try:
        result = await service.set_default_method(current_user.user_id_str, method_id)
        return SuccessResponse(success=True, message="Default method updated", data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete(
    "/payments/methods/{method_id}",
    response_model=SuccessResponse,
    summary="Remove saved payment method",
)
async def delete_saved_payment_method(
    method_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    try:
        result = await service.delete_saved_method(current_user.user_id_str, method_id)
        return SuccessResponse(success=True, message="Payment method removed", data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# REFUND PROCESSING (Feature 11)
# ============================================================

@router.post(
    "/payments/refund",
    response_model=SuccessResponse,
    summary="Process authoritative full or partial refund",
)
async def process_refund_endpoint(
    request: RefundRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    try:
        result = await service.process_refund(
            customer_id=current_user.user_id_str,
            transaction_id=request.transaction_id,
            refund_amount=Decimal(str(request.amount)),
            reason=request.reason,
            destination=request.destination,
            idempotency_key=request.idempotency_key,
        )
        return SuccessResponse(success=True, message="Refund processed successfully", data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# MULTI-BUCKET WALLET & CREDITS (Feature 12)
# ============================================================

@router.get(
    "/wallet/summary",
    response_model=SuccessResponse,
    summary="Get multi-bucket customer funds summary (Cash, Promo, Referral, Pending)",
)
@router.get(
    "/wallet",
    response_model=SuccessResponse,
    summary="Get customer wallet summary (Compatibility)",
)
async def get_wallet_summary(
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
@router.post(
    "/wallet/topup/create-order",
    response_model=SuccessResponse,
    summary="Initiate wallet top-up order",
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
        bucket="CASH",
    )
    return SuccessResponse(success=True, message="Wallet credited successfully", data=result)


@router.get(
    "/wallet/transactions",
    response_model=SuccessResponse,
    summary="Wallet transaction history",
)
@router.get(
    "/wallet/ledger",
    response_model=SuccessResponse,
    summary="Full paginated customer ledger",
)
async def wallet_transactions(
    type: str = Query("all", description="all, credit, debit, refund"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    service = WalletService(db)
    result = await service.get_transaction_history(
        current_user.user_id_str, filter_type=type, page=page, page_size=limit
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


# ============================================================
# COUPONS & REFERRALS
# ============================================================

@router.post(
    "/coupons/validate",
    response_model=SuccessResponse,
    summary="Validate a coupon code for a booking/ride",
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
    from common.models.all_models import Customer
    from sqlalchemy import select as sa_select

    result = await db.execute(
        sa_select(Customer).where(Customer.referral_code == referral_code.upper())
    )
    referrer = result.scalar_one_or_none()
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    if str(referrer.user_id) == current_user.user_id_str:
        raise HTTPException(status_code=400, detail="Cannot use your own referral code")

    bonus = Decimal(str(payment_settings.REFERRAL_BONUS_RUPEES))
    wallet = WalletService(db)

    # Credit referrer
    await wallet.credit_wallet(
        customer_id=str(referrer.user_id),
        amount=bonus,
        description=f"Referral reward — friend joined",
        reference_id=current_user.user_id_str,
        bucket="REFERRAL",
    )
    # Credit new user
    await wallet.credit_wallet(
        customer_id=current_user.user_id_str,
        amount=bonus,
        description=f"Welcome bonus — referral applied",
        reference_id=str(referrer.user_id),
        bucket="REFERRAL",
    )

    return SuccessResponse(
        success=True,
        message=f"Referral applied! ₹{bonus} credited to your rewards balance.",
        data={"bonus_amount": float(bonus)},
    )


# ============================================================
# UNIFIED PROMOTION & CAMPAIGN ENGINE (Feature 13)
# ============================================================

class ApplyPromotionRequest(BaseModel):
    code: Optional[str] = None
    campaign_id: Optional[str] = None
    booking_amount: float = Field(..., gt=0)
    service_type: str = "CAB"
    ride_id: Optional[str] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None


@router.get(
    "/promotions/available",
    response_model=SuccessResponse,
    summary="Get all available and eligible promotions for customer",
)
async def get_available_promotions(
    service_type: str = Query("ALL", description="ALL, CAB, PARCEL, HOTEL, TRANSPORT"),
    pickup_lat: Optional[float] = Query(None),
    pickup_lng: Optional[float] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.promotion_service import PromotionService
    service = PromotionService(db)
    promos = await service.get_available_promotions(
        customer_id=current_user.user_id_str,
        service_type=service_type,
        pickup_lat=pickup_lat,
        pickup_lng=pickup_lng,
    )
    return SuccessResponse(success=True, message="Available promotions retrieved", data=promos)


@router.post(
    "/promotions/apply",
    response_model=SuccessResponse,
    summary="Validate and apply promo code / auto-offer calculation",
)
async def apply_promotion_endpoint(
    request: ApplyPromotionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from app.services.promotion_service import PromotionService
    service = PromotionService(db)
    result = await service.validate_and_apply_promotion(
        customer_id=current_user.user_id_str,
        booking_amount=Decimal(str(request.booking_amount)),
        code=request.code,
        campaign_id=request.campaign_id,
        service_type=request.service_type,
        ride_id=request.ride_id,
        pickup_lat=request.pickup_lat,
        pickup_lng=request.pickup_lng,
    )
    return SuccessResponse(success=True, message=result.get("message", "Promotion applied"), data=result)

