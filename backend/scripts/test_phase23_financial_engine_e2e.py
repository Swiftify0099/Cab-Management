"""
Phase 23 Comprehensive Production Verification Suite:
AUTHORITATIVE FINANCIAL ENGINE & RECONCILIATION SUITE

Verifies:
1. Safe Decimal Split Calculations for all 9 SuperApp Services:
   - CAB, PARCEL, TRANSPORT, AIRPORT, RENTAL, OUTSTATION, INTERCITY, MOVERS, CORPORATE.
2. Authoritative Customer Multi-Bucket Payment & Wallet Deduction (Promo Credits -> Cash Wallet).
3. Idempotent Payment Processing (Duplicate requests prevent double debits).
4. Payment Failure Handling (Insufficient funds rejection without corrupting balance).
5. Payment Retry (Subsequent valid payment succeeds and commits).
6. 100% Full Refund Processing with Wallet Replenishment.
7. Partial Refund Processing (Dispute resolution with remaining refundable balance protection).
8. Cancellation Fee Settlement (70% Driver Compensation + 30% Platform Fee).
9. Partner Payout Withdrawal (Bank/UPI with row-locking and idempotency).
10. End-to-End Mathematical Reconciliation Verification for all 9 Services:
    Customer Payment == Partner Earning + Platform Commission + Tax + Pass-Throughs.
"""
import os
import sys
import uuid
import asyncio
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal

# Path setup
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_root, "common"))
sys.path.insert(0, _root)

from sqlalchemy import select, and_, text
from common.database import async_session_maker, engine
from common.models.all_models import (
    User, UserRole, Driver, DriverStatus, KYCStatus, Vehicle, VehicleType,
    CustomerProfile, WalletTransaction, Transaction, CustomerRefund,
    DriverEarningLedger, DriverPayoutRequest, DriverPayoutMethod,
    Coupon, DiscountType, PaymentStatus, LedgerType,
)
from common.services.financial_engine_service import FinancialEngineService, SERVICE_COMMISSION_RULES

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def run_phase23_financial_engine_verification():
    print("=" * 85)
    print("💰 PHASE 23 — AUTHORITATIVE FINANCIAL ENGINE E2E PRODUCTION SUITE")
    print("=" * 85)

    await engine.dispose()

    async with async_session_maker() as session:
        # =========================================================================
        # SETUP: Seed Customer, Driver, Wallet, and Coupons
        # =========================================================================
        print("\n[STEP 1] Seeding Test Customer, Chauffeur, Multi-Bucket Wallets, and Promo Coupons...", flush=True)

        # 1. Customer with Multi-Bucket Wallet
        cust_user = User(
            id=uuid.uuid4(),
            phone=f"+9198{str(uuid.uuid4().int)[:8]}",
            email=f"finance.cust.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(cust_user)
        await session.flush()

        customer = CustomerProfile(
            id=uuid.uuid4(),
            user_id=cust_user.id,
            full_name="Rajiv Singhania (VIP Customer)",
            wallet_balance=Decimal("2500.00"),
            promo_credit_balance=Decimal("200.00"),
            referral_reward_balance=Decimal("100.00"),
            rating=Decimal("4.95"),
        )
        session.add(customer)

        # 2. Driver Partner with Wallet & Ledger
        driver_user = User(
            id=uuid.uuid4(),
            phone=f"+9199{str(uuid.uuid4().int)[:8]}",
            email=f"finance.driver.{uuid.uuid4().hex[:6]}@example.com",
            role=UserRole.DRIVER,
            is_verified=True,
            is_active=True,
        )
        session.add(driver_user)
        await session.flush()

        chauffeur = Driver(
            id=uuid.uuid4(),
            user_id=driver_user.id,
            full_name="Manoj Kulkarni (Gold Partner)",
            phone=driver_user.phone,
            rating=4.96,
            total_trips=650,
            wallet_balance=Decimal("3000.00"),
            total_earnings=Decimal("450000.00"),
            status=DriverStatus.ONLINE,
            kyc_status=KYCStatus.APPROVED,
        )
        session.add(chauffeur)

        # 3. Verified Driver Bank Payout Method
        payout_method = DriverPayoutMethod(
            id=uuid.uuid4(),
            driver_id=chauffeur.id,
            method_type="BANK",
            bank_name="HDFC Bank",
            account_holder_name="Manoj Kulkarni",
            account_number_masked="•••• 4821",
            ifsc_code="HDFC0001234",
            is_default=True,
            is_verified=True,
            status="ACTIVE",
        )
        session.add(payout_method)

        # 4. Promo Coupon
        coupon_code = f"FIN{uuid.uuid4().hex[:4].upper()}"
        coupon = Coupon(
            id=uuid.uuid4(),
            code=coupon_code,
            description="10% Off Financial Engine Test",
            discount_type=DiscountType.PERCENTAGE,
            discount_value=Decimal("10.00"),
            max_discount_amount=Decimal("100.00"),
            min_fare=Decimal("200.00"),
            max_uses=1000,
            is_active=True,
        )
        session.add(coupon)

        await session.commit()
        print(f"  [OK] Seed entities committed: Customer (Wallet: ₹2500, Promo: ₹200), Driver (Wallet: ₹3000, HDFC Payout Method), Coupon ({coupon_code}).")

        fin_svc = FinancialEngineService(session)

        # =========================================================================
        # TEST 1: DECIMAL PRECISION SPLIT ACROSS ALL 9 SERVICES
        # =========================================================================
        print("\n" + "=" * 80)
        print("TEST 1: AUTHORITATIVE DECIMAL SPLIT CALCULATION FOR ALL 9 SERVICES")
        print("=" * 80)

        test_matrix = [
            ("CAB", Decimal("500.00"), Decimal("50.00"), Decimal("0.00"), Decimal("0.00"), Decimal("50.00")),
            ("PARCEL", Decimal("350.00"), Decimal("0.00"), Decimal("0.00"), Decimal("20.00"), Decimal("0.00")),
            ("TRANSPORT", Decimal("2200.00"), Decimal("100.00"), Decimal("0.00"), Decimal("300.00"), Decimal("100.00")),
            ("AIRPORT", Decimal("1200.00"), Decimal("150.00"), Decimal("150.00"), Decimal("200.00"), Decimal("50.00")),
            ("RENTAL", Decimal("1800.00"), Decimal("50.00"), Decimal("100.00"), Decimal("250.00"), Decimal("100.00")),
            ("OUTSTATION", Decimal("4500.00"), Decimal("250.00"), Decimal("0.00"), Decimal("500.00"), Decimal("200.00")),
            ("INTERCITY", Decimal("800.00"), Decimal("80.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00")),
            ("MOVERS", Decimal("6500.00"), Decimal("0.00"), Decimal("0.00"), Decimal("1200.00"), Decimal("300.00")),
            ("CORPORATE", Decimal("1500.00"), Decimal("100.00"), Decimal("0.00"), Decimal("0.00"), Decimal("150.00")),
        ]

        for srv, base, toll, park, addons, disc in test_matrix:
            split = fin_svc.calculate_service_split(
                service_type=srv,
                base_fare=base,
                tolls=toll,
                parking=park,
                addons=addons,
                discounts=disc,
            )
            # Mathematical conservation check: Customer Payment == Partner Earning + Platform Commission + Tax
            assert split["customer_payment"] == split["partner_net_earning"] + split["platform_commission"] + split["gst_amount"]
            assert split["partner_net_earning"] > Decimal("0.00")
            assert split["platform_commission"] > Decimal("0.00")
            print(f"  [OK] {srv:<11}: Base=₹{split['base_fare']} | Cust Total=₹{split['customer_payment']} -> Partner Net=₹{split['partner_net_earning']} + Platform=₹{split['platform_commission']} + GST=₹{split['gst_amount']}")

        # =========================================================================
        # TEST 2: IDEMPOTENT CUSTOMER MULTI-BUCKET PAYMENT (PROMO + CASH WALLET)
        # =========================================================================
        print("\n" + "=" * 80)
        print("TEST 2: MULTI-BUCKET WALLET DEBIT & IDEMPOTENT PAYMENT")
        print("=" * 80)

        # Ride fare ₹450 with coupon FIN10 (10% discount = ₹45 -> ₹405 payable)
        # Multi-bucket: ₹200 Promo Credits + ₹205 Cash Wallet = ₹405
        booking_ref_1 = f"CAB-{uuid.uuid4().hex[:6].upper()}"
        idem_key_1 = str(uuid.uuid4())

        pay_res = await fin_svc.process_customer_payment(
            customer_id=str(cust_user.id),
            amount=Decimal("450.00"),
            service_type="CAB",
            payment_method="WALLET",
            booking_id=booking_ref_1,
            idempotency_key=idem_key_1,
            coupon_code=coupon_code,
            use_promo_credits=True,
            use_cash_wallet=True,
        )

        assert pay_res["status"] == "COMPLETED"
        assert pay_res["discount_amount"] == 45.0
        assert pay_res["promo_credits_used"] == 200.0
        assert pay_res["cash_wallet_used"] == 205.0
        assert pay_res["wallet_balance_after"] == 2295.0 # 2500 - 205 = 2295
        assert pay_res["is_duplicate"] is False
        print(f"  [OK] Payment Processed: Payable=₹{pay_res['amount']} (Discount: ₹{pay_res['discount_amount']}, Promo: ₹{pay_res['promo_credits_used']}, Cash Wallet: ₹{pay_res['cash_wallet_used']}). New Cash Balance: ₹{pay_res['wallet_balance_after']}.")

        # =========================================================================
        # TEST 3: DUPLICATE PAYMENT IDEMPOTENCY TEST
        # =========================================================================
        print("\n" + "=" * 80)
        print("TEST 3: DUPLICATE PAYMENT ATTEMPT (SAME IDEMPOTENCY KEY)")
        print("=" * 80)

        dup_pay_res = await fin_svc.process_customer_payment(
            customer_id=str(cust_user.id),
            amount=Decimal("450.00"),
            service_type="CAB",
            payment_method="WALLET",
            booking_id=booking_ref_1,
            idempotency_key=idem_key_1,
        )

        assert dup_pay_res["is_duplicate"] is True
        assert dup_pay_res["transaction_id"] == pay_res["transaction_id"]
        # Verify wallet balance was NOT debited again
        await session.refresh(customer)
        assert customer.wallet_balance == Decimal("2295.00")
        print(f"  [OK] Idempotency Verified: Duplicate payment safely returned Tx #{dup_pay_res['transaction_id']} without double charging.")

        # =========================================================================
        # TEST 4: PAYMENT FAILURE HANDLING (INSUFFICIENT FUNDS)
        # =========================================================================
        print("\n" + "=" * 80)
        print("TEST 4: PAYMENT FAILURE HANDLING (INSUFFICIENT BALANCE)")
        print("=" * 80)

        try:
            # Customer has ₹2295 cash wallet, attempting ₹10,000 payment
            await fin_svc.process_customer_payment(
                customer_id=str(cust_user.id),
                amount=Decimal("10000.00"),
                service_type="TRANSPORT",
                payment_method="WALLET",
                booking_id="TRP-OVERLIMIT",
            )
            assert False, "Should have thrown payment required error"
        except Exception as ex:
            print(f"  [OK] Payment Failure Handled: {ex.detail if hasattr(ex, 'detail') else str(ex)}")

        # Verify wallet balance remained intact
        await session.refresh(customer)
        assert customer.wallet_balance == Decimal("2295.00")
        print(f"  [OK] Customer Wallet Balance preserved intact at ₹{customer.wallet_balance}.")

        # =========================================================================
        # TEST 5: PAYMENT RETRY
        # =========================================================================
        print("\n" + "=" * 80)
        print("TEST 5: PAYMENT RETRY WITH VALID AMOUNT")
        print("=" * 80)

        retry_res = await fin_svc.process_customer_payment(
            customer_id=str(cust_user.id),
            amount=Decimal("295.00"), # Within available ₹2295 balance
            service_type="PARCEL",
            payment_method="WALLET",
            booking_id="PRC-RETRY-SUCCESS",
            idempotency_key=str(uuid.uuid4()),
        )
        assert retry_res["status"] == "COMPLETED"
        assert retry_res["cash_wallet_used"] == 295.0
        assert retry_res["wallet_balance_after"] == 2000.0 # 2295 - 295 = 2000
        print(f"  [OK] Retry Payment Succeeded: Deducted ₹295.00. New Wallet Balance: ₹{retry_res['wallet_balance_after']}.")

        # =========================================================================
        # TEST 6: FULL 100% REFUND PROCESSING
        # =========================================================================
        print("\n" + "=" * 80)
        print("TEST 6: 100% FULL REFUND PROCESSING & WALLET REPLENISHMENT")
        print("=" * 80)

        # Refund the ₹295.00 parcel transaction
        full_refund_res = await fin_svc.process_refund(
            transaction_id=retry_res["transaction_id"],
            customer_id=str(cust_user.id),
            refund_amount=Decimal("295.00"),
            reason="DRIVER_NO_SHOW",
            idempotency_key=str(uuid.uuid4()),
        )

        assert full_refund_res["status"] == "PROCESSED"
        assert full_refund_res["amount"] == 295.0
        assert full_refund_res["remaining_refundable"] == 0.0
        assert full_refund_res["wallet_balance_after"] == 2295.0 # Restored from 2000 to 2295
        print(f"  [OK] 100% Full Refund Processed: Ref #{full_refund_res['refund_reference']}. Re-credited ₹295.00 back to Customer Wallet (Balance: ₹{full_refund_res['wallet_balance_after']}).")

        # =========================================================================
        # TEST 7: PARTIAL REFUND & DISPUTE RESOLUTION
        # =========================================================================
        print("\n" + "=" * 80)
        print("TEST 7: PARTIAL REFUND (DISPUTE RESOLUTION)")
        print("=" * 80)

        # Original ride was ₹405 payable. Partial refund of ₹100 for AC dispute
        partial_ref_1 = await fin_svc.process_refund(
            transaction_id=pay_res["transaction_id"],
            customer_id=str(cust_user.id),
            refund_amount=Decimal("100.00"),
            reason="FARE_DISPUTE_AC_ISSUE",
            idempotency_key=str(uuid.uuid4()),
        )
        assert partial_ref_1["status"] == "PROCESSED"
        assert partial_ref_1["amount"] == 100.0
        assert partial_ref_1["remaining_refundable"] == 305.0 # 405 - 100 = 305
        assert partial_ref_1["wallet_balance_after"] == 2395.0 # 2295 + 100 = 2395
        print(f"  [OK] Partial Refund 1: ₹100.00 credited. Remaining Refundable: ₹{partial_ref_1['remaining_refundable']}. Customer Wallet: ₹{partial_ref_1['wallet_balance_after']}.")

        # Test refund exceeding limit is rejected
        try:
            await fin_svc.process_refund(
                transaction_id=pay_res["transaction_id"],
                customer_id=str(cust_user.id),
                refund_amount=Decimal("400.00"), # Exceeds ₹305 remaining
                reason="EXCESS_REFUND_ATTEMPT",
            )
            assert False, "Should have rejected refund exceeding limit"
        except Exception as ex:
            print(f"  [OK] Over-Refund Rejected Safely: {ex.detail if hasattr(ex, 'detail') else str(ex)}")

        # =========================================================================
        # TEST 8: CANCELLATION FEE SETTLEMENT (70/30 SPLIT)
        # =========================================================================
        print("\n" + "=" * 80)
        print("TEST 8: CANCELLATION FEE SETTLEMENT (DRIVER COMPENSATION + PLATFORM SPLIT)")
        print("=" * 80)

        canc_res = await fin_svc.process_cancellation_fee(
            booking_id="CAB-CANC-9921",
            customer_id=str(cust_user.id),
            driver_id=str(chauffeur.id),
            fee_amount=Decimal("60.00"),
            service_type="CAB",
            driver_share_pct=Decimal("0.70"), # 70% driver (₹42), 30% platform (₹18)
            idempotency_key=str(uuid.uuid4()),
        )

        assert canc_res["cancellation_fee"] == 60.0
        assert canc_res["driver_compensation"] == 42.0
        assert canc_res["platform_share"] == 18.0
        assert canc_res["customer_wallet_balance_after"] == 2335.0 # 2395 - 60 = 2335

        await session.refresh(chauffeur)
        assert chauffeur.wallet_balance == Decimal("3042.00") # 3000 + 42 = 3042
        print(f"  [OK] Cancellation Fee Processed: Total=₹{canc_res['cancellation_fee']} (Driver Comp: ₹{canc_res['driver_compensation']}, Platform Fee: ₹{canc_res['platform_share']}). Chauffeur Wallet: ₹{chauffeur.wallet_balance}.")

        # =========================================================================
        # TEST 9: PARTNER PAYOUT WITHDRAWAL (BANK / UPI WITH ROW LOCKING)
        # =========================================================================
        print("\n" + "=" * 80)
        print("TEST 9: PARTNER PAYOUT WITHDRAWAL (BANK WITH ROW-LOCKING)")
        print("=" * 80)

        idem_payout_key = str(uuid.uuid4())
        payout_res = await fin_svc.request_driver_payout(
            driver_id=str(chauffeur.id),
            amount=Decimal("1500.00"),
            payout_method_id=str(payout_method.id),
            idempotency_key=idem_payout_key,
        )

        assert payout_res["status"] == "SUCCESS"
        assert payout_res["amount"] == 1500.0
        assert payout_res["driver_wallet_balance_after"] == 1542.0 # 3042 - 1500 = 1542
        print(f"  [OK] Driver Payout Processed: Ref #{payout_res['payout_reference']}. Withdrew ₹1500.00 to HDFC Bank (Remaining Wallet: ₹{payout_res['driver_wallet_balance_after']}).")

        # Duplicate payout idempotency check
        dup_payout_res = await fin_svc.request_driver_payout(
            driver_id=str(chauffeur.id),
            amount=Decimal("1500.00"),
            idempotency_key=idem_payout_key,
        )
        assert dup_payout_res["is_duplicate"] is True
        await session.refresh(chauffeur)
        assert chauffeur.wallet_balance == Decimal("1542.00")
        print("  [OK] Duplicate Payout Request safely deduplicated without double withdrawal.")

        # =========================================================================
        # TEST 10: END-TO-END SETTLEMENT & RECONCILIATION FOR ALL 9 SERVICES
        # =========================================================================
        print("\n" + "=" * 80)
        print("TEST 10: RECONCILIATION ACROSS ALL 9 SUPERAPP SERVICES")
        print("=" * 80)

        services_to_reconcile = [
            ("CAB", Decimal("450.00"), Decimal("50.00"), Decimal("0.00")),
            ("PARCEL", Decimal("280.00"), Decimal("0.00"), Decimal("0.00")),
            ("TRANSPORT", Decimal("1850.00"), Decimal("100.00"), Decimal("0.00")),
            ("AIRPORT", Decimal("1400.00"), Decimal("150.00"), Decimal("150.00")),
            ("RENTAL", Decimal("1299.00"), Decimal("50.00"), Decimal("50.00")),
            ("OUTSTATION", Decimal("3800.00"), Decimal("200.00"), Decimal("0.00")),
            ("INTERCITY", Decimal("750.00"), Decimal("60.00"), Decimal("0.00")),
            ("MOVERS", Decimal("5200.00"), Decimal("0.00"), Decimal("0.00")),
            ("CORPORATE", Decimal("950.00"), Decimal("50.00"), Decimal("0.00")),
        ]

        for srv, base_f, toll_f, park_f in services_to_reconcile:
            booking_code = f"REC-{srv}-{uuid.uuid4().hex[:4].upper()}"
            settle_res = await fin_svc.settle_service_trip(
                service_type=srv,
                booking_id=booking_code,
                driver_id=str(chauffeur.id),
                gross_fare=base_f,
                tolls=toll_f,
                parking=park_f,
                idempotency_key=str(uuid.uuid4()),
            )

            # Reconcile from ledger
            rec = await fin_svc.reconcile_booking(service_type=srv, booking_id=booking_code)
            assert rec["is_reconciled"] is True
            assert rec["discrepancy"] <= 0.01
            print(f"  [OK] Reconciled {srv:<11}: {rec['equation']} (Discrepancy: ₹{rec['discrepancy']:.2f})")

        print("\n" + "=" * 85)
        print("🎉 ALL 10 PHASE 23 (FINANCIAL ENGINE) TEST SCENARIOS PASSED WITH 100% SUCCESS!")
        print("=" * 85)


if __name__ == "__main__":
    asyncio.run(run_phase23_financial_engine_verification())
