import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from backend.common.models.all_models import Trip, Driver

async def main():
    engine = create_async_engine('postgresql+asyncpg://cabooking_user:cabooking_pass@localhost:5432/cabooking')
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        uid = uuid.UUID('9285f835-6252-4308-9f83-d55c1f6f1401')
        try:
            print('Trying with UUID object')
            res = await session.execute(select(Trip).where(Trip.driver_id == uid))
            print('Success with UUID object!')
        except Exception as e:
            print('Failed with UUID object:', type(e), str(e))
            
        try:
            print('Trying with string')
            res = await session.execute(select(Trip).where(Trip.driver_id == str(uid)))
            print('Success with string!')
        except Exception as e:
            print('Failed with string:', type(e), str(e))

asyncio.run(main())
