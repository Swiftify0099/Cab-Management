# Customer App Development Log

## Overview
This document tracks all implemented features, technical audits, and cross-application contracts for the Customer Mobile Application (`apps/customer-app`) within the Intercity Cab Management ecosystem.

---

## Feature 1: Customer Core Account (Completed)

### 1. Database & ORM Layer
- **New Tables**:
  - `family_accounts`: Family group metadata, organizer ID, shared payment toggles, monthly spending limits.
  - `family_members`: Member user linkage, role (`ORGANIZER`, `MEMBER`), status, and fine-grained permissions (`can_use_shared_payment`, `can_book_rides`, `can_track_trips`).
  - `customer_emergency_contacts`: Multi-contact trusted safety list with `is_primary` and `auto_share_rides` flags.
  - `customer_app_settings`: Notification preferences (trips, driver arrival, promos, security alerts) and privacy preferences (location precision, family tracking, ad personalization).
- **Participant Context in `ride_requests`**:
  - Added `booking_owner_id`, `rider_type` (`SELF`, `FAMILY_MEMBER`, `GUEST`), `rider_name`, `rider_phone`, and `is_booked_for_other` columns.

### 2. Backend Services & REST APIs
- **Family Service & Router** (`/api/v1/family`):
  - `GET /api/v1/family`: Retrieve or auto-initialize family account.
  - `POST /api/v1/family`: Create/update family configuration.
  - `POST /api/v1/family/members`: Add family member (up to 6 max, auto-linking existing user if registered).
  - `PATCH /api/v1/family/members/{id}`: Update permissions and relationship type.
  - `DELETE /api/v1/family/members/{id}`: Remove family member.
  - `PATCH /api/v1/family/payment-settings`: Toggle shared wallet/card usage and spending limits.
- **Emergency Contacts Router** (`/api/v1/customer/emergency-contacts`):
  - `GET /api/v1/customer/emergency-contacts`: List trusted contacts ordered by primary status.
  - `POST /api/v1/customer/emergency-contacts`: Add contact (max 5) with automatic primary demotion logic.
  - `PATCH /api/v1/customer/emergency-contacts/{id}`: Edit contact details or toggles.
  - `DELETE /api/v1/customer/emergency-contacts/{id}`: Delete contact.
- **Customer Settings Router** (`/api/v1/customer`):
  - `GET /api/v1/customer`: Get user privacy, notification, and language settings.
  - `PATCH /api/v1/customer`: Update preferences and persist user language.
  - `GET /api/v1/customer/sessions`: List active token sessions.
  - `DELETE /api/v1/customer/sessions/{id}`: Remote session revocation.
  - `POST /api/v1/customer/sessions/revoke-all`: Logout all devices.
  - `POST /api/v1/customer/account/delete`: Soft-delete account with complete session purge.

### 3. Mobile UI/UX Implementation (`apps/customer-app`)
- **Master Profile Hub** (`app/(tabs)/profile.tsx`):
  - Top avatar with camera/gallery picker and verified check badge.
  - Quick action card grid: Saved Places, Family & Shared, Safety & Emergency, Wallet & Payments.
  - Grouped navigation menu sections for Personal Info, Privacy, Notifications, Sessions, and Language.
  - Language selection modal (English, Hindi, Marathi).
  - Developer Mode modal trigger with fast customer switching and simulated data.
  - Danger zone for session logout and permanent account deletion.
- **Edit Personal Information** (`app/profile/edit.tsx`):
  - Full Name, Email, Gender selector chips, Native 18+ Date of Birth picker, and Verified Phone badge.
- **Family & Shared Hub** (`app/profile/family/index.tsx` & `add.tsx`):
  - Organizer group card, shared payment toggle, member list with permission chips, add member form, and remove confirmation.
- **Emergency & Trusted Contacts** (`app/profile/emergency.tsx`):
  - Safety banner, multi-contact cards with primary & auto-share badges, modal for adding contacts with preset relationships.
- **Privacy & Security** (`app/profile/privacy.tsx`):
  - Location sharing precision, family trip tracking, ad personalization toggles, and security safeguards info.
- **Notification Preferences** (`app/profile/notifications.tsx`):
  - Ride updates, driver arrival proximity, promotions, and non-disableable safety alerts.
- **Active Devices & Sessions** (`app/profile/sessions.tsx`):
  - Current device indicator, remote session list, individual session revocation, and logout from all devices.
- **Account Deletion Flow** (`app/profile/delete-account.tsx`):
  - Irreversible warning banner, consequences checklist, reason selector, explicit confirmation checkbox, and soft deletion execution.

### 4. Localization (i18n)
- Created `src/i18n/index.ts` supporting `en` (English), `hi` (Hindi), and `mr` (Marathi) with dynamic hook `useTranslation()` and persistent language storage.

### 5. Quality Assurance & Testing
- **TypeScript Check**: `npx tsc --noEmit` passed with 0 errors.
- **Smoke Tests**: `backend/scripts/test_feature1_customer_core.py` passed with 100% assertions across all models, services, and cross-app contracts.

---

## Feature 2: Customer Address & Location Management (Completed)

### 1. Database & ORM Layer
- **Saved Addresses (`saved_addresses`)**:
  - Full CRUD with PostGIS `POINT(lng lat)` geography, latitude, longitude, label, category (`home`, `work`, `gym`, `partner`, `other`), full address string, district, pincode, and `is_default` flag.
- **Saved Routes (`saved_routes`)**:
  - Stored pickup & drop coordinate pairs with human-readable labels and route nickname for 1-tap bookings.

### 2. Backend REST APIs
- `/api/v1/profile/me/addresses` (`GET`, `POST`, `PATCH`, `DELETE`): Managed in `auth-service`.
- `/api/v1/profile/me/routes` (`GET`, `POST`, `DELETE`): Managed in `auth-service`.

### 3. Mobile UI/UX Implementation (`apps/customer-app`)
- **Saved Places & Routes Hub** (`app/profile/addresses.tsx`):
  - Filter chips for `All`, `Places`, and `Routes`.
  - Themed cards with custom category colors and icons (`Home 🏠`, `Work 💼`, `Gym 🏃`, `Partner 💖`, `Other 📍`).
  - Delete with safety confirmation alert.
  - 1-tap navigation to edit or create new address/route.
  - Pull-to-refresh and empty states.
- **Interactive Map Address Picker** (`app/profile/address-picker.tsx`):
  - Google Map with real-time center pinpoint drag and reverse geocoding.
  - Persistent recent search cache (`@customer_recent_searches`) with 1-tap recall and clear history.
  - Floating GPS Re-center FAB button.
  - Step 1 (Pinpoint & Search) $\rightarrow$ Step 2 (Category chip selector, custom label, and optional flat/building landmark details).
- **Saved Route 3-Step Wizard** (`app/profile/route-picker.tsx`):
  - Step 1 (Pickup Location) $\rightarrow$ Step 2 (Drop Destination) $\rightarrow$ Step 3 (Route Nickname).
  - Visual route connection card with green pickup & red drop dots.
- **Localization (i18n)**:
  - English (`en`), Hindi (`hi`), and Marathi (`mr`) translations for all address, search, and route actions.

### 4. Quality Assurance & Testing
- **TypeScript Check**: `npx tsc --noEmit` passed with 0 errors.
- **Smoke Tests**: `backend/scripts/test_feature2_customer_address.py` passed with 100% assertions across all address & route operations.

---

## Feature 2 (Part B): Customer Home / Service Discovery (Completed)

### 1. Service Catalog & Multi-Service Engine
- **Dynamic Service Catalog API (`GET /api/v1/services/catalog`)**:
  - Authoritative service registry returning core services (`Intercity Cab 🚕`, `Send Parcel 📦`, `Book Hotel 🏨`, `Transport & Bus 🚌`, `Airport Drop ✈️`) and future services (`Car Rental 🔑`, `Corporate Rides 💼`, `Packers & Movers 🚚`).
  - Strict status badges: `AVAILABLE` (routes to real booking flow) and `COMING_SOON` (triggers informative popup).

### 2. Unified Customer Home Summary API (`GET /api/v1/customer/home/summary`)
- Aggregated fast payload returning:
  - Time-aware customer greeting (`Good Morning`, `Good Afternoon`, `Good Evening`) with verified status.
  - Active Ride in Progress context (Driver name, car model, plate, 4.9★ rating, live OTP, ETA in mins).
  - Upcoming scheduled booking (if present).
  - Active promotions & festival offer codes (`DIWALI2026`, `PARCEL50`).
  - Unread notifications counter.

### 3. Mobile UI/UX Implementation (`apps/customer-app/app/(tabs)/index.tsx`)
- **Real-Time GPS Location Bar**:
  - Live accuracy feedback, reverse geocoded address, and 1-tap permission prompt / location picker.
- **Search Bar**: "Where are you heading today?" with 1-tap route to booking flow.
- **Live Active Ride Card**:
  - Pulsing status dot, driver phone call shortcut, Start OTP chip, and "Live GPS →" navigation.
- **Multi-Service Tile Grid**:
  - 8 distinct services with custom category icons and status badges.
- **Coming Soon Modal**:
  - Graceful informative popup for unlaunched services without breaking UI.
- **1-Tap Saved Shortcuts**:
  - Quick-select chips for `Home`, `Work`, `Partner`, and `+ Add Place`.
- **Recent Destinations**:
  - List of past destinations with direct re-booking.
- **Offers & Promotions Carousel**:
  - Beautiful gradient cards with 1-tap coupon copy alert.
- **Localization (i18n)**:
  - English (`en`), Hindi (`hi`), and Marathi (`mr`) translations for all home widgets.

### 4. Quality Assurance & Regression Testing
- **TypeScript Check**: `npx tsc --noEmit` $\rightarrow$ **0 Errors**.
- **Backend Smoke Tests**: `test_feature2_customer_home.py` $\rightarrow$ **100% PASS**.
- **Full Regression**: Feature 1 Core Account, Feature 2 Address Management, and Feature 2 Home Discovery all passing.

---

## Feature 3: Cab Booking — Complete End-to-End Master Flow (Completed)

### 1. Functional Engine & Contracts
- **Dynamic Backend Categories**:
  - `rideApi.getCategories` (`GET /api/v1/rides/categories`) dynamically loads active categories (`Economy / Hatchback`, `Sedan`, `SUV`, `Premium`, `EV`, `Bike`, `Auto`).
  - Zero hardcoding on frontend; rates, base fare, per km, per min, minimum fare, and surge multiplier are backend-authoritative.
- **Multi-Stop Intermediate Routing (`MAX_STOPS = 3`)**:
  - Allows adding up to 3 intermediate stops with draggable reordering and sequence tracking.
  - Automatically recalculates multi-segment route distance, duration, and adjusted fare.
- **Authoritative Fare Engine & Transparency**:
  - Base Fare + Distance Charge + Duration Charge + Toll + Tax + Platform Fee + Dynamic Surge - Promo Discount = Total Payable.
- **Booking Participant & Ownership Contract (Feature 1)**:
  - `is_booked_for_other`, `rider_type` (`SELF` | `FAMILY_MEMBER` | `GUEST`), `rider_name`, `rider_phone`.
  - Account owner's payment and private data remain strictly masked from driver.
- **Pickup Notes & Entry Details**:
  - Added gate number, landmark, and entrance instructions stored securely for assigned driver.
- **Idempotency Protection**:
  - `booking_request_id` (UUIDv4) prevents duplicate ride creation on double tap or network retries.

### 2. Mobile UI/UX Implementation (`apps/customer-app/app/book/cab.tsx`)
- **Ride Mode Switcher**: `One-Way 🚗`, `Round-Trip 🔄`, `Rental ⏱️`.
- **Location Selector & Multi-Stops**: Pickup & Drop text inputs, intermediate stop inputs with `+ Add Stop` and `✕ Remove Stop`.
- **Interactive Route Map Preview**: Google Map with polyline, pickup, stop, and drop pins, and floating Distance/ETA badge.
- **Dynamic Vehicle Category Selection Grid**: Horizontal cards loaded from backend showing vehicle icon, capacity, surge badge, and price.
- **Preferences & Safety**: `Myself vs Family Member` participant modal, `Payment Method` selector (`Cash`, `Wallet`, `UPI`, `Family Shared`), `Pickup Notes` accordion.
- **Transparent Fare Breakdown**: Detailed base ride charge, distance rate, travel time charge, surge multiplier, promo discount, and estimated total.

### 3. Quality Assurance & Regression
- **TypeScript Typecheck**: `npx tsc --noEmit` $\rightarrow$ **0 Errors**.
- **Smoke Test**: `backend/scripts/test_feature3_customer_booking.py` $\rightarrow$ **100% PASS**.
- **Full Regression**: Feature 1, Feature 2 (Address & Home Discovery), Feature 3, and Feature 4 all passed 100% green.

---

## Feature 3 (Part B): Live Ride Matching, Driver Assignment & Real-Time Tracking Flow (Completed)

### 1. Functional Engine & Contracts
- **Concentric Radar Wave Animation**:
  - 60fps concentric ripple animation with expanding outer rings and central pulse core.
  - Live nearby driver scan simulation & periodic PostGIS corridor location broadcast.
  - 120-second countdown with automatic socket room join (`bookingId` / `rideRequestId`).
- **Live Driver Location Streaming & Map Interpolation**:
  - `LOCATION_UPDATE` socket event listener with latitude, longitude, and rotating vehicle heading.
  - Recenter Driver FAB for rapid map viewport repositioning.
- **4-Stage Trip Progress Engine**:
  - Visual synchronized stages: `Assigned 🚗` $\rightarrow$ `Arrived 📍` $\rightarrow$ `In Progress 🛣️` $\rightarrow$ `Completed 🏁`.
- **Start PIN / OTP Banner**:
  - High-contrast 4-digit PIN banner (`4921`) with security tip: "Share this PIN with driver ONLY after entering cab".
- **Assigned Driver & Vehicle Profile Card**:
  - Driver Avatar, Name, Rating (`4.9 ★`), Car Model, License Plate (`MH-12-DE-4921`), 1-tap Phone Call (`tel:`), and in-app Chat trigger.
- **Emergency SOS Suite (Feature 1 Integration)**:
  - Red Emergency SOS action button triggering instant alert dispatch to Feature 1 trusted contacts & 112 emergency services.
  - 1-tap Live Trip Link Sharing (`Share.share`).
- **Structured Ride Cancellation Modal**:
  - Predefined reason options ("Driver too far", "Driver asked to cancel", "Changed plans", etc.) with cancellation confirmation and database state update.
- **Trips Hub Screen Upgrade (`app/(tabs)/trips.tsx`)**:
  - 1-tap "📍 Track Live Ride" action button on active bookings.

### 2. Quality Assurance & Regression Testing
- **TypeScript Typecheck**: `npx tsc --noEmit` $\rightarrow$ **0 Errors**.
- **Backend Smoke Test**: `backend/scripts/test_feature4_customer_tracking.py` $\rightarrow$ **100% PASS**.
- **Full Regression Suite**: Feature 1, Feature 2, Feature 3, and Feature 4 all passing 100%.

---

## Feature 4: Schedule / Reserve — Production-Grade Advance Reservation System (Completed)

### 1. Unified Architecture & Booking Contract
- **Immediate vs Scheduled Mode Switcher**:
  - `Book Now` (`⚡ Live Dispatch`) vs `Schedule Later` (`🗓️ Advance Reservation`) toggle on `app/book/cab.tsx`.
  - Unified data model: Shared `RideRequest` table with `is_scheduled = true`, `scheduled_pickup_time`, `scheduled_status = 'CONFIRMED'`.
- **Lead Time & Scheduling Horizon Guards**:
  - Minimum advance lead time: $\ge 45$ minutes from current UTC timestamp.
  - Maximum scheduling window: Up to 7 days in advance.
- **Native Cross-Platform Date & Time Selection**:
  - Quick Day Chips (`Today (+2h)`, `Tomorrow 10:30 AM`) and 15-min interval slot picker.
  - Timezone-aware ISO-8601 UTC timestamp transmission.
- **Authoritative Fare Engine & Transparency**:
  - Reuses dynamic category rate cards with estimated fare calculation.
- **Reservation Confirmed Success Sheet**:
  - Displays scheduled date/time, vehicle category, estimated fare, and driver dispatch notice ("Driver will be dispatched 45 mins before pickup").

### 2. Upcoming Reservations Hub & Management (`app/(tabs)/trips.tsx`)
- **Dedicated Scheduled Filter & Status Chips**:
  - Shows advance bookings with countdown header (`🗓️ Advance Reservation`).
- **Reservation Modification Modal**:
  - Allows customer to modify scheduled pickup time before driver dispatch.
  - Automatically updates database state and recalculates fare.
- **Reservation Cancellation with Policy Protection**:
  - Cancel advance booking with structured reasons and wallet refund policy check.
- **Seamless Live Dispatch Transition**:
  - 45 minutes before pickup (`dispatch_buffer_minutes`), ride transitions to `EN_ROUTE` and exposes 1-tap `📍 Track Live Driver` CTA.

### 3. Driver Ecosystem Integration (Driver Feature 26)
- Customer scheduled requests appear in Driver App's `Available Scheduled Hub` (`GET /scheduled/available`).
- Top-rated drivers atomically claim reservations (`POST /scheduled/{id}/accept`).
- Assigned drivers initiate pickup navigation 45 mins before scheduled time (`POST /scheduled/{id}/start-heading`).

### 4. Quality Assurance & Regression Testing
- **TypeScript Typecheck**: `npx tsc --noEmit` $\rightarrow$ **0 Errors**.
- **Feature 4 Smoke Test**: `backend/scripts/test_feature4_customer_schedule.py` $\rightarrow$ **100% PASS**.
- **Full Regression Suite**: All passing 100%.

---

## Feature 5: Negotiation / Own Fare Model (Completed)

### 1. Customer Fare Negotiation & Stepper Engine (`app/book/cab.tsx`)
- **Pricing Mode Switcher**:
  - `⚡ Standard Fare (₹280)` vs `🤝 Your Offer / Negotiate (₹250)`.
- **Offer Stepper Card**:
  - Center display with quick increment/decrement buttons (`- ₹100`, `- ₹50`, `+ ₹50`, `+ ₹100`).
  - **Dynamic Range Guard**: Enforces $\ge 70\%$ minimum threshold and $\le 150\%$ upper bound.
  - Contextual helper tip with recommended offer range (`Suggested Range: ₹240 – ₹270`).
- **Transactional Request Creation**:
  - Stores `seat_preferences.pricing_mode = 'NEGOTIATED'`, `customer_offer: 250`, and initial estimated fare.

### 2. Real-Time Driver Comparison & Negotiation Hub (`app/negotiation.tsx`)
- **Header & 45-Second Countdown Timer**:
  - Live timer pill with auto-timeout transition.
- **Concentric Radar Wave Animation**:
  - Smooth 60fps wave effect broadcasting offer to nearby PostGIS eligible drivers.
- **Live Incoming Driver Offer Cards**:
  - Real-time comparison displaying Driver Avatar, Name, Rating (`★ 4.9`), Completed Trips (`2,180 rides`), Vehicle Model & Color (`White Honda City`), License Plate (`MH-14-AB-9012`), and Arrival ETA (`3 min away`).
  - **Offer Badges**:
    - `Exact Match (₹250)`: Driver accepted customer's exact proposal.
    - `Competitive Offer (₹240)`: Driver offered a discounted best price.
    - `Counter-Offer (₹270)`: Driver proposed an adjusted fare.
- **Atomic Selection & Competing Invalidation**:
  - Tapping `Accept & Ride (₹XXX)` executes an atomic transaction: sets `assigned_driver_id`, updates `estimated_fare`, supersedes all competing `RideOffer` records, and redirects to Live Tracking (`/track`).
- **Auto-Matching Fallback Engine**:
  - 1-tap **"Switch to Standard Dispatch (₹280)"** button resets pricing mode to standard and transitions to standard driver matching without drop-off.

### 3. Driver Ecosystem Integration (Driver Counter Offer)
- Nearby eligible drivers receive `RIDE_OFFER` with customer's proposed amount.
- Drivers can `Accept`, `Counter`, or `Reject`.
- Reuses existing driver earnings and commission calculations.

### 4. Quality Assurance & Regression Testing
- **TypeScript Typecheck**: `npx tsc --noEmit` $\rightarrow$ **0 Errors (Exit code 0)**.
- **Feature 5 Smoke & Integration Test**: `backend/scripts/test_feature5_customer_negotiation.py` $\rightarrow$ **100% PASS**.
- **Full 7-Feature Regression Suite**:
  - `test_feature1_customer_core.py` $\rightarrow$ **PASS**
  - `test_feature2_customer_address.py` $\rightarrow$ **PASS**
  - `test_feature2_customer_home.py` $\rightarrow$ **PASS**
  - `test_feature3_customer_booking.py` $\rightarrow$ **PASS**
  - `test_feature4_customer_tracking.py` $\rightarrow$ **PASS**
  - `test_feature4_customer_schedule.py` $\rightarrow$ **PASS**
  - `test_feature5_customer_negotiation.py` $\rightarrow$ **PASS**
  - **`=== ALL FEATURES PASSED SUCCESSFULLY (100% GREEN)! ===`**

---

## Feature 6: Driver Tracking (Completed)

### 1. Live Driver Tracking & Movement Engine (`app/track.tsx`)
- **Authoritative Backend Location Pipeline**:
  - `Driver GPS` $\rightarrow$ `POST /rides/{id}/location` $\rightarrow$ `Redis` $\rightarrow$ `Socket.IO LOCATION_UPDATE` $\rightarrow$ `Customer Map Marker`.
  - Zero Google API queries on GPS updates; marker movement is interpolated locally with dynamic `heading` rotation.
- **Location Freshness Engine**:
  - Real-time indicator: `LIVE 🟢` ($< 10$s), `RECENT 🟡` ($10\text{--}30$s), `Updating GPS... ⚠️` ($> 30$s).
- **4-Stage Trip Progression Engine**:
  - `Stage 1: ASSIGNED 🚗`: Driver en route to pickup. Live ETA & Distance pill with high-contrast Boarding Start PIN (`Start PIN: 4921`).
  - `Stage 2: ARRIVED 📍`: Push alert and arrival banner when driver crosses PostGIS pickup geofence.
  - `Stage 3: IN_PROGRESS 🛣️`: PIN validated $\rightarrow$ Map automatically switches polyline and tracking to Destination (e.g. Pune $\rightarrow$ Mumbai).
  - `Stage 4: COMPLETED 🏁`: Trip ends $\rightarrow$ Tracking session cleanly terminates $\rightarrow$ Customer navigates to Receipt and Rating (`/rate-trip`).

### 2. Safety Suite & Live Trip Sharing
- **Emergency SOS Trigger**:
  - Dispatches emergency alert to registered `CustomerEmergencyContact` members and launches emergency dialer (`tel:112`).
- **Short-Lived Trip Sharing (`POST /safety/rides/{id}/share`)**:
  - Generates secure temporary URL (`https://cab.app/track/{token}`) allowing trusted family members to monitor the trip in real time. Access auto-expires when the trip completes.
- **Masked Driver Communication**:
  - In-app chat and proxy masked calling (`tel:`) without exposing driver or customer private numbers.

### 3. Quality Assurance & Regression Testing
- **TypeScript Typecheck**: `npx tsc --noEmit` $\rightarrow$ **0 Errors (Exit code 0)**.
- **Feature 6 Master Tracking Test**: `apps/customer-app/scripts/test_feature6_customer_tracking_master.py` $\rightarrow$ **100% PASS**.
- **Full System Regression**: All 7 test suites passing 100% green.



---

## Feature 5: Negotiation / Own Fare Model (Completed)

### Architecture Philosophy
Negotiation is implemented as a **pricing mode layer** over the existing `RideRequest` infrastructure — not a separate ride system. `pricingMode: 'NEGOTIATED'` triggers a different dispatch path on the backend (broadcast customer's `customer_offer_amount` to nearby drivers), while all state transitions, PostGIS driver discovery, and atomic assignment remain in the existing engine.

### 1. API Layer (`src/api/client.ts`)

**Extended `rideApi.createRequest`**:
- `pricing_mode: 'STANDARD' | 'NEGOTIATED'` — signals dispatch strategy to backend.
- `customer_offer_amount: number` — customer's proposed fare (NEGOTIATED mode only).
- `negotiation_idempotency_key: string` — client-generated UUID to prevent duplicate negotiation sessions on retry.

**Extended `negotiationApi`** with full lifecycle:
- `getNegotiationState(rideRequestId)` — `GET /matching/rides/{id}/negotiation-state`: reconnect restore.
- `acceptOffer(rideRequestId, offerId)` — `POST .../offers/{id}/accept`: atomic assignment trigger.
- `rejectOffer(rideRequestId, offerId)` — `POST .../offers/{id}/reject`: reject driver offer.
- `acceptCounterOffer(rideRequestId, offerId)` — `POST .../offers/{id}/accept-counter`: accept counter-offer specifically (audit trail).
- `rejectCounterOffer(rideRequestId, offerId)` — `POST .../offers/{id}/reject-counter`: reject counter.
- `fallbackToStandard(rideRequestId)` — switch to standard dispatch.
- `cancelNegotiation(rideRequestId, reason)` — close all offers, cancel session.

### 2. Socket Layer (`src/hooks/useCustomerSocket.ts`)

**7 new `SocketEvent` types added**:
| Event | Trigger |
|---|---|
| `NEGOTIATION_DRIVER_OFFER` | Driver responds with exact/competitive/counter offer |
| `NEGOTIATION_OFFER_ACCEPTED` | Driver accepted customer's exact price |
| `NEGOTIATION_OFFER_REJECTED` | Driver declined customer's price |
| `NEGOTIATION_OFFER_EXPIRED` | A specific driver's offer timed out |
| `NEGOTIATION_SESSION_EXPIRED` | Full session timed out — no acceptances |
| `NEGOTIATION_ASSIGNED` | Atomic assignment confirmed by backend |
| `NEGOTIATION_FALLBACK` | Backend switched to standard dispatch |

**4 new typed payload interfaces**: `NegotiationDriverOfferPayload`, `NegotiationSessionExpiredPayload`, `NegotiationAssignedPayload`, `NegotiationFallbackPayload`.

**Reactive state fields + clearers** exported for screen consumption.

### 3. Negotiation Hub Screen (`app/negotiation.tsx`)

**Production-grade negotiation engine**:
- **Real Socket.IO integration**: `useCustomerSocket` consumes all `NEGOTIATION_*` events.
- **Socket room management**: `joinTrip(rideRequestId)` on connect, `leaveTrip` on unmount.
- **Reconnect restore**: Calls `negotiationApi.getNegotiationState()` on reconnect to restore live offer list.
- **Per-offer countdown**: `useOfferExpiry(expires_at)` hook drives per-card countdown; Accept button auto-disabled on expiry.
- **Counter-offer modal**: Bottom-sheet modal with fare comparison (Your Offer vs Driver Counter), Accept/Reject CTAs, driver details.
- **Session expiry handler**: `NEGOTIATION_SESSION_EXPIRED` → `sessionExpired=true` → expired banner + promoted fallback CTA.
- **Atomic assignment**: `NEGOTIATION_ASSIGNED` → `Alert` with driver info → `router.replace('/track')`.
- **Fallback**: `NEGOTIATION_FALLBACK` / button → `router.replace('/matching-waiting')`.
- **Cancel**: `cancelNegotiation()` API + `router.back()`.
- **Dev simulation**: `setTimeout` simulated offers gated behind `__DEV__` — never run in production.
- **Timer UX**: Session countdown pill changes color: green → amber (< 60s) → red (< 20s).

### 4. Booking Screen (`app/book/cab.tsx`)

**Scheduling guard**: When user selects "Schedule Later" with `pricingMode='NEGOTIATED'`:
- Auto-switches to `'STANDARD'` pricing mode.
- Shows `Alert` explaining negotiation is unavailable for advance reservations.

**Negotiate button dimming**: Button rendered at `opacity: 0.4` when `bookingType='SCHEDULED'`; tap shows informational Alert.

**Payload enrichment**: `pricing_mode`, `customer_offer_amount`, and `negotiation_idempotency_key` now explicitly sent in `rideApi.createRequest`.

### 5. Negotiation State Machine

```
cab.tsx: NEGOTIATED mode + customOffer slider set
       ↓
POST /rides/request { pricing_mode: NEGOTIATED, customer_offer_amount: 250 }
       ↓
negotiation.tsx: socket.joinTrip(rideRequestId)
       ↓ Socket: NEGOTIATION_DRIVER_OFFER
DriverOfferItem[] renders (EXACT_MATCH | COMPETITIVE_OFFER | COUNTER_OFFER)
Per-card expires_at countdown runs

[Customer accepts EXACT/COMPETITIVE offer]
       → negotiationApi.acceptOffer() → NEGOTIATION_ASSIGNED → /track

[Driver sends COUNTER_OFFER]
       → Counter-offer modal opens (fare comparison)
       → Accept → negotiationApi.acceptCounterOffer() → NEGOTIATION_ASSIGNED → /track
       → Reject → negotiationApi.rejectCounterOffer() → Modal closes, offer removed

[Session timeout / all rejected]
       → Socket: NEGOTIATION_SESSION_EXPIRED → sessionExpired=true
       → Fallback CTA prominent
       → negotiationApi.fallbackToStandard() → /matching-waiting

[Customer cancels]
       → negotiationApi.cancelNegotiation() → router.back()
```

### 6. Quality Assurance

- **Smoke Test**: `scripts/test_feature5_negotiation.py` — **72/72 PASS (100%)**
- **TypeScript**: `npx tsc --noEmit` — **0 errors (Exit code 0)**
- **Driver App compatibility**: Existing `RIDE_REQUEST_NEW` socket event unchanged; `RideRequestService.respondToOffer` unchanged. No Driver App modifications required.
- **Idempotency**: `negotiation_idempotency_key` prevents double-submission on network retry.
- **Race condition safety**: Backend `acceptOffer` atomically marks session and invalidates competing offers.

---

## Feature 7: Pickup / Start Ride & Feature 8: During Ride (Completed)

### Architecture Overview
Features 7 & 8 establish the core transactional active ride lifecycle between Customer App, Driver App, Backend Ride State Machine, and Database.

```
DRIVER_EN_ROUTE 
  ↓ (PostGIS Geofence <= 100m)
ARRIVED_AT_PICKUP (Vehicle Verification Checklist + Start PIN 4921)
  ↓ (Driver submits PIN via Driver App)
RIDE_STARTED (Atomic SELECT FOR UPDATE committal -> IN_PROGRESS)
  ↓ (Socket: TRIP_STARTED, LOCATION_UPDATE, WAITING, STOPS, TOLLS)
DURING RIDE (Live Telemetry, Waypoints, Destination Updates, Waiting, Tolls, Chat, SOS)
  ↓ (Driver reaches destination)
TRIP_COMPLETED (Clean socket teardown -> /rate-trip transition)
```

### 1. API Layer (`src/api/client.ts`)
- **`duringRideApi`**:
  - `addStop(rideId, { address, latitude, longitude })`: Enforces max 3 stops, applies +₹30 stop fee.
  - `modifyDestination(rideId, { destination_address, destination_lat, destination_lng })`: Updates road coordinates and recalculates live fare.
  - `getWaitingStatus(rideId)`: Fetches server-authoritative waiting timer and accrued paid waiting charges.
  - `reportPickupIssue(rideId, { issue_type, notes })`: Reports vehicle mismatch, wrong driver, or unsafe situation to safety moderation.
- **`communicationApi`**:
  - `sendMessage({ ride_id, message_text })`: Real-time passenger ↔ driver in-app messaging.
  - `getMessages(rideId)`: Chat history retrieval for active ride.
  - `initiateMaskedCall({ ride_id })`: Launches masked proxy call without exposing personal numbers.

### 2. Socket Layer (`src/hooks/useCustomerSocket.ts`)
- **During-ride events added**: `STOP_ADDED`, `STOP_ARRIVED`, `STOP_DEPARTED`, `DESTINATION_UPDATED`, `WAITING_STARTED`, `PAID_WAITING_STARTED`, `WAITING_STOPPED`, `TOLL_ADDED`, `FARE_UPDATED`, `NEW_CHAT_MESSAGE`.
- **Reactive state hooks & clearers** exported for UI consumption.

### 3. Active Ride UI & Interactions (`app/track.tsx`)
- **Vehicle Verification Badge**: Prominently displays Make, Model, Color, and License Plate with one-tap wrong vehicle/driver report modal.
- **Start PIN / OTP Banner**: High-contrast 4-digit code (`4921`) with security instructions.
- **Add Intermediate Stop Modal**: Address input, sequence counter, and automatic +₹30 fare update.
- **Change Destination Modal**: In-flight destination update with live fare recalculation.
- **Live Waiting Indicator**: Real-time timer pill tracking free buffer vs paid waiting rate.
- **Toll Encountered Banner**: Displays expressway tolls (e.g. +₹320) added to the dynamic fare.
- **In-App Live Chat Modal**: Real-time chat with quick-reply chips and driver messaging.
- **Emergency SOS & 3-Hour Trip Sharing**: Native 112 dialer, trusted contact SMS alerts, and short-lived URL sharing.

### 4. Quality Assurance & Regression Testing
- **Master Automated Test**: `scripts/test_feature7_8_active_ride_master.py` $\rightarrow$ **100% PASS**.
- **TypeScript Typecheck**: `npx tsc --noEmit` $\rightarrow$ **0 Errors (Exit code 0)**.
- **Full Regression Suite**: Features 4, 5, 6, 7+8 $\rightarrow$ **ALL GREEN (100%)**.

