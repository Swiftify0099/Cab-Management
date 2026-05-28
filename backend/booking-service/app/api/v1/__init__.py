"""
Booking Service API v1  Phase 3 Routers
"""
from app.api.v1.booking import booking_router, fare_router
from app.api.v1.trips import trip_router

__all__ = ["booking_router", "fare_router", "trip_router"]
