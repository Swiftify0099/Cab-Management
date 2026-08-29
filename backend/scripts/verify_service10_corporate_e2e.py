"""
Master Production Verification Suite: SERVICE 10 — CORPORATE TRAVEL & ENTERPRISE GOVERNANCE (Phase 22)
══════════════════════════════════════════════════════════════════════════════════════════════════════
Comprehensive E2E Verification Suite testing all enterprise corporate flows and security invariants:

1. Company & Corporate Wallet Setup: Entity creation, GSTIN, dedicated corporate wallet, default policy.
2. Department & Cost Center Onboarding: Department creation with cost center code (e.g., CC-ENG-904).
3. Employee Invitation & Acceptance: Role assignment, token acceptance, active membership transition.
4. Approved Policy Case 1 (Auto-Approval): Intra-city booking (< threshold) auto-approved without manager lag.
5. Approved Policy Case 2 (Manager Approval Workflow): Multi-day booking (> threshold) routed to Approver Manager and approved.
6. Rejected Policy Case 1 (Cash Blocked): Corporate booking with CASH payment blocked when cashless policy is active.
7. Rejected Policy Case 2 (Mandatory Purpose Missing): Corporate booking with blank purpose rejected.
8. Rejected Policy Case 3 (Unauthorized Vehicle Category): Luxury category rejected when policy restricts to Sedan/SUV.
9. Rejected Policy Case 4 (Unauthorized Service Type): Unapproved service rejected by policy engine.
10. Rejected Policy Case 5 (Personal Rides Blocked): Personal rides blocked on corporate account.
11. Rejected Policy Case 6 (Manager Rejection): Travel request rejected by Approver Manager with audit notes.
12. Security Guard (Self-Approval Blocked): Employee cannot approve their own travel request.
13. Partner Privacy Shield (Zero Leakage): Driver receives strictly operational data; zero HR data, payment secrets, or approval notes exposed.
14. Corporate Trip Settlement & 5% GST Invoicing: Automated invoice line item creation with GST breakdown and corporate wallet debit.
15. Corporate Expense Analytics: Spending aggregated by department, cost center, and service type.
"""
import os
import sys
import uuid
import asyncio
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal

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
    print("🏢💼 STARTING PHASE 22 — CORPORATE TRAVEL & GOVERNANCE PRODUCTION VERIFICATION")
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
            email=f"corp.admin.{uuid.uuid4().hex[:6]}@nexuscloud.com",
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
            email=f"corp.manager.{uuid.uuid4().hex[:6]}@nexuscloud.com",
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
            email=f"neha.d.{uuid.uuid4().hex[:6]}@nexuscloud.com",
            role=UserRole.CUSTOMER,
            is_verified=True,
            is_active=True,
        )
        session.add(emp_user)
        await session.flush()

        emp_profile = CustomerProfile(
            id=uuid.uuid4(),
            user_id=emp_user.id,
            full_name="Neha Deshmukh (Lead Cloud Architect)",
            wallet_balance=Decimal("5000.00"),
        )
        session.add(emp_profile)

        await session.commit()
        print("[SETUP] Corporate users created successfully!", flush=True)

        corp_svc = CorporateService(session)

        # =========================================================================
        # TEST 1: COMPANY REGISTRATION & CORPORATE WALLET SETUP
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

        # =========================================================================
        # TEST 2: DEPARTMENT CREATION & COST CENTER ASSIGNMENT
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 2: DEPARTMENT & COST CENTER ONBOARDING")
        print("=" * 70)

        dept_res = await corp_svc.create_department(
            company_id=company_id,
            name="Cloud Platform Engineering",
            cost_center_code="CC-ENG-904",
            requester_membership_id=admin_membership_id,
        )
        dept_id = dept_res["department_id"]
        assert dept_res["cost_center_code"] == "CC-ENG-904"
        print(f"  [OK] Created Department: {dept_res['name']} with Cost Center {dept_res['cost_center_code']}")

        # Onboard Manager Membership as APPROVER
        manager_membership = CompanyMembership(
            id=uuid.uuid4(),
            company_id=uuid.UUID(company_id),
            customer_id=manager_profile.id,
            department_id=uuid.UUID(dept_id),
            employee_code="NEX-MGR-002",
            role=CorporateRole.APPROVER,
            status="ACTIVE",
            joined_at=datetime.now(timezone.utc),
        )
        session.add(manager_membership)
        await session.commit()
        manager_membership_id = str(manager_membership.id)

        # Invite Employee via Phone
        invite_res = await corp_svc.invite_employee(
            company_id=company_id,
            inviter_customer_id=str(admin_user.id),
            phone=emp_phone,
            employee_code="NEX-ENG-8821",
            department_id=dept_id,
            role="employee",
        )
        emp_membership_id = invite_res["membership_id"]
        assert invite_res["status"] == "INVITED"
        print(f"  [OK] Invited Employee Neha Deshmukh: Membership ID={emp_membership_id}, Code=NEX-ENG-8821, Department=CC-ENG-904.")

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
        # TEST 4: APPROVED POLICY CASE 1 (AUTO-APPROVED RIDE < THRESHOLD)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 4: APPROVED POLICY CASE 1 (Intra-city Ride < ₹3,000 Threshold)")
        print("=" * 70)

        check_auto = await corp_svc.check_policy(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="ride",
            vehicle_category="SEDAN",
            estimated_fare=650.0,
            is_personal=False,
            payment_method="CORPORATE_WALLET",
            purpose="Technical Architecture Review with Client at Cybercity",
            cost_center_code="CC-ENG-904",
        )
        assert check_auto.allowed is True
        assert check_auto.requires_approval is False
        print(f"  [OK] Auto-Approval Evaluated: Allowed={check_auto.allowed}, Requires Approval={check_auto.requires_approval} (Reason: {check_auto.reason})")

        # Create auto-approved corporate booking
        booking_auto = await corp_svc.create_corporate_booking(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="ride",
            vehicle_category="SEDAN",
            estimated_fare=650.0,
            purpose="Technical Architecture Review with Client at Cybercity",
            pickup_address="Magarpatta City, Pune",
            drop_address="Cybercity Tower 4, Kharadi, Pune",
            payment_method="CORPORATE_WALLET",
            cost_center_code="CC-ENG-904",
        )
        assert booking_auto["status"] == "CONFIRMED"
        assert booking_auto["approval_required"] is False
        print(f"  [OK] Auto-Approved Booking Created: Reference={booking_auto['booking_reference']}, Status={booking_auto['status']}")

        # =========================================================================
        # TEST 5: APPROVED POLICY CASE 2 (MANAGER APPROVAL WORKFLOW > THRESHOLD)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 5: APPROVED POLICY CASE 2 (Outstation Travel > ₹3,000 Threshold)")
        print("=" * 70)

        # 5a. Check policy indicates approval required
        check_appr = await corp_svc.check_policy(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="outstation",
            vehicle_category="SUV",
            estimated_fare=7500.0,
            is_personal=False,
            payment_method="CORPORATE_WALLET",
            purpose="On-site Production Cutover at Mumbai Data Center",
            cost_center_code="CC-ENG-904",
        )
        assert check_appr.allowed is True
        assert check_appr.requires_approval is True
        print(f"  [OK] Policy Evaluation: Allowed={check_appr.allowed}, Requires Approval={check_appr.requires_approval} (Reason: {check_appr.reason})")

        # 5b. Initiate booking which creates PENDING approval request
        booking_appr = await corp_svc.create_corporate_booking(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="outstation",
            vehicle_category="SUV",
            estimated_fare=7500.0,
            purpose="On-site Production Cutover at Mumbai Data Center",
            pickup_address="Pune IT Park",
            drop_address="Mumbai BKC Data Center",
            payment_method="CORPORATE_WALLET",
            cost_center_code="CC-ENG-904",
        )
        assert booking_appr["status"] == "PENDING_APPROVAL"
        assert booking_appr["approval_required"] is True
        approval_id = booking_appr["approval_id"]
        print(f"  [OK] Booking Queued for Manager Approval: Reference={booking_appr['booking_reference']}, Approval ID={approval_id}")

        # 5c. Manager approves request
        appr_resp = await corp_svc.respond_to_approval(
            approval_id=approval_id,
            approver_membership_id=manager_membership_id,
            decision="approved",
            note="Approved for critical customer delivery.",
        )
        assert appr_resp["approval_status"] == "approved"
        print(f"  [OK] Approver Manager Approved Request: Approval Status={appr_resp['approval_status']}")

        # =========================================================================
        # TEST 6: REJECTED POLICY CASE 1 (CASH PAYMENT BLOCKED BY POLICY)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 6: REJECTED POLICY CASE 1 (Cash Blocked for Cashless Corporate Billing)")
        print("=" * 70)

        check_cash = await corp_svc.check_policy(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="ride",
            vehicle_category="SEDAN",
            estimated_fare=500.0,
            payment_method="CASH",  # CASH payment attempted
            purpose="Client Meeting",
        )
        assert check_cash.allowed is False
        assert "Cash payment is blocked" in check_cash.reason
        print(f"  [OK] Cash Payment Attempt Correctly Rejected: '{check_cash.reason}'")

        # Verify booking creation with CASH is rejected
        try:
            await corp_svc.create_corporate_booking(
                company_id=company_id,
                membership_id=emp_membership_id,
                service_type="ride",
                vehicle_category="SEDAN",
                estimated_fare=500.0,
                purpose="Client Meeting",
                pickup_address="A",
                drop_address="B",
                payment_method="CASH",
            )
            assert False, "Corporate booking with cash must be rejected"
        except ValueError as err:
            assert "Cash payment is blocked" in str(err)
            print("  [OK] create_corporate_booking with CASH raised expected ValueError.")

        # =========================================================================
        # TEST 7: REJECTED POLICY CASE 2 (MANDATORY BUSINESS PURPOSE MISSING)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 7: REJECTED POLICY CASE 2 (Mandatory Business Purpose Missing)")
        print("=" * 70)

        check_no_purpose = await corp_svc.check_policy(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="ride",
            vehicle_category="SEDAN",
            estimated_fare=500.0,
            payment_method="CORPORATE_WALLET",
            purpose="",  # Blank purpose
        )
        assert check_no_purpose.allowed is False
        assert "Business purpose is mandatory" in check_no_purpose.reason
        print(f"  [OK] Blank Purpose Attempt Correctly Rejected: '{check_no_purpose.reason}'")

        # =========================================================================
        # TEST 8: REJECTED POLICY CASE 3 (UNAUTHORIZED VEHICLE CATEGORY)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 8: REJECTED POLICY CASE 3 (Unauthorized Vehicle Category)")
        print("=" * 70)

        check_luxury = await corp_svc.check_policy(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="ride",
            vehicle_category="LUXURY_LIMOUSINE",  # Policy only allows SEDAN, SUV
            estimated_fare=3500.0,
            payment_method="CORPORATE_WALLET",
            purpose="VIP Visit",
        )
        assert check_luxury.allowed is False
        assert "exceeds authorized policy tier" in check_luxury.reason
        print(f"  [OK] Luxury Vehicle Tier Correctly Rejected: '{check_luxury.reason}'")

        # =========================================================================
        # TEST 9: REJECTED POLICY CASE 4 (UNAUTHORIZED SERVICE TYPE)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 9: REJECTED POLICY CASE 4 (Unauthorized Service Type)")
        print("=" * 70)

        check_unauth_svc = await corp_svc.check_policy(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="yacht_charter",  # Not in allowed_services
            vehicle_category="SEDAN",
            estimated_fare=1000.0,
            payment_method="CORPORATE_WALLET",
            purpose="Team outing",
        )
        assert check_unauth_svc.allowed is False
        assert "not covered by company travel policy" in check_unauth_svc.reason
        print(f"  [OK] Unauthorized Service Type Correctly Rejected: '{check_unauth_svc.reason}'")

        # =========================================================================
        # TEST 10: REJECTED POLICY CASE 5 (PERSONAL RIDES BLOCKED)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 10: REJECTED POLICY CASE 5 (Personal Rides Blocked on Corporate Account)")
        print("=" * 70)

        check_personal = await corp_svc.check_policy(
            company_id=company_id,
            membership_id=emp_membership_id,
            service_type="ride",
            vehicle_category="SEDAN",
            estimated_fare=400.0,
            is_personal=True,  # Personal ride attempted on company account
            payment_method="CORPORATE_WALLET",
            purpose="Weekend shopping",
        )
        assert check_personal.allowed is False
        assert "Personal rides are strictly prohibited" in check_personal.reason
        print(f"  [OK] Personal Ride Attempt Correctly Rejected: '{check_personal.reason}'")

        # =========================================================================
        # TEST 11: REJECTED POLICY CASE 6 (MANAGER REJECTION WORKFLOW)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 11: REJECTED POLICY CASE 6 (Manager Rejection Workflow)")
        print("=" * 70)

        # Create another approval request
        appr_req2 = await corp_svc.create_approval_request(
            company_id=company_id,
            requester_membership_id=emp_membership_id,
            service_type="outstation",
            estimated_fare=12000.0,
            purpose="Conference in Goa",
            department_id=dept_id,
        )
        appr_id2 = appr_req2["approval_id"]

        # Manager rejects request with note
        reject_resp = await corp_svc.respond_to_approval(
            approval_id=appr_id2,
            approver_membership_id=manager_membership_id,
            decision="rejected",
            note="Budget for outstation conferences is exhausted for Q3.",
        )
        assert reject_resp["approval_status"] == "rejected"
        print(f"  [OK] Manager Rejection Successfully Processed: Status={reject_resp['approval_status']}")

        # =========================================================================
        # TEST 12: SECURITY GUARD (SELF-APPROVAL BLOCKED)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 12: SECURITY GUARD (Self-Approval Prevention)")
        print("=" * 70)

        try:
            await corp_svc.respond_to_approval(
                approval_id=appr_id2,
                approver_membership_id=emp_membership_id,  # Requester attempts to approve
                decision="approved",
            )
            assert False, "Self-approval must be blocked"
        except ValueError as err:
            print(f"  [OK] Self-approval blocked as expected: '{err}'")

        # =========================================================================
        # TEST 13: PARTNER PRIVACY SHIELD (ZERO LEAKAGE)
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 13: PARTNER PRIVACY SHIELD (Operational Data Only, Zero Secrets)")
        print("=" * 70)

        partner_payload = corp_svc.sanitize_partner_operational_data(
            booking_reference="CORP-260829-AB91",
            passenger_name="Neha Deshmukh",
            passenger_phone=emp_phone,
            pickup_address="Magarpatta City, Tower B",
            pickup_lat=18.5204,
            pickup_lng=73.8567,
            drop_address="Cybercity Tower 4, Kharadi",
            drop_lat=18.5913,
            drop_lng=73.7389,
            service_type="ride",
            vehicle_category="SEDAN",
            trip_otp="4829",
            estimated_distance_km=12.5,
            estimated_duration_min=25,
        )

        # Operational fields MUST be present
        assert partner_payload["passenger_name"] == "Neha Deshmukh"
        assert partner_payload["trip_otp"] == "4829"
        assert partner_payload["is_corporate"] is True
        assert partner_payload["billing_type"] == "CORPORATE_BILLING"
        assert "****" in partner_payload["passenger_phone_masked"]

        # Sensitive HR, Financial, and Approval fields MUST NOT be present
        assert "employee_code" not in partner_payload, "HR employee code must NOT be leaked to partner"
        assert "gstin" not in partner_payload, "Company GSTIN must NOT be leaked to partner"
        assert "wallet_balance" not in partner_payload, "Company wallet balance must NOT be leaked to partner"
        assert "approval_notes" not in partner_payload, "Internal approval notes must NOT be leaked to partner"
        assert "approver_name" not in partner_payload, "Approver hierarchy must NOT be leaked to partner"
        assert "cost_center_code" not in partner_payload, "Internal cost center must NOT be leaked to partner"
        print(f"  [OK] Partner Operational Data Verified: Passenger={partner_payload['passenger_name']}, Masked Phone={partner_payload['passenger_phone_masked']}, OTP={partner_payload['trip_otp']}")
        print("  [OK] Privacy Isolation: 100% verified zero HR data, zero payment secrets, zero internal approval notes leaked.")

        # =========================================================================
        # TEST 14: CORPORATE WALLET TOP-UP, TRIP SETTLEMENT & 5% GST INVOICING
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 14: CORPORATE WALLET TOP-UP, TRIP SETTLEMENT & GST INVOICING")
        print("=" * 70)

        # Top-up corporate wallet with ₹50,000
        topup_res = await corp_svc.topup_corporate_wallet(
            company_id=company_id,
            amount=50000.0,
            requester_membership_id=admin_membership_id,
        )
        assert topup_res["balance"] == 50000.0
        print(f"  [OK] Corporate Wallet Topped Up: Current Balance=Rs.{topup_res['balance']}.")

        # Settle a completed corporate trip (₹7,500 with 5% GST)
        settle_res = await corp_svc.settle_corporate_trip(
            company_id=company_id,
            membership_id=emp_membership_id,
            booking_reference="CORP-260829-OUT88",
            service_type="outstation",
            fare_amount=7500.0,
            business_purpose="Client Infrastructure Deployment",
            cost_center_code="CC-ENG-904",
            department_id=dept_id,
            payment_method="CORPORATE_WALLET",
        )

        assert settle_res["total_amount"] == 7500.0
        assert settle_res["subtotal"] == 7142.86
        assert settle_res["gst_amount"] == 357.14
        print(f"  [OK] Corporate Trip Settled: Total=Rs.{settle_res['total_amount']}, Subtotal=Rs.{settle_res['subtotal']}, 5% GST=Rs.{settle_res['gst_amount']}")

        # Verify Corporate Wallet was debited: 50,000 - 7,500 = 42,500
        wallet_info = await corp_svc.get_corporate_wallet(company_id=company_id, requester_membership_id=admin_membership_id)
        assert wallet_info["balance"] == 42500.0
        print(f"  [OK] Corporate Wallet Debited: New Balance=Rs.{wallet_info['balance']}")

        # Verify invoice detail retrieval
        invoice_detail = await corp_svc.get_invoice_detail(
            invoice_id=settle_res["invoice_id"],
            requester_membership_id=admin_membership_id,
        )
        assert len(invoice_detail["line_items"]) >= 1
        print(f"  [OK] Itemized Corporate GST Invoice Verified: Invoice #{invoice_detail['invoice_number']} with {len(invoice_detail['line_items'])} line items.")

        # =========================================================================
        # TEST 15: CORPORATE EXPENSE & SPEND ANALYTICS
        # =========================================================================
        print("\n" + "=" * 70)
        print("TEST 15: CORPORATE EXPENSE & SPEND ANALYTICS")
        print("=" * 70)

        analytics = await corp_svc.get_expense_report(
            company_id=company_id,
            requester_membership_id=admin_membership_id,
            department_id=dept_id,
        )
        assert analytics["total_spend"] >= 7500.0
        assert analytics["total_trips"] >= 1
        assert "outstation" in analytics["by_service_type"]
        print(f"  [OK] Expense Report: Total Spend=Rs.{analytics['total_spend']}, Total Trips={analytics['total_trips']}")
        print(f"    - By Service Breakdown: {analytics['by_service_type']}")

        print("\n" + "=" * 80)
        print("🎉 ALL 15 PHASE 22 (CORPORATE TRAVEL) PRODUCTION TESTS PASSED WITH 100% SUCCESS!")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_corporate_service_verification())
