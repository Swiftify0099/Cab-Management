# Customer Security Architecture & Threat Defense (Feature 26)

Production-Grade Identity, Hardware Device Trust, Session Security, Multi-Factor Risk Engine, Abuse Prevention & Customer ↔ Driver Relationship Firewall.

---

## 1. Master Security Principle: Domain Trust Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                 CUSTOMER TRUST DOMAIN                       │
│  - Authenticated Customer Identity (Verified Phone / Email) │
│  - Hardware-Bound Device Token (Encrypted Device ID)        │
│  - Private Wallet, Balances, Saved Cards & UPI Tokens       │
│  - Personal Saved Places, Family Members & History Feed     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │   CENTRALIZED BACKEND SECURITY & FIREWALL    │
        │   - Tenant Authorization & IDOR Firewall     │
        │   - Real-time Multi-Factor Risk Engine       │
        │   - Operational Data Sanitization (Masking)  │
        │   - 4-Digit Ride PIN Verification            │
        │   - Expiring Socket.IO Room Authorization    │
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  DRIVER TRUST DOMAIN                        │
│  - Authenticated Driver Identity & Operational Verification │
│  - Operational Ride Dispatch (Masked Phone, Coordinates)   │
│  - Private Driver Earnings, Settlement Ledgers & KYC        │
│  - ZERO access to Customer billing, wallet, or history      │
└─────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Zero Customer Data Leakage Guarantee:**
> Drivers never receive customer wallet balances, credit card tokens, private email addresses, saved family members, or historical ride routes. They receive **strictly operational parameters** (Passenger Name, Masked Phone `+91 98••••2345`, Pickup/Drop GPS, and Ride Start PIN Verification).

---

## 2. Threat Model Matrix (T1 to T8)

| Threat | Attack Vector | Affected API | Security Gap Addressed | Risk Level | Protection Enforced |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T1: OTP Flood & Toll Fraud** | Mass automated requests across numbers | `POST /auth/otp/send` | Phone-only rate limiting bypassed by SIM rotating | `HIGH` | Dual-key sliding window rate limiter: `phone` (5/hr) + `device_id`/`ip_hash` (15/hr). |
| **T2: Session Hijacking & Replay** | Replaying rotated refresh token | `POST /auth/token/refresh` | Replayed token didn't revoke family tree | `CRITICAL` | Single-use rotation with Family Tree Invalidation. If an old token is replayed, all sessions on that device are revoked. |
| **T3: Fake Booking Spam** | Rapid book-cancel loops to harass drivers | `POST /matching/request` | No velocity tracking on cancellations | `HIGH` | `BookingRiskEngine` monitors cancel velocity (>3 in 10m -> score +75, restricts cash rides). |
| **T4: Cross-Service IDOR Probe** | Tampering IDs across 8 service domains | `GET /activity/{id}`, `GET /parcels/{id}`, etc. | Missing tenancy check on polymorphic queries | `CRITICAL` | Strict DB query filter `where(Model.customer_id == current_user.id)` across all 8 domains. |
| **T5: Promo Farming Abuse** | Multiple accounts on same phone | `POST /payments/coupons/validate` | Unique phone allowed coupon farming on same hardware | `HIGH` | Hardware fingerprint binding in `CustomerDevice`. Blocks duplicate first-ride bonuses on same device. |
| **T6: Socket.IO Trip Snooping** | Joining foreign `trip:{id}` rooms | Socket `join_trip` event | Connect token verified but room access unverified | `HIGH` | Backend DB/Redis verification before room join: only assigned driver or passenger can enter. |
| **T7: Driver-Customer Collusion** | Repeated intentional matching pairs | `POST /matching/offers/accept` | Repeat pairings not tracked | `MEDIUM` | Risk engine calculates pair co-occurrence (>5 in 24h -> flags settlement for manual admin audit). |
| **T8: Fare Parameter Tampering** | Client sends modified fare in body | `POST /payments/create-order` | Potential body amount overrides | `CRITICAL` | All financial figures derived exclusively from server-side order/ride records. Client bodies ignored. |

---

## 3. Hardware Device Trust & Lifecycle

```
[ New Hardware Detected ]
          │
          ▼
   ( Risk Score < 30 )  ──► [ TRUSTED ] ──► Standard Seamless Session
          │
          ▼
   ( Risk Score 30–69 ) ──► [ PENDING_VERIFICATION ] ──► Step-Up OTP / Biometric Challenge
          │                                                    │ (Pass)
          │                                                    ▼
          │                                              [ TRUSTED ]
          ▼
   ( Risk Score 70–89 ) ──► [ RESTRICTED ] ──► Cash Booking Blocked, Promo Held
          │
          ▼
   ( Risk Score 90–100 )──► [ REVOKED / LOCKED ] ──► Disconnected & Multi-Factor Recovery
```

### Device Trust States
1. `NEW`: Hardware instance never seen before on this account.
2. `PENDING_VERIFICATION`: Requires step-up SMS OTP or biometric hardware authentication.
3. `TRUSTED`: Fully verified hardware instance with low risk score.
4. `RESTRICTED`: High-risk or suspicious activity detected; high-risk actions temporarily held.
5. `REVOKED`: Disconnected by user or admin; all bound sessions and refresh tokens invalidated immediately.

---

## 4. Centralized Multi-Factor Customer Risk Engine

The `CustomerRiskEngine` evaluates real-time telemetry across 5 core categories:

| Evaluation Signal | Trigger Event | Score Impact | Security Action Dictated |
| :--- | :--- | :--- | :--- |
| `VELOCITY_LOGIN` | >2 failed OTPs in 15 min | +15 pts per failure | `MEDIUM` -> Step-Up Verification Challenge |
| `UNRECOGNIZED_DEVICE` | First login on new device ID | +25 pts | `MEDIUM` -> SMS Notification + Step-Up Confirmation |
| `BOOKING_CANCEL_SURGE` | >3 ride cancellations in 1 hr | +75 pts | `HIGH` -> Restrict instant booking for 30 minutes |
| `PROMO_FARMING` | Same device ID on >1 account | +70 pts | `HIGH` -> First-ride promo rejected |
| `COLLUSION_REPEATED_DRIVER` | Same driver paired >5 times in 24h | +75 pts | `HIGH` -> Flag for manual settlement audit |
| `ACCOUNT_TAKEOVER_SIGNALS` | Rapid device + IP change + failed auth | +95 pts | `CRITICAL` -> Account Lock & Multi-Factor Recovery |

---

## 5. Customer Mobile Application Screens (`apps/customer-app`)

| Route | Screen Name | Key UX & Security Features |
| :--- | :--- | :--- |
| `/security` | **Master Security Center Hub** | Shield Health Score (0–100), Active Safeguards Grid, Alerts Banner, Navigation Tiles. |
| `/security/devices` | **Trusted Devices & Sessions** | Hardware device model, OS, app version, "This Device" badge, single & all-device remote logout. |
| `/security/activity` | **Security Activity Timeline** | 5 category filter pills (`All`, `Logins`, `Devices`, `Alerts`, `Payments`), privacy-safe geolocation tags. |
| `/security/challenge` | **Step-Up Verification Challenge** | Contextual hardware prompt, 6-digit SMS OTP input, one-tap Biometric Face ID / Fingerprint. |
| `/security/account-protection` | **Account Lockout & Recovery** | Calming security explanation, multi-factor recovery form (Phone + Emergency Contact + OTP). |

---

## 6. Verification Suite Results

Executed via `backend/scripts/verify_customer_feature26_security.py`:
- [x] **Test 1: Device Registration & Hardware Trust Lifecycle** — `PASSED`
- [x] **Test 2: Immutable Security Audit Stream** — `PASSED`
- [x] **Test 3: Centralized Multi-Factor Risk Engine Scoring** — `PASSED`
- [x] **Test 4: Step-Up Verification Challenge & Device Promotion** — `PASSED`
- [x] **Test 5: Account Lockout & Multi-Factor Recovery Workflow** — `PASSED`
- [x] **Test 6: Customer ↔ Driver Security Firewall (Attack Tests)** — `PASSED`
- [x] **Test 7: Cross-Service IDOR Isolation Across 8 Service Domains (Attack Tests)** — `PASSED`
