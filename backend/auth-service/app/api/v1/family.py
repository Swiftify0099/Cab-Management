"""
Family & Shared Account API Routers.
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
from app.schemas.family import (
    FamilyCreate,
    FamilyResponse,
    FamilyMemberCreate,
    FamilyMemberUpdate,
    FamilyMemberResponse,
    FamilyPaymentUpdate,
)
from app.services.family_service import (
    get_or_create_family,
    get_family_by_organizer,
    add_family_member,
    update_family_member,
    remove_family_member,
    update_family_payment_settings,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get(
    "",
    response_model=APIResponse[FamilyResponse],
    summary="Get current user family account details",
)
async def get_my_family(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    family = await get_or_create_family(db, current_user._user)
    return APIResponse(message="Family details fetched", data=FamilyResponse.model_validate(family))


@router.post(
    "",
    response_model=APIResponse[FamilyResponse],
    summary="Create or update family profile",
    status_code=status.HTTP_201_CREATED,
)
async def create_family(
    data: FamilyCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    family = await get_or_create_family(db, current_user._user, data=data)
    return APIResponse(message="Family created successfully", data=FamilyResponse.model_validate(family))


@router.post(
    "/members",
    response_model=APIResponse[FamilyMemberResponse],
    summary="Add a family member to the account",
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    data: FamilyMemberCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await add_family_member(db, current_user._user, data)
    return APIResponse(message="Family member added", data=FamilyMemberResponse.model_validate(member))


@router.patch(
    "/members/{member_id}",
    response_model=APIResponse[FamilyMemberResponse],
    summary="Update family member permissions",
)
async def update_member(
    member_id: uuid.UUID,
    data: FamilyMemberUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await update_family_member(db, current_user._user, member_id, data)
    return APIResponse(message="Family member updated", data=FamilyMemberResponse.model_validate(member))


@router.delete(
    "/members/{member_id}",
    response_model=MessageResponse,
    summary="Remove a member from family",
)
async def remove_member(
    member_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await remove_family_member(db, current_user._user, member_id)
    return MessageResponse(message="Family member removed successfully")


@router.patch(
    "/payment-settings",
    response_model=APIResponse[FamilyResponse],
    summary="Update shared payment methods and limits",
)
async def update_payment_settings(
    data: FamilyPaymentUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    family = await update_family_payment_settings(db, current_user._user, data)
    return APIResponse(message="Family payment settings updated", data=FamilyResponse.model_validate(family))
