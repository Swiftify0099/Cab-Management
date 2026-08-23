"""
Emergency Service — Customer Emergency & Trusted Contacts Management.
Feature 1: Customer Core Account.
"""
import uuid
from typing import List, Optional
import structlog
from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import CustomerEmergencyContact, User
from app.schemas.emergency import EmergencyContactCreate, EmergencyContactUpdate

logger = structlog.get_logger(__name__)


async def list_emergency_contacts(db: AsyncSession, user_id: uuid.UUID) -> List[CustomerEmergencyContact]:
    stmt = (
        select(CustomerEmergencyContact)
        .where(CustomerEmergencyContact.user_id == user_id)
        .order_by(CustomerEmergencyContact.is_primary.desc(), CustomerEmergencyContact.created_at.asc())
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def create_emergency_contact(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: EmergencyContactCreate,
) -> CustomerEmergencyContact:
    contacts = await list_emergency_contacts(db, user_id)
    if len(contacts) >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 5 emergency contacts allowed.",
        )

    # If first contact, make primary automatically
    is_primary = data.is_primary or (len(contacts) == 0)

    if is_primary:
        # Demote existing primaries
        await db.execute(
            update(CustomerEmergencyContact)
            .where(CustomerEmergencyContact.user_id == user_id)
            .values(is_primary=False)
        )

    contact = CustomerEmergencyContact(
        user_id=user_id,
        name=data.name.strip(),
        phone=data.phone.strip(),
        relation=data.relationship.strip() if data.relationship else "Friend",
        is_primary=is_primary,
        auto_share_rides=data.auto_share_rides,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    logger.info("Emergency contact created", user_id=str(user_id), contact_id=str(contact.id))
    return contact


async def update_emergency_contact(
    db: AsyncSession,
    user_id: uuid.UUID,
    contact_id: uuid.UUID,
    data: EmergencyContactUpdate,
) -> CustomerEmergencyContact:
    stmt = select(CustomerEmergencyContact).where(
        CustomerEmergencyContact.id == contact_id,
        CustomerEmergencyContact.user_id == user_id,
    )
    res = await db.execute(stmt)
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency contact not found")

    if data.is_primary is True:
        await db.execute(
            update(CustomerEmergencyContact)
            .where(CustomerEmergencyContact.user_id == user_id)
            .values(is_primary=False)
        )
        contact.is_primary = True
    elif data.is_primary is False:
        contact.is_primary = False

    if data.name is not None:
        contact.name = data.name.strip()
    if data.phone is not None:
        contact.phone = data.phone.strip()
    if data.relationship is not None:
        contact.relation = data.relationship.strip()
    if data.auto_share_rides is not None:
        contact.auto_share_rides = data.auto_share_rides

    await db.commit()
    await db.refresh(contact)
    return contact


async def delete_emergency_contact(
    db: AsyncSession,
    user_id: uuid.UUID,
    contact_id: uuid.UUID,
) -> None:
    stmt = select(CustomerEmergencyContact).where(
        CustomerEmergencyContact.id == contact_id,
        CustomerEmergencyContact.user_id == user_id,
    )
    res = await db.execute(stmt)
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Emergency contact not found")

    await db.delete(contact)
    await db.commit()
    logger.info("Emergency contact deleted", user_id=str(user_id), contact_id=str(contact_id))
