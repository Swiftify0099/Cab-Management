# Nearby Matching & Proximity Candidate Discovery Engine

## Executive Summary
**Nearby Matching** is the fundamental spatial discovery mode in the Cab Management platform. It answers the operational question:
> *"Which active, verified, and unassigned drivers are physically closest to this customer's pickup coordinate right now?"*

Unlike scheduled or intercity seat booking (which depends on driver-published routes and departure schedules), Nearby Matching is on-demand, dynamic, and operates entirely off the customer's live GPS coordinates.

---

## 1. Nearby Matching vs Coverage Modes

| Dimension | Mode 1: Nearby Matching | Mode 2: Driver City Coverage | Mode 3: Driver Hex Coverage |
| :--- | :--- | :--- | :--- |
| **Driver Preference** | `visibility_mode = 'all_city'` | `visibility_mode = 'specific_city'` | `visibility_mode = 'specific_hex'` |
| **Customer Choice** | None (Customer only enters pickup/drop) | None | None |
| **Spatial Matching** | PostGIS `ST_DWithin(d.location, pickup, radius)` | Driver selected `ServiceCity` + Proximity | Driver selected `ServiceHex` + Proximity |
| **Primary Use Case** | Intra-city on-demand hailing | Multi-city commuting drivers | Micro-zone hotspot drivers (Airports/Stations) |
| **Dispatch Radius** | Wave 1: 0–15 km, Wave 2: 15–25 km | Within City boundary | Within Hex resolution 7 cell |

---

## 2. Proximity Matching Rules & Safeguards

1. **Location Freshness Guarantee**:
   - Only drivers with `updated_at >= now() - 30 minutes` and `accuracy <= 100m` are considered eligible candidates.
   - Offline or stale driver telemetry is automatically filtered out by the PostGIS candidate query.
2. **KYC & Vehicle Validation**:
   - `drivers.kyc_status = 'APPROVED'`.
   - Driver must have an active registered `Vehicle` with sufficient seat capacity for `seats_requested`.
3. **Active Ride Concurrency Lockout**:
   - Drivers assigned to an active ride (`ASSIGNED`, `PICKUP`, `IN_PROGRESS`) are excluded unless enrolled in Feature 21 Back-to-Back chained dispatch.
4. **Rejection Deduplication**:
   - If a driver rejects an offer, their `driver_id` is excluded from subsequent candidate discovery waves for that specific `ride_request_id`.

---

## 3. 3 KM Proximity OTP Delivery

When an assigned driver approaches the customer's pickup location:
1. Driver app emits live GPS updates to `/drivers/location`.
2. The proximity helper `check_driver_proximity_and_deliver_otp` computes Haversine distance between driver and pickup.
3. Once distance $\le 3000\text{ m}$ (3.0 km):
   - Generates or confirms 4-digit ride PIN.
   - Emits `OTP_READY` to customer's personal Redis/Socket room:
     ```json
     {
       "event": "OTP_READY",
       "ride_request_id": "910a77ae-efdd-4997-9103-448bfbc665e5",
       "otp": "4758",
       "distance_km": 2.1,
       "eta_min": 5,
       "message": "Driver is nearby (~2.1 km). Your ride OTP is 4758."
     }
     ```
   - Customer app renders the PIN banner on the `/track` screen.
   - At pickup, the driver enters the PIN to verify and start the ride (`/rides/{id}/verify-and-start`).
