"""
Prometheus Metrics Middleware — Phase 10.
Attaches to all FastAPI services. Exports /metrics endpoint.
Tracks: request count, latency, active connections.
"""
from __future__ import annotations

import time
from typing import Callable

from fastapi import FastAPI, Request, Response
from prometheus_client import (
    Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST,
    CollectorRegistry,
)

# ─── Metric definitions ────────────────────────────────────────────────────────

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status_code", "service"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path", "service"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

ACTIVE_REQUESTS = Gauge(
    "http_active_requests",
    "Currently active HTTP requests",
    ["service"],
)

DB_QUERY_COUNT = Counter(
    "db_queries_total",
    "Total database queries",
    ["service", "query_type"],
)

BOOKING_EVENTS = Counter(
    "booking_events_total",
    "Booking lifecycle events",
    ["event_type", "service"],
)

WS_CONNECTIONS = Gauge(
    "websocket_active_connections",
    "Active WebSocket connections",
)


# ─── Middleware ────────────────────────────────────────────────────────────────

def add_prometheus_middleware(app: FastAPI, service_name: str) -> None:
    """
    Attach Prometheus metrics middleware and /metrics endpoint to a FastAPI app.
    Call this in each service's main.py after creating the app.
    """
    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next: Callable) -> Response:
        # Skip metrics endpoint itself
        if request.url.path == "/metrics":
            return await call_next(request)

        path = _normalize_path(request.url.path)
        method = request.method

        ACTIVE_REQUESTS.labels(service=service_name).inc()
        start = time.perf_counter()

        try:
            response = await call_next(request)
            status = str(response.status_code)
        except Exception:
            status = "500"
            raise
        finally:
            duration = time.perf_counter() - start
            REQUEST_COUNT.labels(method=method, path=path, status_code=status, service=service_name).inc()
            REQUEST_LATENCY.labels(method=method, path=path, service=service_name).observe(duration)
            ACTIVE_REQUESTS.labels(service=service_name).dec()

        return response

    @app.get("/metrics", include_in_schema=False, tags=["Monitoring"])
    async def metrics():
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


def _normalize_path(path: str) -> str:
    """
    Normalize dynamic path segments to avoid high-cardinality labels.
    e.g. /api/v1/trips/abc123 → /api/v1/trips/{id}
    """
    parts = path.split("/")
    normalized = []
    for part in parts:
        # UUID or numeric ID → replace with placeholder
        if len(part) > 8 and (part.replace("-", "").isalnum() or part.isnumeric()):
            normalized.append("{id}")
        else:
            normalized.append(part)
    return "/".join(normalized)


# ─── Business metric helpers ──────────────────────────────────────────────────

def track_booking_event(event_type: str, service: str = "booking-service") -> None:
    """Call this when booking lifecycle events occur."""
    BOOKING_EVENTS.labels(event_type=event_type, service=service).inc()


def track_db_query(query_type: str = "select", service: str = "unknown") -> None:
    """Increment DB query counter."""
    DB_QUERY_COUNT.labels(service=service, query_type=query_type).inc()
