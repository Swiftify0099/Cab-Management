# 🔔 SUPERAPP NOTIFICATION ARCHITECTURE (PHASE 1 – 25)

---

## 📱 1. DUAL-CHANNEL NOTIFICATION PIPELINE (SOCKET + PUSH)

```mermaid
graph TD
    BackendEvent[Authoritative Backend Microservice Event] --> Router{Notification Dispatcher}
    
    Router -->|If App Foreground & Active Socket| SocketRoom[Socket.IO Room: user:{id}]
    Router -->|If App Background / Offline / Critical| PushWorker[FCM & APNs Push Engine]
    Router -->|Always Persist| DB[(PostgreSQL notifications table)]
    
    PushWorker --> FCM[Firebase Cloud Messaging API]
    PushWorker --> APNs[Apple Push Notification service]
    
    FCM --> MobileDevice[Android Device: High Priority Channel + Action Buttons]
    APNs --> iOSDevice[iOS Device: Category Actions]
    
    MobileDevice --> Dedupe{Client Deduplication Guard}
    SocketRoom --> Dedupe
    
    Dedupe --> SingleAlert[Single Canonical Incoming Alert]
```

---

## 📋 2. BACKGROUND MOBILE LIFECYCLE MATRIX & ACTION TRAY

| Mobile App State | Delivery Mechanism | User-Visible Experience | Audio / Vibration Channel | Action Handlers |
|:---|:---|:---|:---|:---|
| **1. Foreground** | Socket.IO `ride:offer:created` | Global Request Overlay mounted at root `_layout.tsx` | 15s Continuous Warning Beep | Tap `ACCEPT` or `REJECT` directly in modal |
| **2. Background** | High-Priority FCM Push | Heads-up banner with pickup address & fare | `drsiran.mp3` custom siren ringtone | Tap notification to open full app modal |
| **3. Other App** | Android Actionable Notification | System notification tray with interactive buttons | Persistent high-importance channel | `ACCEPT RIDE 🚖` or `REJECT ❌` from tray |
| **4. App Reopened** | State Sync on Reconnect | Reconciles pending active offers from backend | Silences previous alert if expired/assigned | Re-renders current authoritative state |
