"""
Seed script for Driver Pankaj Yewale (DRV-AD86)
Phone: +91 7755995615
Sets up user, driver profile, vehicle (Maruti Dzire MH12 AB 8686), bank account,
and all 10 realistic Indian government and transport documents.
"""
import asyncio
import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from common.models.all_models import (
    User, UserRole, Driver, Vehicle, VehicleType,
    DriverDocument, DriverBankAccount, DocumentType, KYCStatus
)

PANKAJ_PHONE = "+917755995615"
PANKAJ_NAME = "Pankaj Yewale"
DRIVER_ID = uuid.UUID("ad860000-0000-0000-0000-000000000001")
USER_ID = uuid.UUID("ad860000-0000-0000-0000-000000000002")
VEHICLE_ID = uuid.UUID("ad860000-0000-0000-0000-000000000003")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://cabooking_user:cabooking_pass@localhost:5432/cabooking"
)


async def seed_driver():
    print(f"Connecting to database to seed driver {PANKAJ_NAME} ({PANKAJ_PHONE})...")
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    try:
        async with async_session() as session:
            # 1. User
            user_res = await session.execute(
                select(User).where(User.phone == PANKAJ_PHONE)
            )
            user = user_res.scalar_one_or_none()
            if not user:
                user = User(
                    id=USER_ID,
                    phone=PANKAJ_PHONE,
                    full_name=PANKAJ_NAME,
                    email="pankaj.yewale@cabbooking.in",
                    role=UserRole.DRIVER,
                    is_active=True,
                    is_verified=True,
                )
                session.add(user)
                await session.flush()
                print("✓ Created User for Pankaj Yewale")
            else:
                user.full_name = PANKAJ_NAME
                user.is_active = True
                user.is_verified = True
                print("✓ Updated existing User")

            # 2. Driver
            driver_res = await session.execute(
                select(Driver).where(Driver.user_id == user.id)
            )
            driver = driver_res.scalar_one_or_none()
            if not driver:
                driver = Driver(
                    id=DRIVER_ID,
                    user_id=user.id,
                    full_name=PANKAJ_NAME,
                    phone=PANKAJ_PHONE,
                    rating=4.95,
                    total_trips=142,
                    is_online=True,
                    is_verified=True,
                    kyc_status=KYCStatus.APPROVED,
                    vehicle_type="sedan",
                )
                session.add(driver)
                await session.flush()
                print("✓ Created Driver profile for Pankaj Yewale (DRV-AD86)")
            else:
                driver.full_name = PANKAJ_NAME
                driver.phone = PANKAJ_PHONE
                driver.is_verified = True
                driver.kyc_status = KYCStatus.APPROVED
                driver.vehicle_type = "sedan"
                print("✓ Updated existing Driver profile")

            # 3. Vehicle
            veh_res = await session.execute(
                select(Vehicle).where(Vehicle.driver_id == driver.id)
            )
            veh = veh_res.scalar_one_or_none()
            if not veh:
                veh = Vehicle(
                    id=VEHICLE_ID,
                    driver_id=driver.id,
                    vehicle_type=VehicleType.SEDAN if hasattr(VehicleType, 'SEDAN') else "sedan",
                    make="Maruti Suzuki",
                    model="Dzire VXI",
                    year=2020,
                    color="White",
                    plate_number="MH12AB8686",
                    rc_number="MH12AB8686",
                    is_verified=True,
                    is_active=True,
                )
                session.add(veh)
                await session.flush()
                print("✓ Created Vehicle MH12 AB 8686 (Dzire)")

            # 4. Bank Account
            bank_res = await session.execute(
                select(DriverBankAccount).where(DriverBankAccount.driver_id == driver.id)
            )
            bank = bank_res.scalar_one_or_none()
            if not bank:
                bank = DriverBankAccount(
                    driver_id=driver.id,
                    account_holder_name="Pankaj Sanjay Yewale",
                    bank_name="State Bank of India",
                    account_number_masked="•••• •••• 4821",
                    account_number_hash="hash_pankaj_sbi_4821",
                    ifsc_code="SBIN0001234",
                    account_type="savings",
                    is_verified=True,
                    verified_at=datetime.now(timezone.utc),
                )
                session.add(bank)
                await session.flush()
                print("✓ Created Verified Bank Account (SBI)")

            # 5. Documents with authentic field definitions
            docs_data = [
                {
                    "type": DocumentType.AADHAAR,
                    "num": "5489 7721 9043",
                    "issue": date(2015, 3, 10),
                    "expiry": None, # NO expiry date for Aadhaar!
                    "file": "/uploads/pankaj_aadhaar_card.jpg",
                },
                {
                    "type": DocumentType.PAN,
                    "num": "APEYP9842K",
                    "issue": date(2014, 8, 18),
                    "expiry": None, # NO expiry date for PAN!
                    "file": "/uploads/pankaj_pan_card.jpg",
                },
                {
                    "type": DocumentType.LICENSE,
                    "num": "MH12 20180054321",
                    "issue": date(2018, 4, 12),
                    "expiry": date(2028, 4, 11),
                    "file": "/uploads/pankaj_driving_license.jpg",
                },
                {
                    "type": DocumentType.RC_BOOK,
                    "num": "MH12 AB 8686",
                    "issue": date(2020, 8, 20),
                    "expiry": date(2035, 8, 19),
                    "file": "/uploads/pankaj_vehicle_rc.jpg",
                },
                {
                    "type": DocumentType.INSURANCE,
                    "num": "OG-24-1234-5678-00000123",
                    "issue": date(2024, 8, 26),
                    "expiry": date(2027, 8, 25),
                    "file": "/uploads/pankaj_insurance_policy.jpg",
                },
                {
                    "type": DocumentType.PERMIT,
                    "num": "PER/MH12/2024/09876",
                    "issue": date(2024, 9, 16),
                    "expiry": date(2028, 9, 15),
                    "file": "/uploads/pankaj_commercial_permit.jpg",
                },
                {
                    "type": DocumentType.PUC,
                    "num": "PUC-MH12-2026-7890",
                    "issue": date(2026, 8, 19),
                    "expiry": date(2027, 2, 18),
                    "file": "/uploads/pankaj_puc_certificate.jpg",
                },
                {
                    "type": DocumentType.POLICE_VERIFICATION,
                    "num": "PV-PUN-2024-5541",
                    "issue": date(2024, 1, 10),
                    "expiry": date(2027, 1, 9),
                    "file": "/uploads/pankaj_police_clearance.jpg",
                },
                {
                    "type": DocumentType.SELFIE,
                    "num": "LIVE-SELFIE-8686",
                    "issue": date(2026, 8, 24),
                    "expiry": None,
                    "file": "/uploads/pankaj_live_selfie.jpg",
                },
                {
                    "type": DocumentType.VEHICLE_PHOTO,
                    "num": "MH12 AB 8686",
                    "issue": date(2026, 8, 24),
                    "expiry": None,
                    "file": "/uploads/pankaj_vehicle_dzire.jpg",
                },
            ]

            for d in docs_data:
                existing_doc_res = await session.execute(
                    select(DriverDocument).where(
                        DriverDocument.driver_id == driver.id,
                        DriverDocument.doc_type == d["type"],
                    )
                )
                doc = existing_doc_res.scalar_one_or_none()
                if not doc:
                    doc = DriverDocument(
                        driver_id=driver.id,
                        doc_type=d["type"],
                        file_path=d["file"],
                        document_number=d["num"],
                        issue_date=d["issue"],
                        expires_at=d["expiry"],
                        version=1,
                        status="approved",
                        is_verified=True,
                        verified_at=datetime.now(timezone.utc),
                        is_current=True,
                    )
                    session.add(doc)
                else:
                    doc.document_number = d["num"]
                    doc.issue_date = d["issue"]
                    doc.expires_at = d["expiry"]
                    doc.is_verified = True
                    doc.status = "approved"
                    doc.rejection_reason = None
                    doc.verified_at = datetime.now(timezone.utc)
                print(f"  ✓ Processed Document: {d['type'].value} (Number: {d['num']}, Expiry: {d['expiry']})")

            await session.commit()
            print("\n🎉 SUCCESS: Driver Pankaj Yewale (DRV-AD86, 7755995615) fully seeded & verified!")

    except Exception as e:
        print(f"Note: Database connection skipped or failed ({e}). Web & Mobile mocks already active.")


if __name__ == "__main__":
    asyncio.run(seed_driver())
