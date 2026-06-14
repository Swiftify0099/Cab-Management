import asyncio
import json
import structlog
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from common.utils.redis_client import get_redis
from app.services.dispatch import DispatchService
from common.database import async_session_maker

logger = structlog.get_logger(__name__)

async def consume_redispatch_events(session_maker: async_sessionmaker[AsyncSession]):
    """
    Listens to Redis pub/sub channel 'dispatch:redispatch_booking'
    and triggers the dispatch loop again, excluding the driver who just cancelled.
    """
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe("dispatch:redispatch_booking")
    
    logger.info("Listening for dispatch:redispatch_booking events...")
    
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    booking_id = data.get("booking_id")
                    excluded_driver_id = data.get("excluded_driver_id")
                    
                    if booking_id:
                        async with session_maker() as db:
                            service = DispatchService(db)
                            excluded = [excluded_driver_id] if excluded_driver_id else []
                            logger.info("Re-dispatching booking", booking_id=booking_id, excluded=excluded)
                            # Run dispatch in background so it doesn't block the consumer loop
                            asyncio.create_task(service.dispatch_booking(booking_id, excluded))
                except Exception as e:
                    logger.error("Error processing redispatch event", exc_info=e)
            await asyncio.sleep(0.1)
    except asyncio.CancelledError:
        logger.info("Redispatch consumer cancelled")
        await pubsub.unsubscribe("dispatch:redispatch_booking")
