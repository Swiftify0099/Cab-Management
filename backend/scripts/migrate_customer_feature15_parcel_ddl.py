"""
Idempotent DDL Migration for Feature 15:
Parcel Service & Multi-Bucket Customer Profiles.
Ensures all columns and tables exist in PostgreSQL database.
"""
import asyncio
import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
_COMMON_DIR = os.path.join(_BACKEND_DIR, "common")
if _COMMON_DIR not in sys.path:
    sys.path.insert(0, _COMMON_DIR)

from sqlalchemy import text
from common.database import engine

DDL_STATEMENTS = [
    # 1. Customer profiles multi-bucket columns
    """
    ALTER TABLE customer_profiles
    ADD COLUMN IF NOT EXISTS promo_credit_balance NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS referral_reward_balance NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS pending_refund_balance NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5.00,
    ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
    """,

    # 2. Driver profiles earnings and trips
    """
    ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_trips INTEGER DEFAULT 0;
    """,

    # 3. Vehicle parcel capabilities
    """
    ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS parcel_capable BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS parcel_capacity_kg FLOAT DEFAULT 20.0;
    """,

    # 4. Parcels table enrichment
    """
    ALTER TABLE parcels
    ALTER COLUMN status TYPE VARCHAR(50) USING status::text,
    ADD COLUMN IF NOT EXISTS booking_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS sender_address TEXT,
    ADD COLUMN IF NOT EXISTS sender_lat FLOAT,
    ADD COLUMN IF NOT EXISTS sender_lng FLOAT,
    ADD COLUMN IF NOT EXISTS sender_location geography(Point, 4326),
    ADD COLUMN IF NOT EXISTS pickup_instructions TEXT,
    ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS receiver_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS receiver_address TEXT,
    ADD COLUMN IF NOT EXISTS receiver_lat FLOAT,
    ADD COLUMN IF NOT EXISTS receiver_lng FLOAT,
    ADD COLUMN IF NOT EXISTS receiver_location geography(Point, 4326),
    ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
    ADD COLUMN IF NOT EXISTS parcel_category VARCHAR(50) DEFAULT 'GENERAL_BOX',
    ADD COLUMN IF NOT EXISTS package_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS volumetric_weight_kg FLOAT,
    ADD COLUMN IF NOT EXISTS is_valuable BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS insurance_opt_in BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS insured_amount NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS insurance_premium NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(30) DEFAULT 'BIKE',
    ADD COLUMN IF NOT EXISTS delivery_priority VARCHAR(30) DEFAULT 'STANDARD',
    ADD COLUMN IF NOT EXISTS base_fare NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS distance_fare NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS weight_fare NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS volume_fare NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS priority_fare NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS handling_fee NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS driver_earning NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS platform_commission NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'WALLET',
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS pickup_otp VARCHAR(10),
    ADD COLUMN IF NOT EXISTS pickup_otp_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pickup_verified_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS near_destination_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS arrived_destination_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS delivery_otp_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(50);
    """,

    # 5. Parcel Proof of Delivery table
    """
    CREATE TABLE IF NOT EXISTS parcel_proof_of_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parcel_id UUID UNIQUE NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        receiver_name VARCHAR(255) NOT NULL,
        otp_verified BOOLEAN DEFAULT TRUE,
        signature_url VARCHAR(512),
        delivery_photo_url VARCHAR(512),
        delivered_lat FLOAT,
        delivered_lng FLOAT,
        delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        metadata_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,

    # 6. Parcel Status History table
    """
    CREATE TABLE IF NOT EXISTS parcel_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
        from_status VARCHAR(50),
        to_status VARCHAR(50) NOT NULL,
        actor_role VARCHAR(30) DEFAULT 'SYSTEM',
        actor_id UUID,
        notes TEXT,
        latitude FLOAT,
        longitude FLOAT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
]


async def run_migration():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("\n" + "=" * 70)
    print("MIGRATING DATABASE SCHEMA FOR FEATURE 15 PARCEL LOGISTICS")
    print("=" * 70)

    async with engine.begin() as conn:
        for idx, stmt in enumerate(DDL_STATEMENTS, 1):
            try:
                await conn.execute(text(stmt))
                print(f"  [OK] Statement {idx} executed successfully")
            except Exception as e:
                print(f"  [ERR] Statement {idx} error: {e}")

    print("=" * 70)
    print("SCHEMA MIGRATION COMPLETED SUCCESSFULLY")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(run_migration())
