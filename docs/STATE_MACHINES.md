# Service State Machines & Transition Contracts

## Architectural Principle
The SuperApp **avoids a single monolithic status enum**. While all domains align with high-level lifecycle stages (`CREATED`, `MATCHING`, `ASSIGNED`, `ACTIVE`, `COMPLETED`, `CANCELLED`), each service executes its own distinct, server-authoritative business state machine.

---

## 1. Service 1 — Cab / On-Demand Ride (`ride_orders` / `ride_requests`)

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: Customer Confirms Pickup/Drop
    REQUESTED --> MATCHING: Dispatched to Candidate Pool
    MATCHING --> ASSIGNED: Driver 1 Accepts (First Wins)
    MATCHING --> MATCHING: Driver Rejects (Offer Marked Rejected)
    MATCHING --> CANCELLED: Customer Cancels / Timeout
    ASSIGNED --> DRIVER_EN_ROUTE: Driver Starts Navigation
    DRIVER_EN_ROUTE --> ARRIVED: Driver within 100m Pickup
    ARRIVED --> OTP_VERIFIED: 4-Digit PIN Verified
    OTP_VERIFIED --> STARTED: Trip Timer Starts
    STARTED --> IN_PROGRESS: En Route with Live GPS
    IN_PROGRESS --> COMPLETED: Destination Reached & Settled
    ASSIGNED --> CANCELLED: Cancellation with Fee Policy
```

- **Rollback / Cancel Policy**: Customer cancel before driver arrival = Free; Cancel after arrival / >5 min en route = Cancellation fee credited to driver ledger.
- **PIN Rule**: 4-digit PIN is generated on proximity ($\le 3000\text{ m}$) and required for transition to `STARTED`.

---

## 2. Service 2 — Parcel Logistics (`parcel_orders`)

```mermaid
stateDiagram-v2
    [*] --> CREATED: Sender Submits Package Details
    CREATED --> MATCHING: Dispatched to Cargo/Courier Drivers
    MATCHING --> ASSIGNED: Driver Accepts Delivery Job
    ASSIGNED --> AT_PICKUP: Driver Arrives at Sender Location
    AT_PICKUP --> PICKUP_VERIFIED: Sender Handover & Photo Verification
    PICKUP_VERIFIED --> PICKED_UP: Package Loaded
    PICKED_UP --> IN_TRANSIT: Driver En Route to Receiver
    IN_TRANSIT --> DELIVERY_VERIFICATION: Receiver OTP + POD Signature
    DELIVERY_VERIFICATION --> DELIVERED: POD Uploaded to Cloudinary
    IN_TRANSIT --> FAILED: Receiver Unavailable / Damaged
```

- **POD Requirement**: Digital receiver signature + photo stored in Cloudinary with metadata recorded in `parcel_pod`.

---

## 3. Service 3 — Transport & Freight (`transport_orders`)

```mermaid
stateDiagram-v2
    [*] --> CREATED: Customer Submits Freight Specs
    CREATED --> QUOTING: Dispatched to Transporters / Large Fleet
    QUOTING --> QUOTE_SELECTED: Customer Chooses Best Bid / Counter Offer
    QUOTE_SELECTED --> ASSIGNED: Transporter Confirmed
    ASSIGNED --> LOADING: Vehicle at Warehouse/Pickup
    LOADING --> LOADED: Weight & Waybill Verified
    LOADED --> IN_TRANSIT: Heavy Vehicle Transit (Geofenced)
    IN_TRANSIT --> UNLOADING: At Destination Dock
    UNLOADING --> POD_VERIFIED: Consignee Signoff & E-Waybill
    POD_VERIFIED --> DELIVERED: Proof Verified
    DELIVERED --> SETTLED: Transporter Payout Released
```

---

## 4. Service 4 — Airport Transport (`airport_bookings`)

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED: Advance Flight Booking
    SCHEDULED --> FLIGHT_MONITORED: Realtime Flight Radar Polling
    FLIGHT_MONITORED --> DRIVER_ASSIGNED: Auto-Dispatched based on ETA
    DRIVER_ASSIGNED --> DRIVER_APPROACHING: Driver En Route to Terminal
    DRIVER_APPROACHING --> ARRIVED: Driver at Designated Pickup Zone
    ARRIVED --> WAITING: Free Waiting Window (e.g. 45 min for flight delays)
    WAITING --> PICKED_UP: Meet & Greet Handshake + Luggage Loaded
    PICKED_UP --> STARTED: Trip Started
    STARTED --> COMPLETED: Passenger Dropped at Destination
```

---

## 5. Service 5 — Hourly Car Rental (`rental_orders`)

```mermaid
stateDiagram-v2
    [*] --> RESERVED: Package Selected (e.g. 4 Hr / 40 KM)
    RESERVED --> DRIVER_ASSIGNED: Dedicated Driver Dispatched
    DRIVER_ASSIGNED --> ARRIVED: Driver at Customer Starting Point
    ARRIVED --> STARTED: Rental OTP Verified & Base Timer Starts
    STARTED --> ACTIVE: Multi-Stop Urban Driving
    ACTIVE --> EXTENDED: Customer Extends Hours/KM via App
    EXTENDED --> ACTIVE: New Quota Applied
    ACTIVE --> COMPLETED: Final Overage Calculated & Paid
```

---

## 6. Service 6 — Outstation Multi-City (`outstation_orders`)

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED: One-Way or Round-Trip Requested
    SCHEDULED --> ASSIGNED: Verified Intercity Driver Assigned
    ASSIGNED --> STARTED: Outbound Leg Begins with PIN
    STARTED --> OUTBOUND: Highway Transit
    OUTBOUND --> AT_DESTINATION: Arrived at Outstation City
    AT_DESTINATION --> RETURNING: Round-Trip Return Leg Initiated
    RETURNING --> COMPLETED: Final Tolls, State Taxes & Allowance Settled
```

---

## 7. Service 7 — Intercity Carpool (`trips` & `bookings`)

```mermaid
stateDiagram-v2
    [*] --> PUBLISHED: Driver Publishes Route & Seats
    PUBLISHED --> BOOKING_REQUESTED: Passenger Requests 1+ Seats
    BOOKING_REQUESTED --> ACCEPTED: Driver Confirms Passenger
    ACCEPTED --> CONFIRMED: Seat Reserved & Corridor Locked
    CONFIRMED --> STARTED: Driver Starts Scheduled Trip
    STARTED --> IN_PROGRESS: Corridor Transit with Live GPS
    IN_PROGRESS --> COMPLETED: Passengers Dropped at Waypoints
```

---

## 8. Service 8 — Packers & Movers (`moving_orders`)

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: Home Inventory & Room Specs Submitted
    REQUESTED --> QUOTING: Movers Submit Team & Vehicle Quotes
    QUOTING --> ASSIGNED: Customer Selects Moving Team
    ASSIGNED --> PACKING: Crew Arrives & Boxes Fragile Goods
    PACKING --> LOADING: Heavy Furniture & Appliances Loaded
    LOADING --> LOADED: Inventory Checklist Confirmed
    LOADED --> IN_TRANSIT: Moving Truck Highway Transit
    IN_TRANSIT --> UNLOADING: Goods Unloaded at Destination
    UNLOADING --> COMPLETED: Final Walkthrough & Damage Signoff
```

---

## 9. Service 9 — Hotel Booking (`hotel_bookings`)

```mermaid
stateDiagram-v2
    [*] --> SEARCH: Customer Filters Room & Amenities
    SEARCH --> SELECTED: Room Selected
    SELECTED --> PAYMENT_PENDING: Hold Placed on Room Inventory
    PAYMENT_PENDING --> CONFIRMED: Payment Captured & Voucher Issued
    CONFIRMED --> CHECKED_IN: Guest Arrives at Front Desk
    CHECKED_IN --> COMPLETED: Check-Out Finished
    CONFIRMED --> CANCELLED: Cancelled before Cutoff Date
    CANCELLED --> REFUNDED: Refund Processed to Source
```

---

## 10. Service 10 — Corporate Delegation (`corporate_bookings`)

```mermaid
stateDiagram-v2
    [*] --> POLICY_CHECK: Employee Books Business Travel
    POLICY_CHECK --> AUTO_APPROVED: Within Grade / Budget Rules
    POLICY_CHECK --> APPROVAL_PENDING: Exceeds Limit $\to$ Manager Escalation
    APPROVAL_PENDING --> REJECTED: Manager Declines
    APPROVAL_PENDING --> APPROVED: Manager Authorizes
    AUTO_APPROVED --> DELEGATED_TO_SERVICE: Passes to Ride/Hotel/Airport Service
    APPROVED --> DELEGATED_TO_SERVICE: Passes to Ride/Hotel/Airport Service
    DELEGATED_TO_SERVICE --> INVOICED: Company Monthly Central Billing
```
