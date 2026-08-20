"""
Script to fix timezone datetime handling across backend services
"""
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
services_dir = os.path.join(backend_root, "matching-service", "app", "services")

for fname in ["destination_mode_service.py", "back_to_back_service.py", "driver_safety_service.py"]:
    fpath = os.path.join(services_dir, fname)
    if os.path.exists(fpath):
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()

        content = content.replace("from datetime import datetime, timedelta", "from datetime import datetime, timezone, timedelta")
        content = content.replace("datetime.utcnow()", "datetime.now(timezone.utc)")

        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✓ Fixed timezone in {fname}")

print("All services updated with timezone-aware datetimes!")
