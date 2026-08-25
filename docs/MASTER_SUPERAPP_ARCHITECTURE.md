# Master SuperApp Service Architecture (Production Reference)

## Executive Summary
This document serves as the **authoritative master architecture blueprint** for the Cab Management / Multi-Service SuperApp platform, spanning:
- **Customer App** (React Native — iOS / Android)
- **Driver App** (React Native — iOS / Android)
- **Hotel / Logistics Partner Interfaces** (Web / React Native)
- **FastAPI Backend Services** (Python, SQLAlchemy, PostGIS, AsyncPG)
- **PostgreSQL Database** (Source of Truth, PostGIS Spatial Engine, H3 Indexing)
- **Realtime Layer** (Socket.IO, Redis Pub/Sub, FCM / APNs Push Notifications)
- **Media & Assets** (Cloudinary)

---

## 1. Master Platform Architecture

```
                                  CUSTOMER
                                     │
                              ORDER / REQUEST
                                     │
                             SERVICE ADAPTER
                                     │
      ┌──────────────┬───────────────┼───────────────┬──────────────┬──────────────┐
      │              │               │               │              │              │
    RIDE          PARCEL         TRANSPORT        AIRPORT        RENTAL       OUTSTATION
      │              │               │               │              │              │
   DRIVER         DRIVER      DRIVER/PARTNER      DRIVER         DRIVER         DRIVER
      │              │               │               │              │              │
      └──────────────┴───────────────┼───────────────┴──────────────┴──────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
              INTERCITY      PACKERS & MOVERS         HOTEL
                  │                  │                  │
          PUBLISHED DRIVER    PARTNER / DRIVER    HOTEL PARTNER
                                                        │
                                                 [Optional Transfer]
                                                        │
                                                     DRIVER

                                 CORPORATE
                                     │
                         COMPANY POLICY & APPROVAL
                                     │
                       DELEGATED TO EXISTING SERVICE
```

---

## 2. Common Core Engine (Shared Subsystems)

All 10 services reuse the foundational platform core while maintaining strictly isolated business logic:

| Subsystem | Responsibility | Reused By |
| :--- | :--- | :--- |
| **Identity & Auth** | JWT issuance, biometric token refresh, multi-device trust, step-up challenges | All Users (Customer, Driver, Partner, Admin) |
| **Common Domain Model** | `Order` $\to$ `Job` $\to$ `Trip` Polymorphic references | All 10 Services |
| **Spatial Engine** | PostGIS `ST_DWithin`, `ST_Distance`, H3 Hex Spatial Cells (Res 7), Service Cities | Ride, Parcel, Transport, Airport, Rental, Outstation, Intercity, Movers |
| **Dispatch & Candidate Provider** | 3-Mode Spatial Discovery: Nearby Proximity, City Coverage, Hex Monitoring | All Driver-based services |
| **Atomic Concurrency Shield** | PostgreSQL `SELECT FOR UPDATE` (First valid accept wins, losers superseded) | All on-demand & quotation offers |
| **Financial Ledger & Wallet** | Double-entry ledger, gross fare, platform commission (e.g. 20%), net payout (80%) | All Paid Services |
| **Realtime Engine** | Redis Pub/Sub event bridge, Socket.IO rooms (`driver:{id}:events`, `customer:{id}:events`) | All Live Order Workflows |
| **Notification Engine** | Foreground Socket.IO Siren, Background High-Priority Push (Expo/FCM), APNs | All Users & Background Workers |
| **Safety Engine** | In-ride 24x7 SOS, Live GPS Sharing, Route Deviation Anomaly, Unexpected Stops | All Driver Transportation Services |
| **Activity Hub** | Polymorphic cursor-paginated timeline across all 10 service categories | Customer & Driver Activity Feeds |
| **Help & Support Hub** | Service-linked support tickets (`reference_type`, `reference_id`), contextual AI Assistant | All Service Inquiries |
| **Smart Intelligence** | Dynamic destination prediction, vehicle sizing recommendation, surge signals | Customer Experience Layer |
| **Cloudinary Media** | Driver KYC documents, vehicle inspection photos, Proof of Delivery (POD) signatures/photos | Verification & POD |

---

## 3. Master Domain Model Hierarchy

```
                    ┌────────────────────────┐
                    │         ORDER          │  <-- Customer Business Transaction
                    │  - order_id            │      (Payer, Service Type, Total Fare)
                    │  - customer_id         │
                    │  - status, created_at  │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │          JOB           │  <-- Operational Assignment
                    │  - job_id              │      (Driver/Partner Work Unit)
                    │  - driver_id           │
                    │  - vehicle_id          │
                    │  - status              │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │          TRIP          │  <-- Physical Transportation Leg
                    │  - trip_id             │      (Start/End Time, GPS, Telemetry)
                    │  - start_pin / otp     │
                    │  - live_location       │
                    └───────────┬────────────┘
                                │
                                ▼
    ┌───────────────────────────┴───────────────────────────┐
    │                                                       │
    ▼                                                       ▼
┌───────────────────────────┐               ┌───────────────────────────┐
│ SERVICE SPECIFIC ENTITY   │               │ FINANCIAL SETTLEMENT      │
│ (ride_orders, parcel_pod, │               │ (earnings_ledger,         │
│  transport_quotes,        │               │  platform_commission,     │
│  hotel_bookings)          │               │  wallet_transactions)     │
└───────────────────────────┘               └───────────────────────────┘
```

---

## 4. Master Service Matrix

| Service | Customer Creates | Who Receives | Who Accepts | Partner Entity | Live Tracking | Payment Flow | Driver Earnings |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **1. Cab / Ride** | Ride Request | Eligible Online Drivers | Winning Driver | No | Yes (Live GPS) | Upfront / Post-ride Cash/Online | 80% Net after 20% Fee |
| **2. Parcel** | Delivery Request | Eligible Drivers | Winning Driver | No | Yes (Live GPS) | Sender / Receiver / Online | Distance + Weight Tier Payout |
| **3. Transport / Freight** | Transport Request | Drivers / Transporters | Driver / Transporter | Yes | Yes (Live GPS) | Fixed / Counter Quote | Agreed Quote - Platform Fee |
| **4. Airport Transport** | Airport Ride / Schedule | Eligible Drivers | Winning Driver | Flight Provider Context | Yes (Live GPS) | Upfront / Card / Corporate | Base + Tolls + Parking + Earning |
| **5. Hourly Rental** | Rental Plan Request | Eligible Drivers | Winning Driver | No | Yes (Time/KM) | Package Base + Extra KM/Hour | Package Split + Overage |
| **6. Outstation** | One-way / Round-trip | Eligible Drivers | Winning Driver | No | Yes (Live GPS) | Multi-leg Upfront / Cash | Base + Allowance + Night Halt |
| **7. Intercity Carpool** | Seat Booking Request | Publishing Driver | Publishing Driver | No | Yes (Corridor) | Per-Seat Upfront / Wallet | Seat Price × Seats - Fee |
| **8. Packers & Movers** | Moving Request | Moving Partners / Teams | Moving Partner | Yes | Milestone / GPS | Advance + Completion Payout | Milestone Settlement |
| **9. Hotel Booking** | Hotel Reservation | Hotel Partner Admin | Hotel Partner | Yes (Property) | No Driver (Transfer Opt) | Upfront Hotel Gateway | Partner Settlement Net GST/Fee |
| **10. Corporate Business** | Business Request | Policy Engine $\to$ Service | Service Driver / Partner | Corporate Context | Service-dependent | Corporate Monthly Invoicing | Service Standard Payout |

---

## 5. Universal Security & Trust Boundaries

```
[CUSTOMER TRUST DOMAIN]                  [SECURITY FIREWALL]                 [DRIVER TRUST DOMAIN]
- Customer ID                            - Server-Authoritative Auth          - Driver ID
- Saved Payment Cards                    - Row-Level Locking (SELECT FOR UPDATE)- Driver Wallet
- Full Ride / Order History              - Token Rotation & Device Trust      - Vehicle Documents / KYC
- Private Home / Work Labels             - Masked PII Enforcement            - Performance & Payouts
       │                                         │                                      │
       ▼                                         ▼                                      ▼
  Customer UI ────────────────────────► Backend APIs & DB ◄────────────────────── Driver UI
                                                 │
                                                 ▼
                          Only Masked Operational Job Fields Shared:
                          - Passenger First Name (or "Rider")
                          - Masked Contact (+91 98••••2345)
                          - Pickup & Drop Coordinates
                          - Estimated Earnings (₹)
                          - 4-Digit Ride Start PIN
```

---

## 6. Pre-Implementation 32-Question Decision Matrix

Before modifying or implementing any service, the platform mandates answering the 32 core architecture questions:

1. **Who creates the request?** Customer, Employee, or Driver (Published Trip).
2. **Who receives the request?** Spatial candidate pool, Transporter network, or Hotel partner.
3. **Who can accept it?** First valid eligible Driver, Publishing Driver, or Partner.
4. **Who can reject it?** Contacted Candidate Driver.
5. **Does rejection cancel customer request?** **NO.** Request remains `MATCHING` and triggers wave expansion.
6. **What is the service state machine?** Distinct service enum (e.g. `PARCEL: AT_PICKUP -> PICKED_UP -> IN_TRANSIT -> DELIVERED`).
7. **Which Driver/Partner is eligible?** Active, KYC Approved, Online, Fresh Location, Service Qualified.
8. **Which vehicle is eligible?** Approved vehicle meeting capacity, class, and service type.
9. **What location data is required?** Pickup, Drop, Intermediate Stops, Terminal, or Monitored Hex.
10. **Does PostGIS apply?** Yes, `ST_DWithin` spatial candidate discovery and polygon geofencing.
11. **Does H3 apply?** Yes, Resolution 7 indexing for demand heatmaps and micro-zone monitoring.
12. **Does Routing API apply?** Road distance, turn-by-turn navigation, and accurate ETA computation.
13. **Does Socket.IO apply?** Yes, foreground live event delivery (`ride:request_available`, `LOCATION_UPDATE`).
14. **Does FCM/APNs apply?** Yes, background high-priority heads-up push with interactive Accept/Reject actions.
15. **What is stored in PostgreSQL?** Canonical source of truth: Orders, Jobs, Trips, Settlements, Receipts.
16. **What is stored in Redis?** Driver presence, temporary matching state, rate limits, Pub/Sub channels.
17. **What is stored in Cloudinary?** Driver KYC, vehicle inspection images, Delivery POD signatures/photos.
18. **Who pays?** Customer, Booking Owner, Corporate Billing Account, or Receiver (Parcel COD).
19. **Who earns?** Assigned Driver, Moving Team, or Hotel Partner.
20. **What commission applies?** Server-configured rate (e.g. 20% platform commission, 80% driver net).
21. **What happens on cancellation?** Cancellation policy check; fee assessed if driver already en route; offers invalidated.
22. **What happens when customer cancels?** Request status $\to$ `CANCELLED`; `RIDE_REQUEST_REMOVED` broadcast to drivers.
23. **What happens when driver rejects?** Offer status $\to$ `REJECTED`; candidate excluded; request stays `MATCHING`.
24. **What happens on simultaneous accepts?** `SELECT FOR UPDATE` awards ride to first winner; second receives `superseded`.
25. **What happens if network disconnects?** Cold start hydration (`GET /rides/radar`, `GET /trips/active`).
26. **What happens if app is in background?** Actionable push notification triggers background accept handler.
27. **What happens if app is killed?** Push notification launches app with deep-link to incoming modal or active trip.
28. **What happens if payment fails?** Grace period, fallback to cash, or settlement hold before next booking.
29. **What happens if external routing fails?** Haversine distance fallback with conservative velocity model.
30. **What is the fallback?** Multi-wave dispatch radius expansion (15km $\to$ 25km $\to$ Broadcast).
31. **What is the security boundary?** Strict domain separation; client values never trusted for fares or credentials.
32. **What is the E2E test?** Automated test suite validating lifecycle from creation to double-entry settlement.
