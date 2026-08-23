"""
Customer Emergency Contacts API Routers.
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
from app.schemas.emergency import (
    EmergencyContactCreate,
    EmergencyContactUpdate,
    EmergencyContactResponse,
)
from app.services.emergency_service import (
    list_emergency_contacts,
    create_emergency_contact,
    update_emergency_contact,
    delete_emergency_contact,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get(
    "",
    response_model=APIResponse[List[EmergencyContactResponse]],
    summary="List all emergency contacts for current customer",
)
async def get_emergency_contacts(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contacts = await list_emergency_contacts(db, current_user.id)
    data = [EmergencyContactResponse.model_validate(c) for c in contacts]
    return APIResponse(message="Emergency contacts fetched", data=data)


@router.post(
    "",
    response_model=APIResponse[EmergencyContactResponse],
    summary="Add a new emergency contact",
    status_code=status.HTTP_201_CREATED,
)
async def add_contact(
    data: EmergencyContactCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await create_emergency_contact(db, current_user.id, data)
    return APIResponse(message="Emergency contact added", data=EmergencyContactResponse.model_validate(contact))


@router.patch(
    "/{contact_id}",
    response_model=APIResponse[EmergencyContactResponse],
    summary="Update an emergency contact",
)
async def update_contact(
    contact_id: uuid.UUID,
    data: EmergencyContactUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contact = await update_emergency_contact(db, current_user.id, contact_id, data)
    return APIResponse(message="Emergency contact updated", data=EmergencyContactResponse.model_validate(contact))


@router.delete(
    "/{contact_id}",
    response_model=MessageResponse,
    summary="Delete an emergency contact",
)
async def delete_contact(
    contact_id: uuid.UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_emergency_contact(db, current_user.id, contact_id)
    return MessageResponse(message="Emergency contact deleted successfully")
