import os, sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Driver model with Feature 12 cancellation and restriction fields
if "cancellation_rate" not in content:
    target_needle = "    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)"
    replacement = """    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Feature 12: Driver Cancellation & Restriction Performance Metrics
    cancellation_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_cancellations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    penalty_cancellations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    restriction_status: Mapped[str] = mapped_column(String(30), default="NORMAL", nullable=False)  # NORMAL, WARNING, RESTRICTED, TEMPORARILY_SUSPENDED
    restriction_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    restriction_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)"""
    content = content.replace(target_needle, replacement, 1)
    print("  [✓] Patched Driver with Feature 12 cancellation metrics")

# 2. Update RideRequest with Feature 11 waiting fields
if "pickup_waiting_seconds" not in content:
    target_needle = "    destination_change_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)"
    replacement = """    destination_change_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Feature 11: Waiting System & Pickup Delays
    free_waiting_ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_waiting_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_waiting_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pickup_waiting_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.0"), nullable=False)
    is_no_show_eligible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)"""
    content = content.replace(target_needle, replacement, 1)
    print("  [✓] Patched RideRequest with Feature 11 waiting fields")

# 3. Add RideCancellationEvent model
if "class RideCancellationEvent" not in content:
    feature12_models = """

# ============================================================
# CANCELLATION & PERFORMANCE METRICS (Feature 12)
# ============================================================

class RideCancellationEvent(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Canonical cancellation audit event recording actor, reason, fee, penalty, and policy version.
    \"\"\"
    __tablename__ = "ride_cancellation_events"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    actor_type: Mapped[str] = mapped_column(String(20), default="driver", nullable=False)  # driver, customer, system, no_show
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    reason_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    reason_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancellation_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    driver_penalty: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    driver_payout: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    is_penalty_exempt: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    policy_version: Mapped[str] = mapped_column(String(20), default="v1.0", nullable=False)

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship(foreign_keys=[ride_id])
    actor: Mapped["User"] = relationship(foreign_keys=[actor_id])
"""
    compat_idx = content.find("# COMPATIBILITY ALIASES")
    if compat_idx != -1:
        content = content[:compat_idx] + feature12_models + "\n\n" + content[compat_idx:]
    else:
        content += feature12_models
    print("  [✓] Added RideCancellationEvent model to all_models.py")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] all_models.py patched for Feature 11 & 12!")
