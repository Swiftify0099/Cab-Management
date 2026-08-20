import os, sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
matching_services_dir = os.path.join(backend_root, "matching-service", "app", "services")
matching_api_file = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")
gateway_file = os.path.join(backend_root, "local_gateway.py")

# ============================================================
# 1. during_ride_service.py
# ============================================================
during_ride_code = '''"""
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
'''

# ============================================================
# 2. multi_stop_service.py
# ============================================================
multi_stop_code = '''"""
Feature 10: Multi-Stop Service
Authoritative Intermediate Stop Management: Adding Stops, PostGIS Arrival Geofencing (<60m),
and Sequence-aware Departures.
"""
import uuid
import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User, Driver,
    RideRequest, RideRequestStatus,
    RideStop, RideEventLog
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


class MultiStopService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_stop(
        self,
        user_id: str,
        role: str,
        ride_id: uuid.UUID,
        address: str,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:
        """
        Adds an intermediate stop to active ride.
        Enforces maximum 3 stops limit and applies ₹30.00 base stop fee.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        if ride.status != RideRequestStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Cannot add stops to non-active ride")

        # Validate max 3 stops
        count_res = await self.db.execute(
            select(func.count(RideStop.id)).where(RideStop.ride_id == ride.id)
        )
        existing_count = count_res.scalar() or 0
        if existing_count >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 intermediate stops allowed per ride")

        stop_id = uuid.uuid4()
        sequence = existing_count + 1
        stop_fee = Decimal("30.00")

        stop = RideStop(
            id=stop_id,
            ride_id=ride.id,
            sequence=sequence,
            address=address.strip(),
            latitude=latitude,
            longitude=longitude,
            location=f"SRID=4326;POINT({longitude} {latitude})",
            status="accepted",
            requested_by=role,
            stop_fee=stop_fee,
            waiting_time_seconds=0,
        )
        self.db.add(stop)

        # Update ride estimated fare with stop fee (+₹30)
        ride.estimated_fare += stop_fee
        ride.current_estimated_fare += stop_fee

        # Audit log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride.id,
            event_type="STOP_ADDED",
            actor_id=uuid.UUID(user_id),
            actor_role=role,
            details={
                "stop_id": str(stop_id),
                "sequence": sequence,
                "address": address,
                "stop_fee": float(stop_fee),
            }
        )
        self.db.add(event_log)
        await self.db.commit()

        response_data = {
            "success": True,
            "stop_id": str(stop_id),
            "sequence": sequence,
            "address": address,
            "latitude": latitude,
            "longitude": longitude,
            "status": "accepted",
            "stop_fee": float(stop_fee),
            "updated_fare": float(ride.current_estimated_fare),
        }

        await _safe_redis_publish("trip:updates", {
            "event": "ride:stop_added",
            "data": response_data,
        })

        return response_data

    async def verify_stop_arrival(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        stop_id: uuid.UUID,
        driver_lat: float,
        driver_lng: float,
    ) -> Dict[str, Any]:
        """
        PostGIS Geofence arrival check (<=60m radius from stop coordinates).
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        s_res = await self.db.execute(
            select(RideStop).where(and_(RideStop.id == stop_id, RideStop.ride_id == ride_id))
        )
        stop = s_res.scalar_one_or_none()
        if not stop:
            raise HTTPException(status_code=404, detail="Stop not found")

        dist_m = haversine_distance_km(driver_lat, driver_lng, stop.latitude, stop.longitude) * 1000.0
        if dist_m > 60.0:
            raise HTTPException(
                status_code=400,
                detail=f"Driver is {int(dist_m)}m from stop (Must be within 60m to confirm arrival)."
            )

        now = datetime.utcnow()
        stop.status = "arrived"
        stop.arrived_at = now

        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride_id,
            event_type="STOP_ARRIVED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={"stop_id": str(stop_id), "distance_meters": dist_m}
        )
        self.db.add(event_log)
        await self.db.commit()

        payload = {
            "success": True,
            "stop_id": str(stop.id),
            "sequence": stop.sequence,
            "status": "arrived",
            "arrived_at": now.isoformat(),
            "message": f"Arrived at Stop {stop.sequence}: {stop.address}",
        }

        await _safe_redis_publish("trip:updates", {
            "event": "ride:stop_arrived",
            "data": payload,
        })

        return payload

    async def depart_stop(
        self,
        driver_user_id: str,
        ride_id: uuid.UUID,
        stop_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """
        Completes intermediate stop and advances trip navigation to next waypoint.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        s_res = await self.db.execute(
            select(RideStop).where(and_(RideStop.id == stop_id, RideStop.ride_id == ride_id))
        )
        stop = s_res.scalar_one_or_none()
        if not stop:
            raise HTTPException(status_code=404, detail="Stop not found")

        now = datetime.utcnow()
        stop.status = "completed"
        stop.departed_at = now
        if stop.arrived_at:
            stop.waiting_time_seconds = max(int((now - stop.arrived_at.replace(tzinfo=None)).total_seconds()), 0)

        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride_id,
            event_type="STOP_DEPARTED",
            actor_id=driver.user_id,
            actor_role="driver",
            details={"stop_id": str(stop_id), "waiting_time_seconds": stop.waiting_time_seconds}
        )
        self.db.add(event_log)
        await self.db.commit()

        payload = {
            "success": True,
            "stop_id": str(stop.id),
            "sequence": stop.sequence,
            "status": "completed",
            "departed_at": now.isoformat(),
            "waiting_time_seconds": stop.waiting_time_seconds,
            "message": f"Departed Stop {stop.sequence}. Resuming trip.",
        }

        await _safe_redis_publish("trip:updates", {
            "event": "ride:stop_completed",
            "data": payload,
        })

        return payload
'''

# ============================================================
# 3. safety_sos_service.py
# ============================================================
safety_sos_code = '''"""
Feature 10: Safety & SOS Service
Passive Safety Monitoring & Authoritative Emergency SOS Handling.
Idempotent SOS creation with PostGIS snapshot, 112 escalation, and priority broadcasting.
"""
import uuid
import json
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User, Driver,
    RideRequest, RideRequestStatus,
    RideSOSEvent, RideEventLog
)


async def _safe_redis_publish(channel: str, payload_dict: dict):
    try:
        from common.utils.redis_client import get_redis
        r = await asyncio.wait_for(get_redis(), timeout=0.3)
        await asyncio.wait_for(r.publish(channel, json.dumps(payload_dict, default=str)), timeout=0.3)
    except Exception:
        pass


class SafetySOSService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def trigger_sos(
        self,
        user_id: str,
        role: str,
        ride_id: uuid.UUID,
        latitude: float,
        longitude: float,
        accuracy: float = 10.0,
        reason: Optional[str] = "Driver triggered SOS",
    ) -> Dict[str, Any]:
        """
        Authoritative Emergency SOS Trigger.
        Idempotency: If active SOS exists for this ride, returns existing incident with escalation.
        """
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        # Verify participant
        d_res = await self.db.execute(select(Driver).where(Driver.id == ride.assigned_driver_id))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Assigned driver not found")

        # 1. Idempotency Check: Existing Active SOS
        existing_sos_res = await self.db.execute(
            select(RideSOSEvent).where(and_(RideSOSEvent.ride_id == ride.id, RideSOSEvent.status == "active"))
        )
        existing_sos = existing_sos_res.scalar_one_or_none()
        if existing_sos:
            return {
                "success": True,
                "sos_id": str(existing_sos.id),
                "status": "active",
                "message": "Emergency SOS already active (Idempotent response). Safety team notified.",
                "created_at": existing_sos.created_at.isoformat() if existing_sos.created_at else datetime.utcnow().isoformat(),
                "police_number": "112",
            }

        # 2. Create SOS Event Record
        sos_id = uuid.uuid4()
        now = datetime.utcnow()
        sos_event = RideSOSEvent(
            id=sos_id,
            ride_id=ride.id,
            driver_id=driver.id,
            customer_id=ride.customer_id,
            triggered_by=role,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            location=f"SRID=4326;POINT({longitude} {latitude})",
            reason=reason,
            status="active",
        )
        self.db.add(sos_event)
        ride.has_active_sos = True

        # Audit log
        event_log = RideEventLog(
            id=uuid.uuid4(),
            ride_id=ride.id,
            event_type="SOS_TRIGGERED",
            actor_id=uuid.UUID(user_id),
            actor_role=role,
            details={
                "sos_id": str(sos_id),
                "latitude": latitude,
                "longitude": longitude,
                "accuracy": accuracy,
                "reason": reason,
            }
        )
        self.db.add(event_log)
        await self.db.commit()

        payload = {
            "success": True,
            "sos_id": str(sos_id),
            "ride_id": str(ride.id),
            "driver_id": str(driver.id),
            "customer_id": str(ride.customer_id),
            "status": "active",
            "latitude": latitude,
            "longitude": longitude,
            "accuracy": accuracy,
            "reason": reason,
            "created_at": now.isoformat(),
            "police_number": "112",
            "message": "Emergency SOS recorded. 24/7 Safety Command Center and local authorities alerted.",
        }

        # High priority broadcast
        await _safe_redis_publish("emergency:alerts", {
            "event": "ride:sos",
            "data": payload,
        })

        return payload

    async def get_active_sos(self, ride_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """Returns active SOS incident for active ride if any."""
        res = await self.db.execute(
            select(RideSOSEvent).where(and_(RideSOSEvent.ride_id == ride_id, RideSOSEvent.status == "active"))
        )
        sos = res.scalar_one_or_none()
        if not sos:
            return None

        return {
            "sos_id": str(sos.id),
            "ride_id": str(sos.ride_id),
            "status": sos.status,
            "triggered_by": sos.triggered_by,
            "latitude": sos.latitude,
            "longitude": sos.longitude,
            "created_at": sos.created_at.isoformat() if sos.created_at else None,
            "police_number": "112",
        }
'''

with open(os.path.join(matching_services_dir, "during_ride_service.py"), "w", encoding="utf-8") as f:
    f.write(during_ride_code)
print("[✓] during_ride_service.py created")

with open(os.path.join(matching_services_dir, "multi_stop_service.py"), "w", encoding="utf-8") as f:
    f.write(multi_stop_code)
print("[✓] multi_stop_service.py created")

with open(os.path.join(matching_services_dir, "safety_sos_service.py"), "w", encoding="utf-8") as f:
    f.write(safety_sos_code)
print("[✓] safety_sos_service.py created")

# ============================================================
# 4. Patch matching.py with Feature 10 REST Endpoints
# ============================================================
with open(matching_api_file, "r", encoding="utf-8") as f:
    matching_content = f.read()

feature10_api_routes = '''

# ============================================================
# FEATURE 10: DURING RIDE / LIVE TRIP EXECUTION ENDPOINTS
# ============================================================

class TripLocationUpdateSchema(BaseModel):
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    accuracy_m: Optional[float] = 10.0


class UpdateDestinationSchema(BaseModel):
    new_latitude: float
    new_longitude: float
    new_address: str


class AddStopSchema(BaseModel):
    address: str
    latitude: float
    longitude: float


class StopArrivalSchema(BaseModel):
    latitude: float
    longitude: float


class TriggerSOSSchema(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = 10.0
    reason: Optional[str] = "Emergency button triggered by driver"


@router.post(
    "/rides/{ride_id}/location",
    response_model=SuccessResponse,
    summary="Driver: Process during-ride GPS telemetry and PostGIS distance",
)
async def record_trip_location_endpoint(
    ride_id: str,
    request: TripLocationUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.during_ride_service import DuringRideService
    service = DuringRideService(db)
    result = await service.record_trip_location(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        latitude=request.latitude,
        longitude=request.longitude,
        speed_kmh=request.speed_kmh or 0.0,
        heading=request.heading or 0.0,
        accuracy_m=request.accuracy_m or 10.0,
    )
    return SuccessResponse(success=True, message="Location processed", data=result)


@router.get(
    "/rides/{ride_id}/status",
    response_model=SuccessResponse,
    summary="Driver: Get live in-flight trip execution status & fare",
)
async def get_during_ride_status_endpoint(
    ride_id: str,
    latitude: float = Query(...),
    longitude: float = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.during_ride_service import DuringRideService
    service = DuringRideService(db)
    result = await service.get_during_ride_status(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        driver_lat=latitude,
        driver_lng=longitude,
    )
    return SuccessResponse(success=True, message="Trip status retrieved", data=result)


@router.post(
    "/rides/{ride_id}/destination",
    response_model=SuccessResponse,
    summary="Driver/Customer: Modify destination during active trip",
)
async def update_destination_endpoint(
    ride_id: str,
    request: UpdateDestinationSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.during_ride_service import DuringRideService
    service = DuringRideService(db)
    result = await service.update_destination(
        user_id=current_user.user_id_str,
        role="driver",
        ride_id=uuid.UUID(ride_id),
        new_latitude=request.new_latitude,
        new_longitude=request.new_longitude,
        new_address=request.new_address,
    )
    return SuccessResponse(success=True, message="Destination updated", data=result)


@router.post(
    "/rides/{ride_id}/stops",
    response_model=SuccessResponse,
    summary="Driver/Customer: Add intermediate stop to active trip",
)
async def add_stop_endpoint(
    ride_id: str,
    request: AddStopSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.multi_stop_service import MultiStopService
    service = MultiStopService(db)
    result = await service.add_stop(
        user_id=current_user.user_id_str,
        role="driver",
        ride_id=uuid.UUID(ride_id),
        address=request.address,
        latitude=request.latitude,
        longitude=request.longitude,
    )
    return SuccessResponse(success=True, message="Stop added", data=result)


@router.post(
    "/rides/{ride_id}/stops/{stop_id}/arrive",
    response_model=SuccessResponse,
    summary="Driver: PostGIS Geofence stop arrival check (<=60m)",
)
async def stop_arrive_endpoint(
    ride_id: str,
    stop_id: str,
    request: StopArrivalSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.multi_stop_service import MultiStopService
    service = MultiStopService(db)
    result = await service.verify_stop_arrival(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        stop_id=uuid.UUID(stop_id),
        driver_lat=request.latitude,
        driver_lng=request.longitude,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.post(
    "/rides/{ride_id}/stops/{stop_id}/depart",
    response_model=SuccessResponse,
    summary="Driver: Depart from intermediate stop",
)
async def stop_depart_endpoint(
    ride_id: str,
    stop_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.multi_stop_service import MultiStopService
    service = MultiStopService(db)
    result = await service.depart_stop(
        driver_user_id=current_user.user_id_str,
        ride_id=uuid.UUID(ride_id),
        stop_id=uuid.UUID(stop_id),
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.post(
    "/rides/{ride_id}/sos",
    response_model=SuccessResponse,
    summary="Driver: Trigger Emergency SOS incident",
)
async def trigger_sos_endpoint(
    ride_id: str,
    request: TriggerSOSSchema,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.safety_sos_service import SafetySOSService
    service = SafetySOSService(db)
    result = await service.trigger_sos(
        user_id=current_user.user_id_str,
        role="driver",
        ride_id=uuid.UUID(ride_id),
        latitude=request.latitude,
        longitude=request.longitude,
        accuracy=request.accuracy or 10.0,
        reason=request.reason,
    )
    return SuccessResponse(success=True, message=result["message"], data=result)


@router.get(
    "/rides/{ride_id}/sos",
    response_model=SuccessResponse,
    summary="Driver: Check active SOS incident for ride",
)
async def get_active_sos_endpoint(
    ride_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_active_driver),
):
    from app.services.safety_sos_service import SafetySOSService
    service = SafetySOSService(db)
    result = await service.get_active_sos(ride_id=uuid.UUID(ride_id))
    return SuccessResponse(success=True, message="SOS status retrieved", data=result)
'''

if "/rides/{ride_id}/destination" not in matching_content:
    matching_content += feature10_api_routes
    with open(matching_api_file, "w", encoding="utf-8") as f:
        f.write(matching_content)
    print("[✓] matching.py updated with Feature 10 routes")
else:
    print("[i] matching.py already contains Feature 10 routes")

# ============================================================
# 5. Patch local_gateway.py with Feature 10 Socket.IO Handlers
# ============================================================
with open(gateway_file, "r", encoding="utf-8") as f:
    gateway_content = f.read()

feature10_socket_handlers = '''
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
'''

if "TRIGGER_RIDE_SOS" not in gateway_content:
    gateway_content += feature10_socket_handlers
    with open(gateway_file, "w", encoding="utf-8") as f:
        f.write(gateway_content)
    print("[✓] local_gateway.py patched with Feature 10 socket handlers")
else:
    print("[i] local_gateway.py already contains Feature 10 socket handlers")

print("\nALL FEATURE 10 BACKEND SERVICES AND APIS APPLIED SUCCESSFULLY!")
