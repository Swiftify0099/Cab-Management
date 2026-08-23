"""
DDL Migration for Customer Feature 21: Corporate Customer
Creates: corporate_policies, approval_requests, approval_steps, corporate_payment_methods,
         corporate_wallets, corporate_wallet_transactions, corporate_invoices, invoice_line_items
(companies, departments, company_memberships were created in Feature 20 migration)
"""
import asyncio
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)

from common.database import async_session_maker, engine
from sqlalchemy import text


STATEMENTS = [
    # 1. corporate_policies
    """
    CREATE TABLE IF NOT EXISTS corporate_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        policy_name VARCHAR(100) NOT NULL,
        applies_to_role VARCHAR(50),
        applies_to_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        allowed_services JSONB NOT NULL DEFAULT '["ride"]'::jsonb,
        allowed_vehicle_categories JSONB NOT NULL DEFAULT '["SEDAN"]'::jsonb,
        max_fare_auto_approve NUMERIC(10, 2) NOT NULL DEFAULT 2000.00,
        require_approval_above NUMERIC(10, 2) NOT NULL DEFAULT 2000.00,
        require_purpose BOOLEAN NOT NULL DEFAULT TRUE,
        personal_rides_allowed BOOLEAN NOT NULL DEFAULT FALSE,
        allowed_booking_hours_start INTEGER,
        allowed_booking_hours_end INTEGER,
        outstation_allowed BOOLEAN NOT NULL DEFAULT TRUE,
        rental_max_hours INTEGER,
        hotel_allowed BOOLEAN NOT NULL DEFAULT TRUE,
        airport_allowed BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_corporate_policies_company ON corporate_policies(company_id);",
    "CREATE INDEX IF NOT EXISTS ix_corporate_policies_active ON corporate_policies(is_active);",

    # 2. approval_requests
    """
    CREATE TABLE IF NOT EXISTS approval_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        requester_membership_id UUID NOT NULL REFERENCES company_memberships(id) ON DELETE CASCADE,
        service_type VARCHAR(50) NOT NULL,
        booking_reference VARCHAR(50),
        estimated_fare NUMERIC(10, 2) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        booking_details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMPTZ NOT NULL,
        approved_at TIMESTAMPTZ,
        rejected_at TIMESTAMPTZ,
        final_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_approval_requests_company ON approval_requests(company_id);",
    "CREATE INDEX IF NOT EXISTS ix_approval_requests_requester ON approval_requests(requester_membership_id);",
    "CREATE INDEX IF NOT EXISTS ix_approval_requests_status ON approval_requests(status);",

    # 3. approval_steps
    """
    CREATE TABLE IF NOT EXISTS approval_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
        approver_membership_id UUID NOT NULL REFERENCES company_memberships(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL DEFAULT 1,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        responded_at TIMESTAMPTZ,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_approval_steps_request_id ON approval_steps(approval_request_id);",
    "CREATE INDEX IF NOT EXISTS ix_approval_steps_approver ON approval_steps(approver_membership_id);",
    "CREATE INDEX IF NOT EXISTS ix_approval_steps_status ON approval_steps(status);",

    # 4. corporate_payment_methods
    """
    CREATE TABLE IF NOT EXISTS corporate_payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        payment_type VARCHAR(30) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last4 VARCHAR(4),
        card_network VARCHAR(20),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_corp_payment_methods_company ON corporate_payment_methods(company_id);",

    # 5. corporate_wallets
    """
    CREATE TABLE IF NOT EXISTS corporate_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
        balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(5) NOT NULL DEFAULT 'INR',
        last_topped_up_at TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_corporate_wallets_company ON corporate_wallets(company_id);",

    # 6. corporate_wallet_transactions
    """
    CREATE TABLE IF NOT EXISTS corporate_wallet_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id UUID NOT NULL REFERENCES corporate_wallets(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        direction VARCHAR(10) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        balance_after NUMERIC(14, 2) NOT NULL,
        description VARCHAR(255) NOT NULL,
        booking_reference VARCHAR(50),
        membership_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_corp_wallet_txns_wallet ON corporate_wallet_transactions(wallet_id);",
    "CREATE INDEX IF NOT EXISTS ix_corp_wallet_txns_company ON corporate_wallet_transactions(company_id);",

    # 7. corporate_invoices
    """
    CREATE TABLE IF NOT EXISTS corporate_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        billing_period_start DATE NOT NULL,
        billing_period_end DATE NOT NULL,
        total_bookings INTEGER NOT NULL DEFAULT 0,
        subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        gst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        due_date DATE,
        paid_at TIMESTAMPTZ,
        pdf_url VARCHAR(512),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_corporate_invoices_company ON corporate_invoices(company_id);",
    "CREATE INDEX IF NOT EXISTS ix_corporate_invoices_number ON corporate_invoices(invoice_number);",
    "CREATE INDEX IF NOT EXISTS ix_corporate_invoices_status ON corporate_invoices(status);",

    # 8. invoice_line_items
    """
    CREATE TABLE IF NOT EXISTS invoice_line_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES corporate_invoices(id) ON DELETE CASCADE,
        membership_id UUID NOT NULL REFERENCES company_memberships(id) ON DELETE CASCADE,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        service_type VARCHAR(50) NOT NULL,
        booking_reference VARCHAR(50) NOT NULL,
        booking_date DATE NOT NULL,
        description VARCHAR(255) NOT NULL,
        fare_amount NUMERIC(10, 2) NOT NULL,
        gst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        total_amount NUMERIC(10, 2) NOT NULL,
        business_purpose VARCHAR(255),
        cost_center_code VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_invoice_line_items_invoice ON invoice_line_items(invoice_id);",
    "CREATE INDEX IF NOT EXISTS ix_invoice_line_items_membership ON invoice_line_items(membership_id);",
    "CREATE INDEX IF NOT EXISTS ix_invoice_line_items_dept ON invoice_line_items(department_id);",
]


async def migrate():
    print("=" * 70)
    print("🏢 MIGRATING CUSTOMER FEATURE 21: CORPORATE CUSTOMER TABLES")
    print("=" * 70)

    async with async_session_maker() as session:
        for i, stmt in enumerate(STATEMENTS, 1):
            cleaned = stmt.strip()
            title = cleaned.split("\n")[0] if "\n" in cleaned else cleaned[:60]
            print(f"[{i}/{len(STATEMENTS)}] {title[:65]}...")
            try:
                await session.execute(text(cleaned))
                await session.commit()
                print(f"  ✓ OK")
            except Exception as e:
                print(f"  ❌ Error: {e}")
                await session.rollback()
                raise

    print("\n✅ Feature 21 Corporate DDL migration complete!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
