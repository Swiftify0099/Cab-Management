"""
Seed Demo Rental Plans
Creates 4 standard plans (1h/2h/4h/8h) for Hatchback, Sedan, SUV.
"""
import asyncio, os, sys, uuid
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_root)
from common.database import async_session_maker, engine
from common.models.all_models import RentalPlan
from sqlalchemy import select, delete
from decimal import Decimal

PLANS = [
    # Hatchback
    {"name": "1 Hour / 10 KM", "duration_minutes": 60, "included_km": 10.0, "base_price": Decimal("299.00"), "extra_km_rate": Decimal("14.00"), "extra_hour_rate": Decimal("150.00"), "vehicle_category": "HATCHBACK", "sort_order": 1},
    {"name": "2 Hours / 20 KM", "duration_minutes": 120, "included_km": 20.0, "base_price": Decimal("499.00"), "extra_km_rate": Decimal("14.00"), "extra_hour_rate": Decimal("150.00"), "vehicle_category": "HATCHBACK", "sort_order": 2},
    {"name": "4 Hours / 40 KM", "duration_minutes": 240, "included_km": 40.0, "base_price": Decimal("799.00"), "extra_km_rate": Decimal("14.00"), "extra_hour_rate": Decimal("150.00"), "vehicle_category": "HATCHBACK", "sort_order": 3},
    {"name": "8 Hours / 80 KM", "duration_minutes": 480, "included_km": 80.0, "base_price": Decimal("1299.00"), "extra_km_rate": Decimal("14.00"), "extra_hour_rate": Decimal("150.00"), "vehicle_category": "HATCHBACK", "sort_order": 4, "min_custom_minutes": 60, "max_custom_minutes": 720},
    # Sedan
    {"name": "1 Hour / 10 KM", "duration_minutes": 60, "included_km": 10.0, "base_price": Decimal("399.00"), "extra_km_rate": Decimal("18.00"), "extra_hour_rate": Decimal("200.00"), "vehicle_category": "SEDAN", "sort_order": 1},
    {"name": "2 Hours / 20 KM", "duration_minutes": 120, "included_km": 20.0, "base_price": Decimal("699.00"), "extra_km_rate": Decimal("18.00"), "extra_hour_rate": Decimal("200.00"), "vehicle_category": "SEDAN", "sort_order": 2},
    {"name": "4 Hours / 40 KM", "duration_minutes": 240, "included_km": 40.0, "base_price": Decimal("999.00"), "extra_km_rate": Decimal("18.00"), "extra_hour_rate": Decimal("200.00"), "vehicle_category": "SEDAN", "sort_order": 3},
    {"name": "8 Hours / 80 KM", "duration_minutes": 480, "included_km": 80.0, "base_price": Decimal("1699.00"), "extra_km_rate": Decimal("18.00"), "extra_hour_rate": Decimal("200.00"), "vehicle_category": "SEDAN", "sort_order": 4, "min_custom_minutes": 60, "max_custom_minutes": 720},
    # SUV
    {"name": "1 Hour / 10 KM", "duration_minutes": 60, "included_km": 10.0, "base_price": Decimal("549.00"), "extra_km_rate": Decimal("22.00"), "extra_hour_rate": Decimal("280.00"), "vehicle_category": "SUV", "sort_order": 1},
    {"name": "2 Hours / 20 KM", "duration_minutes": 120, "included_km": 20.0, "base_price": Decimal("899.00"), "extra_km_rate": Decimal("22.00"), "extra_hour_rate": Decimal("280.00"), "vehicle_category": "SUV", "sort_order": 2},
    {"name": "4 Hours / 40 KM", "duration_minutes": 240, "included_km": 40.0, "base_price": Decimal("1399.00"), "extra_km_rate": Decimal("22.00"), "extra_hour_rate": Decimal("280.00"), "vehicle_category": "SUV", "sort_order": 3},
    {"name": "8 Hours / 80 KM", "duration_minutes": 480, "included_km": 80.0, "base_price": Decimal("2299.00"), "extra_km_rate": Decimal("22.00"), "extra_hour_rate": Decimal("280.00"), "vehicle_category": "SUV", "sort_order": 4, "min_custom_minutes": 60, "max_custom_minutes": 720},
]

async def seed():
    print("=" * 60)
    print("🌱 SEEDING RENTAL PLANS")
    print("=" * 60)
    async with async_session_maker() as db:
        # Clear existing
        await db.execute(delete(RentalPlan))
        await db.commit()
        for p in PLANS:
            plan = RentalPlan(
                id=uuid.uuid4(),
                name=p["name"],
                duration_minutes=p["duration_minutes"],
                included_km=p["included_km"],
                base_price=p["base_price"],
                extra_km_rate=p["extra_km_rate"],
                extra_hour_rate=p["extra_hour_rate"],
                vehicle_category=p["vehicle_category"],
                min_custom_minutes=p.get("min_custom_minutes"),
                max_custom_minutes=p.get("max_custom_minutes"),
                gst_percentage=5.0,
                is_active=True,
                sort_order=p["sort_order"],
            )
            db.add(plan)
        await db.commit()
        # Verify
        result = await db.execute(select(RentalPlan).where(RentalPlan.is_active == True))
        plans = result.scalars().all()
        print(f"\n✅ {len(plans)} rental plans seeded:")
        for p in plans:
            print(f"  [{p.vehicle_category}] {p.name} — ₹{p.base_price}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed())
