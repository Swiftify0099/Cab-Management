# Realtime Notification & Multi-Channel Alert Architecture

## Architecture Overview
The platform implements a resilient three-tier delivery mechanism to ensure 100% notification delivery regardless of application state:

```
                          ┌───────────────────────────┐
                          │   BACKEND EVENT EMITTER   │
                          │   (RideDispatchService)   │
                          └─────────────┬─────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
       ┌───────────────────────────┐         ┌───────────────────────────┐
       │   REDIS PUB/SUB CHANNEL   │         │   BACKGROUND PUSH QUEUE   │
       │   `driver:{user_id}:events│         │   (Expo Push / Firebase)  │
       └────────────┬──────────────┘         └─────────────┬─────────────┘
                    │                                      │
                    ▼                                      ▼
       ┌───────────────────────────┐         ┌───────────────────────────┐
       │   WEBSOCKET GATEWAY       │         │   DEVICE PUSH SERVICE     │
       │   (Socket.IO Server)      │         │   (APNs / FCM)            │
       └────────────┬──────────────┘         └─────────────┬─────────────┘
                    │                                      │
         [Foreground Active]                     [Background / Killed]
                    │                                      │
                    ▼                                      ▼
       ┌───────────────────────────┐         ┌───────────────────────────┐
       │   DRIVER APP FOREGROUND   │         │   HEADS-UP SYSTEM PUSH    │
       │   - Full Screen Alert     │         │   - Interactive Buttons   │
       │   - Continuous Siren      │         │   - Tap to Open & Accept  │
       │   - Live Radar Node Pulse │         │                           │
       └───────────────────────────┘         └───────────────────────────┘
```

---

## 1. Multi-State Delivery Modes

### 1.1 App in Foreground
- Receives `RIDE_REQUEST_NEW` via Socket.IO room.
- Automatically pops up the `IncomingRequestModal` with 30-second countdown timer.
- Plays alert siren sound and vibrates device.
- Renders pickup/drop map markers and estimated driver earnings.

### 1.2 App in Background
- Receives FCM / Expo High-Priority Push Notification with `categoryIdentifier: 'INCOMING_RIDE'`.
- OS displays interactive notification banner with direct "Accept" and "Decline" action buttons.
- Tapping "Accept" directly invokes `/rides/respond` in the background task handler.

### 1.3 Reconnect / Cold Start Synchronization
- When driver reconnects or opens app after being killed, the app executes:
  - `GET /api/v1/matching/rides/radar` — Hydrates active Radar map nodes.
  - `GET /api/v1/driver/trips/active` — Restores in-progress trip state if assigned.

---

## 2. Competitive Offer Removal Flow (`RIDE_REQUEST_REMOVED`)
When multiple drivers receive an offer simultaneously:
1. Winning driver taps "Accept" $\to$ DB lock confirms winner.
2. Backend publishes `RIDE_REQUEST_REMOVED` on the event channels of all other drivers who received the offer.
3. Socket.IO broadcasts event to competing driver apps.
4. Competing driver screens immediately dismiss the incoming request modal and stop alert sirens, avoiding driver frustration.
