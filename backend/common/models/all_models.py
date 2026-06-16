"""
All SQLAlchemy models for CabBooking SuperApp.
Complete production schema with PostGIS geography columns.
"""
print("EXECUTING ALL MODELS", __name__)
import uuid
from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum as PyEnum
from typing import List, Optional

from geoalchemy2 import Geography, Geometry
from sqlalchemy import (
    ARRAY,
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.database import Base
Base.metadata.clear()
from common.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


# ============================================================
# ENUMS
# ============================================================

class UserRole(str, PyEnum):
    CUSTOMER = "customer"
    DRIVER = "driver"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class KYCStatus(str, PyEnum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class DriverStatus(str, PyEnum):
    OFFLINE = "offline"
    ONLINE = "online"
    ON_TRIP = "on_trip"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class TripStatus(str, PyEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    FULL = "full"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class BookingStatus(str, PyEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PAYMENT_PENDING = "payment_pending"
    PAID = "paid"
    DRIVER_ACCEPTED = "driver_accepted"
    STARTED = "started"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, PyEnum):
    RAZORPAY = "razorpay"
    CASHFREE = "cashfree"
    PHONEPE = "phonepe"
    STRIPE = "stripe"
    WALLET = "wallet"
    CASH = "cash"


class PaymentStatus(str, PyEnum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class LedgerType(str, PyEnum):
    BOOKING = "booking"
    REFUND = "refund"
    COMMISSION = "commission"
    SETTLEMENT = "settlement"
    WALLET_CREDIT = "wallet_credit"
    WALLET_DEBIT = "wallet_debit"
    REWARD = "reward"
    PLATFORM_FEE = "platform_fee"


class ParcelStatus(str, PyEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"


class StopType(str, PyEnum):
    PICKUP = "pickup"
    DROP = "drop"
    HOTEL = "hotel"
    FOOD = "food"
    FUEL = "fuel"
    REST = "rest"


class DocumentType(str, PyEnum):
    AADHAAR = "aadhaar"
    LICENSE = "license"
    RC_BOOK = "rc_book"
    INSURANCE = "insurance"
    VEHICLE_PHOTO = "vehicle_photo"
    SELFIE = "selfie"
    PAN = "pan"


class ComplaintType(str, PyEnum):
    DRIVER_BEHAVIOR = "driver_behavior"
    FARE_DISPUTE = "fare_dispute"
    PARCEL_DAMAGE = "parcel_damage"
    TRIP_ISSUE = "trip_issue"
    PAYMENT_ISSUE = "payment_issue"
    OTHER = "other"


class TicketStatus(str, PyEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class PenaltyReason(str, PyEnum):
    ACCEPTED_TRIP_REJECTED = "accepted_trip_rejected"
    LATE_CANCELLATION = "late_cancellation"
    CUSTOMER_COMPLAINT = "customer_complaint"
    DOCUMENT_EXPIRED = "document_expired"
    GPS_SPOOF = "gps_spoof"


class DiscountType(str, PyEnum):
    PERCENTAGE = "percentage"
    FLAT = "flat"


class SubscriptionPlanType(str, PyEnum):
    BASIC = "basic"
    PREMIUM = "premium"
    VIP = "vip"


class RewardTransactionType(str, PyEnum):
    EARNED = "earned"
    REDEEMED = "redeemed"
    EXPIRED = "expired"
    BONUS = "bonus"


class Gender(str, PyEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class VehicleType(str, PyEnum):
    HATCHBACK = "hatchback"
    SEDAN = "sedan"
    SUV = "suv"
    TEMPO_TRAVELLER = "tempo_traveller"
    MINI_BUS = "mini_bus"
    BIKE = "bike"


class NotificationType(str, PyEnum):
    BOOKING = "booking"
    DRIVER = "driver"
    PAYMENT = "payment"
    PROMOTION = "promotion"
    SOS = "sos"
    SYSTEM = "system"
    THEME = "theme"
    VENDOR = "vendor"
    PROPERTY = "property"


class VendorStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class PropertyType(str, PyEnum):
    HOTEL = "hotel"
    LODGE = "lodge"
    ROOM = "room"
    RESORT = "resort"


class PropertyStatus(str, PyEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


# ============================================================
# USER & AUTH
# ============================================================

class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Core user entity. Shared across customer, driver, admin roles."""
    __tablename__ = "users"

    phone: Mapped[str] = mapped_column(String(15), unique=True, nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_profile_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    device_token: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)  # FCM token
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)

    # Relationships
    customer_profile: Mapped[Optional["CustomerProfile"]] = relationship(back_populates="user", uselist=False)
    driver_profile: Mapped[Optional["Driver"]] = relationship(back_populates="user", uselist=False)
    admin_profile: Mapped[Optional["AdminProfile"]] = relationship(back_populates="user", uselist=False)
    saved_addresses: Mapped[List["SavedAddress"]] = relationship(back_populates="user")
    saved_routes: Mapped[List["SavedRoute"]] = relationship(back_populates="user")
    notifications: Mapped[List["Notification"]] = relationship(back_populates="user")


class OTPRecord(Base, UUIDMixin, TimestampMixin):
    """OTP tracking for rate limiting and verification."""
    __tablename__ = "otp_records"

    phone: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    otp_code: Mapped[str] = mapped_column(String(10), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class RefreshToken(Base, UUIDMixin, TimestampMixin):
    """Refresh token store with device tracking and rotation."""
    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    device_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    device_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


# ============================================================
# CUSTOMER PROFILE
# ============================================================

class CustomerProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "customer_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    gender: Mapped[Optional[Gender]] = mapped_column(Enum(Gender), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    emergency_contact: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    profile_photo: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    reward_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wallet_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    subscription_plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=True)
    women_only_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    referral_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="customer_profile")
    subscription_plan: Mapped[Optional["SubscriptionPlan"]] = relationship()
    bookings: Mapped[List["Booking"]] = relationship(back_populates="customer")
    favorite_drivers: Mapped[List["FavoriteDriver"]] = relationship(back_populates="customer")


class SavedAddress(Base, UUIDMixin, TimestampMixin):
    """Max 5 addresses per customer."""
    __tablename__ = "saved_addresses"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    address_type: Mapped[str] = mapped_column(String(20), default="general", server_default="general", nullable=False)  # "general", "pickup", "drop"
    label: Mapped[str] = mapped_column(String(100), nullable=False)  # Home, Office, etc.
    location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    landmark: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    full_address: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="saved_addresses")


class SavedRoute(Base, UUIDMixin, TimestampMixin):
    """A saved pickup+drop route pair for quick cab booking."""
    __tablename__ = "saved_routes"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    route_name: Mapped[str] = mapped_column(String(150), nullable=False)  # e.g. "Home → Office"
    # Pickup
    pickup_label: Mapped[str] = mapped_column(String(100), nullable=False)
    pickup_address: Mapped[str] = mapped_column(Text, nullable=False)
    pickup_lat: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lon: Mapped[float] = mapped_column(Float, nullable=False)
    # Drop
    drop_label: Mapped[str] = mapped_column(String(100), nullable=False)
    drop_address: Mapped[str] = mapped_column(Text, nullable=False)
    drop_lat: Mapped[float] = mapped_column(Float, nullable=False)
    drop_lon: Mapped[float] = mapped_column(Float, nullable=False)

    user: Mapped["User"] = relationship(back_populates="saved_routes")


# ============================================================
# DRIVER & VEHICLE
# ============================================================

class Driver(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "drivers"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True, index=True)
    gender: Mapped[Optional[Gender]] = mapped_column(Enum(Gender), nullable=True)
    profile_photo: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    aadhaar_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    license_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    kyc_status: Mapped[KYCStatus] = mapped_column(Enum(KYCStatus), default=KYCStatus.PENDING)
    status: Mapped[DriverStatus] = mapped_column(Enum(DriverStatus), default=DriverStatus.OFFLINE)
    # is_online / is_active / is_verified — derived from status & kyc_status for backwards-compat
    _is_online: Mapped[bool] = mapped_column("is_online", Boolean, default=False, nullable=False)
    _is_active: Mapped[bool] = mapped_column("is_active", Boolean, default=True, nullable=False)
    _is_verified: Mapped[bool] = mapped_column("is_verified", Boolean, default=False, nullable=False)
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    current_trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True)
    rating: Mapped[float] = mapped_column(Float, default=5.0)
    total_trips: Mapped[int] = mapped_column(Integer, default=0)
    total_earnings: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    wallet_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    fatigue_score: Mapped[float] = mapped_column(Float, default=0.0)
    suspension_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    current_location: Mapped[Optional[object]] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    home_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    referral_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)

    @property
    def is_online(self) -> bool:
        return self._is_online or self.status == DriverStatus.ONLINE

    @is_online.setter
    def is_online(self, value: bool):
        self._is_online = value

    @property
    def is_active(self) -> bool:
        return self._is_active

    @is_active.setter
    def is_active(self, value: bool):
        self._is_active = value

    @property
    def is_verified(self) -> bool:
        return self._is_verified or self.kyc_status == KYCStatus.APPROVED

    @is_verified.setter
    def is_verified(self, value: bool):
        self._is_verified = value

    # Relationships
    user: Mapped["User"] = relationship(back_populates="driver_profile")
    vehicle: Mapped[Optional["Vehicle"]] = relationship(back_populates="driver", uselist=False)
    documents: Mapped[List["DriverDocument"]] = relationship(back_populates="driver")
    trips: Mapped[List["Trip"]] = relationship(back_populates="driver", foreign_keys="[Trip.driver_id]")
    penalties: Mapped[List["DriverPenalty"]] = relationship(back_populates="driver")


class Vehicle(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "vehicles"

    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), unique=True, nullable=False)
    vehicle_type: Mapped[VehicleType] = mapped_column(Enum(VehicleType), nullable=False)
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    color: Mapped[str] = mapped_column(String(50), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    seat_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    parcel_capable: Mapped[bool] = mapped_column(Boolean, default=False)
    parcel_capacity_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    has_ac: Mapped[bool] = mapped_column(Boolean, default=True)
    insurance_expiry: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    pollution_expiry: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    photos: Mapped[List[str]] = mapped_column(ARRAY(String), default=[])

    driver: Mapped["Driver"] = relationship(back_populates="vehicle")


class DriverDocument(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "driver_documents"

    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True)
    doc_type: Mapped[DocumentType] = mapped_column(Enum(DocumentType), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expires_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    driver: Mapped["Driver"] = relationship(back_populates="documents")


class AdminProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "admin_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.ADMIN)
    is_2fa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    totp_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True)
    permissions: Mapped[dict] = mapped_column(JSONB, default={})
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    user: Mapped["User"] = relationship(back_populates="admin_profile")


# ============================================================
# TRIPS & BOOKINGS
# ============================================================

class Trip(Base, UUIDMixin, TimestampMixin):
    """A driver-created intercity trip that customers can book seats on."""
    __tablename__ = "trips"

    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False, index=True)
    pickup_location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    pickup_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    destination_location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    destination_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    destination_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    departure_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    estimated_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    total_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    available_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    window_seats: Mapped[int] = mapped_column(Integer, default=0)
    available_window_seats: Mapped[int] = mapped_column(Integer, default=0)
    window_seat_charge: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=0)
    family_trip_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    women_only: Mapped[bool] = mapped_column(Boolean, default=False)
    parcel_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    non_stop: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[TripStatus] = mapped_column(Enum(TripStatus), default=TripStatus.DRAFT, index=True)
    base_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    per_km_rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    vehicle_type: Mapped[str] = mapped_column(String(50), nullable=False, server_default="sedan")
    polyline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Encoded Google Maps polyline
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(back_populates="trips", foreign_keys="[Trip.driver_id]")
    bookings: Mapped[List["Booking"]] = relationship(back_populates="trip")
    route_stops: Mapped[List["RouteStop"]] = relationship(back_populates="trip", order_by="RouteStop.sequence_order")
    live_tracking: Mapped[Optional["LiveTracking"]] = relationship(back_populates="trip", uselist=False)


class RouteStop(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "route_stops"

    trip_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    stop_type: Mapped[StopType] = mapped_column(Enum(StopType), nullable=False)
    location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    estimated_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)

    trip: Mapped["Trip"] = relationship(back_populates="route_stops")


class Booking(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "bookings"

    trip_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_profiles.id"), nullable=False, index=True)
    seat_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    window_seat: Mapped[bool] = mapped_column(Boolean, default=False)
    window_seat_count: Mapped[int] = mapped_column(Integer, default=0)
    luggage_count: Mapped[int] = mapped_column(Integer, default=0)
    luggage_weight_kg: Mapped[float] = mapped_column(Float, default=0.0)
    is_family_trip: Mapped[bool] = mapped_column(Boolean, default=False)
    has_parcel: Mapped[bool] = mapped_column(Boolean, default=False)
    base_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    window_seat_charge: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=0)
    platform_fee: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=10)  # Rs 10 per seat
    coupon_discount: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=0)
    wallet_used: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    total_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    coupon_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("coupons.id"), nullable=True)
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus), default=BookingStatus.PENDING, index=True)
    pickup_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    drop_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    driver_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    customer_rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    trip: Mapped["Trip"] = relationship(back_populates="bookings")
    customer: Mapped["CustomerProfile"] = relationship(back_populates="bookings")
    parcel: Mapped[Optional["Parcel"]] = relationship(back_populates="booking", uselist=False)
    transaction: Mapped[Optional["Transaction"]] = relationship(back_populates="booking", uselist=False)
    coupon: Mapped[Optional["Coupon"]] = relationship()


# ============================================================
# LIVE TRACKING
# ============================================================

class LiveTracking(Base, UUIDMixin, TimestampMixin):
    """Real-time driver location for a trip. Upserted on every GPS push."""
    __tablename__ = "live_tracking"

    trip_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=True, index=True)
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    driver_location: Mapped[Optional[object]] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed_kmh: Mapped[float] = mapped_column(Float, default=0.0)
    heading: Mapped[float] = mapped_column(Float, default=0.0)
    accuracy_m: Mapped[float] = mapped_column(Float, default=0.0)
    altitude_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    eta_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    distance_remaining_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    arrival_alert_sent: Mapped[bool] = mapped_column(Boolean, default=False)  # True once 10km/10min alert sent
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    trip: Mapped["Trip"] = relationship(back_populates="live_tracking")


# ============================================================
# PARCEL MODULE
# ============================================================

class Parcel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "parcels"

    # Optional legacy link to a seat booking (may be NULL for standalone parcels)
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=True)
    # Direct links for parcel-service usage
    trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True, index=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=True, index=True)
    # Tracking
    tracking_number: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True, index=True)
    # Sender info
    sender_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sender_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    # Receiver info
    receiver_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    receiver_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    receiver_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Parcel details
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    length_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    width_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dimensions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_fragile: Mapped[bool] = mapped_column(Boolean, default=False)
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    declared_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    # Pricing
    fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    parcel_charge: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=0)
    # Status & delivery
    status: Mapped[ParcelStatus] = mapped_column(Enum(ParcelStatus), default=ParcelStatus.PENDING)
    delivery_otp: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    proof_image: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    image_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    parcel_photo: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    booking: Mapped[Optional["Booking"]] = relationship(back_populates="parcel")


# ============================================================
# ============================================================
# PROPERTY & VENDOR MODULE
# ============================================================

class Vendor(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "vendors"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    aadhaar_number: Mapped[str] = mapped_column(String(20), nullable=False)
    pan_number: Mapped[str] = mapped_column(String(20), nullable=False)
    gst_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    status: Mapped[VendorStatus] = mapped_column(Enum(VendorStatus), default=VendorStatus.PENDING)

    applications: Mapped[List["VendorApplication"]] = relationship(back_populates="vendor")
    properties: Mapped[List["Property"]] = relationship(back_populates="vendor")


class VendorApplication(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "vendor_applications"

    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    documents: Mapped[dict] = mapped_column(JSONB, default={})
    status: Mapped[VendorStatus] = mapped_column(Enum(VendorStatus), default=VendorStatus.PENDING)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    vendor: Mapped["Vendor"] = relationship(back_populates="applications")


class Property(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "properties"

    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[PropertyType] = mapped_column(Enum(PropertyType), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[PropertyStatus] = mapped_column(Enum(PropertyStatus), default=PropertyStatus.DRAFT)
    policies: Mapped[dict] = mapped_column(JSONB, default={})
    rating: Mapped[float] = mapped_column(Float, default=0.0)

    vendor: Mapped["Vendor"] = relationship(back_populates="properties")
    units: Mapped[List["PropertyUnit"]] = relationship(back_populates="property")
    images: Mapped[List["PropertyImage"]] = relationship(back_populates="property")
    bookings: Mapped[List["PropertyBooking"]] = relationship(back_populates="property")


class PropertyUnit(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "property_units"

    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    amenities: Mapped[dict] = mapped_column(JSONB, default={})
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    property: Mapped["Property"] = relationship(back_populates="units")


class PropertyImage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "property_images"

    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    unit_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("property_units.id", ondelete="CASCADE"), nullable=True)
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)

    property: Mapped["Property"] = relationship(back_populates="images")


class PropertyBooking(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "property_bookings"

    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    unit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("property_units.id"), nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_profiles.id"), nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    check_in: Mapped[date] = mapped_column(Date, nullable=False)
    check_out: Mapped[date] = mapped_column(Date, nullable=False)
    nights: Mapped[int] = mapped_column(Integer, nullable=False)
    guests: Mapped[int] = mapped_column(Integer, default=1)
    total_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus), default=BookingStatus.PENDING)

    property: Mapped["Property"] = relationship(back_populates="bookings")


class BookingGuest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "booking_guests"
    
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("property_bookings.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    id_proof_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)


# ============================================================
# PAYMENTS & FINANCE
# ============================================================

class Transaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "transactions"

    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    payment_method: Mapped[PaymentMethod] = mapped_column(Enum(PaymentMethod), nullable=False)
    gateway_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    gateway_order_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.PENDING, index=True)
    ledger_type: Mapped[LedgerType] = mapped_column(Enum(LedgerType), nullable=False)
    tx_metadata: Mapped[dict] = mapped_column("metadata", JSONB, default={})
    refunded_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    booking: Mapped[Optional["Booking"]] = relationship(back_populates="transaction")


class WalletTransaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wallet_transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    transaction_type: Mapped[LedgerType] = mapped_column(Enum(LedgerType), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    ref_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)


class DriverSettlement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "driver_settlements"

    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False, index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    gross_earnings: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    commission_deducted: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    penalties_deducted: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    bank_ref: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


# ============================================================
# COUPONS & REFERRALS
# ============================================================

class Coupon(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "coupons"

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    discount_type: Mapped[DiscountType] = mapped_column(Enum(DiscountType), nullable=False)
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    max_discount_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    min_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    max_uses: Mapped[int] = mapped_column(Integer, nullable=False)
    uses_count: Mapped[int] = mapped_column(Integer, default=0)
    per_user_limit: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    applicable_for: Mapped[str] = mapped_column(String(50), default="all")  # all, new_users, subscribed


class Referral(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "referrals"
    __table_args__ = (UniqueConstraint("referrer_id", "referee_id"),)

    referrer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    referee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    referrer_reward: Mapped[int] = mapped_column(Integer, default=100)  # points
    referee_reward: Mapped[int] = mapped_column(Integer, default=50)   # points
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, rewarded
    rewarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


# ============================================================
# REWARDS & SUBSCRIPTIONS
# ============================================================

class SubscriptionPlan(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "subscription_plans"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    plan_type: Mapped[SubscriptionPlanType] = mapped_column(Enum(SubscriptionPlanType), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    benefits: Mapped[dict] = mapped_column(JSONB, default={})
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class RewardTransaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reward_transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    transaction_type: Mapped[RewardTransactionType] = mapped_column(Enum(RewardTransactionType), nullable=False)
    ref_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class FavoriteDriver(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "favorite_drivers"
    __table_args__ = (UniqueConstraint("customer_id", "driver_id"),)

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_profiles.id"), nullable=False)
    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False)

    customer: Mapped["CustomerProfile"] = relationship(back_populates="favorite_drivers")


# ============================================================
# NOTIFICATIONS
# ============================================================

class Notification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, default={})
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    fcm_message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    user: Mapped["User"] = relationship(back_populates="notifications")


# ============================================================
# COMPLAINTS & SUPPORT
# ============================================================

class Complaint(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "complaints"

    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    raised_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    complaint_type: Mapped[ComplaintType] = mapped_column(Enum(ComplaintType), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), default=TicketStatus.OPEN)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)


class SupportTicket(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "support_tickets"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), default=TicketStatus.OPEN)
    priority: Mapped[str] = mapped_column(String(20), default="normal")  # low, normal, high, urgent
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    messages: Mapped[dict] = mapped_column(JSONB, default={"messages": []})


# ============================================================
# THEMES
# ============================================================

class Theme(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "themes"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    is_festival: Mapped[bool] = mapped_column(Boolean, default=False)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False)
    preview_image: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class Banner(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "banners"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    image_path: Mapped[str] = mapped_column(String(512), nullable=False)
    link_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    target_screen: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sequence_order: Mapped[int] = mapped_column(Integer, default=0)
    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


# ============================================================
# AUDIT LOGS
# ============================================================

class AuditLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    admin_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    before_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    after_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)


# ============================================================
# DRIVER PENALTIES
# ============================================================

class DriverPenalty(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "driver_penalties"

    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False, index=True)
    reason: Mapped[PenaltyReason] = mapped_column(Enum(PenaltyReason), nullable=False)
    fine_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    suspension_days: Mapped[int] = mapped_column(Integer, default=0)

    driver: Mapped["Driver"] = relationship(back_populates="penalties")


# ============================================================
# FARE RULES
# ============================================================

class FareRule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "fare_rules"

    route_pattern: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pickup_state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    destination_state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vehicle_type: Mapped[Optional[VehicleType]] = mapped_column(Enum(VehicleType), nullable=True)
    base_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    per_km_rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    surge_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    effective_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)



class TripStop(Base, UUIDMixin, TimestampMixin):
    """Intermediate stops on a multi-city trip route."""
    __tablename__ = "trip_stops"

    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False, index=True
    )
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    arrival_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    departure_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    stop_duration_minutes: Mapped[int] = mapped_column(Integer, default=10)

    # PostGIS
    location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    trip: Mapped["Trip"] = relationship("Trip", foreign_keys=[trip_id])


# ============================================================
# PRE-BOOKING (Customer intent before a driver exists)
# ============================================================

class PendingBookingStatus(str, PyEnum):
    WAITING   = "waiting"
    MATCHED   = "matched"
    CANCELLED = "cancelled"
    EXPIRED   = "expired"


class PendingBooking(Base, UUIDMixin, TimestampMixin):
    """
    A customer's travel intent submitted BEFORE any driver has created a
    matching trip.  Stored for up to 24 hours; matched drivers are notified
    the moment a suitable trip is published.
    """
    __tablename__ = "pending_bookings"

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Pickup
    pickup_address: Mapped[str]  = mapped_column(Text, nullable=False)
    pickup_lat:     Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lng:     Mapped[float] = mapped_column(Float, nullable=False)
    pickup_location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )

    # Destination
    destination_address: Mapped[str]  = mapped_column(Text, nullable=False)
    destination_lat:     Mapped[float] = mapped_column(Float, nullable=False)
    destination_lng:     Mapped[float] = mapped_column(Float, nullable=False)
    destination_location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )

    # Travel window
    travel_date: Mapped[date]         = mapped_column(Date, nullable=False)
    from_time:   Mapped[time]         = mapped_column(Time, nullable=False)
    to_time:     Mapped[time]         = mapped_column(Time, nullable=False)

    # Preferences
    seats_required: Mapped[int]  = mapped_column(Integer, default=1, nullable=False)
    parcel:         Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    women_only:     Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Status
    status:     Mapped[PendingBookingStatus] = mapped_column(
        Enum(PendingBookingStatus, native_enum=False, length=50, values_callable=lambda obj: [e.value for e in obj]), default=PendingBookingStatus.WAITING, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    customer:    Mapped["User"] = relationship(foreign_keys=[customer_id])
    rejections:  Mapped[List["DriverRejection"]] = relationship(back_populates="pending_booking")


# ============================================================
# DRIVER REJECTION — Industry-standard DB-persisted reject-hide
# ============================================================

class DriverRejection(Base, UUIDMixin, TimestampMixin):
    """
    Persists every explicit driver rejection of a customer booking.

    Industry standard (Uber/Ola): store in DB so the customer is permanently
    hidden from that driver's scan screen for this booking lifecycle, even
    across app restarts.  Redis is NOT used for this — it is too volatile.

    Unique constraint prevents duplicate rows.  If the same booking is
    rejected a second time (edge-case retry), the upsert is idempotent.
    """
    __tablename__ = "driver_rejections"
    __table_args__ = (UniqueConstraint("driver_id", "pending_booking_id"),)

    driver_id:          Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    pending_booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pending_bookings.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    # Optional: which booking_id (seat booking) triggered the rejection
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True
    )
    rejected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    driver:          Mapped["Driver"]         = relationship(foreign_keys=[driver_id])
    pending_booking: Mapped["PendingBooking"] = relationship(back_populates="rejections")


# ============================================================
# DRIVER POINT WALLET
# ============================================================

class DriverPointWallet(Base, UUIDMixin, TimestampMixin):
    """Point balance ledger for a driver.  Created on first trip creation."""
    __tablename__ = "driver_point_wallets"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        unique=True, nullable=False
    )
    balance: Mapped[int] = mapped_column(Integer, default=2500, nullable=False)

    driver:       Mapped["Driver"]               = relationship(foreign_keys=[driver_id])
    transactions: Mapped[List["DriverPointTransaction"]] = relationship(back_populates="wallet")


class DriverPointTransaction(Base, UUIDMixin, TimestampMixin):
    """Audit log for every point credit / debit."""
    __tablename__ = "driver_point_transactions"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("driver_point_wallets.id"),
        nullable=False
    )
    delta:  Mapped[int] = mapped_column(Integer, nullable=False)   # negative = debit
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    ref_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)  # booking_id

    driver: Mapped["Driver"]           = relationship(foreign_keys=[driver_id])
    wallet: Mapped["DriverPointWallet"] = relationship(back_populates="transactions")


# ============================================================
# SHOWROOM  (Map markers for vehicle showrooms near the route)
# ============================================================

class Showroom(Base, UUIDMixin, TimestampMixin):
    """Vehicle showroom / service centre shown as map markers."""
    __tablename__ = "showrooms"

    name:        Mapped[str]           = mapped_column(String(255), nullable=False)
    brand:       Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address:     Mapped[str]           = mapped_column(Text, nullable=False)
    city:        Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state:       Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    lat:         Mapped[float]         = mapped_column(Float, nullable=False)
    lng:         Mapped[float]         = mapped_column(Float, nullable=False)
    location:    Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    contact:     Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active:   Mapped[bool]          = mapped_column(Boolean, default=True)


# ============================================================
# POLYGON + ROUTE CORRIDOR MATCHING  (Phase 2 Geo System)
# ============================================================

class TripPolygons(Base, UUIDMixin, TimestampMixin):
    """
    Driver-drawn service area polygons for a trip.

    pickup_polygon      — area near the start city where the driver will pick up
    destination_polygon — area near the end city where the driver will drop off

    Stored as PostGIS GEOMETRY(POLYGON,4326) so ST_Within queries are instant.
    """
    __tablename__ = "trip_polygons"

    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    # Pickup service area polygon drawn by driver
    pickup_polygon: Mapped[Optional[object]] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326), nullable=True
    )
    # Destination service area polygon drawn by driver
    destination_polygon: Mapped[Optional[object]] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326), nullable=True
    )

    trip: Mapped["Trip"] = relationship("Trip", foreign_keys=[trip_id])


class TripRouteGeometry(Base, UUIDMixin, TimestampMixin):
    """
    Google Directions route stored as PostGIS geometry.

    route_linestring — decoded polyline as LINESTRING(4326)
    route_buffer     — ST_Buffer(route_linestring::geography, 3000)::geometry
                       3 KM corridor around the route.  Customers whose current
                       GPS falls inside this polygon are eligible for matching.
    """
    __tablename__ = "trip_route_geometry"

    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    # Google Directions overview polyline decoded to PostGIS LINESTRING
    route_linestring: Mapped[Optional[object]] = mapped_column(
        Geometry(geometry_type="LINESTRING", srid=4326), nullable=True
    )
    # Auto-generated 3 KM buffer corridor around the route
    route_buffer: Mapped[Optional[object]] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326), nullable=True
    )
    # Store raw encoded polyline for re-rendering on frontend
    encoded_polyline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Route metadata
    distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    trip: Mapped["Trip"] = relationship("Trip", foreign_keys=[trip_id])


class CustomerLocation(Base, UUIDMixin, TimestampMixin):
    """
    Live customer GPS — upserted on every location push.

    One row per customer (unique constraint on customer_id).
    Used to check if a customer has entered a trip's route corridor.
    """
    __tablename__ = "customer_locations"
    __table_args__ = (UniqueConstraint("customer_id"),)

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


# ============================================================
# RATINGS & REVIEWS
# ============================================================

class Rating(Base, UUIDMixin, TimestampMixin):
    """
    Ratings for trips. Customers rate drivers, and drivers rate customers.
    """
    __tablename__ = "ratings"
    __table_args__ = (UniqueConstraint("booking_id", "from_user_id", name="uq_rating_booking_user"),)

    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    to_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[int] = mapped_column(Integer, nullable=False) # 1 to 5
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    booking: Mapped["Booking"] = relationship("Booking", foreign_keys=[booking_id])




# ============================================================
# PROMOTIONS & COUPONS
# ============================================================



class UserCoupon(Base, UUIDMixin, TimestampMixin):
    """
    Tracks which users have used which coupons (to prevent multi-use if limited).
    """
    __tablename__ = "user_coupons"
    __table_args__ = (UniqueConstraint("user_id", "coupon_id", name="uq_user_coupon"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    coupon_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coupons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False
    )
    discount_applied: Mapped[float] = mapped_column(Float, nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    coupon: Mapped["Coupon"] = relationship("Coupon", foreign_keys=[coupon_id])
    booking: Mapped["Booking"] = relationship("Booking", foreign_keys=[booking_id])


# ============================================================
# DRIVER LOCATION (live GPS table — one row per driver)
# ============================================================

class DriverLocation(Base, UUIDMixin):
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
    )


# ============================================================
# COMPATIBILITY ALIASES
# (admin-service and parcel-service import these names)
# ============================================================

# Alias: Customer -> CustomerProfile
Customer = CustomerProfile

# Alias: Payment -> Transaction (Transaction holds all payment records)
Payment = Transaction

# Alias: KYCDocument -> DriverDocument
KYCDocument = DriverDocument

# Alias: ComplaintStatus -> TicketStatus (Complaint.status uses TicketStatus)
ComplaintStatus = TicketStatus

# Alias: CouponType -> DiscountType
CouponType = DiscountType
