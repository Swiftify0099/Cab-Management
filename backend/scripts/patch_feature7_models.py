import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
models_path = os.path.join(backend_root, "common", "models", "all_models.py")

with open(models_path, "r", encoding="utf-8") as f:
    content = f.read()

feature7_models = '''
# ============================================================
# NAVIGATION & ROAD HAZARDS (Feature 7)
# ============================================================

class RoadHazard(Base, UUIDMixin, TimestampMixin):
    """
    Driver-reported and system-verified road hazards with PostGIS spatial clustering.
    """
    __tablename__ = "road_hazards"

    hazard_type: Mapped[str] = mapped_column(String(50), nullable=False)  # construction, pothole, accident, road_closed, heavy_traffic, flooding, other
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    heading: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    speed_kmh: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Validation & Clustering
    status: Mapped[str] = mapped_column(String(30), default="reported", nullable=False)  # reported, verified, resolved, expired
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)  # increases with multiple reports
    report_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    reported_by_driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Relationships
    reporter: Mapped[Optional["Driver"]] = relationship(foreign_keys=[reported_by_driver_id])


class RouteNavigationLog(Base, UUIDMixin, TimestampMixin):
    """
    Audit log for tracking external Map/Route API requests vs internal PostGIS cache hits.
    Provides authoritative cost monitoring KPI: API Calls Per Completed Ride.
    """
    __tablename__ = "route_navigation_logs"

    provider: Mapped[str] = mapped_column(String(50), default="google_routes", nullable=False)  # google_routes, postgis_math, redis_cache
    endpoint: Mapped[str] = mapped_column(String(100), nullable=False)
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    request_type: Mapped[str] = mapped_column(String(50), nullable=False)  # initial_route, reroute, arrival_check, hazard_lookup
    cache_hit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    prevented_by_postgis: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    response_time_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="success", nullable=False)
    estimated_cost_usd: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
'''

if "class RoadHazard" not in content:
    compat_target = "# ============================================================\n# COMPATIBILITY ALIASES"
    if compat_target in content:
        content = content.replace(compat_target, feature7_models + "\n" + compat_target)

with open(models_path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Successfully updated all_models.py with Feature 7 models")
