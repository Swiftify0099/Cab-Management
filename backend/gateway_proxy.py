"""
Local API Gateway Proxy
=======================
A lightweight httpx-based reverse proxy that routes incoming requests
to the correct backend service by URL prefix — replacing the Nginx gateway
for local development on Windows (where Nginx + Docker aren't running).

Routing table (mirrors nginx.conf):
  /api/v1/auth/*         → http://localhost:8001
  /api/v1/profile/*      → http://localhost:8001
  /api/v1/driver/*       → http://localhost:8001
  /api/v1/admin/auth/*   → http://localhost:8001
  /api/v1/trips/*        → http://localhost:8002
  /api/v1/bookings/*     → http://localhost:8002
  /api/v1/addresses/*    → http://localhost:8002
  /api/v1/subscriptions/* → http://localhost:8002
  /api/v1/matching/*     → http://localhost:8003
  /api/v1/tracking/*     → http://localhost:8003
  /api/v1/payments/*     → http://localhost:8004
  /api/v1/wallet/*       → http://localhost:8004
  /api/v1/coupons/*      → http://localhost:8004
  /api/v1/referrals/*    → http://localhost:8004
  /api/v1/rewards/*      → http://localhost:8004
  /socket.io/*           → http://localhost:8010  (WebSocket gateway)
  /ws/*                  → http://localhost:8010
  /health                → inline 200 JSON

Runs on port 80 so the mobile app .env entry:
  EXPO_PUBLIC_API_URL=http://<YOUR_IP>:80/api/v1
  EXPO_PUBLIC_WS_URL=http://<YOUR_IP>:80
works exactly as it would in production behind Nginx.

Usage:
  python -m uvicorn gateway_proxy:app --host 0.0.0.0 --port 80 --reload
or via start_proxy.ps1
"""

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

app = FastAPI(title="Local Dev API Gateway", docs_url=None, redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Route table (ordered: most-specific first) ───────────────────────────────
ROUTES = [
    # Auth / Profile / Driver — port 8001
    ("/api/v1/auth",         "http://localhost:8001"),
    ("/api/v1/profile",      "http://localhost:8001"),
    ("/api/v1/driver",       "http://localhost:8001"),
    ("/api/v1/admin/auth",   "http://localhost:8001"),

    # Booking Service — port 8002
    ("/api/v1/trips",        "http://localhost:8002"),
    ("/api/v1/bookings",     "http://localhost:8002"),
    ("/api/v1/addresses",    "http://localhost:8002"),
    ("/api/v1/subscriptions","http://localhost:8002"),

    # Matching Service — port 8003
    ("/api/v1/rides",        "http://localhost:8003"),
    ("/api/v1/matching",     "http://localhost:8003"),
    ("/api/v1/tracking",     "http://localhost:8003"),
    ("/api/v1/safety",       "http://localhost:8003"),
    ("/api/v1/carpool",      "http://localhost:8003"),
    ("/api/v1/outstation",   "http://localhost:8003"),

    # Payment Service — port 8004
    ("/api/v1/payments",     "http://localhost:8004"),
    ("/api/v1/wallet",       "http://localhost:8004"),
    ("/api/v1/coupons",      "http://localhost:8004"),
    ("/api/v1/referrals",    "http://localhost:8004"),
    ("/api/v1/rewards",      "http://localhost:8004"),

    # Parcel — port 8005
    ("/api/v1/parcels",      "http://localhost:8005"),

    # Hotel — port 8006
    ("/api/v1/hotels",       "http://localhost:8006"),

    # Notifications — port 8007
    ("/api/v1/notifications","http://localhost:8007"),

    # Analytics / Admin — port 8008/8009
    ("/api/v1/analytics",    "http://localhost:8008"),
    ("/api/v1/admin",        "http://localhost:8009"),
    ("/api/v1/themes",       "http://localhost:8009"),

    # WebSocket gateway — port 8010
    ("/socket.io",           "http://localhost:8010"),
    ("/ws",                  "http://localhost:8010"),
]


def _resolve(path: str) -> str | None:
    for prefix, upstream in ROUTES:
        if path.startswith(prefix):
            return upstream
    return None


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "local-gateway"}


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy(request: Request, path: str):
    full_path = "/" + path
    upstream = _resolve(full_path)
    if upstream is None:
        return JSONResponse(
            status_code=404,
            content={"detail": f"No upstream configured for path: {full_path}"},
        )

    # Build the forwarded URL
    qs = request.url.query
    url = f"{upstream}{full_path}" + (f"?{qs}" if qs else "")

    # Forward headers (drop hop-by-hop)
    hop_by_hop = {
        "host", "connection", "keep-alive", "proxy-authenticate",
        "proxy-authorization", "te", "trailers", "transfer-encoding", "upgrade",
        "content-length",  # httpx sets this automatically
    }
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in hop_by_hop
    }

    body = await request.body()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            upstream_resp = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
                follow_redirects=True,
            )

        # Strip hop-by-hop from response too
        resp_headers = {
            k: v for k, v in upstream_resp.headers.items()
            if k.lower() not in {
                "connection", "keep-alive", "transfer-encoding",
                "te", "trailers", "proxy-authenticate", "proxy-authorization", "upgrade",
            }
        }

        return Response(
            content=upstream_resp.content,
            status_code=upstream_resp.status_code,
            headers=resp_headers,
        )
    except httpx.ConnectError as e:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "message": f"Upstream service unavailable: {upstream}",
                "detail": str(e),
            },
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Gateway error", "detail": str(e)},
        )
