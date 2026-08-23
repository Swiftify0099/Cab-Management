"""
Sync and Seed Spatial Hierarchy & Driver Coverage.
Creates tables, adds missing columns, and seeds initial service cities (Sangli, Kolhapur, Pune, Mumbai)
along with zones and H3 hex cells.
"""
import sys
import os
import asyncio
import uuid

sys.path.insert(0, os.path.abspath("backend/common"))
sys.path.insert(0, os.path.abspath("backend"))

from sqlalchemy import text, select
from common.database import engine, Base, async_session_maker
import common.models.all_models as models


INITIAL_CITIES = [
    {
        "name": "Sangli",
        "state": "Maharashtra",
        "country": "India",
        "center_lat": 16.8524,
        "center_lng": 74.5815,
        "radius_km": 25.0,
        "max_pickup_radius_km": 15.0,
        "max_pickup_eta_min": 25,
        "zones": ["Sangli City", "Miraj", "Kupwad MIDC", "Vishrambag"],
    },
    {
        "name": "Kolhapur",
        "state": "Maharashtra",
        "country": "India",
        "center_lat": 16.7050,
        "center_lng": 74.2433,
        "radius_km": 25.0,
        "max_pickup_radius_km": 15.0,
        "max_pickup_eta_min": 25,
        "zones": ["Kolhapur Central", "Rajarampuri", "Shiroli MIDC", "Gandhinagar"],
    },
    {
        "name": "Pune",
        "state": "Maharashtra",
        "country": "India",
        "center_lat": 18.5204,
        "center_lng": 73.8567,
        "radius_km": 35.0,
        "max_pickup_radius_km": 20.0,
        "max_pickup_eta_min": 35,
        "zones": ["Shivajinagar", "Hinjawadi IT Park", "Kothrud", "Viman Nagar", "Baner", "Hadapsar"],
    },
    {
        "name": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "center_lat": 19.0760,
        "center_lng": 72.8777,
        "radius_km": 45.0,
        "max_pickup_radius_km": 25.0,
        "max_pickup_eta_min": 45,
        "zones": ["South Mumbai", "Bandra-Kurla Complex (BKC)", "Andheri", "Thane", "Navi Mumbai"],
    },
]


async def run_sync_and_seed():
    print("=== Step 1: Creating new spatial and driver coverage tables ===")
    async with engine.begin() as conn:
        # Create tables if not exist
        await conn.run_sync(Base.metadata.create_all)

        # Alter table for missing columns on existing tables
        alter_stmts = [
            "ALTER TABLE driver_preferences ADD COLUMN IF NOT EXISTS visibility_mode VARCHAR(30) DEFAULT 'all_city';",
            "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pickup_city_id UUID REFERENCES service_cities(id) ON DELETE SET NULL;",
            "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pickup_zone_id UUID REFERENCES service_zones(id) ON DELETE SET NULL;",
            "ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS pickup_hex_id UUID REFERENCES service_hexes(id) ON DELETE SET NULL;",
        ]
        for stmt in alter_stmts:
            try:
                await conn.execute(text(stmt))
                print(f"Executed: {stmt}")
            except Exception as e:
                print(f"Note on {stmt}: {e}")

    print("\n=== Step 2: Seeding Initial Cities & Zones ===")
    async with async_session_maker() as session:
        for cdata in INITIAL_CITIES:
            # Check if city exists
            res = await session.execute(
                select(models.ServiceCity).where(models.ServiceCity.name == cdata["name"])
            )
            city = res.scalar_one_or_none()
            center_wkt = f"SRID=4326;POINT({cdata['center_lng']} {cdata['center_lat']})"

            if not city:
                city = models.ServiceCity(
                    name=cdata["name"],
                    state=cdata["state"],
                    country=cdata["country"],
                    center_location=center_wkt,
                    center_lat=cdata["center_lat"],
                    center_lng=cdata["center_lng"],
                    radius_km=cdata["radius_km"],
                    max_pickup_radius_km=cdata["max_pickup_radius_km"],
                    max_pickup_eta_min=cdata["max_pickup_eta_min"],
                    is_active=True,
                )
                session.add(city)
                await session.flush()
                print(f"Created ServiceCity: {city.name} (ID: {city.id})")
            else:
                city.center_location = center_wkt
                city.center_lat = cdata["center_lat"]
                city.center_lng = cdata["center_lng"]
                city.radius_km = cdata["radius_km"]
                print(f"Existing ServiceCity: {city.name} (ID: {city.id})")

            # Seed zones
            for zname in cdata["zones"]:
                zres = await session.execute(
                    select(models.ServiceZone).where(
                        models.ServiceZone.city_id == city.id,
                        models.ServiceZone.name == zname,
                    )
                )
                zone = zres.scalar_one_or_none()
                if not zone:
                    zone = models.ServiceZone(
                        city_id=city.id,
                        name=zname,
                        center_location=center_wkt,
                        center_lat=cdata["center_lat"],
                        center_lng=cdata["center_lng"],
                        is_active=True,
                    )
                    session.add(zone)
                    await session.flush()
                    print(f"  Created ServiceZone: {zname}")

            # Generate H3 Hex if H3 available
            try:
                import h3
                h3_index = h3.latlng_to_cell(cdata["center_lat"], cdata["center_lng"], 7)
                hex_res = await session.execute(
                    select(models.ServiceHex).where(models.ServiceHex.h3_index == h3_index)
                )
                hex_cell = hex_res.scalar_one_or_none()
                if not hex_cell:
                    hex_cell = models.ServiceHex(
                        city_id=city.id,
                        h3_index=h3_index,
                        resolution=7,
                        display_name=f"{city.name} Central Hex",
                        center_lat=cdata["center_lat"],
                        center_lng=cdata["center_lng"],
                        is_active=True,
                    )
                    session.add(hex_cell)
                    print(f"  Created ServiceHex: {h3_index} for {city.name}")
            except ImportError:
                pass

        await session.commit()

    print("\n=== Step 3: Giving all existing drivers default ALL_CITY coverage for seeded cities ===")
    async with async_session_maker() as session:
        drivers_res = await session.execute(select(models.Driver))
        drivers = drivers_res.scalars().all()
        cities_res = await session.execute(select(models.ServiceCity))
        cities = cities_res.scalars().all()

        for driver in drivers:
            # Ensure driver preference exists with all_city mode
            pref_res = await session.execute(
                select(models.DriverPreference).where(models.DriverPreference.driver_id == driver.id)
            )
            pref = pref_res.scalar_one_or_none()
            if not pref:
                pref = models.DriverPreference(
                    driver_id=driver.id,
                    mode="balanced",
                    visibility_mode="all_city",
                    max_pickup_distance_km=15.0,
                    max_pickup_eta_min=30,
                )
                session.add(pref)
            else:
                if not pref.visibility_mode:
                    pref.visibility_mode = "all_city"

            # Attach coverage for Sangli, Kolhapur, Pune by default
            for city in cities:
                cov_res = await session.execute(
                    select(models.DriverCityCoverage).where(
                        models.DriverCityCoverage.driver_id == driver.id,
                        models.DriverCityCoverage.city_id == city.id,
                    )
                )
                cov = cov_res.scalar_one_or_none()
                if not cov:
                    session.add(models.DriverCityCoverage(
                        driver_id=driver.id,
                        city_id=city.id,
                        is_active=True,
                        is_selected=True,
                    ))

        await session.commit()
        print(f"Updated default coverage for {len(drivers)} drivers.")

    print("\n Spatial Hierarchy & Driver Coverage initialization completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_sync_and_seed())
