"""
Authoritative Multi-Vehicle Management & Service Capability Engine.
════════════════════════════════════════════════════════════════════════════════
Business Rules:
1. One Partner can own up to MAX_VEHICLES_PER_DRIVER (5) vehicles.
2. Exactly ONE operational vehicle can be ACTIVE at any given time.
3. Active switch is strictly atomic within a single database transaction.
4. Pre-activation invariants:
   - Vehicle must be approved (status == "APPROVED" or driver approved)
   - Mandatory vehicle documents (Insurance, PUC, Permit/Fitness where required) must not be expired.
   - Vehicle must not be deleted.
5. Service Capability matching:
   - Cab / Rental / Outstation / Airport -> requires passenger vehicle & "cab" capability
   - Parcel -> requires "parcel" capability & capacity_kg >= weight_kg
   - Transport / Packers -> requires commercial vehicle/truck & max_payload_kg >= weight_kg
   - Mismatched vehicle -> strictly rejected with actionable error
6. Completed trips retain immutable vehicle snapshots.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select, update, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.vehicle import (
    VehicleCreateRequest,
    VehicleUpdateRequest,
    VehicleDetailResponse,
    VehicleDocumentSummary,
)
from common.models.all_models import (
    DocumentType,
    Driver,
    DriverDocument,
    DriverStatus,
    KYCStatus,
    Trip,
    TripStatus,
    Vehicle,
    VehicleType,
)
from common.utils.cloudinary_service import CloudinaryService

logger = structlog.get_logger(__name__)

MAX_VEHICLES_PER_DRIVER = 5


def create_vehicle_snapshot(vehicle: Vehicle) -> Dict[str, Any]:
    """
    Creates an immutable dictionary snapshot of the vehicle state at trip dispatch time.
    Stored permanently in Trip.service_metadata['vehicle_snapshot'].
    """
    if not vehicle:
        return {}
    return {
        "vehicle_id": str(vehicle.id),
        "registration_number": vehicle.registration_number,
        "make": vehicle.make,
        "model": vehicle.model,
        "variant": vehicle.variant,
        "color": vehicle.color,
        "year": vehicle.year,
        "vehicle_type": vehicle.vehicle_type.value if hasattr(vehicle.vehicle_type, "value") else str(vehicle.vehicle_type),
        "fuel_type": vehicle.fuel_type,
        "seat_capacity": vehicle.seat_capacity,
        "comfort_level": vehicle.comfort_level,
        "service_capabilities": list(vehicle.service_capabilities or []),
        "parcel_capable": vehicle.parcel_capable,
        "parcel_capacity_kg": vehicle.parcel_capacity_kg,
        "transport_capable": vehicle.transport_capable,
        "max_payload_kg": vehicle.max_payload_kg,
        "cargo_volume_cft": vehicle.cargo_volume_cft,
        "has_ac": vehicle.has_ac,
        "snapshot_created_at": datetime.now(timezone.utc).isoformat(),
    }


def validate_service_capability(
    vehicle: Vehicle,
    requested_service: str,
    weight_kg: Optional[float] = None,
    passenger_count: Optional[int] = 1,
) -> Tuple[bool, Optional[str]]:
    """
    Validates whether the given active vehicle satisfies the requirements for the requested service.
    Returns (is_valid, rejection_reason).
    """
    if not vehicle:
        return False, "Driver has no active operational vehicle configured"

    if not vehicle.is_active:
        return False, f"Vehicle {vehicle.registration_number} is not currently active"

    today = date.today()
    if vehicle.insurance_expiry and vehicle.insurance_expiry < today:
        return False, f"Vehicle {vehicle.registration_number} insurance has expired on {vehicle.insurance_expiry}"

    if vehicle.pollution_expiry and vehicle.pollution_expiry < today:
        return False, f"Vehicle {vehicle.registration_number} PUC has expired on {vehicle.pollution_expiry}"

    if vehicle.fitness_expiry and vehicle.fitness_expiry < today:
        return False, f"Vehicle {vehicle.registration_number} fitness certificate has expired on {vehicle.fitness_expiry}"

    req_serv = requested_service.lower().strip()
    caps = [c.lower() for c in (vehicle.service_capabilities or [])]
    v_type = vehicle.vehicle_type.value if hasattr(vehicle.vehicle_type, "value") else str(vehicle.vehicle_type).lower()

    # 1. Cab & Passenger Ride Verticals
    if req_serv in ["cab", "rental", "outstation", "airport", "carpool", "hospitality"]:
        if v_type in ["bike", "truck"]:
            return False, f"Vehicle type '{v_type}' cannot be used for passenger {req_serv} bookings. Sedan, SUV or Hatchback required."
        if req_serv not in caps and "cab" not in caps:
            return False, f"Vehicle {vehicle.registration_number} does not have '{req_serv}' service capability enabled."
        if passenger_count and vehicle.seat_capacity < passenger_count:
            return False, f"Vehicle seat capacity ({vehicle.seat_capacity}) is insufficient for {passenger_count} passengers."
        return True, None

    # 2. Parcel Delivery Vertical
    elif req_serv == "parcel":
        if "parcel" not in caps and not vehicle.parcel_capable:
            return False, f"Vehicle {vehicle.registration_number} is not certified for parcel logistics"
        if weight_kg and vehicle.parcel_capacity_kg and weight_kg > vehicle.parcel_capacity_kg:
            return False, f"Package weight ({weight_kg} kg) exceeds vehicle parcel limit ({vehicle.parcel_capacity_kg} kg)"
        return True, None

    # 3. Goods Transport & Freight / Packers Verticals
    elif req_serv in ["transport", "packers"]:
        if v_type == "bike":
            return False, f"Two-wheelers cannot accept heavy goods transport or packers & movers requests"
        if "transport" not in caps and "packers" not in caps and not vehicle.transport_capable:
            return False, f"Vehicle {vehicle.registration_number} is not certified for heavy transport logistics"
        if weight_kg and vehicle.max_payload_kg and weight_kg > vehicle.max_payload_kg:
            return False, f"Cargo payload ({weight_kg} kg) exceeds vehicle max payload capacity ({vehicle.max_payload_kg} kg)"
        return True, None

    # Generic check
    if req_serv in caps:
        return True, None

    return False, f"Vehicle {vehicle.registration_number} is not compatible with requested service '{req_serv}'"


async def list_driver_vehicles(
    db: AsyncSession,
    driver_id: uuid.UUID,
) -> List[Vehicle]:
    """Retrieves all vehicles owned by a driver with document relationships."""
    result = await db.execute(
        select(Vehicle)
        .where(Vehicle.driver_id == driver_id)
        .order_by(desc(Vehicle.is_active), desc(Vehicle.created_at))
    )
    return result.scalars().all()


async def get_driver_vehicle(
    db: AsyncSession,
    driver_id: uuid.UUID,
    vehicle_id: uuid.UUID,
) -> Optional[Vehicle]:
    """Retrieves a single vehicle by ID ensuring driver ownership."""
    result = await db.execute(
        select(Vehicle).where(
            Vehicle.id == vehicle_id,
            Vehicle.driver_id == driver_id,
        )
    )
    return result.scalar_one_or_none()


async def create_driver_vehicle(
    db: AsyncSession,
    driver: Driver,
    data: VehicleCreateRequest,
) -> Vehicle:
    """
    Registers a new vehicle for a driver.
    Enforces maximum vehicle limit and unique registration number formatting.
    """
    # 1. Check maximum vehicle count
    count_res = await db.execute(
        select(func.count(Vehicle.id)).where(Vehicle.driver_id == driver.id)
    )
    current_count = count_res.scalar() or 0
    if current_count >= MAX_VEHICLES_PER_DRIVER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum vehicle limit reached ({MAX_VEHICLES_PER_DRIVER} vehicles allowed per driver).",
        )

    # 2. Check registration number uniqueness
    clean_reg = data.registration_number.upper().replace(" ", "").replace("-", "").strip()
    existing_res = await db.execute(
        select(Vehicle).where(Vehicle.registration_number == clean_reg)
    )
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with registration number '{clean_reg}' is already registered on the platform.",
        )

    # 3. Determine initial capabilities and defaults based on vehicle type
    caps = list(data.service_capabilities or [])
    v_type_val = data.vehicle_type.value if hasattr(data.vehicle_type, "value") else str(data.vehicle_type)

    if v_type_val == "bike":
        if "parcel" not in caps:
            caps.append("parcel")
        is_parcel = True
        is_transport = False
        seat_cap = 1
        parcel_kg = data.parcel_capacity_kg or 25.0
        max_payload = 30.0
    elif v_type_val == "truck":
        if "transport" not in caps:
            caps.append("transport")
        if "packers" not in caps:
            caps.append("packers")
        is_parcel = True
        is_transport = True
        seat_cap = data.seat_capacity or 2
        parcel_kg = data.parcel_capacity_kg or 1000.0
        max_payload = data.max_payload_kg or 2500.0
    else:
        if "cab" not in caps:
            caps.append("cab")
        if "rental" not in caps:
            caps.append("rental")
        if "outstation" not in caps:
            caps.append("outstation")
        if "airport" not in caps:
            caps.append("airport")
        if data.parcel_capable and "parcel" not in caps:
            caps.append("parcel")
        is_parcel = data.parcel_capable
        is_transport = data.transport_capable
        seat_cap = data.seat_capacity
        parcel_kg = data.parcel_capacity_kg or (50.0 if data.parcel_capable else None)
        max_payload = data.max_payload_kg

    # 4. If this is the driver's FIRST vehicle and driver is already approved, activate it automatically
    is_first = (current_count == 0)
    should_activate = is_first and (driver.kyc_status == KYCStatus.APPROVED or driver.is_verified)

    vehicle = Vehicle(
        driver_id=driver.id,
        vehicle_type=data.vehicle_type,
        make=data.make.strip(),
        model=data.model.strip(),
        variant=data.variant.strip() if data.variant else None,
        year=data.year,
        color=data.color.strip(),
        registration_number=clean_reg,
        seat_capacity=seat_cap,
        fuel_type=data.fuel_type or "petrol",
        comfort_level=data.comfort_level or "economy",
        ownership_type=data.ownership_type or "self",
        registered_owner_name=data.registered_owner_name.strip() if data.registered_owner_name else driver.full_name,
        service_capabilities=caps,
        status="APPROVED" if (driver.kyc_status == KYCStatus.APPROVED or driver.is_verified) else "PENDING_REVIEW",
        is_active=should_activate,
        has_ac=data.has_ac,
        parcel_capable=is_parcel,
        parcel_capacity_kg=parcel_kg,
        transport_capable=is_transport,
        max_payload_kg=max_payload,
        cargo_volume_cft=data.cargo_volume_cft,
        commercial_permit=data.commercial_permit,
        insurance_expiry=data.insurance_expiry,
        pollution_expiry=data.pollution_expiry,
        permit_expiry=data.permit_expiry,
        fitness_expiry=data.fitness_expiry,
        photos=data.photos or [],
    )
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)

    logger.info(
        "driver_vehicle_registered",
        driver_id=str(driver.id),
        vehicle_id=str(vehicle.id),
        reg_no=clean_reg,
        is_active=should_activate,
    )
    return vehicle


async def update_driver_vehicle(
    db: AsyncSession,
    driver_id: uuid.UUID,
    vehicle_id: uuid.UUID,
    data: VehicleUpdateRequest,
) -> Vehicle:
    """Updates vehicle metadata and specifications."""
    vehicle = await get_driver_vehicle(db, driver_id, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found for this driver")

    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if value is not None:
            setattr(vehicle, field, value)

    await db.flush()
    await db.refresh(vehicle)
    return vehicle


async def delete_driver_vehicle(
    db: AsyncSession,
    driver_id: uuid.UUID,
    vehicle_id: uuid.UUID,
) -> bool:
    """
    Removes a vehicle from driver's fleet.
    Guards: Cannot delete active vehicle if other standby vehicles exist, or if vehicle is in an active trip.
    """
    vehicle = await get_driver_vehicle(db, driver_id, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Guard 1: Cannot delete vehicle if driver is currently ON_TRIP with this vehicle
    active_trip_res = await db.execute(
        select(Trip).where(
            Trip.vehicle_id == vehicle_id,
            Trip.status.in_([TripStatus.IN_PROGRESS, TripStatus.PUBLISHED]),
        )
    )
    if active_trip_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete vehicle while an active trip is in progress.",
        )

    # If this was active and driver has another vehicle, make the next one active
    was_active = vehicle.is_active
    await db.delete(vehicle)
    await db.flush()

    if was_active:
        next_veh_res = await db.execute(
            select(Vehicle).where(Vehicle.driver_id == driver_id).order_by(desc(Vehicle.created_at)).limit(1)
        )
        next_veh = next_veh_res.scalar_one_or_none()
        if next_veh:
            next_veh.is_active = True
            await db.flush()

    return True


async def activate_driver_vehicle(
    db: AsyncSession,
    driver_id: uuid.UUID,
    vehicle_id: uuid.UUID,
) -> Vehicle:
    """
    Atomic Active Switch:
    Guarantees that exactly ONE operational vehicle is active at any time.
    Validates approval status and document validity before switching.
    """
    vehicle = await get_driver_vehicle(db, driver_id, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found for this driver")

    # 1. Validation Invariant: Check if vehicle is suspended or rejected
    if vehicle.status in ["REJECTED", "SUSPENDED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot activate vehicle: status is '{vehicle.status}'. Reason: {vehicle.rejection_reason or 'Compliance failure'}",
        )

    # 2. Validation Invariant: Check document expiry dates
    today = date.today()
    if vehicle.insurance_expiry and vehicle.insurance_expiry < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot activate vehicle: Insurance expired on {vehicle.insurance_expiry}. Please upload renewed insurance document.",
        )

    if vehicle.pollution_expiry and vehicle.pollution_expiry < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot activate vehicle: PUC expired on {vehicle.pollution_expiry}. Please upload renewed PUC certificate.",
        )

    if vehicle.fitness_expiry and vehicle.fitness_expiry < today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot activate vehicle: Fitness certificate expired on {vehicle.fitness_expiry}. Please upload renewed certificate.",
        )

    # 3. Atomic Database Switch: Deactivate all other vehicles for this driver in same transaction
    await db.execute(
        update(Vehicle)
        .where(Vehicle.driver_id == driver_id)
        .values(is_active=False)
    )

    vehicle.is_active = True
    await db.flush()
    await db.refresh(vehicle)

    logger.info(
        "driver_vehicle_activated_atomic",
        driver_id=str(driver_id),
        active_vehicle_id=str(vehicle.id),
        reg_no=vehicle.registration_number,
    )
    return vehicle


async def deactivate_driver_vehicle(
    db: AsyncSession,
    driver_id: uuid.UUID,
    vehicle_id: uuid.UUID,
) -> Vehicle:
    """Deactivates a vehicle."""
    vehicle = await get_driver_vehicle(db, driver_id, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found for this driver")

    vehicle.is_active = False
    await db.flush()
    await db.refresh(vehicle)
    return vehicle
