"""
Database migration script for Multi-Vehicle implementation.
1. Drops unique constraint vehicles_driver_id_key on vehicles(driver_id).
2. Adds missing columns to vehicles table:
   - variant (VARCHAR 100)
   - fuel_type (VARCHAR 30)
   - comfort_level (VARCHAR 30)
   - ownership_type (VARCHAR 30)
   - registered_owner_name (VARCHAR 255)
   - service_capabilities (TEXT[] / VARCHAR[])
   - status (VARCHAR 30)
   - rejection_reason (TEXT)
   - permit_expiry (DATE)
   - fitness_expiry (DATE)
   - is_active (BOOLEAN)
3. Adds TRUCK and AUTO_RICKSHAW to vehicletype enum if not present.
"""
import asyncio
import sys
import os

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from common.database import async_session_maker
from sqlalchemy import text

async def run_migration():
    print("Starting Multi-Vehicle Database Migration...")
    async with async_session_maker() as session:
        # 1. Update vehicletype enum
        enum_values = ["TRUCK", "AUTO_RICKSHAW", "truck", "auto_rickshaw"]
        for ev in enum_values:
            try:
                await session.execute(text(f"ALTER TYPE vehicletype ADD VALUE IF NOT EXISTS '{ev}';"))
                await session.commit()
                print(f"Added enum value '{ev}' to vehicletype")
            except Exception as e:
                print(f"Enum note for '{ev}': {e}")
                await session.rollback()

        # 2. Drop unique constraint on vehicles.driver_id
        try:
            await session.execute(text("ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_driver_id_key;"))
            await session.commit()
            print("Dropped UNIQUE constraint on vehicles(driver_id)")
        except Exception as e:
            print(f"Drop constraint note: {e}")
            await session.rollback()

        # 3. Add missing columns to vehicles table
        columns_to_add = [
            ("variant", "VARCHAR(100)"),
            ("fuel_type", "VARCHAR(30) DEFAULT 'petrol'"),
            ("comfort_level", "VARCHAR(30) DEFAULT 'economy'"),
            ("ownership_type", "VARCHAR(30) DEFAULT 'self'"),
            ("registered_owner_name", "VARCHAR(255)"),
            ("service_capabilities", "TEXT[] DEFAULT ARRAY['cab']::text[]"),
            ("status", "VARCHAR(30) DEFAULT 'APPROVED'"),
            ("rejection_reason", "TEXT"),
            ("permit_expiry", "DATE"),
            ("fitness_expiry", "DATE"),
            ("is_active", "BOOLEAN DEFAULT FALSE"),
        ]

        for col_name, col_type in columns_to_add:
            try:
                await session.execute(text(f"ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                await session.commit()
                print(f"Added column '{col_name}' ({col_type}) to vehicles")
            except Exception as e:
                print(f"Column '{col_name}' note: {e}")
                await session.rollback()

        # 4. Create index on vehicles(driver_id, is_active)
        try:
            await session.execute(text("CREATE INDEX IF NOT EXISTS idx_vehicles_driver_active ON vehicles(driver_id, is_active);"))
            await session.commit()
            print("Created index idx_vehicles_driver_active on vehicles")
        except Exception as e:
            print(f"Index note: {e}")
            await session.rollback()

    print("Multi-Vehicle Database Migration Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
