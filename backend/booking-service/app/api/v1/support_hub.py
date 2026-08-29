"""
Feature 25: Unified Support & Help Center Hub API Router
Provides:
1. Rich FAQ Search & Category Engine
2. Service-Linked Support Tickets (Ride, Parcel, Hotel, Transport, Rental, Outstation, Airport)
3. Live Support Message Threads & Socket.IO chat
4. Controlled Ticket Escalation Workflow
5. AI Support Assistant (Context-bounded policy assistance with strict refund/tampering boundaries)
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import async_session_maker
from common.middleware.auth import get_current_user, AuthenticatedUser
from common.models.all_models import (
    SupportTicket, SupportTicketMessage, FAQArticle, TicketStatus, User,
)

router = APIRouter()


async def get_db():
    async with async_session_maker() as session:
        yield session


# ── Schemas ───────────────────────────────────────────────────────────────────

class TicketCreateRequest(BaseModel):
    category: str = "GENERAL"  # RIDE, PARCEL, HOTEL, TRANSPORT, RENTAL, OUTSTATION, AIRPORT, PAYMENT, SAFETY, GENERAL
    subcategory: str = "OTHER"
    subject: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    reference_type: Optional[str] = None  # RIDE, PARCEL, HOTEL_BOOKING, TRANSPORT_ORDER, RENTAL, OUTSTATION, AIRPORT_BOOKING
    reference_id: Optional[str] = None
    priority: str = "normal"  # low, normal, high, urgent


class MessageSendRequest(BaseModel):
    message_text: str = Field(..., min_length=1)
    attachments: Optional[List[str]] = None


class FAQVoteRequest(BaseModel):
    is_helpful: bool


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=2)
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    context_topic: Optional[str] = None


# ── FAQ Endpoints ─────────────────────────────────────────────────────────────

@router.get("/faq", summary="Search FAQ articles or list by category")
async def get_faq_articles(
    category: Optional[str] = Query(None, description="Filter by category: RIDE, PARCEL, HOTEL, TRANSPORT, PAYMENT, ACCOUNT, SAFETY"),
    query: Optional[str] = Query(None, description="Search query"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve FAQ list with optional search and category filters."""
    q = select(FAQArticle).where(FAQArticle.is_published == True)
    if category:
        q = q.where(FAQArticle.category == category.upper())
    if query:
        pattern = f"%{query}%"
        q = q.where(or_(FAQArticle.title.ilike(pattern), FAQArticle.content.ilike(pattern)))

    q = q.order_by(FAQArticle.sort_order, FAQArticle.created_at)
    res = await db.execute(q)
    articles = res.scalars().all()

    # If DB has no articles yet, return fallback curated FAQs
    if not articles:
        return {
            "data": [
                {
                    "id": "faq-1",
                    "category": "RIDE",
                    "title": "How do I book a ride for a family member or friend?",
                    "content": "On the booking screen, tap 'Who is riding?' and select 'Book for Someone Else'. You can pick a family member from your account or enter a guest's name and phone number. The driver will see their name and contact them directly with a 4-digit ride start PIN.",
                    "helpful_count": 142,
                },
                {
                    "id": "faq-2",
                    "category": "PAYMENT",
                    "title": "When will I receive my refund for a cancelled trip?",
                    "content": "Wallet refunds are processed instantly and reflect in your CabManagement Wallet balance immediately. Bank/Card refunds take 3-5 business days depending on your bank.",
                    "helpful_count": 98,
                },
                {
                    "id": "faq-3",
                    "category": "SAFETY",
                    "title": "What should I do if I forgot an item in the cab?",
                    "content": "Go to Activity → Select the ride → Tap 'Help with this ride' → 'Lost Item'. You can contact your driver through our privacy-safe masked call or open an urgent support ticket.",
                    "helpful_count": 210,
                },
                {
                    "id": "faq-4",
                    "category": "OUTSTATION",
                    "title": "How are Outstation night halt and driver allowances calculated?",
                    "content": "Night halt charges (₹1,000/night) apply automatically to overnight round trips. Driver travel allowance (₹500/day) covers outstation driver expenses and is clearly itemized in your upfront fare estimate.",
                    "helpful_count": 76,
                },
                {
                    "id": "faq-5",
                    "category": "RENTAL",
                    "title": "What happens if I exceed the hours or kilometers on my rental?",
                    "content": "Extra kilometers and extra hours are computed automatically by the server at trip completion based on your plan's standard rates. The delta is settled seamlessly from your wallet.",
                    "helpful_count": 89,
                },
            ],
            "total": 5,
        }

    return {
        "data": [
            {
                "id": str(a.id),
                "category": a.category,
                "title": a.title,
                "content": a.content,
                "helpful_count": a.helpful_count,
            }
            for a in articles
        ],
        "total": len(articles),
    }


@router.post("/faq/{faq_id}/vote", summary="Vote FAQ helpfulness")
async def vote_faq(
    faq_id: str,
    req: FAQVoteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Vote whether an FAQ article was helpful or not."""
    try:
        faq = await db.get(FAQArticle, uuid.UUID(faq_id))
        if faq:
            if req.is_helpful:
                faq.helpful_count += 1
            else:
                faq.not_helpful_count += 1
            await db.commit()
    except Exception:
        pass
    return {"message": "Thank you for your feedback!"}


# ── Support Tickets Endpoints ─────────────────────────────────────────────────

@router.get("/tickets", summary="List customer's support tickets")
async def get_my_tickets(
    status_filter: Optional[str] = Query(None, description="OPEN, IN_PROGRESS, RESOLVED, CLOSED"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List customer support tickets with latest status and unread counters."""
    q = select(SupportTicket).where(SupportTicket.user_id == current_user.id)
    if status_filter:
        try:
            st = TicketStatus(status_filter.lower())
            q = q.where(SupportTicket.status == st)
        except Exception:
            pass

    q = q.order_by(desc(SupportTicket.last_message_at))
    res = await db.execute(q)
    tickets = res.scalars().all()

    return {
        "data": [
            {
                "id": str(t.id),
                "ticket_number": f"TKT-{str(t.id)[:6].upper()}",
                "category": t.category,
                "subcategory": t.subcategory,
                "subject": t.subject,
                "description": t.description,
                "status": t.status.value if hasattr(t.status, "value") else str(t.status),
                "priority": t.priority,
                "reference_type": t.reference_type,
                "reference_id": t.reference_id,
                "created_at": t.created_at.isoformat() if t.created_at else datetime.now(timezone.utc).isoformat(),
                "last_message_at": t.last_message_at.isoformat() if t.last_message_at else datetime.now(timezone.utc).isoformat(),
                "unread_agent_count": t.unread_agent_count,
            }
            for t in tickets
        ],
        "total": len(tickets),
    }


@router.post("/tickets", status_code=status.HTTP_201_CREATED, summary="Create service-linked support ticket")
async def create_support_ticket(
    req: TicketCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new support ticket linked to a specific booking/service reference."""
    user = await db.get(User, current_user.id)
    sender_name = user.full_name if user else "Customer"

    ticket = SupportTicket(
        id=uuid.uuid4(),
        user_id=current_user.id,
        category=req.category.upper(),
        subcategory=req.subcategory.upper(),
        subject=req.subject,
        description=req.description,
        status=TicketStatus.OPEN,
        priority=req.priority.lower(),
        reference_type=req.reference_type.upper() if req.reference_type else None,
        reference_id=req.reference_id,
        last_message_at=datetime.now(timezone.utc),
        unread_driver_count=0,
        unread_agent_count=0,
    )
    db.add(ticket)
    await db.flush()

    # Add initial opening message
    msg = SupportTicketMessage(
        id=uuid.uuid4(),
        ticket_id=ticket.id,
        sender_type="CUSTOMER",
        sender_id=current_user.id,
        sender_name=sender_name,
        message_text=req.description,
        attachments=[],
        is_read=True,
    )
    db.add(msg)
    await db.commit()

    return {
        "data": {
            "id": str(ticket.id),
            "ticket_number": f"TKT-{str(ticket.id)[:6].upper()}",
            "subject": ticket.subject,
            "status": "open",
        },
        "message": "Support ticket created successfully. Our team will assist you shortly.",
    }


@router.get("/tickets/{ticket_id}", summary="Get ticket detail & message thread")
async def get_ticket_detail(
    ticket_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get full ticket details and chat conversation history."""
    ticket = await db.get(SupportTicket, uuid.UUID(ticket_id))
    if not ticket or ticket.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Support ticket not found")

    # Fetch messages
    msg_q = select(SupportTicketMessage).where(SupportTicketMessage.ticket_id == ticket.id).order_by(SupportTicketMessage.created_at)
    msg_res = await db.execute(msg_q)
    messages = msg_res.scalars().all()

    return {
        "data": {
            "id": str(ticket.id),
            "ticket_number": f"TKT-{str(ticket.id)[:6].upper()}",
            "category": ticket.category,
            "subcategory": ticket.subcategory,
            "subject": ticket.subject,
            "description": ticket.description,
            "status": ticket.status.value if hasattr(ticket.status, "value") else str(ticket.status),
            "priority": ticket.priority,
            "reference_type": ticket.reference_type,
            "reference_id": ticket.reference_id,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else datetime.now(timezone.utc).isoformat(),
            "messages": [
                {
                    "id": str(m.id),
                    "sender_type": m.sender_type,
                    "sender_name": m.sender_name,
                    "message_text": m.message_text,
                    "attachments": m.attachments or [],
                    "created_at": m.created_at.isoformat() if m.created_at else datetime.now(timezone.utc).isoformat(),
                }
                for m in messages
            ],
        }
    }


@router.post("/tickets/{ticket_id}/messages", status_code=status.HTTP_201_CREATED, summary="Reply to support ticket")
async def send_ticket_message(
    ticket_id: str,
    req: MessageSendRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send reply message in an active support ticket thread."""
    ticket = await db.get(SupportTicket, uuid.UUID(ticket_id))
    if not ticket or ticket.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Support ticket not found")

    user = await db.get(User, current_user.id)
    sender_name = user.full_name if user else "Customer"

    msg = SupportTicketMessage(
        id=uuid.uuid4(),
        ticket_id=ticket.id,
        sender_type="CUSTOMER",
        sender_id=current_user.id,
        sender_name=sender_name,
        message_text=req.message_text,
        attachments=req.attachments or [],
        is_read=True,
    )
    db.add(msg)
    ticket.last_message_at = datetime.now(timezone.utc)
    if ticket.status == TicketStatus.RESOLVED:
        ticket.status = TicketStatus.OPEN  # Re-open if replied

    await db.commit()

    return {
        "data": {
            "id": str(msg.id),
            "sender_type": msg.sender_type,
            "sender_name": msg.sender_name,
            "message_text": msg.message_text,
            "created_at": msg.created_at.isoformat(),
        },
        "message": "Message sent",
    }


@router.post("/tickets/{ticket_id}/escalate", summary="Escalate support ticket")
async def escalate_ticket(
    ticket_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Escalate support ticket to supervisor level."""
    ticket = await db.get(SupportTicket, uuid.UUID(ticket_id))
    if not ticket or ticket.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Support ticket not found")

    ticket.priority = "urgent"
    ticket.last_message_at = datetime.now(timezone.utc)

    # Add system escalation message
    msg = SupportTicketMessage(
        id=uuid.uuid4(),
        ticket_id=ticket.id,
        sender_type="SYSTEM",
        sender_id=current_user.id,
        sender_name="System",
        message_text="[ESCALATION] This ticket has been escalated to Priority Urgent for immediate supervisor review.",
        attachments=[],
        is_read=True,
    )
    db.add(msg)
    await db.commit()

    return {"message": "Ticket escalated to urgent supervisor review"}


# ── AI Support Assistant ──────────────────────────────────────────────────────

@router.post("/ai/chat", summary="Context-bounded AI Support Assistant")
async def ai_support_chat(
    req: AIChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    AI Support Assistant with strict backend boundaries.
    Answers questions on policy, fare breakdown, cancellations, safety steps.
    Will NEVER execute unauthorized refunds or fare overrides.
    """
    msg = req.message.lower()

    # Rule-based policy bounded assistant responses
    if "refund" in msg:
        reply = "Wallet refunds are processed instantly upon cancellation approval and reflect immediately in your in-app wallet balance. For bank cards, please allow 3-5 business days. If your refund is delayed, tap 'My Tickets' to raise a ticket."
    elif "cancel" in msg:
        reply = "You can cancel a ride for free before driver arrival. A standard nominal cancellation fee may apply if cancelled after driver arrives at the pickup point."
    elif "fare" in msg or "price" in msg or "charged" in msg:
        reply = "All fares are calculated based on base fare, distance, time, state tolls, and applicable GST. If you noticed an extra charge on an Outstation or Rental trip, it might be an extra-km or night-halt toll approved during your journey."
    elif "lost" in msg or "forgot" in msg or "item" in msg:
        reply = "To recover a lost item, please open your Activity tab, select the completed trip, and tap 'Help with this ride' → 'Lost Item'. You can connect with the driver via masked phone call."
    elif "driver" in msg or "rude" in msg or "safety" in msg:
        reply = "We take passenger safety and driver professionalism very seriously. For any safety incident, tap the emergency shield in your app or raise an Urgent Safety Ticket in the Support tab."
    else:
        reply = f"Hello! I am your CabManagement AI Assistant. I can help explain our policies, booking rules, refunds, and ride features. If you need dedicated human support, would you like to create a support ticket for #{req.reference_id or 'your booking'}?"

    return {
        "data": {
            "reply": reply,
            "suggested_actions": [
                {"label": "Raise a Ticket", "action": "CREATE_TICKET"},
                {"label": "View FAQs", "action": "VIEW_FAQ"},
                {"label": "Call Support", "action": "CALL_SUPPORT"},
            ],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }
