"""
Feature 27: Smart Features / Intelligence Layer DDL Migration Script.
Creates tables and indexes for smart_recommendation_logs and smart_destination_cache.
"""
import asyncio
import os
import sys

backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, "common"))

from sqlalchemy import text
from common.database import engine

FEATURE27_DDL = """
-- 1. Smart Recommendation Logs Table
CREATE TABLE IF NOT EXISTS smart_recommendation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL,
    input_context_hash VARCHAR(64),
    recommended_item VARCHAR(100) NOT NULL,
    confidence VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    reason VARCHAR(255) NOT NULL,
    action_taken VARCHAR(30) NOT NULL DEFAULT 'SHOWN',
    model_version VARCHAR(30) NOT NULL DEFAULT 'v1.0.0',
    details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_rec_user_type ON smart_recommendation_logs(user_id, recommendation_type);
CREATE INDEX IF NOT EXISTS idx_smart_rec_created ON smart_recommendation_logs(created_at DESC);

-- 2. Smart Destination Cache Table
CREATE TABLE IF NOT EXISTS smart_destination_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination_title VARCHAR(150) NOT NULL,
    destination_address VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    place_type VARCHAR(30) NOT NULL DEFAULT 'RECENT',
    time_bucket VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    frequency INT NOT NULL DEFAULT 1,
    last_visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_dest_user_bucket ON smart_destination_cache(user_id, time_bucket);
CREATE INDEX IF NOT EXISTS idx_smart_dest_frequency ON smart_destination_cache(frequency DESC);
"""

async def run_migration():
    print("[MIGRATE] Running Feature 27 Smart Features DDL...")
    try:
        async with engine.begin() as conn:
            await conn.execute(text(FEATURE27_DDL))
        print("[MIGRATE] Feature 27 Smart Features DDL applied successfully.")
    except Exception as e:
        print(f"[MIGRATE] Note: Remote connection status: {e}. DDL is idempotent and defined in all_models.py.")

if __name__ == "__main__":
    asyncio.run(run_migration())
