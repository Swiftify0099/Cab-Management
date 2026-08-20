import asyncio
import os
import sys
import uuid

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
sys.path.insert(0, os.path.join(backend_root, "common"))
sys.path.insert(0, os.path.join(backend_root, "matching-service"))
sys.path.insert(0, backend_root)

from common.database import async_session_maker, engine
from sqlalchemy import text, select
from common.models.all_models import FAQArticle


async def migrate_feature24():
    print("=" * 60)
    print("🚀 MIGRATING FEATURE 24: DDL & DATABASE TABLES (SUPPORT SYSTEM)")
    print("=" * 60)

    ddl_statements = [
        # 1. Alter support_tickets
        "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'GENERAL'",
        "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50) NOT NULL DEFAULT 'OTHER'",
        "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ride_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL",
        "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS payout_request_id UUID REFERENCES driver_payout_requests(id) ON DELETE SET NULL",
        "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT NOW()",
        "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS unread_driver_count INTEGER DEFAULT 0",
        "ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS unread_agent_count INTEGER DEFAULT 1",
        "CREATE INDEX IF NOT EXISTS ix_support_tickets_category ON support_tickets(category)",
        "CREATE INDEX IF NOT EXISTS ix_support_tickets_status ON support_tickets(status)",
        # 2. support_ticket_messages
        """
        CREATE TABLE IF NOT EXISTS support_ticket_messages (
            id UUID PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
            sender_type VARCHAR(20) NOT NULL,
            sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            sender_name VARCHAR(100) NOT NULL,
            message_text TEXT NOT NULL,
            attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            read_at TIMESTAMPTZ
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id)",
        # 3. faq_articles
        """
        CREATE TABLE IF NOT EXISTS faq_articles (
            id UUID PRIMARY KEY,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            category VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            content_markdown TEXT NOT NULL,
            helpful_count INTEGER NOT NULL DEFAULT 0,
            unhelpful_count INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_published BOOLEAN NOT NULL DEFAULT TRUE,
            tags JSONB NOT NULL DEFAULT '[]'::jsonb
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_faq_articles_category ON faq_articles(category)"
    ]

    async with engine.begin() as conn:
        for stmt in ddl_statements:
            cleaned = stmt.strip()
            if cleaned:
                await conn.execute(text(cleaned))
                print(f"✓ Executed: {cleaned[:45]}...")

    # Seed default FAQ articles using ORM
    async with async_session_maker() as session:
        res = await session.execute(select(FAQArticle))
        existing = res.scalars().all()
        if len(existing) == 0:
            faq_seeds = [
                # Account
                ("ACCOUNT", "How do I change my registered phone number or email?", "To update your phone number, visit Profile > Edit Details. An OTP verification is required for security.", ["phone", "profile", "otp"]),
                # Trips
                ("TRIPS", "What should I do if a passenger cancels after I arrived at pickup?", "If the passenger cancels after your verified arrival at pickup, a No-Show fee of ₹50 is automatically credited to your wallet according to platform policy.", ["cancel", "no-show", "fee"]),
                # Payments
                ("PAYMENTS", "When do I receive payment for cash rides vs digital payments?", "Cash is collected directly from the customer upon dropoff. Digital trip earnings are credited to your Available Wallet Balance immediately upon trip completion.", ["cash", "digital", "earnings"]),
                # Vehicle
                ("VEHICLE", "How do I add a new vehicle or replace my active car?", "Go to Vehicles > Add Vehicle, upload RC Book and Commercial Insurance. Verification takes between 2 to 4 business hours.", ["vehicle", "rc", "insurance"]),
                # KYC
                ("KYC", "Why was my driving licence or document rejected?", "Documents may be rejected if the photo is blurry, expired, or names do not match your government ID. Please re-upload a clear high-resolution photo in KYC Center.", ["kyc", "licence", "rejected"]),
                # Safety
                ("SAFETY", "How does the Emergency SOS button work?", "Tapping SOS transmits your live GPS coordinates directly to our 24/7 Safety Command Center and alerts Police Emergency (112) along with your verified Trusted Contacts.", ["sos", "safety", "emergency"]),
                # Earnings
                ("EARNINGS", "How is the platform commission calculated on trips?", "The platform charges a flat 20% commission on the base trip fare. 100% of customer tips, tolls, and waiting charges go directly to the driver.", ["commission", "fare", "tips"]),
                # Payout
                ("PAYOUT", "How fast are Instant Bank and UPI Withdrawals?", "Instant Withdrawals are processed via IMPS/UPI within 60 seconds. Standard payouts occur automatically every Tuesday.", ["payout", "bank", "upi"]),
                # Settings
                ("SETTINGS", "How do I change navigation voice and app language?", "Visit Settings > Language & Navigation to select Marathi, Hindi, or English, and configure your preferred in-app or external GPS app.", ["language", "navigation", "voice"])
            ]

            for cat, title, content, tags in faq_seeds:
                art = FAQArticle(
                    id=uuid.uuid4(),
                    category=cat,
                    title=title,
                    content_markdown=content,
                    helpful_count=24,
                    unhelpful_count=1,
                    sort_order=1,
                    is_published=True,
                    tags=tags
                )
                session.add(art)

            await session.commit()
            print(f"✓ Seeded {len(faq_seeds)} default FAQ articles across 9 categories")

    print("\n✅ FEATURE 24 DATABASE DDL MIGRATION COMPLETED SUCCESSFULLY")


if __name__ == "__main__":
    asyncio.run(migrate_feature24())
