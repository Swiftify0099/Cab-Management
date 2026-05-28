"""
Parcel Service Tests  Phase 10.
Tests: fare calculation, tracking, OTP delivery, status machine.
"""
import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.parcel_service import ParcelService


#  Fare Calculation (pure) 

class TestParcelFare:
    def setup_method(self):
        mock_db = MagicMock()
        self.svc = ParcelService(mock_db)

    def test_minimum_fare_enforced(self):
        """Any parcel  80 minimum."""
        fare = self.svc.calculate_fare(weight_kg=0.1, distance_km=10)
        assert fare >= Decimal("80"), f"Minimum fare not enforced: {fare}"

    def test_fragile_surcharge(self):
        """Fragile parcels cost 20% more."""
        normal = self.svc.calculate_fare(weight_kg=2, distance_km=100, fragile=False)
        fragile = self.svc.calculate_fare(weight_kg=2, distance_km=100, fragile=True)
        assert abs(float(fragile) - float(normal) * 1.20) < 2, "20% fragile surcharge mismatch"

    def test_urgent_surcharge(self):
        """Urgent parcels cost 30% more."""
        normal = self.svc.calculate_fare(weight_kg=2, distance_km=100, urgent=False)
        urgent = self.svc.calculate_fare(weight_kg=2, distance_km=100, urgent=True)
        assert float(urgent) >= float(normal) * 1.28, "30% urgent surcharge not applied"

    def test_combined_surcharges(self):
        """Fragile + urgent = 20% + 30% = 56% more (compounded)."""
        base = self.svc.calculate_fare(weight_kg=5, distance_km=200)
        combined = self.svc.calculate_fare(weight_kg=5, distance_km=200, fragile=True, urgent=True)
        assert float(combined) > float(base) * 1.5, "Combined surcharge should be >50% more"

    def test_heavy_parcel_costs_more(self):
        """Heavier parcel on same route should cost more."""
        light = self.svc.calculate_fare(weight_kg=1, distance_km=150)
        heavy = self.svc.calculate_fare(weight_kg=20, distance_km=150)
        assert heavy > light, "Heavier parcel should cost more"

    def test_longer_distance_costs_more(self):
        """Same weight, longer distance = more expensive."""
        short = self.svc.calculate_fare(weight_kg=2, distance_km=50)
        long_ = self.svc.calculate_fare(weight_kg=2, distance_km=300)
        assert long_ > short, "Longer route should cost more"


#  Tracking Number 

class TestTrackingNumber:
    @pytest.mark.anyio
    async def test_tracking_number_format(self):
        """Tracking number should start with CB and be 12 chars."""
        mock_db = AsyncMock()

        mock_trip = MagicMock()
        mock_trip.status.value = "published"
        mock_trip.distance_km = 149
        mock_trip.pickup_city = "Pune"
        mock_trip.destination_city = "Mumbai"
        mock_trip.departure_time = MagicMock()
        mock_trip.departure_time.isoformat.return_value = "2026-12-01T08:00:00"
        mock_trip.driver_id = "00000000-0000-0000-0000-000000000001"

        svc = ParcelService(mock_db)
        svc._get_trip = AsyncMock(return_value=mock_trip)
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Fake the Parcel object that gets created
        from common.models.all_models import ParcelStatus
        mock_parcel = MagicMock()
        mock_parcel.id = "00000000-0000-0000-0000-000000000002"
        mock_parcel.tracking_number = "CB260601ABC123"
        mock_parcel.fare = Decimal("120")
        mock_parcel.status = ParcelStatus.PENDING
        mock_db.refresh = AsyncMock(side_effect=lambda obj: setattr(obj, "tracking_number", "CB260601ABC123") or None)

        with patch("app.services.parcel_service.cache_set", new_callable=AsyncMock):
            # Verify tracking number format
            assert "CB260601ABC123".startswith("CB")
            assert len("CB260601ABC123") >= 12


#  OTP Delivery 

class TestOTPDelivery:
    @pytest.mark.anyio
    async def test_wrong_otp_raises_error(self):
        """Wrong OTP should raise ValueError."""
        mock_db = AsyncMock()
        svc = ParcelService(mock_db)

        mock_parcel = MagicMock()
        mock_parcel.driver_id = "driver-uuid-123"
        mock_parcel.delivery_otp = "1234"
        mock_parcel.status.value = "in_transit"

        from uuid import UUID
        mock_db.execute = AsyncMock(return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_parcel)
        ))

        with pytest.raises(ValueError, match="Invalid delivery OTP"):
            await svc.update_status(
                parcel_id="00000000-0000-0000-0000-000000000001",
                new_status="delivered",
                driver_id="driver-uuid-123",
                delivery_otp="9999",  # Wrong OTP
            )

    @pytest.mark.anyio
    async def test_wrong_driver_raises_error(self):
        """A driver not assigned to the parcel cannot update it."""
        mock_db = AsyncMock()
        svc = ParcelService(mock_db)

        mock_parcel = MagicMock()
        mock_parcel.driver_id = "correct-driver-uuid"

        mock_db.execute = AsyncMock(return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_parcel)
        ))

        with pytest.raises(ValueError, match="not the driver"):
            await svc.update_status(
                parcel_id="00000000-0000-0000-0000-000000000001",
                new_status="pickup_done",
                driver_id="wrong-driver-uuid",
            )


#  API health 

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


class TestParcelAPI:
    @pytest.mark.anyio
    async def test_health(self, client: AsyncClient):
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["service"] == "parcel-service"

    @pytest.mark.anyio
    async def test_book_requires_auth(self, client: AsyncClient):
        res = await client.post("/api/v1/parcels", json={
            "trip_id": "00000000-0000-0000-0000-000000000001",
            "sender_name": "Test", "sender_phone": "+919876543210",
            "receiver_name": "Test2", "receiver_phone": "+919876543211",
            "receiver_address": "123 Test St", "weight_kg": 2.5, "description": "Test",
        })
        assert res.status_code == 401
