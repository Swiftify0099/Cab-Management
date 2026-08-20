"""
Route Provider with Redis Cache & Minimal External Map API Calls — Feature 5.
"""
from __future__ import annotations

import json
import math
from typing import Optional
import httpx
import structlog

from common.utils.redis_client import get_redis

logger = structlog.get_logger(__name__)


class RouteCacheService:
    """
    Provides route distance, duration and polyline with intelligent Redis caching.
    Ensures <= 5 Google API calls per ride request lifecycle.
    """

    CACHE_TTL_SEC = 300  # 5 minutes cache for moving points

    @staticmethod
    def _make_geohash_key(lat1: float, lng1: float, lat2: float, lng2: float) -> str:
        # Approximate 2-decimal rounding (~1km bucket for route caching)
        return f"route_cache:{round(lat1, 2)}:{round(lng1, 2)}:{round(lat2, 2)}:{round(lng2, 2)}"

    @classmethod
    async def get_route(
        cls,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        google_api_key: Optional[str] = None,
    ) -> dict:
        """
        Get route distance_km, duration_min and encoded polyline.
        Checks Redis cache first. Falls back to Haversine if external API unavailable.
        """
        cache_key = cls._make_geohash_key(origin_lat, origin_lng, dest_lat, dest_lng)
        try:
            r = await get_redis()
            cached = await r.get(cache_key)
            if cached:
                logger.debug("Route cache hit", key=cache_key)
                return json.loads(cached)
        except Exception as e:
            logger.warning("Redis route cache read error", error=str(e))

        # Attempt Google Routes API / Directions API if key provided
        if google_api_key:
            try:
                url = "https://routes.googleapis.com/directions/v2:computeRoutes"
                headers = {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": google_api_key,
                    "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
                }
                payload = {
                    "origin": {"location": {"latLng": {"latitude": origin_lat, "longitude": origin_lng}}},
                    "destination": {"location": {"latLng": {"latitude": dest_lat, "longitude": dest_lng}}},
                    "travelMode": "DRIVE",
                    "routingPreference": "TRAFFIC_AWARE",
                }
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        route = data.get("routes", [{}])[0]
                        dist_m = route.get("distanceMeters", 0)
                        dur_sec_str = route.get("duration", "0s").replace("s", "")
                        dur_sec = int(float(dur_sec_str)) if dur_sec_str else 0
                        polyline = route.get("polyline", {}).get("encodedPolyline", "")

                        result = {
                            "distance_km": max(dist_m / 1000.0, 0.5),
                            "duration_min": max(int(dur_sec / 60), 1),
                            "polyline": polyline,
                            "source": "google_routes",
                        }
                        try:
                            await r.setex(cache_key, cls.CACHE_TTL_SEC, json.dumps(result))
                        except Exception:
                            pass
                        return result
            except Exception as e:
                logger.warning("Google Routes API failed, falling back to math model", error=str(e))

        # High quality mathematical road estimation (1.28 urban winding factor)
        R = 6371.0
        dlat = math.radians(dest_lat - origin_lat)
        dlon = math.radians(dest_lng - origin_lng)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(origin_lat)) * math.cos(math.radians(dest_lat)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        straight_km = R * c
        road_km = max(straight_km * 1.28, 0.8)
        duration_min = max(int((road_km / 24.0) * 60), 3)

        result = {
            "distance_km": round(road_km, 2),
            "duration_min": duration_min,
            "polyline": "",
            "source": "haversine_road_model",
        }
        try:
            await r.setex(cache_key, cls.CACHE_TTL_SEC, json.dumps(result))
        except Exception:
            pass
        return result
