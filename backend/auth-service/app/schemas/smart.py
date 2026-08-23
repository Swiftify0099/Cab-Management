"""
Pydantic Schemas for Feature 27: Smart Features / Intelligence Layer.
Production-grade contracts for Destination Prediction, Vehicle Sizing, Smart Demand,
Matching Candidate Ranking, Cross-Service Companions & Dev Simulation.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class SmartDestinationItem(BaseModel):
    id: str
    title: str
    address: str
    lat: float
    lng: float
    place_type: str = "RECENT"  # HOME, WORK, FAVORITE, RECENT, PREDICTED
    eta_minutes: Optional[int] = None
    reason: str
    confidence: str = "HIGH"  # HIGH, MEDIUM, LOW
    is_favorite: bool = False


class SmartDemandSignal(BaseModel):
    zone_name: str
    demand_level: str = "MODERATE"  # LOW, MODERATE, HIGH, SURGE
    surge_multiplier: float = 1.0
    advisory_text: str
    is_surge: bool = False


class SmartCompanionCard(BaseModel):
    id: str
    companion_type: str  # HOTEL_TO_AIRPORT, AIRPORT_TO_HOTEL, PARCEL_TO_TRANSPORT, OUTSTATION_TO_HOTEL, CORPORATE_TRANSFER
    title: str
    subtitle: str
    action_label: str
    deep_link: str
    reference_service: str
    reference_id: Optional[str] = None
    prefilled_params: Dict[str, Any] = {}
    reason: str


class SmartHomeFeedResponse(BaseModel):
    greeting: str
    suggested_destinations: List[SmartDestinationItem]
    companion_cards: List[SmartCompanionCard]
    demand_signal: SmartDemandSignal
    model_version: str = "v1.0.0"


class VehicleRecommendationRequest(BaseModel):
    passengers: int = Field(default=1, ge=1, le=10)
    luggage_count: int = Field(default=0, ge=0, le=10)
    luggage_size: str = Field(default="MEDIUM")  # SMALL, MEDIUM, LARGE
    parcel_weight_kg: Optional[float] = Field(default=None, ge=0.0)
    service_type: str = Field(default="ride")  # ride, airport, rental, outstation, parcel
    preference: Optional[str] = None


class VehicleCategoryOption(BaseModel):
    category_code: str  # economy, sedan, suv, premium, transport
    display_name: str
    is_recommended: bool = False
    recommendation_reason: Optional[str] = None
    capacity_passengers: int
    capacity_luggage_bags: int
    estimated_base_fare: float
    icon_name: str = "car"


class VehicleRecommendationResponse(BaseModel):
    recommended_category: str
    confidence: str = "HIGH"
    reason: str
    categories: List[VehicleCategoryOption]
    model_version: str = "v1.0.0"


class BookingSuggestionRequest(BaseModel):
    current_lat: float
    current_lng: float
    time_of_day: Optional[str] = None
    day_of_week: Optional[str] = None


class BookingSuggestionResponse(BaseModel):
    suggested_pickup: Dict[str, Any]
    suggested_destination: SmartDestinationItem
    suggested_vehicle: str
    estimated_fare_range: str
    confidence: str = "HIGH"
    reason: str
    model_version: str = "v1.0.0"


class CrossServiceRecommendationRequest(BaseModel):
    reference_service: Optional[str] = None
    reference_id: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None


class MatchingCandidateInput(BaseModel):
    driver_id: str
    driver_name: str
    driver_lat: float
    driver_lng: float
    rating: float = 4.8
    acceptance_rate: float = 0.90
    cancellation_rate: float = 0.05
    idle_time_minutes: int = 10
    vehicle_category: str = "sedan"
    destination_target_lat: Optional[float] = None
    destination_target_lng: Optional[float] = None


class MatchingRankRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    service_category: str = "sedan"
    candidates: List[MatchingCandidateInput]


class ScoredDriverCandidate(BaseModel):
    driver_id: str
    driver_name: str
    rank: int
    normalized_score: float  # 0 - 100
    road_eta_min: int
    distance_km: float
    match_reason: str
    is_destination_aligned: bool = False


class MatchingRankResponse(BaseModel):
    ranked_candidates: List[ScoredDriverCandidate]
    top_driver_id: Optional[str] = None
    scoring_version: str = "v1.0.0"


class DevSmartSimulationRequest(BaseModel):
    scenario: str  # COLD_START_USER, RETURNING_USER_EVENING, PAX_4_LUGGAGE_3, OVERSIZED_PARCEL, HOTEL_AIRPORT_CROSS_SELL, SURGE_DEMAND_SPIKE, DRIVER_RANK_ETA
    custom_passengers: Optional[int] = None
    custom_luggage: Optional[int] = None
    custom_demand_multiplier: Optional[float] = None
    details: Optional[Dict[str, Any]] = None
