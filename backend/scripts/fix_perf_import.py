import os

perf_service_file = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\matching-service\app\services\driver_performance_service.py"
with open(perf_service_file, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("from sqlalchemy import select, and_, func, desc", "from sqlalchemy import select, and_, func, desc, update")

with open(perf_service_file, "w", encoding="utf-8") as f:
    f.write(c)

print("Fixed update import in driver_performance_service.py")
