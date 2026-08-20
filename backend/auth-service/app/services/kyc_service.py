"""
Driver KYC & Onboarding Service
Authoritative business logic for 10 document categories, dashboard calculations,
document versioning, rejection reasons, expiry tracking, and bank account verification.
"""
import hashlib
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import structlog
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.kyc import (
    AuditTimelineEvent,
    BankAccountResponse,
    BankAccountSubmitRequest,
    KYCDashboardResponse,
    KYCItemStatusResponse,
    KYCRejectionDetailsResponse,
    KYCSectionResponse,
)
from common.models.all_models import (
    DocumentType,
    Driver,
    DriverBankAccount,
    DriverDocument,
    KYCStatus,
    User,
    Vehicle,
)

logger = structlog.get_logger(__name__)

EXPIRY_WARNING_DAYS = 30

DOCUMENT_METADATA_CONFIG = {
    DocumentType.AADHAAR: {
        "key": "aadhaar",
        "name": "Aadhaar Card",
        "category": "identity",
        "is_mandatory": True,
        "expiry_trackable": False,
    },
    DocumentType.PAN: {
        "key": "pan",
        "name": "PAN Card",
        "category": "identity",
        "is_mandatory": True,
        "expiry_trackable": False,
    },
    DocumentType.SELFIE: {
        "key": "selfie",
        "name": "Live Selfie",
        "category": "identity",
        "is_mandatory": True,
        "expiry_trackable": False,
    },
    DocumentType.LICENSE: {
        "key": "license",
        "name": "Driving Licence",
        "category": "driving",
        "is_mandatory": True,
        "expiry_trackable": True,
    },
    DocumentType.POLICE_VERIFICATION: {
        "key": "police_verification",
        "name": "Police Background Check",
        "category": "driving",
        "is_mandatory": True,
        "expiry_trackable": True,
    },
    DocumentType.RC_BOOK: {
        "key": "rc_book",
        "name": "RC Book",
        "category": "vehicle",
        "is_mandatory": True,
        "expiry_trackable": True,
    },
    DocumentType.INSURANCE: {
        "key": "insurance",
        "name": "Vehicle Insurance",
        "category": "vehicle",
        "is_mandatory": True,
        "expiry_trackable": True,
    },
    DocumentType.PERMIT: {
        "key": "permit",
        "name": "Commercial Permit",
        "category": "vehicle",
        "is_mandatory": True,
        "expiry_trackable": True,
    },
    DocumentType.PUC: {
        "key": "puc",
        "name": "PUC Certificate",
        "category": "vehicle",
        "is_mandatory": True,
        "expiry_trackable": True,
    },
    DocumentType.VEHICLE_PHOTO: {
        "key": "vehicle_photo",
        "name": "Vehicle Photos",
        "category": "vehicle",
        "is_mandatory": True,
        "expiry_trackable": False,
    },
}


def _determine_item_status(doc: Optional[DriverDocument], config: dict) -> Tuple[str, str, bool, bool, Optional[str]]:
    """
    Returns (status_key, status_label, is_expired, is_expiring_soon, expiry_label)
    """
    if not doc:
        return "not_started", "Not Started", False, False, None

    if doc.rejection_reason:
        return "rejected", "Action Required", False, False, None

    today = date.today()
    if config["expiry_trackable"] and doc.expires_at:
        if doc.expires_at < today:
            return "expired", "Expired", True, False, doc.expires_at.strftime("%b %d, %Y")
        days_left = (doc.expires_at - today).days
        if days_left <= EXPIRY_WARNING_DAYS:
            return "expiring_soon", "Expiring Soon", False, True, f"{days_left} days left"
        expiry_label = doc.expires_at.strftime("%b %d, %Y")
    else:
        expiry_label = "Lifetime"

    if doc.is_verified:
        return "approved", "Approved", False, False, expiry_label

    return "under_review", "Under Review", False, False, expiry_label


async def get_driver_kyc_dashboard(db: AsyncSession, driver: Driver, user: User) -> KYCDashboardResponse:
    """
    Calculates comprehensive authoritative KYC dashboard state for a driver.
    """
    # 1. Fetch all documents for driver
    docs_result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == driver.id)
    )
    docs = docs_result.scalars().all()
    doc_map: Dict[DocumentType, DriverDocument] = {d.doc_type: d for d in docs}

    # 2. Fetch bank account
    bank_result = await db.execute(
        select(DriverBankAccount).where(DriverBankAccount.driver_id == driver.id)
    )
    bank_account = bank_result.scalar_one_or_none()

    # 3. Categorize items
    identity_items: List[KYCItemStatusResponse] = []
    driving_items: List[KYCItemStatusResponse] = []
    vehicle_items: List[KYCItemStatusResponse] = []
    payment_items: List[KYCItemStatusResponse] = []

    upcoming_expiries: List[KYCItemStatusResponse] = []
    action_required_count = 0
    total_mandatory = 0
    approved_mandatory = 0

    for doc_type, cfg in DOCUMENT_METADATA_CONFIG.items():
        doc = doc_map.get(doc_type)
        status_key, status_label, is_exp, is_exp_soon, exp_label = _determine_item_status(doc, cfg)

        if cfg["is_mandatory"]:
            total_mandatory += 1
            if status_key == "approved":
                approved_mandatory += 1

        if status_key in ["rejected", "expired"]:
            action_required_count += 1

        item = KYCItemStatusResponse(
            key=cfg["key"],
            name=cfg["name"],
            category=cfg["category"],
            doc_type=doc_type.value,
            is_mandatory=cfg["is_mandatory"],
            status=status_key,
            status_label=status_label,
            document_number=doc.document_number if doc else None,
            file_path=doc.file_path if doc else None,
            issue_date=doc.issue_date if doc else None,
            expires_at=doc.expires_at if doc else None,
            expiry_label=exp_label,
            is_expired=is_exp,
            is_expiring_soon=is_exp_soon,
            rejection_reason=doc.rejection_reason if doc else None,
            action_required="Please upload a clearer image" if status_key == "rejected" else None,
            version=(doc.version or 1) if doc else 1,
            updated_at=doc.updated_at if doc else None,
        )

        if is_exp_soon or is_exp:
            upcoming_expiries.append(item)

        if cfg["category"] == "identity":
            identity_items.append(item)
        elif cfg["category"] == "driving":
            driving_items.append(item)
        elif cfg["category"] == "vehicle":
            vehicle_items.append(item)

    # 4. Bank Account Item
    total_mandatory += 1
    if bank_account:
        b_status = "approved" if bank_account.is_verified else ("rejected" if bank_account.rejection_reason else "under_review")
        b_label = "Verified" if bank_account.is_verified else ("Action Required" if bank_account.rejection_reason else "Under Review")
        if bank_account.is_verified:
            approved_mandatory += 1
        if b_status == "rejected":
            action_required_count += 1

        bank_item = KYCItemStatusResponse(
            key="bank_account",
            name="Bank Account",
            category="payments",
            doc_type="bank_account",
            is_mandatory=True,
            status=b_status,
            status_label=b_label,
            document_number=f"{bank_account.bank_name} ({bank_account.account_number_masked})",
            rejection_reason=bank_account.rejection_reason,
            expiry_label="Permanent",
        )
    else:
        bank_item = KYCItemStatusResponse(
            key="bank_account",
            name="Bank Account",
            category="payments",
            doc_type="bank_account",
            is_mandatory=True,
            status="not_started",
            status_label="Not Linked",
            expiry_label=None,
        )
    payment_items.append(bank_item)

    # 5. Build Sections
    def _make_section(sec_id: str, title: str, items: List[KYCItemStatusResponse]) -> KYCSectionResponse:
        done = sum(1 for it in items if it.status == "approved")
        tot = len(items)
        pct = int((done / tot) * 100) if tot > 0 else 0
        return KYCSectionResponse(
            id=sec_id,
            title=title,
            completed_count=done,
            total_count=tot,
            completion_pct=pct,
            items=items,
        )

    sections = [
        _make_section("identity", "Identity Documents", identity_items),
        _make_section("driving", "Driving & Background", driving_items),
        _make_section("vehicle", "Vehicle Documents", vehicle_items),
        _make_section("payments", "Payout Details", payment_items),
    ]

    completion_percentage = int((approved_mandatory / max(total_mandatory, 1)) * 100)

    # Overall Status Calculation
    if action_required_count > 0:
        overall_status = "ACTION_REQUIRED"
        overall_label = "Action Required"
        action_msg = f"{action_required_count} document{'s' if action_required_count > 1 else ''} need correction"
    elif approved_mandatory == total_mandatory:
        overall_status = "VERIFIED"
        overall_label = "Verified & Active"
        action_msg = None
    elif approved_mandatory == 0 and all(it.status == 'not_started' for s in sections for it in s.items):
        overall_status = "NOT_STARTED"
        overall_label = "Not Started"
        action_msg = "Please complete all onboarding documents"
    else:
        overall_status = "UNDER_REVIEW" if any(it.status == 'under_review' for s in sections for it in s.items) else "IN_PROGRESS"
        overall_label = "Under Review" if overall_status == "UNDER_REVIEW" else "In Progress"
        action_msg = "Verification is in progress by our compliance team"

    driver_display = f"DRV-{str(driver.id).replace('-', '')[:4].upper()}" if driver.id else "DRV-8942"
    can_online = (overall_status == "VERIFIED")

    return KYCDashboardResponse(
        driver_id=str(driver.id),
        driver_name=driver.full_name or user.phone or "Driver Partner",
        driver_id_display=driver_display,
        overall_status=overall_status,
        overall_status_label=overall_label,
        completion_percentage=completion_percentage,
        action_required_count=action_required_count,
        action_required_message=action_msg,
        can_go_online=can_online,
        sections=sections,
        upcoming_expiries=upcoming_expiries,
    )


async def save_or_update_kyc_document(
    db: AsyncSession,
    driver: Driver,
    doc_type: DocumentType,
    file_path: str,
    document_number: Optional[str] = None,
    issue_date: Optional[date] = None,
    expires_at: Optional[date] = None,
    metadata_json: Optional[dict] = None,
) -> DriverDocument:
    """
    Saves new document or updates existing one, incrementing version and resetting rejection reasons.
    """
    result = await db.execute(
        select(DriverDocument).where(
            DriverDocument.driver_id == driver.id,
            DriverDocument.doc_type == doc_type,
        )
    )
    doc = result.scalar_one_or_none()

    if doc:
        doc.version += 1
        doc.file_path = file_path
        if document_number:
            doc.document_number = document_number
        if issue_date:
            doc.issue_date = issue_date
        if expires_at:
            doc.expires_at = expires_at
        if metadata_json:
            doc.metadata_json = metadata_json
        doc.is_verified = False
        doc.rejection_reason = None
        doc.status = "under_review"
    else:
        doc = DriverDocument(
            driver_id=driver.id,
            doc_type=doc_type,
            file_path=file_path,
            document_number=document_number,
            issue_date=issue_date,
            expires_at=expires_at,
            version=1,
            status="under_review",
            is_verified=False,
            metadata_json=metadata_json or {},
        )
        db.add(doc)

    await db.flush()
    await db.refresh(doc)
    return doc


async def save_driver_bank_account(
    db: AsyncSession,
    driver: Driver,
    data: BankAccountSubmitRequest,
) -> DriverBankAccount:
    """
    Saves or updates driver bank account with masked representation and hash.
    """
    clean_acc = data.account_number.strip()
    masked_acc = f"•••• •••• {clean_acc[-4:]}"
    acc_hash = hashlib.sha256(clean_acc.encode("utf-8")).hexdigest()

    result = await db.execute(
        select(DriverBankAccount).where(DriverBankAccount.driver_id == driver.id)
    )
    bank = result.scalar_one_or_none()

    if bank:
        bank.account_holder_name = data.account_holder_name.strip()
        bank.bank_name = data.bank_name.strip()
        bank.account_number_masked = masked_acc
        bank.account_number_hash = acc_hash
        bank.ifsc_code = data.ifsc_code.strip().upper()
        bank.account_type = data.account_type
        bank.is_verified = True  # Simulated penny drop verification in dev mode
        bank.verified_at = datetime.now(timezone.utc)
        bank.rejection_reason = None
    else:
        bank = DriverBankAccount(
            driver_id=driver.id,
            account_holder_name=data.account_holder_name.strip(),
            bank_name=data.bank_name.strip(),
            account_number_masked=masked_acc,
            account_number_hash=acc_hash,
            ifsc_code=data.ifsc_code.strip().upper(),
            account_type=data.account_type,
            is_verified=True,
            verified_at=datetime.now(timezone.utc),
        )
        db.add(bank)

    await db.flush()
    await db.refresh(bank)
    return bank
