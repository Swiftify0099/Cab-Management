"""
All SQLAlchemy models for CabBooking SuperApp.
Complete production schema with PostGIS geography columns.
"""
import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import List, Optional

from geoalchemy2 import Geography
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
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from common.database import Base
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
    label: Mapped[str] = mapped_column(String(100), nullable=False)  # Home, Office, etc.
    location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    landmark: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    full_address: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="saved_addresses")


# ============================================================
# DRIVER & VEHICLE
# ============================================================

class Driver(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "drivers"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    gender: Mapped[Optional[Gender]] = mapped_column(Enum(Gender), nullable=True)
    profile_photo: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    aadhaar_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    license_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    kyc_status: Mapped[KYCStatus] = mapped_column(Enum(KYCStatus), default=KYCStatus.PENDING)
    status: Mapped[DriverStatus] = mapped_column(Enum(DriverStatus), default=DriverStatus.OFFLINE)
    rating: Mapped[float] = mapped_column(Float, default=5.0)
    total_trips: Mapped[int] = mapped_column(Integer, default=0)
    total_earnings: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    wallet_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    fatigue_score: Mapped[float] = mapped_column(Float, default=0.0)
    suspension_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    current_location: Mapped[Optional[object]] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    home_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    referral_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="driver_profile")
    vehicle: Mapped[Optional["Vehicle"]] = relationship(back_populates="driver", uselist=False)
    documents: Mapped[List["DriverDocument"]] = relationship(back_populates="driver")
    trips: Mapped[List["Trip"]] = relationship(back_populates="driver")
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
    pickup_city: Mapped[str] = mapped_column(String(100), nullable=False)
    pickup_state: Mapped[str] = mapped_column(String(100), nullable=False)
    destination_location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    destination_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    destination_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    destination_city: Mapped[str] = mapped_column(String(100), nullable=False)
    destination_state: Mapped[str] = mapped_column(String(100), nullable=False)
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
    polyline: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Encoded Google Maps polyline
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(back_populates="trips")
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

class LiveTracking(Base, TimestampMixin):
    """Real-time driver location for a trip. Updated at ~1Hz."""
    __tablename__ = "live_tracking"

    trip_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), primary_key=True, nullable=False)
    driver_location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed_kmh: Mapped[float] = mapped_column(Float, default=0.0)
    heading: Mapped[float] = mapped_column(Float, default=0.0)
    accuracy: Mapped[float] = mapped_column(Float, default=0.0)

    trip: Mapped["Trip"] = relationship(back_populates="live_tracking")


# ============================================================
# PARCEL MODULE
# ============================================================

class Parcel(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "parcels"

    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    length_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    width_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dimensions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    is_fragile: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[ParcelStatus] = mapped_column(Enum(ParcelStatus), default=ParcelStatus.PENDING)
    receiver_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    receiver_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    parcel_charge: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=0)

    booking: Mapped["Booking"] = relationship(back_populates="parcel")


# ============================================================
# HOTEL MODULE
# ============================================================

class Hotel(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "hotels"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)
    price_per_night: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    images: Mapped[List[str]] = mapped_column(ARRAY(String), default=[])
    amenities: Mapped[dict] = mapped_column(JSONB, default={})
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    google_place_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    bookings: Mapped[List["HotelBooking"]] = relationship(back_populates="hotel")


class HotelBooking(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hotel_bookings"

    hotel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("hotels.id"), nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_profiles.id"), nullable=False)
    trip_booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    check_in: Mapped[date] = mapped_column(Date, nullable=False)
    check_out: Mapped[date] = mapped_column(Date, nullable=False)
    nights: Mapped[int] = mapped_column(Integer, nullable=False)
    guests: Mapped[int] = mapped_column(Integer, default=1)
    total_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus), default=BookingStatus.PENDING)

    hotel: Mapped["Hotel"] = relationship(back_populates="bookings")


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
    metadata: Mapped[dict] = mapped_column(JSONB, default={})
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


# ============================================================
# LIVE TRACKING  (Phase 5)
# ============================================================

class LiveTracking(Base, UUIDMixin):
    """
    1Hz GPS location updates from drivers during active trips.
    Partitioned by trip_id for fast range queries.
    Kept for 30 days then purged by Celery task.
    """
    __tablename__ = "live_tracking"

    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False, index=True
    )
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True
    )

    # PostGIS point (driver's GPS position)
    location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed_kmh: Mapped[float] = mapped_column(Float, default=0.0)
    heading: Mapped[float] = mapped_column(Float, default=0.0)     # degrees (0=N)
    accuracy_m: Mapped[float] = mapped_column(Float, default=0.0)  # GPS accuracy
    altitude_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # ETA fields (computed by matching-service)
    eta_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    distance_remaining_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    trip: Mapped["Trip"] = relationship("Trip", foreign_keys=[trip_id])
    driver: Mapped["Driver"] = relationship("Driver", foreign_keys=[driver_id])


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

