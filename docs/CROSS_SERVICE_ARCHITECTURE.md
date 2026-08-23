# Cross-Service Orchestration & Multi-Service Journey Architecture (Feature 28)

**One Customer Platform → Multiple Independent Services → Shared Infrastructure → Linked Service Journeys**

---

## 1. Core Architectural Contract & Tenancy Model

The CabBooking SuperApp is built on **8 independent domain services** (Ride, Parcel, Hotel, Transport, Airport, Rental, Outstation, Corporate) unified by a **shared event-driven platform orchestration layer**.

```
                                  ┌────────────────────────────────┐
                                  │      CUSTOMER SUPERAPP         │
                                  └───────────────┬────────────────┘
                                                  │
                                                  ▼
                                  ┌────────────────────────────────┐
                                  │  CROSS-SERVICE ORCHESTRATOR    │
                                  │  - Canonical Event Bus         │
                                  │  - Journey Lifecycle Manager   │
                                  │  - Idempotency & Saga Engine   │
                                  └───────┬───────────────┬────────┘
                                          │               │
                 ┌────────────────────────┼───────────────┼────────────────────────┐
                 ▼                        ▼               ▼                        ▼
        ┌─────────────────┐      ┌─────────────────┐┌─────────────────┐   ┌─────────────────┐
        │   RIDE DOMAIN   │      │  PARCEL DOMAIN  ││  HOTEL DOMAIN   │   │TRANSPORT DOMAIN │
        │ - Dispatch/Ride │      │ - Courier/POD   ││ - Room/Stay     │   │ - Quotes/Heavy  │
        └────────┬────────┘      └────────┬────────┘└────────┬────────┘   └────────┬────────┘
                 │                        │                  │                     │
                 ▼                        ▼                  ▼                     ▼
        ┌─────────────────┐      ┌─────────────────┐┌─────────────────┐   ┌─────────────────┐
        │ AIRPORT DOMAIN  │      │ RENTAL DOMAIN   ││OUTSTATION DOMAIN│   │CORPORATE DOMAIN │
        │ - Flight/Shuttle│      │ - Hourly/Daily  ││ - Intercity     │   │ - Policy/B2B    │
        └─────────────────┘      └─────────────────┘└─────────────────┘   └─────────────────┘
```

### Architectural Invariants:
1. **Domain Isolation**: Each service domain owns its own tables, pricing formulas, state transitions, and business logic. CrossServiceOrchestrator coordinates workflows without directly mutating another domain's DB.
2. **Canonical Event Envelope**: Every cross-service event carries `event_id`, `event_type`, `aggregate_id`, `source_service`, `customer_id`, `journey_id`, and `correlation_id`.
3. **Idempotency Guard**: `ProcessedEventRecord` prevents duplicate execution when events are replayed or retried.
4. **Non-Cascading Saga Compensation**: When a downstream linked service fails (e.g. Airport cab dispatch times out), the parent reservation (e.g. Hotel stay) is **never cancelled automatically**. The Journey enters `ATTENTION_REQUIRED`, alerting the customer with one-tap retry and support options.
5. **Driver / Partner Trust Boundaries**: Driver receives only the operational job payload assigned to them. Driver has **zero access** to customer's full multi-service journey, hotel pricing, or private billing details.

---

## 2. Canonical Domain Models

### `Journey` (`journeys` table)
- `id`: UUID (Primary Key)
- `journey_reference`: String(32) Unique (e.g. `JRN-260823-E57A59`)
- `customer_id`: UUID (Foreign Key `users.id`)
- `status`: Enum (`PLANNED`, `PARTIALLY_ACTIVE`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `ATTENTION_REQUIRED`)
- `title`: String(255) (e.g. "Grand Hyatt Mumbai Stay & Travel")
- `origin_service`: String(50) (e.g. "hotel", "airport", "ride")
- `origin_reference_id`: String(100)
- `notes_json`: JSONB

### `CrossServiceLink` (`cross_service_links` table)
- `id`: UUID (Primary Key)
- `journey_id`: UUID (Foreign Key `journeys.id`)
- `source_service`: String(50)
- `source_id`: String(100)
- `target_service`: String(50)
- `target_id`: Optional[String(100)]
- `link_type`: String(50) (`AIRPORT_TRANSFER`, `HOTEL_STAY`, `PARCEL_TRANSPORT`, `OUTSTATION_STAY`)
- `status`: String(30) (`SUGGESTED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `CANCELLED`)
- `metadata_json`: JSONB

### `DomainEventRecord` & `ProcessedEventRecord`
- Immutable event audit trail with correlation IDs, causation IDs, and consumer worker deduplication.

---

## 3. Service Dependency & Trigger Matrix

| Source Service | Target Service | Trigger Category | Consent Required? | Prefilled Context |
| :--- | :--- | :--- | :--- | :--- |
| **HOTEL** | **AIRPORT / CAB** | **Suggested / User-Confirmed** | **YES** | Destination hotel address, check-in/out dates, guest count |
| **AIRPORT** | **HOTEL** | **Suggested / User-Confirmed** | **YES** | Flight arrival city, arrival date/time, guest count |
| **PARCEL** | **TRANSPORT** | **Suggested / User-Confirmed** | **YES** | Weight >25kg, cargo description, origin/destination |
| **CORPORATE** | **ANY SERVICE** | **Policy-Driven** | **YES (Policy)** | Employee cost center, approved travel allowance |
| **ANY DOMAIN** | **ACTIVITY / SUPPORT** | **Automatic** | **NO** | Canonical `journey_id` / service reference IDs |

---

## 4. Mobile UI/UX Integration

1. **Active Journey Hub Card on Home Screen** ([`index.tsx`](file:///d:/cub/Cab-Management/apps/customer-app/app/%28tabs%29/index.tsx)):
   - Highlights ongoing multi-service trip with status badge (`ACTIVE` / `ATTENTION REQUIRED`).
   - One-tap navigation to Master Journey view.
2. **Master Journey Detail Screen** ([`app/journey/[id].tsx`](file:///d:/cub/Cab-Management/apps/customer-app/app/journey/%5Bid%5D.tsx)):
   - Visual step-by-step timeline of all connected legs.
   - Attention Required recovery banner with `[ Retry Linked Service ]` and `[ Contact Support ]`.
   - Domain detail deep-links.
3. **Developer Mode Sandbox** ([`DevModeModal.tsx`](file:///d:/cub/Cab-Management/apps/customer-app/src/components/dev/DevModeModal.tsx)):
   - Simulation presets for Hotel ➔ Airport Saga, Partial Failure Compensation, and Idempotency Guard.

---

## 5. Verification Suite

Comprehensive test suite located at [`backend/scripts/verify_customer_feature28_orchestration.py`](file:///d:/cub/Cab-Management/backend/scripts/verify_customer_feature28_orchestration.py):
- **Phase 1**: Canonical Domain Event Publication & Sourcing Envelope
- **Phase 2**: Hotel ➔ Airport Transfer Saga Orchestration & User-Confirmed Actions
- **Phase 3**: Idempotency & Duplicate Event Protection (Exactly-Once Invariant)
- **Phase 4**: Saga Partial Failure Handling & Non-Cascading Compensation (Chaos Test)
- **Phase 5**: Parcel ➔ Goods Transport Conversion Workflow
- **Phase 6**: Security, Privacy & Multi-Tenant IDOR Firewall (Attack Tests)
