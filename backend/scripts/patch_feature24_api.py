import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
api_file = os.path.join(backend_root, "matching-service", "app", "api", "v1", "matching.py")

print("Reading matching.py...")
with open(api_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add SupportTicketService import
if "from app.services.support_ticket_service import SupportTicketService" not in content:
    import_stmt = "from app.services.support_ticket_service import SupportTicketService\n"
    if "from app.services.ai_smart_driver_service import AISmartDriverService" in content:
        content = content.replace("from app.services.ai_smart_driver_service import AISmartDriverService", "from app.services.ai_smart_driver_service import AISmartDriverService\n" + import_stmt)
    else:
        content = import_stmt + content
    print("✓ Added SupportTicketService import to matching.py")

# 2. Add API endpoints
if "@router.get(\"/support/faq-categories\"" not in content and "@router.get('/support/faq-categories'" not in content:
    feature24_routes = """

# ============================================================
# FEATURE 24: IN-APP SUPPORT & TICKET SYSTEM ENDPOINTS
# ============================================================

@router.get("/support/faq-categories")
async def get_support_faq_categories(
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns 9 structured support categories with article counts.
    \"\"\"
    service = SupportTicketService(db)
    return await service.get_faq_categories()


@router.get("/support/faqs")
async def get_faqs(
    category: Optional[str] = None,
    q: Optional[str] = None,
    limit: Optional[int] = 20,
    offset: Optional[int] = 0,
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Searches and filters FAQ articles by category and search keyword.
    \"\"\"
    service = SupportTicketService(db)
    return await service.get_faqs(category=category, search_query=q, limit=limit, offset=offset)


@router.post("/support/faqs/{faq_id}/feedback")
async def vote_faq_feedback(
    faq_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Votes helpful (+1) or unhelpful (+1) on an FAQ article.
    \"\"\"
    is_helpful = payload.get("is_helpful", True)
    service = SupportTicketService(db)
    return await service.vote_faq_feedback(faq_id, is_helpful)


@router.post("/support/tickets")
async def create_support_ticket(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Raises a new support ticket with strict driver ownership validation on ride_id.
    \"\"\"
    category = payload.get("category", "GENERAL")
    subcategory = payload.get("subcategory", "OTHER")
    subject = payload.get("subject", "Support Request")
    description = payload.get("description", "")
    priority = payload.get("priority", "normal")
    ride_id = uuid.UUID(payload["ride_id"]) if payload.get("ride_id") else None
    payout_id = uuid.UUID(payload["payout_request_id"]) if payload.get("payout_request_id") else None

    if not description:
        raise HTTPException(status_code=400, detail="Ticket description is required")

    service = SupportTicketService(db)
    return await service.create_ticket(
        user_id=current_user.id,
        category=category,
        subcategory=subcategory,
        subject=subject,
        description=description,
        priority=priority,
        ride_id=ride_id,
        payout_request_id=payout_id
    )


@router.get("/support/tickets")
async def get_driver_tickets(
    status: Optional[str] = None,
    limit: Optional[int] = 20,
    offset: Optional[int] = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns paginated ticket history scoped strictly to authenticated driver.
    \"\"\"
    service = SupportTicketService(db)
    return await service.get_driver_tickets(
        user_id=current_user.id,
        status_filter=status,
        limit=limit,
        offset=offset
    )


@router.get("/support/tickets/{ticket_id}")
async def get_ticket_details(
    ticket_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Returns ticket details and full conversation history. Scoped strictly to owner.
    \"\"\"
    service = SupportTicketService(db)
    return await service.get_ticket_details(user_id=current_user.id, ticket_id=ticket_id)


@router.post("/support/tickets/{ticket_id}/messages")
async def send_ticket_message(
    ticket_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Sends a message in the ticket thread (Driver -> Agent).
    \"\"\"
    message_text = payload.get("message_text", "")
    if not message_text.strip():
        raise HTTPException(status_code=400, detail="Message text is required")

    service = SupportTicketService(db)
    return await service.send_ticket_message(
        user_id=current_user.id,
        ticket_id=ticket_id,
        message_text=message_text,
        sender_type="DRIVER"
    )


@router.post("/support/tickets/{ticket_id}/reopen")
async def reopen_ticket(
    ticket_id: uuid.UUID,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Reopens a resolved or closed ticket if driver needs further assistance.
    \"\"\"
    reason = payload.get("reason", "Issue still not resolved")
    service = SupportTicketService(db)
    return await service.reopen_ticket(user_id=current_user.id, ticket_id=ticket_id, reason=reason)


@router.post("/support/dev-simulate")
async def simulate_support_dev_scenario(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    \"\"\"
    Developer Mode simulator for Support Agent replies and resolutions.
    \"\"\"
    scenario_key = payload.get("scenario_key", "AGENT_REPLY")
    ticket_id = uuid.UUID(payload["ticket_id"]) if payload.get("ticket_id") else None
    service = SupportTicketService(db)
    return await service.simulate_dev_scenario(
        user_id=current_user.id,
        scenario_key=scenario_key,
        ticket_id=ticket_id
    )
"""
    content += feature24_routes
    print("✓ Appended Feature 24 API endpoints to matching.py")
else:
    print("✓ Feature 24 API endpoints already registered in matching.py")

with open(api_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated matching.py for Feature 24")
