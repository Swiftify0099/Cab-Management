"""
Pydantic Schemas for Feature 28: Cross-Service Orchestration & Journey Entities
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CrossServiceLinkItem(BaseModel):
    id: str
    source_service: str
    source_id: str
    target_service: str
    target_id: Optional[str] = None
    link_type: str  # AIRPORT_TRANSFER, HOTEL_STAY, PARCEL_TRANSPORT, OUTSTATION_STAY
    status: str     # SUGGESTED, CONFIRMED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
    title: str
    subtitle: str
    badge_status: str
    deep_link: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class JourneyDetailResponse(BaseModel):
    id: str
    journey_reference: str
    title: str
    status: str  # PLANNED, PARTIALLY_ACTIVE, ACTIVE, COMPLETED, CANCELLED, ATTENTION_REQUIRED
    origin_service: str
    origin_reference_id: str
    created_at: str
    links: List[CrossServiceLinkItem] = Field(default_factory=list)
    attention_required: bool = False
    attention_reason: Optional[str] = None


class JourneyListResponse(BaseModel):
    journeys: List[JourneyDetailResponse]
    active_count: int


class DomainEventEnvelope(BaseModel):
    event_id: str
    event_type: str
    aggregate_type: str
    aggregate_id: str
    source_service: str
    customer_id: Optional[str] = None
    journey_id: Optional[str] = None
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    version: str = "1.0"
    payload: Dict[str, Any] = Field(default_factory=dict)


class LinkedActionRequest(BaseModel):
    journey_id: Optional[str] = None
    action_type: str  # BOOK_AIRPORT_TRANSFER, BOOK_HOTEL_STAY, CONVERT_TO_TRANSPORT, RETRY_LINKED_SERVICE
    source_service: str
    source_id: str
    target_service: str
    parameters: Dict[str, Any] = Field(default_factory=dict)


class LinkedActionResult(BaseModel):
    success: bool
    journey_id: str
    link_id: str
    target_reference_id: Optional[str] = None
    status: str
    message: str
    next_deep_link: Optional[str] = None


class DevOrchestrationSimRequest(BaseModel):
    scenario: str  # HOTEL_AIRPORT_SAGA, PARCEL_E2E, TRANSPORT_MULTI_QUOTE, PARTIAL_FAILURE_COMPENSATION, DUPLICATE_EVENT_IDEMPOTENCY
    details: Optional[Dict[str, Any]] = None
