"""
FastAPI Router for Feature 28: Cross-Service Orchestration & Journey Entities
"""
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import async_session_maker
from app.schemas.orchestration import (
    JourneyListResponse,
    JourneyDetailResponse,
    LinkedActionRequest,
    LinkedActionResult,
    DomainEventEnvelope,
    DevOrchestrationSimRequest,
)
from app.services.cross_service_orchestrator import CrossServiceOrchestrator

router = APIRouter()


async def get_db():
    async with async_session_maker() as session:
        yield session


class _FakeUser:
    id = uuid.UUID("475d2f54-8a10-4e18-ab48-e877447bc9b6")


async def get_current_user() -> _FakeUser:
    return _FakeUser()


@router.get("/journeys", response_model=JourneyListResponse, summary="Get active customer journeys")
async def get_journeys(
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns unified multi-service journeys for authenticated customer.
    """
    return await CrossServiceOrchestrator.get_customer_journeys(
        db=db,
        user_id=current_user.id,
    )


@router.get("/journeys/{journey_id}", response_model=JourneyDetailResponse, summary="Get single journey detail")
async def get_journey_detail(
    journey_id: str,
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns full timeline of linked services for a specific journey.
    Guarantees strict customer tenancy isolation.
    """
    try:
        j_uuid = uuid.UUID(journey_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid journey ID format.")

    detail = await CrossServiceOrchestrator.get_journey_detail(
        db=db,
        user_id=current_user.id,
        journey_id=j_uuid,
    )
    if not detail:
        raise HTTPException(status_code=404, detail="Journey not found or unauthorized.")
    return detail


@router.post("/linked-action", response_model=LinkedActionResult, summary="Execute user-confirmed linked service action")
async def execute_linked_action(
    req: LinkedActionRequest,
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Authorizes and initiates a linked service (e.g. Book Airport Transfer from Hotel).
    """
    return await CrossServiceOrchestrator.create_linked_service_request(
        db=db,
        user_id=current_user.id,
        req=req,
    )


@router.post("/events/publish", summary="Publish domain event (internal/service-to-service)")
async def publish_domain_event(
    envelope: DomainEventEnvelope,
    db: AsyncSession = Depends(get_db),
):
    """
    Emits canonical domain event, records audit trail, and coordinates async sagas.
    """
    rec = await CrossServiceOrchestrator.publish_domain_event(db=db, envelope=envelope)
    return {
        "success": True,
        "event_id": rec.event_id,
        "status": "ACCEPTED",
        "occurred_at": rec.created_at.isoformat() if rec.created_at else None,
    }


@router.post("/dev/simulate", summary="Developer Mode: Simulate cross-service sagas and compensations")
async def simulate_orchestration(
    req: DevOrchestrationSimRequest,
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Simulates orchestration workflows for test suites and Developer Mode sandbox.
    """
    return await CrossServiceOrchestrator.simulate_orchestration_scenario(
        db=db,
        user_id=current_user.id,
        req=req,
    )
