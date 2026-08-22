import asyncio
import sys, os

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
os.chdir(backend_root)
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, 'common'))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DB_URL = "postgresql+asyncpg://cabooking_user:cabooking_pass@127.0.0.1:5432/cabooking"

statements = [
    # 1. Add fields to ride_requests
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS destination_arrived_at TIMESTAMP WITH TIME ZONE;",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS final_fare NUMERIC(10, 2);",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS driver_earning NUMERIC(10, 2);",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS platform_commission NUMERIC(10, 2);",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'cash';",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'pending';",
    "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10, 2) DEFAULT 0.00;",

    # 2. Create ride_receipts table
    """
    CREATE TABLE IF NOT EXISTS ride_receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE UNIQUE,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receipt_number VARCHAR(50) NOT NULL UNIQUE,
        base_fare NUMERIC(10, 2) NOT NULL,
        distance_km FLOAT NOT NULL,
        distance_charge NUMERIC(10, 2) NOT NULL,
        duration_min INTEGER NOT NULL,
        time_charge NUMERIC(10, 2) NOT NULL,
        waiting_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        stops_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        tolls_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        parking_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        taxes_and_fees NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        surge_multiplier FLOAT NOT NULL DEFAULT 1.0,
        customer_final_fare NUMERIC(10, 2) NOT NULL,
        platform_commission NUMERIC(10, 2) NOT NULL,
        driver_net_earning NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(30) NOT NULL DEFAULT 'cash',
        payment_status VARCHAR(30) NOT NULL DEFAULT 'paid',
        tip_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_ride_receipts_ride_id ON ride_receipts(ride_id);",
    "CREATE INDEX IF NOT EXISTS ix_ride_receipts_driver_id ON ride_receipts(driver_id);",
    "CREATE INDEX IF NOT EXISTS ix_ride_receipts_customer_id ON ride_receipts(customer_id);",

    # 3. Create driver_earning_ledger table
    """
    CREATE TABLE IF NOT EXISTS driver_earning_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        ride_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
        entry_type VARCHAR(40) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        direction VARCHAR(10) NOT NULL DEFAULT 'CREDIT',
        status VARCHAR(20) NOT NULL DEFAULT 'SETTLED',
        description TEXT NOT NULL,
        effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
        metadata_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_driver_earning_ledger_driver_id ON driver_earning_ledger(driver_id);",
    "CREATE INDEX IF NOT EXISTS ix_driver_earning_ledger_ride_id ON driver_earning_ledger(ride_id);",
    "CREATE INDEX IF NOT EXISTS ix_driver_earning_ledger_effective_date ON driver_earning_ledger(effective_date);",
    "CREATE INDEX IF NOT EXISTS ix_driver_earning_ledger_entry_type ON driver_earning_ledger(entry_type);",

    # 4. Create driver_customer_ratings table
    """
    CREATE TABLE IF NOT EXISTS driver_customer_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ride_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE UNIQUE,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating FLOAT NOT NULL,
        tags JSONB DEFAULT '[]'::jsonb,
        feedback TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_driver_customer_ratings_ride_id ON driver_customer_ratings(ride_id);",
    "CREATE INDEX IF NOT EXISTS ix_driver_customer_ratings_customer_id ON driver_customer_ratings(customer_id);",
]

async def run_migration():
    engine = create_async_engine(DB_URL, echo=False)
    print("Executing Feature 13 & 14 DDL migrations...")
    async with engine.begin() as conn:
        for stmt in statements:
            clean = stmt.strip()
            if clean:
                await conn.execute(text(clean))
                print(f"  [✓] Executed: {clean[:50]}...")
    await engine.dispose()
    print("DDL MIGRATION FOR FEATURES 13 & 14 COMPLETED SUCCESSFULLY!")

if __name__ == '__main__':
    asyncio.run(run_migration())
