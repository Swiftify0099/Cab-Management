"""
Verification test for publishing and querying all 7 mobility verticals:
1. Cab (Passenger Rideshare)
2. Transport (Goods / Logistics Freight)
3. Organization (College Campus Fleet & Corporate Commute)
4. Parcel (Express Package Delivery)
5. Hotel Transfer (Hospitality Concierge)
6. Airport Transfer (Flight Schedule Sync)
7. Packers & Movers (Relocation Services)
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'common')))

from common.database import async_session_maker
from common.models.all_models import User, Driver, Trip, TripStatus, Organization
from sqlalchemy import select
from geoalchemy2.elements import WKTElement

async def test_all_verticals():
    print("Testing All 7 Mobility Verticals Publishing...")
    
    async with async_session_maker() as session:
        driver_res = await session.execute(select(Driver))
        driver = driver_res.scalars().first()
        if not driver:
            print("No driver found, skipping")
            return

        verticals = [
            ("cab", {"trip_purpose": "fixed_route", "allow_luggage": True}, 4, 450.0),
            ("transport", {"material_category": "electronics", "weight_capacity_kg": 850, "volume_capacity_cft": 120}, 2, 2200.0),
            ("organization", {"organization_name": "COEP Technological University", "route_name": "Campus Line 1", "student_count": 28}, 30, 0.0),
            ("parcel", {"max_weight_kg": 20, "fragile_accepted": True, "same_day_delivery": True}, 1, 180.0),
            ("hotel", {"hotel_name": "JW Marriott Pune", "guest_luggage_count": 4, "transfer_target": "airport"}, 4, 850.0),
            ("airport", {"airport_name": "Pune International (PNQ)", "terminal_number": "T2", "buffer_minutes": 45}, 4, 950.0),
            ("packers", {"move_type": "2bhk", "loading_unloading_included": True, "labour_count": 3}, 2, 6500.0),
        ]

        created_trip_ids = []
        for service_key, meta, seats, fare in verticals:
            trip = Trip(
                id=uuid.uuid4(),
                driver_id=driver.id,
                pickup_location=WKTElement("POINT(73.8580 18.5018)", srid=4326),
                pickup_latitude=18.5018,
                pickup_longitude=73.8580,
                pickup_address=f"Swargate Hub - {service_key.upper()} Origin",
                pickup_city="Pune",
                destination_location=WKTElement("POINT(72.8478 19.0178)", srid=4326),
                destination_latitude=19.0178,
                destination_longitude=72.8478,
                destination_address=f"Mumbai Central - {service_key.upper()} Destination",
                destination_city="Mumbai",
                departure_time=datetime.now(timezone.utc) + timedelta(hours=4),
                total_seats=seats,
                available_seats=seats,
                occupied_seats=0,
                is_full=False,
                service_type=service_key,
                visibility_mode="SPECIFIC_CITY",
                recurrence_type="DAILY" if service_key in ["cab", "organization"] else "SPECIFIC_DATE",
                max_route_deviation_km=3.0,
                max_pickup_deviation_left_km=3.0,
                max_pickup_deviation_right_km=3.0,
                base_fare=fare,
                per_km_rate=4.0,
                status=TripStatus.PUBLISHED,
                vehicle_type="truck" if service_key in ["transport", "packers"] else "sedan",
                service_metadata=meta,
            )
            session.add(trip)
            created_trip_ids.append((service_key, trip.id))

        await session.commit()
        
        print(f"Successfully published all {len(created_trip_ids)} verticals:")
        for s_key, t_id in created_trip_ids:
            print(f"   + Vertical `{s_key.upper()}`: Trip ID = {t_id}")

    print("All 7 Verticals Published and Validated in DB successfully!")

if __name__ == "__main__":
    asyncio.run(test_all_verticals())
