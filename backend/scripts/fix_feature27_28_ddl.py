import asyncio
import os
import sys

backend_root = r"c:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, backend_root)
sys.path.insert(0, os.path.join(backend_root, "common"))

from sqlalchemy import text
from common.database import engine, async_session_maker

STATEMENTS = [
    # Feature 27
    """
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
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_smart_rec_user_type ON smart_recommendation_logs(user_id, recommendation_type)",
    "CREATE INDEX IF NOT EXISTS idx_smart_rec_created ON smart_recommendation_logs(created_at DESC)",
    """
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
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_smart_dest_user_bucket ON smart_destination_cache(user_id, time_bucket)",
    "CREATE INDEX IF NOT EXISTS idx_smart_dest_frequency ON smart_destination_cache(frequency DESC)",

    # Feature 28
    """
    CREATE TABLE IF NOT EXISTS journeys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        journey_reference VARCHAR(32) UNIQUE NOT NULL,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        title VARCHAR(255) NOT NULL,
        origin_service VARCHAR(50) NOT NULL,
        origin_reference_id VARCHAR(100) NOT NULL,
        notes_json JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_journeys_customer_id ON journeys(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_journeys_reference ON journeys(journey_reference)",
    "CREATE INDEX IF NOT EXISTS idx_journeys_status ON journeys(status)",
    "CREATE INDEX IF NOT EXISTS idx_journeys_origin_ref ON journeys(origin_reference_id)",
    """
    CREATE TABLE IF NOT EXISTS cross_service_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
        source_service VARCHAR(50) NOT NULL,
        source_id VARCHAR(100) NOT NULL,
        target_service VARCHAR(50) NOT NULL,
        target_id VARCHAR(100),
        link_type VARCHAR(50) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'SUGGESTED',
        metadata_json JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_cross_service_journey ON cross_service_links(journey_id)",
    "CREATE INDEX IF NOT EXISTS idx_cross_service_source ON cross_service_links(source_service, source_id)",
    "CREATE INDEX IF NOT EXISTS idx_cross_service_target ON cross_service_links(target_service, target_id)",
    """
    CREATE TABLE IF NOT EXISTS domain_event_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id VARCHAR(64) UNIQUE NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        aggregate_type VARCHAR(50) NOT NULL,
        aggregate_id VARCHAR(100) NOT NULL,
        source_service VARCHAR(50) NOT NULL,
        customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL,
        correlation_id VARCHAR(100),
        causation_id VARCHAR(100),
        version VARCHAR(20) NOT NULL DEFAULT '1.0',
        payload_json JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_domain_events_type ON domain_event_records(event_type)",
    "CREATE INDEX IF NOT EXISTS idx_domain_events_customer ON domain_event_records(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_domain_events_journey ON domain_event_records(journey_id)",
    "CREATE INDEX IF NOT EXISTS idx_domain_events_correlation ON domain_event_records(correlation_id)",
    """
    CREATE TABLE IF NOT EXISTS processed_event_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id VARCHAR(64) NOT NULL,
        consumer_name VARCHAR(100) NOT NULL,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(30) NOT NULL DEFAULT 'PROCESSED',
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_processed_events_event ON processed_event_records(event_id)",
    "CREATE INDEX IF NOT EXISTS idx_processed_events_consumer ON processed_event_records(consumer_name)"
]

async def run():
    print("Executing individual DDL statements for Feature 27 & Feature 28...")
    async with async_session_maker() as session:
        for idx, stmt in enumerate(STATEMENTS, 1):
            s = stmt.strip()
            if not s:
                continue
            try:
                await session.execute(text(s))
                await session.commit()
                print(f"[{idx}/{len(STATEMENTS)}] SUCCESS: {s.splitlines()[0][:60]}...")
            except Exception as e:
                await session.rollback()
                print(f"[{idx}/{len(STATEMENTS)}] NOTICE: {e}")

    # Also check tables:
    async with async_session_maker() as session:
        check_tables = [
            "smart_recommendation_logs", "smart_destination_cache",
            "journeys", "cross_service_links", "domain_event_records", "processed_event_records"
        ]
        for tbl in check_tables:
            res = await session.execute(text(f'SELECT count(*) FROM "{tbl}"'))
            print(f"Table verified: {tbl} (count = {res.scalar()})")

    await engine.dispose()
    print("Feature 27 and 28 DDL verification complete!")

if __name__ == "__main__":
    asyncio.run(run())
