"""
Fare Calculation Engine — Phase 3

Business rules:
  - Base fare = distance_km × base_rate (varies by vehicle_type)
  - Platform fee = ₹10 flat per booking
  - Window seat surcharge = ₹30 if window seat selected
  - Parcel surcharge = ₹50 per parcel
  - Per-seat fare = (base_fare + surcharges) / total_seats
  - Night surcharge (10 PM – 6 AM) = +15%
  - Toll estimation = ₹2/km on highway routes (simplified)
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from app.core.config import booking_settings

# Vehicle type rate multipliers (₹/km)
VEHICLE_RATES: dict[str, float] = {
    "mini":            3.0,
    "sedan":           3.5,
    "suv":             4.5,
    "tempo_traveller": 2.5,   # shared per seat
    "bus":             1.8,   # shared per seat
}

VEHICLE_CAPACITY: dict[str, int] = {
    "mini":            4,
    "sedan":           4,
    "suv":             6,
    "tempo_traveller": 12,
    "bus":             40,
}

# Simple city-to-city distance table (km) — Phase 3 demo data
# In Phase 5 this will be replaced with Google Maps Distance Matrix
CITY_DISTANCES: dict[frozenset, float] = {
    frozenset({"pune", "mumbai"}): 149,
    frozenset({"pune", "nashik"}): 211,
    frozenset({"pune", "aurangabad"}): 235,
    frozenset({"mumbai", "nashik"}): 168,
    frozenset({"mumbai", "aurangabad"}): 335,
    frozenset({"nashik", "aurangabad"}): 188,
    frozenset({"pune", "kolhapur"}): 228,
    frozenset({"mumbai", "goa"}): 580,
    frozenset({"pune", "goa"}): 455,
    frozenset({"pune", "hyderabad"}): 558,
    frozenset({"mumbai", "hyderabad"}): 710,
    frozenset({"pune", "nagpur"}): 720,
}


def get_distance_km(from_city: str, to_city: str) -> float:
    """Returns estimated distance or defaults to 100 km."""
    key = frozenset({from_city.lower().strip(), to_city.lower().strip()})
    return CITY_DISTANCES.get(key, 100.0)


def is_night_trip(departure_time: datetime) -> bool:
    """Night surcharge applies 10 PM – 6 AM."""
    hour = departure_time.hour
    return hour >= 22 or hour < 6


@dataclass
class FareBreakdown:
    vehicle_type: str
    distance_km: float
    base_fare: float
    platform_fee: float
    parcel_fee: float
    window_seat_fee: float
    night_surcharge: float
    toll_estimate: float
    total_fare: float
    per_seat_fare: float
    seats_available: int
    eta_minutes: int

    def to_dict(self) -> dict:
        return {
            "vehicle_type": self.vehicle_type,
            "distance_km": round(self.distance_km, 1),
            "base_fare": round(self.base_fare, 2),
            "platform_fee": round(self.platform_fee, 2),
            "parcel_fee": round(self.parcel_fee, 2),
            "window_seat_fee": round(self.window_seat_fee, 2),
            "night_surcharge": round(self.night_surcharge, 2),
            "toll_estimate": round(self.toll_estimate, 2),
            "total_fare": round(self.total_fare, 2),
            "per_seat_fare": round(self.per_seat_fare, 2),
            "seats_available": self.seats_available,
            "eta_minutes": self.eta_minutes,
        }


def calculate_fare(
    from_city: str,
    to_city: str,
    departure_time: datetime,
    vehicle_type: str = "sedan",
    seats_required: int = 1,
    with_parcel: bool = False,
    window_seat: bool = False,
) -> FareBreakdown:
    """
    Calculate fare for a single vehicle type.
    """
    distance = get_distance_km(from_city, to_city)
    rate = VEHICLE_RATES.get(vehicle_type, 3.5)

    base_fare = distance * rate
    platform_fee = booking_settings.PLATFORM_FEE
    parcel_fee = 50.0 if with_parcel else 0.0
    window_seat_fee = booking_settings.WINDOW_SEAT_SURCHARGE if window_seat else 0.0
    night_surch = base_fare * 0.15 if is_night_trip(departure_time) else 0.0
    toll_estimate = math.floor(distance / 50) * 30  # ₹30 per 50 km (simplified)

    total_fare = base_fare + platform_fee + parcel_fee + window_seat_fee + night_surch + toll_estimate

    # Shared vehicles split fare per seat
    capacity = VEHICLE_CAPACITY.get(vehicle_type, 4)
    if vehicle_type in ("tempo_traveller", "bus"):
        per_seat_fare = total_fare / capacity
    else:
        per_seat_fare = total_fare

    # ETA: 60 km/h average
    eta_minutes = int(distance / 60 * 60)

    return FareBreakdown(
        vehicle_type=vehicle_type,
        distance_km=distance,
        base_fare=base_fare,
        platform_fee=platform_fee,
        parcel_fee=parcel_fee,
        window_seat_fee=window_seat_fee,
        night_surcharge=night_surch,
        toll_estimate=toll_estimate,
        total_fare=round(total_fare, 2),
        per_seat_fare=round(per_seat_fare, 2),
        seats_available=capacity,
        eta_minutes=eta_minutes,
    )


def calculate_all_fares(
    from_city: str,
    to_city: str,
    departure_time: datetime,
    seats_required: int = 1,
    with_parcel: bool = False,
    window_seat: bool = False,
) -> list[FareBreakdown]:
    """Returns fare estimates for all vehicle types."""
    return [
        calculate_fare(
            from_city, to_city, departure_time,
            vehicle_type=vt,
            seats_required=seats_required,
            with_parcel=with_parcel,
            window_seat=window_seat,
        )
        for vt in VEHICLE_RATES
    ]
