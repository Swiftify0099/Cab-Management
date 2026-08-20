import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py for Feature 19 Models...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

if "class DemandZone" not in content:
    feature19_models = """

# ============================================================
# FEATURE 19: DEMAND / HEATMAP & SURGE ENGINE
# ============================================================

class DemandZone(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Authoritative spatial polygon zone model for PostGIS-first demand aggregation,
    hotspot opportunity scoring, and dynamic surge multipliers.
    Zero external Google Maps API dependency for demand and surge calculations.
    \"\"\"
    __tablename__ = "demand_zones"

    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    city_name: Mapped[str] = mapped_column(String(100), default="Pune", nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), default="COMMERCIAL", nullable=False)  # AIRPORT, TECH_PARK, TRANSIT_HUB, SHOPPING_MALL, NIGHTLIFE, COMMERCIAL
    centroid_lat: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lng: Mapped[float] = mapped_column(Float, nullable=False)
    boundary_geojson: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    current_surge_multiplier: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1.00"), nullable=False)
    demand_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)  # LOW, NORMAL, MODERATE, HIGH, CRITICAL
    active_requests_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    available_drivers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
"""

    if "# COMPATIBILITY ALIASES" in content:
        content = content.replace("# COMPATIBILITY ALIASES", feature19_models + "\n\n# COMPATIBILITY ALIASES")
    else:
        content += feature19_models

    with open(models_file, "w", encoding="utf-8") as f:
        f.write(content)
    print("✓ Added Feature 19 Models to all_models.py")
else:
    print("• Feature 19 Models already present in all_models.py")
