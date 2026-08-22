import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
models_path = os.path.join(backend_root, "common", "models", "all_models.py")

with open(models_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Feature 6 Models Chunk
feature6_models = '''
# ============================================================
# SMART RIDE SELECTION & RADAR (Feature 6)
# ============================================================

class DriverPreference(Base, UUIDMixin, TimestampMixin):
    """
    Driver personal matching preferences for Smart Ride Selection & Radar.
    One row per driver.
    """
    __tablename__ = "driver_preferences"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        unique=True, index=True, nullable=False
    )
    mode: Mapped[str] = mapped_column(String(30), default="balanced", nullable=False)  # balanced, earnings_focus, nearby_focus, short_trips, long_trips, airport_focus
    allow_local: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_airport: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_outstation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allow_scheduled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    min_earning_cutoff: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_pickup_distance_km: Mapped[float] = mapped_column(Float, default=7.0, nullable=False)
    max_pickup_eta_min: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    
    # Destination Mode (Towards Home)
    destination_mode: Mapped[str] = mapped_column(String(20), default="off", nullable=False)  # off, flexible, strict
    destination_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    destination_location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    destination_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    destination_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])


class AirportZone(Base, UUIDMixin, TimestampMixin):
    """
    Authoritative geofenced airport zones for high-precision airport ride classification.
    """
    __tablename__ = "airport_zones"

    airport_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)  # PNQ, BOM, DEL
    airport_name: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(50), nullable=False)
    boundary: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326), nullable=True
    )
    center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    center_lng: Mapped[float] = mapped_column(Float, nullable=False)
    radius_meters: Mapped[float] = mapped_column(Float, default=2500.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SmartRadarSession(Base, UUIDMixin, TimestampMixin):
    """
    Active Smart Ride Radar session for a driver containing candidate offers.
    """
    __tablename__ = "smart_radar_sessions"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        index=True, nullable=False
    )
    candidate_ride_ids: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    active_selection_ids: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active, closed, matched, expired
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
'''

if "class DriverPreference" not in content:
    compat_target = "# ============================================================\n# COMPATIBILITY ALIASES"
    if compat_target in content:
        content = content.replace(compat_target, feature6_models + "\n" + compat_target)

with open(models_path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Successfully updated all_models.py with Feature 6 models")
