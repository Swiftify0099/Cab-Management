"""
Unified Driver Job API — Common Job Contract Endpoints
════════════════════════════════════════════════════════════════════════════════
Provides a single set of endpoints for the Driver App to interact with
ANY service domain (Ride, Parcel, Transport, Airport, Rental, Outstation)
through the Service Adapter pattern.

Endpoints:
  GET  /driver/jobs/active       — Driver's currently active job (any domain)
  GET  /driver/jobs/{job_id}     — Job detail by ID
  POST /driver/jobs/{job_id}/command — Process command (arrive, start, complete)
  GET  /driver/jobs/history/list — Completed/cancelled job history
"""
from __future__ import annotations

from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_active_driver, AuthenticatedUser
from common.services.common_job_contract import (
    adapter_registry, CommonJobCommand,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/driver/jobs", tags=["Driver Jobs — Common Contract"])


# ─── Request/Response Schemas ──────────────────────────────────────────────────

class CommandRequest(BaseModel):
    """Request body for processing a job command."""
    command: str = Field(..., description="Command to execute (e.g., ARRIVE_PICKUP, START, COMPLETE)")
    params: Optional[dict] = Field(default=None, description="Command-specific parameters (e.g., {otp: '1234'})")


class JobResponse(BaseModel):
    """Standard wrapper for job responses."""
    success: bool = True
    data: Optional[dict] = None
    message: str = ""


# ─── Adapter Registration (called at startup) ─────────────────────────────────

def register_default_adapters():
    """Register all default service adapters. Called once at app startup."""
    try:
        from common.services.adapters.ride_adapter import RideServiceAdapter
        adapter_registry.register(RideServiceAdapter())
        logger.info("adapter_registered", adapter="RIDE")
    except Exception as e:
        logger.warning("adapter_registration_failed", adapter="RIDE", error=str(e))

    try:
        from common.services.adapters.parcel_adapter import ParcelServiceAdapter
        adapter_registry.register(ParcelServiceAdapter())
        logger.info("adapter_registered", adapter="PARCEL")
    except Exception as e:
        logger.warning("adapter_registration_failed", adapter="PARCEL", error=str(e))

    try:
        from common.services.adapters.transport_adapter import TransportServiceAdapter
        adapter_registry.register(TransportServiceAdapter())
        logger.info("adapter_registered", adapter="TRANSPORT")
    except Exception as e:
        logger.warning("adapter_registration_failed", adapter="TRANSPORT", error=str(e))

    try:
        from common.services.adapters.airport_adapter import AirportServiceAdapter
        adapter_registry.register(AirportServiceAdapter())
        logger.info("adapter_registered", adapter="AIRPORT")
    except Exception as e:
        logger.warning("adapter_registration_failed", adapter="AIRPORT", error=str(e))

    try:
        from common.services.adapters.rental_adapter import RentalServiceAdapter
        adapter_registry.register(RentalServiceAdapter())
        logger.info("adapter_registered", adapter="RENTAL")
    except Exception as e:
        logger.warning("adapter_registration_failed", adapter="RENTAL", error=str(e))

    try:
        from common.services.adapters.outstation_adapter import OutstationServiceAdapter
        adapter_registry.register(OutstationServiceAdapter())
        logger.info("adapter_registered", adapter="OUTSTATION")
    except Exception as e:
        logger.warning("adapter_registration_failed", adapter="OUTSTATION", error=str(e))


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/active", response_model=JobResponse)
async def get_active_job(
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the driver's currently active job across ALL service domains.
    Iterates through all registered adapters and returns the first active job found.
    """
    driver_id = current_user.user_id_str

    for adapter in adapter_registry.get_all_adapters():
        try:
            job = await adapter.get_active_job(driver_id, db)
            if job:
                return JobResponse(
                    success=True,
                    data=job.to_dict(),
                    message=f"Active {job.job_type} job found.",
                )
        except Exception as e:
            logger.warning(
                "adapter_active_job_error",
                adapter=adapter.get_job_type().value,
                error=str(e),
            )

    return JobResponse(
        success=True,
        data=None,
        message="No active job.",
    )


@router.get("/history/list", response_model=JobResponse)
async def get_job_history(
    job_type: Optional[str] = Query(None, description="Filter by job type"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns completed/cancelled job history across all domains or filtered by type.
    """
    driver_id = current_user.user_id_str
    all_items = []

    if job_type:
        adapter = adapter_registry.get_adapter(job_type.upper())
        if not adapter:
            raise HTTPException(status_code=400, detail=f"Unknown job type: {job_type}")
        items = await adapter.get_job_history(driver_id, db, limit=limit, offset=offset)
        all_items.extend([item.to_dict() for item in items])
    else:
        for adapter in adapter_registry.get_all_adapters():
            try:
                items = await adapter.get_job_history(driver_id, db, limit=limit, offset=offset)
                all_items.extend([item.to_dict() for item in items])
            except Exception as e:
                logger.warning(
                    "adapter_history_error",
                    adapter=adapter.get_job_type().value,
                    error=str(e),
                )

    # Sort by created_at descending, then apply limit
    all_items.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    all_items = all_items[:limit]

    return JobResponse(
        success=True,
        data={"items": all_items, "total": len(all_items)},
        message=f"Found {len(all_items)} job(s) in history.",
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_detail(
    job_id: str,
    job_type: Optional[str] = Query(None, description="Job type filter (RIDE, PARCEL, etc.)"),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns detail for a specific job.
    If job_type is provided, queries only that adapter. Otherwise tries all.
    """
    driver_id = current_user.user_id_str

    if job_type:
        adapter = adapter_registry.get_adapter(job_type.upper())
        if not adapter:
            raise HTTPException(status_code=400, detail=f"Unknown job type: {job_type}")
        job = await adapter.get_job_by_id(job_id, driver_id, db)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found or not authorized.")
        return JobResponse(success=True, data=job.to_dict())

    # Try all adapters
    for adapter in adapter_registry.get_all_adapters():
        try:
            job = await adapter.get_job_by_id(job_id, driver_id, db)
            if job:
                return JobResponse(success=True, data=job.to_dict())
        except Exception:
            continue

    raise HTTPException(status_code=404, detail="Job not found across any service domain.")


@router.post("/{job_id}/command", response_model=JobResponse)
async def process_job_command(
    job_id: str,
    body: CommandRequest,
    job_type: Optional[str] = Query(None, description="Job type (RIDE, PARCEL, etc.)"),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """
    Processes a driver command against a job.
    The backend validates, checks the domain state machine, and transitions state.
    Frontend sends COMMANDS, not status changes.
    """
    driver_id = current_user.user_id_str

    # Parse command
    try:
        command = CommonJobCommand(body.command.upper())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown command: {body.command}. Valid: {[c.value for c in CommonJobCommand]}"
        )

    # Find the right adapter
    adapter = None
    if job_type:
        adapter = adapter_registry.get_adapter(job_type.upper())
        if not adapter:
            raise HTTPException(status_code=400, detail=f"Unknown job type: {job_type}")
    else:
        # Auto-detect by trying each adapter
        for a in adapter_registry.get_all_adapters():
            try:
                job = await a.get_job_by_id(job_id, driver_id, db)
                if job:
                    adapter = a
                    break
            except Exception:
                continue

    if not adapter:
        raise HTTPException(status_code=404, detail="Job not found across any service domain.")

    # Execute command
    result = await adapter.process_command(job_id, command, driver_id, db, body.params)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)

    return JobResponse(
        success=True,
        data=result.to_dict(),
        message=result.message,
    )
