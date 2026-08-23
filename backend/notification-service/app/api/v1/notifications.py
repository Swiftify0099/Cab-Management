"""
Feature 24: Unified Notification Center API Router
Handles customer notification feed, unread badge counters, mark as read, dismissal, and deep-link routing.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update, delete, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import async_session_maker
from common.models.all_models import Notification, NotificationType

router = APIRouter()


async def get_db():
    async with async_session_maker() as session:
        yield session


class _FakeUser:
    id = uuid.UUID("475d2f54-8a10-4e18-ab48-e877447bc9b6")


async def get_current_user() -> _FakeUser:
    return _FakeUser()


# ── Schemas ───────────────────────────────────────────────────────────────────

class NotificationSimulateRequest(BaseModel):
    title: str
    body: str
    notification_type: str = "BOOKING"  # BOOKING, PAYMENT, PROMOTION, SOS, SYSTEM, etc.
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    deep_link: Optional[str] = None
    priority: str = "NORMAL"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", summary="Get notification feed with optional category filter")
async def get_notifications(
    category: Optional[str] = Query(None, description="Filter by notification_type"),
    unread_only: bool = Query(False, description="Filter unread only"),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve customer's notification feed with unread count."""
    q = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        q = q.where(Notification.is_read == False)
    if category:
        try:
            nt = NotificationType(category.lower())
            q = q.where(Notification.notification_type == nt)
        except Exception:
            pass

    q = q.order_by(desc(Notification.created_at)).offset(offset).limit(limit)
    result = await db.execute(q)
    notifs = result.scalars().all()

    # Unread counter
    unread_q = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    )
    unread_res = await db.execute(unread_q)
    unread_count = unread_res.scalar_one_or_none() or 0

    items = [
        {
            "id": str(n.id),
            "title": n.title,
            "body": n.body,
            "notification_type": n.notification_type.value if hasattr(n.notification_type, "value") else str(n.notification_type),
            "is_read": n.is_read,
            "read_at": n.read_at.isoformat() if n.read_at else None,
            "created_at": n.created_at.isoformat() if n.created_at else datetime.now(timezone.utc).isoformat(),
            "reference_type": getattr(n, "reference_type", None) or (n.data.get("reference_type") if n.data else None),
            "reference_id": getattr(n, "reference_id", None) or (n.data.get("reference_id") if n.data else None),
            "deep_link": getattr(n, "deep_link", None) or (n.data.get("deep_link") if n.data else None),
            "priority": getattr(n, "priority", "normal") or (n.data.get("priority") if n.data else "normal"),
            "data": n.data or {},
        }
        for n in notifs
    ]

    return {
        "data": items,
        "total": len(items),
        "unread_count": unread_count,
        "limit": limit,
        "offset": offset,
    }


@router.get("/unread-count", summary="Get unread notification count for header badge")
async def get_unread_count(
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns badge count for the app header notification bell."""
    unread_q = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    )
    unread_res = await db.execute(unread_q)
    count = unread_res.scalar_one_or_none() or 0
    return {"unread_count": count}


@router.post("/{notification_id}/read", summary="Mark single notification as read")
async def mark_notification_read(
    notification_id: str,
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark single notification read."""
    notif = await db.get(Notification, uuid.UUID(notification_id))
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    await db.commit()

    return {"message": "Notification marked as read", "notification_id": notification_id}


@router.post("/mark-all-read", summary="Mark all notifications as read")
async def mark_all_notifications_read(
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all unread notifications read for the customer."""
    stmt = (
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.execute(stmt)
    await db.commit()

    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}", summary="Delete/Dismiss notification")
async def delete_notification(
    notification_id: str,
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dismiss/delete a notification from the feed."""
    notif = await db.get(Notification, uuid.UUID(notification_id))
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    await db.delete(notif)
    await db.commit()

    return {"message": "Notification dismissed", "deleted_id": notification_id}


@router.post("/simulate", status_code=status.HTTP_201_CREATED, summary="Simulate an in-app & push notification (Dev Mode)")
async def simulate_notification(
    req: NotificationSimulateRequest,
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Simulate push notification creation for testing."""
    notif_type = NotificationType.BOOKING
    try:
        notif_type = NotificationType(req.notification_type.lower())
    except Exception:
        pass

    notif = Notification(
        id=uuid.uuid4(),
        user_id=current_user.id,
        title=req.title,
        body=req.body,
        notification_type=notif_type,
        data={"simulated": True},
        is_read=False,
        reference_type=req.reference_type,
        reference_id=req.reference_id,
        deep_link=req.deep_link,
        priority=req.priority,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    return {
        "data": {
            "id": str(notif.id),
            "title": notif.title,
            "body": notif.body,
            "deep_link": notif.deep_link,
        },
        "message": "Notification simulated successfully",
    }
