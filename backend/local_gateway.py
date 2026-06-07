"""
CabBooking — Combined Local Dev Gateway  (port 8001 / 80)
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


# ─────────────────────────────────────────────────────────────────────────────
# Simpler approach: just prepend each service path and import normally,
# but use importlib.reload to switch context between services.
# ─────────────────────────────────────────────────────────────────────────────

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# ── 1. Load AUTH service routers ─────────────────────────────────────────────
_auth_path = os.path.join(_ROOT, "auth-service")
sys.path.insert(0, _auth_path)
sys.path.insert(0, os.path.join(_ROOT, "common"))
sys.path.insert(0, _ROOT)

try:
    from app.api.v1 import auth_router, admin_auth_router, profile_router, driver_router
    _auth_ok = True
    print("[AUTH]    [OK] auth / profile / driver")
except Exception as _e:
    _auth_ok = False
    print(f"[AUTH]    [ERR] {_e}")

# Snapshot auth app modules, remove from sys.modules before loading next service
_auth_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in _auth_mods:
    del sys.modules[k]
sys.path.remove(_auth_path)


# ── 2. Load BOOKING service routers ──────────────────────────────────────────
_booking_path = os.path.join(_ROOT, "booking-service")
sys.path.insert(0, _booking_path)

try:
    from app.api.v1 import booking_router, fare_router, trip_router
    from app.api.v1.subscriptions import router as subscription_router
    _booking_ok = True
    print("[BOOKING] [OK] trips / bookings / fare / subscriptions")
except Exception as _e:
    _booking_ok = False
    print(f"[BOOKING] [ERR] {_e}")

_booking_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in _booking_mods:
    del sys.modules[k]
sys.path.remove(_booking_path)


# ── 3. Load MATCHING service routers ─────────────────────────────────────────
_matching_path = os.path.join(_ROOT, "matching-service")
sys.path.insert(0, _matching_path)

try:
    from app.api.v1.matching import router as matching_router
    # Eagerly import corridor_matcher NOW while matching-service path is active,
    # so it gets cached in sys.modules before the auth path is restored below.
    # Without this, the lazy import inside get_corridor_customers() fails at
    # request-time because 'app' then resolves to auth-service's namespace.
    from app.services.corridor_matcher import CorridorMatchingService as _CMSCheck
    _matching_ok = True
    print("[MATCHING] [OK] matching + corridor_matcher")
except Exception as _e:
    _matching_ok = False
    print(f"[MATCHING] [ERR] {_e}")

# Snapshot matching modules so they survive the auth-module restore below
_matching_mods = {k: v for k, v in sys.modules.items() if k == "app" or k.startswith("app.")}
for k in list(sys.modules.keys()):
    if k == "app" or k.startswith("app."):
        del sys.modules[k]
# ── 4. Load PAYMENT service router ─────────────────────────────────────────
_payment_path = os.path.join(_ROOT, "payment-service")
sys.path.insert(0, _payment_path)
# Load the payment-service .env so Razorpay keys are visible
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

# Restore auth + matching modules
sys.path.insert(0, _auth_path)
sys.modules.update(_auth_mods)
sys.modules.update(_matching_mods)
sys.modules.update(_payment_mods)


# ── 5. Build FastAPI app ───────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n[LOCAL-GATEWAY] Running on port 8001 — auth + booking + matching + payment\n")
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

if _booking_ok:
    app.include_router(trip_router,          prefix="/api/v1/trips",         tags=["Trips"])
    app.include_router(booking_router,       prefix="/api/v1/bookings",      tags=["Bookings"])
    app.include_router(fare_router,          prefix="/api/v1/bookings/fare", tags=["Fare"])
    app.include_router(subscription_router)

if _matching_ok:
    app.include_router(matching_router, prefix="/api/v1/matching", tags=["Matching"])

if _payment_ok:
    app.include_router(payment_router, prefix="/api/v1", tags=["Payment"])


@app.get("/health")
async def health():
    return {
        "status":   "healthy",
        "auth":     _auth_ok,
        "booking":  _booking_ok,
        "matching": _matching_ok,
        "payment":  _payment_ok,
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
                <h1 style="font-size:3rem;margin-bottom:10px;">✅</h1>
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
        <h1 style="font-size:3rem;margin-bottom:10px;">❌</h1>
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
