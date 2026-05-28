"""
Notification Service  Phase 9.
Sends FCM push notifications, SMS (stub), and in-app notifications.
Triggered by Redis pub/sub events from all services.
"""
from __future__ import annotations

import json
from typing import Optional
from uuid import UUID

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import Customer, Driver, Notification, NotificationType
from common.utils.redis_client import get_redis

logger = structlog.get_logger(__name__)

FCM_URL = "https://fcm.googleapis.com/fcm/send"


class NotificationService:
    def __init__(self, db: AsyncSession, fcm_server_key: str = ""):
        self.db = db
        self.fcm_key = fcm_server_key

    async def send_push(
        self,
        device_token: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> bool:
        """Send FCM push notification."""
        if not self.fcm_key or not device_token:
            logger.info("Push skipped (no FCM key or token)", title=title)
            return False

        payload = {
            "to": device_token,
            "notification": {"title": title, "body": body, "sound": "default"},
            "data": data or {},
            "priority": "high",
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(
                    FCM_URL,
                    json=payload,
                    headers={"Authorization": f"key={self.fcm_key}", "Content-Type": "application/json"},
                )
                success = res.status_code == 200
                logger.info("Push sent", title=title, success=success)
                return success
        except Exception as e:
            logger.error("Push failed", exc_info=e)
            return False

    async def save_notification(
        self,
        user_id: str,
        user_type: str,  # customer | driver | admin
        title: str,
        body: str,
        notification_type: str = "info",
        reference_id: Optional[str] = None,
    ) -> None:
        """Persist notification to DB for in-app notification center."""
        notif = Notification(
            user_id=UUID(user_id),
            user_type=user_type,
            title=title,
            body=body,
            notification_type=NotificationType(notification_type),
            reference_id=reference_id,
        )
        self.db.add(notif)
        await self.db.commit()

    async def get_user_notifications(self, user_id: str, unread_only: bool = False) -> list[dict]:
        """Get in-app notifications for a user."""
        from sqlalchemy import desc
        query = (
            select(Notification)
            .where(Notification.user_id == UUID(user_id))
            .order_by(desc(Notification.created_at))
            .limit(50)
        )
        if unread_only:
            query = query.where(Notification.is_read == False)
        result = await self.db.execute(query)
        notifs = result.scalars().all()
        return [
            {
                "id": str(n.id),
                "title": n.title,
                "body": n.body,
                "type": n.notification_type.value,
                "is_read": n.is_read,
                "reference_id": n.reference_id,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifs
        ]

    async def mark_read(self, notification_id: str, user_id: str) -> None:
        """Mark a notification as read."""
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == UUID(notification_id),
                Notification.user_id == UUID(user_id),
            )
        )
        notif = result.scalar_one_or_none()
        if notif:
            notif.is_read = True
            await self.db.commit()


#  Event Consumer 

# Notification templates for each event type
TEMPLATES = {
    "DRIVER_ACCEPTED": {
        "title": "Driver Found! ",
        "body": "Your driver is on the way. Track live in the app.",
    },
    "TRIP_STARTED": {
        "title": "Trip Started [YAY]",
        "body": "Your trip is underway. Have a safe journey!",
    },
    "PAYMENT_CAPTURED": {
        "title": "Payment Successful [OK]",
        "body": "Your payment was processed successfully.",
    },
    "PARCEL_STATUS_UPDATE": {
        "title": "Parcel Update [PKG]",
        "body": "Your parcel status has been updated.",
    },
    "EARNING_CREDITED": {
        "title": "Earning Credited ",
        "body": "Your trip earning has been added to your wallet.",
    },
    "INCOMING_TRIP_REQUEST": {
        "title": "New Trip Request! [BELL]",
        "body": "A customer wants you for a trip. Respond quickly!",
    },
    "SOS_ALERT": {
        "title": " Emergency Alert",
        "body": "SOS received during trip. Immediate action required.",
    },
}


async def consume_notification_events(db_factory, fcm_key: str):
    """
    Background consumer: listens to 'notification:events' Redis channel.
    Sends FCM + saves to DB for each event.
    """
    r = await get_redis()
    pubsub = r.pubsub()
    await pubsub.subscribe("notification:events")
    logger.info("[BELL] Notification consumer started")

    async for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            data = json.loads(message["data"])
            event = data.get("event", "")
            template = TEMPLATES.get(event, {"title": "Update", "body": data.get("message", "")})

            if data.get("user_id"):
                async with db_factory() as db:
                    svc = NotificationService(db, fcm_key)
                    # Save to DB
                    await svc.save_notification(
                        user_id=data["user_id"],
                        user_type=data.get("user_type", "customer"),
                        title=template["title"],
                        body=template["body"],
                        notification_type="info",
                        reference_id=data.get("booking_id") or data.get("trip_id"),
                    )
                    # Push if device token present
                    if data.get("device_token"):
                        await svc.send_push(
                            device_token=data["device_token"],
                            title=template["title"],
                            body=template["body"],
                            data=data,
                        )
        except Exception as e:
            logger.error("Notification consumer error", exc_info=e)
