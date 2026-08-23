"""
DDL Migration for Customer Feature 19: Rental / Hourly Service
Creates: rental_plans, rental_bookings, rental_stops, rental_usage_events
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
    # 1. rental_plans
    """
    CREATE TABLE IF NOT EXISTS rental_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        included_km FLOAT NOT NULL,
        base_price NUMERIC(10, 2) NOT NULL,
        extra_km_rate NUMERIC(8, 2) NOT NULL,
        extra_hour_rate NUMERIC(8, 2) NOT NULL,
        vehicle_category VARCHAR(50) NOT NULL,
        min_custom_minutes INTEGER,
        max_custom_minutes INTEGER,
        gst_percentage FLOAT NOT NULL DEFAULT 5.0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_rental_plans_vehicle ON rental_plans(vehicle_category);",
    "CREATE INDEX IF NOT EXISTS ix_rental_plans_active ON rental_plans(is_active);",

    # 2. rental_bookings
    """
    CREATE TABLE IF NOT EXISTS rental_bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reference VARCHAR(30) UNIQUE NOT NULL,
        customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
        driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
        vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
        plan_id UUID NOT NULL REFERENCES rental_plans(id),
        vehicle_category VARCHAR(50) NOT NULL,
        custom_duration_minutes INTEGER,
        pickup_address TEXT NOT NULL,
        pickup_lat FLOAT NOT NULL,
        pickup_lng FLOAT NOT NULL,
        actual_start_time TIMESTAMPTZ,
        actual_end_time TIMESTAMPTZ,
        planned_end_time TIMESTAMPTZ,
        included_km FLOAT NOT NULL,
        actual_km FLOAT NOT NULL DEFAULT 0.0,
        extra_km FLOAT NOT NULL DEFAULT 0.0,
        planned_duration_minutes INTEGER NOT NULL,
        actual_duration_minutes INTEGER,
        extra_duration_minutes INTEGER NOT NULL DEFAULT 0,
        base_plan_fare NUMERIC(10, 2) NOT NULL,
        extra_km_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        extra_hour_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        toll_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
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
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        cancelled_reason VARCHAR(255),
        refund_amount NUMERIC(10, 2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_rental_bookings_reference ON rental_bookings(reference);",
    "CREATE INDEX IF NOT EXISTS ix_rental_bookings_customer ON rental_bookings(customer_id);",
    "CREATE INDEX IF NOT EXISTS ix_rental_bookings_driver ON rental_bookings(driver_id);",
    "CREATE INDEX IF NOT EXISTS ix_rental_bookings_status ON rental_bookings(status);",
    "CREATE INDEX IF NOT EXISTS ix_rental_bookings_company ON rental_bookings(company_id);",

    # 3. rental_stops
    """
    CREATE TABLE IF NOT EXISTS rental_stops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES rental_bookings(id) ON DELETE CASCADE,
        stop_order INTEGER NOT NULL,
        address TEXT NOT NULL,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        arrived_at TIMESTAMPTZ,
        departed_at TIMESTAMPTZ,
        waiting_minutes INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_rental_stops_booking_id ON rental_stops(booking_id);",

    # 4. rental_usage_events
    """
    CREATE TABLE IF NOT EXISTS rental_usage_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES rental_bookings(id) ON DELETE CASCADE,
        event_type VARCHAR(30) NOT NULL,
        latitude FLOAT,
        longitude FLOAT,
        km_at_event FLOAT NOT NULL DEFAULT 0.0,
        elapsed_minutes INTEGER NOT NULL DEFAULT 0,
        notes VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_rental_usage_events_booking_id ON rental_usage_events(booking_id);",
    "CREATE INDEX IF NOT EXISTS ix_rental_usage_events_type ON rental_usage_events(event_type);",
]


async def migrate():
    print("=" * 70)
    print("🕐 MIGRATING CUSTOMER FEATURE 19: RENTAL / HOURLY SERVICE TABLES")
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

    print("\n✅ Feature 19 Rental DDL migration complete!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
