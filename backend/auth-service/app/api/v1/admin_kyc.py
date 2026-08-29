"""
Admin KYC Review & Compliance Router
Endpoints for compliance admins to review, inspect, approve, and reject partner KYC documents.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, Form, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.kyc_service import (
    DOCUMENT_METADATA_CONFIG,
    admin_approve_document,
    admin_approve_driver_kyc,
    admin_reject_document,
    admin_reject_driver_kyc,
)
from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_admin
from common.models.all_models import (
    DocumentType,
    Driver,
    DriverBankAccount,
    DriverDocument,
    KYCStatus,
    Vehicle,
)
from common.schemas.response import APIResponse
from common.utils.cloudinary_service import CloudinaryService

logger = structlog.get_logger(__name__)
router = APIRouter()


class AdminRejectDocRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=3, description="Reason for rejecting document")


class AdminRejectDriverRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=3, description="Reason for overall KYC rejection")


@router.get(
    "/pending",
    response_model=APIResponse[List[dict]],
    summary="List drivers pending KYC verification",
)
async def list_pending_kyc(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_admin: AuthenticatedUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Lists all drivers awaiting KYC review with document counts and submission timestamps."""
    query = (
        select(Driver)
        .where(Driver.kyc_status.in_([KYCStatus.PENDING, KYCStatus.SUBMITTED, KYCStatus.REJECTED]))
        .order_by(desc(Driver.created_at))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    drivers = result.scalars().all()

    items = []
    for d in drivers:
        doc_count_res = await db.execute(
            select(func.count(DriverDocument.id)).where(DriverDocument.driver_id == d.id)
        )
        doc_count = doc_count_res.scalar() or 0

        pending_docs_res = await db.execute(
            select(func.count(DriverDocument.id)).where(
                DriverDocument.driver_id == d.id,
                DriverDocument.is_verified == False,
                DriverDocument.rejection_reason.is_(None),
            )
        )
        pending_docs = pending_docs_res.scalar() or 0

        items.append({
            "driver_id": str(d.id),
            "user_id": str(d.user_id),
            "full_name": d.full_name,
            "kyc_status": d.kyc_status.value if hasattr(d.kyc_status, "value") else str(d.kyc_status),
            "total_documents": doc_count,
            "pending_review_documents": pending_docs,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    return APIResponse(message="Pending KYC list retrieved", data=items)


@router.get(
    "/drivers/{driver_id}",
    response_model=APIResponse[dict],
    summary="Get full KYC dossier for a driver partner",
)
async def get_driver_kyc_dossier(
    driver_id: uuid.UUID,
    current_admin: AuthenticatedUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full KYC dossier for admin review, including signed Cloudinary document URLs."""
    result = await db.execute(select(Driver).where(Driver.id == driver_id))
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    docs_result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == driver_id)
    )
    docs = docs_result.scalars().all()

    bank_result = await db.execute(
        select(DriverBankAccount).where(DriverBankAccount.driver_id == driver_id)
    )
    bank = bank_result.scalar_one_or_none()

    veh_result = await db.execute(
        select(Vehicle).where(Vehicle.driver_id == driver_id)
    )
    vehicle = veh_result.scalar_one_or_none()

    doc_list = []
    for d in docs:
        preview_url = None
        if d.cloudinary_public_id:
            try:
                preview_url = CloudinaryService.generate_secure_access_url(
                    public_id=d.cloudinary_public_id,
                    expiry_seconds=3600,
                )
            except Exception:
                preview_url = d.file_path
        else:
            preview_url = d.file_path

        back_url = None
        if d.metadata_json and "back_url" in d.metadata_json:
            back_url = d.metadata_json["back_url"]

        cfg = DOCUMENT_METADATA_CONFIG.get(d.doc_type, {"name": d.doc_type.value.title()})

        doc_list.append({
            "id": str(d.id),
            "doc_type": d.doc_type.value,
            "document_name": cfg.get("name", d.doc_type.value),
            "status": d.status,
            "is_verified": d.is_verified,
            "rejection_reason": d.rejection_reason,
            "document_number": d.document_number,
            "issue_date": str(d.issue_date) if d.issue_date else None,
            "expires_at": str(d.expires_at) if d.expires_at else None,
            "version": d.version,
            "preview_url": preview_url,
            "back_url": back_url,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
        })

    dossier = {
        "driver_id": str(driver.id),
        "user_id": str(driver.user_id),
        "full_name": driver.full_name,
        "kyc_status": driver.kyc_status.value if hasattr(driver.kyc_status, "value") else str(driver.kyc_status),
        "is_verified": driver.is_verified,
        "documents": doc_list,
        "bank_account": {
            "account_holder_name": bank.account_holder_name,
            "bank_name": bank.bank_name,
            "account_number_masked": bank.account_number_masked,
            "ifsc_code": bank.ifsc_code,
            "is_verified": bank.is_verified,
        } if bank else None,
        "vehicle": {
            "id": str(vehicle.id),
            "make": vehicle.make,
            "model": vehicle.model,
            "license_plate": vehicle.license_plate,
            "vehicle_type": vehicle.vehicle_type.value if hasattr(vehicle.vehicle_type, "value") else str(vehicle.vehicle_type),
        } if vehicle else None,
    }

    return APIResponse(message="Driver KYC dossier retrieved", data=dossier)


@router.post(
    "/drivers/{driver_id}/documents/{doc_type}/approve",
    response_model=APIResponse[dict],
    summary="Approve a specific driver document",
)
async def approve_document(
    driver_id: uuid.UUID,
    doc_type: str,
    current_admin: AuthenticatedUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approves a single document for a driver."""
    try:
        dt_enum = DocumentType(doc_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document type: {doc_type}")

    try:
        doc = await admin_approve_document(
            db=db,
            driver_id=driver_id,
            doc_type=dt_enum,
            admin_user_id=current_admin.id,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return APIResponse(
        message=f"{doc_type} approved successfully",
        data={"doc_type": doc_type, "status": "approved", "is_verified": True},
    )


@router.post(
    "/drivers/{driver_id}/documents/{doc_type}/reject",
    response_model=APIResponse[dict],
    summary="Reject a specific driver document with reason",
)
async def reject_document(
    driver_id: uuid.UUID,
    doc_type: str,
    payload: AdminRejectDocRequest,
    current_admin: AuthenticatedUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Rejects a single document with a mandatory reason."""
    try:
        dt_enum = DocumentType(doc_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document type: {doc_type}")

    try:
        doc = await admin_reject_document(
            db=db,
            driver_id=driver_id,
            doc_type=dt_enum,
            rejection_reason=payload.rejection_reason,
            admin_user_id=current_admin.id,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return APIResponse(
        message=f"{doc_type} rejected",
        data={"doc_type": doc_type, "status": "rejected", "rejection_reason": payload.rejection_reason},
    )


@router.post(
    "/drivers/{driver_id}/approve",
    response_model=APIResponse[dict],
    summary="Full driver KYC approval",
)
async def approve_driver_kyc_full(
    driver_id: uuid.UUID,
    current_admin: AuthenticatedUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approves driver overall KYC and activates account."""
    try:
        driver = await admin_approve_driver_kyc(
            db=db,
            driver_id=driver_id,
            admin_user_id=current_admin.id,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return APIResponse(
        message="Driver KYC approved successfully and activated",
        data={
            "driver_id": str(driver.id),
            "kyc_status": driver.kyc_status.value if hasattr(driver.kyc_status, "value") else str(driver.kyc_status),
            "is_verified": driver.is_verified,
            "is_active": driver.is_active,
        },
    )


@router.post(
    "/drivers/{driver_id}/reject",
    response_model=APIResponse[dict],
    summary="Full driver KYC rejection",
)
async def reject_driver_kyc_full(
    driver_id: uuid.UUID,
    payload: AdminRejectDriverRequest,
    current_admin: AuthenticatedUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Rejects driver overall KYC."""
    try:
        driver = await admin_reject_driver_kyc(
            db=db,
            driver_id=driver_id,
            rejection_reason=payload.rejection_reason,
            admin_user_id=current_admin.id,
        )
        await db.commit()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return APIResponse(
        message="Driver KYC rejected",
        data={
            "driver_id": str(driver.id),
            "kyc_status": driver.kyc_status.value if hasattr(driver.kyc_status, "value") else str(driver.kyc_status),
            "rejection_reason": payload.rejection_reason,
        },
    )
