"""
Versioned Smart Scoring & Driver-Personalized Ranking Engine (v1) — Feature 6.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional
from app.services.ride_classification import RideClassification, classify_ride

# Central Versioned Weights (v1)
SCORING_VERSION = "v1"
WEIGHTS_V1 = {
    "proximity": 0.25,
    "pickup_eta": 0.20,
    "earning": 0.25,
    "preference": 0.15,
    "destination": 0.15,
}


@dataclass
class ScoredRide:
    ride_id: str
    smart_score: float         # 0 - 100
    match_percentage: int      # 0 - 100
    human_reason: str          # "95% Match • Airport Express"
    classification: RideClassification
    pickup_distance_km: float
    pickup_eta_min: int
    trip_distance_km: float
    trip_duration_min: int
    fare: float
    driver_earning: float
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    destination_address: str
    destination_lat: float
    destination_lng: float
    seats: int
    category_name: str
    scoring_version: str = SCORING_VERSION

    def to_dict(self) -> dict:
        return {
            "ride_id": self.ride_id,
            "smart_score": round(self.smart_score, 1),
            "match_percentage": self.match_percentage,
            "human_reason": self.human_reason,
            "classification": self.classification.to_dict(),
            "pickup_distance_km": round(self.pickup_distance_km, 2),
            "pickup_eta_min": self.pickup_eta_min,
            "trip_distance_km": round(self.trip_distance_km, 2),
            "trip_duration_min": self.trip_duration_min,
            "fare": round(self.fare, 2),
            "driver_earning": round(self.driver_earning, 2),
            "pickup": {
                "address": self.pickup_address,
                "lat": self.pickup_lat,
                "lng": self.pickup_lng,
                "distance_km": round(self.pickup_distance_km, 2),
                "eta_min": self.pickup_eta_min,
            },
            "destination": {
                "address": self.destination_address,
                "lat": self.destination_lat,
                "lng": self.destination_lng,
            },
            "seats": self.seats,
            "category_name": self.category_name,
            "scoring_version": self.scoring_version,
        }


def _calculate_destination_alignment(
    driver_lat: float,
    driver_lng: float,
    drop_lat: float,
    drop_lng: float,
    dest_lat: Optional[float],
    dest_lng: Optional[float],
) -> float:
    """
    Computes vector alignment (0.0 to 1.0) between trip direction and driver's home/destination target.
    """
    if dest_lat is None or dest_lng is None:
        return 1.0  # neutral if destination mode is off

    # Vector 1: Driver -> Dropoff
    v1_x = drop_lng - driver_lng
    v1_y = drop_lat - driver_lat

    # Vector 2: Driver -> Desired Destination
    v2_x = dest_lng - driver_lng
    v2_y = dest_lat - driver_lat

    mag1 = math.sqrt(v1_x**2 + v1_y**2)
    mag2 = math.sqrt(v2_x**2 + v2_y**2)

    if mag1 == 0 or mag2 == 0:
        return 1.0

    dot = (v1_x * v2_x) + (v1_y * v2_y)
    cos_sim = dot / (mag1 * mag2)
    # Map [-1, 1] to [0.0, 1.0]
    return max(0.0, min(1.0, (cos_sim + 1.0) / 2.0))


class SmartScoringEngine:
    """
    Personalized multi-factor scoring engine that scores candidate rides in the context of a driver.
    """

    @classmethod
    def score_ride(
        cls,
        ride_id: str,
        driver_lat: float,
        driver_lng: float,
        pickup_lat: float,
        pickup_lng: float,
        pickup_address: str,
        dest_lat: float,
        dest_lng: float,
        dest_address: str,
        trip_distance_km: float,
        trip_duration_min: int,
        fare: float,
        driver_earning: float,
        pickup_distance_km: float,
        pickup_eta_min: int,
        preference_mode: str = "balanced",
        dest_lat_pref: Optional[float] = None,
        dest_lng_pref: Optional[float] = None,
        dest_mode: str = "off",
        seats: int = 1,
        category_name: str = "Economy",
        surge_multiplier: float = 1.0,
    ) -> ScoredRide:
        # 1. Proximity subscore (0 to 100): closer pickup = higher score
        s_prox = max(0.0, 100.0 * (1.0 - (pickup_distance_km / 10.0)))

        # 2. Pickup ETA subscore (0 to 100): shorter ETA = higher score
        s_eta = max(0.0, 100.0 * (1.0 - (pickup_eta_min / 20.0)))

        # 3. Earning Efficiency subscore (0 to 100)
        # Target: ₹450/hr = 100 score
        earn_per_hr = (driver_earning / max(trip_duration_min + pickup_eta_min, 10)) * 60.0
        s_earn = min(100.0, (earn_per_hr / 450.0) * 100.0)

        # 4. Classify Ride
        classification = classify_ride(
            distance_km=trip_distance_km,
            duration_min=trip_duration_min,
            driver_earning=driver_earning,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            pickup_address=pickup_address,
            dest_lat=dest_lat,
            dest_lng=dest_lng,
            dest_address=dest_address,
            surge_multiplier=surge_multiplier,
        )

        # 5. Preference Alignment subscore
        s_pref = 70.0  # baseline
        mode_lower = preference_mode.lower()
        if mode_lower == "earnings_focus":
            s_pref = 100.0 if classification.earning_class == "HIGH_EARNING" else 60.0
        elif mode_lower == "nearby_focus":
            s_pref = 100.0 if pickup_distance_km <= 3.0 else 50.0
        elif mode_lower == "short_trips":
            s_pref = 100.0 if classification.distance_class == "SHORT" else 40.0
        elif mode_lower == "long_trips":
            s_pref = 100.0 if classification.distance_class == "LONG" else 50.0
        elif mode_lower == "airport_focus":
            s_pref = 100.0 if classification.trip_type == "AIRPORT" else 55.0

        # 6. Destination Alignment subscore
        if dest_mode in ("flexible", "strict") and dest_lat_pref and dest_lng_pref:
            align_val = _calculate_destination_alignment(
                driver_lat=driver_lat,
                driver_lng=driver_lng,
                drop_lat=dest_lat,
                drop_lng=dest_lng,
                dest_lat=dest_lat_pref,
                dest_lng=dest_lng_pref,
            )
            s_dest = align_val * 100.0
        else:
            s_dest = 80.0

        # Dynamic mode weight adjustment
        w = dict(WEIGHTS_V1)
        if mode_lower == "earnings_focus":
            w["earning"] = 0.40
            w["proximity"] = 0.15
        elif mode_lower == "nearby_focus":
            w["proximity"] = 0.40
            w["pickup_eta"] = 0.30
            w["earning"] = 0.10
        elif mode_lower == "short_trips":
            w["preference"] = 0.35
            w["proximity"] = 0.25

        # Total Smart Score (0 - 100)
        smart_score = (
            w["proximity"] * s_prox
            + w["pickup_eta"] * s_eta
            + w["earning"] * s_earn
            + w["preference"] * s_pref
            + w["destination"] * s_dest
        )
        smart_score = max(10.0, min(99.0, smart_score))
        match_pct = int(smart_score)

        # Human explainability tag
        if match_pct >= 90:
            human_reason = f"{match_pct}% Match • {classification.badge_label}"
        elif match_pct >= 75:
            human_reason = f"Great Fit • {classification.badge_label}"
        else:
            human_reason = f"Available • {classification.badge_label}"

        return ScoredRide(
            ride_id=ride_id,
            smart_score=smart_score,
            match_percentage=match_pct,
            human_reason=human_reason,
            classification=classification,
            pickup_distance_km=pickup_distance_km,
            pickup_eta_min=pickup_eta_min,
            trip_distance_km=trip_distance_km,
            trip_duration_min=trip_duration_min,
            fare=fare,
            driver_earning=driver_earning,
            pickup_address=pickup_address,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            destination_address=dest_address,
            destination_lat=dest_lat,
            destination_lng=dest_lng,
            seats=seats,
            category_name=category_name,
        )
