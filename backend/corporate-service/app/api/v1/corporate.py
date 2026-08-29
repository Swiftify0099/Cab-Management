"""Feature 21 — Corporate Customer API Router"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import async_session_maker
from common.middleware.auth import get_current_user, AuthenticatedUser

router = APIRouter()


async def get_db():
    async with async_session_maker() as session:
        yield session


def _corporate_service(db: AsyncSession = Depends(get_db)):
    from app.services.corporate_service import CorporateService
    return CorporateService(db)


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateCompanyRequest(BaseModel):
    legal_name: str
    display_name: Optional[str] = None
    gstin: Optional[str] = None
    billing_email: str
    billing_phone: Optional[str] = None
    billing_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    industry: Optional[str] = None
    billing_cycle: str = "MONTHLY"


class InviteEmployeeRequest(BaseModel):
    phone: str
    employee_code: Optional[str] = None
    department_id: Optional[str] = None
    role: str = "employee"


class PolicyCheckRequest(BaseModel):
    company_id: str
    membership_id: str
    service_type: str
    vehicle_category: Optional[str] = None
    estimated_fare: float
    is_personal: bool = False


class CreateApprovalRequest(BaseModel):
    company_id: str
    membership_id: str
    service_type: str
    estimated_fare: float
    purpose: str
    department_id: Optional[str] = None
    booking_details: Optional[dict] = None


class ApprovalResponseRequest(BaseModel):
    decision: str  # "approved" or "rejected"
    note: Optional[str] = None


class TopupRequest(BaseModel):
    amount: float


class GenerateInvoiceRequest(BaseModel):
    company_id: str
    billing_month: str  # YYYY-MM


class ExpenseReportRequest(BaseModel):
    company_id: str
    membership_id: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    department_id: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

# ── Company ──

@router.post("/companies")
async def create_company(
    req: CreateCompanyRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Create a corporate account. Creator becomes Company Admin."""
    try:
        result = await svc.create_company(str(current_user.id), req.model_dump())
        return {"data": result, "message": "Company account created"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies/my")
async def get_my_company(
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Get the authenticated customer's active corporate account."""
    result = await svc.get_my_company(str(current_user.id))
    if not result:
        raise HTTPException(status_code=404, detail="No active corporate membership found")
    return {"data": result}


# ── Memberships ──

@router.post("/companies/{company_id}/invite")
async def invite_employee(
    company_id: str,
    req: InviteEmployeeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Invite employee to the company. Requester must be Company Admin or Travel Admin."""
    try:
        result = await svc.invite_employee(
            company_id, str(current_user.id),
            req.phone, req.employee_code, req.department_id, req.role
        )
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/memberships/{membership_id}/accept")
async def accept_invitation(
    membership_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Accept a company invitation."""
    try:
        result = await svc.accept_invitation(membership_id, str(current_user.id))
        return {"data": result, "message": "Invitation accepted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/memberships/my")
async def get_my_memberships(
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Get all corporate memberships for the authenticated customer."""
    return {"data": await svc.get_my_memberships(str(current_user.id))}


@router.get("/companies/{company_id}/members")
async def list_company_members(
    company_id: str,
    membership_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """List company members. Company Admin / Travel Admin only."""
    try:
        return {"data": await svc.list_members(company_id, membership_id)}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ── Policy Engine ──

@router.post("/policy-check")
async def check_policy(
    req: PolicyCheckRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """
    Backend policy engine check. Returns:
    - allowed: bool
    - requires_approval: bool
    - reason: str
    Frontend NEVER hardcodes policy logic — always calls this endpoint.
    """
    try:
        result = await svc.check_policy(
            req.company_id, req.membership_id, req.service_type,
            req.vehicle_category, req.estimated_fare, req.is_personal
        )
        return {"data": result.to_dict()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Approval Workflow ──

@router.post("/approval-requests")
async def create_approval_request(
    req: CreateApprovalRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Create approval request for above-threshold booking."""
    try:
        result = await svc.create_approval_request(
            req.company_id, req.membership_id, req.service_type,
            req.estimated_fare, req.purpose, req.department_id, req.booking_details
        )
        return {"data": result, "message": "Approval request sent to approvers"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/approval-requests/{approval_id}/respond")
async def respond_to_approval(
    approval_id: str,
    approver_membership_id: str,
    req: ApprovalResponseRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """
    Approver responds to approval request.
    Concurrent double-approval prevented via SELECT FOR UPDATE.
    Returns 400 if already responded (race condition detected).
    """
    try:
        result = await svc.respond_to_approval(
            approval_id, approver_membership_id, req.decision, req.note
        )
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/approval-requests/pending")
async def get_pending_approvals(
    approver_membership_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Get approval requests pending the authenticated approver's action."""
    return {"data": await svc.get_pending_approvals(approver_membership_id)}


@router.get("/approval-requests/my")
async def get_my_approval_requests(
    membership_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Get approval requests submitted by the authenticated employee."""
    return {"data": await svc.get_my_approval_requests(membership_id)}


# ── Corporate Wallet ──

@router.get("/companies/{company_id}/wallet")
async def get_corporate_wallet(
    company_id: str,
    membership_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """
    Corporate wallet balance and transactions.
    Only FINANCE and COMPANY_ADMIN can view.
    Completely separate from customer personal wallet.
    """
    try:
        return {"data": await svc.get_corporate_wallet(company_id, membership_id)}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/companies/{company_id}/wallet/topup")
async def topup_corporate_wallet(
    company_id: str,
    membership_id: str,
    req: TopupRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Top up corporate wallet. COMPANY_ADMIN / FINANCE only."""
    try:
        result = await svc.topup_corporate_wallet(company_id, req.amount, membership_id)
        return {"data": result, "message": "Corporate wallet topped up"}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ── Invoices ──

@router.post("/invoices/generate")
async def generate_invoice(
    req: GenerateInvoiceRequest,
    membership_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Generate monthly consolidated invoice."""
    try:
        result = await svc.generate_monthly_invoice(req.company_id, req.billing_month)
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies/{company_id}/invoices")
async def get_invoices(
    company_id: str,
    membership_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """List all corporate invoices. FINANCE / COMPANY_ADMIN / TRAVEL_ADMIN."""
    try:
        return {"data": await svc.get_invoices(company_id, membership_id)}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/invoices/{invoice_id}")
async def get_invoice_detail(
    invoice_id: str,
    membership_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Get invoice with full line items breakdown."""
    try:
        return {"data": await svc.get_invoice_detail(invoice_id, membership_id)}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ── Expense Reports ──

@router.post("/expense-report")
async def get_expense_report(
    req: ExpenseReportRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    svc=Depends(_corporate_service),
):
    """Expense report aggregated by service type and department."""
    try:
        result = await svc.get_expense_report(
            req.company_id, req.membership_id,
            req.period_start, req.period_end, req.department_id
        )
        return {"data": result}
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
