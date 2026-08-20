import os

gatekeeper_file = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend\matching-service\app\services\routing_gatekeeper.py"

with open(gatekeeper_file, "r", encoding="utf-8") as f:
    content = f.read()

# Replace get_redis calls with timeout protection
content = content.replace("r = await get_redis()", "r = await asyncio.wait_for(get_redis(), timeout=0.3)")

with open(gatekeeper_file, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] routing_gatekeeper.py patched with non-blocking Redis access")
