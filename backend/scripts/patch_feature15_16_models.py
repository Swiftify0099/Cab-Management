import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

if "class DriverPayoutMethod" not in content:
    feature15_16_models = """

# ============================================================
# FEATURE 15: PAYOUT AND WALLET SYSTEM
# ============================================================

class DriverPayoutMethod(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Verified payout methods (Bank Account or UPI) for driver withdrawals.
    \"\"\"
    __tablename__ = "driver_payout_methods"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    method_type: Mapped[str] = mapped_column(String(20), nullable=False)  # BANK, UPI
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Bank fields
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    account_holder_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    account_number_masked: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    account_number_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    ifsc_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    account_type: Mapped[Optional[str]] = mapped_column(String(20), default="savings", nullable=True)
    
    # UPI fields
    upi_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    upi_id_masked: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    upi_id_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    
    # Verification and Status
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, PENDING, REJECTED, DISABLED
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])


class DriverPayoutRequest(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Authoritative payout lifecycle transaction with idempotency and double-entry reservation.
    \"\"\"
    __tablename__ = "driver_payout_requests"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    payout_reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    net_payout: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    payout_method: Mapped[str] = mapped_column(String(20), nullable=False)  # BANK, UPI
    destination_masked: Mapped[str] = mapped_column(String(100), nullable=False)
    payout_method_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("driver_payout_methods.id", ondelete="SET NULL"),
        nullable=True
    )
    status: Mapped[str] = mapped_column(String(30), default="REQUESTED", nullable=False, index=True)  # REQUESTED, PROCESSING, SUCCESS, FAILED, REVERSED, CANCELLED
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    provider_payload: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reversed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_auto_payout: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])


class DriverAutoPayoutSetting(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Driver-configurable automated payout rules with balance threshold triggers.
    \"\"\"
    __tablename__ = "driver_auto_payout_settings"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    threshold_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("2000.00"), nullable=False)
    frequency: Mapped[str] = mapped_column(String(30), default="THRESHOLD_ONLY", nullable=False)  # DAILY, WEEKLY, THRESHOLD_ONLY
    payout_method_type: Mapped[str] = mapped_column(String(20), default="BANK", nullable=False)  # BANK, UPI
    payout_method_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("driver_payout_methods.id", ondelete="SET NULL"),
        nullable=True
    )
    last_auto_payout_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])


# ============================================================
# FEATURE 16: DRIVER PERFORMANCE AND SESSION ANALYTICS
# ============================================================

class DriverOnlineSession(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Authoritative driver online session tracking for accurate online hours and fatigue metrics.
    \"\"\"
    __tablename__ = "driver_online_sessions"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, ENDED
    total_distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    trips_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])


class DriverPerformanceDaily(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Materialized daily/weekly/monthly analytics snapshot for sub-millisecond dashboard queries.
    \"\"\"
    __tablename__ = "driver_performance_daily"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    period_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_type: Mapped[str] = mapped_column(String(20), default="DAILY", nullable=False)  # DAILY, WEEKLY, MONTHLY
    acceptance_rate: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    cancellation_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    completion_rate: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    rating_avg: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    complaints_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_offers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    accepted_offers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rejected_offers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missed_offers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_rides: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_rides: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cancelled_rides: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    online_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gross_earnings: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    net_earnings: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    earnings_per_hour: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    formula_version: Mapped[str] = mapped_column(String(20), default="v1.0", nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
"""
    target = "# COMPATIBILITY ALIASES"
    content = content.replace(target, feature15_16_models + "\n\n" + target, 1)
    with open(models_file, "w", encoding="utf-8") as f:
        f.write(content)
    print("  [✓] Successfully added Feature 15 and 16 models to all_models.py")
else:
    print("  [-] Feature 15 and 16 models already exist in all_models.py")
