"""
Central Service Catalog & Driver Eligibility API Router
════════════════════════════════════════════════════════════════════════════════
Provides:
- Public Service Catalog metadata inspection
- Partner & Active Vehicle Cross-Service Eligibility breakdown
- Driver Service Preferences toggle management
- Dynamic ride request eligibility evaluation
"""
from __future__ import annotations

import uuid
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_active_driver
from common.models.all_models import (
    Driver,
    DriverDocument,
    DriverPreference,
    DriverStatus,
    Vehicle,
)
from common.models.service_catalog import (
    ServiceCatalogType,
    ServiceMetadata,
    ServiceEligibilityEngine,
    ServiceEligibilityResult,
    DriverFullEligibilityReport,
    SERVICE_CATALOG_REGISTRY,
)
from common.schemas.response import APIResponse

logger = structlog.get_logger(__name__)
router = APIRouter()


class DriverServicePreferencesUpdate(BaseModel):
    allow_local: Optional[bool] = None
    allow_airport: Optional[bool] = None
    allow_outstation: Optional[bool] = None
    allow_rental: Optional[bool] = None
    allow_parcel: Optional[bool] = None
    allow_transport: Optional[bool] = None
    allow_packers: Optional[bool] = None
    allow_carpool: Optional[bool] = None
    allow_scheduled: Optional[bool] = None
    ladies_only_accepted: Optional[bool] = None
    visibility_mode: Optional[str] = None  # all_city, specific_city, specific_hex
    service_customizations: Optional[Dict[str, Any]] = None


class EvaluateServiceRequest(BaseModel):
    service_code: str
    passengers: Optional[int] = 1
    weight_kg: Optional[float] = None


@router.get(
    "/catalog",
    response_model=APIResponse[List[ServiceMetadata]],
    summary="Get central catalog of all 11 platform services",
)
async def get_service_catalog():
    """Returns the full public catalog of all 11 platform services and specifications."""
    catalog_list = list(SERVICE_CATALOG_REGISTRY.values())
    return APIResponse(message="Service catalog fetched", data=catalog_list)


@router.get(
    "/driver/services/eligibility",
    response_model=APIResponse[DriverFullEligibilityReport],
    summary="Get comprehensive cross-service eligibility report for current driver and active vehicle",
)
async def get_driver_service_eligibility(
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates: Partner + Service + Vehicle + Documents + Availability + Coverage -> Eligibility
    Returns report for all 11 services.
    """
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    # Fetch active vehicle
    veh_res = await db.execute(
        select(Vehicle).where(Vehicle.driver_id == driver.id, Vehicle.is_active == True)
    )
    active_veh = veh_res.scalar_one_or_none()

    # Fetch preferences
    pref_res = await db.execute(
        select(DriverPreference).where(DriverPreference.driver_id == driver.id)
    )
    pref = pref_res.scalar_one_or_none()

    # Fetch documents
    doc_res = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == driver.id)
    )
    docs = doc_res.scalars().all()

    report = ServiceEligibilityEngine.build_full_driver_eligibility_report(
        driver=driver,
        active_vehicle=active_veh,
        driver_pref=pref,
        driver_docs=docs,
    )

    return APIResponse(message="Driver service eligibility report generated", data=report)


@router.post(
    "/driver/services/preferences",
    response_model=APIResponse[dict],
    summary="Update driver service permissions and coverage preferences",
)
async def update_driver_service_preferences(
    payload: DriverServicePreferencesUpdate,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Updates driver service toggle permissions in driver_preferences table."""
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    pref_res = await db.execute(
        select(DriverPreference).where(DriverPreference.driver_id == driver.id)
    )
    pref = pref_res.scalar_one_or_none()
    if not pref:
        pref = DriverPreference(driver_id=driver.id)
        db.add(pref)

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if val is not None:
            setattr(pref, field, val)

    await db.commit()

    return APIResponse(
        message="Driver service preferences updated successfully",
        data={
            "driver_id": str(driver.id),
            "allow_local": pref.allow_local,
            "allow_airport": pref.allow_airport,
            "allow_outstation": pref.allow_outstation,
            "allow_rental": pref.allow_rental,
            "allow_parcel": pref.allow_parcel,
            "allow_transport": pref.allow_transport,
            "allow_packers": pref.allow_packers,
            "allow_carpool": pref.allow_carpool,
            "visibility_mode": pref.visibility_mode,
        },
    )


@router.post(
    "/driver/services/evaluate",
    response_model=APIResponse[ServiceEligibilityResult],
    summary="Evaluate eligibility for a specific service order",
)
async def evaluate_order_eligibility(
    payload: EvaluateServiceRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Evaluates whether the authenticated driver and active vehicle satisfy a specific booking request."""
    driver_res = await db.execute(select(Driver).where(Driver.user_id == current_user.id))
    driver = driver_res.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    service_enum = ServiceEligibilityEngine.parse_service_code(payload.service_code)
    if not service_enum:
        raise HTTPException(status_code=400, detail=f"Invalid or unrecognized service code '{payload.service_code}'")

    veh_res = await db.execute(
        select(Vehicle).where(Vehicle.driver_id == driver.id, Vehicle.is_active == True)
    )
    active_veh = veh_res.scalar_one_or_none()

    pref_res = await db.execute(
        select(DriverPreference).where(DriverPreference.driver_id == driver.id)
    )
    pref = pref_res.scalar_one_or_none()

    res = ServiceEligibilityEngine.evaluate_service_eligibility(
        service=service_enum,
        driver=driver,
        active_vehicle=active_veh,
        driver_pref=pref,
        requested_passengers=payload.passengers,
        requested_weight_kg=payload.weight_kg,
        check_availability=True,
    )

    return APIResponse(message="Service eligibility evaluated", data=res)
