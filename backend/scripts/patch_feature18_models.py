import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py for Feature 18 Models...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

if "class IncentiveCampaign" not in content:
    feature18_models = """

# ============================================================
# FEATURE 18: INCENTIVES & PROMOTIONS SYSTEM
# ============================================================

class IncentiveCampaign(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Authoritative campaign definition for driver incentives, targets, milestones,
    peak-hour quests, shift guarantees, and location-aware zone bonuses.
    \"\"\"
    __tablename__ = "incentive_campaigns"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    campaign_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # DAILY_TARGET, WEEKLY_TARGET, RIDE_MILESTONE, PEAK_HOUR, GUARANTEED_EARNINGS, ZONE_INCENTIVE, FESTIVAL, REFERRAL
    target_count: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    reward_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("500.00"), nullable=False)
    guaranteed_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    zone_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    zone_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vehicle_category: Mapped[Optional[str]] = mapped_column(String(50), default="all", nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rules_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)


class DriverIncentiveProgress(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Per-driver progress tracking for an active incentive campaign.
    Authoritative state evaluated server-side upon ride completions.
    \"\"\"
    __tablename__ = "driver_incentive_progress"
    __table_args__ = (
        UniqueConstraint("driver_id", "campaign_id", name="uq_driver_incentive_campaign"),
    )

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("incentive_campaigns.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    current_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target_count: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    current_actual_earnings: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    reward_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)  # AVAILABLE, ACTIVE, IN_PROGRESS, COMPLETED, EARNED, EXPIRED, CANCELLED
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    earned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ledger_entry_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    campaign: Mapped["IncentiveCampaign"] = relationship(foreign_keys=[campaign_id])


class DriverReferral(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Driver referral relationship and milestone qualification tracking.
    Credits referral reward to referrer's ledger once referred driver finishes target trips.
    \"\"\"
    __tablename__ = "driver_referrals"
    __table_args__ = (
        UniqueConstraint("referrer_driver_id", "referred_driver_id", name="uq_driver_referral_pair"),
    )

    referrer_driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    referred_driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    referral_code_used: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    required_rides: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    completed_rides: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reward_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("1000.00"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)  # PENDING, QUALIFIED, REWARDED
    rewarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    referrer: Mapped["Driver"] = relationship(foreign_keys=[referrer_driver_id])
    referred: Mapped["Driver"] = relationship(foreign_keys=[referred_driver_id])
"""

    if "# COMPATIBILITY ALIASES" in content:
        content = content.replace("# COMPATIBILITY ALIASES", feature18_models + "\n\n# COMPATIBILITY ALIASES")
    else:
        content += feature18_models

    with open(models_file, "w", encoding="utf-8") as f:
        f.write(content)
    print("✓ Added Feature 18 Models to all_models.py")
else:
    print("• Feature 18 Models already present in all_models.py")
