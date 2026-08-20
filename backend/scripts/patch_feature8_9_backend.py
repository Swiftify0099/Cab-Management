import os, sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
all_models_path = os.path.join(backend_root, "common", "models", "all_models.py")

print("[1/5] Patching all_models.py with Feature 8 & 9 models...")
with open(all_models_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add columns to RideRequest if not present
if "pickup_arrived_at" not in content:
    target_str = "    max_dispatch_attempts: Mapped[int] = mapped_column(Integer, default=5)"
    replacement_str = """    max_dispatch_attempts: Mapped[int] = mapped_column(Integer, default=5)

    # Feature 8: Customer Communication & Arrival Tracking
    pickup_arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_contact_attempt_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    contact_attempts_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Feature 9: Ride Start & Multi-Factor Verification
    start_pin_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    start_pin_plain: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # Dev / Customer app display
    pin_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pin_locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    start_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    start_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    start_accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)"""
    content = content.replace(target_str, replacement_str, 1)

# Add RideMessage, CallSession, RideEventLog models
feature8_9_models = """

# ============================================================
# CUSTOMER COMMUNICATION & RIDE START (Features 8 & 9)
# ============================================================

class RideMessage(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    In-App real-time chat messages between Driver and Customer for active ride.
    Server-authoritative validation ensures participants belong to the ride.
    \"\"\"
    __tablename__ = "ride_messages"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    receiver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    sender_type: Mapped[str] = mapped_column(String(20), nullable=False)  # driver, customer, system
    message_type: Mapped[str] = mapped_column(String(30), default="text", nullable=False)  # text, quick_message, system_message, location_share
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_delivered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship(foreign_keys=[ride_id])
    sender: Mapped["User"] = relationship(foreign_keys=[sender_id])
    receiver: Mapped["User"] = relationship(foreign_keys=[receiver_id])


class CallSession(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Secure masked phone calling session. Real phone numbers are NEVER exposed.
    \"\"\"
    __tablename__ = "call_sessions"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    caller_role: Mapped[str] = mapped_column(String(20), default="driver", nullable=False)  # driver, customer
    status: Mapped[str] = mapped_column(String(30), default="requesting", nullable=False)  # requesting, ringing, connected, ended, failed, declined, missed
    virtual_proxy_number: Mapped[str] = mapped_column(String(30), default="+91-80-4567-8900", nullable=False)
    provider_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship(foreign_keys=[ride_id])
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])


class RideEventLog(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Server-authoritative audit log for ride lifecycle, assistance events, and fraud detection.
    \"\"\"
    __tablename__ = "ride_event_logs"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_role: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
"""

if "class RideMessage" not in content:
    compat_idx = content.find("# ============================================================\n# COMPATIBILITY ALIASES")
    if compat_idx != -1:
        content = content[:compat_idx] + feature8_9_models + "\n" + content[compat_idx:]
    else:
        content += feature8_9_models

with open(all_models_path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] all_models.py updated!")
