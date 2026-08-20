"""
Database DDL migration for Feature 17 (Rating & Feedback).
Executes CREATE TABLE and CREATE INDEX statements for customer_driver_ratings.
"""
import os
import sys
import asyncio
from sqlalchemy import text
from common.database import async_session_maker

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

STATEMENTS = [
    # 1. Customer Driver Ratings Table
    """
    CREATE TABLE IF NOT EXISTS customer_driver_ratings (
        id UUID PRIMARY KEY,
        ride_id UUID UNIQUE NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL,
        compliments JSONB NOT NULL DEFAULT '[]'::jsonb,
        complaint_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        feedback TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
        dispute_reason TEXT,
        disputed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_customer_driver_ratings_ride_id ON customer_driver_ratings(ride_id)",
    "CREATE INDEX IF NOT EXISTS ix_customer_driver_ratings_driver_id ON customer_driver_ratings(driver_id)",
    "CREATE INDEX IF NOT EXISTS ix_customer_driver_ratings_customer_id ON customer_driver_ratings(customer_id)",
    "CREATE INDEX IF NOT EXISTS ix_customer_driver_ratings_status ON customer_driver_ratings(status)",
    "CREATE INDEX IF NOT EXISTS ix_customer_driver_ratings_created_at ON customer_driver_ratings(created_at)",
]

async def run_migrations():
    print("Starting Feature 17 DDL migrations...")
    async with async_session_maker() as session:
        for i, stmt in enumerate(STATEMENTS, 1):
            cleaned = stmt.strip()
            title = cleaned.split("\n")[0] if "\n" in cleaned else cleaned
            print(f"[{i}/{len(STATEMENTS)}] Executing: {title[:70]}...")
            try:
                await session.execute(text(cleaned))
                await session.commit()
                print(f"  ✓ Success")
            except Exception as e:
                print(f"  ❌ Error: {e}")
                await session.rollback()
                raise e
    print("\nFeature 17 DDL migrations completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migrations())
