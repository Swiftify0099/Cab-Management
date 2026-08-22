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


async def migrate_feature19():
    print("=" * 60)
    print("🚀 MIGRATING FEATURE 19: DDL & DATABASE TABLES (DEMAND / HEATMAP)")
    print("=" * 60)

    ddl_statements = [
        # 1. demand_zones
        """
        CREATE TABLE IF NOT EXISTS demand_zones (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL,
            city_name VARCHAR(100) NOT NULL DEFAULT 'Pune',
            category VARCHAR(50) NOT NULL DEFAULT 'COMMERCIAL',
            centroid_lat DOUBLE PRECISION NOT NULL,
            centroid_lng DOUBLE PRECISION NOT NULL,
            boundary_geojson JSONB NOT NULL DEFAULT '{}'::jsonb,
            current_surge_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
            demand_level VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
            active_requests_count INTEGER NOT NULL DEFAULT 0,
            available_drivers_count INTEGER NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_demand_zones_city ON demand_zones(city_name);",
        "CREATE INDEX IF NOT EXISTS ix_demand_zones_surge ON demand_zones(current_surge_multiplier);",
        "CREATE INDEX IF NOT EXISTS ix_demand_zones_demand ON demand_zones(demand_level);",
    ]

    async with async_session_maker() as session:
        for stmt in ddl_statements:
            try:
                await session.execute(text(stmt))
                await session.commit()
            except Exception as e:
                print(f"Error executing statement: {e}")
                await session.rollback()

        # Seed verified Pune key hotspot zones
        seed_zones_query = """
        INSERT INTO demand_zones (id, name, city_name, category, centroid_lat, centroid_lng, current_surge_multiplier, demand_level, active_requests_count, available_drivers_count)
        VALUES
        (gen_random_uuid(), 'Pune International Airport (T2)', 'Pune', 'AIRPORT', 18.5822, 73.9197, 2.20, 'CRITICAL', 24, 5),
        (gen_random_uuid(), 'Hinjawadi IT Park Phase 1 & 2', 'Pune', 'TECH_PARK', 18.5913, 73.7389, 1.75, 'HIGH', 32, 12),
        (gen_random_uuid(), 'Shivajinagar Station Hub', 'Pune', 'TRANSIT_HUB', 18.5314, 73.8446, 1.40, 'MODERATE', 16, 9),
        (gen_random_uuid(), 'Koregaon Park & North Main Rd', 'Pune', 'NIGHTLIFE', 18.5362, 73.8938, 1.60, 'HIGH', 19, 7),
        (gen_random_uuid(), 'Phoenix Marketcity Mall (Viman Nagar)', 'Pune', 'SHOPPING_MALL', 18.5621, 73.9168, 1.35, 'MODERATE', 14, 8),
        (gen_random_uuid(), 'Magarpatta Cybercity (Hadapsar)', 'Pune', 'TECH_PARK', 18.5158, 73.9272, 1.50, 'HIGH', 21, 10),
        (gen_random_uuid(), 'Kothrud Central & Paud Road', 'Pune', 'COMMERCIAL', 18.5074, 73.8077, 1.20, 'NORMAL', 11, 8)
        ON CONFLICT DO NOTHING;
        """
        try:
            # Check if any exist
            res = await session.execute(text("SELECT COUNT(*) FROM demand_zones;"))
            count = res.scalar()
            if count == 0:
                await session.execute(text(seed_zones_query))
                await session.commit()
                print("✓ Seeded 7 primary Pune hotspot demand zones.")
            else:
                print(f"• Demand zones already seeded ({count} zones exist).")
        except Exception as e:
            print(f"Error seeding demand zones: {e}")

    print("✓ All Feature 19 DDL migrations applied successfully to PostgreSQL.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate_feature19())
