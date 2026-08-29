# ⚡ SUPERAPP SOCKET.IO REALTIME EVENT CONTRACT (PHASE 1 – 25)

---

## 🔌 1. REALTIME ROOM TOPOLOGY & REDIS PUB/SUB BRIDGE

```mermaid
graph TD
    RedisPub[Redis Channel: live:location:updates] --> SocketWorker[FastAPI / Socket.IO Worker]
    RedisEvents[Redis Channel: driver:{id}:events] --> SocketWorker
    RedisCust[Redis Channel: customer:{id}:events] --> SocketWorker
    
    SocketWorker --> RoomPartner[Room: partner:{driver_id}]
    SocketWorker --> RoomCustomer[Room: customer:{customer_id}]
    SocketWorker --> RoomTrip[Room: trip:{ride_id}]
    SocketWorker --> RoomOrder[Room: order:{order_id}]
    SocketWorker --> RoomCorridor[Room: corridor:{origin}:{dest}]
    
    RoomPartner --> PartnerDevice[Partner Mobile App]
    RoomCustomer --> CustomerDevice[Customer Mobile App]
```

---

## 📋 2. AUTHORITATIVE SOCKET EVENT CATALOG

| Channel / Event Name | Producer | Consumer | Room Target | Payload Schema | Runtime Action | Status |
|:---|:---|:---|:---|:---|:---|:---:|
| `driver:location:update` | Driver App | Matching Service | `matching:spatial` | `{driver_id, lat, lng, heading, speed, timestamp}` | Updates PostGIS cache & Redis H3 index | `VERIFIED` |
| `ride:offer:created` | Matching Svc | Driver App | `partner:{id}` | `{offer_id, ride_id, pickup, drop, fare, eta, distance}` | Triggers Global Request Modal | `VERIFIED` |
| `ride:offer:removed` | Matching Svc | Competing Drivers| `partner:{id}` | `{offer_id, reason: 'ASSIGNED_TO_OTHER'}` | Closes incoming modal immediately | `VERIFIED` |
| `ride:status:updated` | State Machine| Customer/Driver | `trip:{id}` | `{ride_id, status: 'DRIVER_ARRIVED', otp}` | Advances trip screen UI state | `VERIFIED` |
| `parcel:otp:verified` | Parcel Svc | Customer/Sender | `customer:{id}` | `{parcel_id, tracking_number, status: 'IN_TRANSIT'}` | Updates delivery tracker live | `VERIFIED` |
| `transport:quote:new` | Transporter | Customer App | `order:{id}` | `{order_id, quote_id, amount, vehicle, helpers}` | Renders bidding bottom-sheet card | `VERIFIED` |
| `transport:counter` | Customer | Transporter | `partner:{id}` | `{quote_id, counter_amount, round, note}` | Prompts counter-offer response | `VERIFIED` |
| `airport:flight:delay`| Flight Engine| Driver/Customer | `booking:{id}` | `{flight_number, delay_minutes: 35, shifted_window}`| Updates flight status badge & ETA | `VERIFIED` |
| `rental:timer:sync` | Rental Svc | Driver/Customer | `rental:{id}` | `{booking_id, start_time, elapsed_minutes, overage_km}`| Syncs authoritative rental timer | `VERIFIED` |
| `carpool:seat:booked`| Carpool Svc | Host Driver | `partner:{id}` | `{trip_id, passenger_name, seats: 2, otp}` | Decrements available seat counter | `VERIFIED` |
| `safety:sos:broadcast`| Safety Svc | Police & Contacts| `emergency:{id}` | `{incident_id, ride_id, live_lat, live_lng, vehicle}` | Triggers urgent red banner & siren | `VERIFIED` |
