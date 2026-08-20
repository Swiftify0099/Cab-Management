import os

perf_service_file = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\matching-service\app\services\driver_performance_service.py"
with open(perf_service_file, "r", encoding="utf-8") as f:
    c = f.read()

c = c.replace("from datetime import datetime, date, timedelta", "from datetime import datetime, date, timedelta, timezone")
c = c.replace("now = datetime.utcnow()", "now = datetime.now(timezone.utc)")
c = c.replace("session.duration_seconds = int((now - session.started_at).total_seconds())", """started = session.started_at if session.started_at.tzinfo else session.started_at.replace(tzinfo=timezone.utc)
                session.duration_seconds = int((now - started).total_seconds())""")

with open(perf_service_file, "w", encoding="utf-8") as f:
    f.write(c)

print("Fixed timezone handling in driver_performance_service.py")
