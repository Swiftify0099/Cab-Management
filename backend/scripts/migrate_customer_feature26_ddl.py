"""
DDL Migration for Customer Feature 26: Customer Security Architecture
- customer_devices table
- customer_security_events table
- customer_risk_signals table
- user security & lock columns (is_locked, lock_reason, lock_type, locked_until)
"""
import asyncio
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)

from common.database import async_session_maker, engine
from sqlalchemy import text


STATEMENTS = [
    # 1. customer_devices table
    """
    CREATE TABLE IF NOT EXISTS customer_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255) NOT NULL,
        platform VARCHAR(20) NOT NULL DEFAULT 'android',
        device_model VARCHAR(100),
        os_version VARCHAR(50),
        app_version VARCHAR(50),
        trust_status VARCHAR(30) NOT NULL DEFAULT 'TRUSTED',
        risk_score FLOAT NOT NULL DEFAULT 0.0,
        last_ip_hash VARCHAR(64),
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_customer_devices_user_id ON customer_devices(user_id);",
    "CREATE INDEX IF NOT EXISTS ix_customer_devices_device_id ON customer_devices(device_id);",
    "CREATE INDEX IF NOT EXISTS ix_customer_devices_trust_status ON customer_devices(trust_status);",

    # 2. customer_security_events table
    """
    CREATE TABLE IF NOT EXISTS customer_security_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255),
        session_id UUID,
        event_type VARCHAR(60) NOT NULL,
        risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
        location_city VARCHAR(100),
        ip_hash VARCHAR(64),
        details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        action_taken VARCHAR(30) NOT NULL DEFAULT 'ALLOW',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_customer_sec_events_user_id ON customer_security_events(user_id);",
    "CREATE INDEX IF NOT EXISTS ix_customer_sec_events_event_type ON customer_security_events(event_type);",
    "CREATE INDEX IF NOT EXISTS ix_customer_sec_events_risk_level ON customer_security_events(risk_level);",
    "CREATE INDEX IF NOT EXISTS ix_customer_sec_events_created_at ON customer_security_events(created_at);",

    # 3. customer_risk_signals table
    """
    CREATE TABLE IF NOT EXISTS customer_risk_signals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        signal_type VARCHAR(60) NOT NULL,
        risk_score FLOAT NOT NULL DEFAULT 0.0,
        severity VARCHAR(20) NOT NULL DEFAULT 'LOW',
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_customer_risk_signals_user_id ON customer_risk_signals(user_id);",
    "CREATE INDEX IF NOT EXISTS ix_customer_risk_signals_signal_type ON customer_risk_signals(signal_type);",
    "CREATE INDEX IF NOT EXISTS ix_customer_risk_signals_severity ON customer_risk_signals(severity);",

    # 4. User security column enhancements
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'is_locked'
        ) THEN
            ALTER TABLE users ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'lock_reason'
        ) THEN
            ALTER TABLE users ADD COLUMN lock_reason VARCHAR(255);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'lock_type'
        ) THEN
            ALTER TABLE users ADD COLUMN lock_type VARCHAR(50);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'locked_until'
        ) THEN
            ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;
        END IF;
    END $$;
    """,
]


async def run_migration():
    print("=" * 60)
    print("🔐 MIGRATING DATABASE SCHEMA FOR FEATURE 26: CUSTOMER SECURITY")
    print("=" * 60)
    async with engine.begin() as conn:
        for idx, stmt in enumerate(STATEMENTS, 1):
            stmt_clean = stmt.strip()
            if not stmt_clean:
                continue
            first_line = stmt_clean.split("\n")[0][:60]
            print(f"[{idx}/{len(STATEMENTS)}] Executing: {first_line}...")
            await conn.execute(text(stmt_clean))
    print("✅ All Feature 26 Security tables & columns migrated successfully!")


if __name__ == "__main__":
    asyncio.run(run_migration())
