"""
Ride Classification Engine — Feature 6
Classifies rides by trip type, distance class, demand level, and earning efficiency.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

# Configurable thresholds
SHORT_TRIP_MAX_KM = 6.0
LONG_TRIP_MIN_KM = 18.0
OUTSTATION_MIN_KM = 45.0

AIRPORT_KEYWORDS = ["airport", "pnq", "terminal 1", "terminal 2", "aerodrome", "flight", "departure gate"]
PUNE_AIRPORT_COORDS = (18.5822, 73.9197)


@dataclass
class RideClassification:
    trip_type: str            # LOCAL, AIRPORT, OUTSTATION, SCHEDULED
    distance_class: str       # SHORT, MEDIUM, LONG
    demand_level: str         # NORMAL, HIGH, VERY_HIGH
    earning_class: str        # NORMAL, HIGH_EARNING
    badge_label: str          # e.g., "✈️ Airport Trip", "🔥 High Demand", "⚡ Short Trip"
    badge_color: str          # purple, orange, blue, green
    earning_per_km: float
    earning_per_hour: float

    def to_dict(self) -> dict:
        return {
            "trip_type": self.trip_type,
            "distance_class": self.distance_class,
            "demand_level": self.demand_level,
            "earning_class": self.earning_class,
            "badge_label": self.badge_label,
            "badge_color": self.badge_color,
            "earning_per_km": round(self.earning_per_km, 2),
            "earning_per_hour": round(self.earning_per_hour, 2),
        }


def _is_airport_location(lat: float, lng: float, address: str) -> bool:
    """Checks coordinate distance to known airport center (< 2.5 km) or address keyword."""
    addr_lower = (address or "").lower()
    if any(k in addr_lower for k in AIRPORT_KEYWORDS):
        return True
    
    # Haversine to Pune airport as baseline
    dlat = math.radians(lat - PUNE_AIRPORT_COORDS[0])
    dlon = math.radians(lng - PUNE_AIRPORT_COORDS[1])
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(PUNE_AIRPORT_COORDS[0])) * math.cos(math.radians(lat)) * math.sin(dlon / 2)**2
    dist_km = 6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return dist_km <= 2.5


def classify_ride(
    distance_km: float,
    duration_min: int,
    driver_earning: float,
    pickup_lat: float,
    pickup_lng: float,
    pickup_address: str,
    dest_lat: float,
    dest_lng: float,
    dest_address: str,
    surge_multiplier: float = 1.0,
    is_scheduled: bool = False,
) -> RideClassification:
    """
    Authoritative domain classification of an eligible ride.
    """
    # 1. Distance Class
    if distance_km <= SHORT_TRIP_MAX_KM:
        dist_class = "SHORT"
    elif distance_km >= LONG_TRIP_MIN_KM:
        dist_class = "LONG"
    else:
        dist_class = "MEDIUM"

    # 2. Trip Type
    if is_scheduled:
        trip_type = "SCHEDULED"
    elif _is_airport_location(pickup_lat, pickup_lng, pickup_address) or _is_airport_location(dest_lat, dest_lng, dest_address):
        trip_type = "AIRPORT"
    elif distance_km >= OUTSTATION_MIN_KM:
        trip_type = "OUTSTATION"
    else:
        trip_type = "LOCAL"

    # 3. Demand Level
    if surge_multiplier >= 1.5:
        demand = "VERY_HIGH"
    elif surge_multiplier >= 1.2:
        demand = "HIGH"
    else:
        demand = "NORMAL"

    # 4. Earning efficiency
    earn_per_km = driver_earning / max(distance_km, 1.0)
    earn_per_hr = (driver_earning / max(duration_min, 5.0)) * 60.0

    if earn_per_km >= 24.0 or earn_per_hr >= 450.0:
        earn_class = "HIGH_EARNING"
    else:
        earn_class = "NORMAL"

    # 5. Human Badge
    if trip_type == "AIRPORT":
        badge = "✈️ Airport Trip"
        color = "purple"
    elif demand in ("HIGH", "VERY_HIGH"):
        badge = f"🔥 High Demand • ₹{round(earn_per_km)}/km"
        color = "orange"
    elif earn_class == "HIGH_EARNING":
        badge = f"💰 Best Earning • ₹{round(driver_earning)}"
        color = "green"
    elif dist_class == "SHORT":
        badge = f"⚡ Quick Trip • {round(distance_km, 1)} km"
        color = "blue"
    elif dist_class == "LONG":
        badge = f"🛣️ Long Route • {round(distance_km, 1)} km"
        color = "indigo"
    else:
        badge = "★ Great Match"
        color = "cyan"

    return RideClassification(
        trip_type=trip_type,
        distance_class=dist_class,
        demand_level=demand,
        earning_class=earn_class,
        badge_label=badge,
        badge_color=color,
        earning_per_km=earn_per_km,
        earning_per_hour=earn_per_hr,
    )
