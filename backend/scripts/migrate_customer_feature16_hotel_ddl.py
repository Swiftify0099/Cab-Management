"""
Idempotent DDL Migration for Feature 16:
Hotel Booking, Authoritative Room Inventory & Cross-Service Linked Ride.
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
    # 1. Properties table columns
    """
    ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS star_rating INTEGER DEFAULT 4,
    ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 120,
    ADD COLUMN IF NOT EXISTS check_in_time VARCHAR(20) DEFAULT '14:00',
    ADD COLUMN IF NOT EXISTS check_out_time VARCHAR(20) DEFAULT '11:00',
    ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
    """,

    # 2. Property Units table columns
    """
    ALTER TABLE property_units
    ADD COLUMN IF NOT EXISTS room_type VARCHAR(50) DEFAULT 'DELUXE',
    ADD COLUMN IF NOT EXISTS bed_type VARCHAR(50) DEFAULT 'King Bed',
    ADD COLUMN IF NOT EXISTS available_count INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS is_refundable BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS cancellation_hours INTEGER DEFAULT 24,
    ADD COLUMN IF NOT EXISTS free_breakfast BOOLEAN DEFAULT FALSE;
    """,

    # 3. Property Bookings table enrichment
    """
    ALTER TABLE property_bookings
    ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(50),
    ADD COLUMN IF NOT EXISTS primary_guest_name VARCHAR(255) DEFAULT 'Guest',
    ADD COLUMN IF NOT EXISTS primary_guest_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS primary_guest_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS special_requests TEXT,
    ADD COLUMN IF NOT EXISTS base_fare NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS add_ons_fare NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS add_ons_json JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'WALLET',
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS cancellation_deadline TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS refund_status VARCHAR(30),
    ADD COLUMN IF NOT EXISTS linked_ride_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
    """,

    # 4. Booking Guests table
    """
    CREATE TABLE IF NOT EXISTS booking_guests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES property_bookings(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        age INTEGER DEFAULT 30,
        id_proof_url VARCHAR(512),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """,
]

async def run_migration():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("\n" + "=" * 70)
    print("MIGRATING DATABASE SCHEMA FOR FEATURE 16 HOTEL BOOKINGS")
    print("=" * 70)

    async with engine.begin() as conn:
        for idx, stmt in enumerate(DDL_STATEMENTS, 1):
            try:
                await conn.execute(text(stmt))
                print(f"  [OK] Statement {idx} executed successfully")
            except Exception as e:
                print(f"  [ERR] Statement {idx} error: {e}")

    print("=" * 70)
    print("HOTEL SCHEMA MIGRATION COMPLETED SUCCESSFULLY")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(run_migration())
