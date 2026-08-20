"""
Driver service  onboarding, KYC, vehicle, documents business logic.
"""
import uuid
from typing import Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.profile import DriverProfileCreate, DriverProfileUpdate, VehicleCreate
from common.models.all_models import (
    DriverDocument,
    Driver,
    User,
    Vehicle,
    KYCStatus,
    DriverStatus,
    DocumentType,
)
from common.utils.security import generate_referral_code

logger = structlog.get_logger(__name__)

REQUIRED_DOCUMENTS = [
    DocumentType.LICENSE,
    DocumentType.AADHAAR,
    DocumentType.RC_BOOK,
    DocumentType.INSURANCE,
    DocumentType.PAN,
]


async def get_or_create_driver_profile(
    db: AsyncSession,
    user: User,
    data: DriverProfileCreate,
) -> Driver:
    """Create or get driver profile."""
    result = await db.execute(
        select(Driver).where(Driver.user_id == user.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    referral_code = await _generate_unique_driver_referral(db)

    profile = Driver(
        user_id=user.id,
        full_name=data.full_name,
        phone=user.phone,
        gender=data.gender,
        experience_years=data.experience_years or 0,
        home_city=data.home_city,
        referral_code=referral_code,
        kyc_status=KYCStatus.PENDING,
        status=DriverStatus.OFFLINE,
        rating=5.0,
        total_trips=0,
        total_earnings=0,
        wallet_balance=0,
    )
    if data.email:
        user.email = data.email
    db.add(profile)
    user.is_profile_complete = True
    await db.flush()
    await db.refresh(profile)

    logger.info("Driver profile created", user_id=str(user.id))
    return profile


async def update_driver_profile(
    db: AsyncSession,
    profile: Driver,
    data: DriverProfileUpdate,
) -> Driver:
    update_data = data.model_dump(exclude_unset=True)
    if "email" in update_data:
        email_val = update_data.pop("email")
        if profile.user:
            profile.user.email = email_val
    for field, value in update_data.items():
        setattr(profile, field, value)
    await db.flush()
    await db.refresh(profile)
    return profile


async def add_driver_vehicle(
    db: AsyncSession,
    driver: Driver,
    data: VehicleCreate,
) -> Vehicle:
    """Add vehicle to driver's account."""
    vehicle = Vehicle(
        driver_id=driver.id,
        vehicle_type=data.vehicle_type,
        make=data.make,
        model=data.model,
        year=data.year,
        color=data.color,
        registration_number=data.registration_number.upper().strip(),
        seat_capacity=data.seat_capacity,
        parcel_capable=data.parcel_capable,
        parcel_capacity_kg=data.parcel_capacity_kg,
        has_ac=data.has_ac,
    )
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)
    return vehicle


async def add_driver_document(
    db: AsyncSession,
    driver: Driver,
    doc_type: DocumentType,
    file_path: str,
) -> DriverDocument:
    """Upload a KYC document for the driver."""
    # Check if document already exists  update it
    result = await db.execute(
        select(DriverDocument).where(
            DriverDocument.driver_id == driver.id,
            DriverDocument.doc_type == doc_type,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.file_path = file_path
        existing.is_verified = False
        existing.rejection_reason = None
        await db.flush()
        return existing

    doc = DriverDocument(
        driver_id=driver.id,
        doc_type=doc_type,
        file_path=file_path,
        is_verified=False,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)

    # Re-check KYC completeness
    await _update_kyc_status(db, driver)

    return doc


async def _update_kyc_status(db: AsyncSession, driver: Driver) -> None:
    """
    Auto-advance KYC to UNDER_REVIEW once all required docs are uploaded.
    Admin will then verify each doc.
    """
    result = await db.execute(
        select(DriverDocument).where(DriverDocument.driver_id == driver.id)
    )
    docs = result.scalars().all()
    uploaded_types = {d.doc_type for d in docs}

    all_uploaded = all(req in uploaded_types for req in REQUIRED_DOCUMENTS)

    if all_uploaded and driver.kyc_status == KYCStatus.PENDING:
        driver.kyc_status = KYCStatus.UNDER_REVIEW
        logger.info("Driver KYC moved to UNDER_REVIEW", driver_id=str(driver.id))


async def _generate_unique_driver_referral(db: AsyncSession) -> str:
    for _ in range(10):
        code = "DRV" + generate_referral_code(6)
        result = await db.execute(
            select(Driver).where(Driver.referral_code == code)
        )
        if not result.scalar_one_or_none():
            return code
    return "DRV" + generate_referral_code(9)
