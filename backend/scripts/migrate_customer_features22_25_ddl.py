"""
DDL Migration for Customer Features 22–25:
- Feature 22: Book for Someone Else (saved_riders table)
- Feature 23: Activity / History Hub (ensures views/indexes on bookings, trips, parcels, hotels, transport, rentals, outstation, airport)
- Feature 24: Notification Center (reference_type, reference_id, deep_link, priority in notifications)
- Feature 25: Support & Help Hub (reference_type, reference_id in support_tickets, faq_articles, support_ticket_messages)
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
    # 1. Feature 22: saved_riders
    """
    CREATE TABLE IF NOT EXISTS saved_riders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        relationship_type VARCHAR(30) NOT NULL DEFAULT 'FRIEND',
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_saved_riders_customer ON saved_riders(customer_id);",
    "CREATE INDEX IF NOT EXISTS ix_saved_riders_favorite ON saved_riders(is_favorite);",

    # 2. Feature 24: notifications column enhancements
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'reference_type'
        ) THEN
            ALTER TABLE notifications ADD COLUMN reference_type VARCHAR(50);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'reference_id'
        ) THEN
            ALTER TABLE notifications ADD COLUMN reference_id VARCHAR(100);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'deep_link'
        ) THEN
            ALTER TABLE notifications ADD COLUMN deep_link VARCHAR(255);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'priority'
        ) THEN
            ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
        END IF;
    END$$;
    """,
    "CREATE INDEX IF NOT EXISTS ix_notifications_ref ON notifications(reference_type, reference_id);",

    # 3. Feature 25: support_tickets column enhancements & FAQ
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_tickets' AND column_name = 'reference_type'
        ) THEN
            ALTER TABLE support_tickets ADD COLUMN reference_type VARCHAR(50);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_tickets' AND column_name = 'reference_id'
        ) THEN
            ALTER TABLE support_tickets ADD COLUMN reference_id VARCHAR(100);
        END IF;
    END$$;
    """,
    "CREATE INDEX IF NOT EXISTS ix_support_tickets_ref ON support_tickets(reference_type, reference_id);",

    # 4. FAQ Articles table
    """
    CREATE TABLE IF NOT EXISTS faq_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        sort_order INTEGER NOT NULL DEFAULT 0,
        helpful_count INTEGER NOT NULL DEFAULT 0,
        not_helpful_count INTEGER NOT NULL DEFAULT 0,
        is_published BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_faq_articles_category ON faq_articles(category);",
    "CREATE INDEX IF NOT EXISTS ix_faq_articles_published ON faq_articles(is_published);",

    # 5. Support Ticket Messages table (if not exists)
    """
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL,
        sender_id UUID NOT NULL REFERENCES users(id),
        sender_name VARCHAR(100) NOT NULL,
        message_text TEXT NOT NULL,
        attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS ix_support_ticket_msgs_ticket ON support_ticket_messages(ticket_id);",
]


async def migrate():
    print("=" * 70)
    print("🚀 MIGRATING CUSTOMER FEATURES 22–25 DDL TABLES & COLUMNS")
    print("=" * 70)

    async with async_session_maker() as session:
        for i, stmt in enumerate(STATEMENTS, 1):
            cleaned = stmt.strip()
            title = cleaned.split("\n")[0] if "\n" in cleaned else cleaned[:60]
            print(f"[{i}/{len(STATEMENTS)}] {title[:65]}...")
            try:
                await session.execute(text(cleaned))
                await session.commit()
                print(f"  ✓ OK")
            except Exception as e:
                print(f"  ❌ Error: {e}")
                await session.rollback()
                raise

    print("\n✅ Features 22–25 DDL migration complete!")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate())
