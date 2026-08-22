import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
services_dir = os.path.join(backend_root, "matching-service", "app", "services")
target_service_file = os.path.join(services_dir, "support_ticket_service.py")

service_code = '''"""
Authoritative Support & Ticket Management Service for CabBooking.
Features:
- Help Center & FAQ Knowledgebase Engine
- Context-Aware Trip & Payment Issues with Strict Ownership Gatekeepers
- Structured Ticket Lifecycle State Machine
- Interactive Real-Time Support Chat Messaging
- Driver-Scoped Ticket History & Privacy Enforcement
- Developer Mode Sandbox Simulator
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User,
    Driver,
    RideRequest,
    SupportTicket,
    SupportTicketMessage,
    FAQArticle,
    TicketStatus,
)


class SupportTicketService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # =========================================================================
    # 1. HELP CENTER & FAQ KNOWLEDGEBASE
    # =========================================================================
    async def get_faq_categories(self) -> List[Dict[str, Any]]:
        """
        Returns structured support categories with published article counts.
        """
        categories = [
            {"id": "ACCOUNT", "name": "Account & Profile", "icon": "user", "description": "Login, OTP, phone number and account verification"},
            {"id": "TRIPS", "name": "Trips & Navigation", "icon": "map-pin", "description": "Pickup, dropoff, route issues, and cancellations"},
            {"id": "PAYMENTS", "name": "Payments & Fares", "icon": "credit-card", "description": "Cash fares, digital payments, and tolls"},
            {"id": "VEHICLE", "name": "Vehicle Management", "icon": "truck", "description": "RC book, insurance, vehicle switch, and inspections"},
            {"id": "KYC", "name": "KYC & Documents", "icon": "file-text", "description": "Licence verification, background check, and renewals"},
            {"id": "SAFETY", "name": "Safety & Emergency", "icon": "shield", "description": "SOS emergency, passenger misconduct, and incident reports"},
            {"id": "EARNINGS", "name": "Earnings & Incentives", "icon": "dollar-sign", "description": "Daily earnings, commissions, surge, and bonuses"},
            {"id": "PAYOUT", "name": "Wallet & Bank Payouts", "icon": "briefcase", "description": "Instant withdrawals, bank accounts, and UPI"},
            {"id": "SETTINGS", "name": "App Settings", "icon": "settings", "description": "Language, voice navigation, sounds, and preferences"},
        ]

        # Query counts per category
        count_stmt = select(
            FAQArticle.category,
            func.count(FAQArticle.id)
        ).where(FAQArticle.is_published.is_(True)).group_by(FAQArticle.category)
        count_res = await self.session.execute(count_stmt)
        count_map = {cat: count for cat, count in count_res.all()}

        for cat in categories:
            cat["article_count"] = count_map.get(cat["id"], 0)

        return categories

    async def get_faqs(
        self,
        category: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Searches and filters FAQ articles by category and keywords.
        """
        stmt = select(FAQArticle).where(FAQArticle.is_published.is_(True))

        if category and category.upper() != "ALL":
            stmt = stmt.where(FAQArticle.category == category.upper())

        if search_query and search_query.strip():
            q = f"%{search_query.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(FAQArticle.title).like(q),
                    func.lower(FAQArticle.content_markdown).like(q)
                )
            )

        stmt = stmt.order_by(FAQArticle.sort_order, desc(FAQArticle.helpful_count)).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        articles = result.scalars().all()

        return {
            "total": len(articles),
            "articles": [
                {
                    "id": str(art.id),
                    "category": art.category,
                    "title": art.title,
                    "content_markdown": art.content_markdown,
                    "helpful_count": art.helpful_count,
                    "unhelpful_count": art.unhelpful_count,
                    "tags": art.tags,
                }
                for art in articles
            ]
        }

    async def vote_faq_feedback(self, faq_id: uuid.UUID, is_helpful: bool) -> Dict[str, Any]:
        """
        Updates helpful / unhelpful counter on FAQ article.
        """
        art_res = await self.session.execute(select(FAQArticle).where(FAQArticle.id == faq_id))
        art = art_res.scalar_one_or_none()
        if not art:
            raise HTTPException(status_code=404, detail="FAQ article not found")

        if is_helpful:
            art.helpful_count += 1
        else:
            art.unhelpful_count += 1

        await self.session.commit()
        return {
            "success": True,
            "faq_id": str(faq_id),
            "helpful_count": art.helpful_count,
            "unhelpful_count": art.unhelpful_count
        }

    # =========================================================================
    # 2. TICKET CREATION & OWNERSHIP GATEKEEPER
    # =========================================================================
    async def create_ticket(
        self,
        user_id: uuid.UUID,
        category: str,
        subcategory: str,
        subject: str,
        description: str,
        priority: str = "normal",
        ride_id: Optional[uuid.UUID] = None,
        payout_request_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Creates a new support ticket with strict driver ownership validation.
        Driver A cannot raise issue on Driver B's ride!
        """
        # Fetch user
        user_res = await self.session.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User account not found")

        # Fetch driver profile if user is a driver
        driver_res = await self.session.execute(select(Driver).where(Driver.user_id == user_id))
        driver = driver_res.scalar_one_or_none()

        # Strict Ownership Gatekeeper for ride_id
        if ride_id:
            ride_res = await self.session.execute(select(RideRequest).where(RideRequest.id == ride_id))
            ride = ride_res.scalar_one_or_none()
            if not ride:
                raise HTTPException(status_code=404, detail="Selected trip not found")

            # Validate that this ride belongs to this driver
            ride_driver = getattr(ride, "assigned_driver_id", None) or getattr(ride, "driver_id", None)
            if driver and ride_driver != driver.id:
                raise HTTPException(
                    status_code=403,
                    detail="Forbidden: You can only raise support issues against your own trips"
                )

        now = datetime.now(timezone.utc)
        ticket_id = uuid.uuid4()

        # Create Ticket
        ticket = SupportTicket(
            id=ticket_id,
            user_id=user_id,
            category=category.upper(),
            subcategory=subcategory.upper(),
            subject=subject,
            description=description,
            status=TicketStatus.OPEN,
            priority=priority.lower(),
            ride_id=ride_id,
            payout_request_id=payout_request_id,
            last_message_at=now,
            unread_driver_count=0,
            unread_agent_count=1,
            messages={"messages": []}
        )
        self.session.add(ticket)

        # Create Initial Message in Thread
        initial_msg = SupportTicketMessage(
            id=uuid.uuid4(),
            ticket_id=ticket_id,
            sender_type="DRIVER" if driver else "CUSTOMER",
            sender_id=user_id,
            sender_name=user.phone or "Driver Partner",
            message_text=description,
            attachments=[],
            is_read=False
        )
        self.session.add(initial_msg)

        # Auto-add bot greeting acknowledge
        bot_msg = SupportTicketMessage(
            id=uuid.uuid4(),
            ticket_id=ticket_id,
            sender_type="SYSTEM",
            sender_id=user_id,
            sender_name="CabBooking Support Bot",
            message_text=f"Hello! We have received your ticket regarding '{subject}'. A support representative is reviewing your request.",
            attachments=[],
            is_read=False
        )
        self.session.add(bot_msg)

        await self.session.commit()

        return {
            "ticket_id": str(ticket_id),
            "category": ticket.category,
            "subject": ticket.subject,
            "status": "OPEN",
            "priority": ticket.priority,
            "created_at": now.isoformat(),
            "message": "Ticket created successfully. Our team will respond shortly."
        }

    # =========================================================================
    # 3. TICKET HISTORY & DETAILS (STRICT PRIVACY)
    # =========================================================================
    async def get_driver_tickets(
        self,
        user_id: uuid.UUID,
        status_filter: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Returns paginated tickets scoped strictly to the authenticated driver.
        """
        stmt = select(SupportTicket).where(SupportTicket.user_id == user_id)

        if status_filter and status_filter.upper() != "ALL":
            stmt = stmt.where(SupportTicket.status == status_filter.lower())

        stmt = stmt.order_by(desc(SupportTicket.last_message_at)).limit(limit).offset(offset)
        res = await self.session.execute(stmt)
        tickets = res.scalars().all()

        return {
            "total": len(tickets),
            "tickets": [
                {
                    "id": str(t.id),
                    "category": t.category,
                    "subcategory": t.subcategory,
                    "subject": t.subject,
                    "status": t.status.value if hasattr(t.status, "value") else str(t.status).upper(),
                    "priority": t.priority.upper(),
                    "ride_id": str(t.ride_id) if t.ride_id else None,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "last_message_at": t.last_message_at.isoformat() if t.last_message_at else None,
                    "unread_driver_count": t.unread_driver_count,
                }
                for t in tickets
            ]
        }

    async def get_ticket_details(self, user_id: uuid.UUID, ticket_id: uuid.UUID) -> Dict[str, Any]:
        """
        Returns ticket details and chat conversation. Scoped strictly to ticket owner.
        """
        ticket_res = await self.session.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
        ticket = ticket_res.scalar_one_or_none()
        if not ticket:
            raise HTTPException(status_code=404, detail="Support ticket not found")

        if ticket.user_id != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot access this ticket")

        # Mark driver unread count to 0
        ticket.unread_driver_count = 0
        await self.session.commit()

        # Query messages
        msg_stmt = select(SupportTicketMessage).where(
            SupportTicketMessage.ticket_id == ticket_id
        ).order_by(SupportTicketMessage.created_at.asc())
        msg_res = await self.session.execute(msg_stmt)
        messages = msg_res.scalars().all()

        return {
            "id": str(ticket.id),
            "category": ticket.category,
            "subcategory": ticket.subcategory,
            "subject": ticket.subject,
            "description": ticket.description,
            "status": ticket.status.value if hasattr(ticket.status, "value") else str(ticket.status).upper(),
            "priority": ticket.priority.upper(),
            "ride_id": str(ticket.ride_id) if ticket.ride_id else None,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            "last_message_at": ticket.last_message_at.isoformat() if ticket.last_message_at else None,
            "messages": [
                {
                    "id": str(m.id),
                    "sender_type": m.sender_type,
                    "sender_name": m.sender_name,
                    "message_text": m.message_text,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                    "is_driver": m.sender_type == "DRIVER"
                }
                for m in messages
            ]
        }

    # =========================================================================
    # 4. CHAT MESSAGING & REOPEN LIFECYCLE
    # =========================================================================
    async def send_ticket_message(
        self,
        user_id: uuid.UUID,
        ticket_id: uuid.UUID,
        message_text: str,
        sender_type: str = "DRIVER"
    ) -> Dict[str, Any]:
        """
        Appends a new message to the ticket conversation.
        """
        ticket_res = await self.session.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
        ticket = ticket_res.scalar_one_or_none()
        if not ticket:
            raise HTTPException(status_code=404, detail="Support ticket not found")

        if sender_type == "DRIVER" and ticket.user_id != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot message on this ticket")

        user_res = await self.session.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        sender_name = user.phone if user else "Driver Partner"

        now = datetime.now(timezone.utc)
        msg = SupportTicketMessage(
            id=uuid.uuid4(),
            ticket_id=ticket_id,
            sender_type=sender_type,
            sender_id=user_id,
            sender_name=sender_name if sender_type == "DRIVER" else "Support Agent",
            message_text=message_text,
            attachments=[],
            is_read=False
        )
        self.session.add(msg)

        # Update ticket timestamps and transition states
        ticket.last_message_at = now
        if sender_type == "DRIVER":
            ticket.unread_agent_count += 1
            if ticket.status == TicketStatus.RESOLVED:
                ticket.status = TicketStatus.OPEN
        else:
            ticket.unread_driver_count += 1

        await self.session.commit()

        return {
            "success": True,
            "message_id": str(msg.id),
            "sender_type": sender_type,
            "created_at": now.isoformat(),
            "ticket_status": str(ticket.status)
        }

    async def reopen_ticket(self, user_id: uuid.UUID, ticket_id: uuid.UUID, reason: str) -> Dict[str, Any]:
        """
        Reopens a resolved or closed ticket with reason.
        """
        ticket_res = await self.session.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
        ticket = ticket_res.scalar_one_or_none()
        if not ticket:
            raise HTTPException(status_code=404, detail="Support ticket not found")

        if ticket.user_id != user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot reopen this ticket")

        ticket.status = TicketStatus.OPEN
        ticket.last_message_at = datetime.now(timezone.utc)
        ticket.unread_agent_count += 1

        # Add reopen explanation message
        msg = SupportTicketMessage(
            id=uuid.uuid4(),
            ticket_id=ticket_id,
            sender_type="DRIVER",
            sender_id=user_id,
            sender_name="Driver Partner",
            message_text=f"[REOPENED TICKET]: {reason}",
            attachments=[],
            is_read=False
        )
        self.session.add(msg)
        await self.session.commit()

        return {
            "success": True,
            "ticket_id": str(ticket_id),
            "status": "OPEN",
            "message": "Ticket has been reopened and queued for priority review."
        }

    # =========================================================================
    # 5. DEVELOPER SANDBOX SIMULATION
    # =========================================================================
    async def simulate_dev_scenario(
        self,
        user_id: uuid.UUID,
        scenario_key: str,
        ticket_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Sandbox simulator for testing Agent replies, Resolutions, and Reopens.
        """
        if scenario_key == "AGENT_REPLY" and ticket_id:
            ticket_res = await self.session.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
            ticket = ticket_res.scalar_one_or_none()
            if ticket:
                reply_msg = SupportTicketMessage(
                    id=uuid.uuid4(),
                    ticket_id=ticket_id,
                    sender_type="SUPPORT_AGENT",
                    sender_id=user_id,
                    sender_name="Aarav Sharma (Support Lead)",
                    message_text="We have reviewed your fare dispute. An adjustment credit of ₹85 has been approved and processed to your wallet.",
                    attachments=[],
                    is_read=False
                )
                self.session.add(reply_msg)
                ticket.unread_driver_count += 1
                ticket.status = TicketStatus.IN_PROGRESS
                await self.session.commit()
                return {"scenario": scenario_key, "message": "Simulated Support Agent chat response."}

        elif scenario_key == "RESOLVE_TICKET" and ticket_id:
            ticket_res = await self.session.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
            ticket = ticket_res.scalar_one_or_none()
            if ticket:
                ticket.status = TicketStatus.RESOLVED
                ticket.resolved_at = datetime.now(timezone.utc)
                resolve_msg = SupportTicketMessage(
                    id=uuid.uuid4(),
                    ticket_id=ticket_id,
                    sender_type="SYSTEM",
                    sender_id=user_id,
                    sender_name="System",
                    message_text="This ticket has been marked as RESOLVED. If you still need help, you can tap 'Reopen Ticket'.",
                    attachments=[],
                    is_read=False
                )
                self.session.add(resolve_msg)
                await self.session.commit()
                return {"scenario": scenario_key, "message": "Ticket resolved successfully."}

        return {"scenario": scenario_key, "message": "Sandbox scenario executed."}
'''

with open(target_service_file, "w", encoding="utf-8") as f:
    f.write(service_code)

print(f"✓ Successfully wrote {target_service_file}")
