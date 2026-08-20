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
from sqlalchemy.orm import Mapped, mapped_column, relationship as orm_relationship, relationship

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
    PAN = "pan"
    SELFIE = "selfie"
    LICENSE = "license"
    POLICE_VERIFICATION = "police_verification"
    RC_BOOK = "rc_book"
    INSURANCE = "insurance"
    PERMIT = "permit"
    PUC = "puc"
    VEHICLE_PHOTO = "vehicle_photo"
    BANK_ACCOUNT = "bank_account"


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
    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Feature 12: Driver Cancellation & Restriction Performance Metrics
    cancellation_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_cancellations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    penalty_cancellations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    restriction_status: Mapped[str] = mapped_column(String(30), default="NORMAL", nullable=False)  # NORMAL, WARNING, RESTRICTED, TEMPORARILY_SUSPENDED
    restriction_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    restriction_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

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
    bank_account: Mapped[Optional["DriverBankAccount"]] = relationship(back_populates="driver", uselist=False)


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
    document_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    issue_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    expires_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="uploaded", nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, default={})
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    driver: Mapped["Driver"] = relationship(back_populates="documents")


class DriverBankAccount(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "driver_bank_accounts"

    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    account_holder_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number_masked: Mapped[str] = mapped_column(String(50), nullable=False)
    account_number_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    ifsc_code: Mapped[str] = mapped_column(String(20), nullable=False)
    account_type: Mapped[str] = mapped_column(String(20), default="savings", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    driver: Mapped["Driver"] = relationship(back_populates="bank_account")


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
    ride_request: Mapped[Optional["RideRequest"]] = relationship("RideRequest", foreign_keys=[ride_id])


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
    )



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
    start_accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Feature 10: During Ride / Live Trip Execution
    distance_travelled_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    waiting_duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    waiting_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.0"), nullable=False)
    current_estimated_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.0"), nullable=False)
    has_active_sos: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    destination_change_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Feature 11: Waiting System & Pickup Delays
    free_waiting_ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    paid_waiting_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_waiting_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pickup_waiting_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.0"), nullable=False)
    is_no_show_eligible: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Feature 13 & 14: Trip Completion, Final Fare & Financial Settlement
    destination_arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    final_fare: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    driver_earning: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    platform_commission: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(30), default="cash", nullable=False)  # cash, upi, card, wallet
    payment_status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending, paid, failed, cash_collected
    tip_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Feature 21: Back-to-Back Rides Continuous Dispatch
    is_back_to_back: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Feature 26: Scheduled / Reserved Trips
    is_scheduled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scheduled_pickup_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_status: Mapped[str] = mapped_column(String(30), default="UNASSIGNED", nullable=False)  # UNASSIGNED, RESERVED, DISPATCHED, ACTIVE, CANCELLED, AUTO_RELEASED
    reservation_accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    dispatch_buffer_minutes: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    auto_release_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"), nullable=True)
    next_ride_reserved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_ride_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

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
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])


# ============================================================
# SMART RIDE SELECTION & RADAR (Feature 6)
# ============================================================

class DriverPreference(Base, UUIDMixin, TimestampMixin):
    """
    Driver personal matching preferences for Smart Ride Selection & Radar.
    One row per driver.
    """
    __tablename__ = "driver_preferences"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        unique=True, index=True, nullable=False
    )
    mode: Mapped[str] = mapped_column(String(30), default="balanced", nullable=False)  # balanced, earnings_focus, nearby_focus, short_trips, long_trips, airport_focus
    allow_local: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_airport: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    allow_outstation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allow_scheduled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    min_earning_cutoff: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_pickup_distance_km: Mapped[float] = mapped_column(Float, default=7.0, nullable=False)
    max_pickup_eta_min: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    
    # Destination Mode (Feature 20)
    destination_mode: Mapped[str] = mapped_column(String(20), default="off", nullable=False)  # off, flexible, strict
    destination_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    destination_location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    destination_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    destination_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    destination_mode_state: Mapped[str] = mapped_column(String(30), default="OFF", nullable=False)  # OFF, SETTING, ACTIVE, PAUSED, REACHED, EXPIRED, DISABLED
    destination_mode_pref: Mapped[str] = mapped_column(String(20), default="balanced", nullable=False)  # flexible, balanced, strict
    destination_activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    destination_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    destination_rides_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    destination_max_rides: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    destination_radius_km: Mapped[float] = mapped_column(Float, default=1.5, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])


class AirportZone(Base, UUIDMixin, TimestampMixin):
    """
    Authoritative geofenced airport zones for high-precision airport ride classification.
    """
    __tablename__ = "airport_zones"

    airport_code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)  # PNQ, BOM, DEL
    airport_name: Mapped[str] = mapped_column(String(100), nullable=False)
    city: Mapped[str] = mapped_column(String(50), nullable=False)
    boundary: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326), nullable=True
    )
    center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    center_lng: Mapped[float] = mapped_column(Float, nullable=False)
    radius_meters: Mapped[float] = mapped_column(Float, default=2500.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class SmartRadarSession(Base, UUIDMixin, TimestampMixin):
    """
    Active Smart Ride Radar session for a driver containing candidate offers.
    """
    __tablename__ = "smart_radar_sessions"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        index=True, nullable=False
    )
    candidate_ride_ids: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    active_selection_ids: Mapped[List[str]] = mapped_column(ARRAY(String), default=[], nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active, closed, matched, expired
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])


# ============================================================
# NAVIGATION & ROAD HAZARDS (Feature 7)
# ============================================================

class RoadHazard(Base, UUIDMixin, TimestampMixin):
    """
    Driver-reported and system-verified road hazards with PostGIS spatial clustering.
    """
    __tablename__ = "road_hazards"

    hazard_type: Mapped[str] = mapped_column(String(50), nullable=False)  # construction, pothole, accident, road_closed, heavy_traffic, flooding, other
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    heading: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    speed_kmh: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Validation & Clustering
    status: Mapped[str] = mapped_column(String(30), default="reported", nullable=False)  # reported, verified, resolved, expired
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)  # increases with multiple reports
    report_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    reported_by_driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Relationships
    reporter: Mapped[Optional["Driver"]] = relationship(foreign_keys=[reported_by_driver_id])


class RouteNavigationLog(Base, UUIDMixin, TimestampMixin):
    """
    Audit log for tracking external Map/Route API requests vs internal PostGIS cache hits.
    Provides authoritative cost monitoring KPI: API Calls Per Completed Ride.
    """
    __tablename__ = "route_navigation_logs"

    provider: Mapped[str] = mapped_column(String(50), default="google_routes", nullable=False)  # google_routes, postgis_math, redis_cache
    endpoint: Mapped[str] = mapped_column(String(100), nullable=False)
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    request_type: Mapped[str] = mapped_column(String(50), nullable=False)  # initial_route, reroute, arrival_check, hazard_lookup
    cache_hit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    prevented_by_postgis: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    response_time_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="success", nullable=False)
    estimated_cost_usd: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)



# ============================================================
# CUSTOMER COMMUNICATION & RIDE START (Features 8 & 9)
# ============================================================

class RideMessage(Base, UUIDMixin, TimestampMixin):
    """
    In-App real-time chat messages between Driver and Customer for active ride.
    Server-authoritative validation ensures participants belong to the ride.
    """
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
    ride_request: Mapped["RideRequest"] = orm_relationship("RideRequest", foreign_keys=[ride_id])
    sender: Mapped["User"] = relationship(foreign_keys=[sender_id])
    receiver: Mapped["User"] = relationship(foreign_keys=[receiver_id])


class CallSession(Base, UUIDMixin, TimestampMixin):
    """
    Secure masked phone calling session. Real phone numbers are NEVER exposed.
    """
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
    ride_request: Mapped["RideRequest"] = orm_relationship("RideRequest", foreign_keys=[ride_id])
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])


class RideEventLog(Base, UUIDMixin, TimestampMixin):
    """
    Server-authoritative audit log for ride lifecycle, assistance events, and fraud detection.
    """
    __tablename__ = "ride_event_logs"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor_role: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)

# ============================================================


# ============================================================
# DURING RIDE: MULTI-STOP & EMERGENCY SOS (Feature 10)
# ============================================================

class RideStop(Base, UUIDMixin, TimestampMixin):
    """
    Intermediate stops added by Customer or Driver during an active ride.
    """
    __tablename__ = "ride_stops"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending, accepted, arrived, completed, skipped
    requested_by: Mapped[str] = mapped_column(String(20), default="customer", nullable=False)  # customer, driver
    stop_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("30.00"), nullable=False)
    waiting_time_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    departed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    ride_request: Mapped["RideRequest"] = orm_relationship("RideRequest", foreign_keys=[ride_id])


class RideSOSEvent(Base, UUIDMixin, TimestampMixin):
    """
    Emergency SOS incident event with PostGIS location snapshot and audit trail.
    """
    __tablename__ = "ride_sos_events"

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
    triggered_by: Mapped[str] = mapped_column(String(20), default="driver", nullable=False)  # driver, customer
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    location: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)  # active, investigating, resolved, false_alarm
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    ride_request: Mapped["RideRequest"] = orm_relationship("RideRequest", foreign_keys=[ride_id])
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])




# ============================================================
# CANCELLATION & PERFORMANCE METRICS (Feature 12)
# ============================================================

class RideCancellationEvent(Base, UUIDMixin, TimestampMixin):
    """
    Canonical cancellation audit event recording actor, reason, fee, penalty, and policy version.
    """
    __tablename__ = "ride_cancellation_events"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    actor_type: Mapped[str] = mapped_column(String(20), default="driver", nullable=False)  # driver, customer, system, no_show
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    reason_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    reason_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancellation_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    driver_penalty: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    driver_payout: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    is_penalty_exempt: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    policy_version: Mapped[str] = mapped_column(String(20), default="v1.0", nullable=False)

    # Relationships
    ride_request: Mapped["RideRequest"] = orm_relationship("RideRequest", foreign_keys=[ride_id])
    actor: Mapped["User"] = relationship(foreign_keys=[actor_id])




# ============================================================
# TRIP COMPLETION, RECEIPTS & EARNINGS LEDGER (Features 13 & 14)
# ============================================================

class RideReceipt(Base, UUIDMixin, TimestampMixin):
    """
    Immutable financial receipt for completed rides recording transparent itemized breakdowns.
    """
    __tablename__ = "ride_receipts"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    receipt_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    base_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    distance_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, nullable=False)
    time_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    waiting_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    stops_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    tolls_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    parking_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    taxes_and_fees: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    surge_multiplier: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    customer_final_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    platform_commission: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    driver_net_earning: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), default="cash", nullable=False)
    payment_status: Mapped[str] = mapped_column(String(30), default="paid", nullable=False)
    tip_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Feature 21: Back-to-Back Rides Continuous Dispatch
    is_back_to_back: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    next_ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"), nullable=True)
    next_ride_reserved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_ride_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    ride_request: Mapped["RideRequest"] = orm_relationship("RideRequest", foreign_keys=[ride_id])
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])


class DriverEarningLedger(Base, UUIDMixin, TimestampMixin):
    """
    Immutable double-entry financial journal for driver earnings, commissions, tips, cash, and payouts.
    """
    __tablename__ = "driver_earning_ledger"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    entry_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)  # TRIP_EARNING, COMMISSION, TIP, INCENTIVE, BONUS, CASH_COLLECTED, REFUND_ADJUSTMENT, PAYOUT
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    direction: Mapped[str] = mapped_column(String(10), default="CREDIT", nullable=False)  # CREDIT, DEBIT
    status: Mapped[str] = mapped_column(String(20), default="SETTLED", nullable=False)  # SETTLED, PENDING, FAILED
    description: Mapped[str] = mapped_column(Text, nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, server_default=func.current_date(), nullable=False, index=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])
    ride_request: Mapped[Optional["RideRequest"]] = orm_relationship("RideRequest", foreign_keys=[ride_id])


class DriverCustomerRating(Base, UUIDMixin, TimestampMixin):
    """
    Mutual customer rating by driver with tags and optional feedback.
    """
    __tablename__ = "driver_customer_ratings"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    ride_request: Mapped["RideRequest"] = orm_relationship("RideRequest", foreign_keys=[ride_id])
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])




# ============================================================
# FEATURE 15: PAYOUT AND WALLET SYSTEM
# ============================================================

class DriverPayoutMethod(Base, UUIDMixin, TimestampMixin):
    """
    Verified payout methods (Bank Account or UPI) for driver withdrawals.
    """
    __tablename__ = "driver_payout_methods"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    method_type: Mapped[str] = mapped_column(String(20), nullable=False)  # BANK, UPI
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Bank fields
    bank_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    account_holder_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    account_number_masked: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    account_number_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    ifsc_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    account_type: Mapped[Optional[str]] = mapped_column(String(20), default="savings", nullable=True)
    
    # UPI fields
    upi_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    upi_id_masked: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    upi_id_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    
    # Verification and Status
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, PENDING, REJECTED, DISABLED
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])


class DriverPayoutRequest(Base, UUIDMixin, TimestampMixin):
    """
    Authoritative payout lifecycle transaction with idempotency and double-entry reservation.
    """
    __tablename__ = "driver_payout_requests"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    payout_reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    net_payout: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    payout_method: Mapped[str] = mapped_column(String(20), nullable=False)  # BANK, UPI
    destination_masked: Mapped[str] = mapped_column(String(100), nullable=False)
    payout_method_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("driver_payout_methods.id", ondelete="SET NULL"),
        nullable=True
    )
    status: Mapped[str] = mapped_column(String(30), default="REQUESTED", nullable=False, index=True)  # REQUESTED, PROCESSING, SUCCESS, FAILED, REVERSED, CANCELLED
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_ref: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    provider_payload: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reversed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_auto_payout: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])


class DriverAutoPayoutSetting(Base, UUIDMixin, TimestampMixin):
    """
    Driver-configurable automated payout rules with balance threshold triggers.
    """
    __tablename__ = "driver_auto_payout_settings"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    threshold_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("2000.00"), nullable=False)
    frequency: Mapped[str] = mapped_column(String(30), default="THRESHOLD_ONLY", nullable=False)  # DAILY, WEEKLY, THRESHOLD_ONLY
    payout_method_type: Mapped[str] = mapped_column(String(20), default="BANK", nullable=False)  # BANK, UPI
    payout_method_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("driver_payout_methods.id", ondelete="SET NULL"),
        nullable=True
    )
    last_auto_payout_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])


# ============================================================
# FEATURE 16: DRIVER PERFORMANCE AND SESSION ANALYTICS
# ============================================================

class DriverOnlineSession(Base, UUIDMixin, TimestampMixin):
    """
    Authoritative driver online session tracking for accurate online hours and fatigue metrics.
    """
    __tablename__ = "driver_online_sessions"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False, index=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, ENDED
    total_distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    trips_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])


class DriverPerformanceDaily(Base, UUIDMixin, TimestampMixin):
    """
    Materialized daily/weekly/monthly analytics snapshot for sub-millisecond dashboard queries.
    """
    __tablename__ = "driver_performance_daily"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    period_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_type: Mapped[str] = mapped_column(String(20), default="DAILY", nullable=False)  # DAILY, WEEKLY, MONTHLY
    acceptance_rate: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    cancellation_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    completion_rate: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    rating_avg: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    complaints_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_offers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    accepted_offers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rejected_offers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missed_offers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_rides: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_rides: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cancelled_rides: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    online_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    gross_earnings: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    net_earnings: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    earnings_per_hour: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    formula_version: Mapped[str] = mapped_column(String(20), default="v1.0", nullable=False)

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])




# ============================================================
# FEATURE 17: RATING & FEEDBACK SYSTEM
# ============================================================

class CustomerDriverRating(Base, UUIDMixin, TimestampMixin):
    """
    Authoritative customer rating of driver on completed ride requests.
    Supports 1-5 integer star rating, structured compliments, complaints, and moderation/dispute status.
    """
    __tablename__ = "customer_driver_ratings"
    __table_args__ = (
        UniqueConstraint("ride_id", name="uq_customer_driver_rating_ride"),
    )

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 to 5 stars
    compliments: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)  # ["CLEAN_VEHICLE", "SAFE_DRIVING", ...]
    complaint_tags: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)  # ["UNSAFE_DRIVING", "LATE_PICKUP", ...]
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)  # APPROVED, FLAGGED, DISPUTED, HIDDEN
    dispute_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    disputed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    ride_request: Mapped["RideRequest"] = orm_relationship("RideRequest", foreign_keys=[ride_id])
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])




# ============================================================
# FEATURE 22: DRIVER SAFETY INTELLIGENCE & INCIDENT SYSTEM
# ============================================================

class DriverTrustedContact(Base, UUIDMixin, TimestampMixin):
    """
    Verified emergency contacts for driver SOS and live trip sharing alerts.
    """
    __tablename__ = "driver_trusted_contacts"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_masked: Mapped[str] = mapped_column(String(50), nullable=False)
    phone_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    relationship_type: Mapped[str] = mapped_column("relationship", String(50), default="Family", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    @property
    def relationship(self) -> str:
        return self.relationship_type

    @relationship.setter
    def relationship(self, val: str) -> None:
        self.relationship_type = val

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])


class LiveTripShareSession(Base, UUIDMixin, TimestampMixin):
    """
    Secure, short-lived tokenized trip sharing for active rides with auto-expiration.
    """
    __tablename__ = "live_trip_share_sessions"

    ride_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    share_token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, REVOKED, EXPIRED
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    ride_request: Mapped["RideRequest"] = orm_relationship("RideRequest", foreign_keys=[ride_id])
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])


class DriverSafetyAlert(Base, UUIDMixin, TimestampMixin):
    """
    Real-time safety anomalies and warnings (route deviation, long stops, speed alerts)
    with driver acknowledgment / 'I'm Safe' tracking.
    """
    __tablename__ = "driver_safety_alerts"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    alert_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # ROUTE_DEVIATION, LONG_STOP, OVERSPEED, SUSPICIOUS_GPS
    severity: Mapped[str] = mapped_column(String(20), default="WARNING", nullable=False)  # NORMAL, OBSERVATION, WARNING, URGENT
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, ACKNOWLEDGED_SAFE, ESCALATED, AUTO_RESOLVED
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    details_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # IM_SAFE, DISMISSED, SUPPORT_CALL, AUTO_TIMEOUT

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])
    ride_request: Mapped[Optional["RideRequest"]] = orm_relationship("RideRequest", foreign_keys=[ride_id])


class SafetyIncidentReport(Base, UUIDMixin, TimestampMixin):
    """
    Structured incident reporting lifecycle for unsafe passengers, accidents, vehicle issues.
    """
    __tablename__ = "safety_incident_reports"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    incident_category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # UNSAFE_PASSENGER, ACCIDENT, ROAD_HAZARD, VEHICLE_ISSUE, MEDICAL_EMERGENCY, HARASSMENT, OTHER
    severity: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status: Mapped[str] = mapped_column(String(30), default="REPORTED", nullable=False)  # REPORTED, RECEIVED, UNDER_REVIEW, ACTION_REQUIRED, RESOLVED, CLOSED
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_urls: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])
    ride_request: Mapped[Optional["RideRequest"]] = orm_relationship("RideRequest", foreign_keys=[ride_id])




# ============================================================
# FEATURE 23: AI / SMART DRIVER FEATURES & RISK TELEMETRY
# ============================================================

class DriverRiskSignal(Base, UUIDMixin, TimestampMixin):
    """
    Internal AI & telemetry risk signals (impossible speed, fake GPS, abnormal cancellation).
    Zero PII exposure; strictly server-side authoritative.
    """
    __tablename__ = "driver_risk_signals"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    signal_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # FAKE_GPS, IMPOSSIBLE_SPEED, ABNORMAL_CANCELLATION, SENSOR_MISMATCH, REPEATED_REJECTS
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0.0 to 100.0
    severity: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status: Mapped[str] = mapped_column(String(30), default="LOGGED", nullable=False)  # LOGGED, UNDER_REVIEW, DISMISSED, ACTIONED
    details_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    ride_request: Mapped[Optional["RideRequest"]] = relationship(foreign_keys=[ride_id])


class DriverFatigueLog(Base, UUIDMixin, TimestampMixin):
    """
    Authoritative continuous driving tracking and constructive break advisories.
    """
    __tablename__ = "driver_fatigue_logs"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    continuous_online_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    continuous_driving_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    advisory_level: Mapped[str] = mapped_column(String(20), default="NONE", nullable=False)  # NONE, SUGGESTION, RECOMMENDED_BREAK, MANDATORY_REST
    reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    driver_acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])


class DemandForecastZone(Base, UUIDMixin, TimestampMixin):
    """
    Spatial demand predictions and opportunity zone clusters (PostGIS backed).
    """
    __tablename__ = "demand_forecast_zones"

    zone_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    zone_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    center_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    center_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    current_demand_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)  # LOW, NORMAL, HIGH, SURGE
    forecast_15m_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
    forecast_30m_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
    forecast_60m_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
    surge_multiplier: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    expected_hourly_earning: Mapped[float] = mapped_column(Float, default=250.0, nullable=False)
    active_drivers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    polygon_geojson: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)




# ============================================================
# FEATURE 24: IN-APP SUPPORT SYSTEM & FAQ ENGINE
# ============================================================

class SupportTicketMessage(Base, UUIDMixin, TimestampMixin):
    """
    Structured message thread for support tickets between driver and agents.
    """
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
    """
    Searchable Help Center FAQ articles with helpful/unhelpful feedback counters.
    """
    __tablename__ = "faq_articles"

    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # ACCOUNT, TRIPS, PAYMENTS, VEHICLE, KYC, SAFETY, EARNINGS, PAYOUT, SETTINGS
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unhelpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)




# ============================================================
# FEATURE 18: INCENTIVES & PROMOTIONS SYSTEM
# ============================================================

class IncentiveCampaign(Base, UUIDMixin, TimestampMixin):
    """
    Authoritative campaign definition for driver incentives, targets, milestones,
    peak-hour quests, shift guarantees, and location-aware zone bonuses.
    """
    __tablename__ = "incentive_campaigns"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    campaign_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # DAILY_TARGET, WEEKLY_TARGET, RIDE_MILESTONE, PEAK_HOUR, GUARANTEED_EARNINGS, ZONE_INCENTIVE, FESTIVAL, REFERRAL
    target_count: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    reward_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("500.00"), nullable=False)
    guaranteed_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    zone_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    zone_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vehicle_category: Mapped[Optional[str]] = mapped_column(String(50), default="all", nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rules_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)


class DriverIncentiveProgress(Base, UUIDMixin, TimestampMixin):
    """
    Per-driver progress tracking for an active incentive campaign.
    Authoritative state evaluated server-side upon ride completions.
    """
    __tablename__ = "driver_incentive_progress"
    __table_args__ = (
        UniqueConstraint("driver_id", "campaign_id", name="uq_driver_incentive_campaign"),
    )

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("incentive_campaigns.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    current_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target_count: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    current_actual_earnings: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    reward_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)  # AVAILABLE, ACTIVE, IN_PROGRESS, COMPLETED, EARNED, EXPIRED, CANCELLED
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    earned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ledger_entry_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
    campaign: Mapped["IncentiveCampaign"] = relationship(foreign_keys=[campaign_id])


class DriverReferral(Base, UUIDMixin, TimestampMixin):
    """
    Driver referral relationship and milestone qualification tracking.
    Credits referral reward to referrer's ledger once referred driver finishes target trips.
    """
    __tablename__ = "driver_referrals"
    __table_args__ = (
        UniqueConstraint("referrer_driver_id", "referred_driver_id", name="uq_driver_referral_pair"),
    )

    referrer_driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    referred_driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    referral_code_used: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    required_rides: Mapped[int] = mapped_column(Integer, default=25, nullable=False)
    completed_rides: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reward_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("1000.00"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)  # PENDING, QUALIFIED, REWARDED
    rewarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    referrer: Mapped["Driver"] = relationship(foreign_keys=[referrer_driver_id])
    referred: Mapped["Driver"] = relationship(foreign_keys=[referred_driver_id])




# ============================================================
# FEATURE 19: DEMAND / HEATMAP & SURGE ENGINE
# ============================================================

class DemandZone(Base, UUIDMixin, TimestampMixin):
    """
    Authoritative spatial polygon zone model for PostGIS-first demand aggregation,
    hotspot opportunity scoring, and dynamic surge multipliers.
    Zero external Google Maps API dependency for demand and surge calculations.
    """
    __tablename__ = "demand_zones"

    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    city_name: Mapped[str] = mapped_column(String(100), default="Pune", nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), default="COMMERCIAL", nullable=False)  # AIRPORT, TECH_PARK, TRANSIT_HUB, SHOPPING_MALL, NIGHTLIFE, COMMERCIAL
    centroid_lat: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lng: Mapped[float] = mapped_column(Float, nullable=False)
    boundary_geojson: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    current_surge_multiplier: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1.00"), nullable=False)
    demand_level: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)  # LOW, NORMAL, MODERATE, HIGH, CRITICAL
    active_requests_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    available_drivers_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)




# ============================================================
# FEATURE 25: DRIVER NOTIFICATION PREFERENCES
# ============================================================

class DriverNotificationPreference(Base, UUIDMixin, TimestampMixin):
    """
    Granular driver notification preferences per category.
    """
    __tablename__ = "driver_notification_preferences"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    trip_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    earnings_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    payout_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    safety_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    promotions_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sound_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    vibration_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = relationship("Driver", foreign_keys=[driver_id])


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


# ============================================================
# DRIVER APP SETTINGS & PREFERENCES (Feature 28)
# ============================================================

class DriverAppSetting(Base, UUIDMixin, TimestampMixin):
    """
    Authoritative driver app preferences including language, navigation, audio alerts, and auto-accept.
    """
    __tablename__ = "driver_app_settings"

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        unique=True, nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)  # en, mr, hi
    navigation_app: Mapped[str] = mapped_column(String(30), default="IN_APP", nullable=False)  # IN_APP, GOOGLE_MAPS, WAZE
    auto_accept_rides: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auto_accept_min_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    voice_navigation_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sound_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    high_contrast_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    theme_mode: Mapped[str] = mapped_column(String(20), default="system", nullable=False)  # light, dark, system
    speed_limit_warning: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deactivated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deactivation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deactivated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])
