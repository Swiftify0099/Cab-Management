"""
On-Demand Ride Fare Engine — Feature 5
Calculates fare, surge, platform commission (admin-configurable), and driver earnings.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Optional

from common.models.all_models import RideCategory


@dataclass
class RideFareEstimate:
    category_id: Optional[str]
    category_name: str
    distance_km: float
    duration_min: int
    base_fare: float
    distance_charge: float
    time_charge: float
    surge_multiplier: float
    total_fare: float
    platform_commission: float
    driver_earning: float
    available_seats: int
    available_seat_labels: list[str]

    def to_dict(self) -> dict:
        return {
            "category_id": self.category_id,
            "category_name": self.category_name,
            "distance_km": round(self.distance_km, 2),
            "duration_min": self.duration_min,
            "base_fare": round(self.base_fare, 2),
            "distance_charge": round(self.distance_charge, 2),
            "time_charge": round(self.time_charge, 2),
            "surge_multiplier": self.surge_multiplier,
            "total_fare": round(self.total_fare, 2),
            "platform_commission": round(self.platform_commission, 2),
            "driver_earning": round(self.driver_earning, 2),
            "available_seats": self.available_seats,
            "available_seat_labels": self.available_seat_labels,
        }


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float, min_km: float = 0.0) -> float:
    """Haversine distance in km with optional minimum floor."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return max(R * c, min_km)


def estimate_ride_fare(
    distance_km: float,
    duration_min: Optional[int] = None,
    category: Optional[RideCategory] = None,
    surge_multiplier: float = 1.0,
    vehicle_type: str = "sedan",
) -> RideFareEstimate:
    """
    Compute precise on-demand fare breakdown for a given category/vehicle.
    """
    if duration_min is None:
        # Default 25 km/h urban speed estimation
        duration_min = max(int((distance_km / 25.0) * 60), 5)

    if category:
        cat_id = str(category.id)
        cat_name = category.name
        base_fare = float(category.base_fare)
        per_km = float(category.per_km_rate)
        per_min = float(category.per_min_rate)
        min_fare = float(category.min_fare)
        commission_pct = float(category.platform_commission_pct)
        surge = max(float(category.surge_multiplier or 1.0), surge_multiplier)
    else:
        # Defaults based on vehicle_type
        cat_id = None
        cat_name = "economy" if vehicle_type in ("hatchback", "mini") else "premium" if vehicle_type == "sedan" else "suv"
        base_fare = 50.0 if cat_name == "economy" else 75.0 if cat_name == "premium" else 110.0
        per_km = 12.0 if cat_name == "economy" else 16.0 if cat_name == "premium" else 22.0
        per_min = 1.5 if cat_name == "economy" else 2.0 if cat_name == "premium" else 3.0
        min_fare = 80.0 if cat_name == "economy" else 120.0 if cat_name == "premium" else 180.0
        commission_pct = 0.20  # 20% platform fee
        surge = surge_multiplier

    dist_charge = distance_km * per_km
    time_charge = duration_min * per_min
    subtotal = (base_fare + dist_charge + time_charge) * surge
    total_fare = max(subtotal, min_fare)

    # Commission and driver earnings
    commission = total_fare * commission_pct
    driver_earning = total_fare - commission

    # Seat availability details
    if cat_name == "suv":
        seats = 6
        seat_labels = ["Front Window", "Middle Left", "Middle Right", "Rear Window", "Rear Middle", "Rear Window 2"]
    elif cat_name == "premium":
        seats = 4
        seat_labels = ["Front Window", "Rear Left Window", "Rear Right Window", "Rear Middle"]
    else:
        seats = 4
        seat_labels = ["Front Window", "Rear Left Window", "Rear Right Window", "Rear Center"]

    return RideFareEstimate(
        category_id=cat_id,
        category_name=cat_name,
        distance_km=distance_km,
        duration_min=duration_min,
        base_fare=base_fare,
        distance_charge=dist_charge,
        time_charge=time_charge,
        surge_multiplier=surge,
        total_fare=total_fare,
        platform_commission=commission,
        driver_earning=driver_earning,
        available_seats=seats,
        available_seat_labels=seat_labels,
    )
