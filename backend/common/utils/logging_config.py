"""
Structured Logging Configuration  Phase 10.
Uses structlog with JSON output for production, pretty output for dev.
Includes trace ID propagation via request context.
"""
from __future__ import annotations

import logging
import sys
import uuid
from contextvars import ContextVar

import structlog
from fastapi import Request

#  Context variable for trace ID 

_trace_id: ContextVar[str] = ContextVar("trace_id", default="")


def get_trace_id() -> str:
    return _trace_id.get() or "-"


def set_trace_id(trace_id: str) -> None:
    _trace_id.set(trace_id)


#  Structlog processors 

def add_trace_id(logger, method, event_dict):
    """Inject current trace ID into every log record."""
    event_dict["trace_id"] = get_trace_id()
    return event_dict


def add_service_name(service: str):
    """Factory: returns a structlog processor that adds service name."""
    def processor(logger, method, event_dict):
        event_dict["service"] = service
        return event_dict
    return processor


#  Setup function 

def setup_logging(service_name: str, level: str = "INFO", json_output: bool = True) -> None:
    """
    Configure structlog for a FastAPI service.
    Call once at service startup.

    Args:
        service_name: e.g. "booking-service"
        level: "DEBUG" | "INFO" | "WARNING" | "ERROR"
        json_output: True for production (JSON), False for dev (pretty)
    """
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        add_trace_id,
        add_service_name(service_name),
        structlog.processors.StackInfoRenderer(),
    ]

    if json_output:
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=shared_processors + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processor=renderer,
        foreign_pre_chain=shared_processors,
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(level.upper())

    # Silence noisy third-party loggers
    for noisy in ["uvicorn.access", "sqlalchemy.engine", "httpx"]:
        logging.getLogger(noisy).setLevel(logging.WARNING)


#  FastAPI middleware for trace ID 

async def trace_id_middleware(request: Request, call_next):
    """
    Middleware: extract X-Trace-ID header or generate a new one.
    Injects into structlog context for the duration of the request.
    """
    trace_id = request.headers.get("X-Trace-ID") or str(uuid.uuid4())[:8]
    set_trace_id(trace_id)
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        trace_id=trace_id,
        method=request.method,
        path=request.url.path,
    )
    response = await call_next(request)
    response.headers["X-Trace-ID"] = trace_id
    return response
