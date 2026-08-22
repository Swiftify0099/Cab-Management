import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# Fix DriverAppSetting model relationship
old_block = """class DriverAppSetting(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Authoritative driver app preferences including language, navigation, audio alerts, and auto-accept.
    \"\"\"
    __tablename__ = "driver_app_settings"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)  # en, mr, hi
    navigation_app: Mapped[str] = mapped_column(String(30), default="IN_APP", nullable=False)  # IN_APP, GOOGLE_MAPS, WAZE
    auto_accept_rides: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auto_accept_min_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    voice_navigation_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sound_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    high_contrast_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    theme_mode: Mapped[str] = mapped_column(String(20), default="system", nullable=False)  # light, dark, system
    speed_limit_warning: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deactivated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deactivation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deactivated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship("Driver", backref=backref("app_settings", uselist=False))"""

new_block = """class DriverAppSetting(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Authoritative driver app preferences including language, navigation, audio alerts, and auto-accept.
    \"\"\"
    __tablename__ = "driver_app_settings"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)  # en, mr, hi
    navigation_app: Mapped[str] = mapped_column(String(30), default="IN_APP", nullable=False)  # IN_APP, GOOGLE_MAPS, WAZE
    auto_accept_rides: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auto_accept_min_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    voice_navigation_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sound_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    high_contrast_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    theme_mode: Mapped[str] = mapped_column(String(20), default="system", nullable=False)  # light, dark, system
    speed_limit_warning: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deactivated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deactivation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deactivated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("✓ Fixed relationship in DriverAppSetting in all_models.py")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully wrote all_models.py")
