import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# Check if scheduled columns already exist on RideRequest
if "scheduled_status: Mapped[str]" not in content:
    target_needle = "is_back_to_back: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)"
    scheduled_fields = """is_back_to_back: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Feature 26: Scheduled / Reserved Trips
    is_scheduled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scheduled_pickup_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_status: Mapped[str] = mapped_column(String(30), default="UNASSIGNED", nullable=False)  # UNASSIGNED, RESERVED, DISPATCHED, ACTIVE, CANCELLED, AUTO_RELEASED
    reservation_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    dispatch_buffer_minutes: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    auto_release_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)"""
    
    if target_needle in content:
        content = content.replace(target_needle, scheduled_fields, 1)
        print("✓ Injected Feature 26 fields into RideRequest model")
    else:
        print("⚠ Could not find target needle in RideRequest")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated all_models.py for Feature 26")
