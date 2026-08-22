"""
Feature 10: During Ride Service
Server-authoritative live trip execution: GPS validation, PostGIS cumulative distance,
realtime waiting detection, live estimated fare calculation, and destination modification.
"""
import uuid
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User, Driver,
    RideRequest, RideRequestStatus,
    RideStop, RideSOSEvent, RideEventLog
)
from app.services.ride_fare_engine import haversine_distance_km
from app.services.routing_gatekeeper import RoutingGatekeeper


async def _safe_redis_publish(channel: str, payload_dict: dict):
    try:
        from common.utils.redis_client import get_redis
        r = await asyncio.wait_for(get_redis(), timeout=0.3)
        await asyncio.wait_for(r.publish(channel, json.dumps(payload_dict, default=str)), timeout=0.3)
    except Exception:
        pass


class DuringRideService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_trip_location(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        latitude: float,
        longitude: float,
        speed_kmh: float = 0.0,
        heading: float = 0.0,
        accuracy_m: float = 10.0,
    ) -> Dict[str, Any]:
        """
        Validates driver GPS telemetry, accumulates authoritative PostGIS distance,
        detects waiting time, updates live estimated fare, and broadcasts progress.
        """
        # 1. Driver verification
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # 2. Ride ownership & state
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized for this ride")

        if ride.status != RideRequestStatus.IN_PROGRESS:
            return {
                "ride_id": str(ride.id),
                "status": ride.status.value,
                "message": f"Telemetry ignored for ride in state '{ride.status.value}'",
                "distance_travelled_km": ride.distance_travelled_km or 0.0,
            }

        # 3. GPS Sanity & Anti-Fraud Filters
        if not (-90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0):
            raise HTTPException(status_code=400, detail="Invalid GPS latitude/longitude range")

        if accuracy_m > 45.0:
            # GPS accuracy too weak — skip distance accumulation to prevent drift
            return {
                "ride_id": str(ride.id),
                "status": "in_progress",
                "warning": "Weak GPS accuracy (>45m) — position filtered",
                "distance_travelled_km": round(ride.distance_travelled_km or 0.0, 2),
            }

        if speed_kmh > 160.0:
            # Implausible speed
            raise HTTPException(status_code=400, detail=f"Unrealistic speed {int(speed_kmh)} km/h rejected")

        # 4. PostGIS Cumulative Distance Calculation
        last_lat = ride.start_lat if ride.distance_travelled_km == 0.0 else None
        last_lng = ride.start_lng if ride.distance_travelled_km == 0.0 else None

        # Fetch latest stop or start point for distance delta
        dist_delta_km = 0.0
        now = datetime.utcnow()

        if last_lat is not None and last_lng is not None:
            dist_delta_km = haversine_distance_km(last_lat, last_lng, latitude, longitude)
            if dist_delta_km > 0.5: # Jump filter (>500m single jump)
                dist_delta_km = 0.0 # Suppress anomaly

        ride.distance_travelled_km = round((ride.distance_travelled_km or 0.0) + dist_delta_km, 3)

        # 5. Realtime Waiting Time Detection
        # Waiting condition: Speed < 3.0 km/h
        is_waiting = speed_kmh < 3.0
        if is_waiting:
            ride.waiting_duration_seconds = (ride.waiting_duration_seconds or 0) + 3 # ~3s interval
            # Billable waiting fare: 2.0 Rs/min after 3 free minutes (180s)
            billable_secs = max((ride.waiting_duration_seconds or 0) - 180, 0)
            ride.waiting_fare = Decimal(str(round((billable_secs / 60.0) * 2.0, 2)))

        # 6. Live In-Flight Estimated Fare
        # Base Fare (75) + Distance (16 Rs/km) + Time (2 Rs/min) + Waiting Fare + Stops Fee
        elapsed_mins = 0
        if ride.started_at:
            elapsed_mins = max(int((now - ride.started_at.replace(tzinfo=None)).total_seconds() / 60), 0)

        # Count completed/active stops for stop fees (₹30 per stop)
        stops_count_res = await self.db.execute(
            select(func.count(RideStop.id)).where(
                and_(RideStop.ride_id == ride.id, RideStop.status.in_(["accepted", "arrived", "completed"]))
            )
        )
        stops_count = stops_count_res.scalar() or 0
        stops_fee = stops_count * 30.0

        base_fare = 75.0
        dist_charge = float(ride.distance_travelled_km) * 16.0
        time_charge = elapsed_mins * 2.0
        total_live_est = base_fare + dist_charge + time_charge + float(ride.waiting_fare or 0) + stops_fee
        ride.current_estimated_fare = Decimal(str(round(max(total_live_est, float(ride.estimated_fare)), 2)))

        await self.db.commit()

        # 7. Remaining Distance & ETA calculation (PostGIS Math - 0 API Calls)
        dest_dist_km = haversine_distance_km(latitude, longitude, ride.destination_lat, ride.destination_lng)
        dest_dur_min = max(int((dest_dist_km / 28.0) * 60), 1)

        payload = {
            "ride_id": str(ride.id),
            "status": "in_progress",
            "driver_location": {"lat": latitude, "lng": longitude, "heading": heading, "speed": speed_kmh},
            "distance_travelled_km": round(ride.distance_travelled_km, 2),
            "distance_remaining_km": round(dest_dist_km, 2),
            "duration_remaining_min": dest_dur_min,
            "waiting_seconds": ride.waiting_duration_seconds or 0,
            "waiting_fare": float(ride.waiting_fare or 0),
            "current_estimated_fare": float(ride.current_estimated_fare or ride.estimated_fare),
            "stops_count": stops_count,
            "is_waiting": is_waiting,
        }

        # Broadcast via Redis/Socket.IO
        await _safe_redis_publish("trip:updates", {
            "event": "ride:progress",
            "data": payload,
        })

        return payload

    async def update_destination(
        self,
        user_id: str,
        role: str,
        ride_id: uuid.UUID,
        new_latitude: float,
        new_longitude: float,
        new_address: str,
    ) -> Dict[str, Any]:
        """
        Authorized Destination Modification during active trip.
        Updates coordinates, recalculates route via RoutingGatekeeper (cache-first),
        and updates estimated fare.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.status != RideRequestStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail=f"Cannot change destination for ride in '{ride.status.value}'")

        # Authorization check
        if role == "driver":
            d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(user_id)))
            driver = d_res.scalar_one_or_none()
            if not driver or ride.assigned_driver_id != driver.id:
                raise HTTPException(status_code=403, detail="Unauthorized")
        elif role == "customer":
            if ride.customer_id != uuid.UUID(user_id):
                raise HTTPException(status_code=403, detail="Unauthorized")

        # Update destination fields
        ride.destination_lat = new_latitude
        ride.destination_lng = new_longitude
        ride.destination_address = new_address.strip()
        ride.destination_location = f"SRID=4326;POINT({new_longitude} {new_latitude})"
        ride.destination_change_count = (ride.destination_change_count or 0) + 1

        # Recalculate route via RoutingGatekeeper
        cur_lat = ride.start_lat or ride.pickup_lat
        cur_lng = ride.start_lng or ride.pickup_lng
        route_info = await RoutingGatekeeper.get_route(
            origin_lat=cur_lat,
            origin_lng=cur_lng,
            dest_lat=new_latitude,
            dest_lng=new_longitude,
            ride_id=ride.id,
        )

        ride.route_polyline = route_info.get("polyline", "")
        ride.route_distance_km = route_info.get("distance_km", 0.0)
        ride.route_duration_min = route_info.get("duration_min", 0)

        # Recalculate new base estimated fare
        new_fare = 75.0 + (route_info.get("distance_km", 5.0) * 16.0) + (route_info.get("duration_min", 15) * 2.0)
        ride.estimated_fare = Decimal(str(round(new_fare, 2)))
        ride.current_estimated_fare = ride.estimated_fare

        # Log audit event
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride.id,
            event_type="DESTINATION_CHANGED",
            actor_id=uuid.UUID(user_id),
            actor_role=role,
            details={
                "new_address": new_address,
                "new_lat": new_latitude,
                "new_lng": new_longitude,
                "new_fare": float(ride.estimated_fare),
                "distance_km": route_info.get("distance_km"),
            }
        )
        self.db.add(event_log)
        await self.db.commit()

        response_data = {
            "success": True,
            "ride_id": str(ride.id),
            "destination": {
                "address": new_address,
                "lat": new_latitude,
                "lng": new_longitude,
            },
            "distance_km": route_info.get("distance_km"),
            "duration_min": route_info.get("duration_min"),
            "estimated_fare": float(ride.estimated_fare),
            "route_polyline": ride.route_polyline,
        }

        # Broadcast destination update
        await _safe_redis_publish("trip:updates", {
            "event": "ride:destination_updated",
            "data": response_data,
        })

        return response_data

    async def get_during_ride_status(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        driver_lat: float,
        driver_lng: float,
    ) -> Dict[str, Any]:
        """
        Returns full in-flight trip status: timer, fare, distance, stops, and SOS status.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride or ride.assigned_driver_id != driver.id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        now = datetime.utcnow()
        trip_sec = 0
        if ride.started_at:
            trip_sec = int((now - ride.started_at.replace(tzinfo=None)).total_seconds())

        # Remaining distance & ETA
        dest_dist_km = haversine_distance_km(driver_lat, driver_lng, ride.destination_lat, ride.destination_lng)
        dest_dur_min = max(int((dest_dist_km / 28.0) * 60), 1)

        # Active Stops
        s_res = await self.db.execute(
            select(RideStop).where(RideStop.ride_id == ride.id).order_by(RideStop.sequence.asc())
        )
        stops = s_res.scalars().all()

        return {
            "ride_id": str(ride.id),
            "status": ride.status.value,
            "started_at": ride.started_at.isoformat() if ride.started_at else None,
            "trip_seconds": trip_sec,
            "distance_travelled_km": round(ride.distance_travelled_km or 0.0, 2),
            "distance_remaining_km": round(dest_dist_km, 2),
            "duration_remaining_min": dest_dur_min,
            "waiting_seconds": ride.waiting_duration_seconds or 0,
            "waiting_fare": float(ride.waiting_fare or 0),
            "current_estimated_fare": float(ride.current_estimated_fare or ride.estimated_fare),
            "final_estimated_fare": float(ride.estimated_fare),
            "destination": {
                "address": ride.destination_address,
                "lat": ride.destination_lat,
                "lng": ride.destination_lng,
            },
            "has_active_sos": ride.has_active_sos,
            "stops": [
                {
                    "id": str(s.id),
                    "sequence": s.sequence,
                    "address": s.address,
                    "latitude": s.latitude,
                    "longitude": s.longitude,
                    "status": s.status,
                    "stop_fee": float(s.stop_fee),
                }
                for s in stops
            ],
        }
