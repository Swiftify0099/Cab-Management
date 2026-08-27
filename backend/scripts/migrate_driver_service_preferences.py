"""
Migration: Add all service permissions and service_customizations to driver_preferences table.
Run once: python backend/scripts/migrate_driver_service_preferences.py
"""
import asyncio
import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import text
from common.database import engine

STATEMENTS = [
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS allow_rental BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS allow_parcel BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS allow_transport BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS allow_packers BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS allow_carpool BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS ladies_only_accepted BOOLEAN NOT NULL DEFAULT TRUE;",
    "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS service_customizations JSONB DEFAULT NULL;",
]

async def run():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(text(stmt))
    print('[Migration] driver_preferences service customizations columns added successfully [OK]')

if __name__ == '__main__':
    asyncio.run(run())
