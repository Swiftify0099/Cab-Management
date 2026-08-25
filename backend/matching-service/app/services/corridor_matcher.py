"""
Corridor Matching Service — PostGIS Polygon + 3 KM Route Buffer.

Replaces simple point-radius matching with a three-condition eligibility check:

  Condition 1: Customer pickup location  ST_Within  trip.pickup_polygon
  Condition 2: Customer destination      ST_Within  trip.destination_polygon
  Condition 3: Customer current GPS      ST_Within  trip.route_buffer   (3 KM corridor)

All three must pass for a customer to be considered eligible.

If a trip has no polygons drawn yet (driver skipped polygon drawing),
the service falls back to the legacy 5 KM point-radius match.

Additional methods:
  store_trip_route()    — decode polyline → PostGIS LINESTRING → ST_Buffer(3000 m)
  store_trip_polygons() — convert [{lat,lng}] lists → WKT POLYGON → DB
  find_corridor_customers() — live customers inside corridor (for driver map)
  update_customer_location()— upsert customer GPS, check corridor membership
"""
from __future__ import annotations

import json
import uuid
from typing import Optional

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Trip, TripStatus,
    TripPolygons, TripRouteGeometry, CustomerLocation,
    PendingBooking, PendingBookingStatus,
    Driver,
)
from common.utils.redis_client import get_redis, publish_event

logger = structlog.get_logger(__name__)

# Buffer radius in metres — 3 KM around the route
ROUTE_BUFFER_M = 3000


# ─── Polyline decoder (no external deps) ──────────────────────────────────────

def _decode_polyline(encoded: str) -> list[tuple[float, float]]:
    """
    Decode a Google Encoded Polyline string into a list of (lat, lng) tuples.
    Pure Python — no extra dependencies needed.
    """
    index = 0
    result: list[tuple[float, float]] = []
    lat = 0
    lng = 0

    while index < len(encoded):
        shift, result_val = 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result_val |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result_val >> 1) if result_val & 1 else result_val >> 1
        lat += dlat

        shift, result_val = 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result_val |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result_val >> 1) if result_val & 1 else result_val >> 1
        lng += dlng

        result.append((lat / 1e5, lng / 1e5))

    return result


def _coords_to_linestring_wkt(coords: list[tuple[float, float]]) -> str:
    """Convert [(lat,lng), ...] to PostGIS LINESTRING WKT (note: WKT uses lng lat order)."""
    pts = ", ".join(f"{lng} {lat}" for lat, lng in coords)
    return f"LINESTRING({pts})"


def _polygon_coords_to_wkt(coords: list[dict]) -> str:
    """
    Convert a list of {lat, lng} dicts to a PostGIS POLYGON WKT.
    Automatically closes the ring if needed.
    """
    if not coords:
        raise ValueError("Polygon must have at least 3 points")
    points = [(c["lng"], c["lat"]) for c in coords]
    # Close the ring
    if points[0] != points[-1]:
        points.append(points[0])
    if len(points) < 4:
        raise ValueError("Polygon must have at least 3 distinct points")
    pts_str = ", ".join(f"{lng} {lat}" for lng, lat in points)
    return f"POLYGON(({pts_str}))"


# ─── Service ──────────────────────────────────────────────────────────────────

class CorridorMatchingService:
    """PostGIS-powered polygon + route corridor matching engine."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Store route geometry + build 3 KM buffer
    # ──────────────────────────────────────────────────────────────────────────

    async def store_trip_route(
        self,
        trip_id: str,
        encoded_polyline: str,
        distance_km: Optional[float] = None,
        duration_minutes: Optional[int] = None,
    ) -> None:
        """
        Decode the Google Directions encoded polyline, store it as a PostGIS
        LINESTRING, and automatically compute the 3 KM route corridor buffer.

        If a row already exists for this trip_id it is replaced (upsert).
        """
        coords = _decode_polyline(encoded_polyline)
        if len(coords) < 2:
            logger.warning("store_trip_route: polyline has < 2 points", trip_id=trip_id)
            return

        linestring_wkt = _coords_to_linestring_wkt(coords)
        trip_uuid = uuid.UUID(trip_id)

        # Upsert: delete any existing row for this trip_id first, then insert
        await self.db.execute(text("DELETE FROM trip_route_geometry WHERE trip_id = :trip_id"), {"trip_id": str(trip_uuid)})
        await self.db.execute(text("""
            INSERT INTO trip_route_geometry
                (id, trip_id, route_linestring, route_buffer,
                 encoded_polyline, distance_km, duration_minutes,
                 created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                :trip_id,
                ST_GeomFromText(:linestring_wkt, 4326),
                ST_Buffer(
                    ST_GeomFromText(:linestring_wkt, 4326)::geography,
                    :buffer_m
                )::geometry,
                :encoded_polyline,
                :distance_km,
                :duration_minutes,
                NOW(), NOW()
            )
        """), {
            "trip_id":          str(trip_uuid),
            "linestring_wkt":   linestring_wkt,
            "buffer_m":         ROUTE_BUFFER_M,
            "encoded_polyline": encoded_polyline,
            "distance_km":      distance_km,
            "duration_minutes": duration_minutes,
        })
        await self.db.commit()

        logger.info(
            "Route geometry stored",
            trip_id=trip_id,
            points=len(coords),
            buffer_m=ROUTE_BUFFER_M,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Store driver-drawn polygons
    # ──────────────────────────────────────────────────────────────────────────

    async def store_trip_polygons(
        self,
        trip_id: str,
        pickup_polygon_coords: list[dict],     # [{lat, lng}, ...]
        destination_polygon_coords: list[dict], # [{lat, lng}, ...]
    ) -> None:
        """
        Store driver-drawn pickup and destination service area polygons.
        Upserts — replaces existing row for this trip if present.
        """
        pickup_wkt = _polygon_coords_to_wkt(pickup_polygon_coords)
        dest_wkt   = _polygon_coords_to_wkt(destination_polygon_coords)

        await self.db.execute(text("DELETE FROM trip_polygons WHERE trip_id = :trip_id"), {"trip_id": str(trip_id)})
        await self.db.execute(text("""
            INSERT INTO trip_polygons
                (id, trip_id, pickup_polygon, destination_polygon, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                :trip_id,
                ST_GeomFromText(:pickup_wkt, 4326),
                ST_GeomFromText(:dest_wkt, 4326),
                NOW(), NOW()
            )
        """), {
            "trip_id":     trip_id,
            "pickup_wkt":  pickup_wkt,
            "dest_wkt":    dest_wkt,
        })
        await self.db.commit()

        logger.info("Trip polygons stored", trip_id=trip_id)

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Corridor match — pending_bookings against a specific trip
    # ──────────────────────────────────────────────────────────────────────────

    async def match_corridor(self, trip_id: str) -> list[dict]:
        """
        Three-condition corridor match for pending_bookings vs a specific trip.

        If the trip has polygons + route buffer → use full ST_Within logic.
        If only route buffer (no polygons) → use buffer + 5 km point-radius.
        If nothing at all → return [] (caller should use legacy radius match).

        Returns list of matched booking dicts ready for MATCH_FOUND emission.
        """
        trip_uuid = uuid.UUID(trip_id)

        # Check what geometry exists for this trip
        poly_res = await self.db.execute(
            select(TripPolygons).where(TripPolygons.trip_id == trip_uuid)
        )
        poly = poly_res.scalar_one_or_none()

        buf_res = await self.db.execute(
            select(TripRouteGeometry).where(TripRouteGeometry.trip_id == trip_uuid)
        )
        route_geo = buf_res.scalar_one_or_none()

        if not poly and not route_geo:
            return []  # Caller will use legacy radius match

        trip_res = await self.db.execute(select(Trip).where(Trip.id == trip_uuid))
        trip = trip_res.scalar_one_or_none()
        if not trip:
            return []

        driver_res = await self.db.execute(
            select(Driver).where(Driver.id == trip.driver_id)
        )
        driver = driver_res.scalar_one_or_none()
        driver_name = driver.full_name if driver else "Driver"

        # Build the WHERE clause dynamically based on what geometry exists
        if poly and poly.pickup_polygon and poly.destination_polygon and route_geo and route_geo.route_buffer:
            # Full three-condition match (production standard)
            where_geo = """
                AND ST_Within(
                    ST_MakePoint(pb.pickup_lng, pb.pickup_lat)::geometry,
                    (SELECT pickup_polygon FROM trip_polygons WHERE trip_id = :trip_id)
                )
                AND ST_Within(
                    ST_MakePoint(pb.destination_lng, pb.destination_lat)::geometry,
                    (SELECT destination_polygon FROM trip_polygons WHERE trip_id = :trip_id)
                )
                AND (
                    -- current location in corridor (if customer has sent GPS)
                    NOT EXISTS (SELECT 1 FROM customer_locations WHERE customer_id = pb.customer_id)
                    OR ST_Within(
                        (SELECT location::geometry FROM customer_locations WHERE customer_id = pb.customer_id),
                        (SELECT route_buffer FROM trip_route_geometry WHERE trip_id = :trip_id)
                    )
                )
            """
        elif route_geo and route_geo.route_buffer:
            # Buffer-only match: pickup + destination within 5 km of trip endpoints
            where_geo = """
                AND ST_Distance(
                    pb.pickup_location::geography,
                    ST_MakePoint(:trip_lng, :trip_lat)::geography
                ) <= 5000
                AND ST_Distance(
                    pb.destination_location::geography,
                    ST_MakePoint(:dest_lng, :dest_lat)::geography
                ) <= 5000
            """
        else:
            return []  # Only polygons, no buffer yet — skip

        sql = text(f"""
            SELECT
                pb.id::text              AS booking_id,
                pb.customer_id           AS customer_id,
                pb.customer_name         AS customer_name,
                pb.pickup_address        AS pickup_address,
                pb.destination_address   AS destination_address,
                pb.seats_required        AS seats_required,
                pb.parcel                AS parcel,
                pb.from_time             AS from_time,
                pb.to_time               AS to_time,
                pb.women_only            AS women_only,
                ST_Distance(
                    pb.pickup_location::geography,
                    ST_MakePoint(:trip_lng, :trip_lat)::geography
                ) AS pickup_dist_m,
                ST_Distance(
                    pb.destination_location::geography,
                    ST_MakePoint(:dest_lng, :dest_lat)::geography
                ) AS dest_dist_m,
                COALESCE(
                    (SELECT ST_Distance(
                        cl.location::geography,
                        ST_MakePoint(:trip_lng, :trip_lat)::geography
                    ) FROM customer_locations cl WHERE cl.customer_id = pb.customer_id),
                    NULL
                ) AS corridor_dist_m
            FROM pending_bookings pb
            WHERE
                pb.status = 'waiting'
                AND pb.expires_at > NOW()
                AND pb.travel_date = :travel_date
                AND pb.seats_required <= :available_seats
                AND (
                    (:trip_women_only = FALSE) OR (pb.women_only = TRUE)
                )
                AND (
                    (pb.women_only = FALSE) OR (:trip_women_only = TRUE)
                )
                {where_geo}
            ORDER BY pickup_dist_m ASC
            LIMIT 50
        """)

        result = await self.db.execute(sql, {
            "trip_id":         str(trip_id),
            "trip_lat":        trip.pickup_latitude,
            "trip_lng":        trip.pickup_longitude,
            "dest_lat":        trip.destination_latitude,
            "dest_lng":        trip.destination_longitude,
            "travel_date":     trip.departure_time.date(),
            "available_seats": trip.available_seats,
            "trip_women_only": trip.women_only,
        })
        rows = result.mappings().all()
        matched = []

        for row in rows:
            customer_id = str(row["customer_id"])
            payload = {
                "event":                       "MATCH_FOUND",
                "trip_id":                     trip_id,
                "driver_name":                 driver_name,
                "vehicle_type":                trip.vehicle_type,
                "available_seats":             trip.available_seats,
                "departure_time":              trip.departure_time.isoformat(),
                "pickup_address":              "Pickup Location",
                "destination_address":         "Destination",
                "pickup_distance_meters":      float(row["pickup_dist_m"]),
                "destination_distance_meters": float(row["dest_dist_m"]),
                "booking_id":                  row["booking_id"],
                "women_only":                  trip.women_only,
                "matched_via":                 "corridor",
            }
            await publish_event(f"customer:{customer_id}:events", payload)
            matched.append(dict(row))
            logger.info("CORRIDOR MATCH_FOUND", customer_id=customer_id, trip_id=trip_id)

        return matched

    # ──────────────────────────────────────────────────────────────────────────
    # 4. Find all live customers currently inside a trip's corridor
    # ──────────────────────────────────────────────────────────────────────────

    async def find_corridor_customers(self, trip_id: str) -> list[dict]:
        """
        Returns live customers whose current GPS is inside the trip's 3 KM
        route corridor. Used by the driver map to show customer markers.

        Also returns customers whose pending_booking pickup/destination is
        within the pickup/destination polygons (pre-booked intent matching).
        """
        trip_uuid = uuid.UUID(trip_id)

        # Check route buffer exists
        buf_res = await self.db.execute(
            select(TripRouteGeometry).where(TripRouteGeometry.trip_id == trip_uuid)
        )
        route_geo = buf_res.scalar_one_or_none()
        if not route_geo or not route_geo.route_buffer:
            return []

        poly_res = await self.db.execute(
            select(TripPolygons).where(TripPolygons.trip_id == trip_uuid)
        )
        poly = poly_res.scalar_one_or_none()

        trip_res = await self.db.execute(select(Trip).where(Trip.id == trip_uuid))
        trip = trip_res.scalar_one_or_none()
        if not trip:
            return []

        # Build query based on polygon availability
        polygon_conditions = ""
        if poly and poly.pickup_polygon and poly.destination_polygon:
            polygon_conditions = """
                AND ST_Within(
                    ST_MakePoint(pb.pickup_lng, pb.pickup_lat)::geometry,
                    tp.pickup_polygon
                )
                AND ST_Within(
                    ST_MakePoint(pb.destination_lng, pb.destination_lat)::geometry,
                    tp.destination_polygon
                )
            """

        sql = text(f"""
            SELECT DISTINCT ON (pb.id)
                pb.id::text              AS booking_id,
                pb.customer_name         AS customer_name,
                pb.pickup_address        AS pickup_address,
                pb.pickup_lat            AS pickup_lat,
                pb.pickup_lng            AS pickup_lng,
                pb.destination_address   AS destination_address,
                pb.destination_lat       AS destination_lat,
                pb.destination_lng       AS destination_lng,
                pb.seats_required        AS seats_required,
                pb.parcel                AS parcel,
                pb.from_time             AS from_time,
                pb.to_time               AS to_time,
                pb.women_only            AS women_only,
                ST_Distance(
                    pb.pickup_location::geography,
                    ST_MakePoint(:trip_lng, :trip_lat)::geography
                ) AS pickup_dist_m,
                ST_Distance(
                    pb.destination_location::geography,
                    ST_MakePoint(:dest_lng, :dest_lat)::geography
                ) AS dest_dist_m,
                -- distance of customer's current GPS from the route LINESTRING
                COALESCE(
                    ST_Distance(
                        cl.location::geography,
                        trg.route_linestring::geography
                    ),
                    ST_Distance(
                        pb.pickup_location::geography,
                        ST_MakePoint(:trip_lng, :trip_lat)::geography
                    )
                ) AS route_distance_m
            FROM pending_bookings pb
            JOIN trip_route_geometry trg ON trg.trip_id = :trip_id
            LEFT JOIN trip_polygons tp ON tp.trip_id = :trip_id
            LEFT JOIN customer_locations cl ON cl.customer_id = pb.customer_id
            WHERE
                pb.status = 'waiting'
                AND pb.expires_at > NOW()
                AND pb.travel_date = :travel_date
                AND pb.seats_required <= :available_seats
                AND (
                    (:trip_women_only = FALSE) OR (pb.women_only = TRUE)
                )
                AND (
                    (pb.women_only = FALSE) OR (:trip_women_only = TRUE)
                )
                AND (
                    -- Customer's current location is in corridor OR has no location yet
                    cl.customer_id IS NULL
                    OR ST_Within(cl.location::geometry, trg.route_buffer)
                )
                {polygon_conditions}
            ORDER BY pb.id, pickup_dist_m ASC
        """)

        result = await self.db.execute(sql, {
            "trip_id":         str(trip_uuid),
            "trip_lat":        trip.pickup_latitude,
            "trip_lng":        trip.pickup_longitude,
            "dest_lat":        trip.destination_latitude,
            "dest_lng":        trip.destination_longitude,
            "travel_date":     trip.departure_time.date(),
            "available_seats": trip.available_seats,
            "trip_women_only": trip.women_only,
        })
        rows = result.mappings().all()

        return [
            {
                "booking_id":            row["booking_id"],
                "customer_name":         row["customer_name"],
                "pickup_address":        row["pickup_address"],
                "pickup_lat":            float(row["pickup_lat"]),
                "pickup_lng":            float(row["pickup_lng"]),
                "destination_address":   row["destination_address"],
                "destination_lat":       float(row["destination_lat"]),
                "destination_lng":       float(row["destination_lng"]),
                "seats_required":        row["seats_required"],
                "parcel":                row["parcel"],
                "from_time":             str(row["from_time"]),
                "to_time":               str(row["to_time"]),
                "women_only":            row["women_only"],
                "pickup_distance_km":    round(float(row["pickup_dist_m"]) / 1000, 2),
                "destination_distance_km": round(float(row["dest_dist_m"]) / 1000, 2),
                "route_distance_km":     round(float(row["route_distance_m"]) / 1000, 2)
                    if row["route_distance_m"] else None,
            }
            for row in rows
        ]

    # ──────────────────────────────────────────────────────────────────────────
    # 5. Update customer location + check corridor membership
    # ──────────────────────────────────────────────────────────────────────────

    async def update_customer_location(
        self,
        customer_id: str,
        lat: float,
        lng: float,
    ) -> None:
        """
        Upsert customer GPS into customer_locations, then scan all active
        trip route corridors.  If the customer enters a corridor, publish
        CUSTOMER_ENTERED_CORRIDOR to all matching drivers and MATCH_FOUND
        to the customer.

        Uses a Redis flag (TTL 5 min) to avoid spamming events every update.
        """
        customer_uuid = uuid.UUID(customer_id)

        # Upsert customer location: delete any existing row first, then insert
        await self.db.execute(text("DELETE FROM customer_locations WHERE customer_id = :customer_id"), {"customer_id": str(customer_uuid)})
        await self.db.execute(text("""
            INSERT INTO customer_locations
                (id, customer_id, location, lat, lng, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                :customer_id,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                :lat, :lng, NOW(), NOW()
            )
        """), {"customer_id": str(customer_uuid), "lat": lat, "lng": lng})
        await self.db.commit()

        # Cache in Redis for fast reads
        r = await get_redis()
        await r.setex(
            f"customer:location:{customer_id}",
            60,
            json.dumps({"lat": lat, "lng": lng}),
        )

        # Find all published trips whose corridor contains this customer
        sql = text("""
            SELECT
                t.id::text          AS trip_id,
                t.driver_id::text   AS driver_id,
                d.user_id::text     AS driver_user_id,
                d.full_name         AS driver_name,
                t.pickup_latitude   AS pickup_lat,
                t.destination_latitude AS destination_lat,
                t.departure_time    AS departure_time,
                t.available_seats   AS available_seats,
                t.vehicle_type      AS vehicle_type,
                t.women_only        AS women_only,
                ST_Distance(
                    ST_MakePoint(:lng, :lat)::geography,
                    t.pickup_location::geography
                ) AS dist_from_pickup_m,
                ST_Distance(
                    ST_MakePoint(:lng, :lat)::geography,
                    trg.route_linestring::geography
                ) AS dist_from_route_m
            FROM trips t
            JOIN trip_route_geometry trg ON trg.trip_id = t.id
            JOIN drivers d ON d.id = t.driver_id
            WHERE
                t.status = 'published'
                AND t.available_seats > 0
                AND ST_Within(
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geometry,
                    trg.route_buffer
                )
        """)

        result = await self.db.execute(sql, {"lat": lat, "lng": lng})
        trips_in_corridor = result.mappings().all()

        for trip_row in trips_in_corridor:
            trip_id     = trip_row["trip_id"]
            driver_user = trip_row["driver_user_id"]

            # Redis flag prevents spamming — one ENTERED event per 5 minutes
            redis_key = f"corridor:entered:{customer_id}:{trip_id}"
            already_notified = await r.exists(redis_key)
            if already_notified:
                continue

            await r.setex(redis_key, 300, "1")  # 5 min TTL

            # Notify driver that a new customer is in their corridor
            corridor_payload = {
                "event":            "CUSTOMER_ENTERED_CORRIDOR",
                "trip_id":          trip_id,
                "customer_id":      customer_id,
                "lat":              lat,
                "lng":              lng,
                "dist_from_route_m": float(trip_row["dist_from_route_m"])
                    if trip_row["dist_from_route_m"] is not None else None,
            }
            await publish_event(f"driver:{driver_user}:events", corridor_payload)

            # Also emit MATCH_FOUND to the customer themselves
            match_payload = {
                "event":              "MATCH_FOUND",
                "trip_id":            trip_id,
                "driver_name":        trip_row["driver_name"],
                "vehicle_type":       trip_row["vehicle_type"],
                "available_seats":    trip_row["available_seats"],
                "departure_time":     trip_row["departure_time"].isoformat(),
                "pickup_address":     "Pickup Point",
                "destination_address": "Drop Point",
                "pickup_distance_meters": float(trip_row["dist_from_pickup_m"]),
                "destination_distance_meters": 0.0,
                "booking_id":         "",
                "women_only":         trip_row["women_only"],
                "matched_via":        "corridor_live",
            }
            await publish_event(f"customer:{customer_id}:events", match_payload)

            logger.info(
                "Customer entered corridor",
                customer_id=customer_id,
                trip_id=trip_id,
                dist_m=trip_row["dist_from_route_m"],
            )

    # ──────────────────────────────────────────────────────────────────────────
    # 6. Get route geometry for a trip (for frontend rendering)
    # ──────────────────────────────────────────────────────────────────────────

    async def get_trip_geometry(self, trip_id: str) -> dict:
        """
        Returns the stored route geometry and polygons for a trip so the
        driver map can render them.
        """
        trip_uuid = uuid.UUID(trip_id)

        route_res = await self.db.execute(
            select(TripRouteGeometry).where(TripRouteGeometry.trip_id == trip_uuid)
        )
        route = route_res.scalar_one_or_none()

        poly_res = await self.db.execute(
            select(TripPolygons).where(TripPolygons.trip_id == trip_uuid)
        )
        poly = poly_res.scalar_one_or_none()

        return {
            "encoded_polyline":    route.encoded_polyline if route else None,
            "distance_km":         route.distance_km if route else None,
            "duration_minutes":    route.duration_minutes if route else None,
            "has_route_buffer":    route is not None and route.route_buffer is not None,
            "has_pickup_polygon":  poly is not None and poly.pickup_polygon is not None,
            "has_dest_polygon":    poly is not None and poly.destination_polygon is not None,
        }


# ─── Redis Pub/Sub Consumer (runs as background task in matching-service) ─────

async def consume_customer_location_updates(db_factory):
    """
    Listens to 'customer:location:updates' Redis channel.
    Checks if customer entered any active trip corridors.
    Called from matching-service lifespan as a background coroutine.
    """
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe("customer:location:updates")
    logger.info(" Customer location consumer started")

    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            data = json.loads(message["data"])
            async with db_factory() as db:
                service = CorridorMatchingService(db)
                await service.update_customer_location(
                    customer_id=data["customer_id"],
                    lat=data["lat"],
                    lng=data["lng"],
                )
        except Exception as e:
            logger.error("Customer location consumer error", exc_info=e)
