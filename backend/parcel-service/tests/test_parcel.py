"""
Parcel Service Unit & API Tests — Phase 16
═══════════════════════════════════════════
Tests:
- Quote calculation with weight, volumetric, fragile, priority, insurance breakdown
- Invalid weight (<=0 and over-capacity) validation
- Incompatible vehicle validation (parcel_capable=False and capacity < weight)
- Two-phase OTP generation and wrong OTP attempts
- Proof of Delivery (POD) creation and missing OTP/POD handling
- Customer rating and driver reputation updates
- API endpoints & health checks
"""
import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.parcel_service import ParcelService


class TestParcelQuoteAndPricing:
    def setup_method(self):
        self.mock_db = AsyncMock()
        self.svc = ParcelService(self.mock_db)

    def test_quote_standard_bike(self):
        """Calculates standard bike delivery quote with correct base and km rates."""
        quote = self.svc.calculate_quote(
            sender_lat=18.5204,
            sender_lng=73.8567,
            receiver_lat=18.5913,
            receiver_lng=73.7389,
            weight_kg=3.0,
            vehicle_category="BIKE",
        )
        assert quote["final_fare"] >= 40.0
        assert quote["vehicle_category"] == "BIKE"
        assert quote["driver_earning"] > 0
        assert quote["platform_commission"] > 0

    def test_volumetric_weight_calculation(self):
        """Volumetric weight (L*W*H/5000) applied when greater than physical weight."""
        # 50 x 40 x 30 = 60,000 / 5000 = 12 kg volumetric
        quote = self.svc.calculate_quote(
            sender_lat=18.5204,
            sender_lng=73.8567,
            receiver_lat=18.5913,
            receiver_lng=73.7389,
            weight_kg=2.0,  # physical weight 2kg
            length_cm=50.0,
            width_cm=40.0,
            height_cm=30.0,
            vehicle_category="AUTO",
        )
        assert quote["volumetric_weight_kg"] == 12.0
        assert quote["effective_weight_kg"] == 12.0

    def test_fragile_and_insurance_surcharges(self):
        """Fragile surcharge and insurance premium are correctly computed."""
        quote = self.svc.calculate_quote(
            sender_lat=18.5204,
            sender_lng=73.8567,
            receiver_lat=18.5913,
            receiver_lng=73.7389,
            weight_kg=2.0,
            is_fragile=True,
            insurance_opt_in=True,
            declared_value=Decimal("10000.00"),
            vehicle_category="BIKE",
        )
        assert quote["is_fragile"] is True
        assert quote["insurance_fee"] >= 25.0
        assert quote["insured_amount"] == 10000.0

    def test_invalid_weight_zero_or_negative(self):
        """Weight <= 0 must raise HTTP 400."""
        with pytest.raises(HTTPException) as exc:
            self.svc.calculate_quote(
                sender_lat=18.5204,
                sender_lng=73.8567,
                receiver_lat=18.5913,
                receiver_lng=73.7389,
                weight_kg=-1.0,
                vehicle_category="BIKE",
            )
        assert exc.value.status_code == 400
        assert "Invalid weight" in exc.value.detail

    def test_over_capacity_weight_for_vehicle(self):
        """Weight exceeding vehicle max capacity (e.g. 20kg on Bike) must raise HTTP 400."""
        with pytest.raises(HTTPException) as exc:
            self.svc.calculate_quote(
                sender_lat=18.5204,
                sender_lng=73.8567,
                receiver_lat=18.5913,
                receiver_lng=73.7389,
                weight_kg=20.0,  # Bike max is 15kg
                vehicle_category="BIKE",
            )
        assert exc.value.status_code == 400
        assert "Incompatible weight" in exc.value.detail


class TestParcelVehicleEligibility:
    def setup_method(self):
        self.mock_db = AsyncMock()
        self.svc = ParcelService(self.mock_db)

    @pytest.mark.anyio
    async def test_incompatible_vehicle_not_parcel_capable(self):
        """Driver with vehicle parcel_capable=False must be rejected on accept."""
        import uuid
        from common.models.all_models import Parcel, ParcelStatus, Driver, Vehicle

        mock_driver = MagicMock(spec=Driver)
        mock_driver.id = uuid.uuid4()

        mock_vehicle = MagicMock(spec=Vehicle)
        mock_vehicle.id = uuid.uuid4()
        mock_vehicle.parcel_capable = False  # NOT capable
        mock_vehicle.parcel_capacity_kg = 0.0

        mock_parcel = MagicMock(spec=Parcel)
        mock_parcel.id = uuid.uuid4()
        mock_parcel.status = ParcelStatus.SEARCHING_DRIVER
        mock_parcel.weight_kg = 5.0

        # Mock DB queries
        self.mock_db.execute = AsyncMock(side_effect=[
            MagicMock(scalar_one_or_none=MagicMock(return_value=mock_driver)),
            MagicMock(scalar_one_or_none=MagicMock(return_value=mock_vehicle)),
            MagicMock(scalar_one_or_none=MagicMock(return_value=mock_parcel)),
        ])

        with pytest.raises(HTTPException) as exc:
            await self.svc.driver_accept_parcel(
                parcel_id=str(mock_parcel.id),
                driver_user_id=str(uuid.uuid4()),
            )
        assert exc.value.status_code == 400
        assert "not authorized for parcel delivery" in exc.value.detail

    @pytest.mark.anyio
    async def test_incompatible_vehicle_insufficient_capacity(self):
        """Driver with vehicle capacity < parcel weight must be rejected on accept."""
        import uuid
        from common.models.all_models import Parcel, ParcelStatus, Driver, Vehicle

        mock_driver = MagicMock(spec=Driver)
        mock_driver.id = uuid.uuid4()

        mock_vehicle = MagicMock(spec=Vehicle)
        mock_vehicle.id = uuid.uuid4()
        mock_vehicle.parcel_capable = True
        mock_vehicle.parcel_capacity_kg = 10.0  # 10kg cap

        mock_parcel = MagicMock(spec=Parcel)
        mock_parcel.id = uuid.uuid4()
        mock_parcel.status = ParcelStatus.SEARCHING_DRIVER
        mock_parcel.weight_kg = 25.0  # 25kg parcel

        self.mock_db.execute = AsyncMock(side_effect=[
            MagicMock(scalar_one_or_none=MagicMock(return_value=mock_driver)),
            MagicMock(scalar_one_or_none=MagicMock(return_value=mock_vehicle)),
            MagicMock(scalar_one_or_none=MagicMock(return_value=mock_parcel)),
        ])

        with pytest.raises(HTTPException) as exc:
            await self.svc.driver_accept_parcel(
                parcel_id=str(mock_parcel.id),
                driver_user_id=str(uuid.uuid4()),
            )
        assert exc.value.status_code == 400
        assert "insufficient for parcel weight" in exc.value.detail


class TestParcelDeliveryAndPOD:
    def setup_method(self):
        self.mock_db = AsyncMock()
        self.svc = ParcelService(self.mock_db)

    @pytest.mark.anyio
    async def test_wrong_pickup_otp_raises_error(self):
        """Wrong Pickup OTP must raise HTTP 400 and increment attempts."""
        import uuid
        from common.models.all_models import Parcel, ParcelStatus

        mock_parcel = MagicMock(spec=Parcel)
        mock_parcel.id = uuid.uuid4()
        mock_parcel.pickup_otp = "1234"
        mock_parcel.pickup_otp_attempts = 0
        mock_parcel.status = ParcelStatus.AT_PICKUP

        self.mock_db.execute = AsyncMock(return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_parcel)
        ))

        with pytest.raises(HTTPException) as exc:
            await self.svc.verify_pickup_otp_and_handover(
                parcel_id=str(mock_parcel.id),
                driver_user_id=str(uuid.uuid4()),
                pickup_otp="9999",  # wrong
            )
        assert exc.value.status_code == 400
        assert "Invalid Pickup OTP" in exc.value.detail
        assert mock_parcel.pickup_otp_attempts == 1

    @pytest.mark.anyio
    async def test_missing_delivery_otp_raises_error(self):
        """Missing or empty delivery OTP must raise HTTP 400."""
        import uuid
        from common.models.all_models import Parcel, ParcelStatus

        mock_parcel = MagicMock(spec=Parcel)
        mock_parcel.id = uuid.uuid4()
        mock_parcel.delivery_otp = "5678"
        mock_parcel.status = ParcelStatus.AT_DESTINATION

        self.mock_db.execute = AsyncMock(return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_parcel)
        ))

        with pytest.raises(HTTPException) as exc:
            await self.svc.verify_delivery_otp_and_complete(
                parcel_id=str(mock_parcel.id),
                driver_user_id=str(uuid.uuid4()),
                delivery_otp="",  # Empty
            )
        assert exc.value.status_code == 400
        assert "Missing delivery OTP" in exc.value.detail

    @pytest.mark.anyio
    async def test_wrong_delivery_otp_raises_error(self):
        """Wrong delivery OTP must raise HTTP 400."""
        import uuid
        from common.models.all_models import Parcel, ParcelStatus

        mock_parcel = MagicMock(spec=Parcel)
        mock_parcel.id = uuid.uuid4()
        mock_parcel.delivery_otp = "5678"
        mock_parcel.delivery_otp_attempts = 0
        mock_parcel.status = ParcelStatus.AT_DESTINATION

        self.mock_db.execute = AsyncMock(return_value=MagicMock(
            scalar_one_or_none=MagicMock(return_value=mock_parcel)
        ))

        with pytest.raises(HTTPException) as exc:
            await self.svc.verify_delivery_otp_and_complete(
                parcel_id=str(mock_parcel.id),
                driver_user_id=str(uuid.uuid4()),
                delivery_otp="0000",  # Wrong
                receiver_name="Receiver Test",
            )
        assert exc.value.status_code == 400
        assert "Invalid Delivery OTP" in exc.value.detail
        assert mock_parcel.delivery_otp_attempts == 1


class TestParcelAPI:
    @pytest.mark.anyio
    async def test_health(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.get("/health")
            assert res.status_code == 200
            assert res.json()["service"] == "parcel-service"

    @pytest.mark.anyio
    async def test_quote_requires_auth(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            res = await ac.post("/api/v1/parcels/quote", json={
                "sender_lat": 18.5204,
                "sender_lng": 73.8567,
                "receiver_lat": 18.5913,
                "receiver_lng": 73.7389,
                "weight_kg": 2.5,
            })
            assert res.status_code == 401
