"""
Feature 18: DDL Migration Script for Airport Service & Flight-Aware Logistics.
Creates airports, airport_terminals, flight_snapshots, airport_bookings, and airport_waiting_logs tables.
"""
import asyncio
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import text
from common.database import async_session_maker

INDIVIDUAL_STATEMENTS = [
    # Enums
    """
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'airporttransfertype') THEN
            CREATE TYPE airporttransfertype AS ENUM ('PICKUP', 'DROP');
        END IF;
    END$$;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flightstatus') THEN
            CREATE TYPE flightstatus AS ENUM ('SCHEDULED', 'DELAYED', 'BOARDING', 'DEPARTED', 'IN_AIR', 'LANDED', 'CANCELLED', 'DIVERTED', 'UNKNOWN');
        END IF;
    END$$;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'airportbookingstatus') THEN
            CREATE TYPE airportbookingstatus AS ENUM ('confirmed', 'driver_assigned', 'driver_en_route', 'driver_arrived', 'waiting', 'in_progress', 'completed', 'cancelled', 'flight_cancelled');
        END IF;
    END$$;
    """,

    # airports table
    """
    CREATE TABLE IF NOT EXISTS airports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        city VARCHAR(100) NOT NULL,
        country VARCHAR(100) DEFAULT 'India' NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        timezone VARCHAR(50) DEFAULT 'Asia/Kolkata' NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        base_airport_fee DOUBLE PRECISION DEFAULT 100.0 NOT NULL,
        free_waiting_mins INTEGER DEFAULT 45 NOT NULL,
        paid_waiting_rate_per_min DOUBLE PRECISION DEFAULT 3.0 NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_airports_city ON airports(city);",
    "CREATE INDEX IF NOT EXISTS idx_airports_code ON airports(code);",

    # airport_terminals table
    """
    CREATE TABLE IF NOT EXISTS airport_terminals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        pickup_point_desc VARCHAR(255) DEFAULT 'Arrival Gate Pillar 4 / Cab Pickup Zone' NOT NULL,
        drop_point_desc VARCHAR(255) DEFAULT 'Departure Gate Upper Level' NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_airport_terminals_airport_id ON airport_terminals(airport_id);",

    # flight_snapshots table
    """
    CREATE TABLE IF NOT EXISTS flight_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        flight_number VARCHAR(20) NOT NULL,
        flight_date DATE NOT NULL,
        airline_code VARCHAR(10) NOT NULL,
        airline_name VARCHAR(100) NOT NULL,
        departure_airport_code VARCHAR(10) NOT NULL,
        arrival_airport_code VARCHAR(10) NOT NULL,
        scheduled_departure TIMESTAMPTZ NOT NULL,
        scheduled_arrival TIMESTAMPTZ NOT NULL,
        actual_or_estimated_arrival TIMESTAMPTZ NOT NULL,
        status flightstatus DEFAULT 'SCHEDULED' NOT NULL,
        delay_minutes INTEGER DEFAULT 0 NOT NULL,
        terminal VARCHAR(20),
        gate VARCHAR(20),
        baggage_belt VARCHAR(20),
        last_synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT uq_flight_snapshot_num_date UNIQUE (flight_number, flight_date)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_flight_snapshots_num_date ON flight_snapshots(flight_number, flight_date);",

    # airport_bookings table
    """
    CREATE TABLE IF NOT EXISTS airport_bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_reference VARCHAR(32) UNIQUE NOT NULL,
        customer_id UUID NOT NULL REFERENCES users(id),
        airport_id UUID NOT NULL REFERENCES airports(id),
        terminal_id UUID REFERENCES airport_terminals(id),
        transfer_type airporttransfertype DEFAULT 'PICKUP' NOT NULL,
        ride_id UUID REFERENCES ride_requests(id),
        driver_id UUID REFERENCES drivers(id),
        vehicle_id UUID REFERENCES vehicles(id),
        vehicle_category VARCHAR(50) DEFAULT 'SEDAN' NOT NULL,
        flight_number VARCHAR(20),
        flight_date DATE,
        airline_name VARCHAR(100),
        flight_status flightstatus DEFAULT 'SCHEDULED' NOT NULL,
        flight_scheduled_time TIMESTAMPTZ,
        flight_updated_time TIMESTAMPTZ,
        flight_delay_minutes INTEGER DEFAULT 0 NOT NULL,
        scheduled_pickup_time TIMESTAMPTZ NOT NULL,
        recommended_pickup_window_start TIMESTAMPTZ NOT NULL,
        recommended_pickup_window_end TIMESTAMPTZ NOT NULL,
        pickup_address VARCHAR(500) NOT NULL,
        pickup_lat DOUBLE PRECISION NOT NULL,
        pickup_lng DOUBLE PRECISION NOT NULL,
        drop_address VARCHAR(500) NOT NULL,
        drop_lat DOUBLE PRECISION NOT NULL,
        drop_lng DOUBLE PRECISION NOT NULL,
        distance_km DOUBLE PRECISION DEFAULT 15.0 NOT NULL,
        passenger_count INTEGER DEFAULT 1 NOT NULL,
        large_luggage_count INTEGER DEFAULT 1 NOT NULL,
        cabin_luggage_count INTEGER DEFAULT 1 NOT NULL,
        child_seat_required BOOLEAN DEFAULT FALSE NOT NULL,
        child_seat_count INTEGER DEFAULT 0 NOT NULL,
        meet_and_greet_required BOOLEAN DEFAULT FALSE NOT NULL,
        meet_and_greet_name VARCHAR(100),
        special_instructions TEXT,
        base_fare DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        distance_fare DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        airport_fee DOUBLE PRECISION DEFAULT 100.0 NOT NULL,
        meet_and_greet_fee DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        child_seat_fee DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        luggage_fee DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        parking_fee DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        waiting_fee DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        discount_amount DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        tax_amount DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        total_fare DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'WALLET' NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'PAID' NOT NULL,
        linked_hotel_booking_id UUID REFERENCES property_bookings(id) ON DELETE SET NULL,
        status airportbookingstatus DEFAULT 'confirmed' NOT NULL,
        cancelled_reason VARCHAR(255),
        refund_amount DOUBLE PRECISION,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_airport_bookings_customer ON airport_bookings(customer_id);",
    "CREATE INDEX IF NOT EXISTS idx_airport_bookings_airport ON airport_bookings(airport_id);",
    "CREATE INDEX IF NOT EXISTS idx_airport_bookings_driver ON airport_bookings(driver_id);",
    "CREATE INDEX IF NOT EXISTS idx_airport_bookings_status ON airport_bookings(status);",
    "CREATE INDEX IF NOT EXISTS idx_airport_bookings_flight ON airport_bookings(flight_number);",

    # airport_waiting_logs table
    """
    CREATE TABLE IF NOT EXISTS airport_waiting_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES airport_bookings(id) ON DELETE CASCADE,
        driver_id UUID NOT NULL REFERENCES drivers(id),
        driver_arrived_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        grace_period_mins INTEGER DEFAULT 45 NOT NULL,
        free_until TIMESTAMPTZ NOT NULL,
        waiting_ended_at TIMESTAMPTZ,
        total_waiting_mins INTEGER DEFAULT 0 NOT NULL,
        billable_waiting_mins INTEGER DEFAULT 0 NOT NULL,
        parking_charge DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        waiting_charge DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_airport_waiting_booking ON airport_waiting_logs(booking_id);",
    "CREATE INDEX IF NOT EXISTS idx_airport_waiting_driver ON airport_waiting_logs(driver_id);"
]

async def run_migration():
    print("=" * 80)
    print("🚀 RUNNING DDL MIGRATION: FEATURE 18 AIRPORT SERVICE & FLIGHT-AWARE LOGISTICS")
    print("=" * 80)

    async with async_session_maker() as session:
        for i, stmt in enumerate(INDIVIDUAL_STATEMENTS, 1):
            clean_stmt = stmt.strip()
            if clean_stmt:
                await session.execute(text(clean_stmt))
        await session.commit()

    print("✅ All Feature 18 DDL statements executed and committed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migration())
