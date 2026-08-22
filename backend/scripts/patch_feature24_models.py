import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Patch SupportTicket with extended fields
old_ticket_model = """class SupportTicket(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "support_tickets"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), default=TicketStatus.OPEN)
    priority: Mapped[str] = mapped_column(String(20), default="normal")  # low, normal, high, urgent
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    messages: Mapped[dict] = mapped_column(JSONB, default={"messages": []})"""

new_ticket_model = """class SupportTicket(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "support_tickets"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), default="GENERAL", nullable=False, index=True)  # ACCOUNT, TRIPS, PAYMENTS, VEHICLE, KYC, SAFETY, EARNINGS, PAYOUT, SETTINGS
    subcategory: Mapped[str] = mapped_column(String(50), default="OTHER", nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), default=TicketStatus.OPEN, index=True)
    priority: Mapped[str] = mapped_column(String(20), default="normal")  # low, normal, high, urgent
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"), nullable=True)
    payout_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("driver_payout_requests.id", ondelete="SET NULL"), nullable=True)
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    unread_driver_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unread_agent_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    messages: Mapped[dict] = mapped_column(JSONB, default={"messages": []})

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    ride_request: Mapped[Optional["RideRequest"]] = relationship("RideRequest", foreign_keys=[ride_id])"""

if old_ticket_model in content:
    content = content.replace(old_ticket_model, new_ticket_model)
    print("✓ Patched SupportTicket model with Feature 24 fields")
else:
    print("⚠️ old_ticket_model not matched exactly, checking if already patched")

# 2. Add SupportTicketMessage and FAQArticle models
if "class SupportTicketMessage" not in content:
    feature24_models = """

# ============================================================
# FEATURE 24: IN-APP SUPPORT SYSTEM & FAQ ENGINE
# ============================================================

class SupportTicketMessage(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Structured message thread for support tickets between driver and agents.
    \"\"\"
    __tablename__ = "support_ticket_messages"

    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    sender_type: Mapped[str] = mapped_column(String(20), nullable=False)  # DRIVER, SUPPORT_AGENT, SYSTEM, BOT
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    sender_name: Mapped[str] = mapped_column(String(100), nullable=False)
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    attachments: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    ticket: Mapped["SupportTicket"] = relationship("SupportTicket", foreign_keys=[ticket_id])
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])


class FAQArticle(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Searchable Help Center FAQ articles with helpful/unhelpful feedback counters.
    \"\"\"
    __tablename__ = "faq_articles"

    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # ACCOUNT, TRIPS, PAYMENTS, VEHICLE, KYC, SAFETY, EARNINGS, PAYOUT, SETTINGS
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unhelpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)
"""
    if "# COMPATIBILITY ALIASES" in content:
        content = content.replace("# COMPATIBILITY ALIASES", feature24_models + "\n\n# COMPATIBILITY ALIASES")
        print("✓ Appended Feature 24 models before COMPATIBILITY ALIASES")
    else:
        content += feature24_models
        print("✓ Appended Feature 24 models to end of all_models.py")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated all_models.py for Feature 24")
