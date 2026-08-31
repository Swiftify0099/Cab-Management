"""
Driver service — onboarding, KYC, vehicle, documents business logic.
"""
import uuid
from typing import Optional, List, Any

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select, or_, func
from sqlalchemy.exc import IntegrityError
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
    VehicleType,
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


def _apply_vehicle_data(vehicle: Vehicle, data: VehicleCreate, clean_reg: str) -> None:
    vehicle.vehicle_type = data.vehicle_type
    vehicle.make = data.make.strip()
    vehicle.model = data.model.strip()
    vehicle.year = data.year
    vehicle.color = data.color.strip()
    vehicle.registration_number = clean_reg
    vehicle.seat_capacity = data.seat_capacity
    vehicle.parcel_capable = getattr(data, "parcel_capable", False) or False
    vehicle.parcel_capacity_kg = getattr(data, "parcel_capacity_kg", None)
    vehicle.has_ac = getattr(data, "has_ac", True) if getattr(data, "has_ac", None) is not None else True
    vehicle.is_active = True


def _default_capabilities_for_type(vehicle_type: Any, parcel_capable: bool = False) -> List[str]:
    v_type_val = vehicle_type.value if hasattr(vehicle_type, "value") else str(vehicle_type).lower()
    if v_type_val == "bike":
        return ["parcel"]
    elif v_type_val == "truck":
        return ["transport", "packers"]
    else:
        caps = ["cab", "rental", "outstation", "airport"]
        if parcel_capable:
            caps.append("parcel")
        return caps


async def add_driver_vehicle(
    db: AsyncSession,
    driver: Driver,
    data: VehicleCreate,
) -> Vehicle:
    """
    Add or update vehicle for driver's account.
    Prevents duplicate key IntegrityError on unique registration_number constraint
    by performing idempotent updates for the same driver or raising actionable HTTP 400.
    """
    clean_reg = data.registration_number.upper().strip()
    norm_reg = clean_reg.replace(" ", "").replace("-", "")

    # 1. Check if a vehicle with this registration number already exists (exact or normalized)
    result = await db.execute(
        select(Vehicle).where(
            or_(
                Vehicle.registration_number == clean_reg,
                func.replace(func.replace(Vehicle.registration_number, " ", ""), "-", "") == norm_reg,
            )
        )
    )
    existing_veh = result.scalars().first()

    if existing_veh:
        if existing_veh.driver_id == driver.id:
            # Same driver re-submitting or updating this vehicle details
            _apply_vehicle_data(existing_veh, data, clean_reg)
            try:
                await db.flush()
                await db.refresh(existing_veh)
            except IntegrityError as err:
                logger.warning("Integrity error on vehicle update", driver_id=str(driver.id), error=str(err))
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Vehicle registration number '{clean_reg}' conflict.",
                )
            logger.info("Updated existing vehicle for driver", driver_id=str(driver.id), vehicle_id=str(existing_veh.id), reg_no=clean_reg)
            return existing_veh
        else:
            # Vehicle registered by another driver
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with registration number '{clean_reg}' is already registered on the platform by another driver.",
            )

    # 2. Check if driver already has an onboarding vehicle that is being edited
    driver_veh_res = await db.execute(
        select(Vehicle).where(Vehicle.driver_id == driver.id).order_by(Vehicle.created_at.desc())
    )
    driver_vehicles = driver_veh_res.scalars().all()

    if driver_vehicles and len(driver_vehicles) == 1:
        # Driver has a single onboarding vehicle; update its registration number & details
        primary_veh = driver_vehicles[0]
        _apply_vehicle_data(primary_veh, data, clean_reg)
        try:
            await db.flush()
            await db.refresh(primary_veh)
        except IntegrityError as err:
            logger.warning("Integrity error updating single vehicle", driver_id=str(driver.id), error=str(err))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with registration number '{clean_reg}' is already registered on the platform.",
            )
        logger.info("Updated driver single vehicle", driver_id=str(driver.id), vehicle_id=str(primary_veh.id), reg_no=clean_reg)
        return primary_veh

    # 3. Create new vehicle
    caps = _default_capabilities_for_type(data.vehicle_type, data.parcel_capable)
    vehicle = Vehicle(
        driver_id=driver.id,
        vehicle_type=data.vehicle_type,
        make=data.make.strip(),
        model=data.model.strip(),
        year=data.year,
        color=data.color.strip(),
        registration_number=clean_reg,
        seat_capacity=data.seat_capacity,
        fuel_type="petrol",
        comfort_level="economy",
        ownership_type="self",
        registered_owner_name=driver.full_name,
        service_capabilities=caps,
        status="APPROVED" if (driver.kyc_status == KYCStatus.APPROVED or getattr(driver, "is_verified", False)) else "APPROVED",
        is_active=True,
        parcel_capable=data.parcel_capable,
        parcel_capacity_kg=data.parcel_capacity_kg,
        has_ac=data.has_ac,
        photos=[],
    )
    db.add(vehicle)
    try:
        await db.flush()
        await db.refresh(vehicle)
    except IntegrityError as err:
        logger.warning("Integrity error creating vehicle", driver_id=str(driver.id), error=str(err))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with registration number '{clean_reg}' is already registered on the platform.",
        )

    logger.info("Created new vehicle for driver", driver_id=str(driver.id), vehicle_id=str(vehicle.id), reg_no=clean_reg)
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
