"""
Booking Service Tests  Phase 10.
Tests: fare calculation, trip CRUD, seat booking, search.
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.fare_engine import FareEngine


#  Fare Calculation (pure unit tests) 

class TestFareEngine:
    def test_base_fare_pune_mumbai(self):
        """149km PuneMumbai should be ~480 for 1 seat."""
        fare = FareEngine.calculate(
            pickup_city="Pune",
            destination_city="Mumbai",
            distance_km=149,
            seat_count=1,
            vehicle_type="sedan",
            night_departure=False,
        )
        assert 400 <= fare <= 600, f"Expected 400-600, got {fare}"

    def test_night_surcharge(self):
        """Night trips (10pm5am) should cost 20% more."""
        day_fare = FareEngine.calculate(
            pickup_city="Pune", destination_city="Mumbai",
            distance_km=149, seat_count=1,
            vehicle_type="sedan", night_departure=False,
        )
        night_fare = FareEngine.calculate(
            pickup_city="Pune", destination_city="Mumbai",
            distance_km=149, seat_count=1,
            vehicle_type="sedan", night_departure=True,
        )
        assert night_fare >= day_fare * 1.15, "Night surcharge not applied"

    def test_suv_more_than_sedan(self):
        """SUV should always cost more than sedan for same route."""
        sedan_fare = FareEngine.calculate(
            pickup_city="Mumbai", destination_city="Nashik",
            distance_km=166, seat_count=1,
            vehicle_type="sedan", night_departure=False,
        )
        suv_fare = FareEngine.calculate(
            pickup_city="Mumbai", destination_city="Nashik",
            distance_km=166, seat_count=1,
            vehicle_type="suv", night_departure=False,
        )
        assert suv_fare > sedan_fare, "SUV should cost more than sedan"

    def test_per_seat_pricing(self):
        """2 seats should cost exactly 2 single seat."""
        fare_1 = FareEngine.calculate(
            pickup_city="Pune", destination_city="Aurangabad",
            distance_km=235, seat_count=1,
            vehicle_type="sedan", night_departure=False,
        )
        fare_2 = FareEngine.calculate(
            pickup_city="Pune", destination_city="Aurangabad",
            distance_km=235, seat_count=2,
            vehicle_type="sedan", night_departure=False,
        )
        assert abs(fare_2 - fare_1 * 2) < 10, "Per-seat pricing mismatch"

    def test_minimum_fare(self):
        """Very short distances should still meet minimum fare."""
        fare = FareEngine.calculate(
            pickup_city="Test", destination_city="Test2",
            distance_km=5, seat_count=1,
            vehicle_type="hatchback", night_departure=False,
        )
        assert fare >= 50, "Minimum fare not enforced"


#  Trip API 

@pytest_asyncio.fixture
async def auth_headers():
    """Returns fake auth headers for testing."""
    return {"Authorization": "Bearer test_driver_token"}


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


class TestTripSearch:
    @pytest.mark.anyio
    async def test_search_trips_returns_list(self, client: AsyncClient):
        res = await client.get("/api/v1/trips/search", params={
            "pickup_city": "Pune",
            "destination_city": "Mumbai",
            "departure_date": "2026-12-01",
            "seat_count": 1,
        })
        assert res.status_code in (200, 404)  # 404 if no trips in test DB
        if res.status_code == 200:
            assert isinstance(res.json()["data"], list)

    @pytest.mark.anyio
    async def test_search_requires_cities(self, client: AsyncClient):
        res = await client.get("/api/v1/trips/search")
        assert res.status_code == 422  # Missing required params

    @pytest.mark.anyio
    async def test_health(self, client: AsyncClient):
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["service"] == "booking-service"


#  Seat Booking 

class TestSeatBooking:
    @pytest.mark.anyio
    async def test_book_requires_auth(self, client: AsyncClient):
        res = await client.post("/api/v1/bookings", json={
            "trip_id": "00000000-0000-0000-0000-000000000001",
            "seat_count": 1,
        })
        assert res.status_code == 401

    @pytest.mark.anyio
    async def test_book_invalid_trip_id(self, client: AsyncClient, auth_headers):
        with patch("app.services.booking_service.BookingService.create_booking",
                   side_effect=ValueError("Trip not found")):
            res = await client.post("/api/v1/bookings",
                                    json={"trip_id": "invalid-id", "seat_count": 1},
                                    headers=auth_headers)
        assert res.status_code in (400, 401, 422)
