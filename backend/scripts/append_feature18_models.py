import sys, os

all_models_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "common", "models", "all_models.py")

with open(all_models_path, "r", encoding="utf-8") as f:
    content = f.read()

feature18_models = """

# ============================================================
# FEATURE 18: AIRPORT SERVICE & FLIGHT-AWARE LOGISTICS MODELS
# ============================================================

class AirportTransferType(str, PyEnum):
    PICKUP = "PICKUP"  # Airport -> Destination
    DROP = "DROP"      # Origin -> Airport

class FlightStatus(str, PyEnum):
    SCHEDULED = "SCHEDULED"
    DELAYED = "DELAYED"
    BOARDING = "BOARDING"
    DEPARTED = "DEPARTED"
    IN_AIR = "IN_AIR"
    LANDED = "LANDED"
    CANCELLED = "CANCELLED"
    DIVERTED = "DIVERTED"
    UNKNOWN = "UNKNOWN"

class AirportBookingStatus(str, PyEnum):
    CONFIRMED = "confirmed"
    DRIVER_ASSIGNED = "driver_assigned"
    DRIVER_EN_ROUTE = "driver_en_route"
    DRIVER_ARRIVED = "driver_arrived"
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FLIGHT_CANCELLED = "flight_cancelled"


class Airport(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Airport master data entity.
    \"\"\"
    __tablename__ = "airports"

    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True) # e.g. PNQ, BOM, GOI, DEL
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    country: Mapped[str] = mapped_column(String(100), default="India", nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    base_airport_fee: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    free_waiting_mins: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    paid_waiting_rate_per_min: Mapped[float] = mapped_column(Float, default=3.0, nullable=False)

    terminals: Mapped[List["AirportTerminal"]] = relationship("AirportTerminal", back_populates="airport", cascade="all, delete-orphan")
    bookings: Mapped[List["AirportBooking"]] = relationship("AirportBooking", back_populates="airport")


class AirportTerminal(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Airport Terminal master entity with dedicated pickup/drop zone geofencing.
    \"\"\"
    __tablename__ = "airport_terminals"

    airport_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("airports.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. Terminal 2, Terminal 1 (Domestic)
    code: Mapped[str] = mapped_column(String(20), nullable=False) # T1, T2
    pickup_point_desc: Mapped[str] = mapped_column(String(255), default="Arrival Gate Pillar 4 / Cab Pickup Zone", nullable=False)
    drop_point_desc: Mapped[str] = mapped_column(String(255), default="Departure Gate Upper Level", nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    airport: Mapped["Airport"] = relationship("Airport", back_populates="terminals")
    bookings: Mapped[List["AirportBooking"]] = relationship("AirportBooking", back_populates="terminal")


class FlightSnapshot(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Centralized Flight Information Service snapshot cache.
    Stores verified flight numbers, schedule, delay metrics, and live status.
    \"\"\"
    __tablename__ = "flight_snapshots"

    flight_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True) # e.g. AI123, 6E402
    flight_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    airline_code: Mapped[str] = mapped_column(String(10), nullable=False) # AI, 6E, UK, SG
    airline_name: Mapped[str] = mapped_column(String(100), nullable=False) # Air India, IndiGo, Vistara
    departure_airport_code: Mapped[str] = mapped_column(String(10), nullable=False) # DEL, BOM
    arrival_airport_code: Mapped[str] = mapped_column(String(10), nullable=False) # PNQ, GOI
    scheduled_departure: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scheduled_arrival: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_or_estimated_arrival: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[FlightStatus] = mapped_column(Enum(FlightStatus), default=FlightStatus.SCHEDULED, nullable=False)
    delay_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    terminal: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    gate: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    baggage_belt: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    last_synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("flight_number", "flight_date", name="uq_flight_snapshot_num_date"),
    )


class AirportBooking(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Authoritative Flight-Aware Airport Booking entity.
    Connects Customer, Airport, Flight, Scheduled Ride, Driver Dispatch, Meet & Greet, and Hotel.
    \"\"\"
    __tablename__ = "airport_bookings"

    booking_reference: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True) # APT-YYMMDD-XXXX
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    airport_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("airports.id"), nullable=False, index=True)
    terminal_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("airport_terminals.id"), nullable=True, index=True)
    transfer_type: Mapped[AirportTransferType] = mapped_column(Enum(AirportTransferType), default=AirportTransferType.PICKUP, nullable=False)
    
    # Ride & Scheduling linkage
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id"), nullable=True, index=True)
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=True, index=True)
    vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True, index=True)
    vehicle_category: Mapped[str] = mapped_column(String(50), default="SEDAN", nullable=False) # SEDAN, SUV, PREMIUM, EV
    
    # Flight details
    flight_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    flight_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    airline_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    flight_status: Mapped[FlightStatus] = mapped_column(Enum(FlightStatus), default=FlightStatus.SCHEDULED, nullable=False)
    flight_scheduled_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    flight_updated_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    flight_delay_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Operational Pickup Planning
    scheduled_pickup_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recommended_pickup_window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recommended_pickup_window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Addresses
    pickup_address: Mapped[str] = mapped_column(String(500), nullable=False)
    pickup_lat: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lng: Mapped[float] = mapped_column(Float, nullable=False)
    drop_address: Mapped[str] = mapped_column(String(500), nullable=False)
    drop_lat: Mapped[float] = mapped_column(Float, nullable=False)
    drop_lng: Mapped[float] = mapped_column(Float, nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, default=15.0, nullable=False)

    # Passengers, Luggage & Special Services
    passenger_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    large_luggage_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    cabin_luggage_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    child_seat_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    child_seat_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    meet_and_greet_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    meet_and_greet_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    special_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Financials
    base_fare: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    distance_fare: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    airport_fee: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    meet_and_greet_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    child_seat_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    luggage_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    parking_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    waiting_fee: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_fare: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), default="WALLET", nullable=False)
    payment_status: Mapped[str] = mapped_column(String(50), default="PAID", nullable=False)

    # Cross-service linkages
    linked_hotel_booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("property_bookings.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Status
    status: Mapped[AirportBookingStatus] = mapped_column(Enum(AirportBookingStatus), default=AirportBookingStatus.CONFIRMED, nullable=False, index=True)
    cancelled_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    refund_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    airport: Mapped["Airport"] = relationship("Airport", back_populates="bookings")
    terminal: Mapped[Optional["AirportTerminal"]] = relationship("AirportTerminal", back_populates="bookings")
    waiting_logs: Mapped[List["AirportWaitingLog"]] = relationship("AirportWaitingLog", back_populates="booking", cascade="all, delete-orphan")


class AirportWaitingLog(Base, UUIDMixin, TimestampMixin):
    \"\"\"
    Operational log of driver airport arrival, free waiting grace period, and parking charges.
    \"\"\"
    __tablename__ = "airport_waiting_logs"

    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("airport_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False, index=True)
    driver_arrived_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    grace_period_mins: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    free_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    waiting_ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_waiting_mins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    billable_waiting_mins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    parking_charge: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    waiting_charge: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    booking: Mapped["AirportBooking"] = relationship("AirportBooking", back_populates="waiting_logs")

"""

if "FEATURE 18: AIRPORT SERVICE" not in content:
    with open(all_models_path, "a", encoding="utf-8") as f:
        f.write(feature18_models)
    print("Successfully appended Feature 18 models to all_models.py")
else:
    print("Feature 18 models already exist in all_models.py")
