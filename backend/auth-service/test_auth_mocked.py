import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
import uuid
import datetime
import sys
import os

# Ensure backend directory is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.main import app
from common.database import get_db
from common.models.all_models import User, UserRole, AdminProfile

# Mock data
TEST_PHONE = "+919876543210"
TEST_OTP = "123456"
ADMIN_EMAIL = "admin@cabooking.com"
ADMIN_PASSWORD = "hashed_123456"

mock_user = User(
    id=uuid.uuid4(),
    phone=TEST_PHONE,
    email="test@example.com",
    role=UserRole.CUSTOMER,
    is_active=True,
    is_verified=True,
    is_profile_complete=True
)

mock_admin = User(
    id=uuid.uuid4(),
    phone="+910000000000",
    email=ADMIN_EMAIL,
    role=UserRole.ADMIN,
    is_active=True,
    is_verified=True,
    is_profile_complete=True
)

mock_admin_profile = AdminProfile(
    id=uuid.uuid4(),
    user_id=mock_admin.id,
    password_hash=ADMIN_PASSWORD,
    must_change_password=True
)

async def override_get_db():
    mock_session = AsyncMock()
    
    async def mock_execute(query):
        mock_result = MagicMock()
        query_str = str(query).lower()
        
        if "user" in query_str and ADMIN_EMAIL in query_str:
            mock_result.scalar_one_or_none.return_value = mock_admin
        elif "user" in query_str and TEST_PHONE in query_str:
            mock_result.scalar_one_or_none.return_value = mock_user
        elif "adminprofile" in query_str:
            mock_result.scalar_one_or_none.return_value = mock_admin_profile
        else:
            mock_result.scalar_one_or_none.return_value = None
            
        return mock_result

    mock_session.execute = mock_execute
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()
    
    yield mock_session

app.dependency_overrides[get_db] = override_get_db

async def run_tests():
    print("\n" + "="*50)
    print("🚀 RUNNING AUTH API VERIFICATION TESTS 🚀")
    print("="*50 + "\n")
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        
        print("1. Testing Customer OTP Flow...")
        
        with patch('app.api.v1.auth.increment_otp_requests', new_callable=AsyncMock) as mock_inc, \
             patch('app.api.v1.auth.store_otp', new_callable=AsyncMock) as mock_store, \
             patch('app.api.v1.auth.get_otp', new_callable=AsyncMock) as mock_get_otp, \
             patch('app.api.v1.auth.delete_otp', new_callable=AsyncMock) as mock_del_otp:
            
            mock_inc.return_value = 1
            mock_get_otp.return_value = TEST_OTP
            
            # 1a. Send OTP
            res_send = await client.post("/api/v1/auth/otp/send", json={"phone": TEST_PHONE})
            print(f"   [SEND OTP] Status: {res_send.status_code}")
            assert res_send.status_code == 200, "Send OTP failed"
            print(f"   [SEND OTP] Response: {res_send.json()['message']}")
            
            # 1b. Verify OTP
            res_verify = await client.post("/api/v1/auth/otp/verify", json={"phone": TEST_PHONE, "otp_code": TEST_OTP})
            print(f"   [VERIFY OTP] Status: {res_verify.status_code}")
            assert res_verify.status_code == 200, f"Verify OTP failed: {res_verify.text}"
            
            data = res_verify.json()["data"]
            assert "access_token" in data
            print(f"   [VERIFY OTP] Success! Received JWT for Customer. Role: {data['role']}")
            
        print("\n2. Testing Admin Login Flow...")
        
        with patch('app.api.v1.admin_auth.verify_password', return_value=True):
            res_admin = await client.post("/api/v1/admin/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": "123456"
            })
            
            print(f"   [ADMIN LOGIN] Status: {res_admin.status_code}")
            assert res_admin.status_code == 200, f"Admin login failed: {res_admin.text}"
            
            data = res_admin.json()["data"]
            assert "access_token" in data
            assert data["role"] == "admin"
            print(f"   [ADMIN LOGIN] Success! Received JWT for Admin.")

    print("\n✅ ALL AUTH TESTS PASSED!")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(run_tests())
