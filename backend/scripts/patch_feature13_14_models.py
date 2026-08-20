import os, sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update RideRequest with Feature 13 completion & payment fields
if "destination_arrived_at" not in content:
    target_needle = "    is_no_show_eligible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)"
    replacement = """    is_no_show_eligible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Feature 13 & 14: Trip Completion, Final Fare & Financial Settlement
    destination_arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    final_fare: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    driver_earning: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    platform_commission: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(30), default="cash", nullable=False)  # cash, upi, card, wallet
    payment_status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending, paid, failed, cash_collected
    tip_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)"""
    content = content.replace(target_needle, replacement, 1)
    print("  [✓] Patched RideRequest with Feature 13 completion and payment fields")

# 2. Add Feature 13 & 14 Models: RideReceipt, DriverEarningLedger, DriverCustomerRating
if "class RideReceipt" not in content:
    feature13_14_models = """

# ============================================================
# TRIP COMPLETION, RECEIPTS & EARNINGS LEDGER (Features 13 & 14)
# ============================================================

class RideReceipt(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Immutable financial receipt for completed rides recording transparent itemized breakdowns.
    \"\"\"
    __tablename__ = "ride_receipts"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    base_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    distance_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    time_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    waiting_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    stops_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    tolls_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    parking_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    taxes_and_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    surge_multiplier: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    customer_final_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    platform_commission: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    driver_net_earning: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), default="cash", nullable=False)
    payment_status: Mapped[str] = mapped_column(String(30), default="paid", nullable=False)
    tip_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship(foreign_keys=[ride_id])
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])


class DriverEarningLedger(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Immutable double-entry financial journal for driver earnings, commissions, tips, cash, and payouts.
    \"\"\"
    __tablename__ = "driver_earning_ledger"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    entry_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)  # TRIP_EARNING, COMMISSION, TIP, INCENTIVE, BONUS, CASH_COLLECTED, REFUND_ADJUSTMENT, PAYOUT
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    direction: Mapped[str] = mapped_column(String(10), default="CREDIT", nullable=False)  # CREDIT, DEBIT
    status: Mapped[str] = mapped_column(String(20), default="SETTLED", nullable=False)  # SETTLED, PENDING, FAILED
    description: Mapped[str] = mapped_column(Text, nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, server_default=func.current_date(), nullable=False, index=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    ride_request: Mapped[Optional["RideRequest"]] = relationship(foreign_keys=[ride_id])


class DriverCustomerRating(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Mutual customer rating by driver with tags and optional feedback.
    \"\"\"
    __tablename__ = "driver_customer_ratings"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship(foreign_keys=[ride_id])
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])
"""
    compat_idx = content.find("# COMPATIBILITY ALIASES")
    if compat_idx != -1:
        content = content[:compat_idx] + feature13_14_models + "\n\n" + content[compat_idx:]
    else:
        content += feature13_14_models
    print("  [✓] Added RideReceipt, DriverEarningLedger, and DriverCustomerRating models")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] all_models.py updated with Feature 13 & 14 models!")
