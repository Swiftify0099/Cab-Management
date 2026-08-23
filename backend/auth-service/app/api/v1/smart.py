"""
Smart Intelligence & Decision-Support API Router.
Feature 27: Smart Features / Intelligence Layer.
Prefix: /api/v1/smart
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user
from common.models.all_models import User
from app.schemas.smart import (
    SmartHomeFeedResponse,
    SmartDestinationItem,
    VehicleRecommendationRequest,
    VehicleRecommendationResponse,
    SmartCompanionCard,
    SmartDemandSignal,
    MatchingRankRequest,
    MatchingRankResponse,
    DevSmartSimulationRequest,
)
from app.services.smart_intelligence_service import SmartIntelligenceService

router = APIRouter(tags=["Smart Features & Intelligence Layer"])


@router.get("/home", response_model=SmartHomeFeedResponse)
async def get_smart_home_feed(
    lat: Optional[float] = Query(18.5204, description="Current GPS Latitude"),
    lng: Optional[float] = Query(73.8567, description="Current GPS Longitude"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get customer smart home feed with greeting, destination suggestions,
    companion service cross-sells, and real-time demand signals.
    """
    return await SmartIntelligenceService.get_smart_home_feed(
        db=db,
        user_id=current_user.id,
        lat=lat,
        lng=lng,
    )


@router.get("/destinations", response_model=List[SmartDestinationItem])
async def get_smart_destinations(
    lat: Optional[float] = Query(18.5204, description="Current GPS Latitude"),
    lng: Optional[float] = Query(73.8567, description="Current GPS Longitude"),
    limit: int = Query(4, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get ranked destination recommendations based on time-of-day, day-of-week,
    saved places, and recent completed trips.
    """
    return await SmartIntelligenceService.get_smart_destinations(
        db=db,
        user_id=current_user.id,
        lat=lat,
        lng=lng,
        limit=limit,
    )


@router.post("/vehicle-recommendation", response_model=VehicleRecommendationResponse)
async def get_vehicle_recommendation(
    request: VehicleRecommendationRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Evaluate passenger count, luggage size/count, and parcel weight to recommend
    optimal vehicle category (Hatchback, Sedan, SUV, Transport).
    """
    return await SmartIntelligenceService.get_vehicle_recommendation(request)


@router.get("/cross-service", response_model=List[SmartCompanionCard])
async def get_cross_service_companions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluate active/upcoming bookings across Hotel, Airport, Parcel, Outstation domains
    and return contextual companion prompts (e.g. Hotel -> Airport Transfer).
    """
    return await SmartIntelligenceService.get_cross_service_recommendations(
        db=db,
        user_id=current_user.id,
    )


@router.get("/demand", response_model=SmartDemandSignal)
async def get_smart_demand_signal(
    lat: Optional[float] = Query(18.5204, description="Current Latitude"),
    lng: Optional[float] = Query(73.8567, description="Current Longitude"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get local zone demand level & surge multiplier signal for pricing intelligence.
    """
    return await SmartIntelligenceService.get_smart_demand_signal(
        db=db,
        lat=lat,
        lng=lng,
    )


@router.post("/matching-score", response_model=MatchingRankResponse)
async def rank_driver_candidates(
    request: MatchingRankRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Server-internal candidate ranking model. Evaluates road ETA, rating,
    idle time, reliability, and destination alignment vector.
    """
    return SmartIntelligenceService.rank_driver_candidates(request)


@router.post("/dev/simulate")
async def simulate_smart_scenario(
    request: DevSmartSimulationRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Developer Mode Sandbox: Simulate smart features, sizing models, demand spikes,
    and cross-service companion scenarios without mutating production databases.
    """
    return await SmartIntelligenceService.simulate_smart_scenario(request)
