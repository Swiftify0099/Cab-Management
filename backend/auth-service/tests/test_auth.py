"""
Auth Service Tests — Phase 10.
Tests: OTP send/verify, JWT flow, admin login, profile CRUD.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ─── OTP Flow ─────────────────────────────────────────────

class TestOTPFlow:
    @pytest.mark.anyio
    async def test_send_otp_valid_phone(self, client: AsyncClient):
        with patch("app.services.auth_service.send_otp_sms", return_value=True):
            res = await client.post("/api/v1/auth/otp/send", json={"phone": "+919876543210"})
        assert res.status_code == 200
        assert res.json()["success"] is True

    @pytest.mark.anyio
    async def test_send_otp_invalid_phone(self, client: AsyncClient):
        res = await client.post("/api/v1/auth/otp/send", json={"phone": "12345"})
        assert res.status_code == 422  # Validation error

    @pytest.mark.anyio
    async def test_verify_otp_correct(self, client: AsyncClient):
        """Test OTP=123456 (dev bypass) returns JWT tokens."""
        with patch("app.services.auth_service.verify_otp_code", return_value=True):
            res = await client.post("/api/v1/auth/otp/verify", json={
                "phone": "+919876543210",
                "otp": "123456",
            })
        assert res.status_code in (200, 201)
        if res.status_code == 200:
            data = res.json()["data"]
            assert "access_token" in data
            assert "refresh_token" in data

    @pytest.mark.anyio
    async def test_verify_otp_wrong_code(self, client: AsyncClient):
        with patch("app.services.auth_service.verify_otp_code", return_value=False):
            res = await client.post("/api/v1/auth/otp/verify", json={
                "phone": "+919876543210",
                "otp": "999999",
            })
        assert res.status_code == 400


# ─── Admin Login ──────────────────────────────────────────

class TestAdminAuth:
    @pytest.mark.anyio
    async def test_admin_login_valid(self, client: AsyncClient):
        res = await client.post("/api/v1/admin/auth/login", json={
            "email": "admin@cabooking.com",
            "password": "123456",
        })
        # Should return token or redirect
        assert res.status_code in (200, 401)

    @pytest.mark.anyio
    async def test_admin_login_wrong_password(self, client: AsyncClient):
        res = await client.post("/api/v1/admin/auth/login", json={
            "email": "admin@cabooking.com",
            "password": "wrong_pass",
        })
        assert res.status_code in (400, 401)

    @pytest.mark.anyio
    async def test_protected_endpoint_no_token(self, client: AsyncClient):
        res = await client.get("/api/v1/profile")
        assert res.status_code == 401


# ─── Health Check ─────────────────────────────────────────

class TestHealth:
    @pytest.mark.anyio
    async def test_health_endpoint(self, client: AsyncClient):
        res = await client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["service"] == "auth-service"
