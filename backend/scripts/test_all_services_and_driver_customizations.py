"""
End-to-End Verification Test for Transport, Airport, Hotel, Packers & Driver Service Customizations.
"""
import asyncio
import os
import sys
import importlib.util

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from common.database import async_session_maker
from common.models.all_models import Driver, User, DriverPreference
from sqlalchemy import select


def load_module_from_path(module_name: str, file_path: str):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


async def test_all():
    print("================================================================================")
    print("VERIFYING ALL SERVICES & DRIVER CUSTOMIZATIONS")
    print("================================================================================")

    # 1. Matching Radar Service
    sys.path.insert(0, os.path.join(_BACKEND_DIR, "matching-service"))
    from app.services.smart_radar import SmartRadarService

    async with async_session_maker() as db:
        print("\n--- 1. Testing Driver Service Preferences & Customizations ---")
        radar_svc = SmartRadarService(db)
        d_res = await db.execute(select(Driver).limit(1))
        driver = d_res.scalar_one_or_none()
        if driver:
            pref = await radar_svc.update_driver_preferences(
                driver_id=driver.id,
                mode="balanced",
                allow_local=True,
                allow_airport=True,
                allow_outstation=True,
                allow_rental=True,
                allow_parcel=True,
                allow_transport=True,
                allow_packers=True,
                allow_carpool=True,
                allow_scheduled=True,
                ladies_only_accepted=True,
                service_customizations={
                    "transport": {"max_payload_kg": 4000, "helpers_provided": 2, "accept_fragile": True},
                    "airport": {"meet_and_greet_enabled": True, "auto_flight_delay_adjust": True},
                    "packers": {"crew_size": 4, "provides_assembly": True, "provides_fragile_packing": True},
                },
            )
            print(f"  [OK] Driver preferences updated for Driver {driver.id}")
            print(f"       allow_transport={pref.allow_transport}, allow_packers={pref.allow_packers}, allow_airport={pref.allow_airport}")
            print(f"       service_customizations={pref.service_customizations}")
        else:
            print("  [WARN] No drivers in DB to test preferences on.")

    # 2. Airport Service
    sys.modules.pop("app", None)
    for k in list(sys.modules.keys()):
        if k.startswith("app."):
            sys.modules.pop(k, None)
    sys.path[0] = os.path.join(_BACKEND_DIR, "airport-service")
    from app.services.airport_service import AirportService

    async with async_session_maker() as db:
        print("\n--- 2. Testing Airport Service ---")
        airports = await AirportService.list_airports(db)
        print(f"  [OK] Found {len(airports)} airport hubs: {[a['code'] for a in airports]}")

    # 3. Hotel Service
    sys.modules.pop("app", None)
    for k in list(sys.modules.keys()):
        if k.startswith("app."):
            sys.modules.pop(k, None)
    sys.path[0] = os.path.join(_BACKEND_DIR, "hotel-service")
    from app.services.hotel_service import HotelService

    async with async_session_maker() as db:
        print("\n--- 3. Testing Hotel Service ---")
        hotel_svc = HotelService(db)
        hotel_res = await hotel_svc.search_hotels(city="Pune")
        print(f"  [OK] Found {len(hotel_res.get('hotels', []))} hotels in Pune.")

    # 4. Transport Service
    sys.modules.pop("app", None)
    for k in list(sys.modules.keys()):
        if k.startswith("app."):
            sys.modules.pop(k, None)
    sys.path[0] = os.path.join(_BACKEND_DIR, "transport-service")
    from app.services.transport_service import TransportService

    async with async_session_maker() as db:
        print("\n--- 4. Testing Commercial Transport Service ---")
        trans_svc = TransportService(db)
        quote = await trans_svc.calculate_estimate(
            pickup_lat=18.6279,
            pickup_lng=73.8474,
            drop_lat=18.7562,
            drop_lng=73.8344,
            goods_category="GENERAL",
            goods_description="Industrial spare parts",
            weight_kg=600.0,
            vehicle_category="TATA_ACE",
            helpers_count=1,
        )
        print(f"  [OK] Transport estimate generated: total_fare=Rs.{quote['financials']['total_fare']}, distance={quote['distance_km']}km")

    # 5. Packers Service
    sys.modules.pop("app", None)
    for k in list(sys.modules.keys()):
        if k.startswith("app."):
            sys.modules.pop(k, None)
    sys.path[0] = os.path.join(_BACKEND_DIR, "packers-service")
    from app.services.packers_service import PackersService

    async with async_session_maker() as db:
        print("\n--- 5. Testing Packers & Movers Service ---")
        pack_svc = PackersService(db)
        p_est = await pack_svc.estimate_move(
            move_size="2_BHK",
            distance_km=15.0,
            pickup_floor=2,
            pickup_has_lift=True,
            drop_floor=1,
            drop_has_lift=True,
            requires_assembly=True,
            requires_fragile_packing=True,
        )
        print(f"  [OK] Packers estimate generated: total=Rs.{p_est['estimated_total']}, size={p_est['move_size']}")

    print("\n================================================================================")
    print("ALL 5 DOMAIN ENGINES TESTED SUCCESSFULLY [OK]")
    print("================================================================================")


if __name__ == "__main__":
    asyncio.run(test_all())
