import os, sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update RideRequest model with Feature 10 fields if not present
if "distance_travelled_km" not in content:
    target_needle = "    start_accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)"
    replacement = """    start_accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Feature 10: During Ride / Live Trip Execution
    distance_travelled_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    waiting_duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    waiting_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.0"), nullable=False)
    current_estimated_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.0"), nullable=False)
    has_active_sos: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    destination_change_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)"""
    content = content.replace(target_needle, replacement, 1)
    print("  [✓] Patched RideRequest with Feature 10 fields")

# 2. Add RideStop and RideSOSEvent models
if "class RideStop" not in content:
    feature10_models = """

# ============================================================
# DURING RIDE: MULTI-STOP & EMERGENCY SOS (Feature 10)
# ============================================================

class RideStop(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Intermediate stops added by Customer or Driver during an active ride.
    \"\"\"
    __tablename__ = "ride_stops"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending, accepted, arrived, completed, skipped
    requested_by: Mapped[str] = mapped_column(String(20), default="customer", nullable=False)  # customer, driver
    stop_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("30.00"), nullable=False)
    waiting_time_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    departed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship(foreign_keys=[ride_id])


class RideSOSEvent(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Emergency SOS incident event with PostGIS location snapshot and audit trail.
    \"\"\"
    __tablename__ = "ride_sos_events"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    triggered_by: Mapped[str] = mapped_column(String(20), default="driver", nullable=False)  # driver, customer
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    location: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)  # active, investigating, resolved, false_alarm
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship(foreign_keys=[ride_id])
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])
"""
    # Insert before Compatibility Aliases
    compat_idx = content.find("# COMPATIBILITY ALIASES")
    if compat_idx != -1:
        content = content[:compat_idx] + feature10_models + "\n\n" + content[compat_idx:]
    else:
        content += feature10_models
    print("  [✓] Added RideStop and RideSOSEvent models to all_models.py")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] all_models.py patched successfully!")
