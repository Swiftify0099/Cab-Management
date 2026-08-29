# 🎯 SUPERAPP DISPATCH & MATCHING ARCHITECTURE (PHASE 1 – 25)

---

## 🏎️ 1. MULTI-MODE DISPATCH ENGINE & SPATIAL ROUTING

```mermaid
graph TD
    Request[Customer Ride Request: Pickup Point 4326] --> Engine{Dispatch Matcher}
    
    Engine --> Mode1[Mode 1: NEARBY - PostGIS ST_DWithin 5KM Radius]
    Engine --> Mode2[Mode 2: ALL CITY - City Coverage Polygon]
    Engine --> Mode3[Mode 3: SPECIFIC CITY - Boundary Match]
    Engine --> Mode4[Mode 4: SPECIFIC HEX - Uber H3 Res 8 Index]
    
    Mode1 --> Filter[Eligibility Filter: Active Vehicle + KYC Approved + Online + Radar Toggle]
    Mode2 --> Filter
    Mode3 --> Filter
    Mode4 --> Filter
    
    Filter --> Fanout[Atomic Fanout: Broadcast Offer to Top 5 Eligible Drivers]
    
    Fanout --> Concurrency{Concurrency Shield: PostgreSQL with_for_update()}
    Concurrency -->|First Valid Driver Accepts| Winner[ASSIGNED: Driver Locked, Winner Emitted]
    Concurrency -->|Other Drivers| Cancel[CANCELLED: Offers Revoked via Socket]
```

---

## 📋 2. CROSS-SERVICE ISOLATION & CAPABILITY MATRIX

| Service Requested | Vehicle Required | Minimum Fleet Capability | Other Service Leakage Prevention |
|:---|:---|:---|:---|
| **CAB** | Sedan / Hatchback / SUV | `passenger_count >= 1`, valid permit | Freight Trucks & Movers strictly excluded |
| **PARCEL** | Bike / Auto / Hatchback | `parcel_capable = True`, max payload kg | Heavy Trucks & Luxury Sedans excluded |
| **TRANSPORT** | Tata Ace / Bolero / 14ft Eicher | Commercial freight registration, helpers | Normal passenger Cabs strictly excluded |
| **AIRPORT** | Sedan / SUV / Luxury | Flight buffer capability, meet & greet placard | Unverified airport partners excluded |
| **RENTAL** | Sedan / SUV / Hatchback | Full-day chauffeur availability | On-demand quick dispatch cabs excluded |
| **OUTSTATION** | SUV / Innova / Sedan | Interstate tax permits, night halt capability | Local-only drivers excluded |
| **HOTEL** | Hospitality Concierge | Front desk isolated roster | Zero driver radar leakage |
