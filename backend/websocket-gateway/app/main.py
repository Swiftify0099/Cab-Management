"""
WebSocket Gateway — Phase 4 Complete Implementation.

Socket.IO with Redis adapter for horizontal scaling.
Channels:
  - user:{user_id}:events        — Customer events (driver accepted, tracking)
  - driver:{driver_id}:events    — Driver events (incoming request, suspend)
  - trip:{trip_id}               — Shared trip tracking room
  - admins                       — Admin SOS + alerts

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

# ──────────────────────────────────────────────────────────────────────────────
# Socket.IO — Redis adapter for multi-instance horizontal scaling
# ──────────────────────────────────────────────────────────────────────────────
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

# sid → {user_id, role, driver_id/customer_id}
_connected_clients: dict[str, dict] = {}


# ──────────────────────────────────────────────────────────────────────────────
# Redis Pub/Sub Listener — bridge Redis events → Socket.IO rooms
# ──────────────────────────────────────────────────────────────────────────────

async def _redis_listener():
    """
    Subscribe to all Redis event channels and forward to Socket.IO rooms.
    Pattern: driver:*:events, customer:*:events
    """
    r = await get_redis()
    # Use a separate connection for pub/sub
    pubsub_conn = r.pubsub()
    await pubsub_conn.psubscribe("driver:*:events", "customer:*:events", "trip:*:events")
    logger.info("📡 Redis pub/sub listener started")

    async for message in pubsub_conn.listen():
        if message["type"] not in ("message", "pmessage"):
            continue
        try:
            channel = message["channel"]
            data = json.loads(message["data"])
            event_type = data.get("event", "EVENT")

            # Route to Socket.IO room based on channel pattern
            # driver:DRIVER_ID:events → room "driver:DRIVER_ID"
            # customer:CUSTOMER_ID:events → room "user:CUSTOMER_ID"
            # trip:TRIP_ID:events → room "trip:TRIP_ID"
            parts = channel.split(":")
            if len(parts) >= 3:
                entity = parts[0]   # driver, customer, trip
                entity_id = parts[1]

                if entity == "driver":
                    room = f"driver:{entity_id}"
                elif entity == "customer":
                    room = f"user:{entity_id}"
                elif entity == "trip":
                    room = f"trip:{entity_id}"
                else:
                    continue

                await sio.emit(event_type, data, room=room)
                logger.debug("Event forwarded", event=event_type, room=room)
        except Exception as e:
            logger.error("Redis listener error", exc_info=e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🔌 WebSocket Gateway starting...")
    # Start Redis listener as a background task
    listener_task = asyncio.create_task(_redis_listener())
    yield
    listener_task.cancel()
    await close_redis()
    logger.info("🛑 WebSocket Gateway stopped")


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ──────────────────────────────────────────────────────────────────────────────
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


# ──────────────────────────────────────────────────────────────────────────────
# Socket.IO Event Handlers
# ──────────────────────────────────────────────────────────────────────────────

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

        # Join personal notification room
        personal_room = f"user:{user_id}" if role in ("customer",) else f"driver:{user_id}"
        await sio.enter_room(sid, personal_room)

        # Admins join shared admin room
        if role in ("admin", "super_admin"):
            await sio.enter_room(sid, "admins")
            await sio.enter_room(sid, f"user:{user_id}")

        logger.info("WS client connected", sid=sid, user_id=user_id, role=role)
        await sio.emit("CONNECTED", {"message": "Connected to CabBooking gateway", "user_id": user_id}, to=sid)

    except Exception as e:
        logger.warning("WS auth failed", sid=sid, error=str(e))
        return False


@sio.event
async def disconnect(sid):
    client = _connected_clients.pop(sid, {})
    logger.info("WS client disconnected", sid=sid, user_id=client.get("user_id"))


@sio.event
async def join_trip(sid, data):
    """Customer or driver joins a trip tracking room."""
    trip_id = data.get("trip_id")
    if not trip_id:
        return
    room = f"trip:{trip_id}"
    await sio.enter_room(sid, room)
    logger.info("Client joined trip room", sid=sid, trip_id=trip_id)
    await sio.emit("JOINED_TRIP", {"trip_id": trip_id}, to=sid)


@sio.event
async def leave_trip(sid, data):
    """Leave a trip tracking room."""
    trip_id = data.get("trip_id")
    if trip_id:
        await sio.leave_room(sid, f"trip:{trip_id}")


@sio.event
async def location_update(sid, data):
    """
    Driver sends GPS update.
    Broadcast to everyone in trip room (customer sees live location).
    Also publish to Redis for persistence in matching-service.
    """
    client = _connected_clients.get(sid, {})
    if client.get("role") != "driver":
        return

    trip_id = data.get("trip_id")
    if not trip_id:
        return

    # Add driver_id to payload
    data["driver_id"] = client.get("user_id")

    # Broadcast to trip room
    await sio.emit("LOCATION_UPDATE", data, room=f"trip:{trip_id}", skip_sid=sid)

    # Publish to Redis for matching-service to persist to DB
    r = await get_redis()
    await r.publish("live:location:updates", json.dumps(data))


@sio.event
async def driver_respond(sid, data):
    """
    Driver accepts or rejects an incoming trip request.
    Publishes response to Redis — dispatch service picks it up.
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
async def sos_trigger(sid, data):
    """
    Emergency SOS — broadcast to all admins immediately.
    """
    client = _connected_clients.get(sid, {})
    sos_data = {
        **data,
        "user_id": client.get("user_id"),
        "role": client.get("role"),
        "event": "SOS_TRIGGERED",
    }
    await sio.emit("SOS_TRIGGERED", sos_data, room="admins")
    await sio.emit("SOS_ACK", {"message": "SOS received — help is coming!"}, to=sid)
    logger.critical("SOS triggered!", user_id=client.get("user_id"), data=data)


# ──────────────────────────────────────────────────────────────────────────────
# Mount as ASGI
# ──────────────────────────────────────────────────────────────────────────────
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "websocket-gateway",
        "connected_clients": len(_connected_clients),
    }
