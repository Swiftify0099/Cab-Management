"""
Patch local_gateway.py to cleanly load and mount:
- payment-service
- admin-service
- analytics-service
- parcel-service
- hotel-service (Feature 16)
"""
import os
import re

gateway_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "local_gateway.py")

with open(gateway_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace the service loading block between matching_mods snapshot and FastAPI app creation
pattern = re.compile(r'_matching_mods = \{k: v for k, v in sys\.modules\.items\(\) if k == "app" or k\.startswith\("app\."\)\}.*?(?=@asynccontextmanager\s+async def lifespan)', re.DOTALL)

replacement_block = """_matching_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]

# ── 4. Load PAYMENT service router ───────────────────────────────────────────
_payment_path = os.path.join(_ROOT, "payment-service")
sys.path.insert(0, _payment_path)
import dotenv as _dotenv
_dotenv.load_dotenv(os.path.join(_payment_path, ".env"), override=False)

try:
    from app.api.v1.payments import router as payment_router
    _payment_ok = True
    print("[PAYMENT]  [OK] payments / wallet / coupons / referrals")
except Exception as _e:
    _payment_ok = False
    print(f"[PAYMENT]  [ERR] {_e}")

_payment_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_payment_path)

# ── 4.5. Load ADMIN, ANALYTICS, PARCEL, HOTEL services ──────────────────────
_admin_path = os.path.join(_ROOT, "admin-service")
sys.path.insert(0, _admin_path)
try:
    from app.api.v1.admin import router as admin_router
    from app.api.v1.themes import router as themes_router
    _admin_ok = True
    print("[ADMIN]    [OK] admin / themes")
except Exception as _e:
    _admin_ok = False
    print(f"[ADMIN]    [ERR] {_e}")

_admin_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_admin_path)

_analytics_path = os.path.join(_ROOT, "analytics-service")
sys.path.insert(0, _analytics_path)
try:
    from app.api.v1.reports import router as reports_router
    _analytics_ok = True
    print("[ANALYTICS][OK] reports")
except Exception as _e:
    _analytics_ok = False
    print(f"[ANALYTICS][ERR] {_e}")

_analytics_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_analytics_path)

_parcel_path = os.path.join(_ROOT, "parcel-service")
sys.path.insert(0, _parcel_path)
try:
    from app.api.v1.parcels import router as parcel_router
    _parcel_ok = True
    print("[PARCEL]   [OK] parcels")
except Exception as _e:
    _parcel_ok = False
    print(f"[PARCEL]   [ERR] {_e}")

_parcel_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_parcel_path)

_hotel_path = os.path.join(_ROOT, "hotel-service")
sys.path.insert(0, _hotel_path)
try:
    from app.api.v1.hotels import router as hotel_router
    _hotel_ok = True
    print("[HOTEL]    [OK] hotels")
except Exception as _e:
    _hotel_ok = False
    print(f"[HOTEL]    [ERR] {_e}")

_hotel_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_hotel_path)

# Restore all sub-service modules
sys.path.insert(0, _auth_path)
sys.modules.update(_auth_mods)
sys.modules.update(_booking_mods)
sys.modules.update(_matching_mods)
sys.modules.update(_payment_mods)
sys.modules.update(_admin_mods)
sys.modules.update(_analytics_mods)
sys.modules.update(_parcel_mods)
sys.modules.update(_hotel_mods)

# Fix module attribute collisions across merged microservices
_cfg = sys.modules.get('app.core.config')
if _cfg:
    from common.config import settings
    if not hasattr(_cfg, 'auth_settings'): setattr(_cfg, 'auth_settings', settings)
    if not hasattr(_cfg, 'ws_settings'): setattr(_cfg, 'ws_settings', settings)
    if not hasattr(_cfg, 'payment_settings'): setattr(_cfg, 'payment_settings', settings)
    if not hasattr(_cfg, 'booking_settings'): setattr(_cfg, 'booking_settings', settings)
    if not hasattr(_cfg, 'matching_settings'): setattr(_cfg, 'matching_settings', settings)
    if not hasattr(_cfg, 'settings'): setattr(_cfg, 'settings', settings)


# ── 5. Build FastAPI app ──────────────────────────────────────────────────────
"""

if pattern.search(code):
    code = pattern.sub(replacement_block, code)
    print("Found and replaced service loader block!")
else:
    print("Pattern not found, skipping service loader block replace")

# Ensure hotel_router is mounted
if 'if _hotel_ok:' not in code:
    mount_target = 'if _parcel_ok:\n    app.include_router(parcel_router, prefix="/api/v1/parcels", tags=["Parcels"])\n'
    hotel_mount = 'if _parcel_ok:\n    app.include_router(parcel_router, prefix="/api/v1/parcels", tags=["Parcels"])\n\nif _hotel_ok:\n    app.include_router(hotel_router, prefix="/api/v1/hotels", tags=["Hotels"])\n    app.include_router(hotel_router, prefix="/api/v1/properties", tags=["Properties"])\n'
    code = code.replace(mount_target, hotel_mount)
    print("Added hotel_router mount!")

# Update health check
if '"hotel":' not in code:
    code = code.replace('"parcel":   _parcel_ok,', '"parcel":   _parcel_ok,\n        "hotel":    _hotel_ok,')
    print("Updated health check with hotel status!")

with open(gateway_path, "w", encoding="utf-8") as f:
    f.write(code)
print("local_gateway.py patched successfully for Feature 16!")
