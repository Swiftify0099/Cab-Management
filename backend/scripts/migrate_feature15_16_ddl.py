"""
Database DDL migration for Feature 15 (Payout / Wallet) and Feature 16 (Driver Performance).
Executes each CREATE TABLE and CREATE INDEX statement individually for asyncpg compatibility.
"""
import os
import sys
import asyncio
from sqlalchemy import text
from common.database import async_session_maker

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

STATEMENTS = [
    # 1. Driver Payout Methods
    """
    CREATE TABLE IF NOT EXISTS driver_payout_methods (
        id UUID PRIMARY KEY,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        method_type VARCHAR(20) NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        bank_name VARCHAR(100),
        account_holder_name VARCHAR(255),
        account_number_masked VARCHAR(50),
        account_number_hash VARCHAR(128),
        ifsc_code VARCHAR(20),
        account_type VARCHAR(20) DEFAULT 'savings',
        upi_id VARCHAR(100),
        upi_id_masked VARCHAR(100),
        upi_id_hash VARCHAR(128),
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        verified_at TIMESTAMPTZ,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_driver_payout_methods_driver_id ON driver_payout_methods(driver_id)",

    # 2. Driver Payout Requests
    """
    CREATE TABLE IF NOT EXISTS driver_payout_requests (
        id UUID PRIMARY KEY,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        payout_reference VARCHAR(50) UNIQUE NOT NULL,
        idempotency_key VARCHAR(100) UNIQUE NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        net_payout NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'INR',
        payout_method VARCHAR(20) NOT NULL,
        destination_masked VARCHAR(100) NOT NULL,
        payout_method_id UUID REFERENCES driver_payout_methods(id) ON DELETE SET NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED',
        failure_reason TEXT,
        provider_ref VARCHAR(100),
        provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        settled_at TIMESTAMPTZ,
        reversed_at TIMESTAMPTZ,
        is_auto_payout BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_driver_payout_requests_driver_id ON driver_payout_requests(driver_id)",
    "CREATE INDEX IF NOT EXISTS ix_driver_payout_requests_status ON driver_payout_requests(status)",
    "CREATE INDEX IF NOT EXISTS ix_driver_payout_requests_payout_reference ON driver_payout_requests(payout_reference)",

    # 3. Driver Auto Payout Settings
    """
    CREATE TABLE IF NOT EXISTS driver_auto_payout_settings (
        id UUID PRIMARY KEY,
        driver_id UUID UNIQUE NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        threshold_amount NUMERIC(10, 2) NOT NULL DEFAULT 2000.00,
        frequency VARCHAR(30) NOT NULL DEFAULT 'THRESHOLD_ONLY',
        payout_method_type VARCHAR(20) NOT NULL DEFAULT 'BANK',
        payout_method_id UUID REFERENCES driver_payout_methods(id) ON DELETE SET NULL,
        last_auto_payout_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_driver_auto_payout_settings_driver_id ON driver_auto_payout_settings(driver_id)",

    # 4. Driver Online Sessions
    """
    CREATE TABLE IF NOT EXISTS driver_online_sessions (
        id UUID PRIMARY KEY,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        total_distance_km FLOAT NOT NULL DEFAULT 0.0,
        trips_completed INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_driver_online_sessions_driver_id ON driver_online_sessions(driver_id)",
    "CREATE INDEX IF NOT EXISTS ix_driver_online_sessions_started_at ON driver_online_sessions(started_at)",

    # 5. Driver Performance Daily
    """
    CREATE TABLE IF NOT EXISTS driver_performance_daily (
        id UUID PRIMARY KEY,
        driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        period_date DATE NOT NULL,
        period_type VARCHAR(20) NOT NULL DEFAULT 'DAILY',
        acceptance_rate FLOAT NOT NULL DEFAULT 100.0,
        cancellation_rate FLOAT NOT NULL DEFAULT 0.0,
        completion_rate FLOAT NOT NULL DEFAULT 100.0,
        rating_avg FLOAT NOT NULL DEFAULT 5.0,
        rating_count INTEGER NOT NULL DEFAULT 0,
        complaints_count INTEGER NOT NULL DEFAULT 0,
        total_offers INTEGER NOT NULL DEFAULT 0,
        accepted_offers INTEGER NOT NULL DEFAULT 0,
        rejected_offers INTEGER NOT NULL DEFAULT 0,
        missed_offers INTEGER NOT NULL DEFAULT 0,
        total_rides INTEGER NOT NULL DEFAULT 0,
        completed_rides INTEGER NOT NULL DEFAULT 0,
        cancelled_rides INTEGER NOT NULL DEFAULT 0,
        online_seconds INTEGER NOT NULL DEFAULT 0,
        distance_km FLOAT NOT NULL DEFAULT 0.0,
        gross_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        net_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        earnings_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        formula_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_driver_performance_daily_driver_id ON driver_performance_daily(driver_id)",
    "CREATE INDEX IF NOT EXISTS ix_driver_performance_daily_period_date ON driver_performance_daily(period_date)",
]

async def run_migration():
    print("Running DDL migration for Feature 15 and 16 tables...")
    async with async_session_maker() as session:
        for idx, statement in enumerate(STATEMENTS, 1):
            cleaned = statement.strip()
            if not cleaned:
                continue
            try:
                await session.execute(text(cleaned))
                await session.commit()
                print(f"  [✓] Executed statement {idx}/{len(STATEMENTS)}")
            except Exception as e:
                await session.rollback()
                print(f"  [!] Error on statement {idx}: {e}")
    print("DDL Migration completed successfully.")

if __name__ == '__main__':
    asyncio.run(run_migration())
