"""
CabBooking â€” Combined Local Dev Gateway  (port 8001 / 80)
Loads auth + booking + matching routers into one FastAPI app.

Run:
    $env:PYTHONPATH = "C:/Users/panka/OneDrive/Desktop/CabBooking/backend/common;C:/Users/panka/OneDrive/Desktop/CabBooking/backend"
    cd C:/Users/panka/OneDrive/Desktop/CabBooking/backend
    python -m uvicorn local_gateway:app --host 0.0.0.0 --port 8001 --reload
"""
import sys, os, importlib, importlib.util, types

_ROOT = os.path.dirname(os.path.abspath(__file__))


def _load_service_module(service_dir: str, module_path: str):
    """
    Loads a module from a service directory without polluting sys.modules['app'].
    Returns the module object or None on failure.
    """
    abs_service = os.path.join(_ROOT, service_dir)
    abs_file    = os.path.join(abs_service, *module_path.split(".")) + ".py"
    # Also try package __init__.py
    abs_pkg     = os.path.join(abs_service, *module_path.split("."), "__init__.py")

    target = abs_pkg if os.path.exists(abs_pkg) else (abs_file if os.path.exists(abs_file) else None)
    if not target:
        raise FileNotFoundError(f"Module {module_path!r} not found in {service_dir}")

    # Use a unique namespace key to avoid collision
    ns_key = f"__gw_{service_dir.replace('-', '_')}_{module_path.replace('.', '_')}"

    # Build a parent package namespace so relative imports work
    parts = module_path.split(".")
    parent_ns = f"__gw_{service_dir.replace('-', '_')}"

    # Register top-level 'app' alias for this service
    for i in range(len(parts)):
        pkg_name = f"{parent_ns}.{'.'.join(parts[:i+1])}"
        if pkg_name not in sys.modules:
            pkg_init = os.path.join(abs_service, *parts[:i+1], "__init__.py")
            pkg_file = os.path.join(abs_service, *parts[:i+1]) + ".py"
            init_path = pkg_init if os.path.exists(pkg_init) else (pkg_file if os.path.exists(pkg_file) else None)
            m = types.ModuleType(pkg_name)
            if init_path:
                spec = importlib.util.spec_from_file_location(pkg_name, init_path,
                    submodule_search_locations=[os.path.join(abs_service, *parts[:i+1])])
                m.__spec__ = spec
                m.__path__ = [os.path.join(abs_service, *parts[:i+1])]
                m.__package__ = pkg_name
                sys.modules[pkg_name] = m
                # Also register under the plain 'app.xxx' name temporarily during exec
            sys.modules[pkg_name] = m

    # Temporarily add service dir to path for its own relative imports
    if abs_service not in sys.path:
        sys.path.insert(0, abs_service)
    # Load common too
    common_path = os.path.join(_ROOT, "common")
    if common_path not in sys.path:
        sys.path.insert(0, common_path)

    spec = importlib.util.spec_from_file_location(ns_key, target,
        submodule_search_locations=[os.path.dirname(target)])
    mod = importlib.util.module_from_spec(spec)
    mod.__package__ = ns_key
    sys.modules[ns_key] = mod
    spec.loader.exec_module(mod)

    if abs_service in sys.path:
        sys.path.remove(abs_service)

    return mod


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Simpler approach: just prepend each service path and import normally,
# but use importlib.reload to switch context between services.
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware


# â”€â”€ 1. Load AUTH service routers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
_auth_path = os.path.join(_ROOT, "auth-service")
sys.path.insert(0, _auth_path)
sys.path.insert(0, os.path.join(_ROOT, "common"))
sys.path.insert(0, _ROOT)

try:
    from app.api.v1 import auth_router, admin_auth_router, profile_router, driver_router, family_router, emergency_router, customer_settings_router, customer_home_router, services_router, customer_security_router, smart_router, orchestration_router
    from app.api.v1.riders import router as riders_router
    _auth_ok = True
    print("[AUTH]    [OK] auth / profile / driver / riders / security / smart / orchestration")
except Exception as _e:
    _auth_ok = False
    print(f"[AUTH]    [ERR] {_e}")

# Snapshot auth app modules, remove from sys.modules before loading next service
_auth_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in _auth_mods:
    del sys.modules[k]
sys.path.remove(_auth_path)


# â”€â”€ 2. Load BOOKING service routers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
_booking_path = os.path.join(_ROOT, "booking-service")
sys.path.insert(0, _booking_path)

try:
    from app.api.v1 import booking_router, fare_router, trip_router
    from app.api.v1.subscriptions import router as subscription_router
    from app.api.v1.activity import router as activity_router
    from app.api.v1.support_hub import router as support_hub_router
    from app.services.pending_match_bridge import run_reverse_match as _PRMB
    _booking_ok = True
    print("[BOOKING] [OK] trips / bookings / fare / subscriptions / activity / support")
except Exception as _e:
    _booking_ok = False
    print(f"[BOOKING] [ERR] {_e}")

_booking_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in _booking_mods:
    del sys.modules[k]
sys.path.remove(_booking_path)


# â”€â”€ 3. Load MATCHING service routers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
_matching_path = os.path.join(_ROOT, "matching-service")
sys.path.insert(0, _matching_path)

try:
    from app.api.v1.matching import router as matching_router
    # Eagerly import corridor_matcher NOW while matching-service path is active,
    # so it gets cached in sys.modules before the auth path is restored below.
    # Without this, the lazy import inside get_corridor_customers() fails at
    # request-time because 'app' then resolves to auth-service's namespace.
    from app.services.corridor_matcher import CorridorMatchingService as _CMSCheck
    # Also eagerly load PendingMatchingService for the reverse-match bridge fallback.
    from app.services.pending_matching import PendingMatchingService as _PMSCheck
    _matching_ok = True
    print("[MATCHING] [OK] matching + corridor_matcher + pending_matching")
except Exception as _e:
    _matching_ok = False
    print(f"[MATCHING] [ERR] {_e}")

# Snapshot matching modules so they survive the auth-module restore below
_matching_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
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

_transport_path = os.path.join(_ROOT, "transport-service")
sys.path.insert(0, _transport_path)
try:
    from app.api.v1.transport import router as transport_router
    _transport_ok = True
    print("[TRANSPORT] [OK] transport")
except Exception as _e:
    _transport_ok = False
    print(f"[TRANSPORT] [ERR] {_e}")

_transport_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_transport_path)

_airport_path = os.path.join(_ROOT, "airport-service")
sys.path.insert(0, _airport_path)
try:
    from app.api.v1.airport import router as airport_router, flight_router as flight_router
    _airport_ok = True
    print("[AIRPORT]   [OK] airport + flight")
except Exception as _e:
    _airport_ok = False
    print(f"[AIRPORT]   [ERR] {_e}")

_airport_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_airport_path)

_rental_path = os.path.join(_ROOT, "rental-service")
sys.path.insert(0, _rental_path)
try:
    from app.api.v1.rental import router as rental_router
    _rental_ok = True
    print("[RENTAL]    [OK] rental")
except Exception as _e:
    _rental_ok = False
    print(f"[RENTAL]    [ERR] {_e}")

_rental_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_rental_path)

_outstation_path = os.path.join(_ROOT, "outstation-service")
sys.path.insert(0, _outstation_path)
try:
    from app.api.v1.outstation import router as outstation_router
    _outstation_ok = True
    print("[OUTSTATION] [OK] outstation")
except Exception as _e:
    _outstation_ok = False
    print(f"[OUTSTATION] [ERR] {_e}")

_outstation_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_outstation_path)

_corporate_path = os.path.join(_ROOT, "corporate-service")
sys.path.insert(0, _corporate_path)
try:
    from app.api.v1.corporate import router as corporate_router
    _corporate_ok = True
    print("[CORPORATE] [OK] corporate")
except Exception as _e:
    _corporate_ok = False
    print(f"[CORPORATE] [ERR] {_e}")

_corporate_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_corporate_path)

_notification_path = os.path.join(_ROOT, "notification-service")
sys.path.insert(0, _notification_path)
try:
    from app.api.v1.notifications import router as notification_router
    _notification_ok = True
    print("[NOTIF]     [OK] notifications")
except Exception as _e:
    _notification_ok = False
    print(f"[NOTIF]     [ERR] {_e}")

_notification_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
sys.path.remove(_notification_path)

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
sys.modules.update(_transport_mods)
sys.modules.update(_airport_mods)
sys.modules.update(_rental_mods)
sys.modules.update(_outstation_mods)
sys.modules.update(_corporate_mods)
sys.modules.update(_notification_mods)

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
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n[LOCAL-GATEWAY] Running on port 8001 — auth + booking + matching + payment + transport\n")
    yield


app = FastAPI(
    title="CabBooking — Local Gateway",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if _auth_ok:
    app.include_router(auth_router,       prefix="/api/v1/auth",       tags=["Auth"])
    app.include_router(admin_auth_router, prefix="/api/v1/admin/auth", tags=["Admin Auth"])
    app.include_router(profile_router,    prefix="/api/v1/profile",    tags=["Profile"])
    app.include_router(driver_router,     prefix="/api/v1/driver",     tags=["Driver"])
    app.include_router(family_router,     prefix="/api/v1/family",     tags=["Family"])
    app.include_router(riders_router,     prefix="/api/v1/customer/riders", tags=["Saved Riders & Participants"])
    app.include_router(emergency_router,  prefix="/api/v1/customer/emergency-contacts", tags=["Emergency Contacts"])
    app.include_router(customer_settings_router, prefix="/api/v1/customer", tags=["Customer Settings"])
    app.include_router(customer_home_router, prefix="/api/v1/customer/home", tags=["Customer Home"])
    app.include_router(services_router, prefix="/api/v1/services", tags=["Services"])
    app.include_router(customer_security_router, prefix="/api/v1/customer/security", tags=["Customer Security & Trust"])
    app.include_router(smart_router, prefix="/api/v1/smart", tags=["Smart Features & Intelligence Layer"])
    app.include_router(orchestration_router, prefix="/api/v1/orchestration", tags=["Cross-Service Orchestration"])

if _booking_ok:
    app.include_router(trip_router,          prefix="/api/v1/trips",         tags=["Trips"])
    app.include_router(booking_router,       prefix="/api/v1/bookings",      tags=["Bookings"])
    app.include_router(fare_router,          prefix="/api/v1/bookings/fare", tags=["Fare"])
    app.include_router(activity_router,      prefix="/api/v1/customer/activity", tags=["Unified Activity Hub"])
    app.include_router(support_hub_router,   prefix="/api/v1/support",       tags=["Unified Support & Help Hub"])
    app.include_router(subscription_router)

if _matching_ok:
    app.include_router(matching_router, prefix="/api/v1/matching", tags=["Matching"])
    app.include_router(matching_router, prefix="/api/v1", tags=["Matching (Rides)"])

if _payment_ok:
    app.include_router(payment_router, prefix="/api/v1", tags=["Payment"])

if _admin_ok:
    app.include_router(admin_router, prefix="/api/v1", tags=["Admin"])
    app.include_router(themes_router, prefix="/api/v1", tags=["Themes"])

if _analytics_ok:
    app.include_router(reports_router, tags=["Analytics"])

if _parcel_ok:
    app.include_router(parcel_router, prefix="/api/v1/parcels", tags=["Parcels"])

if _hotel_ok:
    app.include_router(hotel_router, prefix="/api/v1/hotels", tags=["Hotels"])
    app.include_router(hotel_router, prefix="/api/v1/properties", tags=["Properties"])

if _transport_ok:
    app.include_router(transport_router, prefix="/api/v1/transport", tags=["Transport"])
    app.include_router(transport_router, prefix="/api/v1/goods-transport", tags=["Goods Transport"])

if _airport_ok:
    app.include_router(airport_router, prefix="/api/v1/airport", tags=["Airport"])
    app.include_router(flight_router, prefix="/api/v1/flight", tags=["Flight Tracker"])

if _rental_ok:
    app.include_router(rental_router, prefix="/api/v1/rental", tags=["Rental"])

if _outstation_ok:
    app.include_router(outstation_router, prefix="/api/v1/outstation", tags=["Outstation"])

if _corporate_ok:
    app.include_router(corporate_router, prefix="/api/v1/corporate", tags=["Corporate"])

if _notification_ok:
    app.include_router(notification_router, prefix="/api/v1/notifications", tags=["Notification Center"])

# ── Common Job Contract — Master Core Architecture ────────────────────────────
try:
    from common.api import router as common_jobs_router, register_default_adapters
    register_default_adapters()
    app.include_router(common_jobs_router, prefix="/api/v1", tags=["Driver Jobs — Common Contract"])
    _common_jobs_ok = True
    print("[JOBS]     [OK] Common Job Contract (Ride + Parcel + Transport + Airport + Rental + Outstation adapters)")
except Exception as _e:
    _common_jobs_ok = False
    print(f"[JOBS]     [ERR] {_e}")


@app.get("/health")
async def health():
    return {
        "status":      "healthy",
        "auth":        _auth_ok,
        "booking":     _booking_ok,
        "matching":    _matching_ok,
        "payment":     _payment_ok,
        "admin":       _admin_ok,
        "analytics":   _analytics_ok,
        "parcel":      _parcel_ok,
        "hotel":       _hotel_ok,
        "transport":   _transport_ok,
        "rental":      _rental_ok,
        "outstation":  _outstation_ok,
        "corporate":   _corporate_ok,
        "common_jobs": _common_jobs_ok,
    }

@app.post("/payment-success")
async def payment_success(
    request: Request,
    booking_id: str,
):
    try:
        from app.services.razorpay_service import RazorpayService
        from common.database import async_session_maker
        
        form_data = await request.form()
        razorpay_payment_id = form_data.get("razorpay_payment_id")
        razorpay_order_id = form_data.get("razorpay_order_id")
        razorpay_signature = form_data.get("razorpay_signature")
        
        if razorpay_payment_id and razorpay_order_id and razorpay_signature:
            async with async_session_maker() as db:
                rp = RazorpayService(db)
                await rp.capture_payment(razorpay_order_id, razorpay_payment_id, razorpay_signature)
                
            html = """
            <html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;text-align:center;background:#f0f9ff;color:#0369a1;">
            <div>
                <h1 style="font-size:3rem;margin-bottom:10px;">âœ…</h1>
                <h2>Payment Successful!</h2>
                <p>Your payment has been captured.<br>You can safely close this window to return to the app.</p>
            </div>
            </body></html>
            """
            from fastapi.responses import HTMLResponse
            return HTMLResponse(content=html)
    except Exception as e:
        print(f"[PAYMENT CALLBACK ERR] {e}")
        pass
        
    html = """
    <html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;text-align:center;background:#fff1f2;color:#be123c;">
    <div>
        <h1 style="font-size:3rem;margin-bottom:10px;">âŒ</h1>
        <h2>Payment Failed</h2>
        <p>There was an issue processing your payment.<br>Please close this window and try again.</p>
    </div>
    </body></html>
    """
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)

@app.get("/api/v1/health")
async def api_health():
    return {"status": "healthy"}


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# Socket.IO WebSocket Gateway â€” Redis pub/sub â†’ Socket.IO rooms
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

# Declare at module scope so `global` inside nested functions resolves correctly
_redis_task_started = False

try:
    import socketio as _sio_lib
    import json as _json
    import asyncio as _asyncio
    import importlib
    import importlib.util  # must be explicit â€” `import importlib` doesn't load .util

    # Create Socket.IO async server
    sio = _sio_lib.AsyncServer(
        async_mode='asgi',
        cors_allowed_origins='*',
        logger=False,
        engineio_logger=False,
    )

    # Wrap FastAPI app with Socket.IO ASGI
    app = _sio_lib.ASGIApp(sio, other_asgi_app=app, socketio_path='/socket.io')

    # â”€â”€ Connection registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    _sid_to_user: dict = {}

    @sio.event
    async def connect(sid, environ, auth):
        print(f"[WS] Client connected: {sid}")
        await sio.emit('CONNECTED', {'message': 'Connected to CabBooking Gateway'}, room=sid)

    @sio.event
    async def disconnect(sid):
        _sid_to_user.pop(sid, None)
        print(f"[WS] Client disconnected: {sid}")

    # â”€â”€ Driver online / offline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    @sio.event
    async def DRIVER_ONLINE(sid, data):
        driver_id = data.get('driver_id', '')
        if driver_id and driver_id != 'unknown':
            room = f"driver:{driver_id}"
            await sio.enter_room(sid, room)
            _sid_to_user[sid] = {"role": "driver", "id": driver_id}
            print(f"[WS] Driver {driver_id} online â†’ room {room}")

    @sio.event
    async def DRIVER_OFFLINE(sid, data):
        driver_id = data.get('driver_id', '')
        if driver_id:
            await sio.leave_room(sid, f"driver:{driver_id}")

    # â”€â”€ Customer joins their personal notification room â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    @sio.event
    async def JOIN_CUSTOMER_ROOM(sid, data):
        customer_id = data.get('customer_id', '')
        if customer_id:
            room = f"customer:{customer_id}"
            await sio.enter_room(sid, room)
            _sid_to_user[sid] = {"role": "customer", "id": customer_id}
            print(f"[WS] Customer {customer_id} joined room {room}")

    # â”€â”€ Driver joins scan room for a specific trip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    @sio.event
    async def join_driver_scan(sid, data):
        trip_id = data.get('trip_id', '')
        if trip_id:
            room = f"driver_scan:{trip_id}"
            await sio.enter_room(sid, room)
            print(f"[WS] Driver joined scan room {room}")

    # â”€â”€ Customer joins trip tracking room (two name aliases) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    @sio.event
    async def join_trip_room(sid, data):
        trip_id = data.get('trip_id', '')
        if trip_id:
            await sio.enter_room(sid, f"trip:{trip_id}")

    @sio.event
    async def join_trip(sid, data):
        trip_id = data.get('trip_id', '')
        if trip_id:
            await sio.enter_room(sid, f"trip:{trip_id}")
            print(f"[WS] Customer joined trip room: trip:{trip_id}")

    @sio.event
    async def leave_trip(sid, data):
        trip_id = data.get('trip_id', '')
        if trip_id:
            await sio.leave_room(sid, f"trip:{trip_id}")

    # â”€â”€ GPS location update (driver â†’ persist + broadcast to trip room) â”€â”€â”€â”€â”€â”€
    @sio.event
    async def LOCATION_UPDATE(sid, data):
        trip_id = data.get('trip_id', '')
        if trip_id:
            await sio.emit('LOCATION_UPDATE', data, room=f"trip:{trip_id}", skip_sid=sid)
        try:
            from common.utils.redis_client import get_redis
            r = await get_redis()
            await r.publish("live:location:updates", _json.dumps({
                "trip_id":    trip_id or "",
                "driver_id":  data.get("driver_id", ""),
                "latitude":   data.get("lat", 0),
                "longitude":  data.get("lng", 0),
                "speed_kmh":  data.get("speed", 0),
                "heading":    data.get("heading", 0),
                "accuracy_m": data.get("accuracy", 0),
            }))
        except Exception as _e:
            print(f"[WS] LOCATION_UPDATE Redis publish error: {_e}")

    # â”€â”€ Heartbeat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    @sio.event
    async def heartbeat(sid, data):
        pass  # silently ack

    # â”€â”€ Customer GPS update â†’ corridor matching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    @sio.event
    async def CUSTOMER_LOCATION_UPDATE(sid, data):
        customer_id = data.get('customer_id', '')
        lat = data.get('lat', 0.0)
        lng = data.get('lng', 0.0)
        if not customer_id or not lat or not lng:
            return

        # 1. Publish to Redis for any external consumers
        try:
            from common.utils.redis_client import get_redis
            r = await get_redis()
            await r.publish('customer:location:updates', _json.dumps({
                'customer_id': customer_id,
                'lat': lat,
                'lng': lng,
            }))
        except Exception as _ce:
            print(f'[WS] CUSTOMER_LOCATION_UPDATE Redis publish error: {_ce}')

        # 2. Run corridor match as a non-blocking background task
        async def _run_corridor_match():
            try:
                from common.database import async_session_maker
                _ms_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'matching-service')
                _cm_file = os.path.join(_ms_path, 'app', 'services', 'corridor_matcher.py')
                _spec = importlib.util.spec_from_file_location('__gw_corridor_matcher', _cm_file)
                _mod = importlib.util.module_from_spec(_spec)
                if _ms_path not in sys.path:
                    sys.path.insert(0, _ms_path)
                _spec.loader.exec_module(_mod)
                CorridorMatchingService = _mod.CorridorMatchingService
                async with async_session_maker() as _db:
                    _svc = CorridorMatchingService(_db)
                    await _svc.update_customer_location(
                        customer_id=customer_id,
                        lat=lat,
                        lng=lng,
                    )
            except Exception as _ce2:
                print(f'[WS] Corridor match error: {_ce2}')

        _asyncio.ensure_future(_run_corridor_match())

    # â”€â”€ Driver booking response (accept/reject via WebSocket) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    @sio.event
    async def BOOKING_RESPONSE(sid, data):
        booking_id = data.get('booking_id', '')
        driver_id  = data.get('driver_id', '')
        accepted   = data.get('accepted', False)
        if booking_id and driver_id:
            try:
                from common.utils.redis_client import get_redis
                r = await get_redis()
                key = f"dispatch:response:{booking_id}:{driver_id}"
                await r.setex(key, 120, "accepted" if accepted else "rejected")
                print(f"[WS] Driver {driver_id} {'accepted' if accepted else 'rejected'} booking {booking_id}")
            except Exception as _e:
                print(f"[WS] BOOKING_RESPONSE error: {_e}")

    # â”€â”€ Redis pub/sub consumer â€” forward events to Socket.IO rooms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async def _redis_to_socketio():
        """
        Subscribe to all Redis event channels and forward messages
        to the correct Socket.IO rooms.  Runs as a long-lived background task.
        Reconnects automatically on Redis disconnect.
        """
        from common.utils.redis_client import get_redis

        while True:
            try:
                r = await get_redis()
                pubsub = r.pubsub()
                await pubsub.psubscribe(
                    "driver:*:events",
                    "customer:*:events",
                    "driver_scan:*",
                    "trip:*:events",
                    "notification:events",
                )
                await pubsub.subscribe("corridor:match")
                print("[WS] Redis pub/sub consumer started â€” forwarding to Socket.IO")

                async for message in pubsub.listen():
                    if message["type"] not in ("pmessage", "message"):
                        continue
                    try:
                        channel = message.get("channel", b"")
                        if isinstance(channel, bytes):
                            channel = channel.decode()
                        raw = message.get("data", b"")
                        if isinstance(raw, (bytes, bytearray)):
                            raw = raw.decode()
                        payload = _json.loads(raw)
                        event_name = payload.get("event", "EVENT")

                        # Route to the correct Socket.IO room
                        if channel.startswith("driver:") and channel.endswith(":events"):
                            driver_id = channel.split(":")[1]
                            room = f"driver:{driver_id}"
                            await sio.emit(event_name, payload, room=room)
                            print(f"[WSâ†’sio] {event_name} â†’ room {room}")

                        elif channel.startswith("customer:") and channel.endswith(":events"):
                            cid = channel.split(":")[1]
                            room = f"customer:{cid}"
                            await sio.emit(event_name, payload, room=room)
                            print(f"[WSâ†’sio] {event_name} â†’ room {room}")

                        elif channel.startswith("driver_scan:"):
                            trip_id = channel.replace("driver_scan:", "")
                            room = f"driver_scan:{trip_id}"
                            await sio.emit(event_name, payload, room=room)
                            print(f"[WSâ†’sio] {event_name} â†’ room {room}")

                        elif channel.startswith("trip:") and channel.endswith(":events"):
                            trip_id = channel.split(":")[1]
                            room = f"trip:{trip_id}"
                            await sio.emit(event_name, payload, room=room)

                    except Exception as _msg_err:
                        print(f"[WS] pub/sub message error: {_msg_err}")

            except Exception as _conn_err:
                print(f"[WS] Redis pub/sub disconnected: {_conn_err} â€” retrying in 3s")
                await _asyncio.sleep(3)

    # â”€â”€ Reliable startup: ASGI lifespan wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # sio.ASGIApp doesn't forward @app.on_event("startup"), so we wrap the
    # ASGI callable ourselves and start the Redis consumer on first startup.

    _original_app = app

    async def _lifespan_wrapper(scope, receive, send):
        global _redis_task_started
        if scope["type"] == "lifespan":
            async def _patched_receive():
                msg = await receive()
                if msg["type"] == "lifespan.startup" and not _redis_task_started:
                    _redis_task_started = True
                    _asyncio.ensure_future(_redis_to_socketio())
                    print("[WS] Redis consumer started via lifespan.startup")
                return msg
            await _original_app(scope, _patched_receive, send)
        else:
            # HTTP / WebSocket request â€” start consumer if not yet running
            if not _redis_task_started:
                _redis_task_started = True
                _asyncio.ensure_future(_redis_to_socketio())
                print("[WS] Redis consumer started via first request")
            await _original_app(scope, receive, send)

    app = _lifespan_wrapper
    print("[WS] Socket.IO gateway initialized âœ“")

except ImportError as _sio_err:
    print(f"[WS] python-socketio not installed: {_sio_err}")
    print("[WS] Install with: pip install python-socketio[asyncio_client] aioredis")
except Exception as _sio_init_err:
    print(f"[WS] Socket.IO init failed: {_sio_init_err}")
    import traceback
    traceback.print_exc()


    # ── Feature 8 & 9: Realtime Communication & Ride State Socket Events ──
    @sio.event
    async def join_ride_room(sid, data):
        ride_id = data.get('ride_id', '')
        if ride_id:
            room = f"ride:{ride_id}"
            await sio.enter_room(sid, room)
            print(f"[WS] Client {sid} joined ride room {room}")

    @sio.event
    async def leave_ride_room(sid, data):
        ride_id = data.get('ride_id', '')
        if ride_id:
            await sio.leave_room(sid, f"ride:{ride_id}")

    @sio.event
    async def SEND_CHAT_MESSAGE(sid, data):
        ride_id = data.get('ride_id', '')
        if ride_id:
            await sio.emit('communication:message', data, room=f"ride:{ride_id}", skip_sid=sid)

    @sio.event
    async def CHAT_MESSAGE_READ(sid, data):
        ride_id = data.get('ride_id', '')
        if ride_id:
            await sio.emit('communication:message_read', data, room=f"ride:{ride_id}", skip_sid=sid)

    @sio.event
    async def SHARE_CUSTOMER_LOCATION(sid, data):
        ride_id = data.get('ride_id', '')
        if ride_id:
            await sio.emit('communication:location_shared', data, room=f"ride:{ride_id}", skip_sid=sid)

    # ── Feature 10: During Ride Realtime Socket.IO Handlers ──
    @sio.event
    async def RIDE_LOCATION_UPDATE(sid, data):
        ride_id = data.get('ride_id', '')
        if ride_id:
            room = f"ride:{ride_id}"
            await sio.emit('ride:location', data, room=room, skip_sid=sid)

    @sio.event
    async def TRIGGER_RIDE_SOS(sid, data):
        ride_id = data.get('ride_id', '')
        if ride_id:
            room = f"ride:{ride_id}"
            await sio.emit('ride:sos', data, room=room)
            await sio.emit('emergency:alert', data, room="safety_monitoring")

    # ── Feature 15: Parcel Realtime Tracking & Socket Handlers ──
    @sio.event
    async def join_parcel_room(sid, data):
        parcel_id = data.get('parcel_id', '')
        if parcel_id:
            room = f"parcel:{parcel_id}"
            await sio.enter_room(sid, room)
            print(f"[WS] Client {sid} joined parcel room {room}")

    @sio.event
    async def leave_parcel_room(sid, data):
        parcel_id = data.get('parcel_id', '')
        if parcel_id:
            await sio.leave_room(sid, f"parcel:{parcel_id}")

    @sio.event
    async def PARCEL_LOCATION_UPDATE(sid, data):
        parcel_id = data.get('parcel_id', '')
        if parcel_id:
            room = f"parcel:{parcel_id}"
            await sio.emit('parcel:location', data, room=room, skip_sid=sid)
