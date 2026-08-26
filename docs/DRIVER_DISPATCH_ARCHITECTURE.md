# Driver Dispatch Architecture & Proximity Engine

## Overview
The **Cab Management Unified Dispatch Engine** is an enterprise-grade, multi-mode spatial dispatch and atomic matching system designed for high-concurrency ride hailing. It simultaneously manages three discovery paradigms without code bifurcation:

1. **Nearby Driver Dispatch (Mode 1 — Dynamic Proximity Matching)**: Discovers drivers within physical radius (PostGIS `ST_DWithin`) based on real-time GPS coordinates, vehicle eligibility, and location freshness.
2. **Driver Selected City Coverage (Mode 2 — City Bounds Matching)**: Matches drivers who explicitly configured city-level operational preferences (`visibility_mode = 'specific_city'`).
3. **Driver Selected Hex / Zone Coverage (Mode 3 — Micro-Spatial Hex Matching)**: Matches drivers monitoring specific H3 hexagonal spatial cells (`visibility_mode = 'specific_hex'`).

---

## 1. Unified Dispatch Pipeline

```
                     ┌─────────────────────────────────────────┐
                     │            CUSTOMER REQUEST             │
                     │  (Pickup Lat/Lng, Service, Category)   │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │          SPATIAL RESOLUTION             │
                     │  - Reverse geocodes to City (PostGIS)   │
                     │  - Resolves H3 Hex Cell (Res 7)         │
                     │  - Estimates upfront distance/fare      │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │        3-MODE CANDIDATE DISCOVERY       │
                     │  1. PostGIS ST_DWithin (Physical Dist)  │
                     │  2. Driver City Coverage (dcc.city_id)  │
                     │  3. Driver Hex Monitored (dhc.hex_id)   │
                     │  - Excludes active/busy drivers         │
                     │  - Excludes rejected / removed offers   │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │       MULTI-WAVE FANOUT DISPATCH        │
                     │  - Wave 1: 0 - 15 km Radius             │
                     │  - Wave 2: 15 - 25 km Expansion         │
                     │  - Creates PENDING RideOffer per driver │
                     └────────────────────┬────────────────────┘
                                          │
                     ┌────────────────────┴────────────────────┐
                     │                                         │
                     ▼                                         ▼
       ┌───────────────────────────┐             ┌───────────────────────────┐
       │   SOCKET.IO / RADAR       │             │   BACKGROUND PUSH (FCM)   │
       │   `RIDE_REQUEST_NEW`      │             │   Interactive Notification│
       │   Live Map Node & Card    │             │   Category: INCOMING_RIDE │
       └─────────────┬─────────────┘             └─────────────┬─────────────┘
                     │                                         │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │        ATOMIC CONCURRENCY ENGINE        │
                     │      (First Valid Accept Wins)          │
                     │  - SELECT FOR UPDATE on RideRequest     │
                     │  - Winner: Offer -> ACCEPTED            │
                     │            Ride -> ASSIGNED             │
                     │  - Losers: Offer -> REMOVED / SUPERSEDED│
                     │            `RIDE_REQUEST_REMOVED` sent  │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │      3 KM PROXIMITY OTP TRIGGER         │
                     │  - When Driver <= 3000m of Pickup:      │
                     │    * Generates 4-digit PIN              │
                     │    * Emits `OTP_READY` to Customer      │
                     │  - Driver verifies PIN at Pickup        │
                     │  - Transition to `IN_PROGRESS`          │
                     └─────────────────────────────────────────┘
```

---

## 2. PostGIS Candidate Discovery Query

The spatial resolver executes an optimized single-round PostGIS query filtering by physical proximity, coverage mode, KYC status, and availability:

```sql
SELECT DISTINCT
    d.id AS driver_id,
    d.user_id AS user_id,
    d.full_name,
    d.phone,
    d.rating,
    u.device_token,
    COALESCE(dp.visibility_mode, 'all_city') AS visibility_mode,
    v.id AS vehicle_id,
    COALESCE(v.make, 'Standard') AS make,
    COALESCE(v.model, 'Cab') AS model,
    COALESCE(v.color, 'White') AS color,
    COALESCE(v.registration_number, 'MH-12-REG') AS registration_number,
    COALESCE(v.vehicle_type::text, 'SEDAN') AS vehicle_type,
    COALESCE(v.seat_capacity, 4) AS seat_capacity,
    ST_Distance(
        d.current_location,
        ST_SetSRID(ST_MakePoint(:pickup_lng, :pickup_lat), 4326)::geography
    ) / 1000.0 AS distance_km,
    CASE
        WHEN dp.visibility_mode = 'specific_hex' AND dhc.hex_id = CAST(:hex_id AS uuid) THEN 'HEX_COVERAGE'
        WHEN dp.visibility_mode = 'specific_city' AND dcc.city_id = CAST(:city_id AS uuid) AND dcc.is_selected = TRUE THEN 'CITY_COVERAGE'
        ELSE 'NEARBY'
    END AS match_mode
FROM drivers d
JOIN users u ON u.id = d.user_id
LEFT JOIN driver_preferences dp ON dp.driver_id = d.id
LEFT JOIN vehicles v ON v.driver_id = d.id
LEFT JOIN driver_city_coverage dcc ON dcc.driver_id = d.id AND dcc.is_active = TRUE
LEFT JOIN driver_hex_coverage dhc ON dhc.driver_id = d.id AND dhc.is_active = TRUE
WHERE
    d.status::text IN ('ONLINE', 'online')
    AND d.kyc_status::text IN ('APPROVED', 'approved')
    AND d.current_location IS NOT NULL
    -- Physical proximity filter (authoritative PostGIS ST_DWithin)
    AND ST_DWithin(
        d.current_location,
        ST_SetSRID(ST_MakePoint(:pickup_lng, :pickup_lat), 4326)::geography,
        :max_radius_m
    )
    -- 3-Mode Coverage Preference Filter
    AND (
        (COALESCE(dp.visibility_mode, 'all_city') = 'all_city')
        OR
        (dp.visibility_mode = 'specific_city' AND dcc.city_id = CAST(:city_id AS uuid) AND dcc.is_selected = TRUE)
        OR
        (dp.visibility_mode = 'specific_hex' AND dhc.hex_id = CAST(:hex_id AS uuid))
        OR
        (CAST(:city_id AS text) IS NULL)
    )
    -- Exclude drivers who already rejected or had this offer removed
    AND d.id NOT IN (
        SELECT ro.driver_id FROM ride_offers ro
        WHERE ro.ride_request_id = CAST(:ride_request_id AS uuid)
          AND ro.status::text IN ('rejected', 'REJECTED', 'expired', 'EXPIRED', 'removed', 'REMOVED', 'superseded', 'SUPERSEDED')
    )
    -- Exclude drivers currently occupied on an active ride
    AND d.id NOT IN (
        SELECT rr.assigned_driver_id FROM ride_requests rr
        WHERE rr.assigned_driver_id IS NOT NULL
          AND rr.status::text IN ('assigned', 'ASSIGNED', 'pickup', 'PICKUP', 'in_progress', 'IN_PROGRESS')
    )
ORDER BY distance_km ASC
LIMIT 50;
```

---

## 3. Atomic Assignment & Double-Accept Protection

To ensure zero race conditions and guarantee that only one driver is assigned when multiple drivers tap "Accept":
1. The backend locks the `RideRequest` record using `SELECT ... FOR UPDATE`.
2. Validates that `ride_request.status IN ('MATCHING', 'DISPATCHING', 'CREATED')` and `ride_request.assigned_driver_id IS NULL`.
3. The winner's `RideOffer` is updated to `ACCEPTED`, and `RideRequest` status becomes `ASSIGNED`.
4. All competing pending offers for that request are marked `REMOVED`.
5. Redis publishes `RIDE_REQUEST_REMOVED` on competing driver channels (`driver:{user_id}:events`) so other driver screens auto-dismiss the offer.
6. A competing driver whose request was in-flight receives an HTTP response:
   ```json
   {
     "success": false,
     "status": "superseded",
     "message": "This ride was already assigned to another driver."
   }
   ```

---

## 4. Rejection & Wave Expansion Handling

- When a driver rejects an incoming offer:
  - Only that driver's `RideOffer` status is updated to `REJECTED`.
  - The customer's `RideRequest` status **remains `MATCHING`**.
  - If all active offers in the current wave are rejected or expire, the dispatch engine automatically expands search radius (e.g. from 15km to 25km) and dispatches Wave 2 without disrupting the customer's waiting screen.

---

## 5. Verification Status
All 7 E2E production test scenarios verified via `backend/scripts/verify_master_dispatch_e2e.py`:
- [x] Mode 1: Nearby PostGIS candidate search
- [x] Mode 2: Specific City Coverage filtering
- [x] Mode 3: Hex cell monitored filtering
- [x] Multi-Wave Fanout & Atomic First Accept Wins
- [x] Driver Reject resilience
- [x] 3 KM OTP Proximity Trigger & 4-digit PIN start
- [x] Authoritative Trip Completion & 80/20 earnings settlement
