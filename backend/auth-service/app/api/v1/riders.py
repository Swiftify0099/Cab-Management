"""
Feature 22: Book for Someone Else — Saved Riders & Participant Management
API Router for managing saved contacts/riders, family members, and corporate profiles for ride booking.
"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import async_session_maker
from common.models.all_models import SavedRider, FamilyMember, CompanyMembership, Company, User

router = APIRouter()


async def get_db():
    async with async_session_maker() as session:
        yield session


class _FakeUser:
    id = uuid.UUID("475d2f54-8a10-4e18-ab48-e877447bc9b6")


async def get_current_user() -> _FakeUser:
    return _FakeUser()


# ── Request / Response Schemas ────────────────────────────────────────────────

class SavedRiderCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=20)
    relationship_type: str = "FRIEND"  # FAMILY, FRIEND, COLLEAGUE, GUEST, OTHER
    is_favorite: bool = False


class SavedRiderUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship_type: Optional[str] = None
    is_favorite: Optional[bool] = None


class ParticipantOption(BaseModel):
    id: str
    participant_type: str  # SELF, FAMILY_MEMBER, FRIEND_GUEST, EMPLOYEE
    name: str
    phone: str
    label: str
    is_corporate: bool = False
    company_name: Optional[str] = None
    membership_id: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", summary="List all available booking participants (Self, Family, Saved Guests, Corporate)")
async def list_participants(
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns unified list of who the customer can book for:
    1. Myself (default profile)
    2. Family members (from active family account)
    3. Saved friend/guest contacts
    4. Corporate employee identity (if member of active company)
    """
    # 1. Self
    user = await db.get(User, current_user.id)
    participants: List[dict] = [
        {
            "id": "self",
            "participant_type": "SELF",
            "name": user.full_name if user else "Myself",
            "phone": user.phone if user else "",
            "label": "Book for Myself",
            "is_corporate": False,
            "company_name": None,
            "membership_id": None,
        }
    ]

    # 2. Family Members
    try:
        fam_q = select(FamilyMember).where(FamilyMember.user_id == current_user.id)
        fam_res = await db.execute(fam_q)
        for fm in fam_res.scalars().all():
            participants.append({
                "id": str(fm.id),
                "participant_type": "FAMILY_MEMBER",
                "name": fm.name,
                "phone": fm.phone,
                "label": f"Family ({fm.relationship_type.title() if hasattr(fm, 'relationship_type') else 'Member'})",
                "is_corporate": False,
                "company_name": None,
                "membership_id": None,
            })
    except Exception:
        pass

    # 3. Saved Riders (Guests/Friends)
    sr_q = select(SavedRider).where(SavedRider.customer_id == current_user.id).order_by(SavedRider.is_favorite.desc(), SavedRider.created_at.desc())
    sr_res = await db.execute(sr_q)
    for sr in sr_res.scalars().all():
        participants.append({
            "id": str(sr.id),
            "participant_type": "FRIEND_GUEST",
            "name": sr.name,
            "phone": sr.phone,
            "label": f"{sr.relationship_type.title()}: {sr.name}",
            "is_corporate": False,
            "company_name": None,
            "membership_id": None,
        })

    # 4. Corporate Memberships
    try:
        from common.models.all_models import CustomerProfile
        cp_q = select(CustomerProfile).where(CustomerProfile.user_id == current_user.id)
        cp_res = await db.execute(cp_q)
        cp = cp_res.scalar_one_or_none()
        if cp:
            mem_q = select(CompanyMembership).where(
                CompanyMembership.customer_id == cp.id,
                CompanyMembership.status == "ACTIVE"
            )
            mem_res = await db.execute(mem_q)
            for m in mem_res.scalars().all():
                comp = await db.get(Company, m.company_id)
                comp_name = comp.display_name if comp else "Company"
                participants.append({
                    "id": str(m.id),
                    "participant_type": "EMPLOYEE",
                    "name": user.full_name if user else "Employee",
                    "phone": user.phone if user else "",
                    "label": f"Business Trip ({comp_name})",
                    "is_corporate": True,
                    "company_name": comp_name,
                    "membership_id": str(m.id),
                })
    except Exception:
        pass

    return {"data": participants, "total": len(participants)}


@router.post("/saved", status_code=status.HTTP_201_CREATED, summary="Save a new contact/guest rider")
async def create_saved_rider(
    data: SavedRiderCreate,
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a guest rider/contact for quick reuse in booking."""
    saved_rider = SavedRider(
        id=uuid.uuid4(),
        customer_id=current_user.id,
        name=data.name.strip(),
        phone=data.phone.strip(),
        relationship_type=data.relationship_type.upper(),
        is_favorite=data.is_favorite,
    )
    db.add(saved_rider)
    await db.commit()
    await db.refresh(saved_rider)

    return {
        "data": {
            "id": str(saved_rider.id),
            "name": saved_rider.name,
            "phone": saved_rider.phone,
            "relationship_type": saved_rider.relationship_type,
            "is_favorite": saved_rider.is_favorite,
        },
        "message": "Guest rider saved successfully",
    }


@router.delete("/saved/{rider_id}", summary="Delete a saved rider")
async def delete_saved_rider(
    rider_id: str,
    current_user: _FakeUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a saved rider contact."""
    rider = await db.get(SavedRider, uuid.UUID(rider_id))
    if not rider or rider.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Saved rider not found")

    await db.delete(rider)
    await db.commit()

    return {"message": "Saved rider deleted successfully", "deleted_id": rider_id}
