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
