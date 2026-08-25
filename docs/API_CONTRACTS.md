# Master SuperApp API & Realtime Contracts

## 1. REST Endpoint Standards

All endpoints follow strict RESTful resource hierarchies mounted under `/api/v1/`:

| Domain | Base Route | Key Operations |
| :--- | :--- | :--- |
| **Authentication & Users** | `/api/v1/auth` | `/login`, `/register`, `/refresh`, `/me`, `/devices`, `/security` |
| **Cab / Rides** | `/api/v1/matching/rides` | `/request`, `/respond`, `/cancel`, `/radar`, `/coverage`, `/{id}/verify-and-start` |
| **Parcel Delivery** | `/api/v1/parcels` | `/create`, `/quote`, `/track/{id}`, `/{id}/pickup`, `/{id}/pod` |
| **Transport & Freight** | `/api/v1/transport` | `/orders`, `/quotes`, `/quotes/{id}/accept`, `/{id}/loading-status` |
| **Airport Transport** | `/api/v1/airport` | `/bookings`, `/flights/{flight_no}`, `/{id}/terminal-checkin` |
| **Hourly Rentals** | `/api/v1/rentals` | `/plans`, `/reserve`, `/{id}/extend`, `/{id}/complete` |
| **Outstation Multi-City** | `/api/v1/outstation` | `/request`, `/pricing`, `/{id}/legs`, `/{id}/complete` |
| **Intercity Published Trips** | `/api/v1/trips` | `/publish`, `/search`, `/book`, `/{id}/accept-passenger` |
| **Packers & Movers** | `/api/v1/moving` | `/requests`, `/quotes`, `/{id}/inventory-checklist`, `/{id}/complete` |
| **Hotels** | `/api/v1/hotels` | `/search`, `/{id}`, `/book`, `/reservations/{id}/checkin` |
| **Corporate Travel** | `/api/v1/corporate` | `/policies`, `/approvals`, `/bookings`, `/invoices` |
| **Payment & Wallet** | `/api/v1/payments` | `/create-order`, `/verify`, `/wallet/balance`, `/wallet/topup`, `/payouts` |
| **Activity History Hub** | `/api/v1/bookings/activity` | Cursor-paginated aggregation across all 10 services |
| **Support Hub** | `/api/v1/support` | `/faq`, `/tickets`, `/tickets/{id}/messages`, `/ai-chat` |
| **Safety Hub** | `/api/v1/safety` | `/sos`, `/share-trip`, `/anomalies` |

---

## 2. Canonical Realtime Event Envelope (Socket.IO & Redis)

All events emitted across Redis channels and Socket.IO rooms adhere to this standard structure:

```json
{
  "event_id": "evt_01JBCDEF9876543210ABCDEF",
  "event": "RIDE_REQUEST_NEW",
  "service_type": "RIDE",
  "aggregate_type": "ride_request",
  "aggregate_id": "910a77ae-efdd-4997-9103-448bfbc665e5",
  "customer_id": "b3b17824-9d2c-4576-848e-2e92e620537f",
  "driver_id": "03d8fcba-5ce8-484f-bb31-45456440aaeb",
  "occurred_at": "2026-08-25T08:20:14.000Z",
  "version": 1,
  "payload": {
    "offer_id": "10f9438e-3206-480b-83c2-549984992142",
    "pickup": {
      "address": "Swargate, Pune",
      "lat": 18.5204,
      "lng": 73.8567,
      "distance_km": 1.4,
      "eta_min": 4
    },
    "destination": {
      "address": "Hinjawadi Phase 1, Pune",
      "lat": 18.5913,
      "lng": 73.7389
    },
    "trip": {
      "fare": 384.12,
      "earning": 307.30,
      "distance_km": 14.5,
      "duration_min": 35
    },
    "customer": {
      "name": "Pankaj",
      "phone_masked": "+91 98••••2345"
    }
  }
}
```

---

## 3. High-Priority Socket.IO Events Matrix

| Event Name | Direction | Room / Channel | Description |
| :--- | :--- | :--- | :--- |
| `RIDE_REQUEST_NEW` | Server $\to$ Driver | `driver:{user_id}:events` | New nearby/city/hex offer available for accept |
| `RIDE_REQUEST_REMOVED` | Server $\to$ Driver | `driver:{user_id}:events` | Offer awarded to competitor or cancelled by customer |
| `RIDE_ASSIGNED` | Server $\to$ Customer | `customer:{user_id}:events` | Driver accepted ride; live vehicle details attached |
| `OTP_READY` | Server $\to$ Customer | `customer:{user_id}:events` | Driver within 3km; reveals 4-digit ride start PIN |
| `LOCATION_UPDATE` | Server $\to$ Customer | `customer:{user_id}:events` | Real-time driver GPS coordinate stream |
| `PARCEL_IN_TRANSIT` | Server $\to$ Both | `parcel:{parcel_id}:events` | Driver picked up parcel and is moving to destination |
| `POD_SUBMITTED` | Server $\to$ Customer | `customer:{user_id}:events` | Proof of delivery signature & image uploaded |
| `SOS_TRIGGERED` | Server $\to$ Safety Ops | `safety:alerts` | High-priority SOS panic signal broadcast |
