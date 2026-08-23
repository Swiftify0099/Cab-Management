# Customer ↔ Driver Contract — Features 22 to 25

## 1. Booking Participant & Identity Contract
- **Booking Owner (Account Holder / Payer)**:
  - May book for: `SELF`, `FAMILY_MEMBER`, `FRIEND_GUEST`, `EMPLOYEE`.
  - Maintains private billing credentials, wallet balances, corporate payment accounts, and invoice receipts.
  - Receives transactional receipts and booking confirmation events.
- **Operational Rider (Passenger)**:
  - Is the physical participant entering the vehicle.
  - Holds the 4-digit ride start PIN (`otp` / `start_pin_plain`).
  - Receives operational driver communications (masked call / SMS).
- **Assigned Driver**:
  - Receives **strictly operational payload**:
    - `passenger_name` (e.g. "Rahul Deshmukh")
    - `passenger_phone_masked` (e.g. "+91 98••••2345")
    - `pickup_address` & GPS Coordinates
    - `destination_address` & GPS Coordinates
    - `ride_pin` verification prompt
    - Special passenger notes (e.g. "Waiting near gate 2")
  - **Zero Access Guaranteed**: Driver App never receives booking owner's email, wallet balance, corporate company name, family membership details, or credit card tokens.

## 2. Parcel Participant Contract
- **Booking Owner (Payer)** ≠ **Sender (Pickup Contact)** ≠ **Receiver (Drop Contact)** ≠ **Driver (Courier Partner)**.
- Driver receives:
  - Pickup Contact: `sender_name`, `sender_phone_masked`, `sender_address`.
  - Drop Contact: `receiver_name`, `receiver_phone_masked`, `receiver_address`.
  - Package Specifications: `package_category`, `weight_kg`, `declared_value` (if insured).
  - Delivery Confirmation: Proof of Delivery (POD) photo + recipient OTP verification.

## 3. Support & Incident Privacy Contract
- **Customer Support Ticket**:
  - Customer creates ticket linked to `reference_type` (e.g. `RIDE`, `PARCEL`) and `reference_id`.
  - Customer communicates directly with Support Agents in private thread.
- **Driver Support Ticket**:
  - Driver creates ticket linked to same `reference_id` (e.g. reporting passenger delay or fare dispute).
  - Driver communicates directly with Support Agents in private thread.
- **Privacy Firewall**:
  - Neither Customer nor Driver can read or access the other party's support messages.
  - Admin Portal sees both tickets grouped by `reference_id` for fair dispute arbitration.

## 4. Safety & Emergency Escalation Contract
- Customer SOS trigger routes to Safety Operations Center with live location and ride details.
- Safety Critical incidents take priority over all operational tasks and cannot be cancelled or closed by AI.

## 5. Security & Trust Domain Separation (Feature 26)
- **Customer Security Domain**: Evaluates customer device trust, login velocity, promo farming, and account protection.
- **Driver Security Domain**: Evaluates driver GPS spoofing, mock locations, hardware integrity, and trip trajectory.
- **Isolation Invariant**: An account review or security flag on a customer never alters driver credentials or platform payouts, and vice versa.

## 6. Smart Features & Intelligence Firewall (Feature 27)
- **Smart Engine ≠ Authoritative Domain Engine**: Smart layer produces recommendations, rankings, predictions, and signals; final fare, assignment, payment, safety, authorization, and state transitions are strictly committed by existing domain engines (`DispatchService`, `FareEngine`).
- **Nearest Driver ≠ Best Driver**: Driver candidate scoring is multi-factor (Road ETA 35%, Rating 20%, Idle Time 15%, Acceptance 15%, Destination Alignment 15%).
- **Privacy Firewall**: Customer never sees driver ranking scores, internal weights, or driver home targets. Driver never sees customer private commute routines, frequent destination history, or risk scores.

## 7. Cross-Service Orchestration & Journey Isolation (Feature 28)
- **Domain Independence**: Cross-Service Orchestrator coordinates multi-leg journeys (`Journey`) and linked requests without mutating underlying domain tables.
- **Driver Operational Isolation**:
  - Assigned Driver receives only the specific trip dispatch object (`job_type`, `pickup_address`, `drop_address`, `fare`, `start_otp`).
  - Driver has **zero access** to customer's linked hotel reservation, airport flight details, corporate allowances, or full journey timeline.
- **Partner Operational Isolation**:
  - Hotel partner sees room dates and guest name; Transporter sees freight cargo specifications; Neither sees customer cab rides or other service bookings.

## 8. Master Document Storage Architecture & Media Privacy Isolation
- **Storage Invariant**:
  - **Cloudinary**: Stores actual image/document binaries with deterministic tenant and environment folders (`cabapp/{env}/customers/...`, `cabapp/{env}/drivers/...`).
  - **PostgreSQL**: Stores metadata only (`MediaAsset`, `DriverDocument`) with `cloudinary_public_id`, `version`, `format`, `bytes`, `is_private`. **Zero file bytes / base64 strings in the database.**
- **Customer Media**:
  - Public avatar with face-detection auto-crop (`400x400`).
  - Customer can upload, replace, or delete their profile photo at any time.
- **Driver KYC & Vehicle Documents**:
  - Confidential identity records (Aadhaar, PAN, Licence, Live Selfie) and Vehicle records (RC, Insurance, Permit, PUC) are stored as **private/authenticated assets**.
  - Short-lived signed access URLs (`/documents/{doc_type}/access`) are generated on-demand for authorized compliance reviewers and the driver themselves.
- **Customer ↔ Driver Boundary Invariant**:
  - Customers can only see the driver's public photo, name, rating, vehicle make/model/color, and license plate during an active trip.
  - **ZERO ACCESS GUARANTEED**: Customers can **never** query, preview, or access a driver's Aadhaar, PAN card, driving licence scan, KYC selfie, vehicle RC, insurance certificates, or background check reports.
  - Drivers can **never** access another driver's KYC documents or customer identity records.
- **Atomic Replacement**:
  - Profile photos and KYC revisions upload new assets to Cloudinary first.
  - Metadata is committed to PostgreSQL in a transaction.
  - Previous asset is cleaned up only after successful commit, preventing broken user avatars or missing compliance history.
