"""
Uber-Style Nearby Matching API Router
════════════════════════════════════════════════════════════════════════════════
Endpoints:
- POST /api/v1/matching/nearby/search: Discover and rank nearby drivers using PostGIS first
- POST /api/v1/matching/nearby/estimate: Fast pickup ETA and available fleet estimate
"""
from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_user
from common.schemas.response import APIResponse
from app.services.nearby_matcher import (
    NearbyMatchingEngine,
    NearbySearchRequest,
    NearbySearchResponse,
    NearbyEstimateRequest,
    NearbyEstimateResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post(
    "/search",
    response_model=APIResponse[NearbySearchResponse],
    summary="Discover and rank nearby drivers for a ride request",
)
async def search_nearby_drivers(
    payload: NearbySearchRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Executes PostGIS spatial candidate discovery followed by multi-factor candidate ranking:
    Distance (30%) + ETA (20%) + Rating (20%) + Cancellation Performance (15%) + Vehicle Match (10%) + Workload (5%).
    Strictly excludes offline drivers, stale GPS fixes (>60s), mismatched services/vehicles, and isolated hotel bookings.
    """
    engine = NearbyMatchingEngine(db)
    res = await engine.find_and_rank_nearby_drivers(payload)
    return APIResponse(message="Nearby driver search completed", data=res)


@router.post(
    "/estimate",
    response_model=APIResponse[NearbyEstimateResponse],
    summary="Fast estimate of nearest driver pickup ETA and available count",
)
async def estimate_nearby_pickup(
    payload: NearbyEstimateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns fast ETA, nearest distance, and driver count without full payload overhead."""
    engine = NearbyMatchingEngine(db)
    res = await engine.estimate_pickup(payload)
    return APIResponse(message="Pickup ETA estimate calculated", data=res)
