"""
Family Service — Core business logic for Family and Shared Accounts.
Feature 1: Customer Core Account.
"""
import uuid
from typing import List, Optional
import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import FamilyAccount, FamilyMember, FamilyRole, User
from app.schemas.family import FamilyCreate, FamilyMemberCreate, FamilyMemberUpdate, FamilyPaymentUpdate

logger = structlog.get_logger(__name__)


async def get_family_by_organizer(db: AsyncSession, organizer_id: uuid.UUID) -> Optional[FamilyAccount]:
    stmt = (
        select(FamilyAccount)
        .where(FamilyAccount.organizer_id == organizer_id)
        .options(selectinload(FamilyAccount.members))
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def get_or_create_family(db: AsyncSession, user: User, data: Optional[FamilyCreate] = None) -> FamilyAccount:
    family = await get_family_by_organizer(db, user.id)
    if not family:
        family_name = data.family_name if data else f"{user.phone}'s Family"
        family = FamilyAccount(
            organizer_id=user.id,
            family_name=family_name,
            is_shared_payment_enabled=data.is_shared_payment_enabled if data else True,
            shared_payment_method=data.shared_payment_method if data else "wallet",
            monthly_spending_limit=data.monthly_spending_limit if data else None,
        )
        db.add(family)
        await db.flush()

        # Add organizer as primary organizer member
        org_member = FamilyMember(
            family_id=family.id,
            user_id=user.id,
            name="Organizer (Me)",
            phone=user.phone,
            relation="Organizer",
            role=FamilyRole.ORGANIZER,
            status="ACTIVE",
            can_use_shared_payment=True,
            can_book_rides=True,
            can_track_trips=True,
        )
        db.add(org_member)
        await db.commit()
        family = await get_family_by_organizer(db, user.id)

    return family


async def add_family_member(
    db: AsyncSession,
    user: User,
    data: FamilyMemberCreate,
) -> FamilyMember:
    family = await get_or_create_family(db, user)

    # Check member limit (Max 6)
    if len(family.members) >= 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Family account limit reached (Maximum 6 members allowed).",
        )

    # Clean phone
    phone_clean = data.phone.strip()
    for m in family.members:
        if m.phone == phone_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A member with this phone number already exists in your family.",
            )

    # Check if a user with this phone already exists in DB
    u_stmt = select(User).where(User.phone == phone_clean)
    u_res = await db.execute(u_stmt)
    matching_user = u_res.scalar_one_or_none()

    member = FamilyMember(
        family_id=family.id,
        user_id=matching_user.id if matching_user else None,
        name=data.name.strip(),
        phone=phone_clean,
        relation=data.relationship.strip() if data.relationship else "Family Member",
        role=FamilyRole.MEMBER,
        status="ACTIVE",
        can_use_shared_payment=data.can_use_shared_payment,
        can_book_rides=data.can_book_rides,
        can_track_trips=data.can_track_trips,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    logger.info("Family member added", family_id=str(family.id), member_id=str(member.id), phone=phone_clean)
    return member


async def update_family_member(
    db: AsyncSession,
    user: User,
    member_id: uuid.UUID,
    data: FamilyMemberUpdate,
) -> FamilyMember:
    family = await get_family_by_organizer(db, user.id)
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family account not found")

    stmt = select(FamilyMember).where(FamilyMember.id == member_id, FamilyMember.family_id == family.id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")

    if member.role == FamilyRole.ORGANIZER:
        # Don't allow demoting organizer here
        pass

    if data.name is not None:
        member.name = data.name.strip()
    if data.relationship is not None:
        member.relation = data.relationship.strip()
    if data.can_use_shared_payment is not None:
        member.can_use_shared_payment = data.can_use_shared_payment
    if data.can_book_rides is not None:
        member.can_book_rides = data.can_book_rides
    if data.can_track_trips is not None:
        member.can_track_trips = data.can_track_trips
    if data.status is not None:
        member.status = data.status

    await db.commit()
    await db.refresh(member)
    return member


async def remove_family_member(
    db: AsyncSession,
    user: User,
    member_id: uuid.UUID,
) -> None:
    family = await get_family_by_organizer(db, user.id)
    if not family:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family account not found")

    stmt = select(FamilyMember).where(FamilyMember.id == member_id, FamilyMember.family_id == family.id)
    res = await db.execute(stmt)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family member not found")

    if member.role == FamilyRole.ORGANIZER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove family organizer.")

    await db.delete(member)
    await db.commit()
    logger.info("Family member removed", family_id=str(family.id), member_id=str(member_id))


async def update_family_payment_settings(
    db: AsyncSession,
    user: User,
    data: FamilyPaymentUpdate,
) -> FamilyAccount:
    family = await get_or_create_family(db, user)
    if data.is_shared_payment_enabled is not None:
        family.is_shared_payment_enabled = data.is_shared_payment_enabled
    if data.shared_payment_method is not None:
        family.shared_payment_method = data.shared_payment_method
    if data.monthly_spending_limit is not None:
        family.monthly_spending_limit = data.monthly_spending_limit

    await db.commit()
    await db.refresh(family)
    return family
