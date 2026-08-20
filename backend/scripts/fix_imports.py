import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
radar_path = os.path.join(backend_root, "matching-service", "app", "services", "smart_radar.py")

with open(radar_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("RideRequest, RideRequestStatus, Vehicle, VehicleStatus,", "RideRequest, RideRequestStatus, Vehicle,")

with open(radar_path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Fixed imports in smart_radar.py")
