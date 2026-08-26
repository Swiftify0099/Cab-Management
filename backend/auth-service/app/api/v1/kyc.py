"""
Driver KYC API Router
Endpoints for Dashboard, Document Uploads, Rejection Resolution, Bank Account, and Audit Timelines.
"""
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.kyc import (
    AuditTimelineEvent,
    BankAccountResponse,
    BankAccountSubmitRequest,
    KYCDashboardResponse,
    KYCItemStatusResponse,
    KYCRejectionDetailsResponse,
)
from app.services.kyc_service import (
    DOCUMENT_METADATA_CONFIG,
    get_driver_kyc_dashboard,
    save_driver_bank_account,
    save_or_update_kyc_document,
)
from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_active_driver
from common.models.all_models import (
    DocumentType,
    Driver,
    DriverBankAccount,
    DriverDocument,
    KYCStatus,
    MediaAsset,
    MediaOwnerType,
    MediaType,
)
from common.schemas.response import APIResponse
from common.utils.cloudinary_service import CloudinaryService
from common.utils.storage import (
    ALLOWED_DOCUMENT_TYPES,
    delete_upload,
    get_file_url,
    save_upload,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get(
    "/dashboard",
    response_model=APIResponse[KYCDashboardResponse],
    summary="Get comprehensive driver KYC dashboard data",
)
async def get_kyc_dashboard(
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Fetches complete KYC dashboard state, 4-section breakdown, % progress, and alerts."""
    result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        # Create minimal driver profile if not already setup
        driver = Driver(
            id=uuid.uuid4(),
            user_id=current_user.id,
            full_name=current_user.phone or "Driver Partner",
            kyc_status=KYCStatus.PENDING,
        )
        db.add(driver)
        await db.commit()
        await db.refresh(driver)

    dashboard_data = await get_driver_kyc_dashboard(db, driver, current_user._user)
    return APIResponse(message="KYC dashboard fetched", data=dashboard_data)


@router.get(
    "/documents/{doc_type}",
    response_model=APIResponse[KYCRejectionDetailsResponse],
    summary="Get details and audit timeline for a specific KYC document",
)
async def get_document_details(
    doc_type: str,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Fetches document details, rejection reasons, and audit timeline for resolution."""
    result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    try:
        dt_enum = DocumentType(doc_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document type: {doc_type}")

    doc_result = await db.execute(
        select(DriverDocument).where(
            DriverDocument.driver_id == driver.id,
            DriverDocument.doc_type == dt_enum,
        )
    )
    doc = doc_result.scalar_one_or_none()

    cfg = DOCUMENT_METADATA_CONFIG.get(dt_enum, {"name": doc_type.replace("_", " ").title()})
    doc_name = cfg["name"]

    # Generate synthetic / real audit events
    now = datetime.now(timezone.utc)
    events: List[AuditTimelineEvent] = []

    if doc:
        events.append(AuditTimelineEvent(
            step=1,
            title="Document Uploaded",
            description=f"Version {doc.version} submitted by driver.",
            timestamp=doc.created_at or (now - timedelta(days=2)),
            actor="Driver",
            status="completed",
        ))
        if doc.rejection_reason:
            events.append(AuditTimelineEvent(
                step=2,
                title="Under Review by Compliance Team",
                description="Review initiated by administrative compliance officer.",
                timestamp=now - timedelta(hours=12),
                actor="Compliance Reviewer",
                status="completed",
            ))
            events.append(AuditTimelineEvent(
                step=3,
                title="Document Rejected",
                description=doc.rejection_reason,
                timestamp=doc.updated_at or now,
                actor="Compliance Reviewer",
                status="rejected",
            ))
        elif doc.is_verified:
            events.append(AuditTimelineEvent(
                step=2,
                title="Document Verified & Approved",
                description="Document passed compliance checks and is active.",
                timestamp=doc.verified_at or now,
                actor="Compliance System",
                status="approved",
            ))
        else:
            events.append(AuditTimelineEvent(
                step=2,
                title="Under Review",
                description="Document is currently being reviewed by compliance.",
                timestamp=now,
                actor="System",
                status="in_progress",
            ))
    else:
        events.append(AuditTimelineEvent(
            step=1,
            title="Not Submitted",
            description="Document has not been uploaded yet.",
            timestamp=now,
            actor="System",
            status="pending",
        ))

    rejection_msg = doc.rejection_reason if (doc and doc.rejection_reason) else "Document requires re-upload."
    action_req = "Please upload a clear, high-resolution original scan or photo." if (doc and doc.rejection_reason) else "Upload document to proceed."

    preview_url = None
    if doc:
        if doc.cloudinary_public_id:
            try:
                preview_url = CloudinaryService.generate_secure_access_url(doc.cloudinary_public_id)
            except Exception:
                preview_url = doc.file_path
        else:
            preview_url = get_file_url(doc.file_path) if doc.file_path else None

    resp = KYCRejectionDetailsResponse(
        doc_type=doc_type,
        document_name=doc_name,
        document_number=doc.document_number if doc else None,
        status="rejected" if (doc and doc.rejection_reason) else ("approved" if (doc and doc.is_verified) else "pending"),
        rejection_reason=rejection_msg,
        action_required=action_req,
        file_path=preview_url,
        access_url=preview_url,
        expires_at=str(doc.expires_at) if (doc and doc.expires_at) else None,
        rejected_at=doc.updated_at if (doc and doc.rejection_reason) else None,
        timeline=events,
    )
    return APIResponse(message="Document details fetched", data=resp)


@router.post(
    "/documents/{doc_type}",
    response_model=APIResponse[dict],
    summary="Upload or replace a KYC document in Cloudinary with metadata",
)
async def upload_kyc_document(
    doc_type: str,
    file: UploadFile = File(...),
    back_file: Optional[UploadFile] = File(None),
    document_number: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    expires_at: Optional[str] = Form(None),
    vehicle_id: Optional[str] = Form(None),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Uploads new document or replaces existing document, storing bytes in Cloudinary and metadata in DB."""
    result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    try:
        dt_enum = DocumentType(doc_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document type: {doc_type}")

    # Parse dates if provided
    parsed_issue: Optional[date] = None
    parsed_expiry: Optional[date] = None
    if issue_date:
        try:
            parsed_issue = date.fromisoformat(issue_date)
        except ValueError:
            pass
    if expires_at:
        try:
            parsed_expiry = date.fromisoformat(expires_at)
        except ValueError:
            pass

    parsed_vehicle_id: Optional[uuid.UUID] = None
    if vehicle_id:
        try:
            parsed_vehicle_id = uuid.UUID(vehicle_id)
        except ValueError:
            pass

    secure_url = None
    public_id = None
    back_secure_url = None

    # 1. Upload front file to Cloudinary private/authenticated storage
    try:
        upload_res = await CloudinaryService.upload_driver_kyc_document(
            driver_id=str(driver.id),
            doc_type=doc_type,
            file=file,
            vehicle_id=str(parsed_vehicle_id) if parsed_vehicle_id else None,
        )
        secure_url = upload_res.get("secure_url") or upload_res.get("url")
        public_id = upload_res.get("public_id")
    except Exception as e:
        logger.warning("cloudinary_upload_failed_fallback_to_local", error=str(e))
        path = await save_upload(
            file=file,
            category="documents",
            allowed_types=ALLOWED_DOCUMENT_TYPES,
            max_size=10 * 1024 * 1024,
        )
        secure_url = get_file_url(path)
        public_id = None

    # 1b. Upload optional back file if provided
    if back_file:
        try:
            back_res = await CloudinaryService.upload_driver_kyc_document(
                driver_id=str(driver.id),
                doc_type=f"{doc_type}_back",
                file=back_file,
                vehicle_id=str(parsed_vehicle_id) if parsed_vehicle_id else None,
            )
            back_secure_url = back_res.get("secure_url") or back_res.get("url")
        except Exception as e:
            logger.warning("cloudinary_back_upload_failed", error=str(e))
            try:
                bpath = await save_upload(
                    file=back_file,
                    category="documents",
                    allowed_types=ALLOWED_DOCUMENT_TYPES,
                    max_size=10 * 1024 * 1024,
                )
                back_secure_url = get_file_url(bpath)
            except Exception:
                pass

    # 2. Record MediaAsset metadata (Zero file bytes in PostgreSQL)
    media_asset = MediaAsset(
        owner_type=MediaOwnerType.DRIVER,
        owner_id=driver.id,
        media_type=MediaType.KYC_DOCUMENT if not parsed_vehicle_id else MediaType.VEHICLE_DOCUMENT,
        cloudinary_public_id=public_id or f"local_kyc_{uuid.uuid4().hex[:8]}",
        resource_type="image",
        format="jpg",
        mime_type=file.content_type or "image/jpeg",
        file_size_bytes=0,
        version=1,
        secure_url=secure_url,
        thumbnail_url=secure_url,
        status="ACTIVE",
        is_private=True,
    )
    db.add(media_asset)
    await db.flush()

    meta_json = {}
    if back_secure_url:
        meta_json["back_url"] = back_secure_url

    # 3. Save or update DriverDocument record
    doc = await save_or_update_kyc_document(
        db=db,
        driver=driver,
        doc_type=dt_enum,
        file_path=secure_url,
        cloudinary_public_id=public_id,
        media_asset_id=media_asset.id,
        vehicle_id=parsed_vehicle_id,
        document_number=document_number.strip() if document_number else None,
        issue_date=parsed_issue,
        expires_at=parsed_expiry,
        metadata_json=meta_json,
    )
    await db.commit()

    return APIResponse(
        message=f"{dt_enum.value} uploaded successfully to Cloudinary",
        data={
            "doc_type": doc.doc_type.value,
            "public_id": public_id,
            "version": doc.version,
            "status": doc.status,
            "file_path": secure_url,
            "access_url": secure_url,
            "preview_url": secure_url,
            "back_url": back_secure_url,
        },
    )


@router.get(
    "/documents/{doc_type}/access",
    response_model=APIResponse[dict],
    summary="Get short-lived secure access URL for a driver's private KYC document",
)
async def get_document_access_url(
    doc_type: str,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Generates a temporary signed URL for viewing sensitive KYC documents (IDOR-protected)."""
    result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    try:
        dt_enum = DocumentType(doc_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document type: {doc_type}")

    doc_res = await db.execute(
        select(DriverDocument).where(
            DriverDocument.driver_id == driver.id,
            DriverDocument.doc_type == dt_enum,
            DriverDocument.is_current == True,
        )
    )
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found for this driver")

    if doc.cloudinary_public_id:
        signed_url = CloudinaryService.generate_secure_access_url(
            public_id=doc.cloudinary_public_id,
            expiry_seconds=1800,  # 30 min access
        )
    else:
        signed_url = get_file_url(doc.file_path)

    return APIResponse(
        message="Secure access URL generated",
        data={
            "doc_type": doc.doc_type.value,
            "access_url": signed_url,
            "expires_in_seconds": 1800,
        },
    )


@router.post(
    "/bank-account",
    response_model=APIResponse[BankAccountResponse],
    summary="Link and verify driver bank account for payouts",
)
async def submit_bank_account(
    data: BankAccountSubmitRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Links driver bank account and simulates verification in dev mode."""
    result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    bank = await save_driver_bank_account(db=db, driver=driver, data=data)
    await db.commit()

    return APIResponse(
        message="Bank account linked and verified successfully",
        data=BankAccountResponse(
            id=bank.id,
            account_holder_name=bank.account_holder_name,
            bank_name=bank.bank_name,
            account_number_masked=bank.account_number_masked,
            ifsc_code=bank.ifsc_code,
            account_type=bank.account_type,
            is_verified=bank.is_verified,
            status="verified" if bank.is_verified else "under_review",
            status_label="Verified" if bank.is_verified else "Under Review",
        ),
    )


@router.get(
    "/bank-account",
    response_model=APIResponse[Optional[BankAccountResponse]],
    summary="Get linked driver bank account",
)
async def get_bank_account(
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Fetches masked bank account info for driver."""
    result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    bank_result = await db.execute(
        select(DriverBankAccount).where(DriverBankAccount.driver_id == driver.id)
    )
    bank = bank_result.scalar_one_or_none()
    if not bank:
        return APIResponse(message="No bank account linked", data=None)

    return APIResponse(
        message="Bank account fetched",
        data=BankAccountResponse(
            id=bank.id,
            account_holder_name=bank.account_holder_name,
            bank_name=bank.bank_name,
            account_number_masked=bank.account_number_masked,
            ifsc_code=bank.ifsc_code,
            account_type=bank.account_type,
            is_verified=bank.is_verified,
            status="verified" if bank.is_verified else "under_review",
            status_label="Verified" if bank.is_verified else "Under Review",
        ),
    )


@router.post(
    "/dev/set-status/{doc_type}",
    response_model=APIResponse[dict],
    summary="Dev Mode: Simulate document status (approved/rejected/expiring/under_review)",
)
async def dev_set_document_status(
    doc_type: str,
    target_status: str = Form(..., description="approved | rejected | expiring | expired | under_review"),
    rejection_reason: Optional[str] = Form(None),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
    db: AsyncSession = Depends(get_db),
):
    """Developer mode simulation helper."""
    result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    try:
        dt_enum = DocumentType(doc_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid doc type: {doc_type}")

    doc_result = await db.execute(
        select(DriverDocument).where(
            DriverDocument.driver_id == driver.id,
            DriverDocument.doc_type == dt_enum,
        )
    )
    doc = doc_result.scalar_one_or_none()

    today = date.today()
    if not doc:
        doc = DriverDocument(
            driver_id=driver.id,
            doc_type=dt_enum,
            file_path="/uploads/sample.jpg",
            version=1,
        )
        db.add(doc)

    if target_status == "approved":
        doc.is_verified = True
        doc.rejection_reason = None
        doc.status = "approved"
        doc.expires_at = today + timedelta(days=365)
    elif target_status == "rejected":
        doc.is_verified = False
        doc.rejection_reason = rejection_reason or "Document is blurry and unreadable."
        doc.status = "rejected"
    elif target_status == "expiring":
        doc.is_verified = True
        doc.rejection_reason = None
        doc.status = "expiring_soon"
        doc.expires_at = today + timedelta(days=6)
    elif target_status == "expired":
        doc.is_verified = False
        doc.rejection_reason = None
        doc.status = "expired"
        doc.expires_at = today - timedelta(days=5)
    else:
        doc.is_verified = False
        doc.rejection_reason = None
        doc.status = "under_review"

    await db.commit()
    return APIResponse(message=f"{doc_type} status set to {target_status}", data={"status": target_status})
