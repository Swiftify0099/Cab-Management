"""
Feature 21 — Corporate Customer Service
Organization / Governance / Payment layer above all existing services.
Policy engine is data-driven (JSON from DB) — never hardcode company logic in code.
Approval concurrency prevention via SELECT FOR UPDATE.
Corporate wallet is separate from customer personal wallet.
"""
import uuid
import random
import string
from datetime import datetime, timezone, timedelta, date as date_type
from decimal import Decimal
from typing import Optional, List

import structlog
from sqlalchemy import select, update, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    CustomerProfile,
    Company, Department, CompanyMembership, CorporatePolicy,
    ApprovalRequest, ApprovalStep, ApprovalStatus,
    CorporateWallet, CorporateWalletTransaction,
    CorporateInvoice, InvoiceLineItem, CorporateInvoiceStatus,
    CorporateRole,
)

log = structlog.get_logger()


class PolicyCheckResult:
    def __init__(self, allowed: bool, requires_approval: bool, reason: str):
        self.allowed = allowed
        self.requires_approval = requires_approval
        self.reason = reason

    def to_dict(self):
        return {
            "allowed": self.allowed,
            "requires_approval": self.requires_approval,
            "reason": self.reason,
        }


class CorporateService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── 1. Company Management ─────────────────────────────────────────────────

    async def create_company(self, admin_user_id: str, data: dict) -> dict:
        """Create a corporate account. Admin user becomes COMPANY_ADMIN member."""
        # Validate admin customer
        cust_q = select(CustomerProfile).where(CustomerProfile.user_id == uuid.UUID(admin_user_id))
        cust_res = await self.db.execute(cust_q)
        customer = cust_res.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer profile required to create a company")

        company = Company(
            id=uuid.uuid4(),
            legal_name=data["legal_name"],
            display_name=data.get("display_name", data["legal_name"]),
            gstin=data.get("gstin"),
            billing_email=data["billing_email"],
            billing_phone=data.get("billing_phone"),
            billing_address=data.get("billing_address"),
            city=data.get("city"),
            state=data.get("state"),
            pincode=data.get("pincode"),
            timezone=data.get("timezone", "Asia/Kolkata"),
            billing_cycle=data.get("billing_cycle", "MONTHLY"),
            industry=data.get("industry"),
            status="ACTIVE",
        )
        self.db.add(company)
        await self.db.flush()

        # Create default corporate wallet
        wallet = CorporateWallet(
            id=uuid.uuid4(),
            company_id=company.id,
            balance=Decimal("0.00"),
            currency="INR",
        )
        self.db.add(wallet)

        # Auto-add admin as COMPANY_ADMIN member
        membership = CompanyMembership(
            id=uuid.uuid4(),
            company_id=company.id,
            customer_id=customer.id,
            role=CorporateRole.COMPANY_ADMIN,
            status="ACTIVE",
            joined_at=datetime.now(timezone.utc),
        )
        self.db.add(membership)

        # Default policy
        policy = CorporatePolicy(
            id=uuid.uuid4(),
            company_id=company.id,
            policy_name="Default Travel Policy",
            allowed_services=["ride", "rental", "outstation", "airport"],
            allowed_vehicle_categories=["SEDAN", "SUV"],
            max_fare_auto_approve=Decimal("3000.00"),
            require_approval_above=Decimal("3000.00"),
            require_purpose=True,
            personal_rides_allowed=False,
            outstation_allowed=True,
            hotel_allowed=True,
            airport_allowed=True,
            is_active=True,
        )
        self.db.add(policy)

        await self.db.commit()
        log.info("Company created", company_id=str(company.id), name=company.legal_name)

        return {
            "company_id": str(company.id),
            "legal_name": company.legal_name,
            "display_name": company.display_name,
            "status": company.status,
            "membership_id": str(membership.id),
            "role": "company_admin",
        }

    async def get_my_company(self, customer_id: str) -> Optional[dict]:
        """Get company for the authenticated customer's active membership."""
        cust_q = select(CustomerProfile).where(CustomerProfile.user_id == uuid.UUID(customer_id))
        cust_res = await self.db.execute(cust_q)
        customer = cust_res.scalar_one_or_none()
        if not customer:
            return None

        mem_q = select(CompanyMembership).where(
            CompanyMembership.customer_id == customer.id,
            CompanyMembership.status == "ACTIVE",
        ).limit(1)
        mem_res = await self.db.execute(mem_q)
        membership = mem_res.scalar_one_or_none()
        if not membership:
            return None

        company = await self.db.get(Company, membership.company_id)
        if not company:
            return None

        wallet = None
        if membership.role in (CorporateRole.COMPANY_ADMIN, CorporateRole.FINANCE):
            wallet_q = select(CorporateWallet).where(CorporateWallet.company_id == company.id)
            wallet_res = await self.db.execute(wallet_q)
            w = wallet_res.scalar_one_or_none()
            if w:
                wallet = {"balance": float(w.balance), "currency": w.currency}

        return {
            "company_id": str(company.id),
            "legal_name": company.legal_name,
            "display_name": company.display_name,
            "gstin": company.gstin,
            "status": company.status,
            "membership_id": str(membership.id),
            "role": membership.role.value,
            "employee_code": membership.employee_code,
            "corporate_wallet": wallet,
        }

    # ── 2. Employee Management ────────────────────────────────────────────────

    async def invite_employee(
        self,
        company_id: str,
        inviter_customer_id: str,
        phone: str,
        employee_code: Optional[str] = None,
        department_id: Optional[str] = None,
        role: str = "employee",
    ) -> dict:
        """Invite an employee by phone to join the company. Inviter must be COMPANY_ADMIN or TRAVEL_ADMIN."""
        # Validate inviter authorization
        inviter_cust_q = select(CustomerProfile).where(CustomerProfile.user_id == uuid.UUID(inviter_customer_id))
        inviter_cust_res = await self.db.execute(inviter_cust_q)
        inviter_customer = inviter_cust_res.scalar_one_or_none()
        if not inviter_customer:
            raise ValueError("Inviter not found")

        inviter_mem_q = select(CompanyMembership).where(
            CompanyMembership.company_id == uuid.UUID(company_id),
            CompanyMembership.customer_id == inviter_customer.id,
            CompanyMembership.status == "ACTIVE",
        )
        inviter_mem_res = await self.db.execute(inviter_mem_q)
        inviter_membership = inviter_mem_res.scalar_one_or_none()
        if not inviter_membership or inviter_membership.role not in (
            CorporateRole.COMPANY_ADMIN, CorporateRole.TRAVEL_ADMIN
        ):
            raise ValueError("Unauthorized: only Company Admin or Travel Admin can invite employees")

        # Find employee by phone
        from common.models.all_models import User
        user_q = select(User).where(User.phone == phone)
        user_res = await self.db.execute(user_q)
        user = user_res.scalar_one_or_none()

        cust_profile = None
        if user:
            cp_q = select(CustomerProfile).where(CustomerProfile.user_id == user.id)
            cp_res = await self.db.execute(cp_q)
            cust_profile = cp_res.scalar_one_or_none()

        if not cust_profile:
            raise ValueError("No customer profile found for this phone number. Employee must register first.")

        # Check if already a member
        existing_q = select(CompanyMembership).where(
            CompanyMembership.company_id == uuid.UUID(company_id),
            CompanyMembership.customer_id == cust_profile.id,
        )
        existing_res = await self.db.execute(existing_q)
        if existing_res.scalar_one_or_none():
            raise ValueError("Employee already a member of this company")

        membership = CompanyMembership(
            id=uuid.uuid4(),
            company_id=uuid.UUID(company_id),
            customer_id=cust_profile.id,
            employee_code=employee_code,
            department_id=uuid.UUID(department_id) if department_id else None,
            role=CorporateRole(role.lower()),
            status="INVITED",
            invited_by_membership_id=inviter_membership.id,
        )
        self.db.add(membership)
        await self.db.commit()

        log.info("Employee invited", company_id=company_id, phone=phone, role=role)
        return {"membership_id": str(membership.id), "status": "INVITED", "phone": phone}

    async def accept_invitation(self, membership_id: str, customer_id: str) -> dict:
        """Employee accepts company invitation."""
        cust_q = select(CustomerProfile).where(CustomerProfile.user_id == uuid.UUID(customer_id))
        cust_res = await self.db.execute(cust_q)
        customer = cust_res.scalar_one_or_none()
        if not customer:
            raise ValueError("Customer not found")

        membership = await self.db.get(CompanyMembership, uuid.UUID(membership_id))
        if not membership:
            raise ValueError("Invitation not found")
        if membership.customer_id != customer.id:
            raise ValueError("This invitation is not for your account")
        if membership.status != "INVITED":
            raise ValueError(f"Invitation already {membership.status}")

        membership.status = "ACTIVE"
        membership.joined_at = datetime.now(timezone.utc)
        await self.db.commit()

        return {"membership_id": membership_id, "status": "ACTIVE", "role": membership.role.value}

    async def get_my_memberships(self, customer_id: str) -> list:
        """Get all company memberships for a customer."""
        cust_q = select(CustomerProfile).where(CustomerProfile.user_id == uuid.UUID(customer_id))
        cust_res = await self.db.execute(cust_q)
        customer = cust_res.scalar_one_or_none()
        if not customer:
            return []

        mem_q = select(CompanyMembership).where(
            CompanyMembership.customer_id == customer.id,
            CompanyMembership.status.in_(["ACTIVE", "INVITED"]),
        )
        mem_res = await self.db.execute(mem_q)
        memberships = mem_res.scalars().all()
        result = []
        for m in memberships:
            company = await self.db.get(Company, m.company_id)
            result.append({
                "membership_id": str(m.id),
                "company_id": str(m.company_id),
                "company_name": company.display_name if company else "Unknown",
                "role": m.role.value,
                "status": m.status,
                "employee_code": m.employee_code,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            })
        return result

    # ── 3. Policy Engine ──────────────────────────────────────────────────────

    async def check_policy(
        self,
        company_id: str,
        membership_id: str,
        service_type: str,
        vehicle_category: Optional[str] = None,
        estimated_fare: float = 0.0,
        is_personal: bool = False,
        payment_method: Optional[str] = None,
        purpose: Optional[str] = None,
        cost_center_code: Optional[str] = None,
    ) -> PolicyCheckResult:
        """
        Data-driven policy evaluation. Backend-authoritative.
        Enforces:
        - Cashless corporate billing (blocks CASH payment when cashless_only is True)
        - Mandatory business purpose (when require_purpose is True)
        - Service type whitelist
        - Vehicle category limits
        - Booking time windows
        - Threshold-based manager approval routing
        """
        membership = await self.db.get(CompanyMembership, uuid.UUID(membership_id))
        if not membership or str(membership.company_id) != company_id:
            return PolicyCheckResult(False, False, "Not a member of this company")
        if membership.status != "ACTIVE":
            return PolicyCheckResult(False, False, "Membership not active")

        # Find applicable policy (most specific first: role > department > default)
        policy_q = select(CorporatePolicy).where(
            CorporatePolicy.company_id == uuid.UUID(company_id),
            CorporatePolicy.is_active == True,
        ).order_by(CorporatePolicy.applies_to_role.is_(None), CorporatePolicy.applies_to_department_id.is_(None))
        policy_res = await self.db.execute(policy_q)
        policies = policy_res.scalars().all()

        # Select most-applicable policy
        policy = None
        for p in policies:
            role_match = p.applies_to_role is None or p.applies_to_role == membership.role.value
            dept_match = p.applies_to_department_id is None or p.applies_to_department_id == membership.department_id
            if role_match and dept_match:
                policy = p
                break

        if not policy:
            return PolicyCheckResult(False, False, "No travel policy configured for your role")

        # 1. Check Cash Payment Restriction (Cashless Policy Enforcement)
        is_cashless = getattr(policy, "cashless_only", True)
        if payment_method and payment_method.upper() == "CASH" and is_cashless:
            return PolicyCheckResult(
                False, False,
                "Cash payment is blocked for corporate travel under company policy: Cashless corporate billing required"
            )

        # 2. Check Mandatory Business Purpose
        if policy.require_purpose and not (purpose and purpose.strip()):
            return PolicyCheckResult(
                False, False,
                "Business purpose is mandatory for corporate travel under company policy"
            )

        # 3. Check personal rides prohibition
        if is_personal and not policy.personal_rides_allowed:
            return PolicyCheckResult(
                False, False,
                "Personal rides are strictly prohibited on corporate account per company policy"
            )

        # 4. Check allowed services whitelist
        allowed_services = [s.lower() for s in (policy.allowed_services or [])]
        if service_type.lower() not in allowed_services:
            return PolicyCheckResult(
                False, False,
                f"Service '{service_type}' is not covered by company travel policy"
            )

        # 5. Check vehicle category tier limit
        if vehicle_category:
            allowed_vehicles = [v.upper() for v in (policy.allowed_vehicle_categories or [])]
            if vehicle_category.upper() not in allowed_vehicles:
                return PolicyCheckResult(
                    False, False,
                    f"Vehicle category '{vehicle_category}' exceeds authorized policy tier"
                )

        # 6. Check booking hours window
        if policy.allowed_booking_hours_start is not None and policy.allowed_booking_hours_end is not None:
            current_hour = datetime.now(timezone.utc).hour
            if not (policy.allowed_booking_hours_start <= current_hour < policy.allowed_booking_hours_end):
                return PolicyCheckResult(
                    False, False,
                    f"Booking not allowed outside {policy.allowed_booking_hours_start}:00–{policy.allowed_booking_hours_end}:00"
                )

        # 7. Check fare threshold → requires approval?
        if estimated_fare > float(policy.require_approval_above):
            return PolicyCheckResult(
                True, True,
                f"Fare ₹{estimated_fare} exceeds auto-approve limit ₹{float(policy.require_approval_above)}. Approval required."
            )

        return PolicyCheckResult(True, False, "Policy check passed. Auto-approved.")

    # ── 3.5. Corporate Booking Orchestration ──────────────────────────────────

    async def create_corporate_booking(
        self,
        company_id: str,
        membership_id: str,
        service_type: str,
        vehicle_category: Optional[str],
        estimated_fare: float,
        purpose: str,
        pickup_address: str,
        drop_address: str,
        payment_method: str = "CORPORATE_WALLET",
        department_id: Optional[str] = None,
        cost_center_code: Optional[str] = None,
        booking_details: Optional[dict] = None,
    ) -> dict:
        """
        Orchestrates full corporate booking flow:
        1. Evaluates data-driven policy engine (cashless, purpose, service, vehicle, budget).
        2. Routes to approval or auto-approves.
        3. Creates booking record with corporate attribution.
        """
        membership = await self.db.get(CompanyMembership, uuid.UUID(membership_id))
        if not membership or str(membership.company_id) != company_id:
            raise ValueError("Not an authorized member of this company")

        # Policy evaluation
        policy_result = await self.check_policy(
            company_id=company_id,
            membership_id=membership_id,
            service_type=service_type,
            vehicle_category=vehicle_category,
            estimated_fare=estimated_fare,
            is_personal=False,
            payment_method=payment_method,
            purpose=purpose,
            cost_center_code=cost_center_code,
        )

        if not policy_result.allowed:
            raise ValueError(f"Policy check failed: {policy_result.reason}")

        booking_ref = f"CORP-{datetime.now(timezone.utc).strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        # If requires approval, create approval request in PENDING state
        if policy_result.requires_approval:
            appr = await self.create_approval_request(
                company_id=company_id,
                requester_membership_id=membership_id,
                service_type=service_type,
                estimated_fare=estimated_fare,
                purpose=purpose,
                department_id=department_id or (str(membership.department_id) if membership.department_id else None),
                booking_details={
                    "booking_reference": booking_ref,
                    "pickup_address": pickup_address,
                    "drop_address": drop_address,
                    "vehicle_category": vehicle_category,
                    "payment_method": payment_method,
                    "cost_center_code": cost_center_code,
                    **(booking_details or {}),
                },
            )
            return {
                "booking_reference": booking_ref,
                "status": "PENDING_APPROVAL",
                "approval_id": appr["approval_id"],
                "approval_required": True,
                "reason": policy_result.reason,
                "estimated_fare": estimated_fare,
            }

        # Auto-approved
        return {
            "booking_reference": booking_ref,
            "status": "CONFIRMED",
            "approval_required": False,
            "approval_status": "NOT_REQUIRED",
            "estimated_fare": estimated_fare,
            "payment_method": payment_method,
            "purpose": purpose,
            "cost_center_code": cost_center_code,
        }

    # ── 3.6. Partner Privacy Shield (Zero Leakage) ───────────────────────────

    def sanitize_partner_operational_data(
        self,
        booking_reference: str,
        passenger_name: str,
        passenger_phone: str,
        pickup_address: str,
        pickup_lat: float,
        pickup_lng: float,
        drop_address: str,
        drop_lat: float,
        drop_lng: float,
        service_type: str,
        vehicle_category: str,
        trip_otp: str,
        estimated_distance_km: float,
        estimated_duration_min: int,
    ) -> dict:
        """
        Sanitizes corporate booking data for Driver / Partner view.
        EXPOSES ONLY OPERATIONAL DATA.
        STRICTLY OMITS:
        - HR metadata (employee code, department hierarchy, internal grades)
        - Company payment secrets (GSTIN, corporate card tokens, wallet balance)
        - Private approval notes and internal manager decisions
        """
        masked_phone = f"+91 **** {passenger_phone[-4:]}" if len(passenger_phone) >= 4 else "+91 ****"
        return {
            "booking_reference": booking_reference,
            "passenger_name": passenger_name,
            "passenger_phone_masked": masked_phone,
            "pickup_address": pickup_address,
            "pickup_lat": pickup_lat,
            "pickup_lng": pickup_lng,
            "drop_address": drop_address,
            "drop_lat": drop_lat,
            "drop_lng": drop_lng,
            "service_type": service_type,
            "vehicle_category": vehicle_category,
            "trip_otp": trip_otp,
            "estimated_distance_km": estimated_distance_km,
            "estimated_duration_min": estimated_duration_min,
            "is_corporate": True,
            "billing_type": "CORPORATE_BILLING",
        }

    # ── 3.7. Department & Cost Center Management ─────────────────────────────

    async def create_department(
        self,
        company_id: str,
        name: str,
        cost_center_code: str,
        requester_membership_id: str,
        manager_membership_id: Optional[str] = None,
    ) -> dict:
        """Create a department with cost center code."""
        membership = await self.db.get(CompanyMembership, uuid.UUID(requester_membership_id))
        if not membership or membership.role not in (CorporateRole.COMPANY_ADMIN, CorporateRole.TRAVEL_ADMIN):
            raise ValueError("Unauthorized: only Company Admin can create departments")

        dept = Department(
            id=uuid.uuid4(),
            company_id=uuid.UUID(company_id),
            name=name,
            cost_center_code=cost_center_code,
            manager_membership_id=uuid.UUID(manager_membership_id) if manager_membership_id else None,
            is_active=True,
        )
        self.db.add(dept)
        await self.db.commit()

        return {
            "department_id": str(dept.id),
            "name": dept.name,
            "cost_center_code": dept.cost_center_code,
            "company_id": company_id,
        }

    async def list_departments(self, company_id: str) -> list:
        """List departments and cost centers for a company."""
        dept_q = select(Department).where(
            Department.company_id == uuid.UUID(company_id),
            Department.is_active == True,
        )
        res = await self.db.execute(dept_q)
        return [
            {
                "department_id": str(d.id),
                "name": d.name,
                "cost_center_code": d.cost_center_code,
            }
            for d in res.scalars().all()
        ]

    # ── 3.8. Corporate Trip Completion & GST Settlement ───────────────────────

    async def settle_corporate_trip(
        self,
        company_id: str,
        membership_id: str,
        booking_reference: str,
        service_type: str,
        fare_amount: float,
        business_purpose: str,
        cost_center_code: Optional[str] = None,
        department_id: Optional[str] = None,
        payment_method: str = "CORPORATE_WALLET",
    ) -> dict:
        """
        Settles completed corporate trip:
        1. Appends line item to active invoice with 5% GST breakdown.
        2. Debits corporate wallet if payment method is CORPORATE_WALLET.
        """
        membership = await self.db.get(CompanyMembership, uuid.UUID(membership_id))
        if not membership:
            raise ValueError("Membership not found")

        # 5% GST calculation
        gst_rate = Decimal("0.05")
        dec_fare = Decimal(str(fare_amount))
        subtotal = round(dec_fare / (Decimal("1.00") + gst_rate), 2)
        gst_amount = dec_fare - subtotal

        # Find or create active invoice
        inv_q = select(CorporateInvoice).where(
            CorporateInvoice.company_id == uuid.UUID(company_id),
            CorporateInvoice.status.in_([CorporateInvoiceStatus.DRAFT, CorporateInvoiceStatus.GENERATED]),
        ).order_by(CorporateInvoice.created_at.desc()).limit(1)
        inv_res = await self.db.execute(inv_q)
        invoice = inv_res.scalar_one_or_none()

        if not invoice:
            # Create new invoice
            now = date_type.today()
            inv_res_dict = await self.generate_monthly_invoice(company_id, now.strftime("%Y-%m"))
            invoice = await self.db.get(CorporateInvoice, uuid.UUID(inv_res_dict["invoice_id"]))

        line_item = InvoiceLineItem(
            id=uuid.uuid4(),
            invoice_id=invoice.id,
            membership_id=membership.id,
            department_id=uuid.UUID(department_id) if department_id else membership.department_id,
            service_type=service_type,
            booking_reference=booking_reference,
            booking_date=date_type.today(),
            description=f"Corporate {service_type.capitalize()} — {business_purpose}",
            fare_amount=subtotal,
            gst_amount=gst_amount,
            total_amount=dec_fare,
            business_purpose=business_purpose,
            cost_center_code=cost_center_code,
        )
        self.db.add(line_item)

        # Update invoice totals
        invoice.total_bookings += 1
        invoice.subtotal += subtotal
        invoice.gst_amount += gst_amount
        invoice.total_amount += dec_fare

        # Debit corporate wallet if applicable
        if payment_method == "CORPORATE_WALLET":
            w_q = select(CorporateWallet).where(CorporateWallet.company_id == uuid.UUID(company_id)).with_for_update()
            w_res = await self.db.execute(w_q)
            wallet = w_res.scalar_one_or_none()
            if wallet:
                wallet.balance -= dec_fare
                txn = CorporateWalletTransaction(
                    id=uuid.uuid4(),
                    wallet_id=wallet.id,
                    company_id=uuid.UUID(company_id),
                    direction="DEBIT",
                    amount=dec_fare,
                    balance_after=wallet.balance,
                    description=f"Trip payment #{booking_reference} ({service_type})",
                    booking_reference=booking_reference,
                    membership_id=membership.id,
                )
                self.db.add(txn)

        await self.db.commit()

        return {
            "invoice_id": str(invoice.id),
            "invoice_number": invoice.invoice_number,
            "line_item_id": str(line_item.id),
            "booking_reference": booking_reference,
            "total_amount": float(dec_fare),
            "gst_amount": float(gst_amount),
            "subtotal": float(subtotal),
        }

    # ── 4. Approval Workflow ──────────────────────────────────────────────────

    async def create_approval_request(
        self,
        company_id: str,
        requester_membership_id: str,
        service_type: str,
        estimated_fare: float,
        purpose: str,
        department_id: Optional[str] = None,
        booking_details: Optional[dict] = None,
    ) -> dict:
        """Create approval request for above-threshold booking."""
        membership = await self.db.get(CompanyMembership, uuid.UUID(requester_membership_id))
        if not membership:
            raise ValueError("Membership not found")

        # Employee cannot self-approve
        # Find approvers in the same company
        approver_q = select(CompanyMembership).where(
            CompanyMembership.company_id == uuid.UUID(company_id),
            CompanyMembership.role.in_([CorporateRole.APPROVER, CorporateRole.COMPANY_ADMIN, CorporateRole.TRAVEL_ADMIN]),
            CompanyMembership.status == "ACTIVE",
            CompanyMembership.id != uuid.UUID(requester_membership_id),  # cannot self-approve
        ).limit(5)
        approver_res = await self.db.execute(approver_q)
        approvers = approver_res.scalars().all()

        if not approvers:
            raise ValueError("No approvers configured for this company")

        approval = ApprovalRequest(
            id=uuid.uuid4(),
            company_id=uuid.UUID(company_id),
            requester_membership_id=uuid.UUID(requester_membership_id),
            service_type=service_type,
            estimated_fare=Decimal(str(estimated_fare)),
            purpose=purpose,
            department_id=uuid.UUID(department_id) if department_id else None,
            booking_details_json=booking_details or {},
            status=ApprovalStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        self.db.add(approval)
        await self.db.flush()

        # Sort so designated APPROVER is prioritized
        approvers.sort(key=lambda a: 0 if a.role == CorporateRole.APPROVER else 1)

        # Create approval step for primary approver
        for i, approver in enumerate(approvers[:1], 1):
            step = ApprovalStep(
                id=uuid.uuid4(),
                approval_request_id=approval.id,
                approver_membership_id=approver.id,
                step_order=i,
                status="PENDING",
            )
            self.db.add(step)

        await self.db.commit()
        log.info("Approval request created", approval_id=str(approval.id), fare=estimated_fare)

        return {
            "approval_id": str(approval.id),
            "status": "pending",
            "estimated_fare": estimated_fare,
            "expires_at": approval.expires_at.isoformat(),
            "approvers_count": len(approvers[:2]),
        }

    async def respond_to_approval(
        self,
        approval_id: str,
        approver_membership_id: str,
        decision: str,  # "approved" or "rejected"
        note: Optional[str] = None,
    ) -> dict:
        """
        Approver responds to approval request.
        Concurrent double-approval prevented via SELECT FOR UPDATE.
        Approver cannot respond to their own request.
        """
        # Find the step
        step_q = select(ApprovalStep).where(
            ApprovalStep.approval_request_id == uuid.UUID(approval_id),
            ApprovalStep.approver_membership_id == uuid.UUID(approver_membership_id),
            ApprovalStep.status == "PENDING",
        ).with_for_update()
        step_res = await self.db.execute(step_q)
        step = step_res.scalar_one_or_none()

        if not step:
            raise ValueError("No pending approval step found. Already responded or unauthorized.")

        # Ensure approver is not the requester
        approval = await self.db.get(ApprovalRequest, uuid.UUID(approval_id))
        if not approval:
            raise ValueError("Approval request not found")
        if str(approval.requester_membership_id) == approver_membership_id:
            raise ValueError("Cannot approve your own request")

        now = datetime.now(timezone.utc)
        step.status = decision.upper()
        step.responded_at = now
        step.note = note

        if decision.lower() == "rejected":
            approval.status = ApprovalStatus.REJECTED
            approval.rejected_at = now
            approval.final_note = note
        elif decision.lower() == "approved":
            # Check if all steps approved
            all_steps_q = select(ApprovalStep).where(
                ApprovalStep.approval_request_id == uuid.UUID(approval_id)
            )
            all_steps_res = await self.db.execute(all_steps_q)
            all_steps = all_steps_res.scalars().all()
            all_approved = all(s.status == "APPROVED" for s in all_steps)
            if all_approved:
                approval.status = ApprovalStatus.APPROVED
                approval.approved_at = now

        await self.db.commit()
        log.info("Approval responded", approval_id=approval_id, decision=decision)

        return {
            "approval_id": approval_id,
            "step_decision": decision,
            "approval_status": approval.status.value,
        }

    async def get_pending_approvals(self, approver_membership_id: str) -> list:
        """Get pending approval requests for an approver."""
        step_q = select(ApprovalStep).where(
            ApprovalStep.approver_membership_id == uuid.UUID(approver_membership_id),
            ApprovalStep.status == "PENDING",
        )
        step_res = await self.db.execute(step_q)
        steps = step_res.scalars().all()
        result = []
        for step in steps:
            approval = await self.db.get(ApprovalRequest, step.approval_request_id)
            if approval and approval.status == ApprovalStatus.PENDING:
                result.append({
                    "approval_id": str(approval.id),
                    "service_type": approval.service_type,
                    "estimated_fare": float(approval.estimated_fare),
                    "purpose": approval.purpose,
                    "expires_at": approval.expires_at.isoformat(),
                    "step_id": str(step.id),
                })
        return result

    async def get_my_approval_requests(self, requester_membership_id: str) -> list:
        """Get approval requests submitted by an employee."""
        ar_q = select(ApprovalRequest).where(
            ApprovalRequest.requester_membership_id == uuid.UUID(requester_membership_id)
        ).order_by(ApprovalRequest.created_at.desc()).limit(20)
        ar_res = await self.db.execute(ar_q)
        return [
            {
                "approval_id": str(a.id),
                "service_type": a.service_type,
                "estimated_fare": float(a.estimated_fare),
                "purpose": a.purpose,
                "status": a.status.value,
                "booking_reference": a.booking_reference,
                "created_at": a.created_at.isoformat(),
                "expires_at": a.expires_at.isoformat(),
            }
            for a in ar_res.scalars().all()
        ]

    # ── 5. Corporate Wallet ───────────────────────────────────────────────────

    async def get_corporate_wallet(self, company_id: str, requester_membership_id: str) -> dict:
        """Get corporate wallet — only visible to FINANCE and COMPANY_ADMIN."""
        membership = await self.db.get(CompanyMembership, uuid.UUID(requester_membership_id))
        if not membership or str(membership.company_id) != company_id:
            raise ValueError("Unauthorized")
        if membership.role not in (CorporateRole.COMPANY_ADMIN, CorporateRole.FINANCE):
            raise ValueError("Only Finance or Company Admin can view corporate wallet")

        wallet_q = select(CorporateWallet).where(CorporateWallet.company_id == uuid.UUID(company_id))
        wallet_res = await self.db.execute(wallet_q)
        wallet = wallet_res.scalar_one_or_none()
        if not wallet:
            raise ValueError("Corporate wallet not found")

        txn_q = select(CorporateWalletTransaction).where(
            CorporateWalletTransaction.wallet_id == wallet.id
        ).order_by(CorporateWalletTransaction.created_at.desc()).limit(20)
        txn_res = await self.db.execute(txn_q)
        transactions = [
            {
                "direction": t.direction,
                "amount": float(t.amount),
                "balance_after": float(t.balance_after),
                "description": t.description,
                "booking_reference": t.booking_reference,
                "created_at": t.created_at.isoformat(),
            }
            for t in txn_res.scalars().all()
        ]

        return {
            "wallet_id": str(wallet.id),
            "balance": float(wallet.balance),
            "currency": wallet.currency,
            "last_topped_up_at": wallet.last_topped_up_at.isoformat() if wallet.last_topped_up_at else None,
            "recent_transactions": transactions,
        }

    async def topup_corporate_wallet(self, company_id: str, amount: float, requester_membership_id: str) -> dict:
        """Top up corporate wallet. Only COMPANY_ADMIN or FINANCE."""
        membership = await self.db.get(CompanyMembership, uuid.UUID(requester_membership_id))
        if not membership or membership.role not in (CorporateRole.COMPANY_ADMIN, CorporateRole.FINANCE):
            raise ValueError("Only Finance or Company Admin can top up corporate wallet")

        wallet_q = select(CorporateWallet).where(CorporateWallet.company_id == uuid.UUID(company_id)).with_for_update()
        wallet_res = await self.db.execute(wallet_q)
        wallet = wallet_res.scalar_one_or_none()
        if not wallet:
            raise ValueError("Corporate wallet not found")

        wallet.balance += Decimal(str(amount))
        wallet.last_topped_up_at = datetime.now(timezone.utc)

        txn = CorporateWalletTransaction(
            id=uuid.uuid4(),
            wallet_id=wallet.id,
            company_id=uuid.UUID(company_id),
            direction="CREDIT",
            amount=Decimal(str(amount)),
            balance_after=wallet.balance,
            description="Manual top-up",
            membership_id=uuid.UUID(requester_membership_id),
        )
        self.db.add(txn)
        await self.db.commit()

        return {"balance": float(wallet.balance), "topped_up": amount}

    # ── 6. Invoice Management ─────────────────────────────────────────────────

    async def generate_monthly_invoice(
        self,
        company_id: str,
        billing_month: str,  # YYYY-MM
    ) -> dict:
        """Generate monthly consolidated invoice for a company."""
        year, month = map(int, billing_month.split("-"))
        from calendar import monthrange
        _, last_day = monthrange(year, month)
        period_start = date_type(year, month, 1)
        period_end = date_type(year, month, last_day)

        # Generate invoice number
        suffix = "".join(random.choices(string.digits, k=3))
        invoice_number = f"INV-{billing_month.replace('-', '')}-{suffix}"

        invoice = CorporateInvoice(
            id=uuid.uuid4(),
            company_id=uuid.UUID(company_id),
            invoice_number=invoice_number,
            billing_period_start=period_start,
            billing_period_end=period_end,
            status=CorporateInvoiceStatus.GENERATED,
        )
        self.db.add(invoice)
        await self.db.commit()

        log.info("Invoice generated", invoice_number=invoice_number, period=billing_month)

        return {
            "invoice_id": str(invoice.id),
            "invoice_number": invoice_number,
            "billing_period": f"{period_start} to {period_end}",
            "status": "generated",
        }

    async def get_invoices(self, company_id: str, requester_membership_id: str) -> list:
        """List corporate invoices — visible to FINANCE and COMPANY_ADMIN."""
        membership = await self.db.get(CompanyMembership, uuid.UUID(requester_membership_id))
        if not membership or membership.role not in (CorporateRole.COMPANY_ADMIN, CorporateRole.FINANCE, CorporateRole.TRAVEL_ADMIN):
            raise ValueError("Unauthorized to view invoices")

        inv_q = select(CorporateInvoice).where(
            CorporateInvoice.company_id == uuid.UUID(company_id)
        ).order_by(CorporateInvoice.billing_period_start.desc()).limit(24)
        inv_res = await self.db.execute(inv_q)
        return [
            {
                "invoice_id": str(i.id),
                "invoice_number": i.invoice_number,
                "period": f"{i.billing_period_start} – {i.billing_period_end}",
                "total_bookings": i.total_bookings,
                "total_amount": float(i.total_amount),
                "paid_amount": float(i.paid_amount),
                "status": i.status.value,
                "due_date": str(i.due_date) if i.due_date else None,
            }
            for i in inv_res.scalars().all()
        ]

    async def get_invoice_detail(self, invoice_id: str, requester_membership_id: str) -> dict:
        """Get invoice with line items."""
        membership = await self.db.get(CompanyMembership, uuid.UUID(requester_membership_id))
        if not membership or membership.role not in (CorporateRole.COMPANY_ADMIN, CorporateRole.FINANCE, CorporateRole.TRAVEL_ADMIN):
            raise ValueError("Unauthorized")

        invoice = await self.db.get(CorporateInvoice, uuid.UUID(invoice_id))
        if not invoice:
            raise ValueError("Invoice not found")

        items_q = select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id)
        items_res = await self.db.execute(items_q)
        items = [
            {
                "service_type": i.service_type,
                "booking_reference": i.booking_reference,
                "booking_date": str(i.booking_date),
                "description": i.description,
                "fare_amount": float(i.fare_amount),
                "gst_amount": float(i.gst_amount),
                "total_amount": float(i.total_amount),
                "business_purpose": i.business_purpose,
                "cost_center_code": i.cost_center_code,
            }
            for i in items_res.scalars().all()
        ]

        return {
            "invoice_id": invoice_id,
            "invoice_number": invoice.invoice_number,
            "period": f"{invoice.billing_period_start} – {invoice.billing_period_end}",
            "total_bookings": invoice.total_bookings,
            "subtotal": float(invoice.subtotal),
            "gst_amount": float(invoice.gst_amount),
            "total_amount": float(invoice.total_amount),
            "paid_amount": float(invoice.paid_amount),
            "status": invoice.status.value,
            "line_items": items,
        }

    # ── 7. Expense Report ─────────────────────────────────────────────────────

    async def get_expense_report(
        self,
        company_id: str,
        requester_membership_id: str,
        period_start: Optional[str] = None,
        period_end: Optional[str] = None,
        department_id: Optional[str] = None,
    ) -> dict:
        """
        Expense report aggregated by department/employee.
        Visible to FINANCE, COMPANY_ADMIN, TRAVEL_ADMIN.
        """
        membership = await self.db.get(CompanyMembership, uuid.UUID(requester_membership_id))
        if not membership or membership.role not in (
            CorporateRole.COMPANY_ADMIN, CorporateRole.FINANCE, CorporateRole.TRAVEL_ADMIN
        ):
            raise ValueError("Unauthorized to view expense reports")

        # In production, this aggregates InvoiceLineItem with JOINs
        # For now, return structure with totals
        items_q = select(InvoiceLineItem).join(
            CorporateInvoice, InvoiceLineItem.invoice_id == CorporateInvoice.id
        ).where(CorporateInvoice.company_id == uuid.UUID(company_id))

        if department_id:
            items_q = items_q.where(InvoiceLineItem.department_id == uuid.UUID(department_id))

        items_res = await self.db.execute(items_q)
        items = items_res.scalars().all()

        # Aggregate by service type
        by_service: dict = {}
        total = 0.0
        for item in items:
            svc = item.service_type
            if svc not in by_service:
                by_service[svc] = {"count": 0, "total": 0.0}
            by_service[svc]["count"] += 1
            by_service[svc]["total"] += float(item.total_amount)
            total += float(item.total_amount)

        return {
            "company_id": company_id,
            "total_spend": round(total, 2),
            "total_trips": len(items),
            "by_service_type": by_service,
        }

    # ── 8. Company Members List ───────────────────────────────────────────────

    async def list_members(self, company_id: str, requester_membership_id: str) -> list:
        """List company members — visible to COMPANY_ADMIN and TRAVEL_ADMIN only."""
        membership = await self.db.get(CompanyMembership, uuid.UUID(requester_membership_id))
        if not membership or membership.role not in (
            CorporateRole.COMPANY_ADMIN, CorporateRole.TRAVEL_ADMIN
        ):
            raise ValueError("Unauthorized to view member list")

        mem_q = select(CompanyMembership).where(
            CompanyMembership.company_id == uuid.UUID(company_id)
        )
        mem_res = await self.db.execute(mem_q)
        members = mem_res.scalars().all()
        return [
            {
                "membership_id": str(m.id),
                "employee_code": m.employee_code,
                "role": m.role.value,
                "status": m.status,
                "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            }
            for m in members
        ]
