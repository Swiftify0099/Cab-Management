"""
Fanout Dispatch API Endpoints:
- POST /api/v1/dispatch/fanout/offers/accept
- POST /api/v1/dispatch/fanout/offers/reject
- POST /api/v1/dispatch/fanout/create
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_user
from app.services.fanout_dispatch_engine import FanoutDispatchEngine

router = APIRouter(prefix="/dispatch/fanout", tags=["Fanout Dispatch"])


class FanoutCreateRequest(BaseModel):
    ride_request_id: str = Field(..., description="Target RideRequest UUID")
    candidates: List[Dict[str, Any]] = Field(..., description="Eligible driver candidates")
    timeout_sec: int = Field(180, description="Offer timeout in seconds")


class OfferAcceptRequest(BaseModel):
    offer_id: str = Field(..., description="Offer ID or RideRequest ID")


class OfferRejectRequest(BaseModel):
    offer_id: str = Field(..., description="Offer ID or RideRequest ID")
    reason: Optional[str] = Field(None, description="Optional rejection reason")


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_fanout_dispatch_endpoint(
    body: FanoutCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Broadcasts ride request to multiple candidate drivers by creating separate RideOffer records.
    """
    engine = FanoutDispatchEngine(db)
    try:
        offers = await engine.create_fanout_offers(
            ride_request_id=body.ride_request_id,
            candidates=body.candidates,
            timeout_sec=body.timeout_sec,
        )
        return {
            "success": True,
            "ride_request_id": body.ride_request_id,
            "offers_created": len(offers),
            "offer_ids": [str(o.id) for o in offers],
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/offers/accept")
async def accept_fanout_offer_endpoint(
    body: OfferAcceptRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Driver accepts a fanout ride offer with atomic PostgreSQL locking.
    Guarantees exactly ONE winner.
    """
    engine = FanoutDispatchEngine(db)
    result = await engine.accept_offer_atomic(
        driver_identifier=current_user.id,
        offer_identifier=body.offer_id,
    )
    if not result.get("success"):
        status_val = result.get("status")
        if status_val == "expired":
            raise HTTPException(status_code=status.HTTP_410_GONE, detail=result.get("message"))
        if status_val in ("superseded", "removed"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=result.get("message"))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("message"))

    return result


@router.post("/offers/reject")
async def reject_fanout_offer_endpoint(
    body: OfferRejectRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Driver rejects a fanout ride offer.
    The customer ride request remains strictly in MATCHING status.
    """
    engine = FanoutDispatchEngine(db)
    result = await engine.reject_offer(
        driver_identifier=current_user.id,
        offer_identifier=body.offer_id,
        rejection_reason=body.reason,
    )
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("message"))

    return result
