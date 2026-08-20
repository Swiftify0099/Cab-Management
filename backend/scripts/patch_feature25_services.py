import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
services_dir = os.path.join(backend_root, "matching-service", "app", "services")
target_service_file = os.path.join(services_dir, "notification_center_service.py")

service_code = '''"""
Authoritative Notification Center & Driver Preferences Service for CabBooking.
Features:
- Unified In-App Notification Feed across 7 Categories
- Unread Counter & Badge Engine
- Single & Bulk Mark-as-Read Actions
- Actionable Deep Link Routing
- Push Notification History Log
- Granular Driver Notification Preferences Management
- Developer Mode Sandbox Simulator
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from sqlalchemy import select, and_, or_, func, desc, update, delete, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User,
    Driver,
    Notification,
    NotificationType,
    DriverNotificationPreference,
)


class NotificationCenterService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # =========================================================================
    # 1. NOTIFICATION FEED & UNREAD COUNTERS
    # =========================================================================
    async def get_notifications(
        self,
        user_id: uuid.UUID,
        category: Optional[str] = None,
        is_unread_only: bool = False,
        limit: int = 30,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Returns paginated notification feed strictly scoped to authenticated user.
        """
        stmt = select(Notification).where(Notification.user_id == user_id)

        if is_unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))

        if category and category.upper() != "ALL":
            cat_map = {
                "TRIP": NotificationType.BOOKING,
                "BOOKING": NotificationType.BOOKING,
                "EARNINGS": NotificationType.PAYMENT,
                "PAYMENT": NotificationType.PAYMENT,
                "PAYOUT": NotificationType.PAYMENT,
                "PROMOTIONS": NotificationType.PROMOTION,
                "PROMOTION": NotificationType.PROMOTION,
                "SAFETY": NotificationType.SOS,
                "SOS": NotificationType.SOS,
                "ACCOUNT": NotificationType.DRIVER,
                "DRIVER": NotificationType.DRIVER,
                "SYSTEM": NotificationType.SYSTEM,
            }
            enum_val = cat_map.get(category.upper())
            if enum_val:
                stmt = stmt.where(Notification.notification_type == enum_val)

        stmt = stmt.order_by(desc(Notification.created_at)).limit(limit).offset(offset)
        res = await self.session.execute(stmt)
        notifs = res.scalars().all()

        unread_count = await self.get_unread_count(user_id)

        return {
            "total": len(notifs),
            "unread_count": unread_count,
            "notifications": [
                {
                    "id": str(n.id),
                    "title": n.title,
                    "body": n.body,
                    "notification_type": n.notification_type.value if hasattr(n.notification_type, "value") else str(n.notification_type).upper(),
                    "category": n.notification_type.value if hasattr(n.notification_type, "value") else str(n.notification_type).upper(),
                    "data": n.data or {},
                    "deep_link": (n.data or {}).get("deep_link", ""),
                    "is_read": n.is_read,
                    "read_at": n.read_at.isoformat() if n.read_at else None,
                    "created_at": n.created_at.isoformat() if n.created_at else None,
                }
                for n in notifs
            ]
        }

    async def get_unread_count(self, user_id: uuid.UUID) -> int:
        """
        Calculates active unread notification counter for driver badge.
        """
        stmt = select(func.count(Notification.id)).where(
            and_(
                Notification.user_id == user_id,
                Notification.is_read.is_(False)
            )
        )
        res = await self.session.execute(stmt)
        return res.scalar() or 0

    # =========================================================================
    # 2. READ & DISMISS ACTIONS
    # =========================================================================
    async def mark_as_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> Dict[str, Any]:
        """
        Marks single notification as read with ownership validation.
        """
        stmt = select(Notification).where(Notification.id == notification_id)
        res = await self.session.execute(stmt)
        notif = res.scalar_one_or_none()
        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found")

        if notif.user_id != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot modify this notification")

        now = datetime.now(timezone.utc)
        notif.is_read = True
        notif.read_at = now
        await self.session.commit()

        unread = await self.get_unread_count(user_id)
        return {
            "success": True,
            "notification_id": str(notification_id),
            "is_read": True,
            "read_at": now.isoformat(),
            "unread_count": unread
        }

    async def mark_all_as_read(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Bulk marks all notifications for authenticated user as read.
        """
        now = datetime.now(timezone.utc)
        stmt = update(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.is_read.is_(False)
            )
        ).values(is_read=True, read_at=now)

        await self.session.execute(stmt)
        await self.session.commit()

        return {
            "success": True,
            "message": "All notifications marked as read.",
            "unread_count": 0
        }

    async def delete_notification(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> Dict[str, Any]:
        """
        Dismisses / deletes a notification for the driver.
        """
        stmt = select(Notification).where(Notification.id == notification_id)
        res = await self.session.execute(stmt)
        notif = res.scalar_one_or_none()
        if not notif:
            raise HTTPException(status_code=404, detail="Notification not found")

        if notif.user_id != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot delete this notification")

        await self.session.delete(notif)
        await self.session.commit()

        unread = await self.get_unread_count(user_id)
        return {"success": True, "unread_count": unread}

    # =========================================================================
    # 3. NOTIFICATION DISPATCH (INTERNAL & PUSH LOG)
    # =========================================================================
    async def create_notification(
        self,
        user_id: uuid.UUID,
        title: str,
        body: str,
        notification_type: str = "SYSTEM",
        data: Optional[Dict[str, Any]] = None,
        fcm_message_id: Optional[str] = None
    ) -> Notification:
        """
        Creates an authoritative in-app notification entry.
        """
        now = datetime.now(timezone.utc)

        # Normalize notification type enum
        notif_enum = NotificationType.SYSTEM
        type_str = notification_type.lower()
        if type_str in ["trip", "booking"]:
            notif_enum = NotificationType.BOOKING
        elif type_str in ["driver", "account"]:
            notif_enum = NotificationType.DRIVER
        elif type_str in ["payment", "earnings", "payout"]:
            notif_enum = NotificationType.PAYMENT
        elif type_str in ["promotion", "promotions"]:
            notif_enum = NotificationType.PROMOTION
        elif type_str in ["sos", "safety"]:
            notif_enum = NotificationType.SOS

        notif = Notification(
            id=uuid.uuid4(),
            user_id=user_id,
            title=title,
            body=body,
            notification_type=notif_enum,
            data=data or {},
            is_read=False,
            read_at=None,
            fcm_message_id=fcm_message_id or f"fcm_{uuid.uuid4().hex[:12]}",
            created_at=now,
            updated_at=now
        )
        self.session.add(notif)
        await self.session.commit()
        return notif

    # =========================================================================
    # 4. DRIVER NOTIFICATION PREFERENCES
    # =========================================================================
    async def get_preferences(self, driver_id: uuid.UUID) -> Dict[str, Any]:
        """
        Fetches driver notification category preferences.
        """
        stmt = select(DriverNotificationPreference).where(DriverNotificationPreference.driver_id == driver_id)
        res = await self.session.execute(stmt)
        pref = res.scalar_one_or_none()

        if not pref:
            # Create default preferences
            pref = DriverNotificationPreference(
                id=uuid.uuid4(),
                driver_id=driver_id,
                trip_alerts=True,
                earnings_alerts=True,
                payout_alerts=True,
                safety_alerts=True,
                promotions_alerts=True,
                sound_enabled=True,
                vibration_enabled=True
            )
            self.session.add(pref)
            await self.session.commit()

        return {
            "driver_id": str(driver_id),
            "trip_alerts": pref.trip_alerts,
            "earnings_alerts": pref.earnings_alerts,
            "payout_alerts": pref.payout_alerts,
            "safety_alerts": pref.safety_alerts,
            "promotions_alerts": pref.promotions_alerts,
            "sound_enabled": pref.sound_enabled,
            "vibration_enabled": pref.vibration_enabled
        }

    async def update_preferences(self, driver_id: uuid.UUID, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Updates driver notification preferences.
        """
        stmt = select(DriverNotificationPreference).where(DriverNotificationPreference.driver_id == driver_id)
        res = await self.session.execute(stmt)
        pref = res.scalar_one_or_none()

        if not pref:
            pref = DriverNotificationPreference(id=uuid.uuid4(), driver_id=driver_id)
            self.session.add(pref)

        if "trip_alerts" in payload:
            pref.trip_alerts = bool(payload["trip_alerts"])
        if "earnings_alerts" in payload:
            pref.earnings_alerts = bool(payload["earnings_alerts"])
        if "payout_alerts" in payload:
            pref.payout_alerts = bool(payload["payout_alerts"])
        if "safety_alerts" in payload:
            pref.safety_alerts = bool(payload["safety_alerts"])
        if "promotions_alerts" in payload:
            pref.promotions_alerts = bool(payload["promotions_alerts"])
        if "sound_enabled" in payload:
            pref.sound_enabled = bool(payload["sound_enabled"])
        if "vibration_enabled" in payload:
            pref.vibration_enabled = bool(payload["vibration_enabled"])

        await self.session.commit()
        return await self.get_preferences(driver_id)

    # =========================================================================
    # 5. DEVELOPER SANDBOX SIMULATION
    # =========================================================================
    async def simulate_dev_scenario(
        self,
        user_id: uuid.UUID,
        scenario_key: str
    ) -> Dict[str, Any]:
        """
        Controlled sandbox simulator for testing 5 notification triggers.
        """
        if scenario_key == "TRIP_ALERT":
            notif = await self.create_notification(
                user_id=user_id,
                title="🚖 New Trip Assigned!",
                body="You have a new airport pickup request near Viman Nagar. Estimated fare: ₹480.",
                notification_type="TRIP",
                data={"deep_link": "/(tabs)", "trip_id": "sim_trip_101"}
            )
            return {"scenario": scenario_key, "message": "Dispatched sample Trip notification.", "id": str(notif.id)}

        elif scenario_key == "PAYOUT_ALERT":
            notif = await self.create_notification(
                user_id=user_id,
                title="💰 Payout Successful!",
                body="Instant withdrawal of ₹2,500.00 has been credited to your HDFC Bank account.",
                notification_type="PAYMENT",
                data={"deep_link": "/wallet/history", "payout_ref": "PAY-20260820-9942"}
            )
            return {"scenario": scenario_key, "message": "Dispatched sample Payout notification.", "id": str(notif.id)}

        elif scenario_key == "SAFETY_ALERT":
            notif = await self.create_notification(
                user_id=user_id,
                title="🛡️ Safety Check-In",
                body="Route deviation detected on your active trip. Please confirm you are safe.",
                notification_type="SOS",
                data={"deep_link": "/safety/alerts", "severity": "WARNING"}
            )
            return {"scenario": scenario_key, "message": "Dispatched sample Safety notification.", "id": str(notif.id)}

        elif scenario_key == "PROMOTION_ALERT":
            notif = await self.create_notification(
                user_id=user_id,
                title="🔥 Weekend Quest Active!",
                body="Complete 8 trips between 5 PM and 10 PM today to earn an extra ₹600 cash bonus.",
                notification_type="PROMOTION",
                data={"deep_link": "/partner/incentives", "quest_id": "weekend_surge"}
            )
            return {"scenario": scenario_key, "message": "Dispatched sample Promotion notification.", "id": str(notif.id)}

        elif scenario_key == "CLEAR_ALL":
            await self.session.execute(delete(Notification).where(Notification.user_id == user_id))
            await self.session.commit()
            return {"scenario": scenario_key, "message": "Cleared all notifications for test user."}

        return {"scenario": scenario_key, "message": "Scenario executed."}
'''

with open(target_service_file, "w", encoding="utf-8") as f:
    f.write(service_code)

print(f"✓ Successfully wrote {target_service_file}")
