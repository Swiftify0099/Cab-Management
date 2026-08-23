"""
===============================================================================
SEED DEMO COMMERCIAL TRANSPORT INVENTORY & TRANSPORTER PROFILES — FEATURE 17
===============================================================================
"""
import asyncio
import os
import sys
import uuid
from decimal import Decimal

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy import select
from common.database import async_session_maker
from common.models.all_models import (
    User, UserRole, CustomerProfile, Driver, DriverStatus,
    Vehicle, VehicleType, KYCStatus
)


DEMO_TRANSPORTERS = [
    {
        "phone": "+919822001101",
        "name": "Suresh Transporters & Logistics",
        "vehicle_type": VehicleType.TEMPO_TRAVELLER,
        "category_code": "TATA_ACE",
        "make": "Tata",
        "model": "Ace Gold (Chhota Hathi)",
        "year": 2024,
        "color": "White",
        "reg_num": "MH 12 TC 1024",
        "payload_kg": 750.0,
        "volume_cft": 120.0,
        "wallet": Decimal("25000.00"),
    },
    {
        "phone": "+919822001102",
        "name": "Patil Freight Carriers",
        "vehicle_type": VehicleType.TEMPO_TRAVELLER,
        "category_code": "BOLERO_PICKUP",
        "make": "Mahindra",
        "model": "Bolero Maxi Truck Plus 8ft",
        "year": 2023,
        "color": "Silver",
        "reg_num": "MH 14 PF 8820",
        "payload_kg": 1500.0,
        "volume_cft": 220.0,
        "wallet": Decimal("30000.00"),
    },
    {
        "phone": "+919822001103",
        "name": "Sahyadri Heavy Logistics Ltd",
        "vehicle_type": VehicleType.MINI_BUS,
        "category_code": "EICHER_14FT",
        "make": "Eicher",
        "model": "Pro 2049 (14ft Cargo)",
        "year": 2023,
        "color": "Blue",
        "reg_num": "MH 09 SH 9001",
        "payload_kg": 4000.0,
        "volume_cft": 650.0,
        "wallet": Decimal("50000.00"),
    },
]


async def seed_transport_inventory():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("🚛 Seeding Demo Commercial Transport Transporters & Fleet Inventory...")

    async with async_session_maker() as db:
        for t in DEMO_TRANSPORTERS:
            # Check if user exists
            u_res = await db.execute(select(User).where(User.phone == t["phone"]))
            user = u_res.scalar_one_or_none()
            if not user:
                user = User(
                    id=uuid.uuid4(),
                    phone=t["phone"],
                    role=UserRole.DRIVER,
                    is_verified=True,
                    is_active=True,
                    is_profile_complete=True,
                )
                db.add(user)
                await db.flush()

            # Profile / Driver
            d_res = await db.execute(select(Driver).where(Driver.user_id == user.id))
            driver = d_res.scalar_one_or_none()
            if not driver:
                driver = Driver(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    full_name=t["name"],
                    phone=t["phone"],
                    status=DriverStatus.ONLINE,
                    kyc_status=KYCStatus.APPROVED,
                    rating=Decimal("4.9"),
                    total_trips=210,
                )
                db.add(driver)
                await db.flush()

            # CustomerProfile for wallet
            p_res = await db.execute(select(CustomerProfile).where(CustomerProfile.user_id == user.id))
            prof = p_res.scalar_one_or_none()
            if not prof:
                prof = CustomerProfile(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    full_name=t["name"],
                    wallet_balance=t["wallet"],
                )
                db.add(prof)

            # Commercial Vehicle
            v_res = await db.execute(select(Vehicle).where(Vehicle.registration_number == t["reg_num"]))
            veh = v_res.scalar_one_or_none()
            if not veh:
                veh = Vehicle(
                    id=uuid.uuid4(),
                    driver_id=driver.id,
                    vehicle_type=t["vehicle_type"],
                    make=t["make"],
                    model=t["model"],
                    year=t["year"],
                    color=t["color"],
                    registration_number=t["reg_num"],
                    seat_capacity=3,
                    transport_capable=True,
                    max_payload_kg=t["payload_kg"],
                    cargo_volume_cft=t["volume_cft"],
                    commercial_permit=True,
                )
                db.add(veh)
            else:
                veh.transport_capable = True
                veh.max_payload_kg = t["payload_kg"]
                veh.cargo_volume_cft = t["volume_cft"]
                veh.commercial_permit = True

            print(f"  ✓ Transporter '{t['name']}' ({t['make']} {t['model']}) Ready. Capacity: {t['payload_kg']} kg")

        await db.commit()

    print("🎉 Demo Commercial Transport Inventory Seeded Successfully!")


if __name__ == "__main__":
    asyncio.run(seed_transport_inventory())
