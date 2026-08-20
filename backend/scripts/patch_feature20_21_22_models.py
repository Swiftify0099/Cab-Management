import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Patch DriverPreference with Feature 20 fields
if "destination_mode_state" not in content:
    target_pref = """    # Destination Mode (Towards Home)
    destination_mode: Mapped[str] = mapped_column(String(20), default="off", nullable=False)  # off, flexible, strict
    destination_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    destination_location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    destination_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    destination_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)"""

    replacement_pref = """    # Destination Mode (Feature 20)
    destination_mode: Mapped[str] = mapped_column(String(20), default="off", nullable=False)  # off, flexible, strict
    destination_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    destination_location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    destination_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    destination_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    destination_mode_state: Mapped[str] = mapped_column(String(30), default="OFF", nullable=False)  # OFF, SETTING, ACTIVE, PAUSED, REACHED, EXPIRED, DISABLED
    destination_mode_pref: Mapped[str] = mapped_column(String(20), default="balanced", nullable=False)  # flexible, balanced, strict
    destination_activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    destination_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    destination_rides_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    destination_max_rides: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    destination_radius_km: Mapped[float] = mapped_column(Float, default=1.5, nullable=False)"""

    if target_pref in content:
        content = content.replace(target_pref, replacement_pref)
        print("✓ Patched DriverPreference with Feature 20 fields")
    else:
        print("⚠️ target_pref not found exactly in content")

# 2. Patch RideRequest with Feature 21 fields
if "is_back_to_back" not in content:
    target_ridereq = """    tip_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Relationships"""

    replacement_ridereq = """    tip_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Feature 21: Back-to-Back Rides Continuous Dispatch
    is_back_to_back: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    next_ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"), nullable=True)
    next_ride_reserved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_ride_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships"""

    if target_ridereq in content:
        content = content.replace(target_ridereq, replacement_ridereq)
        print("✓ Patched RideRequest with Feature 21 fields")
    else:
        print("⚠️ target_ridereq not found exactly in content")

# 3. Add Feature 22 Safety Models
if "class DriverTrustedContact" not in content:
    feature22_models = """

# ============================================================
# FEATURE 22: DRIVER SAFETY INTELLIGENCE & INCIDENT SYSTEM
# ============================================================

class DriverTrustedContact(Base, UUIDMixin, TimestampMixin):
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
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])


class LiveTripShareSession(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Secure, short-lived tokenized trip sharing for active rides with auto-expiration.
    \"\"\"
    __tablename__ = "live_trip_share_sessions"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    share_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, REVOKED, EXPIRED
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship(foreign_keys=[ride_id])
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])


class DriverSafetyAlert(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Real-time safety anomalies and warnings (route deviation, long stops, speed alerts)
    with driver acknowledgment / 'I'm Safe' tracking.
    \"\"\"
    __tablename__ = "driver_safety_alerts"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # ROUTE_DEVIATION, LONG_STOP, OVERSPEED, SUSPICIOUS_GPS
    severity: Mapped[str] = mapped_column(String(20), default="WARNING", nullable=False)  # NORMAL, OBSERVATION, WARNING, URGENT
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, ACKNOWLEDGED_SAFE, ESCALATED, AUTO_RESOLVED
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    details_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # IM_SAFE, DISMISSED, SUPPORT_CALL, AUTO_TIMEOUT

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    ride_request: Mapped[Optional["RideRequest"]] = relationship(foreign_keys=[ride_id])


class SafetyIncidentReport(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Structured incident reporting lifecycle for unsafe passengers, accidents, vehicle issues.
    \"\"\"
    __tablename__ = "safety_incident_reports"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    incident_category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # UNSAFE_PASSENGER, ACCIDENT, ROAD_HAZARD, VEHICLE_ISSUE, MEDICAL_EMERGENCY, HARASSMENT, OTHER
    severity: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status: Mapped[str] = mapped_column(String(30), default="REPORTED", nullable=False)  # REPORTED, RECEIVED, UNDER_REVIEW, ACTION_REQUIRED, RESOLVED, CLOSED
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_urls: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    ride_request: Mapped[Optional["RideRequest"]] = relationship(foreign_keys=[ride_id])
"""

    if "# COMPATIBILITY ALIASES" in content:
        content = content.replace("# COMPATIBILITY ALIASES", feature22_models + "\n\n# COMPATIBILITY ALIASES")
    else:
        content += feature22_models

    print("✓ Added Feature 22 Safety models to all_models.py")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("\nFinished patching all_models.py successfully!")
