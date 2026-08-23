"""
Customer Settings & Session Service.
Feature 1: Customer Core Account.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional
import structlog
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import CustomerAppSetting, RefreshToken, User
from app.schemas.customer_settings import CustomerSettingsResponse, CustomerSettingsUpdate, SessionResponse

logger = structlog.get_logger(__name__)


async def get_or_create_customer_settings(db: AsyncSession, user: User) -> CustomerAppSetting:
    stmt = select(CustomerAppSetting).where(CustomerAppSetting.user_id == user.id)
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()
    if not setting:
        setting = CustomerAppSetting(
            user_id=user.id,
            notifications_ride_updates=True,
            notifications_driver_arrival=True,
            notifications_promotions=True,
            notifications_security_alerts=True,
            privacy_location_sharing=True,
            privacy_family_trip_tracking=True,
            privacy_personalized_ads=False,
        )
        db.add(setting)
        await db.commit()
        await db.refresh(setting)
    return setting


async def update_customer_settings(
    db: AsyncSession,
    user: User,
    data: CustomerSettingsUpdate,
) -> CustomerAppSetting:
    setting = await get_or_create_customer_settings(db, user)

    if data.notifications_ride_updates is not None:
        setting.notifications_ride_updates = data.notifications_ride_updates
    if data.notifications_driver_arrival is not None:
        setting.notifications_driver_arrival = data.notifications_driver_arrival
    if data.notifications_promotions is not None:
        setting.notifications_promotions = data.notifications_promotions
    if data.notifications_security_alerts is not None:
        setting.notifications_security_alerts = data.notifications_security_alerts
    if data.privacy_location_sharing is not None:
        setting.privacy_location_sharing = data.privacy_location_sharing
    if data.privacy_family_trip_tracking is not None:
        setting.privacy_family_trip_tracking = data.privacy_family_trip_tracking
    if data.privacy_personalized_ads is not None:
        setting.privacy_personalized_ads = data.privacy_personalized_ads

    if data.language is not None:
        user.language = data.language
        await db.flush()

    await db.commit()
    await db.refresh(setting)
    return setting


async def list_user_sessions(db: AsyncSession, user_id: uuid.UUID) -> List[RefreshToken]:
    now = datetime.now(timezone.utc)
    stmt = (
        select(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,
            RefreshToken.expires_at > now,
        )
        .order_by(RefreshToken.created_at.desc())
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def revoke_session(db: AsyncSession, user_id: uuid.UUID, session_id: uuid.UUID) -> None:
    stmt = select(RefreshToken).where(RefreshToken.id == session_id, RefreshToken.user_id == user_id)
    res = await db.execute(stmt)
    token_record = res.scalar_one_or_none()
    if not token_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    token_record.is_revoked = True
    await db.commit()
    logger.info("Session revoked", user_id=str(user_id), session_id=str(session_id))


async def revoke_all_sessions(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id)
        .values(is_revoked=True)
    )
    await db.commit()
    logger.info("All sessions revoked", user_id=str(user_id))


async def delete_customer_account(
    db: AsyncSession,
    user: User,
    reason: Optional[str] = None,
) -> None:
    """
    Soft-delete customer account with session purge and status deactivation.
    """
    user.is_deleted = True
    user.is_active = False
    await revoke_all_sessions(db, user.id)
    await db.commit()
    logger.warn("Customer account deleted (soft)", user_id=str(user.id), reason=reason)
