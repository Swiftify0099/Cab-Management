"""
Central Service Catalog & Cross-Service Eligibility Engine
════════════════════════════════════════════════════════════════════════════════
Platform Services:
1.  CAB_LOCAL      - City Point-to-Point passenger taxi
2.  INTERCITY      - Intercity long-distance passenger travel
3.  AIRPORT        - Airport pickup & dropoff transfers
4.  RENTAL         - Hourly & full-day vehicle rental packages
5.  OUTSTATION     - One-way and round-trip outstation rides
6.  CARPOOL        - Shared commuter & daily seat sharing
7.  PARCEL         - On-demand package & courier delivery
8.  TRANSPORT      - Commercial goods & heavy freight carriage
9.  PACKERS_MOVERS - Residential & office relocation logistics
10. CORPORATE      - B2B employee & executive commute
11. HOTEL          - Hotel room reservations & hospitality (ISOLATED from driver dispatch)

Eligibility Formula:
Partner + Service + Vehicle + Documents + Availability + Coverage -> Eligibility
"""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from typing import Dict, List, Optional, Any, Tuple, Set
from pydantic import BaseModel, Field

from common.models.all_models import (
    DocumentType,
    Driver,
    DriverDocument,
    DriverPreference,
    DriverStatus,
    KYCStatus,
    Vehicle,
    VehicleType,
)


class ServiceCatalogType(str, enum.Enum):
    CAB_LOCAL = "cab_local"
    INTERCITY = "intercity"
    AIRPORT = "airport"
    RENTAL = "rental"
    OUTSTATION = "outstation"
    CARPOOL = "carpool"
    PARCEL = "parcel"
    TRANSPORT = "transport"
    PACKERS_MOVERS = "packers_movers"
    CORPORATE = "corporate"
    HOTEL = "hotel"


class ServiceCategory(str, enum.Enum):
    PASSENGER = "passenger"
    LOGISTICS = "logistics"
    FREIGHT = "freight"
    HOSPITALITY = "hospitality"


class ServiceMetadata(BaseModel):
    service_code: ServiceCatalogType
    display_name: str
    category: ServiceCategory
    dispatchable_to_drivers: bool
    description: str
    allowed_vehicle_types: List[str]
    required_capabilities: List[str]
    min_seat_capacity: int = 1
    min_payload_kg: float = 0.0
    mandatory_document_types: List[DocumentType] = []


# ──────────────────────────────────────────────────────────────────────────────
# CENTRAL SERVICE CATALOG REGISTRY
# ──────────────────────────────────────────────────────────────────────────────
SERVICE_CATALOG_REGISTRY: Dict[ServiceCatalogType, ServiceMetadata] = {
    ServiceCatalogType.CAB_LOCAL: ServiceMetadata(
        service_code=ServiceCatalogType.CAB_LOCAL,
        display_name="City Cab",
        category=ServiceCategory.PASSENGER,
        dispatchable_to_drivers=True,
        description="Local on-demand point-to-point passenger taxi rides.",
        allowed_vehicle_types=["sedan", "suv", "hatchback"],
        required_capabilities=["cab", "local"],
        min_seat_capacity=4,
        mandatory_document_types=[DocumentType.LICENSE, DocumentType.RC_BOOK, DocumentType.INSURANCE, DocumentType.PUC],
    ),
    ServiceCatalogType.INTERCITY: ServiceMetadata(
        service_code=ServiceCatalogType.INTERCITY,
        display_name="Intercity Ride",
        category=ServiceCategory.PASSENGER,
        dispatchable_to_drivers=True,
        description="Scheduled intercity long-distance city-to-city rides.",
        allowed_vehicle_types=["sedan", "suv", "tempo_traveller"],
        required_capabilities=["cab", "intercity", "outstation"],
        min_seat_capacity=4,
        mandatory_document_types=[DocumentType.LICENSE, DocumentType.RC_BOOK, DocumentType.INSURANCE, DocumentType.PERMIT, DocumentType.PUC],
    ),
    ServiceCatalogType.AIRPORT: ServiceMetadata(
        service_code=ServiceCatalogType.AIRPORT,
        display_name="Airport Transfer",
        category=ServiceCategory.PASSENGER,
        dispatchable_to_drivers=True,
        description="Dedicated airport pickup & drop transfers with flight tracking.",
        allowed_vehicle_types=["sedan", "suv", "hatchback"],
        required_capabilities=["cab", "airport"],
        min_seat_capacity=4,
        mandatory_document_types=[DocumentType.LICENSE, DocumentType.RC_BOOK, DocumentType.INSURANCE, DocumentType.PUC],
    ),
    ServiceCatalogType.RENTAL: ServiceMetadata(
        service_code=ServiceCatalogType.RENTAL,
        display_name="Hourly Rental",
        category=ServiceCategory.PASSENGER,
        dispatchable_to_drivers=True,
        description="Flexible multi-stop hourly cab rental packages.",
        allowed_vehicle_types=["sedan", "suv", "hatchback"],
        required_capabilities=["cab", "rental"],
        min_seat_capacity=4,
        mandatory_document_types=[DocumentType.LICENSE, DocumentType.RC_BOOK, DocumentType.INSURANCE, DocumentType.PUC],
    ),
    ServiceCatalogType.OUTSTATION: ServiceMetadata(
        service_code=ServiceCatalogType.OUTSTATION,
        display_name="Outstation Trip",
        category=ServiceCategory.PASSENGER,
        dispatchable_to_drivers=True,
        description="One-way and round-trip multi-day outstation excursions.",
        allowed_vehicle_types=["sedan", "suv", "tempo_traveller"],
        required_capabilities=["cab", "outstation"],
        min_seat_capacity=4,
        mandatory_document_types=[DocumentType.LICENSE, DocumentType.RC_BOOK, DocumentType.INSURANCE, DocumentType.PERMIT, DocumentType.PUC],
    ),
    ServiceCatalogType.CARPOOL: ServiceMetadata(
        service_code=ServiceCatalogType.CARPOOL,
        display_name="Carpool / Share",
        category=ServiceCategory.PASSENGER,
        dispatchable_to_drivers=True,
        description="Shared commuter rides along popular daily corridors.",
        allowed_vehicle_types=["sedan", "suv", "hatchback"],
        required_capabilities=["cab", "carpool"],
        min_seat_capacity=3,
        mandatory_document_types=[DocumentType.LICENSE, DocumentType.RC_BOOK, DocumentType.INSURANCE, DocumentType.PUC],
    ),
    ServiceCatalogType.PARCEL: ServiceMetadata(
        service_code=ServiceCatalogType.PARCEL,
        display_name="Parcel & Courier",
        category=ServiceCategory.LOGISTICS,
        dispatchable_to_drivers=True,
        description="Hyperlocal document and package delivery logistics.",
        allowed_vehicle_types=["bike", "hatchback", "sedan", "suv", "truck"],
        required_capabilities=["parcel"],
        min_seat_capacity=1,
        min_payload_kg=5.0,
        mandatory_document_types=[DocumentType.LICENSE, DocumentType.RC_BOOK, DocumentType.INSURANCE, DocumentType.PUC],
    ),
    ServiceCatalogType.TRANSPORT: ServiceMetadata(
        service_code=ServiceCatalogType.TRANSPORT,
        display_name="Goods Transport",
        category=ServiceCategory.FREIGHT,
        dispatchable_to_drivers=True,
        description="Commercial cargo, mini-truck freight and heavy logistics.",
        allowed_vehicle_types=["truck", "tempo_traveller"],
        required_capabilities=["transport"],
        min_seat_capacity=1,
        min_payload_kg=500.0,
        mandatory_document_types=[DocumentType.LICENSE, DocumentType.RC_BOOK, DocumentType.INSURANCE, DocumentType.FITNESS, DocumentType.PERMIT, DocumentType.PUC],
    ),
    ServiceCatalogType.PACKERS_MOVERS: ServiceMetadata(
        service_code=ServiceCatalogType.PACKERS_MOVERS,
        display_name="Packers & Movers",
        category=ServiceCategory.FREIGHT,
        dispatchable_to_drivers=True,
        description="End-to-end home and office relocation shifting services.",
        allowed_vehicle_types=["truck"],
        required_capabilities=["packers", "transport"],
        min_seat_capacity=2,
        min_payload_kg=1000.0,
        mandatory_document_types=[DocumentType.LICENSE, DocumentType.RC_BOOK, DocumentType.INSURANCE, DocumentType.FITNESS, DocumentType.PERMIT, DocumentType.PUC],
    ),
    ServiceCatalogType.CORPORATE: ServiceMetadata(
        service_code=ServiceCatalogType.CORPORATE,
        display_name="Corporate Commute",
        category=ServiceCategory.PASSENGER,
        dispatchable_to_drivers=True,
        description="Dedicated corporate employee transport & enterprise invoicing.",
        allowed_vehicle_types=["sedan", "suv", "tempo_traveller"],
        required_capabilities=["cab", "corporate"],
        min_seat_capacity=4,
        mandatory_document_types=[DocumentType.LICENSE, DocumentType.RC_BOOK, DocumentType.INSURANCE, DocumentType.PUC],
    ),
    ServiceCatalogType.HOTEL: ServiceMetadata(
        service_code=ServiceCatalogType.HOTEL,
        display_name="Hotel Accommodations",
        category=ServiceCategory.HOSPITALITY,
        dispatchable_to_drivers=False,  # CRITICAL: STRICTLY ISOLATED FROM DRIVER DISPATCH
        description="Hotel room reservations, stay packages, and lodging inventory.",
        allowed_vehicle_types=[],
        required_capabilities=[],
        min_seat_capacity=0,
        mandatory_document_types=[],
    ),
}


class ServiceEligibilityResult(BaseModel):
    service_code: ServiceCatalogType
    display_name: str
    is_eligible: bool
    rejection_reasons: List[str] = []
    matched_vehicle_id: Optional[uuid.UUID] = None
    vehicle_registration: Optional[str] = None
    vehicle_type: Optional[str] = None
    category: ServiceCategory


class DriverFullEligibilityReport(BaseModel):
    driver_id: uuid.UUID
    driver_name: str
    kyc_status: str
    is_online: bool
    active_vehicle_id: Optional[uuid.UUID] = None
    active_vehicle_registration: Optional[str] = None
    active_vehicle_type: Optional[str] = None
    eligible_services: List[ServiceCatalogType] = []
    ineligible_services: List[ServiceCatalogType] = []
    service_breakdown: List[ServiceEligibilityResult] = []


# ──────────────────────────────────────────────────────────────────────────────
# AUTHORITATIVE SERVICE ELIGIBILITY ENGINE
# ──────────────────────────────────────────────────────────────────────────────
class ServiceEligibilityEngine:
    """
    Core engine evaluating:
    Partner + Service + Vehicle + Documents + Availability + Coverage -> Eligibility
    """

    @classmethod
    def parse_service_code(cls, service_str: str) -> Optional[ServiceCatalogType]:
        """Normalizes and maps arbitrary service strings to ServiceCatalogType."""
        if not service_str:
            return None
        norm = service_str.lower().strip().replace("-", "_").replace(" ", "_")
        aliases = {
            "cab": ServiceCatalogType.CAB_LOCAL,
            "cab_local": ServiceCatalogType.CAB_LOCAL,
            "local": ServiceCatalogType.CAB_LOCAL,
            "city_cab": ServiceCatalogType.CAB_LOCAL,
            "intercity": ServiceCatalogType.INTERCITY,
            "airport": ServiceCatalogType.AIRPORT,
            "rental": ServiceCatalogType.RENTAL,
            "outstation": ServiceCatalogType.OUTSTATION,
            "carpool": ServiceCatalogType.CARPOOL,
            "share": ServiceCatalogType.CARPOOL,
            "parcel": ServiceCatalogType.PARCEL,
            "courier": ServiceCatalogType.PARCEL,
            "transport": ServiceCatalogType.TRANSPORT,
            "freight": ServiceCatalogType.TRANSPORT,
            "goods": ServiceCatalogType.TRANSPORT,
            "packers": ServiceCatalogType.PACKERS_MOVERS,
            "packers_movers": ServiceCatalogType.PACKERS_MOVERS,
            "movers": ServiceCatalogType.PACKERS_MOVERS,
            "corporate": ServiceCatalogType.CORPORATE,
            "hotel": ServiceCatalogType.HOTEL,
            "hospitality": ServiceCatalogType.HOTEL,
        }
        return aliases.get(norm)

    @classmethod
    def evaluate_service_eligibility(
        cls,
        service: ServiceCatalogType,
        driver: Driver,
        active_vehicle: Optional[Vehicle],
        driver_pref: Optional[DriverPreference] = None,
        driver_docs: Optional[List[DriverDocument]] = None,
        check_availability: bool = True,
        requested_passengers: Optional[int] = None,
        requested_weight_kg: Optional[float] = None,
    ) -> ServiceEligibilityResult:
        """
        Evaluates complete eligibility for a specific service against driver and active vehicle state.
        """
        meta = SERVICE_CATALOG_REGISTRY.get(service)
        if not meta:
            return ServiceEligibilityResult(
                service_code=service,
                display_name=str(service.value),
                is_eligible=False,
                rejection_reasons=[f"Unknown service '{service}'"],
                category=ServiceCategory.PASSENGER,
            )

        rejection_reasons: List[str] = []

        # ── 1. HOTEL ISOLATION INVARIANT ──
        if not meta.dispatchable_to_drivers or service == ServiceCatalogType.HOTEL:
            return ServiceEligibilityResult(
                service_code=service,
                display_name=meta.display_name,
                is_eligible=False,
                rejection_reasons=["Hotel accommodations are managed as property inventory and strictly isolated from driver dispatch."],
                category=meta.category,
            )

        # ── 2. PARTNER QUALIFICATION ──
        if not driver:
            return ServiceEligibilityResult(
                service_code=service,
                display_name=meta.display_name,
                is_eligible=False,
                rejection_reasons=["Driver record is missing."],
                category=meta.category,
            )

        is_driver_approved = (driver.kyc_status == KYCStatus.APPROVED or driver.is_verified)
        if not is_driver_approved:
            rejection_reasons.append(f"Partner KYC is not approved (status: {driver.kyc_status.value if hasattr(driver.kyc_status, 'value') else driver.kyc_status}).")

        if not driver.is_active:
            rejection_reasons.append("Partner account is deactivated.")

        fatigue = getattr(driver, "fatigue_score", 0.0)
        if fatigue is not None and fatigue >= 0.95:
            rejection_reasons.append("Partner fatigue limit reached; mandatory rest required.")

        # ── 3. DRIVER PREFERENCE TOGGLE ──
        if driver_pref:
            pref_map = {
                ServiceCatalogType.CAB_LOCAL: driver_pref.allow_local,
                ServiceCatalogType.INTERCITY: driver_pref.allow_outstation or driver_pref.allow_local,
                ServiceCatalogType.AIRPORT: driver_pref.allow_airport,
                ServiceCatalogType.RENTAL: driver_pref.allow_rental,
                ServiceCatalogType.OUTSTATION: driver_pref.allow_outstation,
                ServiceCatalogType.CARPOOL: driver_pref.allow_carpool,
                ServiceCatalogType.PARCEL: driver_pref.allow_parcel,
                ServiceCatalogType.TRANSPORT: driver_pref.allow_transport,
                ServiceCatalogType.PACKERS_MOVERS: driver_pref.allow_packers,
                ServiceCatalogType.CORPORATE: driver_pref.allow_local,
            }
            allowed_by_pref = pref_map.get(service, True)
            if allowed_by_pref is False:
                rejection_reasons.append(f"Partner has disabled '{meta.display_name}' in driver preferences.")

        # ── 4. ACTIVE OPERATIONAL VEHICLE VALIDATION ──
        if not active_vehicle:
            rejection_reasons.append("Partner has no active operational vehicle configured. Please activate a vehicle in Fleet Management.")
        else:
            if not active_vehicle.is_active:
                rejection_reasons.append(f"Vehicle {active_vehicle.registration_number} is in standby and not active.")

            if active_vehicle.status in ["REJECTED", "SUSPENDED"]:
                rejection_reasons.append(f"Active vehicle {active_vehicle.registration_number} is not approved (status: {active_vehicle.status}).")

            v_type_str = active_vehicle.vehicle_type.value if hasattr(active_vehicle.vehicle_type, "value") else str(active_vehicle.vehicle_type).lower()
            if v_type_str not in meta.allowed_vehicle_types:
                rejection_reasons.append(
                    f"Vehicle type '{v_type_str.upper()}' is not supported for {meta.display_name}. Allowed: {', '.join(t.upper() for t in meta.allowed_vehicle_types)}."
                )

            # Capability check
            v_caps = [c.lower() for c in (active_vehicle.service_capabilities or [])]
            has_capability = any(req_cap in v_caps for req_cap in meta.required_capabilities)
            if not has_capability:
                rejection_reasons.append(
                    f"Vehicle {active_vehicle.registration_number} lacks required service capabilities ({', '.join(meta.required_capabilities)})."
                )

            # Capacity checks
            if requested_passengers and active_vehicle.seat_capacity < requested_passengers:
                rejection_reasons.append(
                    f"Vehicle seat capacity ({active_vehicle.seat_capacity}) is less than requested passengers ({requested_passengers})."
                )

            if requested_weight_kg:
                if service == ServiceCatalogType.PARCEL:
                    parcel_limit = active_vehicle.parcel_capacity_kg or 25.0
                    if requested_weight_kg > parcel_limit:
                        rejection_reasons.append(f"Parcel weight ({requested_weight_kg} kg) exceeds vehicle limit ({parcel_limit} kg).")
                elif service in [ServiceCatalogType.TRANSPORT, ServiceCatalogType.PACKERS_MOVERS]:
                    freight_limit = active_vehicle.max_payload_kg or 500.0
                    if requested_weight_kg > freight_limit:
                        rejection_reasons.append(f"Cargo payload ({requested_weight_kg} kg) exceeds vehicle payload limit ({freight_limit} kg).")

            # ── 5. DOCUMENT COMPLIANCE VALIDATION ──
            today = date.today()
            if active_vehicle.insurance_expiry and active_vehicle.insurance_expiry < today:
                rejection_reasons.append(f"Vehicle Insurance expired on {active_vehicle.insurance_expiry}.")

            if active_vehicle.pollution_expiry and active_vehicle.pollution_expiry < today:
                rejection_reasons.append(f"Vehicle PUC certificate expired on {active_vehicle.pollution_expiry}.")

            if active_vehicle.fitness_expiry and active_vehicle.fitness_expiry < today:
                rejection_reasons.append(f"Vehicle Fitness certificate expired on {active_vehicle.fitness_expiry}.")

            if active_vehicle.permit_expiry and active_vehicle.permit_expiry < today:
                rejection_reasons.append(f"Vehicle Commercial Permit expired on {active_vehicle.permit_expiry}.")

        # ── 6. AVAILABILITY & ONLINE STATUS ──
        if check_availability:
            if not (driver.is_online or driver.status == DriverStatus.ONLINE):
                rejection_reasons.append("Partner is currently OFFLINE.")

            if driver.current_trip_id is not None:
                rejection_reasons.append("Partner is currently ON_TRIP with another active booking.")

        is_eligible = (len(rejection_reasons) == 0)

        return ServiceEligibilityResult(
            service_code=service,
            display_name=meta.display_name,
            is_eligible=is_eligible,
            rejection_reasons=rejection_reasons,
            matched_vehicle_id=active_vehicle.id if (active_vehicle and is_eligible) else (active_vehicle.id if active_vehicle else None),
            vehicle_registration=active_vehicle.registration_number if active_vehicle else None,
            vehicle_type=active_vehicle.vehicle_type.value if (active_vehicle and hasattr(active_vehicle.vehicle_type, "value")) else str(active_vehicle.vehicle_type) if active_vehicle else None,
            category=meta.category,
        )

    @classmethod
    def build_full_driver_eligibility_report(
        cls,
        driver: Driver,
        active_vehicle: Optional[Vehicle],
        driver_pref: Optional[DriverPreference] = None,
        driver_docs: Optional[List[DriverDocument]] = None,
    ) -> DriverFullEligibilityReport:
        """Evaluates all 11 services in the platform catalog for a driver."""
        breakdown: List[ServiceEligibilityResult] = []
        eligible: List[ServiceCatalogType] = []
        ineligible: List[ServiceCatalogType] = []

        for st in ServiceCatalogType:
            res = cls.evaluate_service_eligibility(
                service=st,
                driver=driver,
                active_vehicle=active_vehicle,
                driver_pref=driver_pref,
                driver_docs=driver_docs,
                check_availability=False,  # Evaluates baseline eligibility regardless of temporary online toggle
            )
            breakdown.append(res)
            if res.is_eligible:
                eligible.append(st)
            else:
                ineligible.append(st)

        return DriverFullEligibilityReport(
            driver_id=driver.id,
            driver_name=driver.full_name,
            kyc_status=driver.kyc_status.value if hasattr(driver.kyc_status, "value") else str(driver.kyc_status),
            is_online=driver.is_online,
            active_vehicle_id=active_vehicle.id if active_vehicle else None,
            active_vehicle_registration=active_vehicle.registration_number if active_vehicle else None,
            active_vehicle_type=active_vehicle.vehicle_type.value if (active_vehicle and hasattr(active_vehicle.vehicle_type, "value")) else str(active_vehicle.vehicle_type) if active_vehicle else None,
            eligible_services=eligible,
            ineligible_services=ineligible,
            service_breakdown=breakdown,
        )
