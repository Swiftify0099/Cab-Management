import sys, os, asyncio, uuid
sys.path.insert(0, r"c:\Users\panka\OneDrive\Desktop\CabBooking\backend")
sys.path.insert(0, r"c:\Users\panka\OneDrive\Desktop\CabBooking\backend\auth-service")
from common.database import async_session_maker
from common.models.all_models import User, Driver
from app.services.kyc_service import get_driver_kyc_dashboard
from sqlalchemy import select

async def verify():
    async with async_session_maker() as session:
        user_res = await session.execute(select(User).where(User.phone == "+917755995615"))
        user = user_res.scalar_one_or_none()
        
        driver_res = await session.execute(select(Driver).where(Driver.user_id == user.id))
        driver = driver_res.scalar_one_or_none()
        
        print(f"Driver Found: {driver.full_name}, ID: {driver.id}, KYC Status: {driver.kyc_status}, is_verified: {driver.is_verified}")
        
        dashboard = await get_driver_kyc_dashboard(session, driver, user)
        print("=== KYC DASHBOARD OUTPUT ===")
        print(f"Overall Status: {dashboard.overall_status}")
        print(f"Overall Status Label: {dashboard.overall_status_label}")
        print(f"Completion Percentage: {dashboard.completion_percentage}%")
        print(f"Action Required Count: {dashboard.action_required_count}")
        print(f"Can Go Online: {dashboard.can_go_online}")
        print("Sections:")
        for s in dashboard.sections:
            print(f"  - {s.title}: {s.completed_count}/{s.total_count} ({s.completion_pct}%)")
            for it in s.items:
                print(f"      * {it.name} [{it.doc_type}]: {it.status} (Exp: {it.expiry_label})")

if __name__ == "__main__":
    asyncio.run(verify())
