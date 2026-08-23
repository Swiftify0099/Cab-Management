"""
Feature 18: Demo Airport Master Data & Flight Snapshot Seeder.
Populates Pune (PNQ), Mumbai (BOM), Goa (GOI), Delhi (DEL), their operational terminals,
and active flights (AI123, 6E402, UK819, SG204) for realistic SuperApp simulations.
"""
import asyncio
import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import select
from common.database import async_session_maker
from common.models.all_models import Airport, AirportTerminal, FlightSnapshot, FlightStatus

AIRPORTS_DATA = [
    {
        "code": "PNQ",
        "name": "Pune International Airport",
        "city": "Pune",
        "country": "India",
        "latitude": 18.5822,
        "longitude": 73.9197,
        "timezone": "Asia/Kolkata",
        "base_airport_fee": 100.0,
        "free_waiting_mins": 45,
        "paid_waiting_rate_per_min": 3.0,
        "terminals": [
            {
                "code": "T2",
                "name": "Terminal 2 (New Integrated Terminal)",
                "pickup_point_desc": "Arrival Gate Pillar 4 / App Cab Zone B",
                "drop_point_desc": "Departure Flyover Upper Level Gate 2",
                "latitude": 18.5825,
                "longitude": 73.9199,
            },
            {
                "code": "T1",
                "name": "Terminal 1 (Old Domestic)",
                "pickup_point_desc": "Domestic Arrival Exit / Zone A",
                "drop_point_desc": "Departure Forecourt",
                "latitude": 18.5815,
                "longitude": 73.9192,
            },
        ],
    },
    {
        "code": "BOM",
        "name": "Chhatrapati Shivaji Maharaj International Airport",
        "city": "Mumbai",
        "country": "India",
        "latitude": 19.0896,
        "longitude": 72.8656,
        "timezone": "Asia/Kolkata",
        "base_airport_fee": 150.0,
        "free_waiting_mins": 45,
        "paid_waiting_rate_per_min": 4.0,
        "terminals": [
            {
                "code": "T2",
                "name": "Terminal 2 (Sahar - International & Domestic)",
                "pickup_point_desc": "Level P4 West Parking / App Cab Pickup",
                "drop_point_desc": "Departure Ramp Gate 4-6",
                "latitude": 19.0886,
                "longitude": 72.8679,
            },
            {
                "code": "T1",
                "name": "Terminal 1 (Santacruz - Domestic Low-Cost)",
                "pickup_point_desc": "Arrival Curbside Pillar 12",
                "drop_point_desc": "Departure Hall Gate 1",
                "latitude": 19.0968,
                "longitude": 72.8528,
            },
        ],
    },
    {
        "code": "GOI",
        "name": "Goa Dabolim International Airport",
        "city": "Goa",
        "country": "India",
        "latitude": 15.3808,
        "longitude": 73.8314,
        "timezone": "Asia/Kolkata",
        "base_airport_fee": 120.0,
        "free_waiting_mins": 45,
        "paid_waiting_rate_per_min": 3.5,
        "terminals": [
            {
                "code": "T1",
                "name": "Integrated Passenger Terminal",
                "pickup_point_desc": "Arrival Concourse Canopy / Taxi Bay 3",
                "drop_point_desc": "Departure Departure Gate 1",
                "latitude": 15.3810,
                "longitude": 73.8318,
            },
        ],
    },
    {
        "code": "DEL",
        "name": "Indira Gandhi International Airport",
        "city": "Delhi",
        "country": "India",
        "latitude": 28.5562,
        "longitude": 77.1000,
        "timezone": "Asia/Kolkata",
        "base_airport_fee": 150.0,
        "free_waiting_mins": 45,
        "paid_waiting_rate_per_min": 4.0,
        "terminals": [
            {
                "code": "T3",
                "name": "Terminal 3 (International & Full Service)",
                "pickup_point_desc": "Multi-Level Car Parking (MLCP) Floor 2 Pillar 8",
                "drop_point_desc": "Departure Forecourt Gate 4",
                "latitude": 28.5565,
                "longitude": 77.0855,
            },
        ],
    },
]

FLIGHTS_DATA = [
    {
        "flight_number": "AI123",
        "airline_code": "AI",
        "airline_name": "Air India",
        "departure_airport_code": "DEL",
        "arrival_airport_code": "PNQ",
        "dep_time": "16:30",
        "arr_time": "18:45",
        "status": FlightStatus.IN_AIR,
        "delay": 0,
        "terminal": "T2",
        "gate": "Gate 14",
        "baggage_belt": "Belt 3",
    },
    {
        "flight_number": "6E402",
        "airline_code": "6E",
        "airline_name": "IndiGo",
        "departure_airport_code": "BOM",
        "arrival_airport_code": "PNQ",
        "dep_time": "19:15",
        "arr_time": "20:10",
        "status": FlightStatus.SCHEDULED,
        "delay": 25,
        "terminal": "T2",
        "gate": "Gate 8",
        "baggage_belt": "Belt 1",
    },
    {
        "flight_number": "UK819",
        "airline_code": "UK",
        "airline_name": "Vistara",
        "departure_airport_code": "DEL",
        "arrival_airport_code": "BOM",
        "dep_time": "14:00",
        "arr_time": "16:15",
        "status": FlightStatus.LANDED,
        "delay": 0,
        "terminal": "T2",
        "gate": "Gate 42",
        "baggage_belt": "Belt 6",
    },
    {
        "flight_number": "SG204",
        "airline_code": "SG",
        "airline_name": "SpiceJet",
        "departure_airport_code": "GOI",
        "arrival_airport_code": "PNQ",
        "dep_time": "11:20",
        "arr_time": "12:25",
        "status": FlightStatus.SCHEDULED,
        "delay": 0,
        "terminal": "T1",
        "gate": "Gate 2",
        "baggage_belt": "Belt 2",
    },
]

async def seed_airports():
    print("=" * 80)
    print("✈️ SEEDING AIRPORT HUBS, TERMINALS & FLIGHT SNAPSHOTS (FEATURE 18)")
    print("=" * 80)

    async with async_session_maker() as session:
        # Seed Airports and Terminals
        for apt_dict in AIRPORTS_DATA:
            existing = await session.execute(select(Airport).where(Airport.code == apt_dict["code"]))
            airport = existing.scalar_one_or_none()
            if not airport:
                airport = Airport(
                    code=apt_dict["code"],
                    name=apt_dict["name"],
                    city=apt_dict["city"],
                    country=apt_dict["country"],
                    latitude=apt_dict["latitude"],
                    longitude=apt_dict["longitude"],
                    timezone=apt_dict["timezone"],
                    base_airport_fee=apt_dict["base_airport_fee"],
                    free_waiting_mins=apt_dict["free_waiting_mins"],
                    paid_waiting_rate_per_min=apt_dict["paid_waiting_rate_per_min"],
                )
                session.add(airport)
                await session.flush()
                print(f"  + Added Airport: {airport.name} ({airport.code})")

                # Add Terminals
                for term_dict in apt_dict["terminals"]:
                    term = AirportTerminal(
                        airport_id=airport.id,
                        name=term_dict["name"],
                        code=term_dict["code"],
                        pickup_point_desc=term_dict["pickup_point_desc"],
                        drop_point_desc=term_dict["drop_point_desc"],
                        latitude=term_dict["latitude"],
                        longitude=term_dict["longitude"],
                    )
                    session.add(term)
                    print(f"    - Added Terminal: {term.name} ({term.code})")
            else:
                print(f"  ✓ Airport {airport.code} already exists.")

        # Seed Flights
        today = date.today()
        now_utc = datetime.now(timezone.utc)

        for f_data in FLIGHTS_DATA:
            existing_f = await session.execute(
                select(FlightSnapshot).where(
                    FlightSnapshot.flight_number == f_data["flight_number"],
                    FlightSnapshot.flight_date == today,
                )
            )
            snapshot = existing_f.scalar_one_or_none()
            if not snapshot:
                dep_h, dep_m = map(int, f_data["dep_time"].split(":"))
                arr_h, arr_m = map(int, f_data["arr_time"].split(":"))
                sched_dep = datetime(today.year, today.month, today.day, dep_h, dep_m, tzinfo=timezone.utc)
                sched_arr = datetime(today.year, today.month, today.day, arr_h, arr_m, tzinfo=timezone.utc)
                est_arr = sched_arr + timedelta(minutes=f_data["delay"])

                snapshot = FlightSnapshot(
                    flight_number=f_data["flight_number"],
                    flight_date=today,
                    airline_code=f_data["airline_code"],
                    airline_name=f_data["airline_name"],
                    departure_airport_code=f_data["departure_airport_code"],
                    arrival_airport_code=f_data["arrival_airport_code"],
                    scheduled_departure=sched_dep,
                    scheduled_arrival=sched_arr,
                    actual_or_estimated_arrival=est_arr,
                    status=f_data["status"],
                    delay_minutes=f_data["delay"],
                    terminal=f_data["terminal"],
                    gate=f_data["gate"],
                    baggage_belt=f_data["baggage_belt"],
                    last_synced_at=now_utc,
                )
                session.add(snapshot)
                print(f"  + Added Flight Snapshot: {snapshot.flight_number} ({snapshot.airline_name}) • {snapshot.status.value}")
            else:
                print(f"  ✓ Flight Snapshot {snapshot.flight_number} already exists.")

        await session.commit()

    print("\n✅ Airport Hubs, Terminals, and Live Flight Snapshots successfully seeded!")

if __name__ == "__main__":
    asyncio.run(seed_airports())
