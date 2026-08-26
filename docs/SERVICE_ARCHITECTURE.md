# SuperApp 10-Service Architecture Breakdown

## Overview
This document provides the complete engineering specification for each of the 10 distinct service domains within the SuperApp.

---

## 1. 🚖 Service 1 — Cab & On-Demand Ride
- **Customer App Interface**:
  - Input: Pickup, Drop, Saved Places, Multi-Stops, Pickup Notes, Category (Economy, Sedan, SUV, EV), Promo code, Payment Mode (Cash, Online, Wallet).
  - Telemetry: Real-time driver vehicle icon on map, 3KM OTP PIN Card, Live ETA, In-Ride SOS button.
- **Driver App Interface**:
  - Incoming Offer Modal (30s timer, Pickup/Drop distance, Fare & Net Earning, Route Preview).
  - Navigation screen: Turn-by-turn to pickup $\to$ Arrived $\to$ 4-Digit OTP Entry $\to$ Start $\to$ Destination Drop.
- **Backend Entities**: `ride_orders`, `ride_requests`, `ride_offers`, `ride_stops`, `ride_receipts`, `driver_earning_ledger`.
- **Spatial & PostGIS**: `ST_DWithin` physical proximity matching with multi-wave fallback (15km $\to$ 25km).
- **Financial Model**: Gross Fare $-$ 20% Platform Commission $+$ Surge/Tips $=$ 80% Driver Net Earnings.

---

## 2. 📦 Service 2 — Parcel & Package Delivery
- **Customer App Interface**:
  - Input: Sender Name/Phone, Receiver Name/Phone, Parcel Category (Document, Electronics, Clothing, Fragile), Weight (KG), Dimensions (L×W×H), Insurance/Declared Value.
  - Tracking: Live transit map, Receiver delivery PIN, Downloadable POD receipt.
- **Driver App Interface**:
  - Delivery Job Card: Weight, package type, sender/receiver notes, handling requirements.
  - Workflow: Pickup verification $\to$ In-Transit $\to$ Receiver Delivery OTP $\to$ POD Signature & Photo Capture $\to$ Complete.
- **Backend Entities**: `parcel_orders`, `parcel_packages`, `parcel_assignments`, `parcel_pod`, `parcel_events`.
- **Cloudinary Integration**: Mandatory upload of recipient signature and package handover photo.

---

## 3. 🚚 Service 3 — Transport & Freight Logistics
- **Customer App Interface**:
  - Input: Goods Type (Industrial, Commercial, Agricultural, Household), Weight (Tons/KG), Volume (CFT), Vehicle Requirement (Pickup, 14ft Mini Truck, 32ft Container, Flatbed), Loading/Unloading helpers needed.
  - Bidding Hub: View transporter quotes, counter-offers, driver ratings, and confirm assignment.
- **Driver / Transporter Interface**:
  - Freight Lead Feed: Cargo specs, route, loading window, helper requirement.
  - Actions: Submit Quote, Counter-offer, Confirm Job, Dock Check-in, Loading, Weighbridge POD, Delivery signoff.
- **Backend Entities**: `transport_orders`, `transport_quotes`, `transport_quote_messages`, `transport_assignments`, `transport_pod`.

---

## 4. ✈ Service 4 — Airport Transport & Flight Monitoring
- **Customer App Interface**:
  - Airport Pickup: Airport, Terminal, Airline, Flight Number, Date, Meet & Greet request, Child Seat, Luggage count.
  - Airport Drop: Home Pickup, Departure Terminal, Flight Time, Desired Buffer Window.
- **Driver Interface**:
  - Flight-adjusted arrival window, terminal holding zone instructions, passenger paging banner.
- **Backend Entities**: `airports`, `airport_terminals`, `flights`, `airport_bookings`, `airport_pickup_windows`.
- **Flight Radar Integration**: Background cron polls flight status API; dynamically shifts driver dispatch window if flight is delayed without customer manual intervention.

---

## 5. 🕐 Service 5 — Hourly Car Rental
- **Customer App Interface**:
  - Package Selector (1 Hr / 10 KM, 2 Hr / 20 KM, 4 Hr / 40 KM, 8 Hr / 80 KM, Full Day), Vehicle Category.
  - In-Ride Dashboard: Active usage timer, included KM balance, live overage rate indicator.
- **Driver Interface**:
  - Dedicated rental session screen: Time elapsed, KM traversed (GPS odometer), extra stops log, completion signoff.
- **Backend Entities**: `rental_orders`, `rental_plans`, `rental_sessions`, `rental_stops`, `rental_fares`.

---

## 6. 🌍 Service 6 — Outstation Multi-City
- **Customer App Interface**:
  - Journey Type (One-Way or Round-Trip), Departure Date/Time, Return Date/Time, Intermediate tourist stops, Vehicle type.
  - Itemized Estimate: Base Fare, Driver Allowance (₹300/day), Night Halt Charge (₹500/night), State Permit Tolls.
- **Driver Interface**:
  - Full itinerary review, intercity toll receipts logger, overnight halt check-in, return leg activation.
- **Backend Entities**: `outstation_orders`, `outstation_legs`, `outstation_stops`, `outstation_pricing`, `outstation_charges`.

---

## 7. 🚖 Service 7 — Intercity Carpool (Published Trips)
- **Driver Publishing Flow**:
  - Driver inputs route (e.g. Pune $\to$ Mumbai), departure time, available seats (1 to 6), price per seat (₹450), pickup/drop waypoints.
- **Customer Booking Flow**:
  - Search corridor $\to$ View matching published carpool rides $\to$ Select seat(s) $\to$ Request booking $\to$ Driver confirms.
- **Backend Entities**: `trips`, `bookings`, `trip_waypoints`, `trip_seats`.
- **Spatial Matching**: Corridor matcher evaluates whether customer's pickup/drop lies within a 3KM buffer of driver's route polyline.

---

## 8. 🏠 Service 8 — Packers & Movers
- **Customer App Interface**:
  - Move Size (1 RK, 1 BHK, 2 BHK, 3+ BHK, Villa, Office), Move Date, Floors & Lift Availability at both ends.
  - Itemized Inventory: Large Furniture, Electronics, Kitchenware, Fragile Crates, Assembly/Disassembly needs.
- **Partner / Moving Team Interface**:
  - Moving job details, crew assignment, packing materials checklist, inventory tagging, damage inspection, delivery signoff.
- **Backend Entities**: `moving_orders`, `moving_items`, `moving_quotes`, `moving_assignments`, `moving_workers`, `moving_pod`.

---

## 9. 🏨 Service 9 — Hotel Booking
- **Customer App Interface**:
  - Search City/Destination, Check-in/Check-out dates, Room count, Adults/Children, Amenities filter (Breakfast, Pool, WiFi, AC, Parking).
  - Room Detail, Instant Booking Confirmation, Voucher with QR Code.
- **Hotel Partner Interface**:
  - Room inventory manager, rate card setup, daily guest check-in/check-out roster, settlement reports.
- **Backend Entities**: `hotels`, `hotel_rooms`, `hotel_bookings`, `hotel_amenities`, `hotel_partner_settlements`.
- **Cross-Service Hook**: On hotel booking confirmation, prompts customer with one-tap option to book an Airport or Station Transfer cab.

---

## 10. 🏢 Service 10 — Corporate Travel & Enterprise Billing
- **Employee Experience**:
  - Toggle "Book as Corporate" during checkout $\to$ Select Cost Center / Project $\to$ Automated Policy Check.
- **Company Admin Portal**:
  - Employee directory, Department budgets, Travel policy rules (e.g. Max ₹500/ride, Economy only), Monthly centralized invoice.
- **Backend Entities**: `corporate_accounts`, `corporate_employees`, `corporate_policies`, `corporate_bookings`, `corporate_invoices`.
- **Privacy Firewall**: Driver receives standard operational job payload; corporate billing contracts and internal HR metadata are strictly firewalled.
