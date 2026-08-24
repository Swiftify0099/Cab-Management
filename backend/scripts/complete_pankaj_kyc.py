import sys, os, asyncio, uuid
from datetime import date, datetime, timezone

sys.path.insert(0, r"c:\Users\panka\OneDrive\Desktop\CabBooking\backend")
from common.database import async_session_maker
from common.models.all_models import (
    User, UserRole, Driver, Vehicle, VehicleType,
    DriverDocument, DriverBankAccount, DocumentType, KYCStatus, DriverStatus
)
from sqlalchemy import select, text

PANKAJ_PHONE = "+917755995615"
PANKAJ_PHONE_RAW = "7755995615"
PANKAJ_NAME = "Pankaj Yewale"
PANKAJ_EMAIL = "pankajyewale111@gmail.com"

async def complete_pankaj_kyc():
    print("=" * 60)
    print("Starting Comprehensive KYC & Admin Approval for Pankaj Yewale (7755995615)...")
    print("=" * 60)
    
    async with async_session_maker() as session:
        # Clean up any conflicting old vehicle registration numbers
        await session.execute(
            text("UPDATE vehicles SET registration_number = 'MH10OLD5615' WHERE registration_number = 'MH 10 X 5615' AND driver_id != 'ad867f28-0953-436f-b30d-fda217d6777a'")
        )
        await session.flush()

        # 1. Check or update Users
        user_res = await session.execute(
            select(User).where((User.phone == PANKAJ_PHONE) | (User.phone == PANKAJ_PHONE_RAW))
        )
        users = user_res.scalars().all()
        if not users:
            user = User(
                id=uuid.UUID("b4ea1246-14be-4703-aca9-8ec54078f54b"),
                phone=PANKAJ_PHONE,
                email=PANKAJ_EMAIL,
                role=UserRole.DRIVER,
                is_active=True,
                is_verified=True,
                is_profile_complete=True,
            )
            session.add(user)
            await session.flush()
            print("[OK] Created primary User for Pankaj Yewale")
        else:
            user = users[0]
            user.phone = PANKAJ_PHONE
            user.email = PANKAJ_EMAIL
            user.role = UserRole.DRIVER
            user.is_active = True
            user.is_verified = True
            user.is_profile_complete = True
            print(f"[OK] Updated User ({user.id}) to verified active Driver")

        # 2. Check or update Driver profile
        driver_res = await session.execute(
            select(Driver).where((Driver.user_id == user.id) | (Driver.phone == PANKAJ_PHONE) | (Driver.phone == PANKAJ_PHONE_RAW))
        )
        drivers = driver_res.scalars().all()
        if not drivers:
            driver = Driver(
                id=uuid.UUID("ad867f28-0953-436f-b30d-fda217d6777a"),
                user_id=user.id,
                full_name=PANKAJ_NAME,
                phone=PANKAJ_PHONE,
                rating=4.95,
                total_trips=142,
                kyc_status=KYCStatus.APPROVED,
                is_verified=True,
                is_active=True,
                is_online=False,
                status=DriverStatus.OFFLINE,
                vehicle_type="suv",
                aadhaar_number="780803115600",
                license_number="MH12 20180054321",
                wallet_balance=5000.00,
            )
            session.add(driver)
            await session.flush()
            print(f"[OK] Created Driver Profile ({driver.id})")
        else:
            driver = drivers[0]
            driver.user_id = user.id
            driver.full_name = PANKAJ_NAME
            driver.phone = PANKAJ_PHONE
            driver.rating = 4.95
            driver.kyc_status = KYCStatus.APPROVED
            driver.is_verified = True
            driver._is_verified = True
            driver.is_active = True
            driver.vehicle_type = "suv"
            driver.aadhaar_number = "780803115600"
            driver.license_number = "MH12 20180054321"
            if driver.wallet_balance is None or driver.wallet_balance < 1000:
                driver.wallet_balance = 5000.00
            print(f"[OK] Updated Driver Profile ({driver.id}) -> KYCStatus.APPROVED, is_verified=True")

        # 3. Vehicle Setup
        veh_res = await session.execute(
            select(Vehicle).where(Vehicle.driver_id == driver.id)
        )
        vehicles = veh_res.scalars().all()
        if not vehicles:
            veh = Vehicle(
                id=uuid.UUID("9af0b37a-59fe-4639-ad8f-456cac3dedad"),
                driver_id=driver.id,
                vehicle_type=VehicleType.SUV if hasattr(VehicleType, 'SUV') else "suv",
                make="Maruti Suzuki",
                model="XL6 Smart Hybrid",
                year=2022,
                color="White",
                registration_number="MH 10 X 5615",
                seat_capacity=6,
                has_ac=True,
                is_active=True,
                commercial_permit=True,
                insurance_expiry=date(2027, 8, 25),
                pollution_expiry=date(2027, 2, 18),
            )
            session.add(veh)
            await session.flush()
            print("[OK] Created Vehicle Maruti XL6 (MH 10 X 5615) Active & Verified")
        else:
            veh = vehicles[0]
            veh.make = "Maruti Suzuki"
            veh.model = "XL6 Smart Hybrid"
            veh.year = 2022
            veh.color = "White"
            veh.registration_number = "MH 10 X 5615"
            veh.seat_capacity = 6
            veh.has_ac = True
            veh.is_active = True
            veh.commercial_permit = True
            veh.insurance_expiry = date(2027, 8, 25)
            veh.pollution_expiry = date(2027, 2, 18)
            print(f"[OK] Updated Vehicle ({veh.id}) -> Maruti XL6 (MH 10 X 5615) Active & Verified")

        # 4. Bank Account Setup
        bank_res = await session.execute(
            select(DriverBankAccount).where(DriverBankAccount.driver_id == driver.id)
        )
        bank = bank_res.scalar_one_or_none()
        if not bank:
            bank = DriverBankAccount(
                id=uuid.UUID("e3cd308b-b711-4bf9-b2e2-ca2310020b11"),
                driver_id=driver.id,
                account_holder_name="Pankaj Sanjay Yewale",
                bank_name="Union Bank of India",
                account_number_masked="•••• •••• 5600",
                account_number_hash="hash_pankaj_ubi_5600",
                ifsc_code="UBIN0545615",
                account_type="savings",
                is_verified=True,
                verified_at=datetime.now(timezone.utc),
            )
            session.add(bank)
            await session.flush()
            print("[OK] Created Verified Bank Account (Union Bank of India)")
        else:
            bank.account_holder_name = "Pankaj Sanjay Yewale"
            bank.bank_name = "Union Bank of India"
            bank.account_number_masked = "•••• •••• 5600"
            bank.ifsc_code = "UBIN0545615"
            bank.is_verified = True
            bank.verified_at = datetime.now(timezone.utc)
            bank.rejection_reason = None
            print("[OK] Updated & Verified Bank Account (Union Bank of India)")

        # 5. ALL 10 Documents Setup & Approval
        docs_data = [
            {
                "type": DocumentType.AADHAAR,
                "num": "7808 0311 5600",
                "issue": date(2015, 3, 10),
                "expiry": None, # Lifetime
                "file": "/uploads/pankaj_aadhaar_card.jpg",
            },
            {
                "type": DocumentType.PAN,
                "num": "APEYP9842K",
                "issue": date(2014, 8, 18),
                "expiry": None, # Lifetime
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
                "num": "MH 10 X 5615",
                "issue": date(2020, 8, 20),
                "expiry": date(2035, 8, 19),
                "file": "/uploads/pankaj_vehicle_rc.jpg",
            },
            {
                "type": DocumentType.INSURANCE,
                "num": "20-27-2060-2047-200000000",
                "issue": date(2024, 8, 26),
                "expiry": date(2027, 8, 25),
                "file": "/uploads/pankaj_insurance_policy.jpg",
            },
            {
                "type": DocumentType.PERMIT,
                "num": "PER/MH12/2026/0256",
                "issue": date(2024, 9, 16),
                "expiry": date(2028, 9, 15),
                "file": "/uploads/pankaj_commercial_permit.jpg",
            },
            {
                "type": DocumentType.PUC,
                "num": "PUC-MH10-2026-5615",
                "issue": date(2026, 8, 19),
                "expiry": date(2027, 2, 18),
                "file": "/uploads/pankaj_puc_certificate.jpg",
            },
            {
                "type": DocumentType.POLICE_VERIFICATION,
                "num": "PV-SAN-2024-5615",
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
                "num": "MH 10 X 5615",
                "issue": date(2026, 8, 24),
                "expiry": None,
                "file": "/uploads/pankaj_vehicle_xl6.jpg",
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
                doc.file_path = d["file"]
                doc.is_verified = True
                doc.status = "approved"
                doc.rejection_reason = None
                doc.verified_at = datetime.now(timezone.utc)
                doc.is_current = True
            print(f"  [OK] Processed & Approved Document: {d['type'].value} ({d['num']})")

        # 6. Commit all changes to DB
        await session.commit()
        print("=" * 60)
        print("SUCCESS: ALL KYC DOCUMENTS APPROVED & DRIVER VERIFICATION COMPLETED!")
        print(f"Driver Name: {PANKAJ_NAME}")
        print(f"Driver Phone: {PANKAJ_PHONE}")
        print(f"KYC Status: APPROVED (100% Verified)")
        print(f"Can Go Online: TRUE")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(complete_pankaj_kyc())
