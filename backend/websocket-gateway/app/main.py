"""
WebSocket Gateway  Phase 4 Complete Implementation.

Socket.IO with Redis adapter for horizontal scaling.
Channels:
  - user:{user_id}:events         Customer events (driver accepted, tracking)
  - driver:{driver_id}:events     Driver events (incoming request, suspend)
  - trip:{trip_id}                Shared trip tracking room
  - admins                        Admin SOS + alerts

Event types emitted to clients:
  INCOMING_TRIP_REQUEST, DRIVER_ACCEPTED, MATCHING_FAILED,
  LOCATION_UPDATE, BOOKING_EXPIRED, SUSPENDED, SOS_TRIGGERED,
  TRIP_STARTED, TRIP_COMPLETED
"""
from contextlib import asynccontextmanager
import asyncio
import json
import structlog
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from common.utils.redis_client import get_redis, close_redis
from common.utils.jwt import decode_token
from app.core.config import ws_settings

logger = structlog.get_logger(__name__)

# 
# Socket.IO  Redis adapter for multi-instance horizontal scaling
# 
mgr = socketio.AsyncRedisManager(ws_settings.REDIS_URL)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    client_manager=mgr,
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
)

# sid  {user_id, role, driver_id/customer_id}
_connected_clients: dict[str, dict] = {}


# 
# Redis Pub/Sub Listener  bridge Redis events  Socket.IO rooms
# 

async def _redis_listener():
    """
    Subscribe to all Redis event channels and forward to Socket.IO rooms.
    Pattern: driver:*:events, customer:*:events, trip:*, ride:*
    """
    r = await get_redis()
    pubsub_conn = r.pubsub()
    await pubsub_conn.psubscribe(
        "driver:*:events",
        "customer:*:events",
        "user:*:events",
        "trip:*:events",
        "ride:*:events",
        "trip:*",
        "ride:*",
        "city:*:events",
        "driver_scan:*",
        "corridor:*",
        "notification:events",
    )
    await pubsub_conn.subscribe(
        "corridor:match",
        "trip:updates",
        "communication:events",
        "emergency:alerts",
        "driver:earnings",
    )
    logger.info("📡 Redis pub/sub listener started")

    async for message in pubsub_conn.listen():
        if message["type"] not in ("message", "pmessage"):
            continue
        try:
            channel = message["channel"]
            if isinstance(channel, bytes):
                channel = channel.decode()
            raw_data = message["data"]
            if isinstance(raw_data, bytes):
                raw_data = raw_data.decode()
            data = json.loads(raw_data)
            event_type = data.get("event", "EVENT")

            # Route named channels
            if channel == "trip:updates":
                r_id = data.get("ride_id") or (data.get("data") or {}).get("ride_id") or (data.get("data") or {}).get("trip_id")
                if r_id:
                    await sio.emit(event_type, data, room=f"trip:{r_id}")
                    await sio.emit(event_type, data, room=f"ride:{r_id}")
                continue

            if channel == "communication:events":
                r_id = data.get("ride_id")
                if r_id:
                    await sio.emit(event_type, data, room=f"trip:{r_id}")
                    await sio.emit(event_type, data, room=f"ride:{r_id}")
                cid = data.get("customer_id")
                did = data.get("driver_id")
                if cid:
                    await sio.emit(event_type, data, room=f"customer:{cid}")
                if did:
                    await sio.emit(event_type, data, room=f"driver:{did}")
                continue

            if channel == "emergency:alerts":
                r_id = data.get("ride_id")
                if r_id:
                    await sio.emit(event_type, data, room=f"trip:{r_id}")
                    await sio.emit(event_name, data, room=f"ride:{r_id}")
                await sio.emit(event_type, data, room="safety_monitoring")
                await sio.emit(event_type, data, room="admins")
                continue

            parts = channel.split(":")
            entity = parts[0]
            entity_id = parts[1] if len(parts) >= 2 else ""

            if entity == "driver":
                await sio.emit(event_type, data, room=f"driver:{entity_id}")
                await sio.emit(event_type, data, room=f"user:{entity_id}")
            elif entity in ("customer", "user"):
                await sio.emit(event_type, data, room=f"customer:{entity_id}")
                await sio.emit(event_type, data, room=f"user:{entity_id}")
            elif entity == "driver_scan":
                await sio.emit(event_type, data, room=f"driver_scan:{entity_id}")
            elif entity == "corridor":
                await sio.emit(event_type, data, room=f"driver:{entity_id}")
            elif entity in ("trip", "ride"):
                if entity_id != "updates":
                    await sio.emit(event_type, data, room=f"trip:{entity_id}")
                    await sio.emit(event_type, data, room=f"ride:{entity_id}")
            elif entity == "city":
                await sio.emit(event_type, data, room=f"city:{entity_id}")

            logger.debug("Event forwarded", event=event_type, channel=channel)

        except Exception as e:
            logger.error("Redis listener error", exc_info=e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 WebSocket Gateway starting...")
    # Start Redis listener as a background task
    listener_task = asyncio.create_task(_redis_listener())
    yield
    listener_task.cancel()
    await close_redis()
    logger.info("🛑 WebSocket Gateway stopped")


# ─── FastAPI App ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="CabBooking WebSocket Gateway",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Socket.IO Event Handlers ────────────────────────────────────────────────

@sio.event
async def connect(sid, environ, auth):
    """
    Authenticate client and join their personal room.
    auth = { token: "Bearer JWT..." }
    """
    token = (auth or {}).get("token", "").replace("Bearer ", "")
    if not token:
        logger.warning("WS connect rejected — no token", sid=sid)
        return False  # Reject connection

    try:
        payload = decode_token(token, expected_type="access")
        user_id = payload.get("sub")
        role = payload.get("role", "customer")

        _connected_clients[sid] = {"user_id": user_id, "role": role}

        if role == "driver":
            await sio.enter_room(sid, f"driver:{user_id}")
            logger.info("WS driver connected", sid=sid, user_id=user_id)
            await sio.emit("CONNECTED", {"message": "Connected to CabBooking gateway", "user_id": user_id}, to=sid)
            await sio.emit("DRIVER_SOCKET_READY", {"status": "ready", "user_id": user_id, "room": f"driver:{user_id}"}, to=sid)
        else:
            await sio.enter_room(sid, f"customer:{user_id}")
            await sio.enter_room(sid, f"user:{user_id}")
            logger.info("WS customer connected", sid=sid, user_id=user_id)
            await sio.emit("CONNECTED", {"message": "Connected to CabBooking gateway", "user_id": user_id}, to=sid)
            await sio.emit("CUSTOMER_SOCKET_READY", {"status": "ready", "user_id": user_id, "room": f"customer:{user_id}"}, to=sid)

        # Admins join shared admin room
        if role in ("admin", "super_admin"):
            await sio.enter_room(sid, "admins")
            await sio.enter_room(sid, f"user:{user_id}")

    except Exception as e:
        logger.warning("WS auth failed", sid=sid, error=str(e))
        return False


@sio.event
async def disconnect(sid):
    client = _connected_clients.pop(sid, {})
    logger.info("WS client disconnected", sid=sid, user_id=client.get("user_id"))


@sio.event
async def join_trip(sid, data):
    """Customer or driver joins a trip and ride tracking room."""
    trip_id = data.get("trip_id") or data.get("ride_id")
    if not trip_id:
        return
    await sio.enter_room(sid, f"trip:{trip_id}")
    await sio.enter_room(sid, f"ride:{trip_id}")
    logger.info("Client joined trip and ride room", sid=sid, trip_id=trip_id)
    await sio.emit("JOINED_TRIP", {"trip_id": trip_id}, to=sid)


@sio.event
async def leave_trip(sid, data):
    """Leave a trip and ride tracking room."""
    trip_id = data.get("trip_id") or data.get("ride_id")
    if trip_id:
        await sio.leave_room(sid, f"trip:{trip_id}")
        await sio.leave_room(sid, f"ride:{trip_id}")


@sio.event
async def join_ride_room(sid, data):
    """Join ride tracking room."""
    ride_id = data.get("ride_id") or data.get("trip_id")
    if not ride_id:
        return
    await sio.enter_room(sid, f"trip:{ride_id}")
    await sio.enter_room(sid, f"ride:{ride_id}")
    logger.info("Client joined ride and trip room", sid=sid, ride_id=ride_id)


@sio.event
async def leave_ride_room(sid, data):
    """Leave ride tracking room."""
    ride_id = data.get("ride_id") or data.get("trip_id")
    if ride_id:
        await sio.leave_room(sid, f"trip:{ride_id}")
        await sio.leave_room(sid, f"ride:{ride_id}")


@sio.event
async def location_update(sid, data):
    """
    Driver sends GPS update.
    Broadcast to everyone in trip & ride rooms (customer sees live location).
    Also publish to Redis for persistence in matching-service.
    """
    client = _connected_clients.get(sid, {})
    if client.get("role") != "driver":
        return

    trip_id = data.get("trip_id") or data.get("ride_id")
    if not trip_id:
        return

    # Add driver_id to payload
    data["driver_id"] = client.get("user_id")

    # Broadcast to trip and ride rooms
    await sio.emit("LOCATION_UPDATE", data, room=f"trip:{trip_id}", skip_sid=sid)
    await sio.emit("LOCATION_UPDATE", data, room=f"ride:{trip_id}", skip_sid=sid)
    await sio.emit("ride:location", data, room=f"ride:{trip_id}", skip_sid=sid)

    # Publish to Redis for matching-service to persist to DB
    r = await get_redis()
    await r.publish("live:location:updates", json.dumps(data))


@sio.event
async def driver_respond(sid, data):
    """
    Driver accepts or rejects an incoming trip request.
    Publishes response to Redis  dispatch service picks it up.
    """
    client = _connected_clients.get(sid, {})
    booking_id = data.get("booking_id")
    accepted = data.get("accepted", False)
    driver_id = client.get("user_id")

    if not booking_id or not driver_id:
        return

    r = await get_redis()
    response_key = f"dispatch:response:{booking_id}:{driver_id}"
    await r.setex(response_key, 60, "accepted" if accepted else "rejected")
    logger.info("Driver responded", driver_id=driver_id, booking_id=booking_id, accepted=accepted)

    # Acknowledge
    await sio.emit("RESPONSE_RECORDED", {
        "booking_id": booking_id,
        "accepted": accepted,
    }, to=sid)


@sio.event
async def join_driver_scan(sid, data):
    """
    Driver joins the scan room for a specific trip.
    Receives NEW_PENDING_CUSTOMER events in real-time when a new
    pre-booking customer matches their route.
    """
    trip_id = data.get("trip_id")
    if not trip_id:
        return
    room = f"driver_scan:{trip_id}"
    await sio.enter_room(sid, room)
    logger.info("Driver joined scan room", sid=sid, trip_id=trip_id)
    await sio.emit("SCAN_JOINED", {"trip_id": trip_id}, to=sid)


@sio.event
async def LOCATION_UPDATE(sid, data):
    """
    Driver sends GPS update via WebSocket (from useDriverSocket.ts LOCATION_UPDATE emit).
    Broadcasts to trip room AND publishes to Redis for tracking persistence.
    """
    client = _connected_clients.get(sid, {})
    if client.get("role") != "driver":
        return

    trip_id = data.get("trip_id")
    driver_id = client.get("user_id")
    data["driver_id"] = driver_id

    if trip_id:
        # Broadcast live location to everyone tracking this trip
        await sio.emit("LOCATION_UPDATE", data, room=f"trip:{trip_id}", skip_sid=sid)

    # Publish to Redis for matching-service to persist + check arrival alert
    r = await get_redis()
    await r.publish("live:location:updates", json.dumps({**data, "driver_id": driver_id}))


@sio.event
async def heartbeat(sid, data):
    """Driver heartbeat — updates online status TTL in Redis."""
    client = _connected_clients.get(sid, {})
    driver_id = client.get("user_id")
    if driver_id and client.get("role") == "driver":
        r = await get_redis()
        lat = data.get("latitude")
        lng = data.get("longitude")
        if lat and lng:
            await r.setex(
                f"driver:location:{driver_id}",
                35,  # 35s TTL
                json.dumps({"driver_id": driver_id, "latitude": lat, "longitude": lng}),
            )
        await sio.emit("HEARTBEAT_ACK", {"ts": data.get("ts")}, to=sid)


@sio.event
async def CUSTOMER_LOCATION_UPDATE(sid, data):
    """
    Customer sends GPS position while searching for rides.
    Publishes to matching-service via Redis for corridor membership check.

    Emitted from useCustomerSocket.ts every ~10 seconds.
    Response events:
      - CUSTOMER_ENTERED_CORRIDOR → driver's WebSocket room (via Redis)
      - MATCH_FOUND              → customer's WebSocket room (via Redis)
    """
    client = _connected_clients.get(sid, {})
    customer_id = client.get("user_id")
    if not customer_id:
        return

    lat = data.get("lat") or data.get("latitude")
    lng = data.get("lng") or data.get("longitude")
    if lat is None or lng is None:
        return

    r = await get_redis()
    # Publish to a dedicated channel — matching-service (or a separate consumer)
    # listens on this channel and runs corridor check
    await r.publish(
        "customer:location:updates",
        json.dumps({"customer_id": customer_id, "lat": lat, "lng": lng}),
    )
    # Also cache in Redis for fast corridor queries
    await r.setex(
        f"customer:location:{customer_id}",
        60,
        json.dumps({"lat": lat, "lng": lng}),
    )


@sio.event
async def sos_trigger(sid, data):
    """
    Emergency SOS  broadcast to all admins immediately.
    """
    client = _connected_clients.get(sid, {})
    sos_data = {
        **data,
        "user_id": client.get("user_id"),
        "role": client.get("role"),
        "event": "SOS_TRIGGERED",
    }
    await sio.emit("SOS_TRIGGERED", sos_data, room="admins")
    await sio.emit("SOS_ACK", {"message": "SOS received  help is coming!"}, to=sid)
    logger.critical("SOS triggered!", user_id=client.get("user_id"), data=data)



@sio.event
async def JOIN_CUSTOMER_ROOM(sid, data):
    """Explicitly join customer personal and broadcast rooms."""
    client = _connected_clients.get(sid, {})
    customer_id = (data or {}).get("customer_id") or client.get("user_id")
    if customer_id:
        await sio.enter_room(sid, f"customer:{customer_id}")
        await sio.enter_room(sid, f"user:{customer_id}")
        logger.info("Customer joined personal room", sid=sid, customer_id=customer_id)
        await sio.emit("CUSTOMER_SOCKET_READY", {"status": "ready", "customer_id": customer_id, "room": f"customer:{customer_id}"}, to=sid)


@sio.event
async def JOIN_DRIVER_ROOM(sid, data):
    """Explicitly join driver personal and radar rooms."""
    client = _connected_clients.get(sid, {})
    driver_id = (data or {}).get("driver_id") or client.get("user_id")
    if driver_id:
        await sio.enter_room(sid, f"driver:{driver_id}")
        await sio.enter_room(sid, f"user:{driver_id}")
        logger.info("Driver joined personal room", sid=sid, driver_id=driver_id)
        await sio.emit("DRIVER_SOCKET_READY", {"status": "ready", "driver_id": driver_id, "room": f"driver:{driver_id}"}, to=sid)


@sio.event
async def LOCATION_UPDATE(sid, data):
    """
    Driver sends GPS update via WebSocket (from useDriverSocket.ts LOCATION_UPDATE emit).
    Broadcasts to trip room AND publishes to Redis for tracking persistence and PostGIS candidate discovery.
    """
    client = _connected_clients.get(sid, {})
    trip_id = data.get("trip_id")
    driver_id = data.get("driver_id") or client.get("user_id")
    data["driver_id"] = driver_id

    if trip_id:
        # Broadcast live location to everyone tracking this trip
        await sio.emit("LOCATION_UPDATE", data, room=f"trip:{trip_id}", skip_sid=sid)

    lat = data.get("lat") or data.get("latitude")
    lng = data.get("lng") or data.get("longitude")
    if driver_id and lat and lng:
        try:
            r = await get_redis()
            await r.setex(
                f"driver:location:{driver_id}",
                60,
                json.dumps({"driver_id": driver_id, "latitude": lat, "longitude": lng, "speed": data.get("speed", 0)}),
            )
            await r.publish("live:location:updates", json.dumps({**data, "driver_id": driver_id, "lat": lat, "lng": lng}))
        except Exception as e:
            logger.warning("LOCATION_UPDATE redis error", exc_info=e)


@sio.event
async def heartbeat(sid, data):
    """Driver heartbeat — updates online status TTL in Redis and PostGIS."""
    client = _connected_clients.get(sid, {})
    driver_id = (data or {}).get("driver_id") or client.get("user_id")
    if driver_id:
        lat = (data or {}).get("latitude") or (data or {}).get("lat")
        lng = (data or {}).get("longitude") or (data or {}).get("lng")
        if lat and lng:
            try:
                r = await get_redis()
                await r.setex(
                    f"driver:location:{driver_id}",
                    60,
                    json.dumps({"driver_id": driver_id, "latitude": lat, "longitude": lng}),
                )
                await r.publish("live:location:updates", json.dumps({"driver_id": driver_id, "lat": lat, "lng": lng, "speed": 0, "heading": 0}))
            except Exception as e:
                logger.warning("Heartbeat redis error", exc_info=e)
        await sio.emit("HEARTBEAT_ACK", {"ts": (data or {}).get("ts")}, to=sid)


@sio.event
async def CUSTOMER_LOCATION_UPDATE(sid, data):
    """
    Customer sends GPS position while searching for rides.
    Publishes to matching-service via Redis for corridor membership check.
    """
    client = _connected_clients.get(sid, {})
    customer_id = client.get("user_id")
    if not customer_id:
        return

    lat = (data or {}).get("lat") or (data or {}).get("latitude")
    lng = (data or {}).get("lng") or (data or {}).get("longitude")
    if lat is None or lng is None:
        return

    try:
        r = await get_redis()
        await r.publish(
            "customer:location:updates",
            json.dumps({"customer_id": customer_id, "lat": lat, "lng": lng}),
        )
        await r.setex(
            f"customer:location:{customer_id}",
            60,
            json.dumps({"lat": lat, "lng": lng}),
        )
    except Exception as e:
        logger.warning("CUSTOMER_LOCATION_UPDATE redis error", exc_info=e)


@sio.event
async def DRIVER_ONLINE(sid, data):
    """Driver goes online - ensure entered in room, update PostGIS coordinates, and notify ready."""
    client = _connected_clients.get(sid, {})
    driver_id = (data or {}).get("driver_id") or client.get("user_id")
    lat = (data or {}).get("lat") or (data or {}).get("latitude")
    lng = (data or {}).get("lng") or (data or {}).get("longitude")
    if driver_id:
        room = f"driver:{driver_id}"
        await sio.enter_room(sid, room)
        logger.info("Driver online event received", driver_id=driver_id, room=room)
        await sio.emit("DRIVER_SOCKET_READY", {"status": "ready", "driver_id": driver_id, "room": room}, to=sid)
        if lat and lng:
            try:
                r = await get_redis()
                await r.setex(
                    f"driver:location:{driver_id}",
                    60,
                    json.dumps({"driver_id": driver_id, "latitude": lat, "longitude": lng}),
                )
                await r.publish("live:location:updates", json.dumps({"driver_id": driver_id, "lat": lat, "lng": lng, "speed": 0, "heading": 0}))
            except Exception:
                pass


@sio.event
async def DRIVER_OFFLINE(sid, data):
    """Driver goes offline."""
    client = _connected_clients.get(sid, {})
    driver_id = (data or {}).get("driver_id") or client.get("user_id")
    if driver_id:
        await sio.leave_room(sid, f"driver:{driver_id}")
        logger.info("Driver offline event received", driver_id=driver_id)


@sio.event
async def DRIVER_PING(sid, data):
    """Lightweight 15s driver heartbeat and location update."""
    client = _connected_clients.get(sid, {})
    driver_id = client.get("user_id") or (data or {}).get("driver_id")
    if driver_id:
        lat = (data or {}).get("lat") or (data or {}).get("latitude")
        lng = (data or {}).get("lng") or (data or {}).get("longitude")
        if lat and lng:
            try:
                r = await get_redis()
                await r.setex(
                    f"driver:location:{driver_id}",
                    60,
                    json.dumps({"driver_id": driver_id, "latitude": lat, "longitude": lng}),
                )
                await r.publish("live:location:updates", json.dumps({"driver_id": driver_id, "lat": lat, "lng": lng, "speed": 0, "heading": 0}))
            except Exception:
                pass
    await sio.emit("PONG", {"ts": (data or {}).get("t") or (data or {}).get("ts")}, to=sid)


@sio.event
async def BOOKING_RESPONSE(sid, data):
    """Driver accepts or rejects booking."""
    booking_id = (data or {}).get("booking_id")
    driver_id = (data or {}).get("driver_id") or (_connected_clients.get(sid, {})).get("user_id")
    accepted = (data or {}).get("accepted", False)
    if booking_id and driver_id:
        try:
            r = await get_redis()
            response_key = f"dispatch:response:{booking_id}:{driver_id}"
            await r.setex(response_key, 120, "accepted" if accepted else "rejected")
            logger.info("Driver BOOKING_RESPONSE", driver_id=driver_id, booking_id=booking_id, accepted=accepted)
        except Exception as e:
            logger.warning("BOOKING_RESPONSE error", exc_info=e)


@sio.event
async def ride_request_respond(sid, data):
    """
    Driver accepts or rejects an on-demand RIDE_REQUEST_NEW offer.
    Stores response in Redis for RideDispatchService sequential queue.
    """
    client = _connected_clients.get(sid, {})
    offer_id = (data or {}).get("offer_id")
    accepted = (data or {}).get("accepted", False)
    rejection_reason = (data or {}).get("rejection_reason")
    driver_id = client.get("user_id")

    if not offer_id:
        return

    try:
        r = await get_redis()
        response_key = f"ride_offer:response:{offer_id}"
        await r.setex(response_key, 60, "accepted" if accepted else "rejected")
        logger.info("Driver responded to ride offer via WS", driver_id=driver_id, offer_id=offer_id, accepted=accepted)

        await sio.emit("RIDE_OFFER_ACK", {
            "offer_id": offer_id,
            "accepted": accepted,
        }, to=sid)
    except Exception as e:
        logger.warning("ride_request_respond error", exc_info=e)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "websocket-gateway",
        "connected_clients": len(_connected_clients),
    }


# ── Mount Socket.IO as ASGI app ──────────────────────────────────────────────
# When mounted on FastAPI root at /socket.io, FastAPI strips the prefix, so socketio_path="" handles all /socket.io paths
app.mount("/socket.io", socketio.ASGIApp(sio, socketio_path=""))
socket_app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path="socket.io")


