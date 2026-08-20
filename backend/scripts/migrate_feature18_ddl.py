import asyncio
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, os.path.join(backend_root, "common"))
sys.path.insert(0, os.path.join(backend_root, "matching-service"))
sys.path.insert(0, backend_root)

from common.database import async_session_maker, engine
from sqlalchemy import text


async def migrate_feature18():
    print("=" * 60)
    print("🚀 MIGRATING FEATURE 18: DDL & DATABASE TABLES (INCENTIVES & PROMOTIONS)")
    print("=" * 60)

    ddl_statements = [
        # 1. incentive_campaigns
        """
        CREATE TABLE IF NOT EXISTS incentive_campaigns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            campaign_type VARCHAR(50) NOT NULL,
            target_count INTEGER NOT NULL DEFAULT 10,
            reward_amount NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
            guaranteed_amount NUMERIC(10, 2),
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ NOT NULL,
            zone_id UUID,
            zone_name VARCHAR(100),
            vehicle_category VARCHAR(50) DEFAULT 'all',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_incentive_campaigns_type ON incentive_campaigns(campaign_type);",
        "CREATE INDEX IF NOT EXISTS ix_incentive_campaigns_start ON incentive_campaigns(start_time);",
        "CREATE INDEX IF NOT EXISTS ix_incentive_campaigns_end ON incentive_campaigns(end_time);",

        # 2. driver_incentive_progress
        """
        CREATE TABLE IF NOT EXISTS driver_incentive_progress (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
            campaign_id UUID NOT NULL REFERENCES incentive_campaigns(id) ON DELETE CASCADE,
            current_progress INTEGER NOT NULL DEFAULT 0,
            target_count INTEGER NOT NULL DEFAULT 10,
            current_actual_earnings NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            reward_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
            completed_at TIMESTAMPTZ,
            earned_at TIMESTAMPTZ,
            ledger_entry_id UUID,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_driver_incentive_campaign UNIQUE (driver_id, campaign_id)
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_driver_incentive_progress_driver ON driver_incentive_progress(driver_id);",
        "CREATE INDEX IF NOT EXISTS ix_driver_incentive_progress_campaign ON driver_incentive_progress(campaign_id);",
        "CREATE INDEX IF NOT EXISTS ix_driver_incentive_progress_status ON driver_incentive_progress(status);",

        # 3. driver_referrals
        """
        CREATE TABLE IF NOT EXISTS driver_referrals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            referrer_driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
            referred_driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
            referral_code_used VARCHAR(20) NOT NULL,
            required_rides INTEGER NOT NULL DEFAULT 25,
            completed_rides INTEGER NOT NULL DEFAULT 0,
            reward_amount NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
            status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
            rewarded_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_driver_referral_pair UNIQUE (referrer_driver_id, referred_driver_id)
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_driver_referrals_referrer ON driver_referrals(referrer_driver_id);",
        "CREATE INDEX IF NOT EXISTS ix_driver_referrals_referred ON driver_referrals(referred_driver_id);",
        "CREATE INDEX IF NOT EXISTS ix_driver_referrals_code ON driver_referrals(referral_code_used);",
        "CREATE INDEX IF NOT EXISTS ix_driver_referrals_status ON driver_referrals(status);",
    ]

    async with async_session_maker() as session:
        for stmt in ddl_statements:
            try:
                await session.execute(text(stmt))
                await session.commit()
            except Exception as e:
                print(f"Error executing statement: {e}")
                await session.rollback()

    print("✓ All Feature 18 DDL migrations applied successfully to PostgreSQL.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate_feature18())
