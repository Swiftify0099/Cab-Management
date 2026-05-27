"""
Payment Service Tests — Phase 10.
Tests: Razorpay order creation, HMAC signature, wallet operations, coupon validation.
"""
import pytest
import hmac
import hashlib
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.razorpay_service import RazorpayService
from app.services.wallet_service import WalletService


# ─── Razorpay Signature Verification ─────────────────────

class TestRazorpaySignature:
    def test_valid_signature(self):
        """HMAC-SHA256 signature should pass verification."""
        secret = "test_webhook_secret"
        order_id = "order_test123"
        payment_id = "pay_test456"
        correct_sig = hmac.new(
            secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256
        ).hexdigest()

        svc = RazorpayService.__new__(RazorpayService)
        svc.webhook_secret = secret
        result = svc.verify_signature(order_id, payment_id, correct_sig)
        assert result is True

    def test_invalid_signature(self):
        """Wrong signature should fail verification."""
        secret = "test_webhook_secret"
        svc = RazorpayService.__new__(RazorpayService)
        svc.webhook_secret = secret
        result = svc.verify_signature("order_test123", "pay_test456", "wrong_sig")
        assert result is False

    def test_empty_signature_rejected(self):
        svc = RazorpayService.__new__(RazorpayService)
        svc.webhook_secret = "secret"
        result = svc.verify_signature("order", "pay", "")
        assert result is False


# ─── Wallet Service ───────────────────────────────────────

class TestWalletService:
    @pytest.mark.anyio
    async def test_cannot_deduct_more_than_balance(self):
        """Wallet deduction should fail if insufficient balance."""
        mock_db = AsyncMock()
        mock_customer = MagicMock()
        mock_customer.wallet_balance = Decimal("100.00")

        svc = WalletService(mock_db)
        svc._get_customer = AsyncMock(return_value=mock_customer)

        with pytest.raises(ValueError, match="Insufficient wallet balance"):
            await svc.deduct(
                customer_id="test-uuid",
                amount=Decimal("200.00"),
                description="Test deduction",
            )

    @pytest.mark.anyio
    async def test_reward_points_conversion(self):
        """100 points should convert to ₹10 (1pt = ₹0.10)."""
        mock_db = AsyncMock()
        mock_customer = MagicMock()
        mock_customer.reward_points = 100
        mock_customer.wallet_balance = Decimal("0.00")

        svc = WalletService(mock_db)
        svc._get_customer = AsyncMock(return_value=mock_customer)
        mock_db.commit = AsyncMock()

        result = await svc.redeem_points(
            customer_id="test-uuid",
            points=100,
        )
        # Should credit ₹10 to wallet
        assert result["credited_amount"] == 10.0

    @pytest.mark.anyio
    async def test_cannot_redeem_more_points_than_owned(self):
        mock_db = AsyncMock()
        mock_customer = MagicMock()
        mock_customer.reward_points = 50

        svc = WalletService(mock_db)
        svc._get_customer = AsyncMock(return_value=mock_customer)

        with pytest.raises(ValueError, match="Insufficient reward points"):
            await svc.redeem_points(customer_id="test-uuid", points=200)


# ─── Payment API (integration) ────────────────────────────

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


class TestPaymentAPI:
    @pytest.mark.anyio
    async def test_create_order_requires_auth(self, client: AsyncClient):
        res = await client.post("/api/v1/payments/create-order", json={
            "booking_id": "00000000-0000-0000-0000-000000000001",
            "amount": 480,
        })
        assert res.status_code == 401

    @pytest.mark.anyio
    async def test_wallet_balance_requires_auth(self, client: AsyncClient):
        res = await client.get("/api/v1/wallet")
        assert res.status_code == 401

    @pytest.mark.anyio
    async def test_health_check(self, client: AsyncClient):
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["service"] == "payment-service"
