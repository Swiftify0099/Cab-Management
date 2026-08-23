"""
Customer Settings, Sessions & Account Deletion API Routers.
Feature 1: Customer Core Account.
"""
import uuid
from typing import List
import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_user
from common.schemas.response import APIResponse, MessageResponse
from app.schemas.customer_settings import (
    CustomerSettingsResponse,
    CustomerSettingsUpdate,
    SessionResponse,
    AccountDeletionRequest,
)
from app.services.customer_settings_service import (
    get_or_create_customer_settings,
    update_customer_settings,
    list_user_sessions,
    revoke_session,
    revoke_all_sessions,
    delete_customer_account,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get(
    "",
    response_model=APIResponse[CustomerSettingsResponse],
    summary="Get customer privacy and notification preferences",
)
async def get_settings(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    setting = await get_or_create_customer_settings(db, current_user._user)
    resp = CustomerSettingsResponse(
        user_id=setting.user_id,
        notifications_ride_updates=setting.notifications_ride_updates,
        notifications_driver_arrival=setting.notifications_driver_arrival,
        notifications_promotions=setting.notifications_promotions,
        notifications_security_alerts=setting.notifications_security_alerts,
        privacy_location_sharing=setting.privacy_location_sharing,
        privacy_family_trip_tracking=setting.privacy_family_trip_tracking,
        privacy_personalized_ads=setting.privacy_personalized_ads,
        language=current_user._user.language,
    )
    return APIResponse(message="Settings fetched", data=resp)


@router.patch(
    "",
    response_model=APIResponse[CustomerSettingsResponse],
    summary="Update customer privacy and notification preferences",
)
async def update_settings(
    data: CustomerSettingsUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    setting = await update_customer_settings(db, current_user._user, data)
    resp = CustomerSettingsResponse(
        user_id=setting.user_id,
        notifications_ride_updates=setting.notifications_ride_updates,
        notifications_driver_arrival=setting.notifications_driver_arrival,
        notifications_promotions=setting.notifications_promotions,
        notifications_security_alerts=setting.notifications_security_alerts,
        privacy_location_sharing=setting.privacy_location_sharing,
        privacy_family_trip_tracking=setting.privacy_family_trip_tracking,
        privacy_personalized_ads=setting.privacy_personalized_ads,
        language=current_user._user.language,
    )
    return APIResponse(message="Settings updated", data=resp)


@router.get(
    "/sessions",
    response_model=APIResponse[List[SessionResponse]],
    summary="List active sessions for current user",
)
async def get_sessions(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sessions = await list_user_sessions(db, current_user.id)
    data = [
        SessionResponse(
            id=s.id,
            device_id=s.device_id,
            device_name=s.device_name,
            ip_address=s.ip_address,
            is_current=False,
            created_at=s.created_at,
            expires_at=s.expires_at,
        )
        for s in sessions
    ]
    return APIResponse(message="Sessions fetched", data=data)


@router.delete(
    "/sessions/{session_id}",
    response_model=MessageResponse,
    summary="Revoke a specific session",
)
async def revoke_user_session(
    session_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await revoke_session(db, current_user.id, session_id)
    return MessageResponse(message="Session revoked successfully")


@router.post(
    "/sessions/revoke-all",
    response_model=MessageResponse,
    summary="Revoke all active sessions (logout everywhere)",
)
async def revoke_all_user_sessions(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await revoke_all_sessions(db, current_user.id)
    return MessageResponse(message="All sessions revoked")


@router.post(
    "/account/delete",
    response_model=MessageResponse,
    summary="Request customer account deletion",
)
async def delete_account(
    payload: AccountDeletionRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not payload.confirmation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation required for account deletion.",
        )
    await delete_customer_account(db, current_user._user, payload.reason)
    return MessageResponse(message="Account successfully deleted and deactivated.")
