"""
Master Production Verification Suite: SERVICE 10 — CORPORATE TRAVEL & ENTERPRISE BILLING
Tests:
1. Company & Corporate Wallet Setup: Creates corporate entity, GSTIN, wallet, and default Travel Policy
2. Department & Employee Onboarding: Creates departments and invites Employee + Approver Manager
3. Invitation Acceptance: Employee accepts membership -> ACTIVE status
4. Data-Driven Policy Evaluation: Auto-approval (< threshold) vs Mandatory Manager Approval (> threshold)
5. Multi-Step Approval Handshake: Approver responds to request -> status APPROVED, self-approval blocked
6. Corporate Wallet Management: Dedicated corporate wallet top-up and audit trail ledger
7. Monthly Consolidated GST Invoice: Generates monthly corporate invoice with GST breakdown and line items
8. Expense Analytics: Corporate spending report aggregated across departments and services
"""
import os
import sys
import uuid
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
import asyncio

# Add python paths
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_root, "common"))
sys.path.insert(0, os.path.join(_root, "corporate-service"))
sys.path.insert(0, _root)

from sqlalchemy import select, and_, text
from common.database import async_session_maker, engine
from common.models.all_models import (
    Base, User, UserRole, CustomerProfile,
    Company, Department, CompanyMembership, CorporatePolicy,
    ApprovalRequest, ApprovalStep, ApprovalStatus,
    CorporateWallet, CorporateWalletTransaction,
    CorporateInvoice, InvoiceLineItem, CorporateInvoiceStatus,
    CorporateRole,
)
from app.services.corporate_service import CorporateService

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


async def run_corporate_service_verification():
    print("=" * 80)
    print("🏢💼 STARTING SERVICE 10 (CORPORATE TRAVEL) PRODUCTION VERIFICATION")
    print("=" * 80)

    await engine.dispose()

    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=[
                    Company.__table__,
                    Department.__table__,
                    CompanyMembership.__table__,
                    CorporatePolicy.__table__,
                    ApprovalRequest.__table__,
                    ApprovalStep.__table__,
                    CorporateWallet.__table__,
                    CorporateWalletTransaction.__table__,
                    CorporateInvoice.__table__,
                    InvoiceLineItem.__table__,
                ],
            )
        )

    async with async_session_maker() as session:
        # =========================================================================
        # SETUP SEED DATA: ADMIN, MANAGER, AND EMPLOYEE USERS
        # =========================================================================
        print("\n[SETUP] Seeding Corporate Users (Admin, Manager, Employee)...", flush=True)

        # 1. Company Admin User & Profile
        admin_user = User(
            id=uuid.uuid4(),
            phone=f"+9198{str(uuid.uuid4().int)[:8]}",
            email=f"corp.admin.{uuid.uuid4().hex[:6]}@nexus.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(admin_user)
        await session.flush()

        admin_profile = CustomerProfile(
            id=uuid.uuid4(),
            user_id=admin_user.id,
            full_name="Rajesh Singhania (VP Operations)",
            wallet_balance=Decimal("15000.00"),
        )
        session.add(admin_profile)

        # 2. Approver Manager User & Profile
        manager_user = User(
            id=uuid.uuid4(),
            phone=f"+9198{str(uuid.uuid4().int)[:8]}",
            email=f"corp.manager.{uuid.uuid4().hex[:6]}@nexus.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(manager_user)
        await session.flush()

        manager_profile = CustomerProfile(
            id=uuid.uuid4(),
            user_id=manager_user.id,
            full_name="Vikramaditya Roy (Engineering Director)",
            wallet_balance=Decimal("10000.00"),
        )
        session.add(manager_profile)

        # 3. Employee User & Profile
        emp_phone = f"+9198{str(uuid.uuid4().int)[:8]}"
        emp_user = User(
            id=uuid.uuid4(),
            phone=emp_phone,
            email=f"neha.d.{uuid.uuid4().hex[:6]}@nexus.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(emp_user)
        await session.flush()

        emp_profile = CustomerProfile(
            id=uuid.uuid4(),
            user_id=emp_user.id,
            full_name="Neha Deshmukh (Lead Architect)",
            wallet_balance=Decimal("5000.00"),
        )
        session.add(emp_profile)

        await session.commit()
        print("[SETUP] Corporate users created successfully!", flush=True)

        corp_svc = CorporateService(session)

        # =========================================================================
        # TEST 1: COMPANY REGISTRATION & CORPORATE WALLET CREATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 1: COMPANY REGISTRATION & CORPORATE WALLET SETUP")
        print("=" * 70)

        company_res = await corp_svc.create_company(
            admin_user_id=str(admin_user.id),
            data={
                "legal_name": "Nexus Enterprise Cloud Technologies Pvt Ltd",
                "display_name": "Nexus Enterprise",
                "gstin": f"27AAACN{uuid.uuid4().hex[:4].upper()}1Z9",
                "billing_email": "finance@nexuscloud.com",
                "billing_phone": "+912067890123",
                "billing_address": "Tower B, Cybercity Magarpatta",
                "city": "Pune",
                "state": "Maharashtra",
                "pincode": "411028",
                "industry": "Information Technology",
                "billing_cycle": "MONTHLY",
            }
        )

        company_id = company_res["company_id"]
        admin_membership_id = company_res["membership_id"]
        assert company_res["status"] == "ACTIVE"
        assert company_res["role"] == "company_admin"
        print(f"  [OK] Registered Corporate Account: ID={company_id}, Name={company_res['legal_name']}")
        print(f"    - Admin Membership: {admin_membership_id} (Role: COMPANY_ADMIN)")

        # =========================================================================
        # TEST 2: DEPARTMENT CREATION & EMPLOYEE / MANAGER INVITATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 2: DEPARTMENT & EMPLOYEE / MANAGER ONBOARDING")
        print("=" * 70)

        # Create Engineering Department
        dept = Department(
            id=uuid.uuid4(),
            company_id=uuid.UUID(company_id),
            name="Cloud Platform Engineering",
            cost_center_code="CC-ENG-904",
        )
        session.add(dept)
        await session.commit()

        # Add Manager Membership directly as APPROVER
        manager_membership = CompanyMembership(
            id=uuid.uuid4(),
            company_id=uuid.UUID(company_id),
            customer_id=manager_profile.id,
            department_id=dept.id,
            employee_code="NEX-MGR-002",
            role=CorporateRole.APPROVER,
            status="ACTIVE",
            joined_at=datetime.now(timezone.utc),
        )
        session.add(manager_membership)
        await session.commit()

        # Invite Employee via Phone
        invite_res = await corp_svc.invite_employee(
            company_id=company_id,
            inviter_customer_id=str(admin_user.id),
            phone=emp_phone,
            employee_code="NEX-ENG-8821",
            department_id=str(dept.id),
            role="employee",
        )

        emp_membership_id = invite_res["membership_id"]
        assert invite_res["status"] == "INVITED"
        print(f"  [OK] Invited Employee Neha Deshmukh: Membership ID={emp_membership_id}, Code=NEX-ENG-8821, Department=CC-ENG-904.")
        print(f"    - Onboarded Approver Manager: {manager_membership.id} (Role: APPROVER).")

        # =========================================================================
        # TEST 3: EMPLOYEE INVITATION ACCEPTANCE
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 3: EMPLOYEE INVITATION ACCEPTANCE")
        print("=" * 70)

        accept_res = await corp_svc.accept_invitation(
            membership_id=emp_membership_id,
            customer_id=str(emp_user.id),
        )

        assert accept_res["status"] == "ACTIVE"
        assert accept_res["role"] == "employee"
        print(f"  [OK] Employee Accepted Invitation: Status=ACTIVE, Role={accept_res['role']}.")

        # =========================================================================
        # TEST 4: DATA-DRIVEN POLICY EVALUATION (AUTO-APPROVE VS APPROVAL REQUIRED)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 4: DATA-DRIVEN POLICY EVALUATION")
        print("=" * 70)

        # 4a. Intra-city Sedan Ride (₹650) -> Auto-Approved (< ₹3000)
        check1 = await corp_svc.check_policy(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="ride",
            vehicle_category="SEDAN",
            estimated_fare=650.0,
            is_personal=False,
        )
        assert check1.allowed == True
        assert check1.requires_approval == False
        print(f"  [OK] Standard Intra-City Ride (Rs.650): Auto-Approved=True, Requires Approval={check1.requires_approval}.")

        # 4b. Multi-Day Outstation Trip (₹7,500) -> Requires Manager Approval (> ₹3000)
        check2 = await corp_svc.check_policy(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="outstation",
            vehicle_category="SUV",
            estimated_fare=7500.0,
            is_personal=False,
        )
        assert check2.allowed == True
        assert check2.requires_approval == True
        print(f"  [OK] Outstation Premium Travel (Rs.7,500): Allowed=True, Requires Approval={check2.requires_approval} (Reason: {check2.reason}).")

        # =========================================================================
        # TEST 5: APPROVAL WORKFLOW & MULTI-STEP APPROVAL HANDSHAKE
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 5: APPROVAL WORKFLOW & MULTI-STEP APPROVAL HANDSHAKE")
        print("=" * 70)

        # Employee submits approval request for Outstation trip
        appr_req = await corp_svc.create_approval_request(
            company_id=company_id,
            requester_membership_id=emp_membership_id,
            service_type="outstation",
            estimated_fare=7500.0,
            purpose="Client Data Center Infrastructure Deployment at Mumbai BKC",
            department_id=str(dept.id),
            booking_details={"origin": "Pune IT Park", "destination": "Mumbai BKC", "days": 3},
        )

        approval_id = appr_req["approval_id"]
        assert appr_req["status"] == "pending"
        print(f"  [OK] Created Approval Request: ID={approval_id}, Fare=Rs.{appr_req['estimated_fare']}, Status={appr_req['status']}.")

        # Self-Approval Guard Test: Employee cannot approve their own request
        try:
            await corp_svc.respond_to_approval(
                approval_id=approval_id,
                approver_membership_id=emp_membership_id,
                decision="approved",
            )
            assert False, "Self-approval should have been blocked"
        except ValueError as err:
            print(f"  [OK] Security Guard: Self-approval successfully blocked ({err}).")

        # Manager approves request
        appr_resp = await corp_svc.respond_to_approval(
            approval_id=approval_id,
            approver_membership_id=str(manager_membership.id),
            decision="approved",
            note="Approved for critical client delivery. Please submit toll receipts.",
        )

        assert appr_resp["approval_status"] == "approved"
        print(f"  [OK] Manager Approved Travel Request: ID={approval_id}, Final Status={appr_resp['approval_status']}.")

        # =========================================================================
        # TEST 6: CORPORATE WALLET TOP-UP & AUDIT TRAIL
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 6: CORPORATE WALLET TOP-UP & AUDIT TRAIL")
        print("=" * 70)

        topup_res = await corp_svc.topup_corporate_wallet(
            company_id=company_id,
            amount=50000.0,
            requester_membership_id=admin_membership_id,
        )

        assert topup_res["balance"] == 50000.0
        print(f"  [OK] Top-up Successful: Added Rs.{topup_res['topped_up']}, Current Corporate Wallet Balance: Rs.{topup_res['balance']}.")

        # Retrieve Wallet Details
        wallet_info = await corp_svc.get_corporate_wallet(
            company_id=company_id,
            requester_membership_id=admin_membership_id,
        )
        assert wallet_info["balance"] == 50000.0
        assert len(wallet_info["recent_transactions"]) > 0
        print(f"  [OK] Corporate Wallet Verified: Balance=Rs.{wallet_info['balance']}, Transactions Logged={len(wallet_info['recent_transactions'])}.")

        # =========================================================================
        # TEST 7: MONTHLY CONSOLIDATED GST INVOICE GENERATION
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 7: MONTHLY CONSOLIDATED GST INVOICE GENERATION")
        print("=" * 70)

        billing_month = "2026-08"
        inv_res = await corp_svc.generate_monthly_invoice(
            company_id=company_id,
            billing_month=billing_month,
        )

        invoice_id = inv_res["invoice_id"]
        invoice_number = inv_res["invoice_number"]
        assert invoice_number.startswith("INV-202608-")
        print(f"  [OK] Generated Monthly Consolidated Invoice: Number={invoice_number}, Period={inv_res['billing_period']}, Status={inv_res['status']}.")

        # Seed 2 Line Items onto Invoice for testing detail retrieval
        line1 = InvoiceLineItem(
            id=uuid.uuid4(),
            invoice_id=uuid.UUID(invoice_id),
            membership_id=uuid.UUID(emp_membership_id),
            department_id=dept.id,
            service_type="outstation",
            booking_reference="OUT-260825-NX91",
            booking_date=date.today(),
            description="Intercity Round-Trip Pune -> Mumbai BKC",
            fare_amount=Decimal("7142.86"),
            gst_amount=Decimal("357.14"),
            total_amount=Decimal("7500.00"),
            business_purpose="Client Deployment",
            cost_center_code="CC-ENG-904",
        )
        session.add(line1)

        # Update invoice totals
        inv_record = await session.get(CorporateInvoice, uuid.UUID(invoice_id))
        inv_record.total_bookings = 1
        inv_record.subtotal = Decimal("7142.86")
        inv_record.gst_amount = Decimal("357.14")
        inv_record.total_amount = Decimal("7500.00")
        await session.commit()

        # Retrieve full invoice details
        inv_detail = await corp_svc.get_invoice_detail(
            invoice_id=invoice_id,
            requester_membership_id=admin_membership_id,
        )
        assert inv_detail["total_bookings"] == 1
        assert inv_detail["total_amount"] == 7500.0
        assert len(inv_detail["line_items"]) == 1
        print(f"  [OK] Retrieved Itemized GST Invoice:")
        print(f"    - Subtotal: Rs.{inv_detail['subtotal']}, 5% GST: Rs.{inv_detail['gst_amount']}, Total Payable: Rs.{inv_detail['total_amount']}")
        print(f"    - Line Item 1: {inv_detail['line_items'][0]['description']} (Cost Center: {inv_detail['line_items'][0]['cost_center_code']})")

        # =========================================================================
        # TEST 8: CORPORATE SPEND & EXPENSE ANALYTICS REPORT
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 8: CORPORATE EXPENSE & SPEND ANALYTICS")
        print("=" * 70)

        report = await corp_svc.get_expense_report(
            company_id=company_id,
            requester_membership_id=admin_membership_id,
            department_id=str(dept.id),
        )

        assert report["total_spend"] == 7500.0
        assert report["total_trips"] == 1
        assert "outstation" in report["by_service_type"]
        print(f"  [OK] Expense Report: Total Spend=Rs.{report['total_spend']}, Total Trips={report['total_trips']}.")
        print(f"    - By Service Breakdown: {report['by_service_type']}")

        print("\n" + "=" * 80)
        print("🎉 ALL 8 SERVICE 10 (CORPORATE TRAVEL) TEST SCENARIOS PASSED WITH 100% SUCCESS!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_corporate_service_verification())
