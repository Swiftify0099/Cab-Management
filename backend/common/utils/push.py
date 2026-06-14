import structlog
import httpx
from typing import List, Dict, Any, Optional

logger = structlog.get_logger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    sound: str = "default"
) -> bool:
    """
    Send a push notification via Expo Push API.
    """
    if not token or not token.startswith("ExponentPushToken"):
        logger.warning("Invalid or missing Expo push token", token=token)
        return False

    message = {
        "to": token,
        "sound": sound,
        "title": title,
        "body": body,
        "data": data or {}
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(EXPO_PUSH_URL, json=message, timeout=5.0)
            if response.status_code == 200:
                logger.info("Push notification sent", token=token, title=title)
                return True
            else:
                logger.error("Failed to send push notification", status_code=response.status_code, text=response.text)
                return False
    except Exception as e:
        logger.exception("Error sending push notification", error=str(e))
        return False


async def send_push_notifications_bulk(messages: List[Dict[str, Any]]) -> bool:
    """
    Send multiple push notifications via Expo Push API.
    Each message must have 'to' (token), 'title', 'body', etc.
    """
    valid_messages = [m for m in messages if m.get("to") and m["to"].startswith("ExponentPushToken")]
    if not valid_messages:
        return False

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(EXPO_PUSH_URL, json=valid_messages, timeout=10.0)
            if response.status_code == 200:
                logger.info("Bulk push notifications sent", count=len(valid_messages))
                return True
            else:
                logger.error("Failed to send bulk push notifications", status=response.status_code, text=response.text)
                return False
    except Exception as e:
        logger.exception("Error sending bulk push notifications", error=str(e))
        return False
