# 📱 CUSTOMER APP — FEATURES 11 & 12 ARCHITECTURE & SPECIFICATION
## 💳 FEATURE 11: PAYMENT SYSTEM & 💰 FEATURE 12: WALLET / CREDITS

---

### 1. Architectural Invariant & Reconciliation

All customer payments, split payments, promo deductions, and funds management are governed by a single backend-authoritative invariant:

$$\text{Final Gateway Payable} = \text{Authoritative Fare} - \text{Promo Discount} - \text{Promotional Credits} - \text{Wallet Deduction}$$

```
+-----------------------------------------------------------------------------------+
|                           BACKEND-AUTHORITATIVE FARE                              |
| (Base Fare + Distance + Time + Waiting + Tolls + Parking + GST - Surge Adjustment)|
+-----------------------------------------------------------------------------------+
                                         |
                                         v  [Coupon / Promo Code Validation]
                          - Promo Discount (Server Capped)
                                         |
                                         v  [Promotional Credits Bucket]
                     - Subsidized Promo Credits (Non-Withdrawable)
                                         |
                                         v  [Cash Wallet Split]
                         - Available Cash Wallet Balance
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|               FINAL PAYABLE (Zero Gateway or Razorpay Order / Cash)               |
+-----------------------------------------------------------------------------------+
```

---

### 2. Multi-Bucket Funds Architecture (Customer Separation)

Customer funds are isolated into 4 distinct buckets to prevent mingling with Driver funds:
1. **Cash Wallet Balance (`CASH`)**:
   - Funded by Razorpay top-ups or direct cash deposit.
   - Usable for any ride or intercity booking.
2. **Promotional Credits Balance (`PROMO_CREDIT`)**:
   - Subsidized by platform marketing campaigns.
   - Non-withdrawable and subject to server-enforced expiration dates.
3. **Referral Rewards Balance (`REFERRAL`)**:
   - Earned when friends register and complete trips.
4. **Pending Refunds Balance (`REFUND`)**:
   - Tracked separately during dispute investigation before final credit.

---

### 3. Tokenized Saved Payment Methods

- **Zero raw card data or CVV stored** in databases.
- Tokenized representation stored in `CustomerPaymentMethod` table:
  - `method_type`: `UPI` or `CARD`
  - `display_title`: e.g., `Google Pay (aditya***@okhdfcbank)` or `HDFC Visa •••• 4242`
  - `masked_identifier`: Masked VPA or last 4 digits
  - `token_reference`: Razorpay customer token reference
  - `is_default`: Exactly one active default method per customer with auto-promotion on deletion.

---

### 4. Authoritative Full & Partial Refunds

- Reconciled against original transaction in `CustomerRefund` table.
- Enforces strict upper bound: $\text{Refund Amount} \le \text{Paid Amount} - \text{Already Refunded}$.
- Supports destination to `ORIGINAL_PAYMENT` (via gateway reverse) or instant `WALLET` credit.
- Updates original `Transaction` status to `PARTIALLY_REFUNDED` or `REFUNDED`.

---

### 5. API Endpoints Reference

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/v1/payments/create-intent` | `POST` | Authoritative calculation, split deduction, and Razorpay Order / Cash intent |
| `/api/v1/payments/capture` | `POST` | Verifies Razorpay HMAC signature and confirms payment |
| `/api/v1/payments/wallet-pay` | `POST` | Full wallet payment execution |
| `/api/v1/payments/status/{order_id}` | `GET` | Real-time payment verification status |
| `/api/v1/payments/methods` | `GET/POST` | List and add tokenized payment methods |
| `/api/v1/payments/methods/{id}/default` | `PATCH` | Set default payment method |
| `/api/v1/payments/methods/{id}` | `DELETE` | Soft-delete saved payment method |
| `/api/v1/payments/refund` | `POST` | Authoritative full/partial refund processing |
| `/api/v1/wallet/summary` | `GET` | Multi-bucket customer balance summary |
| `/api/v1/wallet/topup` | `POST` | Initiate wallet top-up order |
| `/api/v1/wallet/topup/verify` | `POST` | Verify top-up payment and credit balance |
| `/api/v1/wallet/ledger` | `GET` | Paginated double-entry transaction history |
| `/api/v1/wallet/redeem-points` | `POST` | Convert reward points to cash wallet balance |
| `/api/v1/coupons/validate` | `POST` | Server-side coupon code validation |
| `/api/v1/referrals/apply` | `POST` | Apply referral code for dual rewards |

---

### 6. Verification & Automated Tests

All tests passed with zero errors:
- **E2E Financial Test Suite**: `python backend/scripts/verify_customer_payment_and_wallet_e2e.py` (8/8 test suites passed)
- **Safety & Trip Completion Regression**: `python backend/scripts/verify_customer_safety_and_completion_e2e.py` (11/11 tests passed)
- **TypeScript Static Analysis**: `npx tsc --noEmit` in `apps/customer-app` (0 errors)
