"""
DDL Migration for Customer Feature 20: Outstation / Intercity Service
Creates: outstation_bookings, outstation_legs, outstation_waypoints, outstation_charges
Also creates the companies, departments, company_memberships tables needed by Feature 21
since rental_bookings and outstation_bookings reference them.
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
    # ── Feature 21 Corporate base tables (needed as FKs by outstation/rental) ──

    # 1. companies
    """
    CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        legal_name VARCHAR(255) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        gstin VARCHAR(20) UNIQUE,
        billing_email VARCHAR(255) NOT NULL,
        billing_phone VARCHAR(15),
        billing_address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(50) NOT NULL DEFAULT 'India',
        pincode VARCHAR(10),
        timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
        billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        logo_url VARCHAR(512),
        industry VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_companies_status ON companies(status);",
    "CREATE INDEX IF NOT EXISTS ix_companies_legal_name ON companies(legal_name);",

    # 2. departments (created before memberships so FK works)
    """
    CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        cost_center_code VARCHAR(50),
        manager_membership_id UUID,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_departments_company_id ON departments(company_id);",

    # 3. company_memberships
    """
    CREATE TABLE IF NOT EXISTS company_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
        employee_code VARCHAR(50),
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        role VARCHAR(30) NOT NULL DEFAULT 'employee',
        status VARCHAR(20) NOT NULL DEFAULT 'INVITED',
        joined_at TIMESTAMPTZ,
        invited_by_membership_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_company_membership UNIQUE (company_id, customer_id)
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_company_memberships_company ON company_memberships(company_id);",
    "CREATE INDEX IF NOT EXISTS ix_company_memberships_customer ON company_memberships(customer_id);",
    "CREATE INDEX IF NOT EXISTS ix_company_memberships_status ON company_memberships(status);",

    # Now add FK from departments to memberships (manager) — safe idempotent
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_dept_manager'
        ) THEN
            ALTER TABLE departments
            ADD CONSTRAINT fk_dept_manager
            FOREIGN KEY (manager_membership_id)
            REFERENCES company_memberships(id) ON DELETE SET NULL;
        END IF;
    END$$;
    """,

    # ── Feature 20: Outstation tables ──

    # 4. outstation_bookings
    """
    CREATE TABLE IF NOT EXISTS outstation_bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reference VARCHAR(30) UNIQUE NOT NULL,
        customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
        driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
        journey_type VARCHAR(20) NOT NULL,
        vehicle_category VARCHAR(50) NOT NULL,
        passenger_count INTEGER NOT NULL DEFAULT 1,
        luggage_count INTEGER NOT NULL DEFAULT 0,
        origin_address TEXT NOT NULL,
        origin_lat FLOAT NOT NULL,
        origin_lng FLOAT NOT NULL,
        final_destination_address TEXT NOT NULL,
        final_destination_lat FLOAT NOT NULL,
        final_destination_lng FLOAT NOT NULL,
        scheduled_departure TIMESTAMPTZ NOT NULL,
        return_scheduled_at TIMESTAMPTZ,
        estimated_distance_km FLOAT NOT NULL,
        estimated_duration_hours FLOAT NOT NULL,
        actual_distance_km FLOAT,
        included_km FLOAT,
        base_fare NUMERIC(10, 2) NOT NULL,
        toll_estimate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        state_tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        night_halt_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        driver_allowance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        extra_km_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        parking_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        gst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        estimated_fare NUMERIC(10, 2) NOT NULL,
        final_fare NUMERIC(10, 2),
        payment_method VARCHAR(50) NOT NULL DEFAULT 'WALLET',
        payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        promo_code VARCHAR(30),
        company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
        membership_id UUID REFERENCES company_memberships(id) ON DELETE SET NULL,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        approval_request_id UUID,
        is_business_trip BOOLEAN NOT NULL DEFAULT FALSE,
        business_purpose VARCHAR(255),
        status VARCHAR(30) NOT NULL DEFAULT 'confirmed',
        cancelled_reason VARCHAR(255),
        refund_amount NUMERIC(10, 2),
        special_instructions TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_outstation_bookings_reference ON outstation_bookings(reference);",
    "CREATE INDEX IF NOT EXISTS ix_outstation_bookings_customer ON outstation_bookings(customer_id);",
    "CREATE INDEX IF NOT EXISTS ix_outstation_bookings_driver ON outstation_bookings(driver_id);",
    "CREATE INDEX IF NOT EXISTS ix_outstation_bookings_status ON outstation_bookings(status);",
    "CREATE INDEX IF NOT EXISTS ix_outstation_bookings_departure ON outstation_bookings(scheduled_departure);",
    "CREATE INDEX IF NOT EXISTS ix_outstation_bookings_company ON outstation_bookings(company_id);",

    # 5. outstation_legs
    """
    CREATE TABLE IF NOT EXISTS outstation_legs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES outstation_bookings(id) ON DELETE CASCADE,
        leg_order INTEGER NOT NULL,
        leg_type VARCHAR(30) NOT NULL,
        origin_address TEXT NOT NULL,
        origin_lat FLOAT NOT NULL,
        origin_lng FLOAT NOT NULL,
        destination_address TEXT NOT NULL,
        destination_lat FLOAT NOT NULL,
        destination_lng FLOAT NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        estimated_km FLOAT NOT NULL,
        actual_km FLOAT,
        estimated_duration_hours FLOAT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_outstation_legs_booking_id ON outstation_legs(booking_id);",
    "CREATE INDEX IF NOT EXISTS ix_outstation_legs_status ON outstation_legs(status);",

    # 6. outstation_waypoints
    """
    CREATE TABLE IF NOT EXISTS outstation_waypoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        leg_id UUID NOT NULL REFERENCES outstation_legs(id) ON DELETE CASCADE,
        waypoint_order INTEGER NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        arrived_at TIMESTAMPTZ,
        stop_duration_minutes INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_outstation_waypoints_leg_id ON outstation_waypoints(leg_id);",

    # 7. outstation_charges
    """
    CREATE TABLE IF NOT EXISTS outstation_charges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES outstation_bookings(id) ON DELETE CASCADE,
        charge_type VARCHAR(30) NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        description VARCHAR(255),
        evidence_url VARCHAR(512),
        is_customer_approved BOOLEAN NOT NULL DEFAULT TRUE,
        is_driver_earning BOOLEAN NOT NULL DEFAULT FALSE,
        state_name VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_outstation_charges_booking_id ON outstation_charges(booking_id);",
    "CREATE INDEX IF NOT EXISTS ix_outstation_charges_type ON outstation_charges(charge_type);",
]


async def migrate():
    print("=" * 70)
    print("🌍 MIGRATING CUSTOMER FEATURE 20: OUTSTATION / INTERCITY SERVICE TABLES")
    print("    (+ Corporate base tables: companies, departments, memberships)")
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

    print("\n✅ Feature 20 Outstation DDL migration complete!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
