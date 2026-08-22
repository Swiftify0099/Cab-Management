import os

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
dispatch_path = os.path.join(backend_root, "matching-service", "app", "services", "ride_dispatch.py")

with open(dispatch_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("DriverLocation, Vehicle, VehicleStatus,", "DriverLocation, Vehicle,")

with open(dispatch_path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Fixed VehicleStatus in ride_dispatch.py")
