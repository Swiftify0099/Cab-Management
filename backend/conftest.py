"""
Shared pytest fixtures — conftest.py for all backend services.
Place this in backend/conftest.py or per-service tests/conftest.py.
"""
import asyncio
import os
import pytest
import pytest_asyncio
from typing import AsyncGenerator

# Force test environment
os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://cabuser:testpassword@localhost:5432/cabdb_test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")  # DB 1 for tests


@pytest.fixture(scope="session")
def event_loop_policy():
    return asyncio.DefaultEventLoopPolicy()


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def mock_redis():
    """In-memory mock Redis for tests that don't need real Redis."""
    from unittest.mock import AsyncMock, MagicMock

    mock = AsyncMock()
    mock.get = AsyncMock(return_value=None)
    mock.set = AsyncMock(return_value=True)
    mock.delete = AsyncMock(return_value=1)
    mock.expire = AsyncMock(return_value=True)
    mock.publish = AsyncMock(return_value=1)
    mock.lpush = AsyncMock(return_value=1)
    mock.brpop = AsyncMock(return_value=None)
    return mock


@pytest.fixture
def valid_phone():
    return "+919876543210"


@pytest.fixture
def valid_otp():
    return "123456"


@pytest.fixture
def admin_credentials():
    return {"email": "admin@cabooking.com", "password": "123456"}


@pytest.fixture
def sample_trip_data():
    return {
        "pickup_city": "Pune",
        "destination_city": "Mumbai",
        "departure_time": "2026-12-15T08:00:00",
        "total_seats": 4,
        "vehicle_type": "sedan",
    }


@pytest.fixture
def sample_parcel_data():
    return {
        "trip_id": "00000000-0000-0000-0000-000000000001",
        "sender_name": "Rahul Sharma",
        "sender_phone": "+919876543210",
        "receiver_name": "Priya Patel",
        "receiver_phone": "+919876543211",
        "receiver_address": "123 MG Road, Mumbai 400001",
        "weight_kg": 2.5,
        "description": "Important documents",
        "fragile": False,
        "urgent": False,
    }
