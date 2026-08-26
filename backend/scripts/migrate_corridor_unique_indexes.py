"""
Migration script: Add unique indexes on corridor and route tables
"""
import sys
import asyncio
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend")
sys.path.insert(0, r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\common")

from sqlalchemy import text
from common.database import async_session_maker, engine

async def run_migration():
    print("Running migration for corridor unique indexes...")
    async with async_session_maker() as db:
        queries = [
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_route_geometry_trip_id ON trip_route_geometry(trip_id);",
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_trip_polygons_trip_id ON trip_polygons(trip_id);",
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_locations_customer_id ON customer_locations(customer_id);",
        ]
        for q in queries:
            try:
                await db.execute(text(q))
                print(f"Executed: {q}")
            except Exception as e:
                print(f"Query {q} error (or already exists): {e}")
        await db.commit()
    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(run_migration())
