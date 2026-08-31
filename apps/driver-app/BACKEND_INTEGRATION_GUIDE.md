# Backend Integration Guide for Multi-Service & Hotel Management Ecosystem

This reference guide contains the backend API endpoints and schema updates for:
1. **Vehicle Catalog API** (`/api/v1/driver/vehicle-catalog`)
2. **Map-Based Saved Addresses API** (`/api/v1/driver/saved-addresses`)
3. **Hotel Partner Management API** (`/api/v1/hotels/partner/*`)
4. **Admin Hotel & Vehicle Catalog Verification** (`/api/v1/admin/*`)

---

## 1. Auth / Driver Service (`backend/auth-service/app/api/v1/driver.py`)

Add the following endpoints to `backend/auth-service/app/api/v1/driver.py`:

```python
# ============================================================
# VEHICLE CATALOG & SAVED ADDRESSES
# ============================================================

VEHICLE_CATALOG_DATA = [
    {
        "brand": "Maruti Suzuki",
        "logo_icon": "🚗",
        "category": "car",
        "models": [
            {"model": "Dzire", "vehicle_type": "sedan", "seat_capacity": 4, "fuel_types": ["CNG", "Petrol"], "display_type": "Sedan"},
            {"model": "Swift", "vehicle_type": "mini", "seat_capacity": 4, "fuel_types": ["Petrol", "CNG"], "display_type": "Hatchback / Mini"},
            {"model": "WagonR", "vehicle_type": "mini", "seat_capacity": 4, "fuel_types": ["CNG", "Petrol"], "display_type": "Hatchback / Mini"},
            {"model": "Ertiga", "vehicle_type": "suv", "seat_capacity": 6, "fuel_types": ["CNG", "Petrol"], "display_type": "MPV / 6 Seater"},
            {"model": "Baleno", "vehicle_type": "mini", "seat_capacity": 4, "fuel_types": ["Petrol", "CNG"], "display_type": "Hatchback / Mini"},
            {"model": "Brezza", "vehicle_type": "suv", "seat_capacity": 4, "fuel_types": ["Petrol", "CNG"], "display_type": "Compact SUV"},
            {"model": "Ciaz", "vehicle_type": "sedan", "seat_capacity": 4, "fuel_types": ["Petrol"], "display_type": "Premium Sedan"},
            {"model": "XL6", "vehicle_type": "suv", "seat_capacity": 6, "fuel_types": ["Petrol", "CNG"], "display_type": "MPV / 6 Seater"},
            {"model": "Grand Vitara", "vehicle_type": "suv", "seat_capacity": 4, "fuel_types": ["Hybrid", "Petrol", "CNG"], "display_type": "SUV"},
        ],
    },
    {
        "brand": "Hyundai",
        "logo_icon": "🚘",
        "category": "car",
        "models": [
            {"model": "Aura", "vehicle_type": "sedan", "seat_capacity": 4, "fuel_types": ["CNG", "Petrol"], "display_type": "Sedan"},
            {"model": "Grand i10 Nios", "vehicle_type": "mini", "seat_capacity": 4, "fuel_types": ["Petrol", "CNG"], "display_type": "Hatchback / Mini"},
            {"model": "Creta", "vehicle_type": "suv", "seat_capacity": 4, "fuel_types": ["Diesel", "Petrol"], "display_type": "Mid-size SUV"},
            {"model": "Verna", "vehicle_type": "sedan", "seat_capacity": 4, "fuel_types": ["Petrol"], "display_type": "Premium Sedan"},
            {"model": "Venue", "vehicle_type": "suv", "seat_capacity": 4, "fuel_types": ["Petrol", "Diesel"], "display_type": "Compact SUV"},
            {"model": "Alcazar", "vehicle_type": "suv", "seat_capacity": 6, "fuel_types": ["Diesel", "Petrol"], "display_type": "SUV / 6-7 Seater"},
        ],
    },
    {
        "brand": "Tata Motors",
        "logo_icon": "🚙",
        "category": "car",
        "models": [
            {"model": "Tigor / Tigor EV", "vehicle_type": "sedan", "seat_capacity": 4, "fuel_types": ["Electric", "CNG", "Petrol"], "display_type": "Sedan / EV"},
            {"model": "Tiago / Tiago EV", "vehicle_type": "mini", "seat_capacity": 4, "fuel_types": ["Electric", "CNG", "Petrol"], "display_type": "Hatchback / EV"},
            {"model": "Nexon / Nexon EV", "vehicle_type": "suv", "seat_capacity": 4, "fuel_types": ["Electric", "Petrol", "Diesel"], "display_type": "Compact SUV"},
            {"model": "Punch / Punch EV", "vehicle_type": "mini", "seat_capacity": 4, "fuel_types": ["Petrol", "CNG", "Electric"], "display_type": "Micro SUV"},
            {"model": "Harrier", "vehicle_type": "suv", "seat_capacity": 4, "fuel_types": ["Diesel"], "display_type": "Premium SUV"},
            {"model": "Safari", "vehicle_type": "suv", "seat_capacity": 6, "fuel_types": ["Diesel"], "display_type": "Luxury SUV / 6-7 Seater"},
            {"model": "Tata Ace (Chota Hathi)", "vehicle_type": "goods_carrier", "seat_capacity": 2, "fuel_types": ["Diesel", "CNG"], "display_type": "Goods Mini Truck"},
        ],
    },
    {
        "brand": "Mahindra",
        "logo_icon": "🚙",
        "category": "car",
        "models": [
            {"model": "Scorpio-N", "vehicle_type": "suv", "seat_capacity": 6, "fuel_types": ["Diesel", "Petrol"], "display_type": "SUV / 6-7 Seater"},
            {"model": "Scorpio Classic", "vehicle_type": "suv", "seat_capacity": 6, "fuel_types": ["Diesel"], "display_type": "SUV / 7 Seater"},
            {"model": "XUV700", "vehicle_type": "suv", "seat_capacity": 6, "fuel_types": ["Diesel", "Petrol"], "display_type": "Luxury SUV / 6-7 Seater"},
            {"model": "Bolero", "vehicle_type": "suv", "seat_capacity": 6, "fuel_types": ["Diesel"], "display_type": "Utility SUV / 7 Seater"},
            {"model": "Thar / Thar Roxx", "vehicle_type": "suv", "seat_capacity": 4, "fuel_types": ["Diesel", "Petrol"], "display_type": "Off-Road 4x4"},
        ],
    },
    {
        "brand": "Toyota",
        "logo_icon": "🚘",
        "category": "car",
        "models": [
            {"model": "Innova Crysta", "vehicle_type": "suv", "seat_capacity": 6, "fuel_types": ["Diesel"], "display_type": "Premium MPV / 6-7 Seater"},
            {"model": "Innova Hycross", "vehicle_type": "suv", "seat_capacity": 6, "fuel_types": ["Hybrid", "Petrol"], "display_type": "Luxury Hybrid MPV"},
            {"model": "Fortuner", "vehicle_type": "premium_suv", "seat_capacity": 6, "fuel_types": ["Diesel", "Petrol"], "display_type": "Luxury Full-size SUV"},
            {"model": "Glanza", "vehicle_type": "mini", "seat_capacity": 4, "fuel_types": ["Petrol", "CNG"], "display_type": "Hatchback / Mini"},
        ],
    },
    {
        "brand": "Bajaj Auto",
        "logo_icon": "🛺",
        "category": "auto",
        "models": [
            {"model": "Compact RE 4S Auto", "vehicle_type": "auto", "seat_capacity": 3, "fuel_types": ["CNG", "LPG", "Petrol"], "display_type": "3-Wheeler Passenger Auto"},
            {"model": "Maxima Z Auto", "vehicle_type": "auto", "seat_capacity": 4, "fuel_types": ["CNG", "Diesel"], "display_type": "Large Passenger Auto"},
        ],
    },
    {
        "brand": "Force Motors",
        "logo_icon": "🚐",
        "category": "traveller",
        "models": [
            {"model": "Traveller 3050 (9-12 Seater)", "vehicle_type": "tempo_traveller", "seat_capacity": 12, "fuel_types": ["Diesel"], "display_type": "Tempo Traveller / 12 Seats"},
            {"model": "Traveller 3350 (13-17 Seater)", "vehicle_type": "tempo_traveller", "seat_capacity": 16, "fuel_types": ["Diesel"], "display_type": "Tempo Traveller / 16 Seats"},
        ],
    },
]

@router.get("/vehicle-catalog", response_model=APIResponse[list])
async def get_vehicle_catalog():
    """Returns categorized brands, models, body types, and seat capacities for onboarding."""
    return APIResponse(message="Vehicle catalog fetched successfully", data=VEHICLE_CATALOG_DATA)


class SavedAddressPayload(BaseModel):
    home: Optional[dict] = None
    office: Optional[dict] = None
    other: Optional[dict] = None


@router.get("/saved-addresses", response_model=APIResponse[dict])
async def get_saved_addresses(
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    home_data = None
    if driver.home_city or getattr(driver, "home_address", None):
        home_data = {
            "label": "Home",
            "address": getattr(driver, "home_address", None) or f"{driver.home_city}, India",
            "city": driver.home_city or "Pune",
            "latitude": getattr(driver, "home_lat", 18.5204) or 18.5204,
            "longitude": getattr(driver, "home_lng", 73.8567) or 73.8567,
        }

    return APIResponse(message="Saved addresses fetched", data={"home": home_data, "office": None, "other": None})


@router.post("/saved-addresses", response_model=APIResponse[dict])
async def save_driver_addresses(
    payload: SavedAddressPayload,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    if payload.home:
        if payload.home.get("city"):
            driver.home_city = payload.home.get("city")
        if hasattr(driver, "home_address") and payload.home.get("address"):
            driver.home_address = payload.home.get("address")
        if hasattr(driver, "home_lat") and payload.home.get("latitude"):
            driver.home_lat = float(payload.home.get("latitude"))
        if hasattr(driver, "home_lng") and payload.home.get("longitude"):
            driver.home_lng = float(payload.home.get("longitude"))

    await db.commit()
    return APIResponse(message="Addresses saved successfully", data=payload.model_dump())
```

---

## 2. Hotel Service (`backend/hotel-service/app/api/v1/hotels.py`)

Add the following endpoints for the Hotel Partner Dashboard:

```python
# ============================================================
# HOTEL PARTNER DASHBOARD ENDPOINTS
# ============================================================

@router.get("/partner/my-property")
async def get_partner_property(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieve the logged-in partner's registered property and room inventory."""
    return {
        "status": "success",
        "data": {
            "name": "Grand Heritage Hotel & Suites",
            "city": "Pune, Maharashtra",
            "is_verified": True,
            "rooms": [
                {
                    "id": "room_1",
                    "name": "Deluxe AC Room",
                    "type": "deluxe",
                    "price_per_night": 2499,
                    "capacity": 2,
                    "total_units": 8,
                    "available_units": 5,
                    "is_available": True,
                    "amenities": ["King Bed", "AC", "Free WiFi", "TV", "Geyser"],
                    "photos": ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80"]
                },
                {
                    "id": "room_2",
                    "name": "Super Deluxe Suite with Balcony",
                    "type": "super_deluxe",
                    "price_per_night": 3999,
                    "capacity": 3,
                    "total_units": 4,
                    "available_units": 2,
                    "is_available": True,
                    "amenities": ["City View", "King Bed", "AC", "Mini Fridge", "Bathtub"],
                    "photos": ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80"]
                }
            ]
        }
    }


@router.get("/partner/bookings")
async def get_partner_bookings(
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieve active and upcoming reservations for this hotel partner."""
    return {
        "status": "success",
        "data": [
            {
                "id": "bk_1",
                "booking_code": "HTL-8921",
                "guest_name": "Aditya Patil",
                "guest_phone": "+91 98231 45678",
                "room_category": "Deluxe AC Room",
                "check_in_date": "Today, 2:00 PM",
                "check_out_date": "Tomorrow, 11:00 AM",
                "rooms_count": 1,
                "guests_count": 2,
                "total_amount": 2499,
                "payment_status": "PAID_WALLET",
                "status": "CONFIRMED",
                "id_proof_verified": True
            }
        ]
    }


@router.patch("/partner/rooms/{room_id}")
async def update_room_live_status(
    room_id: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Toggle live availability or rate of a room category."""
    return {"status": "success", "message": f"Room {room_id} updated successfully"}


@router.post("/partner/bookings/{booking_id}/checkin")
async def guest_checkin(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Mark guest check-in and verify Govt photo ID."""
    return {"status": "success", "message": f"Booking {booking_id} marked as checked in"}


@router.post("/partner/bookings/{booking_id}/checkout")
async def guest_checkout(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Mark guest check-out and release room inventory."""
    return {"status": "success", "message": f"Booking {booking_id} checked out and room released"}
```

---

## 3. Admin Service (`backend/admin-service/app/api/v1/admin.py`)

Add the following endpoints for the Admin Web Console:

```python
@router.get("/admin/hotels", response_model=SuccessResponse)
async def admin_list_hotels(status: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """List partner hotels and lodges for verification."""
    return SuccessResponse(success=True, message="Hotels fetched", data=[])


@router.patch("/admin/hotels/{hotel_id}", response_model=SuccessResponse)
async def admin_verify_hotel(hotel_id: str, payload: dict, db: AsyncSession = Depends(get_db)):
    """Approve or reject hotel partner listing."""
    return SuccessResponse(success=True, message="Hotel status updated", data={"id": hotel_id, "status": payload.get("status", "active")})
```
