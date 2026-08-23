"""
Driver KYC & Onboarding Schemas
Covers 10 Document categories, Section Breakdown, Progress %, Expiry Alerts, Bank Account, and Audit Timelines.
"""
import uuid
from datetime import date, datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class AuditTimelineEvent(BaseModel):
    step: int
    title: str
    description: str
    timestamp: datetime
    actor: str = "System"
    status: str = "completed"


class KYCItemStatusResponse(BaseModel):
    key: str
    name: str
    category: str  # identity | driving | vehicle | payments
    doc_type: str
    is_mandatory: bool = True
    status: str  # not_started | uploaded | under_review | approved | rejected | expiring_soon | expired | reverification_required
    status_label: str
    document_number: Optional[str] = None
    file_path: Optional[str] = None
    issue_date: Optional[date] = None
    expires_at: Optional[date] = None
    expiry_label: Optional[str] = None
    is_expired: bool = False
    is_expiring_soon: bool = False
    rejection_reason: Optional[str] = None
    action_required: Optional[str] = None
    version: int = 1
    updated_at: Optional[datetime] = None


class KYCSectionResponse(BaseModel):
    id: str
    title: str
    completed_count: int
    total_count: int
    completion_pct: int
    items: List[KYCItemStatusResponse]


class KYCDashboardResponse(BaseModel):
    driver_id: str
    driver_name: str
    driver_id_display: str
    overall_status: str  # NOT_STARTED | IN_PROGRESS | UNDER_REVIEW | ACTION_REQUIRED | VERIFIED | REVERIFICATION_REQUIRED
    overall_status_label: str
    completion_percentage: int
    action_required_count: int
    action_required_message: Optional[str] = None
    can_go_online: bool
    sections: List[KYCSectionResponse]
    upcoming_expiries: List[KYCItemStatusResponse]


class KYCRejectionDetailsResponse(BaseModel):
    doc_type: str
    document_name: str
    document_number: Optional[str] = None
    status: str = "rejected"
    rejection_reason: str
    action_required: str
    file_path: Optional[str] = None
    access_url: Optional[str] = None
    expires_at: Optional[str] = None
    rejected_at: Optional[datetime] = None
    timeline: List[AuditTimelineEvent]


class BankAccountSubmitRequest(BaseModel):
    account_holder_name: str = Field(..., min_length=2, max_length=255)
    bank_name: str = Field(..., min_length=2, max_length=100)
    account_number: str = Field(..., min_length=8, max_length=30)
    confirm_account_number: str = Field(..., min_length=8, max_length=30)
    ifsc_code: str = Field(..., min_length=8, max_length=20)
    account_type: str = Field("savings", max_length=20)

    @field_validator("confirm_account_number")
    @classmethod
    def match_account_number(cls, v: str, info) -> str:
        if "account_number" in info.data and v != info.data["account_number"]:
            raise ValueError("Account numbers do not match")
        return v

    @field_validator("ifsc_code")
    @classmethod
    def clean_ifsc(cls, v: str) -> str:
        return v.strip().upper()


class BankAccountResponse(BaseModel):
    id: uuid.UUID
    account_holder_name: str
    bank_name: str
    account_number_masked: str
    ifsc_code: str
    account_type: str
    is_verified: bool
    status: str
    status_label: str
