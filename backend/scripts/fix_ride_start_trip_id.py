import os

matching_services_dir = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\matching-service\app\services"
ride_start_file = os.path.join(matching_services_dir, "ride_start_service.py")

with open(ride_start_file, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("driver.current_trip_id = ride.id", "# driver.current_trip_id is FK to trips.id, not ride_requests")

with open(ride_start_file, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] ride_start_service.py fixed (removed invalid current_trip_id assignment)")
