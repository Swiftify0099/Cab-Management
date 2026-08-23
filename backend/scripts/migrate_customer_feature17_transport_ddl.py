"""
===============================================================================
MIGRATION SCRIPT: FEATURE 17 — GOODS TRANSPORT & COMMERCIAL FREIGHT TABLES
===============================================================================
Creates PostgreSQL tables, enum types, indexes, and constraints idempotently.
===============================================================================
"""
import asyncio
import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import text
from common.database import async_session_maker


async def migrate_feature17_transport_ddl():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("🚀 Starting Feature 17 Transport DDL Migration...")

    async with async_session_maker() as db:
        # 1. Enrich Vehicles table with Commercial Transport capabilities
        await db.execute(text("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transport_capable BOOLEAN DEFAULT FALSE;"))
        await db.execute(text("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS max_payload_kg FLOAT NULL;"))
        await db.execute(text("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS cargo_volume_cft FLOAT NULL;"))
        await db.execute(text("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS loading_dimensions JSONB DEFAULT '{}';"))
        await db.execute(text("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS commercial_permit BOOLEAN DEFAULT FALSE;"))
        print("  ✓ Enriched 'vehicles' table with transport capability columns")

        # 2. Create transport_orders table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS transport_orders (
                id UUID PRIMARY KEY,
                order_reference VARCHAR(50) UNIQUE NOT NULL,
                customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                
                pickup_address TEXT NOT NULL,
                pickup_lat FLOAT NOT NULL,
                pickup_lng FLOAT NOT NULL,
                pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
                pickup_contact_name VARCHAR(100) NOT NULL,
                pickup_contact_phone VARCHAR(20) NOT NULL,
                pickup_notes TEXT NULL,

                drop_address TEXT NOT NULL,
                drop_lat FLOAT NOT NULL,
                drop_lng FLOAT NOT NULL,
                drop_location GEOGRAPHY(POINT, 4326) NOT NULL,
                drop_contact_name VARCHAR(100) NOT NULL,
                drop_contact_phone VARCHAR(20) NOT NULL,
                drop_notes TEXT NULL,

                distance_km FLOAT NOT NULL DEFAULT 0.0,
                estimated_duration_min INTEGER NOT NULL DEFAULT 0,

                pricing_mode VARCHAR(30) NOT NULL DEFAULT 'INSTANT_PRICE',
                status VARCHAR(50) NOT NULL DEFAULT 'created',
                schedule_type VARCHAR(20) NOT NULL DEFAULT 'IMMEDIATE',
                scheduled_pickup_time TIMESTAMPTZ NULL,

                loading_required BOOLEAN NOT NULL DEFAULT TRUE,
                unloading_required BOOLEAN NOT NULL DEFAULT TRUE,
                helpers_count INTEGER NOT NULL DEFAULT 0,
                vehicle_category_required VARCHAR(50) NOT NULL DEFAULT 'TATA_ACE',
                special_instructions TEXT NULL,

                base_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                distance_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                weight_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                volume_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                helpers_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                loading_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                unloading_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                toll_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                insurance_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                total_fare NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

                driver_earning NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                platform_commission NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                payment_method VARCHAR(30) NOT NULL DEFAULT 'WALLET',
                payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

                selected_quote_id UUID NULL,
                assigned_driver_id UUID NULL REFERENCES drivers(id),
                assigned_vehicle_id UUID NULL REFERENCES vehicles(id),

                assigned_at TIMESTAMPTZ NULL,
                arrived_pickup_at TIMESTAMPTZ NULL,
                loading_started_at TIMESTAMPTZ NULL,
                loaded_at TIMESTAMPTZ NULL,
                in_transit_at TIMESTAMPTZ NULL,
                near_destination_at TIMESTAMPTZ NULL,
                arrived_destination_at TIMESTAMPTZ NULL,
                unloading_started_at TIMESTAMPTZ NULL,
                delivered_at TIMESTAMPTZ NULL,

                cancelled_at TIMESTAMPTZ NULL,
                cancellation_reason TEXT NULL,
                cancelled_by VARCHAR(50) NULL,

                delivery_otp VARCHAR(10) NULL,
                delivery_otp_attempts INTEGER NOT NULL DEFAULT 0,
                delivery_otp_verified_at TIMESTAMPTZ NULL,

                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                deleted_at TIMESTAMPTZ NULL
            );
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_orders_customer_id ON transport_orders(customer_id);"))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_orders_status ON transport_orders(status);"))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_orders_order_reference ON transport_orders(order_reference);"))
        print("  ✓ Created 'transport_orders' table & indexes")

        # 3. Create transport_loads table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS transport_loads (
                id UUID PRIMARY KEY,
                order_id UUID UNIQUE NOT NULL REFERENCES transport_orders(id) ON DELETE CASCADE,
                goods_category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
                goods_description TEXT NOT NULL,
                declared_value NUMERIC(12, 2) NULL,
                weight_kg FLOAT NOT NULL,
                length_ft FLOAT NOT NULL DEFAULT 0.0,
                width_ft FLOAT NOT NULL DEFAULT 0.0,
                height_ft FLOAT NOT NULL DEFAULT 0.0,
                volume_cft FLOAT NOT NULL DEFAULT 0.0,
                package_count INTEGER NOT NULL DEFAULT 1,
                fragile_handling BOOLEAN NOT NULL DEFAULT FALSE,
                hazardous_material BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_loads_order_id ON transport_loads(order_id);"))
        print("  ✓ Created 'transport_loads' table & indexes")

        # 4. Create transport_quotes table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS transport_quotes (
                id UUID PRIMARY KEY,
                order_id UUID NOT NULL REFERENCES transport_orders(id) ON DELETE CASCADE,
                transporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
                vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

                vehicle_category VARCHAR(50) NOT NULL,
                vehicle_number VARCHAR(30) NOT NULL,
                vehicle_name VARCHAR(100) NOT NULL,

                amount NUMERIC(10, 2) NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                included_helpers INTEGER NOT NULL DEFAULT 0,
                estimated_pickup_eta_min INTEGER NOT NULL DEFAULT 15,
                estimated_transit_duration_min INTEGER NOT NULL DEFAULT 60,

                status VARCHAR(50) NOT NULL DEFAULT 'submitted',
                valid_until TIMESTAMPTZ NOT NULL,
                rounds_count INTEGER NOT NULL DEFAULT 1,
                last_counter_by VARCHAR(30) NOT NULL DEFAULT 'TRANSPORTER',

                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_quotes_order_id ON transport_quotes(order_id);"))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_quotes_transporter_id ON transport_quotes(transporter_id);"))
        print("  ✓ Created 'transport_quotes' table & indexes")

        # 5. Create transport_quote_events table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS transport_quote_events (
                id UUID PRIMARY KEY,
                quote_id UUID NOT NULL REFERENCES transport_quotes(id) ON DELETE CASCADE,
                actor_type VARCHAR(30) NOT NULL,
                actor_id UUID NOT NULL REFERENCES users(id),
                action VARCHAR(30) NOT NULL,
                amount NUMERIC(10, 2) NOT NULL,
                note TEXT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_quote_events_quote_id ON transport_quote_events(quote_id);"))
        print("  ✓ Created 'transport_quote_events' table & indexes")

        # 6. Create transport_assignments table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS transport_assignments (
                id UUID PRIMARY KEY,
                order_id UUID UNIQUE NOT NULL REFERENCES transport_orders(id) ON DELETE CASCADE,
                quote_id UUID NULL REFERENCES transport_quotes(id) ON DELETE SET NULL,
                transporter_id UUID NOT NULL REFERENCES users(id),
                driver_id UUID NOT NULL REFERENCES drivers(id),
                vehicle_id UUID NOT NULL REFERENCES vehicles(id),
                assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_assignments_order_id ON transport_assignments(order_id);"))
        print("  ✓ Created 'transport_assignments' table & indexes")

        # 7. Create transport_status_events table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS transport_status_events (
                id UUID PRIMARY KEY,
                order_id UUID NOT NULL REFERENCES transport_orders(id) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL,
                actor_id UUID NULL REFERENCES users(id),
                actor_role VARCHAR(30) NOT NULL DEFAULT 'SYSTEM',
                notes TEXT NULL,
                latitude FLOAT NULL,
                longitude FLOAT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_status_events_order_id ON transport_status_events(order_id);"))
        print("  ✓ Created 'transport_status_events' table & indexes")

        # 8. Create transport_proof_of_deliveries table
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS transport_proof_of_deliveries (
                id UUID PRIMARY KEY,
                order_id UUID UNIQUE NOT NULL REFERENCES transport_orders(id) ON DELETE CASCADE,
                driver_id UUID NOT NULL REFERENCES drivers(id),
                receiver_name VARCHAR(100) NOT NULL,
                receiver_phone VARCHAR(20) NOT NULL,
                otp_verified BOOLEAN NOT NULL DEFAULT TRUE,
                signature_url VARCHAR(512) NULL,
                photo_url VARCHAR(512) NULL,
                delivery_notes TEXT NULL,
                latitude FLOAT NOT NULL,
                longitude FLOAT NOT NULL,
                delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """))
        await db.execute(text("CREATE INDEX IF NOT EXISTS ix_transport_pod_order_id ON transport_proof_of_deliveries(order_id);"))
        print("  ✓ Created 'transport_proof_of_deliveries' table & indexes")

        await db.commit()

    print("🎉 Feature 17 Transport DDL Migration Finished with 100% Success!")


if __name__ == "__main__":
    asyncio.run(migrate_feature17_transport_ddl())
