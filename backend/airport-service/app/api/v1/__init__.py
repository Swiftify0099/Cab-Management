# airport-service api v1
from app.api.v1.airport import router as airport_router, flight_router

__all__ = ["airport_router", "flight_router"]
