import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# Add DriverNotificationPreference model if not present
if "class DriverNotificationPreference" not in content:
    feature25_models = """

# ============================================================
# FEATURE 25: DRIVER NOTIFICATION PREFERENCES
# ============================================================

class DriverNotificationPreference(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Granular driver notification preferences per category.
    \"\"\"
    __tablename__ = "driver_notification_preferences"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    trip_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    earnings_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    payout_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    safety_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    promotions_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sound_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    vibration_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship("Driver", foreign_keys=[driver_id])
"""
    if "# COMPATIBILITY ALIASES" in content:
        content = content.replace("# COMPATIBILITY ALIASES", feature25_models + "\n\n# COMPATIBILITY ALIASES")
        print("✓ Appended DriverNotificationPreference before COMPATIBILITY ALIASES")
    else:
        content += feature25_models
        print("✓ Appended DriverNotificationPreference to end of all_models.py")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated all_models.py for Feature 25")
