import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
models_file = os.path.join(backend_root, "common", "models", "all_models.py")

print("Reading all_models.py...")
with open(models_file, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Transport Enums if not present
if "class TransportOrderStatus" not in content:
    enums_str = """
class TransportOrderStatus(str, PyEnum):
    CREATED = "created"
    QUOTE_REQUESTED = "quote_requested"
    PRICED = "priced"
    QUOTES_RECEIVED = "quotes_received"
    NEGOTIATING = "negotiating"
    TRANSPORTER_SELECTED = "transporter_selected"
    DRIVER_ASSIGNED = "driver_assigned"
    DRIVER_EN_ROUTE = "driver_en_route"
    ARRIVED_PICKUP = "arrived_pickup"
    LOADING_STARTED = "loading_started"
    LOADED = "loaded"
    IN_TRANSIT = "in_transit"
    NEAR_DESTINATION = "near_destination"
    ARRIVED_DESTINATION = "arrived_destination"
    UNLOADING_STARTED = "unloading_started"
    POD_VERIFICATION = "pod_verification"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    FAILED = "failed"
    RETURN_REQUIRED = "return_required"
    RETURNED = "returned"
    EXPIRED = "expired"


class GoodsCategory(str, PyEnum):
    GENERAL = "general"
    FURNITURE = "furniture"
    MACHINERY = "machinery"
    AGRICULTURE = "agriculture"
    ELECTRONICS = "electronics"
    CONSTRUCTION = "construction"
    HOUSEHOLD = "household"
    OTHER = "other"


class TransportVehicleCategory(str, PyEnum):
    TATA_ACE = "tata_ace"
    BOLERO_PICKUP = "bolero_pickup"
    EICHER_14FT = "eicher_14ft"
    TRUCK_19FT = "truck_19ft"
    TRAILER_32FT = "trailer_32ft"


class TransportQuoteStatus(str, PyEnum):
    SUBMITTED = "submitted"
    CUSTOMER_COUNTERED = "customer_countered"
    TRANSPORTER_COUNTERED = "transporter_countered"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    NOT_SELECTED = "not_selected"
    EXPIRED = "expired"

"""
    if "class RideOfferStatus" in content:
        content = content.replace("class RideOfferStatus(str, PyEnum):", enums_str + "\nclass RideOfferStatus(str, PyEnum):")
        print("✓ Added Transport Enums")

# 2. Add Transport fields to Vehicle if not present
if "transport_capable" not in content:
    vehicle_needle = "parcel_capacity_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)"
    vehicle_replacement = """parcel_capacity_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    transport_capable: Mapped[bool] = mapped_column(Boolean, default=False)
    max_payload_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cargo_volume_cft: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    loading_dimensions: Mapped[Optional[dict]] = mapped_column(JSONB, default={})
    commercial_permit: Mapped[bool] = mapped_column(Boolean, default=False)"""
    if vehicle_needle in content:
        content = content.replace(vehicle_needle, vehicle_replacement)
        print("✓ Enriched Vehicle model with Transport specifications")

# 3. Add Feature 17 Transport Models at bottom
if "class TransportOrder" not in content:
    feature17_models = """

# ============================================================
# FEATURE 17: TRANSPORT & COMMERCIAL LOGISTICS SYSTEM
# ============================================================

class TransportOrder(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    \"\"\"
    Authoritative Transport Order for heavy goods and commercial freight movement.
    Supports instant pricing, multi-transporter quotations, live multi-state execution, and POD.
    \"\"\"
    __tablename__ = "transport_orders"

    order_reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Route details (Pickup & Drop)
    pickup_address: Mapped[str] = mapped_column(Text, nullable=False)
    pickup_lat: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lng: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    pickup_contact_name: Mapped[str] = mapped_column(String(100), nullable=False)
    pickup_contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    pickup_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    drop_address: Mapped[str] = mapped_column(Text, nullable=False)
    drop_lat: Mapped[float] = mapped_column(Float, nullable=False)
    drop_lng: Mapped[float] = mapped_column(Float, nullable=False)
    drop_location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    drop_contact_name: Mapped[str] = mapped_column(String(100), nullable=False)
    drop_contact_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    drop_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    estimated_duration_min: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Logistics & Service Requirements
    pricing_mode: Mapped[str] = mapped_column(String(30), default="INSTANT_PRICE", nullable=False)  # INSTANT_PRICE, REQUEST_QUOTES
    status: Mapped[TransportOrderStatus] = mapped_column(
        Enum(TransportOrderStatus, native_enum=False, length=50, values_callable=lambda obj: [e.value for e in obj]),
        default=TransportOrderStatus.CREATED, nullable=False, index=True
    )
    schedule_type: Mapped[str] = mapped_column(String(20), default="IMMEDIATE", nullable=False)  # IMMEDIATE, SCHEDULED
    scheduled_pickup_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    loading_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    unloading_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    helpers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    vehicle_category_required: Mapped[str] = mapped_column(String(50), default="TATA_ACE", nullable=False)
    special_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Authoritative Itemized Financials
    base_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    distance_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    weight_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    volume_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    helpers_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    loading_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    unloading_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    toll_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    insurance_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    total_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    driver_earning: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    platform_commission: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), default="WALLET", nullable=False)  # WALLET, UPI, CARD, CASH
    payment_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # PENDING, PAID, REFUNDED

    # Execution Assignment
    selected_quote_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    assigned_driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=True, index=True)
    assigned_vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True)

    # State Timestamps
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    arrived_pickup_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    loading_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    loaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    in_transit_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    near_destination_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    arrived_destination_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    unloading_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Cancellation
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancelled_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Verification OTP
    delivery_otp: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    delivery_otp_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivery_otp_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])
    assigned_driver: Mapped[Optional["Driver"]] = relationship(foreign_keys=[assigned_driver_id])
    assigned_vehicle: Mapped[Optional["Vehicle"]] = relationship(foreign_keys=[assigned_vehicle_id])
    load: Mapped[Optional["TransportLoad"]] = relationship(back_populates="order", uselist=False, cascade="all, delete-orphan")
    quotes: Mapped[List["TransportQuote"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    proof_of_delivery: Mapped[Optional["TransportProofOfDelivery"]] = relationship(back_populates="order", uselist=False)
    status_events: Mapped[List["TransportStatusEvent"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class TransportLoad(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Itemized and dimensional payload specification for a Transport Order.
    \"\"\"
    __tablename__ = "transport_loads"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transport_orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    goods_category: Mapped[str] = mapped_column(String(50), default="GENERAL", nullable=False)
    goods_description: Mapped[str] = mapped_column(Text, nullable=False)
    declared_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    length_ft: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    width_ft: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    height_ft: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    volume_cft: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    package_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    fragile_handling: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    hazardous_material: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    order: Mapped["TransportOrder"] = relationship(back_populates="load")


class TransportQuote(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Commercial quotation submitted by a transporter/driver on a Transport Order.
    Supports interactive multi-round counter-offer negotiation.
    \"\"\"
    __tablename__ = "transport_quotes"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transport_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    transporter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)

    vehicle_category: Mapped[str] = mapped_column(String(50), nullable=False)
    vehicle_number: Mapped[str] = mapped_column(String(30), nullable=False)
    vehicle_name: Mapped[str] = mapped_column(String(100), nullable=False)

    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    included_helpers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estimated_pickup_eta_min: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    estimated_transit_duration_min: Mapped[int] = mapped_column(Integer, default=60, nullable=False)

    status: Mapped[TransportQuoteStatus] = mapped_column(
        Enum(TransportQuoteStatus, native_enum=False, length=50, values_callable=lambda obj: [e.value for e in obj]),
        default=TransportQuoteStatus.SUBMITTED, nullable=False
    )
    valid_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    rounds_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_counter_by: Mapped[str] = mapped_column(String(30), default="TRANSPORTER", nullable=False)  # CUSTOMER, TRANSPORTER

    order: Mapped["TransportOrder"] = relationship(back_populates="quotes")
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    vehicle: Mapped["Vehicle"] = relationship(foreign_keys=[vehicle_id])
    events: Mapped[List["TransportQuoteEvent"]] = relationship(back_populates="quote", cascade="all, delete-orphan")


class TransportQuoteEvent(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Immutable audit history of quote submissions, counter-offers, acceptances, and rejections.
    \"\"\"
    __tablename__ = "transport_quote_events"

    quote_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transport_quotes.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_type: Mapped[str] = mapped_column(String(30), nullable=False)  # CUSTOMER, TRANSPORTER, SYSTEM
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(30), nullable=False)  # SUBMITTED, COUNTERED, ACCEPTED, REJECTED, EXPIRED
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    quote: Mapped["TransportQuote"] = relationship(back_populates="events")


class TransportAssignment(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Active operational dispatch record binding an agreed quote to driver and vehicle.
    \"\"\"
    __tablename__ = "transport_assignments"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transport_orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    quote_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("transport_quotes.id", ondelete="SET NULL"), nullable=True)
    transporter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False, index=True)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, CANCELLED


class TransportStatusEvent(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Immutable chronological state audit trail for transport execution.
    \"\"\"
    __tablename__ = "transport_status_events"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transport_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    actor_role: Mapped[str] = mapped_column(String(30), default="SYSTEM", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    order: Mapped["TransportOrder"] = relationship(back_populates="status_events")


class TransportProofOfDelivery(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Authoritative, tamper-proof proof of delivery record for completed commercial transport.
    Captures receiver verification OTP, signature, photo, GPS coordinates, and timestamp.
    \"\"\"
    __tablename__ = "transport_proof_of_deliveries"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transport_orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False, index=True)
    receiver_name: Mapped[str] = mapped_column(String(100), nullable=False)
    receiver_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    otp_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    signature_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    delivery_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    delivered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    order: Mapped["TransportOrder"] = relationship(back_populates="proof_of_delivery")
"""
    content += feature17_models
    print("✓ Added Feature 17 Transport Models")

with open(models_file, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Successfully patched all_models.py for Feature 17!")
