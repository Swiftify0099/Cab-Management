# Master Customer ↔ Driver Cab Data Contract & Architecture Blueprint

## 1. Architectural Overview & Separation of Concerns

The SuperApp maintains strict separation between **Customer Input Context** and **Driver Operational Context**:
- **Customer App**: Simple Uber-style request input (Pickup, Destination, Multi-Stops, Passengers, Vehicle Category/Variant, Payment, Promo, Book For, Operational Notes). Customers never select backend dispatch parameters (City, Zone, Hex, or specific Drivers).
- **Backend Matching Engine**: Authoritative fare engine, PostGIS proximity search, driver eligibility, 3-mode dispatch (Nearby, City, Hex), fanout offer generation, and atomic first-win assignment.
- **Driver App**: Receives actionable operational request cards and notifications (Pickup, Drop, Pickup Distance/ETA, Trip Distance/Duration, Net Earnings Estimate, Vehicle Requirement, Passenger Count, Scheduled Time, and Permitted Operational Notes). Drivers never receive private stay/hotel or confidential customer details.

---

## 2. Customer ↔ Backend ↔ Driver Data Mapping Contract

| Customer Field / Action | Backend Entity & Processing | Driver Received Field / Action |
| :--- | :--- | :--- |
| **Pickup Location** (Current/Search/Pin) | `pickup_address`, `pickup_lat`, `pickup_lng`, `pickup_location` (PostGIS Geography) | **Pickup Location** (Address, Distance to Pickup, ETA to Pickup) |
| **Destination / Where to?** | `destination_address`, `destination_lat`, `destination_lng`, `destination_location` | **Destination** (Address, Total Trip Distance, Trip Duration) |
| **Multiple Stops** (1, 2, 3) | `RideStop` records (`stop_order`, `address`, `lat`, `lng`) | **Waypoints / Intermediate Drops** on Navigation Map |
| **Vehicle Category & Variant** | Backend Service Catalog & Eligibility (`SEDAN`, `SUV`, `COMFORT`, `PREMIUM`) | **Vehicle Match Requirement** (Category & Variant badge) |
| **Passenger Count & Luggage** | Capacity validation & Vehicle Recommendation Engine | **Passenger Count** & Trunk space requirement |
| **Pickup Notes** ("Gate 2", "Call upon arrival") | Sanitized operational instruction (`pickup_notes`) | **Pickup Instruction Banner** |
| **Fare Estimate** | Server Authoritative Fare Engine (Base, Distance, Time, Toll, Tax, Platform Fee, Surge) | **Estimated Net Earnings** (80% net driver payout) |
| **Payment Method** (Cash, UPI, Card, Wallet) | `payment_method`, `payment_status` | **Payment Mode Badge** (Cash to Collect / Digital Paid) |
| **Book for Someone Else** | `rider_name`, `rider_phone`, `rider_type` (FAMILY/FRIEND/EMPLOYEE) | **Actual Rider Contact** (Masked Call / Chat to Actual Rider) |
| **Book Now vs Schedule Later** | `is_scheduled`, `scheduled_departure` | **Scheduled Time Indicator** (Immediate vs Reserve) |
| **Customer Confirmation** | `RideRequest` (`status = MATCHING`) & Fanout `RideOffer` records | **Incoming Ride Request Modal & Actionable Notification** |
| **Matching State** | Atomic First-Accept Wins conditional transaction | **ACCEPT** / **REJECT** Action Buttons |
| **Driver Assignment** | Notification via Socket.IO & FCM/APNs | **Assigned Job** (`status = EN_ROUTE_PICKUP`) |
| **Live Tracking** | Redis Pub/Sub GPS Telemetry stream | **Driver GPS Telemetry Stream** (Lat, Lng, Heading, Speed) |
| **3 KM Proximity OTP** | Server triggers `RIDE_START` 4-digit PIN when distance $\le$ 3000m | **Enter 4-Digit Customer OTP** to start trip |
| **Ride Start Handshake** | Backend validates PIN, sets `status = STARTED` | **Navigation to Destination Starts** |
| **Trip Completion** | Final Fare calculation, 80/20 Double-Entry Ledger settlement | **Job Completed Screen** & Net Earnings credited to Wallet |
| **Rating & Feedback** | Aggregates Chauffeur & Customer rating scores | **Performance & Rating Update** |

---

## 3. Customer-Side Cab Booking Flow & Field Specifications

### 3.1 Screen 1: Home & Request
- **Pickup Input**:
  - Current GPS Location with High Accuracy fallback
  - Saved Places (Home, Work)
  - Recent Search History
  - Search Autocomplete & Map Pin Dragging
  - Optional Pickup Notes (e.g., *"Gate No. 2, near fountain"*)
- **Destination Input**:
  - "Where to?" Search Bar
  - Recent & Saved destinations
  - Direct Map Selection
- **Multiple Stops**:
  - Add Stop (`+` button, configurable up to 3 intermediate waypoints)
  - Drag-and-drop stop reordering with sequence validation
  - Coordinate validation and route recalculation
- **Passenger & Luggage Input**:
  - Passenger Count Selector (1 to 6)
  - Smart Vehicle Recommendation (e.g., 4 passengers + 3 bags $\to$ recommends SUV)
- **Vehicle Category & Variant Selection**:
  - Dynamically fetched from Backend Service Catalog (Bike, Auto, Mini, Sedan, SUV, Premium, EV)
  - Variants: Standard, Comfort, Executive Premium
  - Displays: Vehicle Icon, Category Name, Available Seats, Estimated Pickup ETA, Estimated Total Fare
- **Fare Breakdown Display**:
  - Itemized display: Base Fare, Distance Charge, Time Charge, Estimated Tolls, Platform Fee, GST Tax, Surge Multiplier, Applied Discount
  - Clear label: **ESTIMATED TOTAL** (Backend calculated)
- **Payment Method & Promo**:
  - Options: Wallet Balance, UPI, Credit/Debit Card, Net Banking, Cash on Drop
  - Promo Code input with instant server validation
- **Book for Someone Else**:
  - Options: Myself, Family, Friend, Employee
  - Captures actual passenger name & phone number for driver communication
- **Schedule / Reserve**:
  - Book Now (Instant Dispatch) vs Schedule Later (Date & Time Picker with min 45-min lead time)

### 3.2 Screen 2: Driver Matching
- Displays real-time matching state: *"Searching for nearby drivers..."* $\to$ *"Connecting with available drivers..."*
- Zero mock animations; status strictly synchronized with backend `RideRequest.status = MATCHING`.

### 3.3 Screen 3: Driver Assigned & Approaching
- Customer receives instant FCM/APNs alert and Socket.IO `RIDE_ASSIGNED` event.
- Displays Chauffeur Details: Photo, Full Name, Verified Badge, Rating (⭐ 4.9), Vehicle Make/Model/Color, License Plate Number, Real-time ETA.
- Actions: **Track Now**, **Call Driver (Masked)**, **In-App Chat**, **Cancel Ride**.

### 3.4 Screen 4: 3 KM Proximity OTP
- When driver approaches within 3,000 meters of pickup, backend generates a secure 4-digit `RIDE_START` PIN.
- Customer screen prominently displays the 4-digit PIN for chauffeur verification.

### 3.5 Screen 5: Active Ride & Safety Controls
- Live interactive Map with driver GPS marker, vehicle orientation, polyline route, and traffic layer.
- Trip Progress Bar: Distance remaining, Estimated Time to Destination, Multi-stop progression.
- Safety Center: **Emergency SOS (112 / Platform Dispatch)**, **Share Live Trip Link**, **Safety PIN verification**.

### 3.6 Screen 6: Trip Summary & Rating
- Displays Final Authoritative Fare, Itemized Bill, Payment Status, and Tip Option.
- 5-Star Rating & Chauffeur Compliment badges (Clean Vehicle, Smooth Driving, Professional Chauffeur).

---

## 4. Driver-Side Request Card & Lifecycle Specifications

### 4.1 Foreground Incoming Request Card (BottomSheet / Full Modal)
- **Service Header**: `NEW CAB BOOKING REQUEST` (Green theme badge)
- **Trip Route**: Pickup Address & Drop Address with route distance
- **Operational Metrics**:
  - Pickup Distance (e.g., `1.8 km`) & Pickup ETA (e.g., `4 min`)
  - Total Trip Distance (e.g., `18.4 km`) & Duration (e.g., `32 min`)
- **Financial Earnings**:
  - **Estimated Earning**: `₹385.00` (80% net chauffeur payout)
  - Payment Mode: `DIGITAL (PAID)` or `CASH TO COLLECT`
- **Vehicle & Rider Specifications**:
  - Required Category: `Comfort Sedan`
  - Passenger Count: `2 Passengers`
  - Operational Note: *"Gate No. 2"*
- **Countdown Timer**: 30 to 180 seconds circular progress ring.
- **Action Buttons**: `REJECT` (Decline offer) and `ACCEPT` (First valid accept wins).

### 4.2 Actionable Background Push Notification (FCM / APNs)
- Title: `🚕 New Ride Request (₹385 Estimated Earning)`
- Body: `Pickup: Swargate, Pune → Drop: Hinjawadi Phase 1 (18.4 km)`
- Quick Actions: `[ ACCEPT ]` and `[ REJECT ]` handled natively by background task handler.

### 4.3 Driver State Machine
```
OFFLINE ──► ONLINE ──► SEARCHING ──► REQUESTED (Offer Received)
                          │                 │
                          │                 ▼
                          │         [ACCEPT] (First Win)
                          │                 │
                          │                 ▼
                          └──────────  ASSIGNED
                                            │
                                            ▼
                                     EN_ROUTE_PICKUP
                                            │
                                            ▼
                                         ARRIVED
                                            │ (Enter 4-digit OTP)
                                            ▼
                                         STARTED
                                            │
                                            ▼
                                       IN_PROGRESS
                                            │
                                            ▼
                                        COMPLETED ──► 80/20 Ledger Settlement
```

---

## 5. Security & Business Invariants

1. **Zero Client-Side Authoritative Calculation**: Neither the customer app nor the driver app calculates authoritative fares or earnings; all pricing is generated and finalized by the backend `FareEngine`.
2. **First Valid Accept Wins**: Double-accept race conditions are prevented using atomic database transactions with conditional updates (`UPDATE ride_offers SET status = 'ACCEPTED' WHERE id = :offer_id AND status = 'OFFERED'`).
3. **Proximity-Gated OTP Handshake**: Ride Start OTPs cannot be verified until the driver is within valid range, preventing premature ride starts.
4. **Data Privacy & Actual Rider Context**: Chauffeurs receive only authorized actual rider contact data and operational pickup notes; private customer profile credentials, financial secrets, and stay histories are never leaked.
5. **Universal Double-Entry Financial Ledger**: Every completed cab ride writes an immutable record to `DriverEarningLedger` and credits the driver's wallet.
