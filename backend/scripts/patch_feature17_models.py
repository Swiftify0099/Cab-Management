import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

if "class CustomerDriverRating" not in content:
    feature17_models = """

# ============================================================
# FEATURE 17: RATING & FEEDBACK SYSTEM
# ============================================================

class CustomerDriverRating(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Authoritative customer rating of driver on completed ride requests.
    Supports 1-5 integer star rating, structured compliments, complaints, and moderation/dispute status.
    \"\"\"
    __tablename__ = "customer_driver_ratings"
    __table_args__ = (
        UniqueConstraint("ride_id", name="uq_customer_driver_rating_ride"),
    )

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
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 to 5 stars
    compliments: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)  # ["CLEAN_VEHICLE", "SAFE_DRIVING", ...]
    complaint_tags: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)  # ["UNSAFE_DRIVING", "LATE_PICKUP", ...]
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)  # APPROVED, FLAGGED, DISPUTED, HIDDEN
    dispute_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    disputed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship(foreign_keys=[ride_id])
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])
"""
    # Insert before COMPATIBILITY ALIASES
    if "# COMPATIBILITY ALIASES" in content:
        content = content.replace("# COMPATIBILITY ALIASES", feature17_models + "\n\n# COMPATIBILITY ALIASES")
    else:
        content += feature17_models

    with open(models_file, "w", encoding="utf-8") as f:
        f.write(content)
    print("✓ Added CustomerDriverRating to all_models.py")
else:
    print("• CustomerDriverRating already present in all_models.py")
