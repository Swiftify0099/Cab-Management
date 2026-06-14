import asyncio
from datetime import datetime, timezone
import uuid
from common.database import async_session_maker
from app.services.trip_service import TripService
from common.models.all_models import User, Driver

async def test_create():
    async with async_session_maker() as db:
        # Get first active driver
        from sqlalchemy import select
        res = await db.execute(select(Driver).limit(1))
        driver = res.scalar_one()
        
        service = TripService(db)
        try:
            trip = await service.create_trip(
                driver_user_id=str(driver.user_id),
                pickup_lat=28.7041,
                pickup_lng=77.1025,
                destination_lat=27.1767,
                destination_lng=78.0081,
                departure_time=datetime.now(timezone.utc),
                total_seats=4,
                vehicle_type="sedan",
                base_fare=2000.0,
                per_km_rate=10.0,
                non_stop=True
            )
            print("TRIP CREATED:", trip)
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(test_create())
