"""
Migration: Add service_preferences JSONB column to customer_profiles table.
Run once: python backend/scripts/migrate_service_preferences.py
"""
import asyncio
import os
import sys

backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, "common"))

from sqlalchemy import text
from common.database import engine

STATEMENTS = [
    """
    ALTER TABLE customer_profiles
      ADD COLUMN IF NOT EXISTS service_preferences JSONB DEFAULT NULL;
    """,
    """
    COMMENT ON COLUMN customer_profiles.service_preferences IS
      'Customer service personalisation: default_service, pinned_services, ladies_only, push_notifications, arrival_alerts, marketing_emails';
    """
]

async def run():
    async with engine.begin() as conn:
        for stmt in STATEMENTS:
            await conn.execute(text(stmt))
    await engine.dispose()
    print('[Migration] service_preferences column added to customer_profiles successfully.')

if __name__ == '__main__':
    asyncio.run(run())



