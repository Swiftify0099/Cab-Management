# Driver Published Trips vs On-Demand Ride Requests

## Architecture Separation
The platform maintains strict separation between **Published Trips** (Intercity seat-by-seat carpooling) and **On-Demand Ride Requests** (Point-to-point urban hailing).

---

## 1. Domain Comparison

| Feature | Published Trips (`PUBLISHED_TRIP`) | On-Demand Ride Requests (`ON_DEMAND_RIDE`) |
| :--- | :--- | :--- |
| **Creator** | Driver (e.g. Pune $\to$ Mumbai at 06:00 PM) | Customer (e.g. Swargate $\to$ Hinjawadi right now) |
| **Booking Mechanism** | Customers search scheduled corridors and book individual seats | Customer creates request; Engine dispatches to nearby drivers |
| **Data Models** | `Trip`, `Booking`, `TripWaypoint`, `TripSeat` | `RideRequest`, `RideOffer`, `RideStop`, `RideReceipt` |
| **Matching Paradigm** | Corridor matching (3KM corridor buffer + time window) | 3-Mode Proximity + Spatial Coverage Engine |
| **Pricing Model** | Per-seat fixed rate set by driver or platform tier | Upfront dynamic fare estimate based on distance + duration + surge |
| **Driver Notification** | `INCOMING_TRIP_REQUEST` (Seat reservation request) | `RIDE_REQUEST_NEW` (Full cab on-demand offer) |
| **Lifecycle** | `SCHEDULED` $\to$ `DEPARTED` $\to$ `COMPLETED` | `MATCHING` $\to$ `ASSIGNED` $\to$ `PICKUP` $\to$ `IN_PROGRESS` $\to$ `COMPLETED` |

---

## 2. Shared Subsystems
Both paradigms share foundational infrastructure:
- **Spatial Resolution**: PostGIS spatial functions (`ST_DWithin`, `ST_Distance`).
- **Start Verification**: 4-digit PIN OTP verification before departure.
- **Safety Hub**: In-ride SOS, live GPS tracking, and route deviation anomaly alerts.
- **Settlement Ledger**: Double-entry ledger recording gross revenue, platform commission, and driver payout.
