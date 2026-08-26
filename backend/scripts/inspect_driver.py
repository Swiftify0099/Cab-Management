import sys, os, asyncio
sys.path.insert(0, r"c:\Users\panka\OneDrive\Desktop\CabBooking\backend")
from common.database import async_session_maker
from sqlalchemy import text

async def check():
    async with async_session_maker() as session:
        drivers = (await session.execute(text("SELECT id, user_id, full_name, phone, kyc_status, is_verified, is_online, status FROM drivers WHERE phone LIKE '%7755995615%'"))).mappings().all()
        for d in drivers:
            print("DRIVER:", dict(d))
            docs = (await session.execute(text(f"SELECT id, doc_type, document_number, file_path, status, is_verified FROM driver_documents WHERE driver_id = '{d['id']}'"))).mappings().all()
            print("DOCS:")
            for doc in docs:
                print(" ", dict(doc))

if __name__ == "__main__":
    asyncio.run(check())
