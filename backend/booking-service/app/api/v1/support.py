import uuid
import structlog
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from common.database import get_db
from common.models.all_models import Rating, SupportTicket, ComplaintType, Booking
from common.middleware.auth import AuthenticatedUser, get_current_user
from common.schemas.response import APIResponse, MessageResponse

logger = structlog.get_logger(__name__)
router = APIRouter()

# ============================================================
# RATINGS
# ============================================================

class RatingCreate(BaseModel):
    booking_id: uuid.UUID
    to_user_id: uuid.UUID
    score: int = Field(ge=1, le=5)
    feedback: Optional[str] = None

class RatingResponse(BaseModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    from_user_id: uuid.UUID
    to_user_id: uuid.UUID
    score: int
    feedback: Optional[str]

@router.post("/ratings", response_model=APIResponse[RatingResponse])
async def submit_rating(
    data: RatingCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a rating for a completed trip/booking."""
    # Check if booking exists
    booking_result = await db.execute(select(Booking).where(Booking.id == data.booking_id))
    booking = booking_result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Ensure rating not already submitted by this user for this booking
    existing_rating = await db.execute(
        select(Rating).where(
            Rating.booking_id == data.booking_id,
            Rating.from_user_id == current_user.id
        )
    )
    if existing_rating.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Rating already submitted for this booking")

    # Create Rating
    new_rating = Rating(
        booking_id=data.booking_id,
        from_user_id=current_user.id,
        to_user_id=data.to_user_id,
        score=data.score,
        feedback=data.feedback
    )
    db.add(new_rating)
    await db.commit()
    await db.refresh(new_rating)

    return APIResponse(
        message="Rating submitted successfully",
        data=RatingResponse(
            id=new_rating.id,
            booking_id=new_rating.booking_id,
            from_user_id=new_rating.from_user_id,
            to_user_id=new_rating.to_user_id,
            score=new_rating.score,
            feedback=new_rating.feedback
        )
    )

# ============================================================
# SUPPORT TICKETS
# ============================================================

class TicketCreate(BaseModel):
    booking_id: Optional[uuid.UUID] = None
    complaint_type: ComplaintType
    subject: str
    description: str

class TicketResponse(BaseModel):
    id: uuid.UUID
    booking_id: Optional[uuid.UUID]
    complaint_type: ComplaintType
    subject: str
    description: str
    status: str

@router.post("/support/tickets", response_model=APIResponse[TicketResponse])
async def create_ticket(
    data: TicketCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """File a new support ticket."""
    new_ticket = SupportTicket(
        user_id=current_user.id,
        booking_id=data.booking_id,
        complaint_type=data.complaint_type,
        subject=data.subject,
        description=data.description
    )
    db.add(new_ticket)
    await db.commit()
    await db.refresh(new_ticket)

    return APIResponse(
        message="Support ticket created successfully",
        data=TicketResponse(
            id=new_ticket.id,
            booking_id=new_ticket.booking_id,
            complaint_type=new_ticket.complaint_type,
            subject=new_ticket.subject,
            description=new_ticket.description,
            status=new_ticket.status.value
        )
    )

@router.get("/support/tickets", response_model=APIResponse[List[TicketResponse]])
async def list_my_tickets(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all support tickets filed by the current user."""
    result = await db.execute(
        select(SupportTicket).where(SupportTicket.user_id == current_user.id).order_by(SupportTicket.created_at.desc())
    )
    tickets = result.scalars().all()

    data = [
        TicketResponse(
            id=t.id,
            booking_id=t.booking_id,
            complaint_type=t.complaint_type,
            subject=t.subject,
            description=t.description,
            status=t.status.value
        ) for t in tickets
    ]
    return APIResponse(message="User tickets retrieved", data=data)
