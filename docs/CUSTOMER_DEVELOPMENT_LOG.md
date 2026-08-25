# Customer Development Log — Features 22 to 25

## Feature 22: Book for Someone Else (Participant & Identity Architecture)
- **Files Modified / Created**:
  - `backend/common/models/all_models.py` (SavedRider model with foreign key indices)
  - `backend/auth-service/app/api/v1/riders.py` (Participant listing & saved contacts API)
  - `apps/customer-app/app/book/rider-selection.tsx` (Participant selector with Self, Family, Saved Guests, Corporate)
  - `backend/scripts/verify_customer_feature22_book_for_others.py` (E2E test suite: 6/6 passed)
- **Key Architecture Rules Enforced**:
  - `Booking Owner ≠ Actual Rider ≠ Driver`: Database enforces distinct `customer_id` (payer/owner) and `rider_name` + `rider_phone` (passenger).
  - Driver Payload Isolation: Driver App receives only passenger name, masked phone number, and 4-digit ride start PIN. Zero access to booking owner's wallet or corporate billing metadata.
  - Cross-device Socket.IO synchronization for active booking state.

## Feature 23: Unified Activity / History Hub
- **Files Modified / Created**:
  - `backend/booking-service/app/api/v1/activity.py` (8-Service polymorphic cursor aggregation API)
  - `apps/customer-app/app/(tabs)/trips.tsx` (Unified activity feed with service category pills, status tabs, search)
  - `apps/customer-app/app/activity/[id].tsx` (Itemized receipt, fare breakdown, GST, share receipt, support handoff)
  - `backend/scripts/verify_customer_feature23_unified_activity.py` (E2E test suite: 6/6 passed)
- **Supported Service Domains**:
  - Cab Rides (`RIDE`)
  - Parcel Delivery (`PARCEL`)
  - Hotel Bookings (`HOTEL_BOOKING`)
  - Goods Transport (`TRANSPORT_ORDER`)
  - Hourly Rentals (`RENTAL`)
  - Outstation Trips (`OUTSTATION`)
  - Airport Logistics (`AIRPORT_BOOKING`)
  - Corporate Trips (`CORPORATE_BOOKING`)

## Feature 24: Unified Notification Center
- **Files Modified / Created**:
  - `backend/notification-service/app/api/v1/notifications.py` (Feed, unread badge, mark read, delete endpoints)
  - `apps/customer-app/app/notifications/index.tsx` (6 Category filter pills, unread badge counters, deep-links)
  - `apps/customer-app/app/(tabs)/index.tsx` (Header notification bell routed to `/notifications`)
  - `backend/scripts/verify_customer_feature24_notification_center.py` (E2E test suite: 6/6 passed)
- **Key Architecture Rules Enforced**:
  - Canonical reference metadata: `reference_type`, `reference_id`, `deep_link`, `priority`.
  - In-app Socket.IO push when foreground; silent push deduplication when background.

## Feature 25: Unified Help & Support Hub
- **Files Modified / Created**:
  - `backend/booking-service/app/api/v1/support_hub.py` (Searchable FAQ, service-linked tickets, chat, escalation, AI)
  - `apps/customer-app/app/support/index.tsx` (Help Center Hub: FAQ search, AI hero card, popular issues)
  - `apps/customer-app/app/support/ai.tsx` (Context-bounded AI Assistant with strict policy boundaries)
  - `apps/customer-app/app/support/new-ticket.tsx` (Service-linked support ticket creation form)
  - `apps/customer-app/app/support/tickets.tsx` (My Tickets list with status filter)
  - `apps/customer-app/app/support/ticket/[id].tsx` (Realtime Support Chat thread with supervisor escalation)
  - `backend/scripts/verify_customer_feature25_support_hub.py` (E2E test suite: 6/6 passed)
- **Key Architecture Rules Enforced**:
  - AI Assistant Boundary: Explains policies and summarizes orders, but cannot independently issue refunds, change fares, assign drivers, or close safety incidents.
  - Customer ↔ Driver Support Privacy: Separate ticket threads linked only by `reference_id` on the backend for internal admin triage.

## Feature 26: Customer Security Architecture & Threat Defense
- **Files Modified / Created**:
  - `backend/common/models/all_models.py` (`CustomerDevice`, `CustomerSecurityEvent`, `CustomerRiskSignal` models)
  - `backend/scripts/migrate_customer_feature26_ddl.py` (DDL migration script with indexes)
  - `backend/auth-service/app/schemas/security.py` (Pydantic models for devices, dashboard, audit, challenge, recovery)
  - `backend/auth-service/app/services/customer_risk_engine.py` (Centralized risk engine evaluating velocity, devices, cancellations, promo abuse, driver collusion)
  - `backend/auth-service/app/services/customer_security_service.py` (Business logic for device trust lifecycle, security score, step-up challenge, multi-factor lockout recovery)
  - `backend/auth-service/app/api/v1/customer_security.py` (FastAPI router for `/api/v1/customer/security`)
  - `backend/local_gateway.py` (Mounted router under `/api/v1/customer/security`)
  - `apps/customer-app/src/api/client.ts` (`securityApi` client methods and TypeScript types)
  - `apps/customer-app/app/security/index.tsx` (Master Security Center Hub screen)
  - `apps/customer-app/app/security/devices.tsx` (Hardware Devices & Active Sessions screen)
  - `apps/customer-app/app/security/activity.tsx` (Security & Login Activity Timeline screen)
  - `apps/customer-app/app/security/challenge.tsx` (Step-Up Verification Challenge screen)
  - `apps/customer-app/app/security/account-protection.tsx` (Account Lockout & Multi-Factor Recovery screen)
  - `apps/customer-app/app/(tabs)/profile.tsx` & `apps/customer-app/app/settings.tsx` (Integrated Security Center navigation)
  - `apps/customer-app/src/components/dev/DevModeModal.tsx` (Feature 26 Threat Simulator panel)
  - `backend/scripts/verify_customer_feature26_security.py` (Comprehensive 7-phase E2E security & attack test suite: 7/7 passed)
  - `docs/CUSTOMER_SECURITY_ARCHITECTURE.md` (Full architectural specification & threat matrix)
- **Key Architecture Rules Enforced**:
  - **Trust Domain Isolation**: Customer Trust Domain ≠ Driver Trust Domain. Driver gets strictly operational parameters (masked phone, pickup/drop GPS, ride PIN); zero customer wallet, card, or history data leaked.
  - **Server-Authoritative Enforcement**: Client never dictates risk scores, device trust states, or bypasses. All rules, rate limits, and step-up triggers are strictly server-enforced.
  - **Single-Use Refresh Token Rotation & Family Invalidation**: Replayed refresh tokens trigger immediate revocation of all sessions on that device.

## Feature 27: Smart Features / Intelligence Layer
- **Files Modified / Created**:
  - `backend/common/models/all_models.py` (`SmartRecommendationLog`, `SmartDestinationCache` models)
  - `backend/scripts/migrate_customer_feature27_ddl.py` (DDL migration script with indexes)
  - `backend/auth-service/app/schemas/smart.py` (Pydantic schemas for destination prediction, vehicle sizing, cross-service companions, demand signals, multi-factor matching)
  - `backend/auth-service/app/services/smart_intelligence_service.py` (Core intelligence & decision support engine)
  - `backend/auth-service/app/api/v1/smart.py` (FastAPI router for `/api/v1/smart`)
  - `backend/auth-service/app/api/v1/__init__.py` & `backend/local_gateway.py` (Mounted router under `/api/v1/smart`)
  - `apps/customer-app/src/api/client.ts` (`smartApi` client methods and TypeScript types)
  - `apps/customer-app/src/components/smart/SmartCompanionCard.tsx` (Reusable contextual cross-service companion prompt)
  - `apps/customer-app/app/(tabs)/index.tsx` (Smart home intelligence feed, time-aware greeting, quick predicted destination chips carousel, smart companion cards, surge alert banner)
  - `apps/customer-app/app/book/cab.tsx` (Passenger/Luggage counter sizing selector, dynamic "★ Smart Pick" category badge with reason pill)
  - `apps/customer-app/src/components/dev/DevModeModal.tsx` (Feature 27 Smart Intelligence Simulator panel)
  - `backend/scripts/verify_customer_feature27_smart.py` (Comprehensive 7-phase E2E smart intelligence and attack test suite: 7/7 passed)
  - `docs/CUSTOMER_SMART_FEATURES.md` (Full architectural specification & decision matrices)
- **Key Architecture Rules Enforced**:
  - **Smart Engine ≠ Authoritative Domain Engine**: Smart layer produces recommendations, rankings, predictions, and signals; final fare, assignment, payment, safety, authorization, and state transitions are strictly committed by existing domain engines (`DispatchService`, `FareEngine`).
  - **Multi-Factor Matching**: Nearest driver ≠ Best driver (multi-factor normalized ranking: ETA 35%, Rating 20%, Idle Time 15%, Acceptance 15%, Destination Alignment 15%).
  - **Privacy & Firewall**: Customer never sees driver ranking scores, internal weights, or driver private targets; Driver never sees customer destination history or risk metrics.

## Feature 28: Cross-Service Orchestration & Multi-Service Journeys
- **Files Modified / Created**:
  - `backend/common/models/all_models.py` (`JourneyStatus`, `Journey`, `CrossServiceLink`, `DomainEventRecord`, `ProcessedEventRecord` models)
  - `backend/scripts/migrate_customer_feature28_ddl.py` (DDL migration script creating tables and indexes)
  - `backend/auth-service/app/schemas/orchestration.py` (Pydantic schemas for journeys, canonical domain event envelopes, linked actions, and simulation requests)
  - `backend/auth-service/app/services/cross_service_orchestrator.py` (Central Cross-Service Orchestration & Saga engine)
  - `backend/auth-service/app/api/v1/orchestration.py` (FastAPI router for `/api/v1/orchestration`)
  - `backend/auth-service/app/api/v1/__init__.py` & `backend/local_gateway.py` (Mounted router under `/api/v1/orchestration`)
  - `apps/customer-app/src/api/client.ts` (`orchestrationApi` client methods and TypeScript types)
  - `apps/customer-app/app/journey/[id].tsx` (Master Journey Detail Screen with connected timeline, leg cards, Attention Required banner, retry actions, and support integration)
  - `apps/customer-app/app/(tabs)/index.tsx` (Active Multi-Service Journey Hub Card on home screen)
  - `apps/customer-app/src/components/dev/DevModeModal.tsx` (Feature 28 Cross-Service Orchestration & Sagas simulation triggers)
  - `backend/scripts/verify_customer_feature28_orchestration.py` (Comprehensive 6-phase E2E verification, chaos, and security attack suite: 6/6 passed)
  - `docs/CROSS_SERVICE_ARCHITECTURE.md` (Full architectural specification)
- **Key Architecture Rules Enforced**:
  - **Domain Isolation**: Each service domain owns its own tables, business logic, state machines, and pricing engines. CrossServiceOrchestrator manages event bus, correlation IDs, and saga workflows without directly mutating domain databases.
  - **Canonical Event Sourcing & Idempotency**: `DomainEventRecord` logs immutable audit stream; `ProcessedEventRecord` enforces exactly-once consumer execution.
  - **Non-Cascading Saga Compensation**: When a downstream linked service fails (e.g. Airport cab dispatch times out), the parent reservation (e.g. Hotel stay) is **never cancelled automatically**. The Journey enters `ATTENTION_REQUIRED`, alerting the customer with one-tap retry and support options.
  - **Trust Boundaries**: Driver App receives only the operational job payload; **zero access** to customer's full multi-service journey, hotel pricing, or private billing details.

## Feature 29 / Master Production Fix: Unified Nearby + City + Hex/Zone Dispatch Engine
- **Files Modified / Created**:
  - `backend/matching-service/app/services/spatial_resolver.py` (Unified 3-mode candidate provider: `NEARBY`, `CITY_COVERAGE`, `HEX_COVERAGE` with PostGIS `ST_DWithin`, location freshness, and active ride exclusion)
  - `backend/matching-service/app/services/ride_dispatch.py` (Multi-wave fanout dispatch, background push notifications, 3km OTP proximity helper, atomic `SELECT FOR UPDATE` winner assignment, and superseded handling)
  - `backend/matching-service/app/services/smart_radar.py` (Real DB candidate query for Driver Radar nodes & cards)
  - `apps/customer-app/src/hooks/useCustomerSocket.ts` (Added `OTP_READY` event handler & state management)
  - `apps/customer-app/app/track.tsx` (Live 4-digit ride OTP display from socket)
  - `backend/scripts/verify_master_dispatch_e2e.py` (Comprehensive 7-phase E2E verification test suite: 7/7 passed)
  - `docs/DRIVER_DISPATCH_ARCHITECTURE.md`, `docs/NEARBY_MATCHING.md`, `docs/CUSTOMER_DRIVER_CONTRACT.md`, `docs/DRIVER_PUBLISHED_TRIPS.md`, `docs/REALTIME_NOTIFICATION_ARCHITECTURE.md`, `docs/DRIVER_PRODUCTION_READINESS.md`
- **Key Architecture Rules Enforced**:
  - **3-Mode Candidate Provider**: Unifies dynamic proximity matching, city boundary coverage, and hexagonal zone monitoring in a single high-performance PostGIS query.
  - **Atomic First Accept Wins**: PostgreSQL row-lock (`SELECT FOR UPDATE`) ensures zero double assignment; competing drivers receive a clean `superseded` response and their radar cards auto-dismiss via `RIDE_REQUEST_REMOVED`.
  - **Rejection Resilience**: Driver rejection marks only that offer `REJECTED`; customer's ride request remains `MATCHING` and automatically triggers candidate pool expansion.
  - **3 KM OTP Proximity Trigger**: Driver approaching $\le 3000\text{ m}$ of pickup triggers OTP generation and broadcasts `OTP_READY` to customer; driver verifies PIN at pickup before ride start.

## Service 2: Parcel & Package Logistics Architecture
- **Files Modified / Verified**:
  - `backend/parcel-service/app/services/parcel_service.py` (Itemized quote engine, 2-phase random OTP generation, atomic accept, sender handover, receiver delivery, double-entry financial ledger)
  - `backend/parcel-service/app/api/v1/parcels.py` (FastAPI router mounted under `/api/v1/parcels`)
  - `backend/common/models/all_models.py` (`Parcel`, `ParcelProofOfDelivery`, `ParcelStatusHistory`, `DriverEarningLedger`)
  - `apps/customer-app/app/parcel-booking.tsx` (Sender/Receiver inputs, package dimensions, fragile/insurance options, itemized quote preview)
  - `apps/customer-app/app/parcel-tracking.tsx` (Live GPS parcel transit, sender pickup OTP card, receiver delivery OTP card, POD download)
  - `apps/driver-app/app/parcels.tsx` (Driver parcel request scanner, sender pickup OTP verification, receiver delivery OTP + Cloudinary signature/photo upload)
  - `backend/scripts/verify_service2_parcel_e2e.py` (Comprehensive 7-phase E2E verification test suite: 7/7 passed)
- **Key Architecture Rules Enforced**:
  - **Strict Identity Separation**: Booking Owner (Payer) $\ne$ Sender (Pickup contact) $\ne$ Receiver (Delivery contact) $\ne$ Driver (Courier partner).
  - **2-Phase Verification**: Separate random 4-digit PINs (`pickup_otp` given by sender; `delivery_otp` given by receiver).
  - **Cloudinary Proof of Delivery**: Receiver signature and delivery handover photo permanently archived in Cloudinary with metadata in `parcel_proof_of_deliveries`.
  - **Double-Entry Settlement**: 80% net earnings credited to driver wallet and logged in `driver_earning_ledger`.

## Service 3: Commercial Goods Transport & Freight Logistics Architecture
- **Files Modified / Verified**:
  - `backend/transport-service/app/services/transport_service.py` (Commercial goods pricing engine, overload safety validation, multi-transporter bidding, interactive counter-offer negotiation, atomic winning quote lock, operational state progression, delivery OTP verification, POD certificate generation, double-entry ledger settlement, cancellation workflow)
  - `backend/transport-service/app/api/v1/transport.py` (FastAPI router mounted under `/api/v1/transport` and `/api/v1/goods-transport`)
  - `backend/common/models/all_models.py` (`TransportOrder`, `TransportLoad`, `TransportQuote`, `TransportQuoteEvent`, `TransportAssignment`, `TransportStatusEvent`, `TransportProofOfDelivery`, `DriverEarningLedger`)
  - `apps/customer-app/app/transport/create.tsx` (Commercial load specs, dimensional volume CFT, loading/unloading helpers, declared value, vehicle requirement)
  - `apps/customer-app/app/transport/quotes.tsx` (Live bidding hub, multi-round counter-offer negotiation, winning quote lock)
  - `apps/customer-app/app/transport/tracking.tsx` (Operational milestone tracking: Loading $\to$ Loaded $\to$ In Transit $\to$ Destination $\to$ Unloading)
  - `apps/customer-app/app/transport/pod.tsx` (Delivery OTP display, receiver signature view, tamper-proof POD certificate download)
  - `backend/scripts/verify_service3_transport_e2e.py` (Comprehensive 8-phase E2E verification test suite: 8/8 passed)
- **Key Architecture Rules Enforced**:
  - **Overload Safety Validation**: Prevents unsafe overloading by validating payload weight against vehicle capacity constraints (Tata Ace $\le 750\text{ kg}$, Bolero $\le 1500\text{ kg}$, Eicher 14ft $\le 4000\text{ kg}$, 19ft $\le 8000\text{ kg}$, 32ft Trailer $\le 20000\text{ kg}$).
  - **Interactive Multi-Round Negotiation**: Bidding and counter-offers tracked with immutable `TransportQuoteEvent` records.
  - **Atomic Winning Quote Selection**: First accepted quote locks assignment; competing bids automatically transitioned to `NOT_SELECTED`.
  - **Operational State Machine & Immutable POD**: Driver updates multi-state progression (`LOADING_STARTED`, `LOADED`, `IN_TRANSIT`, `ARRIVED_DESTINATION`, `UNLOADING_STARTED`); delivery sealed with Receiver OTP, signature, photo, and double-entry `DriverEarningLedger` credit.

## Service 4: Airport Transport & Realtime Flight Monitoring Architecture
- **Files Modified / Verified**:
  - `backend/airport-service/app/services/airport_service.py` (Airport catalog, terminal lookup, flight-aware pricing, chauffeur reservation, delay recalculation, terminal arrival grace period, trip progression, double-entry settlement, 100% refund cancellation)
  - `backend/airport-service/app/services/flight_information_service.py` (Flight schedule, live gate/belt lookup, delay sync webhook processor)
  - `backend/airport-service/app/api/v1/airport.py` (FastAPI routes mounted under `/api/v1/airport` and `/api/v1/flight`)
  - `backend/common/models/all_models.py` (`Airport`, `AirportTerminal`, `FlightSnapshot`, `AirportBooking`, `AirportWaitingLog`, `DriverEarningLedger`)
  - `apps/customer-app/app/airport/book.tsx` (Airport selection, terminal choice, flight number lookup, meet & greet, luggage count)
  - `apps/customer-app/app/airport/tracking.tsx` (Live driver GPS to terminal, flight delay shift indicator, 45-min grace period timer)
  - `apps/customer-app/app/airport/flight-status.tsx` (Live flight board: Terminal, Gate, Baggage Belt, Status)
  - `backend/scripts/verify_service4_airport_e2e.py` (Comprehensive 8-phase E2E verification test suite: 8/8 passed)
- **Key Architecture Rules Enforced**:
  - **Flight Delay Dynamic Shift**: Automated flight delay polling (+35 mins) shifts the chauffeur's recommended pickup window without customer manual rebooking.
  - **Complimentary 45-Min Grace Period**: Driver arrival at airport terminal begins 45 minutes of free waiting (`AirportWaitingLog`) to allow baggage collection and immigration.
  - **Meet & Greet Handshake**: Chauffeur pages passenger at arrival gate pillar before ride start.
  - **Zero-Penalty Cancellation Policy**: Free cancellation with 100% wallet refund prior to chauffeur dispatch.

## Service 5: Hourly Car Rental & Multi-Stop Urban Routing Architecture
- **Files Modified / Verified**:
  - `backend/rental-service/app/services/rental_service.py` (Package catalog, itemized estimates, driver allocation, authoritative timer start, dynamic multi-stop waypoints, distance telemetry, overage computation, 80/20 driver earnings ledger credit, cancellation refund)
  - `backend/rental-service/app/api/v1/rental.py` (FastAPI router mounted under `/api/v1/rental`)
  - `backend/common/models/all_models.py` (`RentalPlan`, `RentalBooking`, `RentalStop`, `RentalUsageEvent`, `DriverEarningLedger`)
  - `apps/customer-app/app/rental/index.tsx` (Package selector 1/2/4/8hr, vehicle tiers, live active timer card, add stop dialog, overage meter)
  - `backend/scripts/verify_service5_rental_e2e.py` (Comprehensive 8-phase E2E verification test suite: 8/8 passed)
- **Key Architecture Rules Enforced**:
  - **Backend-Authoritative Timer**: Start time is stamped in PostgreSQL upon driver handshake (`actual_start_time`); client device clock is strictly untrusted.
  - **Dynamic Multi-Stop Waypoints**: Customer can append intermediate stops during trip (`RentalStop`, `RentalUsageEvent`), notifying driver via realtime events.
  - **Server-Side Overage Surcharges**: PostGIS cumulative distance and elapsed duration compute excess KM (₹15–₹22/km) and excess hours (₹150–₹280/hr) with 5% GST automatically upon completion.
  - **Double-Entry Earnings Settlement**: 80% net earnings credited to chauffeur wallet and permanently recorded in `DriverEarningLedger`.

## Service 6: Outstation Multi-City & Intercity Journey Architecture
- **Files Modified / Verified**:
  - `backend/outstation-service/app/services/outstation_service.py` (Multi-journey quote engine, leg sequencing, toll/permit verification, multi-day driver allowances, night halt surcharge, 80/20 settlement, wallet refund)
  - `backend/outstation-service/app/api/v1/outstation.py` (FastAPI router mounted under `/api/v1/outstation`)
  - `backend/common/models/all_models.py` (`OutstationBooking`, `OutstationLeg`, `OutstationWaypoint`, `OutstationCharge`, `DriverEarningLedger`)
  - `apps/customer-app/app/outstation/index.tsx` (One-Way / Round-Trip / Multi-City selector, calendar return date, night halts counter, driver allowance breakdown)
  - `backend/scripts/verify_service6_outstation_e2e.py` (Comprehensive 8-phase E2E verification test suite: 8/8 passed)
- **Key Architecture Rules Enforced**:
  - **Multi-Leg Journey State Machine**: Single booking record coordinates multiple independent journey legs (Outbound Leg 0 $\to$ Return Leg 1 $\to$ Segment $N$).
  - **Platform-Verified Additional Surcharges**: Tolls and interstate permits require receipt upload / fastag log and customer in-app approval before settlement (`OutstationCharge`).
  - **Driver Allowance & Night Halt Protections**: Multi-day trips guarantee ₹500/day driver food/travel allowance and ₹1000/night lodging allowance credited directly to driver.
  - **Double-Entry Financial Settlement**: 80% base trip fare + 100% driver allowances credited to chauffeur and logged in `DriverEarningLedger`.

## Service 7: Intercity Carpool & Ridesharing Engine Architecture
- **Files Modified / Verified**:
  - `backend/carpool-service/app/services/carpool_service.py` (Host trip publishing, seat inventory, corridor discovery, boarding OTP handshake, CO2 savings, 85/15 driver earnings settlement, cancellation refund)
  - `backend/carpool-service/app/api/v1/carpool.py` (FastAPI router mounted under `/api/v1/carpool`)
  - `backend/common/models/all_models.py` (`CarpoolTrip`, `CarpoolWaypoint`, `CarpoolBooking`, `DriverEarningLedger`)
  - `apps/customer-app/app/carpool/index.tsx` (Route corridor search, seat selector, women-only toggle, active boarding voucher with OTP)
  - `backend/scripts/verify_service7_carpool_e2e.py` (Comprehensive 8-phase E2E verification test suite: 8/8 passed)
- **Key Architecture Rules Enforced**:
  - **Driver-Published Route & Seat Inventory**: Host drivers publish upcoming highway trips specifying total available seats and per-seat pricing.
  - **Corridor & Waypoint Matching**: Passengers book intermediate corridor nodes along major expressways (e.g. Pune $\to$ Lonavala $\to$ Vashi $\to$ BKC).
  - **Atomic Capacity Locking**: Prevents overbooking; available seats decrement on booking and restore on cancellation.
  - **4-Digit Boarding OTP Handshake**: Chauffeur verifies passenger OTP prior to boarding vehicle.
  - **Double-Entry Earnings Settlement**: 85% pooled passenger fares credited to host driver wallet and recorded in `DriverEarningLedger`.

## Service 8: Packers & Movers Logistics Suite Architecture
- **Files Modified / Verified**:
  - `backend/packers-service/app/services/packers_service.py` (Move size estimator, itemized inventory, mover quotations, milestone state machine, POD walkthrough, 85/15 settlement, cancellation refund)
  - `backend/packers-service/app/api/v1/packers.py` (FastAPI router mounted under `/api/v1/packers`)
  - `backend/common/models/all_models.py` (`MovingOrder`, `MovingItem`, `MovingQuote`, `MovingPOD`, `DriverEarningLedger`)
  - `apps/customer-app/app/packers/index.tsx` (Shifting size selector, floor & lift toggles, itemized inventory checklist, packing addons)
  - `backend/scripts/verify_service8_packers_e2e.py` (Comprehensive 8-phase E2E verification test suite: 8/8 passed)
- **Key Architecture Rules Enforced**:
  - **Itemized Move Size & Surcharges**: Calculates base moving rate per room count, distance over 5 KM (₹35/km), and no-lift floor penalties (₹300/floor).
  - **Mover Partner Quotations & Crew Assignment**: Movers bid with crew size and truck specs; customer accepts to lock in crew.
  - **Milestone State Machine**: Tracks move lifecycle across `PACKING` $\to$ `LOADING` $\to$ `LOADED` $\to$ `IN_TRANSIT` $\to$ `UNLOADING`.
  - **Proof of Delivery & Damage Walkthrough**: 4-digit OTP verification and final inspection signoff (`MovingPOD`).
  - **Double-Entry Earnings Settlement**: 85% net earnings credited to mover wallet and recorded in `DriverEarningLedger`.

## Service 9: Hotel Partner Hub & Hospitality Bookings Architecture
- **Files Modified / Verified**:
  - `backend/hotel-service/app/services/hotel_service.py` (PostGIS spatial search, multi-night room pricing, 12%/18% GST brackets, room concurrency lock, linked airport cab bridge, front desk roster, check-in/out, cancellation refund)
  - `backend/hotel-service/app/api/v1/hotels.py` (FastAPI router mounted under `/api/v1/hotels`)
  - `backend/common/models/all_models.py` (`Property`, `PropertyUnit`, `PropertyBooking`, `BookingGuest`, `Vendor`)
  - `apps/customer-app/app/hotel/search.tsx` and `app/hotel/results.tsx` (City/dates search, room tiers, instant booking, airport transfer option)
  - `backend/scripts/verify_service9_hotel_e2e.py` (Comprehensive 8-phase E2E verification test suite: 8/8 passed)
- **Key Architecture Rules Enforced**:
  - **Authoritative Multi-Night Pricing Engine**: Dynamic nights calculation with Indian hospitality GST tax tiers (12% for $\le$ ₹7,500/night, 18% for $>$ ₹7,500/night).
  - **Cross-Service Airport Cab Transfer Bridge**: Linked cab transfer requests seamlessly dispatched into the dispatch engine without leaking hotel room reservation data.
  - **Front Desk Partner Roster & Guest Handshake**: Hotel partner daily check-in / check-out management (`STARTED` $\to$ `COMPLETED`).
  - **Automated Free Cancellation Policy**: Instant 100% wallet refunds before the 24-hour cancellation deadline.

## Service 10: Corporate Travel & Enterprise Billing Architecture
- **Files Modified / Verified**:
  - `backend/corporate-service/app/services/corporate_service.py` (Company setup, employee invitation & onboarding, data-driven travel policy engine, multi-step approval workflow, corporate wallet audit ledger, monthly consolidated GST invoice generator, spending analytics)
  - `backend/corporate-service/app/api/v1/corporate.py` (FastAPI router mounted under `/api/v1/corporate`)
  - `backend/common/models/all_models.py` (`Company`, `Department`, `CompanyMembership`, `CorporatePolicy`, `ApprovalRequest`, `ApprovalStep`, `CorporateWallet`, `CorporateWalletTransaction`, `CorporateInvoice`, `InvoiceLineItem`)
  - `apps/customer-app/app/corporate/index.tsx` (Corporate booking tab, company registration form, monthly GST invoices tab)
  - `backend/scripts/verify_service10_corporate_e2e.py` (Comprehensive 8-phase E2E verification test suite: 8/8 passed)
- **Key Architecture Rules Enforced**:
  - **Data-Driven Travel Policy Engine**: Auto-approves rides below fare threshold (₹3,000) and routes above-threshold trips to approvers; enforces vehicle class and service restrictions.
  - **Deterministic Multi-Step Approval Handshake**: `SELECT FOR UPDATE` prevents concurrent duplicate approvals; strict security rule blocks self-approval.
  - **Dedicated Corporate Wallet**: Separate from customer personal wallets with immutable transaction ledger audit trail.
  - **Monthly Consolidated GST Invoicing**: Generates invoice `INV-YYYYMM-XXX` with itemized line items, cost center tags, and 5% GST tax breakdown.
