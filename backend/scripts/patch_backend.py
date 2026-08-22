import os
import re

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend"))
models_path = os.path.join(backend_root, "common", "models", "all_models.py")

with open(models_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add enums if not present
if "class RideRequestStatus" not in content:
    enum_chunk = '''
class RideRequestStatus(str, PyEnum):
    CREATED = "created"
    DISPATCHING = "dispatching"
    OFFERED = "offered"
    ASSIGNED = "assigned"
    PICKUP = "pickup"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    FAILED = "failed"


class RideOfferStatus(str, PyEnum):
    PENDING = "pending"
    DELIVERED = "delivered"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    SUPERSEDED = "superseded"
'''
    # insert before "# USER & AUTH"
    target = "# ============================================================\n# USER & AUTH"
    if target in content:
        content = content.replace(target, enum_chunk + "\n" + target)

# 2. Enhance DriverLocation
driver_loc_old = '''class DriverLocation(Base, UUIDMixin):
    """
    Live driver GPS, upserted on every LOCATION_UPDATE WebSocket event.
    One row per driver (unique constraint on driver_id).
    """
    __tablename__ = "driver_locations"
    __table_args__ = (UniqueConstraint("driver_id"),)

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    speed_kmh: Mapped[float] = mapped_column(Float, default=0.0)
    heading: Mapped[float] = mapped_column(Float, default=0.0)
    accuracy_m: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )'''

driver_loc_new = '''class DriverLocation(Base, UUIDMixin):
    """
    Live driver GPS, upserted on every LOCATION_UPDATE WebSocket event.
    One row per driver (unique constraint on driver_id).
    PostGIS Geography column for efficient ST_DWithin nearby-driver queries.
    """
    __tablename__ = "driver_locations"
    __table_args__ = (UniqueConstraint("driver_id"),)

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    longitude: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    speed_kmh: Mapped[float] = mapped_column(Float, default=0.0)
    heading: Mapped[float] = mapped_column(Float, default=0.0)
    accuracy_m: Mapped[float] = mapped_column(Float, default=0.0)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )'''

if driver_loc_old in content:
    content = content.replace(driver_loc_old, driver_loc_new)

# 3. Add RideCategory, RideRequest, RideOffer models before COMPATIBILITY ALIASES
models_chunk = '''
# ============================================================
# ON-DEMAND RIDE DISPATCH (Feature 5)
# ============================================================

class RideCategory(Base, UUIDMixin, TimestampMixin):
    """
    Ride categories (Economy, Premium, SUV) with fare rules and commission.
    Managed from Admin panel. Commission is configurable per category.
    """
    __tablename__ = "ride_categories"

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # economy, premium, suv
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)  # Economy, Premium, SUV
    eligible_vehicle_types: Mapped[List[str]] = mapped_column(ARRAY(String), nullable=False)  # ["hatchback","sedan"]
    base_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=50)
    per_km_rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False, default=12)
    per_min_rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False, default=2)
    min_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=80)
    surge_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    platform_commission_pct: Mapped[float] = mapped_column(Float, default=0.20, nullable=False)  # 20% default
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    icon_name: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # car, premium-car, suv
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class RideRequest(Base, UUIDMixin, TimestampMixin):
    """
    On-demand ride request created by customer.
    Separate from intercity Trip/Booking system.

    Lifecycle: CREATED -> DISPATCHING -> OFFERED -> ASSIGNED -> PICKUP
               -> IN_PROGRESS -> COMPLETED
    Terminal: CANCELLED, EXPIRED, FAILED
    """
    __tablename__ = "ride_requests"

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    # Pickup
    pickup_location: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    pickup_lat: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lng: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_address: Mapped[str] = mapped_column(Text, nullable=False)

    # Destination
    destination_location: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    destination_lat: Mapped[float] = mapped_column(Float, nullable=False)
    destination_lng: Mapped[float] = mapped_column(Float, nullable=False)
    destination_address: Mapped[str] = mapped_column(Text, nullable=False)

    # Category & fare (from backend fare engine - authoritative)
    ride_category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_categories.id"), nullable=True
    )
    estimated_distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estimated_duration_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estimated_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    surge_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    seats_requested: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    seat_preferences: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # {"window": True, "seats": ["W1", "M1"]}

    # Route data (cached from Google Routes API)
    route_polyline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    route_distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    route_duration_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Assignment
    status: Mapped[RideRequestStatus] = mapped_column(
        Enum(RideRequestStatus, native_enum=False, length=50,
             values_callable=lambda obj: [e.value for e in obj]),
        default=RideRequestStatus.CREATED, index=True
    )
    assigned_driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=True
    )
    assigned_vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True
    )
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Cancellation
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancelled_by: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Expiry
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Dispatch metadata
    dispatch_attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_dispatch_attempts: Mapped[int] = mapped_column(Integer, default=5)

    # Relationships
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])
    assigned_driver: Mapped[Optional["Driver"]] = relationship(foreign_keys=[assigned_driver_id])
    ride_category: Mapped[Optional["RideCategory"]] = relationship(foreign_keys=[ride_category_id])
    offers: Mapped[List["RideOffer"]] = relationship(back_populates="ride_request")


class RideOffer(Base, UUIDMixin, TimestampMixin):
    """
    Per-driver offer for a ride request.
    One ride can have multiple offers (sequential dispatch).
    Only ONE offer can be ACCEPTED per ride.

    Server-side expiry via expires_at (180s timeout) - driver app timer is display only.
    """
    __tablename__ = "ride_offers"
    __table_args__ = (
        UniqueConstraint("ride_request_id", "driver_id", name="uq_ride_offer_driver"),
    )

    ride_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )

    status: Mapped[RideOfferStatus] = mapped_column(
        Enum(RideOfferStatus, native_enum=False, length=50,
             values_callable=lambda obj: [e.value for e in obj]),
        default=RideOfferStatus.PENDING, index=True
    )

    # Distance/ETA from driver to pickup (PostGIS straight-line initially)
    pickup_distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pickup_eta_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Road distance/ETA (from Google Routes API - cached, nullable)
    pickup_road_distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pickup_road_eta_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Earning calculated by backend
    estimated_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    platform_commission: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    estimated_earning: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)

    # Server-side timestamps for timeout enforcement
    offered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    response_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Available seat info for display in driver app
    available_seats: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    available_seat_labels: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)  # ["Window Front", "Window Rear", "Middle"]

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship(back_populates="offers")
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
'''

if "class RideCategory" not in content:
    compat_target = "# ============================================================\n# COMPATIBILITY ALIASES"
    if compat_target in content:
        content = content.replace(compat_target, models_chunk + "\n" + compat_target)

with open(models_path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Successfully updated all_models.py")
