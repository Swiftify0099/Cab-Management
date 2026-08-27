"""
Comprehensive Database Migration & Seed Script for Multi-Service Mobility Platform.
Executes individual statements cleanly with asyncpg.
"""
import asyncio
import os
import sys
import uuid
import json

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Setup path to import common modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'common')))

from sqlalchemy import text
from common.database import engine

async def run_migration():
    print("Starting Database Migration for Multi-Service Mobility Platform...")
    
    async with engine.begin() as conn:
        # ── 1. Create missing tables if not exist ──────────────────────────────
        
        print("1. Creating missing tables...")
        
        # organizations table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS organizations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50) UNIQUE NOT NULL,
                org_type VARCHAR(50) DEFAULT 'college',
                address VARCHAR(500) NOT NULL,
                latitude DOUBLE PRECISION NOT NULL,
                longitude DOUBLE PRECISION NOT NULL,
                city VARCHAR(100) NOT NULL,
                contact_phone VARCHAR(20),
                contact_email VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code)"))
        print("   Table `organizations` verified/created.")

        # organization_routes table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS organization_routes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                route_name VARCHAR(255) NOT NULL,
                assigned_driver_id UUID REFERENCES drivers(id),
                assigned_vehicle_id UUID REFERENCES vehicles(id),
                stop_points JSONB DEFAULT '[]'::jsonb,
                scheduled_start_time VARCHAR(20) NOT NULL,
                scheduled_end_time VARCHAR(20) NOT NULL,
                capacity INTEGER DEFAULT 30,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_org_routes_org_id ON organization_routes(organization_id)"))
        print("   Table `organization_routes` verified/created.")

        # organization_members table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS organization_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                member_type VARCHAR(30) DEFAULT 'student',
                registration_no VARCHAR(100),
                pickup_address VARCHAR(500) NOT NULL,
                pickup_latitude DOUBLE PRECISION NOT NULL,
                pickup_longitude DOUBLE PRECISION NOT NULL,
                drop_address VARCHAR(500),
                route_id UUID,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id)"))
        print("   Table `organization_members` verified/created.")

        # trip_schedule_templates table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS trip_schedule_templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
                service_type VARCHAR(50) NOT NULL,
                recurrence_type VARCHAR(30) DEFAULT 'daily',
                days_of_week JSONB DEFAULT '[1,2,3,4,5,6,7]'::jsonb,
                excluded_dates JSONB DEFAULT '[]'::jsonb,
                start_time VARCHAR(20) NOT NULL,
                end_time VARCHAR(20),
                template_config JSONB NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                last_instance_date DATE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_trip_templates_driver_id ON trip_schedule_templates(driver_id)"))
        print("   Table `trip_schedule_templates` verified/created.")

        # ── 2. Add missing columns to `trips` table ───────────────────────────
        
        print("2. Migrating columns on `trips` table...")
        
        trips_columns_to_add = [
            ("pickup_address", "VARCHAR(500)"),
            ("pickup_city", "VARCHAR(100)"),
            ("destination_address", "VARCHAR(500)"),
            ("destination_city", "VARCHAR(100)"),
            ("occupied_seats", "INTEGER DEFAULT 0"),
            ("is_full", "BOOLEAN DEFAULT FALSE"),
            ("service_type", "VARCHAR(50) DEFAULT 'cab'"),
            ("visibility_mode", "VARCHAR(50) DEFAULT 'SPECIFIC_CITY'"),
            ("recurrence_type", "VARCHAR(50) DEFAULT 'SPECIFIC_DATE'"),
            ("max_route_deviation_km", "DOUBLE PRECISION DEFAULT 3.0"),
            ("max_pickup_radius_km", "DOUBLE PRECISION DEFAULT 5.0"),
            ("max_pickup_deviation_left_km", "DOUBLE PRECISION DEFAULT 3.0"),
            ("max_pickup_deviation_right_km", "DOUBLE PRECISION DEFAULT 3.0"),
            ("allowed_drop_deviation_km", "DOUBLE PRECISION DEFAULT 3.0"),
            ("min_fare", "NUMERIC(10, 2)"),
            ("is_negotiable", "BOOLEAN DEFAULT FALSE"),
            ("vehicle_id", "UUID REFERENCES vehicles(id)"),
            ("organization_id", "UUID"),
            ("schedule_template_id", "UUID"),
            ("service_metadata", "JSONB"),
        ]

        for col_name, col_def in trips_columns_to_add:
            try:
                await conn.execute(text(f"ALTER TABLE trips ADD COLUMN IF NOT EXISTS {col_name} {col_def}"))
                print(f"   + Column `trips.{col_name}` added or verified.")
            except Exception as e:
                print(f"   Column `trips.{col_name}` notice: {e}")

        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_trips_service_type ON trips(service_type)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_trips_is_full ON trips(is_full)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_trips_recurrence_type ON trips(recurrence_type)"))

        # ── 3. Seed initial Organizations and Routes ──────────────────────────
        print("3. Seeding master Organizations and College Routes...")
        
        sample_orgs = [
            {
                "name": "COEP Technological University",
                "code": "COEP-PUNE",
                "org_type": "college",
                "address": "Wellesley Rd, Shivajinagar, Pune, Maharashtra 411005",
                "latitude": 18.5293,
                "longitude": 73.8565,
                "city": "Pune",
                "phone": "+91 20 2550 7000",
                "email": "transport@coep.ac.in"
            },
            {
                "name": "Savitribai Phule Pune University (SPPU)",
                "code": "SPPU-PUNE",
                "org_type": "college",
                "address": "Ganeshkhind, Pune, Maharashtra 411007",
                "latitude": 18.5529,
                "longitude": 73.8266,
                "city": "Pune",
                "phone": "+91 20 2569 6061",
                "email": "campus-fleet@unipune.ac.in"
            },
            {
                "name": "Symbiosis International University",
                "code": "SIU-LAVALE",
                "org_type": "college",
                "address": "Gram Lavale, Tal Mulshi, Pune 412115",
                "latitude": 18.5362,
                "longitude": 73.7303,
                "city": "Pune",
                "phone": "+91 20 2811 6200",
                "email": "transport@symbiosis.ac.in"
            },
            {
                "name": "Tata Motors Tech Center",
                "code": "TATAMOTORS-PIMPRI",
                "org_type": "corporate",
                "address": "Pimpri, Pune, Maharashtra 411018",
                "latitude": 18.6298,
                "longitude": 73.7997,
                "city": "Pune",
                "phone": "+91 20 6613 1111",
                "email": "employee-commute@tatamotors.com"
            },
            {
                "name": "Infosys Hinjewadi Phase 1 & 2",
                "code": "INFOSYS-HINJ",
                "org_type": "corporate",
                "address": "Plot No 44, Electronic City, Hinjewadi, Pune 411057",
                "latitude": 18.5913,
                "longitude": 73.7389,
                "city": "Pune",
                "phone": "+91 20 2293 2800",
                "email": "transport-pune@infosys.com"
            }
        ]

        for org in sample_orgs:
            res = await conn.execute(text("SELECT id FROM organizations WHERE code = :code"), {"code": org["code"]})
            existing = res.scalar_one_or_none()
            if not existing:
                org_id = uuid.uuid4()
                await conn.execute(text("""
                    INSERT INTO organizations (id, name, code, org_type, address, latitude, longitude, city, contact_phone, contact_email)
                    VALUES (:id, :name, :code, :org_type, :address, :latitude, :longitude, :city, :phone, :email)
                """), {
                    "id": org_id,
                    "name": org["name"],
                    "code": org["code"],
                    "org_type": org["org_type"],
                    "address": org["address"],
                    "latitude": org["latitude"],
                    "longitude": org["longitude"],
                    "city": org["city"],
                    "phone": org["phone"],
                    "email": org["email"]
                })
                print(f"   + Seeded Organization: {org['name']}")
                
                # Seed default route for this org
                route_id = uuid.uuid4()
                sample_stops = [
                    {"name": "Swargate Bus Terminal", "lat": 18.5018, "lng": 73.8580, "time": "07:15 AM", "order": 1},
                    {"name": "Deccan Gymkhana Corner", "lat": 18.5167, "lng": 73.8415, "time": "07:30 AM", "order": 2},
                    {"name": "Shivajinagar Station", "lat": 18.5314, "lng": 73.8446, "time": "07:45 AM", "order": 3},
                    {"name": f"{org['name']} Main Campus Gate", "lat": org["latitude"], "lng": org["longitude"], "time": "08:15 AM", "order": 4}
                ]
                await conn.execute(text("""
                    INSERT INTO organization_routes (id, organization_id, route_name, stop_points, scheduled_start_time, scheduled_end_time, capacity)
                    VALUES (:id, :org_id, :route_name, CAST(:stop_points AS jsonb), :start_time, :end_time, :capacity)
                """), {
                    "id": route_id,
                    "org_id": org_id,
                    "route_name": f"Campus Express Line 1 — {org['name']}",
                    "stop_points": json.dumps(sample_stops),
                    "start_time": "07:15 AM",
                    "end_time": "08:15 AM",
                    "capacity": 35
                })
                print(f"   + Seeded Route: Campus Express Line 1 for {org['code']}")

    print("Database Migration and Seeding successfully completed!")

if __name__ == "__main__":
    asyncio.run(run_migration())
