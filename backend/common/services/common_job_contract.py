"""
Common Job Contract — Master Core Architecture
════════════════════════════════════════════════════════════════════════════════
Abstract Service Adapter interface defining the common contract between
Customer App ↔ Backend ↔ Driver App for ALL service domains.

Each domain (Ride, Parcel, Transport, Airport, Rental, Outstation) implements
its own ServiceAdapter that maps domain-specific entities to the CommonJob
response shape. No giant monolithic status machine — each domain keeps its
own state machine.

This module also defines canonical response types, common job statuses,
and the command-based state transition interface.
"""
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional, Dict, Any, List


# ─── Common Job Status (Normalized across all domains) ─────────────────────────
class CommonJobStatus(str, PyEnum):
    """
    Normalized status that maps from each domain's specific state machine.
    This is a PROJECTION — not stored in DB. Each adapter maps its domain
    status to one of these.
    """
    PENDING          = "PENDING"           # Job created, searching for driver
    OFFERED          = "OFFERED"           # Offered to a specific driver
    ASSIGNED         = "ASSIGNED"          # Driver assigned, en route to pickup
    DRIVER_ARRIVING  = "DRIVER_ARRIVING"   # Driver approaching pickup
    DRIVER_ARRIVED   = "DRIVER_ARRIVED"    # Driver at pickup location
    VERIFICATION     = "VERIFICATION"      # OTP/PIN verification in progress
    ACTIVE           = "ACTIVE"            # Service in progress (ride, delivery, rental)
    NEAR_COMPLETION  = "NEAR_COMPLETION"   # Near destination / almost done
    COMPLETED        = "COMPLETED"         # Service completed
    CANCELLED        = "CANCELLED"         # Cancelled by customer or driver
    FAILED           = "FAILED"            # System failure / no driver found
    RETURN_REQUIRED  = "RETURN_REQUIRED"   # Parcel/transport return needed


class CommonJobType(str, PyEnum):
    """Service domain identifiers."""
    RIDE       = "RIDE"
    PARCEL     = "PARCEL"
    TRANSPORT  = "TRANSPORT"
    AIRPORT    = "AIRPORT"
    RENTAL     = "RENTAL"
    OUTSTATION = "OUTSTATION"
    BOOKING    = "BOOKING"       # Intercity seat booking


class CommonJobCommand(str, PyEnum):
    """
    Commands that drivers/system can issue against a job.
    Backend validates and transitions the domain-specific state machine.
    Frontend NEVER sends status changes — only commands.
    """
    ACCEPT           = "ACCEPT"
    REJECT           = "REJECT"
    ARRIVE_PICKUP    = "ARRIVE_PICKUP"
    VERIFY_OTP       = "VERIFY_OTP"
    START            = "START"
    ADD_STOP         = "ADD_STOP"
    ARRIVE_DROPOFF   = "ARRIVE_DROPOFF"
    COMPLETE         = "COMPLETE"
    CANCEL           = "CANCEL"
    REPORT_ISSUE     = "REPORT_ISSUE"
    # Parcel-specific
    CONFIRM_PICKUP   = "CONFIRM_PICKUP"
    CONFIRM_DELIVERY = "CONFIRM_DELIVERY"
    # Transport-specific
    START_LOADING    = "START_LOADING"
    FINISH_LOADING   = "FINISH_LOADING"
    START_UNLOADING  = "START_UNLOADING"
    SUBMIT_POD       = "SUBMIT_POD"


# ─── Data Classes (Response Shapes) ────────────────────────────────────────────

@dataclass
class LocationPoint:
    """GPS coordinate with optional address."""
    latitude: float
    longitude: float
    address: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class FareSnapshot:
    """Fare information visible to driver. No internal commission details."""
    total_fare: float
    driver_earning: float
    currency: str = "INR"
    payment_method: str = "cash"
    surge_multiplier: float = 1.0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class CustomerInfo:
    """Strictly operational customer info for driver. No private data."""
    name: str
    phone_masked: str
    special_notes: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class CommonJobResponse:
    """
    Unified job representation returned to Driver App.
    Each ServiceAdapter maps its domain entity to this shape.
    """
    job_type: str                    # CommonJobType value
    job_id: str                      # Common reference ID
    domain_id: str                   # Original domain entity UUID
    status: str                      # CommonJobStatus value
    pickup: LocationPoint
    dropoff: LocationPoint
    fare_snapshot: FareSnapshot
    customer: CustomerInfo
    start_otp: Optional[str] = None  # OTP for ride/parcel start verification
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # Domain-specific extensions (each adapter may add its own fields)
    service_specific: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "job_type": self.job_type,
            "job_id": self.job_id,
            "domain_id": self.domain_id,
            "status": self.status,
            "pickup": self.pickup.to_dict(),
            "dropoff": self.dropoff.to_dict(),
            "fare_snapshot": self.fare_snapshot.to_dict(),
            "customer": self.customer.to_dict(),
            "start_otp": self.start_otp,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "service_specific": self.service_specific,
        }


@dataclass
class CommandResult:
    """Result of processing a command against a job."""
    success: bool
    message: str
    updated_status: Optional[str] = None   # New CommonJobStatus after command
    data: Optional[Dict[str, Any]] = None  # Additional response data

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class JobListItem:
    """Lightweight job summary for list views."""
    job_type: str
    job_id: str
    domain_id: str
    status: str
    pickup_address: str
    dropoff_address: str
    fare_amount: float
    currency: str = "INR"
    created_at: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


# ─── Abstract Service Adapter ─────────────────────────────────────────────────

class ServiceAdapter(ABC):
    """
    Abstract base class for domain-specific service adapters.
    Each domain (Ride, Parcel, Transport, etc.) implements this interface
    to map its entities and operations to the common job contract.
    """

    @abstractmethod
    async def get_active_job(self, driver_id: str, db) -> Optional[CommonJobResponse]:
        """
        Returns the driver's currently active job for this domain, or None.
        """
        ...

    @abstractmethod
    async def get_job_by_id(self, job_id: str, driver_id: str, db) -> Optional[CommonJobResponse]:
        """
        Returns a specific job by its domain ID, with driver authorization check.
        """
        ...

    @abstractmethod
    async def process_command(
        self, job_id: str, command: CommonJobCommand,
        driver_id: str, db, params: Optional[Dict[str, Any]] = None
    ) -> CommandResult:
        """
        Processes a driver command against a domain job.
        Validates authorization, checks state machine, and transitions state.
        """
        ...

    @abstractmethod
    async def get_job_history(
        self, driver_id: str, db, limit: int = 20, offset: int = 0
    ) -> List[JobListItem]:
        """
        Returns completed/cancelled jobs for this domain.
        """
        ...

    @abstractmethod
    def get_job_type(self) -> CommonJobType:
        """Returns the CommonJobType this adapter handles."""
        ...


# ─── Adapter Registry ─────────────────────────────────────────────────────────

class ServiceAdapterRegistry:
    """
    Central registry of all domain service adapters.
    Used by the unified job API to route requests to the correct adapter.
    """

    def __init__(self):
        self._adapters: Dict[str, ServiceAdapter] = {}

    def register(self, adapter: ServiceAdapter) -> None:
        """Register a service adapter for its job type."""
        job_type = adapter.get_job_type().value
        self._adapters[job_type] = adapter

    def get_adapter(self, job_type: str) -> Optional[ServiceAdapter]:
        """Get adapter by job type string."""
        return self._adapters.get(job_type)

    def get_all_adapters(self) -> List[ServiceAdapter]:
        """Get all registered adapters."""
        return list(self._adapters.values())

    @property
    def registered_types(self) -> List[str]:
        """List all registered job type strings."""
        return list(self._adapters.keys())


# Singleton registry
adapter_registry = ServiceAdapterRegistry()
