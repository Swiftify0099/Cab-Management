# Driver App Development & Architecture Log

## Overview
This engineering log tracks the architecture, components, services, and verification milestones of the **Driver App** within the SuperApp platform.

---

## 1. Driver Subsystems & Components

### 1.1 Multi-Mode Dispatch & Smart Radar
- **Component**: `apps/driver-app/app/(tabs)/smart-radar.tsx` & `apps/driver-app/src/hooks/useDriverSocket.ts`
- **Backend Service**: `backend/matching-service/app/services/smart_radar.py` & `spatial_resolver.py`
- **Capabilities**:
  - Live spatial scanning of real candidate requests across 3 modes:
    1. **Nearby Proximity** (PostGIS `ST_DWithin` $\le 15\text{ km}$)
    2. **Specific City Coverage** (Driver selected cities)
    3. **Specific Hex Monitoring** (H3 Resolution 7 cells)
  - Multi-factor scoring engine ranking candidates by Driver Preference mode (`BALANCED`, `MAX_EARNING`, `SHORTEST_ETA`, `DESTINATION_ALIGNED`).
  - Zero-mock policy: only authoritative database records from `ride_requests` and `ride_offers` rendered.

---

### 1.2 Incoming Request Alert & Concurrency Shield
- **Component**: `apps/driver-app/app/incoming-request.tsx`
- **Capabilities**:
  - Full-screen incoming request modal with continuous audio siren and haptic vibration.
  - Interactive Accept and Reject buttons.
  - **Double-Accept Race Shield**: Uses PostgreSQL `SELECT ... FOR UPDATE` row-locking. First driver to accept is assigned; competing driver receives a clean `superseded` status.
  - **Automatic Modal Dismissal**: When competitor accepts or customer cancels, backend emits `RIDE_REQUEST_REMOVED`, immediately dismissing the modal and silencing sirens on other drivers' devices.

---

### 1.3 3 KM Proximity OTP & Authoritative Ride Start
- **Component**: `apps/driver-app/app/active-trip.tsx`
- **Backend Service**: `backend/matching-service/app/services/ride_start_service.py`
- **Capabilities**:
  - When driver reaches $\le 3000\text{ m}$ of pickup, backend auto-delivers 4-digit PIN to customer.
  - Driver arrives at pickup $\to$ requests PIN from passenger $\to$ enters in driver verification panel.
  - Backend verifies hash and locks out after 5 consecutive failed attempts.
  - Successful verification transitions ride status to `IN_PROGRESS`.

---

## 2. Multi-Channel Notification Lifecycle

```
Driver State: FOREGROUND
  └── Socket.IO receives `RIDE_REQUEST_NEW`
        └── Pops `IncomingRequestModal` + Plays Audio Siren

Driver State: BACKGROUND / LOCKED
  └── FCM / APNs High-Priority Push with Category `INCOMING_RIDE`
        └── Action Buttons: [Accept] [Decline]
              └── Tapping [Accept] invokes `/api/v1/rides/respond` via Headless Task

Driver State: COLD START / RECONNECT
  └── App invokes `/api/v1/matching/rides/radar` & `/api/v1/driver/trips/active`
        └── Restores radar feed and in-flight active ride state
```

---

## 3. Financial Ledger & Earnings Settlement
- **Backend Service**: `backend/matching-service/app/services/trip_completion_service.py`
- **Rules**:
  - Double-entry ledger postings (`DriverEarningLedger`).
  - Platform commission dynamically calculated (e.g. 20% platform fee, 80% driver net).
  - Cash vs Digital payment reconciliation.
  - Immutable ride receipts (`RideReceipt`).

---

## 4. Verification Milestones

| Milestone | Subsystem | Test Suite | Result |
| :--- | :--- | :--- | :---: |
| **M1** | 3-Mode Candidate Discovery | `verify_master_dispatch_e2e.py` | ✅ 100% Passed |
| **M2** | Atomic First Accept Wins | `verify_master_dispatch_e2e.py` | ✅ 100% Passed |
| **M3** | Driver Rejection Resilience | `verify_master_dispatch_e2e.py` | ✅ 100% Passed |
| **M4** | 3 KM Proximity OTP Delivery | `verify_master_dispatch_e2e.py` | ✅ 100% Passed |
| **M5** | Authoritative Ride Start Verification | `verify_master_dispatch_e2e.py` | ✅ 100% Passed |
| **M6** | Double-Entry Earnings Settlement | `verify_master_dispatch_e2e.py` | ✅ 100% Passed |
| **M7** | Customer Cancellation Offer Cleanup | `verify_master_dispatch_e2e.py` | ✅ 100% Passed |
| **M8** | Service 2: Parcel Logistics & 2-Phase POD | `verify_service2_parcel_e2e.py` | ✅ 100% Passed |
| **M9** | Service 3: Freight Bidding & Transporter Execution | `verify_service3_transport_e2e.py` | ✅ 100% Passed |
| **M10** | Service 4: Airport Transport & Terminal Grace Period | `verify_service4_airport_e2e.py` | ✅ 100% Passed |
| **M11** | Service 5: Hourly Rental Timer & Overage Settlement | `verify_service5_rental_e2e.py` | ✅ 100% Passed |
| **M12** | Service 6: Outstation Multi-Leg & Allowance Settlement | `verify_service6_outstation_e2e.py` | ✅ 100% Passed |
| **M13** | Service 7: Carpool Corridor Booking & 85/15 Settlement | `verify_service7_carpool_e2e.py` | ✅ 100% Passed |
| **M14** | Service 8: Packers & Movers Milestones & POD Settlement | `verify_service8_packers_e2e.py` | ✅ 100% Passed |
| **M15** | Service 9: Hotel Partner Roster & Hospitality Check-In | `verify_service9_hotel_e2e.py` | ✅ 100% Passed |
| **M16** | Service 10: Corporate Policy Approvals & Invoicing | `verify_service10_corporate_e2e.py` | ✅ 100% Passed |
