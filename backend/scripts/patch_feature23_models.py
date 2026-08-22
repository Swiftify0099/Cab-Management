import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Fix relationship attribute shadowing in DriverTrustedContact
shadow_target = """class DriverTrustedContact(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Verified emergency contacts for driver SOS and live trip sharing alerts.
    \"\"\"
    __tablename__ = "driver_trusted_contacts"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_masked: Mapped[str] = mapped_column(String(50), nullable=False)
    phone_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    relationship: Mapped[str] = mapped_column(String(50), default="Family", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])"""

shadow_fixed = """class DriverTrustedContact(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Verified emergency contacts for driver SOS and live trip sharing alerts.
    \"\"\"
    __tablename__ = "driver_trusted_contacts"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_masked: Mapped[str] = mapped_column(String(50), nullable=False)
    phone_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    contact_relationship: Mapped[str] = mapped_column(String(50), default="Family", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])"""

if shadow_target in content:
    content = content.replace(shadow_target, shadow_fixed)
    print("✓ Fixed relationship shadowing in DriverTrustedContact")
elif "contact_relationship" in content:
    print("✓ DriverTrustedContact already using contact_relationship")
else:
    print("⚠️ shadow_target not matched exactly, checking line replacement")
    content = content.replace('    relationship: Mapped[str] = mapped_column(String(50), default="Family", nullable=False)', '    contact_relationship: Mapped[str] = mapped_column(String(50), default="Family", nullable=False)')
    print("✓ Replaced relationship line in DriverTrustedContact")

# 2. Add Feature 23 Models
if "class DriverRiskSignal" not in content:
    feature23_models = """

# ============================================================
# FEATURE 23: AI / SMART DRIVER FEATURES & RISK TELEMETRY
# ============================================================

class DriverRiskSignal(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Internal AI & telemetry risk signals (impossible speed, fake GPS, abnormal cancellation).
    Zero PII exposure; strictly server-side authoritative.
    \"\"\"
    __tablename__ = "driver_risk_signals"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    signal_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # FAKE_GPS, IMPOSSIBLE_SPEED, ABNORMAL_CANCELLATION, SENSOR_MISMATCH, REPEATED_REJECTS
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0.0 to 100.0
    severity: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status: Mapped[str] = mapped_column(String(30), default="LOGGED", nullable=False)  # LOGGED, UNDER_REVIEW, DISMISSED, ACTIONED
    details_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    ride_request: Mapped[Optional["RideRequest"]] = relationship(foreign_keys=[ride_id])


class DriverFatigueLog(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Authoritative continuous driving tracking and constructive break advisories.
    \"\"\"
    __tablename__ = "driver_fatigue_logs"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    continuous_online_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    continuous_driving_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    advisory_level: Mapped[str] = mapped_column(String(20), default="NONE", nullable=False)  # NONE, SUGGESTION, RECOMMENDED_BREAK, MANDATORY_REST
    reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    driver_acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])


class DemandForecastZone(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Spatial demand predictions and opportunity zone clusters (PostGIS backed).
    \"\"\"
    __tablename__ = "demand_forecast_zones"

    zone_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    zone_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    center_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    center_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    current_demand_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)  # LOW, NORMAL, HIGH, SURGE
    forecast_15m_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
    forecast_30m_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
    forecast_60m_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
    surge_multiplier: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    expected_hourly_earning: Mapped[float] = mapped_column(Float, default=250.0, nullable=False)
    active_drivers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    polygon_geojson: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
"""
    # Insert before aliases
    if "# COMPATIBILITY ALIASES" in content:
        content = content.replace("# COMPATIBILITY ALIASES", feature23_models + "\n\n# COMPATIBILITY ALIASES")
        print("✓ Appended Feature 23 models to all_models.py before COMPATIBILITY ALIASES")
    else:
        content += feature23_models
        print("✓ Appended Feature 23 models to end of all_models.py")
else:
    print("✓ Feature 23 models already present in all_models.py")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated all_models.py")
