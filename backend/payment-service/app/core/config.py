"""
Payment Service — Configuration (Phase 6)
Razorpay keys loaded from environment.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings


class PaymentSettings(BaseSettings):
    SERVICE_NAME: str = "payment-service"
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8004

    DATABASE_URL: str = "postgresql+asyncpg://cabuser:cabpass@postgres:5432/cabdb"
    REDIS_URL: str = "redis://redis:6379/0"
    REDIS_POOL_SIZE: int = 20

    # Razorpay
    RAZORPAY_KEY_ID: str = "rzp_test_placeholder"
    RAZORPAY_KEY_SECRET: str = "placeholder_secret"
    RAZORPAY_WEBHOOK_SECRET: str = "webhook_secret_placeholder"

    # Platform settings
    PLATFORM_COMMISSION_PCT: float = 10.0   # 10% platform fee
    DRIVER_PAYOUT_PCT: float = 90.0         # 90% to driver
    WALLET_MIN_RECHARGE: int = 50           # ₹50 minimum top-up
    WALLET_MAX_BALANCE: int = 50000         # ₹50,000 max wallet balance
    REWARD_POINTS_PER_RUPEE: float = 1.0    # 1 point per ₹1 spent
    REWARD_RUPEE_VALUE: float = 0.10        # ₹0.10 per point (10 pts = ₹1)
    REFERRAL_BONUS_RUPEES: int = 100        # ₹100 for referrer + referee

    CORS_ORIGINS: list = ["*"]

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> PaymentSettings:
    return PaymentSettings()


payment_settings = get_settings()
