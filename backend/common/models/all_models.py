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
    CREATED = "created"
    SEARCHING_DRIVER = "searching_driver"
    PENDING = "pending"
    ACCEPTED = "accepted"
    DRIVER_ASSIGNED = "driver_assigned"
    DRIVER_ARRIVING = "driver_arriving"
    AT_PICKUP = "at_pickup"
    PICKUP_VERIFICATION = "pickup_verification"
    PICKUP_DONE = "pickup_done"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    NEAR_DESTINATION = "near_destination"
    AT_DESTINATION = "at_destination"
    DELIVERY_VERIFICATION = "delivery_verification"
    DELIVERED = "delivered"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    DELIVERY_FAILED = "delivery_failed"
    RETURN_REQUIRED = "return_required"
    RETURNING = "returning"
    RETURNED = "returned"
    EXPIRED = "expired"


class StopType(str, PyEnum):
    PICKUP = "pickup"
    DROP = "drop"
    HOTEL = "hotel"
    FOOD = "food"
    FUEL = "fuel"
    REST = "rest"


class MediaOwnerType(str, PyEnum):
    CUSTOMER = "customer"
    DRIVER = "driver"
    VEHICLE = "vehicle"
    SUPPORT = "support"
    ADMIN = "admin"


class MediaType(str, PyEnum):
    PROFILE_PHOTO = "profile_photo"
    KYC_DOCUMENT = "kyc_document"
    VEHICLE_DOCUMENT = "vehicle_document"
    VEHICLE_PHOTO = "vehicle_photo"
    ATTACHMENT = "attachment"


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


class FamilyRole(str, PyEnum):
    ORGANIZER = "organizer"
    MEMBER = "member"


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
    MATCHING = "matching"  # Fanout: broadcast to eligible drivers, awaiting first accept
    OFFERED = "offered"
    ASSIGNED = "assigned"
    PICKUP = "pickup"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    FAILED = "failed"



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


class RideOfferStatus(str, PyEnum):
    PENDING = "pending"
    DELIVERED = "delivered"
    VIEWED = "viewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    SUPERSEDED = "superseded"
    REMOVED = "removed"  # Another driver accepted — offer invalidated


class DriverVisibilityMode(str, PyEnum):
    """Driver request visibility preference — controls which geographic scope of requests the driver sees."""
    ALL_CITY = "all_city"          # All requests from any of the driver's covered cities
    SPECIFIC_CITY = "specific_city"  # Only requests from explicitly selected cities
    SPECIFIC_HEX = "specific_hex"    # Only requests from explicitly selected H3 hex cells/zones

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
    promo_credit_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    referral_reward_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    pending_refund_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    subscription_plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=True)
    women_only_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    referral_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)
    rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("5.00"), nullable=False)
    total_ratings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

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
# FEATURE 1: FAMILY / SHARED ACCOUNT & CUSTOMER SAFETY
# ============================================================

class FamilyAccount(Base, UUIDMixin, TimestampMixin):
    """Family Group owned by an organizer."""
    __tablename__ = "family_accounts"

    organizer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    family_name: Mapped[str] = mapped_column(String(100), nullable=False, default="My Family")
    is_shared_payment_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    shared_payment_method: Mapped[Optional[str]] = mapped_column(String(50), default="wallet")
    monthly_spending_limit: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Relationships
    organizer: Mapped["User"] = orm_relationship("User", foreign_keys=[organizer_id])
    members: Mapped[List["FamilyMember"]] = orm_relationship("FamilyMember", back_populates="family", cascade="all, delete-orphan")


class FamilyMember(Base, UUIDMixin, TimestampMixin):
    """Family Member with explicit granular permissions."""
    __tablename__ = "family_members"

    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("family_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    relation: Mapped[str] = mapped_column("relationship", String(50), default="Family Member", nullable=False)
    role: Mapped[FamilyRole] = mapped_column(Enum(FamilyRole), default=FamilyRole.MEMBER, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, INVITED, SUSPENDED
    can_use_shared_payment: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_book_rides: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_track_trips: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    @property
    def relationship(self) -> str:
        return self.relation

    @relationship.setter
    def relationship(self, val: str) -> None:
        self.relation = val

    # Relationships
    family: Mapped["FamilyAccount"] = orm_relationship("FamilyAccount", back_populates="members")
    user: Mapped[Optional["User"]] = orm_relationship("User", foreign_keys=[user_id])


class FamilyInvitation(Base, UUIDMixin, TimestampMixin):
    """Invitations sent to join a family account."""
    __tablename__ = "family_invitations"

    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("family_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    invited_phone: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    invited_name: Mapped[str] = mapped_column(String(100), nullable=False)
    relation: Mapped[str] = mapped_column("relationship", String(50), default="Family Member", nullable=False)
    invite_code: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False)  # PENDING, ACCEPTED, REJECTED, EXPIRED
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    @property
    def relationship(self) -> str:
        return self.relation

    @relationship.setter
    def relationship(self, val: str) -> None:
        self.relation = val


class CustomerEmergencyContact(Base, UUIDMixin, TimestampMixin):
    """Normalized multi-contact safety registry for customer SOS and live sharing."""
    __tablename__ = "customer_emergency_contacts"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    relation: Mapped[str] = mapped_column("relationship", String(50), default="Friend", nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auto_share_rides: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    @property
    def relationship(self) -> str:
        return self.relation

    @relationship.setter
    def relationship(self, val: str) -> None:
        self.relation = val

    user: Mapped["User"] = orm_relationship("User", foreign_keys=[user_id])


class CustomerAppSetting(Base, UUIDMixin, TimestampMixin):
    """Granular persistent settings and privacy preferences for customers."""
    __tablename__ = "customer_app_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    notifications_ride_updates: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notifications_driver_arrival: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notifications_promotions: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notifications_security_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    privacy_location_sharing: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    privacy_family_trip_tracking: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    privacy_personalized_ads: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = orm_relationship("User", foreign_keys=[user_id])

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    notifications_ride_updates: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notifications_driver_arrival: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notifications_promotions: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notifications_security_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    privacy_location_sharing: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    privacy_family_trip_tracking: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    privacy_personalized_ads: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(foreign_keys=[user_id])


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
    transport_capable: Mapped[bool] = mapped_column(Boolean, default=False)
    max_payload_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    cargo_volume_cft: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    loading_dimensions: Mapped[Optional[dict]] = mapped_column(JSONB, default={})
    commercial_permit: Mapped[bool] = mapped_column(Boolean, default=False)
    has_ac: Mapped[bool] = mapped_column(Boolean, default=True)
    insurance_expiry: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    pollution_expiry: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    photos: Mapped[List[str]] = mapped_column(ARRAY(String), default=[])

    driver: Mapped["Driver"] = relationship(back_populates="vehicle")


class MediaAsset(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    Centralized metadata registry for all Cloudinary media assets.
    Zero binary file bytes stored in database.
    """
    __tablename__ = "media_assets"

    owner_type: Mapped[MediaOwnerType] = mapped_column(
        Enum(MediaOwnerType, native_enum=False, length=50, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False, index=True
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, native_enum=False, length=50, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False, index=True
    )

    # Cloudinary identifiers
    cloudinary_public_id: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), default="image", nullable=False)
    format: Mapped[str] = mapped_column(String(20), default="jpg", nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), default="image/jpeg", nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # URLs
    secure_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    # Status & Privacy
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, default={})


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

    # Cloudinary linkage & Vehicle scoping
    media_asset_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("media_assets.id", ondelete="SET NULL"), nullable=True)
    cloudinary_public_id: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=True, index=True)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    driver: Mapped["Driver"] = relationship(back_populates="documents")
    media_asset: Mapped[Optional["MediaAsset"]] = relationship()


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
# ============================================================
# PARCEL & LOGISTICS MODULE — FEATURE 15
# ============================================================

class Parcel(Base, UUIDMixin, TimestampMixin):
    """
    Authoritative logistics parcel shipment entity.
    Maintains explicit operational separation:
    Booking Owner (Payer) != Sender (Pickup Contact) != Receiver (Delivery Contact) != Driver (Logistics Partner).
    """
    __tablename__ = "parcels"

    # Identity References
    booking_owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True)
    vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True)
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=True)
    trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)

    # Tracking Reference
    tracking_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    # Sender (Pickup) Information
    sender_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sender_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    sender_address: Mapped[str] = mapped_column(Text, nullable=False)
    sender_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sender_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sender_location: Mapped[Optional[str]] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    pickup_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Receiver (Drop) Information
    receiver_name: Mapped[str] = mapped_column(String(255), nullable=False)
    receiver_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    receiver_address: Mapped[str] = mapped_column(Text, nullable=False)
    receiver_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    receiver_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    receiver_location: Mapped[Optional[str]] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    delivery_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Package Specifications
    parcel_category: Mapped[str] = mapped_column(String(50), default="GENERAL_BOX", nullable=False)  # DOCUMENTS, FOOD, ELECTRONICS, CLOTHING, FRAGILE, MEDICINES, GENERAL_BOX
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    package_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    length_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    width_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    volumetric_weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dimensions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Safety, Fragile & Insurance
    is_fragile: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_valuable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    declared_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    insurance_opt_in: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    insured_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    insurance_premium: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Vehicle Category & Delivery Priority
    vehicle_category: Mapped[str] = mapped_column(String(30), default="BIKE", nullable=False)  # BIKE, AUTO, CAR, VAN, MINI_TRUCK, TRUCK
    delivery_priority: Mapped[str] = mapped_column(String(30), default="STANDARD", nullable=False)  # STANDARD, EXPRESS, SAME_DAY

    # Authoritative Itemized Pricing
    fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    base_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    distance_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    weight_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    volume_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    priority_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    handling_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    parcel_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)

    # Financial Settlement & Driver Earnings
    driver_earning: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    platform_commission: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), default="WALLET", nullable=False)  # CASH, UPI, CARD, WALLET
    payment_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # PENDING, PAID, REFUNDED

    # State Machine & Verification OTPs
    status: Mapped[ParcelStatus] = mapped_column(Enum(ParcelStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]), default=ParcelStatus.CREATED, nullable=False)
    pickup_otp: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    pickup_otp_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    pickup_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    picked_up_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    in_transit_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    near_destination_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    arrived_destination_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    delivery_otp: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    delivery_otp_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Proof of Handover / Photos
    proof_image: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    image_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    parcel_photo: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Cancellation & Failure
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cancelled_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # CUSTOMER, DRIVER, ADMIN, SYSTEM

    # Relationships
    booking: Mapped[Optional["Booking"]] = relationship(back_populates="parcel")
    booking_owner: Mapped[Optional["User"]] = relationship(foreign_keys=[booking_owner_id])
    driver: Mapped[Optional["Driver"]] = relationship(foreign_keys=[driver_id])
    vehicle: Mapped[Optional["Vehicle"]] = relationship(foreign_keys=[vehicle_id])
    proof_of_delivery: Mapped[Optional["ParcelProofOfDelivery"]] = relationship(back_populates="parcel", uselist=False)
    status_history: Mapped[List["ParcelStatusHistory"]] = relationship(back_populates="parcel", cascade="all, delete-orphan")


class ParcelProofOfDelivery(Base, UUIDMixin, TimestampMixin):
    """
    Immutable proof of delivery record for parcel completion.
    Captures OTP confirmation, receiver signature, photo, and exact GPS delivery fix.
    """
    __tablename__ = "parcel_proof_of_deliveries"

    parcel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("parcels.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_name: Mapped[str] = mapped_column(String(255), nullable=False)
    otp_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    signature_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    delivery_photo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    delivered_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    delivered_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    delivered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)

    # Relationships
    parcel: Mapped["Parcel"] = relationship(back_populates="proof_of_delivery")
    driver: Mapped["Driver"] = relationship(foreign_keys=[driver_id])


class ParcelStatusHistory(Base, UUIDMixin, TimestampMixin):
    """
    Audit log of parcel state machine transitions for dispute & operational auditing.
    """
    __tablename__ = "parcel_status_history"

    parcel_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("parcels.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    actor_role: Mapped[str] = mapped_column(String(30), default="SYSTEM", nullable=False)  # CUSTOMER, SENDER, RECEIVER, DRIVER, SYSTEM, ADMIN
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    parcel: Mapped["Parcel"] = relationship(back_populates="status_history")


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
    amenities: Mapped[dict] = mapped_column(JSONB, default={})
    rating: Mapped[float] = mapped_column(Float, default=4.5)
    star_rating: Mapped[int] = mapped_column(Integer, default=4)
    reviews_count: Mapped[int] = mapped_column(Integer, default=120)
    check_in_time: Mapped[str] = mapped_column(String(20), default="14:00")
    check_out_time: Mapped[str] = mapped_column(String(20), default="11:00")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    vendor: Mapped["Vendor"] = relationship(back_populates="properties")
    units: Mapped[List["PropertyUnit"]] = relationship(back_populates="property")
    images: Mapped[List["PropertyImage"]] = relationship(back_populates="property")
    bookings: Mapped[List["PropertyBooking"]] = relationship(back_populates="property")


class PropertyUnit(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "property_units"

    property_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    room_type: Mapped[str] = mapped_column(String(50), default="DELUXE")
    bed_type: Mapped[str] = mapped_column(String(50), default="King Bed")
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    amenities: Mapped[dict] = mapped_column(JSONB, default={})
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    available_count: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    is_refundable: Mapped[bool] = mapped_column(Boolean, default=True)
    cancellation_hours: Mapped[int] = mapped_column(Integer, default=24)
    free_breakfast: Mapped[bool] = mapped_column(Boolean, default=False)

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
    booking_reference: Mapped[str] = mapped_column(String(50), default="HTL-0000", index=True)
    primary_guest_name: Mapped[str] = mapped_column(String(255), default="Guest")
    primary_guest_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    primary_guest_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    special_requests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    check_in: Mapped[date] = mapped_column(Date, nullable=False)
    check_out: Mapped[date] = mapped_column(Date, nullable=False)
    nights: Mapped[int] = mapped_column(Integer, nullable=False)
    guests: Mapped[int] = mapped_column(Integer, default=1)
    base_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    add_ons_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    total_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    add_ons_json: Mapped[dict] = mapped_column(JSONB, default={})
    payment_method: Mapped[str] = mapped_column(String(30), default="WALLET")
    payment_status: Mapped[str] = mapped_column(String(30), default="PENDING")
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus), default=BookingStatus.PENDING)
    cancellation_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refund_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    refund_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    linked_ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id"), nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)

    property: Mapped["Property"] = relationship(back_populates="bookings")
    unit: Mapped["PropertyUnit"] = relationship()
    guests_list: Mapped[List["BookingGuest"]] = relationship(back_populates="booking", cascade="all, delete-orphan")


class BookingGuest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "booking_guests"
    
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("property_bookings.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    id_proof_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    booking: Mapped["PropertyBooking"] = relationship(back_populates="guests_list")


# ============================================================
# PAYMENTS & FINANCE
# ============================================================

class Transaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "transactions"

    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=True)
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id"), nullable=True, index=True)
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
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, index=True)

    booking: Mapped[Optional["Booking"]] = relationship(back_populates="transaction")


class WalletTransaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "wallet_transactions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    transaction_type: Mapped[LedgerType] = mapped_column(Enum(LedgerType), nullable=False)
    direction: Mapped[str] = mapped_column(String(10), default="CREDIT", nullable=False)  # CREDIT, DEBIT
    bucket: Mapped[str] = mapped_column(String(30), default="CASH", nullable=False)  # CASH, PROMO_CREDIT, REFERRAL, REFUND
    balance_after: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    ref_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)


class CustomerPaymentMethod(Base, UUIDMixin, TimestampMixin):
    """Tokenized saved payment methods for customers (UPI VPA or Card Token). Zero raw PAN/CVV stored."""
    __tablename__ = "customer_payment_methods"

    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    method_type: Mapped[str] = mapped_column(String(20), nullable=False)  # UPI, CARD
    provider: Mapped[str] = mapped_column(String(50), default="razorpay", nullable=False)
    display_title: Mapped[str] = mapped_column(String(100), nullable=False)  # "Google Pay (p***@okhdfcbank)" or "HDFC Visa •••• 4242"
    masked_identifier: Mapped[str] = mapped_column(String(100), nullable=False)  # "p***@okhdfcbank" or "•••• 4242"
    card_network: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # VISA, MASTERCARD, RUPAY
    card_expiry: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)  # MM/YYYY
    token_reference: Mapped[str] = mapped_column(String(255), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id])


class CustomerRefund(Base, UUIDMixin, TimestampMixin):
    """Immutable refund record linked to original transaction and ride receipt."""
    __tablename__ = "customer_refunds"

    refund_reference: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    transaction_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    destination: Mapped[str] = mapped_column(String(30), default="ORIGINAL_PAYMENT", nullable=False)  # ORIGINAL_PAYMENT, WALLET, CREDITS
    reason: Mapped[str] = mapped_column(String(100), nullable=False)  # TRIP_CANCELLED, FARE_DISPUTE, OVERCHARGED, DRIVER_NO_SHOW, SUPPORT_COURTESY
    status: Mapped[str] = mapped_column(String(30), default="PROCESSED", nullable=False)  # REQUESTED, PROCESSING, PROCESSED, FAILED, REVERSED
    gateway_refund_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)

    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id])
    transaction: Mapped["Transaction"] = relationship("Transaction", foreign_keys=[transaction_id])


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


class PromotionCampaign(Base, UUIDMixin, TimestampMixin):
    """
    Centralized Promotion & Campaign model for Feature 13.
    Supports coupons, auto-offers, first-ride benefits, cashback, time/area discounts, and festival campaigns.
    """
    __tablename__ = "promotion_campaigns"

    code: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    campaign_type: Mapped[str] = mapped_column(String(50), default="COUPON", nullable=False)
    # COUPON, AUTO_OFFER, FIRST_RIDE, REFERRAL, CASHBACK, SERVICE_DISCOUNT, AREA_DISCOUNT, TIME_DISCOUNT, FESTIVAL_CAMPAIGN
    discount_type: Mapped[str] = mapped_column(String(20), default="PERCENTAGE", nullable=False)  # PERCENTAGE, FLAT, CASHBACK
    discount_value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    max_discount_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    min_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    cashback_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    service_type: Mapped[str] = mapped_column(String(30), default="ALL", nullable=False)  # ALL, CAB, PARCEL, HOTEL, TRANSPORT
    zone_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    time_window_start: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)  # "08:00"
    time_window_end: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)    # "11:00"
    days_of_week: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)     # "MON,TUE,WED,THU,FRI"
    banner_gradient: Mapped[list] = mapped_column(JSONB, default=["#4F46E5", "#10B981"], nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    max_uses: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    uses_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    per_customer_limit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    stackable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class PromotionRedemption(Base, UUIDMixin, TimestampMixin):
    """
    Immutable promotion redemption record enforcing 1-redemption-per-ride constraints.
    """
    __tablename__ = "promotion_redemptions"
    __table_args__ = (
        UniqueConstraint("campaign_id", "ride_id", name="uq_promo_redemption_ride"),
    )

    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("promotion_campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ride_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("ride_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, index=True)
    discount_applied: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    cashback_earned: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), default="COMMITTED", nullable=False)  # APPLIED, COMMITTED, REVERSED

    campaign: Mapped["PromotionCampaign"] = relationship(foreign_keys=[campaign_id])
    customer: Mapped["User"] = relationship(foreign_keys=[customer_id])


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
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
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
    # Feature 1: Booking Participant & Actual Rider (Self vs Family vs Guest)
    booking_owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rider_type: Mapped[str] = mapped_column(String(30), default="SELF", nullable=False)  # SELF, FAMILY_MEMBER, GUEST
    rider_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rider_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    is_booked_for_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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
    # Feature 1: Booking Participant & Actual Rider (Self vs Family vs Guest)
    booking_owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rider_type: Mapped[str] = mapped_column(String(30), default="SELF", nullable=False)  # SELF, FAMILY_MEMBER, GUEST
    rider_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rider_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    is_booked_for_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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
    # Feature 1: Booking Participant & Actual Rider (Self vs Family vs Guest)
    booking_owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rider_type: Mapped[str] = mapped_column(String(30), default="SELF", nullable=False)  # SELF, FAMILY_MEMBER, GUEST
    rider_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rider_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    is_booked_for_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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

    # Spatial resolution (PostGIS-derived from pickup coordinates)
    pickup_city_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_cities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    pickup_zone_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_zones.id", ondelete="SET NULL"), nullable=True, index=True
    )
    pickup_hex_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_hexes.id", ondelete="SET NULL"), nullable=True, index=True
    )

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
    service_type: Mapped[Optional[str]] = mapped_column(String(50), default="cab", nullable=True, index=True)  # cab, outstation, parcel, rental, transport, airport
    pricing_mode: Mapped[str] = mapped_column(String(30), default="STANDARD", nullable=False)  # STANDARD, NEGOTIATED
    preferred_driver_ids: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)  # [driver_id, ...]

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
    is_preferred: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # Preferred driver direct request

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

    # Driver Request Visibility Mode (Coverage preference)
    visibility_mode: Mapped[str] = mapped_column(
        String(30), default="all_city", nullable=False
    )  # all_city, specific_city, specific_hex
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
    # Feature 1: Booking Participant & Actual Rider (Self vs Family vs Guest)
    booking_owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rider_type: Mapped[str] = mapped_column(String(30), default="SELF", nullable=False)  # SELF, FAMILY_MEMBER, GUEST
    rider_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rider_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    is_booked_for_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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
    # Feature 1: Booking Participant & Actual Rider (Self vs Family vs Guest)
    booking_owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rider_type: Mapped[str] = mapped_column(String(30), default="SELF", nullable=False)  # SELF, FAMILY_MEMBER, GUEST
    rider_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rider_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    is_booked_for_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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
    # Feature 1: Booking Participant & Actual Rider (Self vs Family vs Guest)
    booking_owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rider_type: Mapped[str] = mapped_column(String(30), default="SELF", nullable=False)  # SELF, FAMILY_MEMBER, GUEST
    rider_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rider_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    is_booked_for_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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
    # Feature 1: Booking Participant & Actual Rider (Self vs Family vs Guest)
    booking_owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rider_type: Mapped[str] = mapped_column(String(30), default="SELF", nullable=False)  # SELF, FAMILY_MEMBER, GUEST
    rider_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rider_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    is_booked_for_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)

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
    vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # Feature 1: Booking Participant & Actual Rider (Self vs Family vs Guest)
    booking_owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    rider_type: Mapped[str] = mapped_column(String(30), default="SELF", nullable=False)  # SELF, FAMILY_MEMBER, GUEST
    rider_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rider_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    is_booked_for_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 to 5 stars
    cleanliness_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    driving_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    behaviour_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    vehicle_condition_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    compliments: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)  # ["CLEAN_VEHICLE", "SAFE_DRIVING", ...]
    complaint_tags: Mapped[list] = mapped_column(JSONB, default=[], nullable=False)  # ["UNSAFE_DRIVING", "LATE_PICKUP", "SAFETY_ISSUE", ...]
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


# ============================================================
# FEATURE 17: TRANSPORT & COMMERCIAL LOGISTICS SYSTEM
# ============================================================

class TransportOrder(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    Authoritative Transport Order for heavy goods and commercial freight movement.
    Supports instant pricing, multi-transporter quotations, live multi-state execution, and POD.
    """
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
    """
    Itemized and dimensional payload specification for a Transport Order.
    """
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
    """
    Commercial quotation submitted by a transporter/driver on a Transport Order.
    Supports interactive multi-round counter-offer negotiation.
    """
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
    """
    Immutable audit history of quote submissions, counter-offers, acceptances, and rejections.
    """
    __tablename__ = "transport_quote_events"

    quote_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transport_quotes.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_type: Mapped[str] = mapped_column(String(30), nullable=False)  # CUSTOMER, TRANSPORTER, SYSTEM
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(30), nullable=False)  # SUBMITTED, COUNTERED, ACCEPTED, REJECTED, EXPIRED
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    quote: Mapped["TransportQuote"] = relationship(back_populates="events")


class TransportAssignment(Base, UUIDMixin, TimestampMixin):
    """
    Active operational dispatch record binding an agreed quote to driver and vehicle.
    """
    __tablename__ = "transport_assignments"

    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transport_orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    quote_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("transport_quotes.id", ondelete="SET NULL"), nullable=True)
    transporter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    driver_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False, index=True)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, CANCELLED


class TransportStatusEvent(Base, UUIDMixin, TimestampMixin):
    """
    Immutable chronological state audit trail for transport execution.
    """
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
    """
    Authoritative, tamper-proof proof of delivery record for completed commercial transport.
    Captures receiver verification OTP, signature, photo, GPS coordinates, and timestamp.
    """
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
    """
    Airport master data entity.
    """
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
    """
    Airport Terminal master entity with dedicated pickup/drop zone geofencing.
    """
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
    """
    Centralized Flight Information Service snapshot cache.
    Stores verified flight numbers, schedule, delay metrics, and live status.
    """
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
    """
    Authoritative Flight-Aware Airport Booking entity.
    Connects Customer, Airport, Flight, Scheduled Ride, Driver Dispatch, Meet & Greet, and Hotel.
    """
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
    status: Mapped[AirportBookingStatus] = mapped_column(Enum(AirportBookingStatus, values_callable=lambda obj: [e.value for e in obj], name="airportbookingstatus"), default=AirportBookingStatus.CONFIRMED, nullable=False, index=True)
    cancelled_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    refund_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relationships
    airport: Mapped["Airport"] = relationship("Airport", back_populates="bookings")
    terminal: Mapped[Optional["AirportTerminal"]] = relationship("AirportTerminal", back_populates="bookings")
    waiting_logs: Mapped[List["AirportWaitingLog"]] = relationship("AirportWaitingLog", back_populates="booking", cascade="all, delete-orphan")


class AirportWaitingLog(Base, UUIDMixin, TimestampMixin):
    """
    Operational log of driver airport arrival, free waiting grace period, and parking charges.
    """
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


# ============================================================
# FEATURE 19: RENTAL / HOURLY SERVICE
# ============================================================

class RentalBookingStatus(str, PyEnum):
    PENDING        = "pending"
    DRIVER_ASSIGNED = "driver_assigned"
    DRIVER_EN_ROUTE = "driver_en_route"
    DRIVER_ARRIVED  = "driver_arrived"
    ACTIVE         = "active"        # timer running
    COMPLETED      = "completed"
    CANCELLED      = "cancelled"
    EXPIRED        = "expired"


class RentalPlan(Base, UUIDMixin, TimestampMixin):
    """
    Backend-configured rental duration packages.
    All pricing fields are server-side. Frontend never hardcodes rates.
    """
    __tablename__ = "rental_plans"

    name: Mapped[str] = mapped_column(String(100), nullable=False)                   # "4 Hours / 40 KM"
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)            # 60, 120, 240, 480
    included_km: Mapped[float] = mapped_column(Float, nullable=False)                 # 10, 20, 40, 80
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)       # Plan base fare
    extra_km_rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)     # ₹/km beyond included
    extra_hour_rate: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)   # ₹/hour beyond duration
    vehicle_category: Mapped[str] = mapped_column(String(50), nullable=False)         # HATCHBACK, SEDAN, SUV
    min_custom_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # 60 minimum for custom
    max_custom_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True) # 720 maximum
    gst_percentage: Mapped[float] = mapped_column(Float, default=5.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class RentalBooking(Base, UUIDMixin, TimestampMixin):
    """
    Customer rental booking — time-block + KM. Timer is backend-authoritative.
    """
    __tablename__ = "rental_bookings"

    reference: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)  # RNT-YYMMDD-XXXX
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True)
    vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)

    # Plan
    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rental_plans.id"), nullable=False)
    vehicle_category: Mapped[str] = mapped_column(String(50), nullable=False)
    custom_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # set only for custom

    # Pickup
    pickup_address: Mapped[str] = mapped_column(Text, nullable=False)
    pickup_lat: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lng: Mapped[float] = mapped_column(Float, nullable=False)

    # Backend-authoritative timer
    actual_start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)  # SET by backend on START
    actual_end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    planned_end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # KM tracking — PostGIS computed
    included_km: Mapped[float] = mapped_column(Float, nullable=False)
    actual_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    extra_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Duration tracking
    planned_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    actual_duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    extra_duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Fare — backend calculated at completion
    base_plan_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    extra_km_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    extra_hour_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    toll_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    parking_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    gst_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    estimated_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    final_fare: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Payment
    payment_method: Mapped[str] = mapped_column(String(50), default="WALLET", nullable=False)
    payment_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    promo_code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Corporate context (optional)
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    membership_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("company_memberships.id", ondelete="SET NULL"), nullable=True)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    approval_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    is_business_trip: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    business_purpose: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    status: Mapped[RentalBookingStatus] = mapped_column(
        Enum(RentalBookingStatus, values_callable=lambda obj: [e.value for e in obj], name="rentalbookingstatus"),
        default=RentalBookingStatus.PENDING, nullable=False, index=True
    )
    cancelled_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    refund_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Relationships
    plan: Mapped["RentalPlan"] = relationship("RentalPlan")
    stops: Mapped[List["RentalStop"]] = relationship("RentalStop", back_populates="booking", order_by="RentalStop.stop_order", cascade="all, delete-orphan")
    usage_events: Mapped[List["RentalUsageEvent"]] = relationship("RentalUsageEvent", back_populates="booking", cascade="all, delete-orphan")


class RentalStop(Base, UUIDMixin, TimestampMixin):
    """Ordered waypoints added during an active rental."""
    __tablename__ = "rental_stops"

    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rental_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    stop_order: Mapped[int] = mapped_column(Integer, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    departed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    waiting_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)  # PENDING, ARRIVED, DEPARTED

    booking: Mapped["RentalBooking"] = relationship("RentalBooking", back_populates="stops")


class RentalUsageEvent(Base, UUIDMixin, TimestampMixin):
    """Backend-authoritative timer and KM tracking events."""
    __tablename__ = "rental_usage_events"

    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rental_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)  # START, KM_UPDATE, STOP_ADDED, EXTRA_TIME, COMPLETE
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    km_at_event: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    elapsed_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    booking: Mapped["RentalBooking"] = relationship("RentalBooking", back_populates="usage_events")


# ============================================================
# FEATURE 20: OUTSTATION / INTERCITY SERVICE
# ============================================================

class OutstationJourneyType(str, PyEnum):
    ONE_WAY    = "one_way"
    ROUND_TRIP = "round_trip"
    MULTI_CITY = "multi_city"


class OutstationBookingStatus(str, PyEnum):
    CONFIRMED        = "confirmed"
    DRIVER_ASSIGNED  = "driver_assigned"
    DRIVER_EN_ROUTE  = "driver_en_route"
    DRIVER_ARRIVED   = "driver_arrived"
    OUTBOUND_STARTED = "outbound_started"
    AT_DESTINATION   = "at_destination"
    RETURN_STARTED   = "return_started"
    COMPLETED        = "completed"
    CANCELLED        = "cancelled"


class OutstationLegStatus(str, PyEnum):
    SCHEDULED  = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED  = "completed"
    CANCELLED  = "cancelled"


class OutstationChargeType(str, PyEnum):
    TOLL           = "toll"
    STATE_TAX      = "state_tax"
    PARKING        = "parking"
    NIGHT_HALT     = "night_halt"
    DRIVER_ALLOWANCE = "driver_allowance"
    EXTRA_KM       = "extra_km"
    OTHER          = "other"


class OutstationBooking(Base, UUIDMixin, TimestampMixin):
    """
    Master outstation booking record. ONE booking for ROUND_TRIP (two legs).
    """
    __tablename__ = "outstation_bookings"

    reference: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)  # OUT-YYMMDD-XXXX
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True)

    journey_type: Mapped[OutstationJourneyType] = mapped_column(
        Enum(OutstationJourneyType, values_callable=lambda obj: [e.value for e in obj], name="outstationjourneytype"),
        nullable=False
    )
    vehicle_category: Mapped[str] = mapped_column(String(50), nullable=False)
    passenger_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    luggage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Origin/primary destination
    origin_address: Mapped[str] = mapped_column(Text, nullable=False)
    origin_lat: Mapped[float] = mapped_column(Float, nullable=False)
    origin_lng: Mapped[float] = mapped_column(Float, nullable=False)
    final_destination_address: Mapped[str] = mapped_column(Text, nullable=False)
    final_destination_lat: Mapped[float] = mapped_column(Float, nullable=False)
    final_destination_lng: Mapped[float] = mapped_column(Float, nullable=False)

    # Scheduling
    scheduled_departure: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    return_scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    estimated_duration_hours: Mapped[float] = mapped_column(Float, nullable=False)
    actual_distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    included_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Financials (backend-calculated)
    base_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    toll_estimate: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    state_tax: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    night_halt_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    driver_allowance: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    extra_km_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    parking_charge: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    gst_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    estimated_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    final_fare: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Payment
    payment_method: Mapped[str] = mapped_column(String(50), default="WALLET", nullable=False)
    payment_status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False)
    promo_code: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Corporate context
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    membership_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("company_memberships.id", ondelete="SET NULL"), nullable=True)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    approval_request_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    is_business_trip: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    business_purpose: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    status: Mapped[OutstationBookingStatus] = mapped_column(
        Enum(OutstationBookingStatus, values_callable=lambda obj: [e.value for e in obj], name="outstationbookingstatus"),
        default=OutstationBookingStatus.CONFIRMED, nullable=False, index=True
    )
    cancelled_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    refund_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    special_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    legs: Mapped[List["OutstationLeg"]] = relationship("OutstationLeg", back_populates="booking", order_by="OutstationLeg.leg_order", cascade="all, delete-orphan")
    charges: Mapped[List["OutstationCharge"]] = relationship("OutstationCharge", back_populates="booking", cascade="all, delete-orphan")


class OutstationLeg(Base, UUIDMixin, TimestampMixin):
    """
    Individual journey legs. ONE_WAY → 1 leg. ROUND_TRIP → 2 legs. MULTI_CITY → N legs.
    """
    __tablename__ = "outstation_legs"

    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("outstation_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    leg_order: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=outbound, 1=return
    leg_type: Mapped[str] = mapped_column(String(30), nullable=False)  # OUTBOUND, RETURN, SEGMENT

    origin_address: Mapped[str] = mapped_column(Text, nullable=False)
    origin_lat: Mapped[float] = mapped_column(Float, nullable=False)
    origin_lng: Mapped[float] = mapped_column(Float, nullable=False)
    destination_address: Mapped[str] = mapped_column(Text, nullable=False)
    destination_lat: Mapped[float] = mapped_column(Float, nullable=False)
    destination_lng: Mapped[float] = mapped_column(Float, nullable=False)

    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_km: Mapped[float] = mapped_column(Float, nullable=False)
    actual_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estimated_duration_hours: Mapped[float] = mapped_column(Float, nullable=False)

    status: Mapped[OutstationLegStatus] = mapped_column(
        Enum(OutstationLegStatus, values_callable=lambda obj: [e.value for e in obj], name="outstationlegstatus"),
        default=OutstationLegStatus.SCHEDULED, nullable=False
    )

    # Relationships
    booking: Mapped["OutstationBooking"] = relationship("OutstationBooking", back_populates="legs")
    waypoints: Mapped[List["OutstationWaypoint"]] = relationship("OutstationWaypoint", back_populates="leg", order_by="OutstationWaypoint.waypoint_order", cascade="all, delete-orphan")


class OutstationWaypoint(Base, UUIDMixin, TimestampMixin):
    """Ordered stops within a single outstation leg (multi-city segments)."""
    __tablename__ = "outstation_waypoints"

    leg_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("outstation_legs.id", ondelete="CASCADE"), nullable=False, index=True)
    waypoint_order: Mapped[int] = mapped_column(Integer, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    stop_duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    leg: Mapped["OutstationLeg"] = relationship("OutstationLeg", back_populates="waypoints")


class OutstationCharge(Base, UUIDMixin, TimestampMixin):
    """
    Platform-verified itemized charges for outstation (toll, state_tax, parking, night_halt, allowance).
    Amount is authoritative — set by backend policy or verified evidence.
    Driver cannot self-report these amounts.
    """
    __tablename__ = "outstation_charges"

    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("outstation_bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    charge_type: Mapped[OutstationChargeType] = mapped_column(
        Enum(OutstationChargeType, values_callable=lambda obj: [e.value for e in obj], name="outstationchargetype"),
        nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    evidence_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)  # Photo of toll receipt
    is_customer_approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_driver_earning: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # night_halt/allowance credited to driver
    state_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # for state_tax

    booking: Mapped["OutstationBooking"] = relationship("OutstationBooking", back_populates="charges")


# ============================================================
# FEATURE 21: CORPORATE CUSTOMER — ORGANIZATION/GOVERNANCE LAYER
# ============================================================

class CorporateRole(str, PyEnum):
    COMPANY_ADMIN  = "company_admin"
    TRAVEL_ADMIN   = "travel_admin"
    APPROVER       = "approver"
    EMPLOYEE       = "employee"
    FINANCE        = "finance"


class ApprovalStatus(str, PyEnum):
    NOT_REQUIRED = "not_required"
    PENDING      = "pending"
    APPROVED     = "approved"
    REJECTED     = "rejected"
    EXPIRED      = "expired"
    CANCELLED    = "cancelled"


class CorporateInvoiceStatus(str, PyEnum):
    DRAFT           = "draft"
    GENERATED       = "generated"
    FINALIZED       = "finalized"
    PAID            = "paid"
    PARTIALLY_PAID  = "partially_paid"
    OVERDUE         = "overdue"
    CANCELLED       = "cancelled"


class Company(Base, UUIDMixin, TimestampMixin):
    """
    Organization entity — the corporate account.
    DO NOT put corporate fields in CustomerProfile.
    """
    __tablename__ = "companies"

    legal_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    gstin: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, unique=True)
    billing_email: Mapped[str] = mapped_column(String(255), nullable=False)
    billing_phone: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)
    billing_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(50), default="India", nullable=False)
    pincode: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata", nullable=False)
    billing_cycle: Mapped[str] = mapped_column(String(20), default="MONTHLY", nullable=False)  # MONTHLY, WEEKLY
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, SUSPENDED, PENDING_KYC
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    memberships: Mapped[List["CompanyMembership"]] = relationship("CompanyMembership", back_populates="company", cascade="all, delete-orphan")
    departments: Mapped[List["Department"]] = relationship("Department", back_populates="company", cascade="all, delete-orphan")
    policies: Mapped[List["CorporatePolicy"]] = relationship("CorporatePolicy", back_populates="company", cascade="all, delete-orphan")
    wallet: Mapped[Optional["CorporateWallet"]] = relationship("CorporateWallet", back_populates="company", uselist=False)
    invoices: Mapped[List["CorporateInvoice"]] = relationship("CorporateInvoice", back_populates="company", cascade="all, delete-orphan")


class Department(Base, UUIDMixin, TimestampMixin):
    """Company department with cost center for trip billing attribution."""
    __tablename__ = "departments"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    cost_center_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    manager_membership_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("company_memberships.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    company: Mapped["Company"] = relationship("Company", back_populates="departments")


class CompanyMembership(Base, UUIDMixin, TimestampMixin):
    """
    Employee ↔ Company join table.
    CustomerProfile remains independent — employee retains personal account.
    """
    __tablename__ = "company_memberships"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    role: Mapped[CorporateRole] = mapped_column(
        Enum(CorporateRole, values_callable=lambda obj: [e.value for e in obj], name="corporaterole"),
        default=CorporateRole.EMPLOYEE, nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="INVITED", nullable=False, index=True)  # INVITED, ACTIVE, SUSPENDED, DEACTIVATED
    joined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    invited_by_membership_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)

    __table_args__ = (UniqueConstraint("company_id", "customer_id", name="uq_company_membership"),)

    company: Mapped["Company"] = relationship("Company", back_populates="memberships")


class CorporatePolicy(Base, UUIDMixin, TimestampMixin):
    """
    Data-driven corporate travel policy engine.
    All policy checks are backend-evaluated. Never hardcode if company == ABC in frontend.
    """
    __tablename__ = "corporate_policies"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    policy_name: Mapped[str] = mapped_column(String(100), nullable=False)
    applies_to_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # null = all roles
    applies_to_department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)

    # Service rules (JSON policy config)
    allowed_services: Mapped[list] = mapped_column(JSONB, default=["ride"], nullable=False)  # ["ride","rental","outstation","airport","hotel"]
    allowed_vehicle_categories: Mapped[list] = mapped_column(JSONB, default=["SEDAN"], nullable=False)
    max_fare_auto_approve: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("2000.00"), nullable=False)
    require_approval_above: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("2000.00"), nullable=False)
    require_purpose: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    personal_rides_allowed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    allowed_booking_hours_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 6 = 6 AM
    allowed_booking_hours_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)    # 22 = 10 PM
    outstation_allowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rental_max_hours: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    hotel_allowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    airport_allowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    company: Mapped["Company"] = relationship("Company", back_populates="policies")


class ApprovalRequest(Base, UUIDMixin, TimestampMixin):
    """
    Approval lifecycle for bookings above policy threshold.
    Status is separate from Ride/Rental/Outstation status.
    """
    __tablename__ = "approval_requests"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    requester_membership_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company_memberships.id", ondelete="CASCADE"), nullable=False, index=True)
    service_type: Mapped[str] = mapped_column(String(50), nullable=False)  # ride, rental, outstation, airport, hotel
    booking_reference: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # reference once booking created
    estimated_fare: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    purpose: Mapped[str] = mapped_column(String(255), nullable=False)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    booking_details_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)  # service-specific details

    status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, values_callable=lambda obj: [e.value for e in obj], name="approvalstatus"),
        default=ApprovalStatus.PENDING, nullable=False, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    final_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    steps: Mapped[List["ApprovalStep"]] = relationship("ApprovalStep", back_populates="approval_request", cascade="all, delete-orphan")


class ApprovalStep(Base, UUIDMixin, TimestampMixin):
    """
    Deterministic approval step — prevents concurrent double-approval via DB SELECT FOR UPDATE.
    """
    __tablename__ = "approval_steps"

    approval_request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("approval_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    approver_membership_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company_memberships.id", ondelete="CASCADE"), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PENDING", nullable=False, index=True)  # PENDING, APPROVED, REJECTED
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    approval_request: Mapped["ApprovalRequest"] = relationship("ApprovalRequest", back_populates="steps")


class CorporatePaymentMethod(Base, UUIDMixin, TimestampMixin):
    """Company-owned payment instruments. Employee USES them per policy — never sees PAN/UPI."""
    __tablename__ = "corporate_payment_methods"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_type: Mapped[str] = mapped_column(String(30), nullable=False)  # CORPORATE_WALLET, INVOICE_BILLING, CARD
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)  # "ABC Corp Wallet", "Monthly Invoice"
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Card details are tokenized / masked — never expose PAN
    last4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    card_network: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)


class CorporateWallet(Base, UUIDMixin, TimestampMixin):
    """
    Company-level wallet — completely separate from customer_profiles.wallet_balance.
    Employees CANNOT withdraw from this wallet.
    """
    __tablename__ = "corporate_wallets"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    currency: Mapped[str] = mapped_column(String(5), default="INR", nullable=False)
    last_topped_up_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    company: Mapped["Company"] = relationship("Company", back_populates="wallet")
    transactions: Mapped[List["CorporateWalletTransaction"]] = relationship("CorporateWalletTransaction", back_populates="wallet", cascade="all, delete-orphan")


class CorporateWalletTransaction(Base, UUIDMixin, TimestampMixin):
    """Ledger record for corporate wallet debits/credits."""
    __tablename__ = "corporate_wallet_transactions"

    wallet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("corporate_wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # DEBIT, CREDIT
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    booking_reference: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    membership_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)  # which employee triggered

    wallet: Mapped["CorporateWallet"] = relationship("CorporateWallet", back_populates="transactions")


class CorporateInvoice(Base, UUIDMixin, TimestampMixin):
    """Monthly consolidated billing invoice for a company."""
    __tablename__ = "corporate_invoices"

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)  # INV-ABC-2608-001
    billing_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    billing_period_end: Mapped[date] = mapped_column(Date, nullable=False)
    total_bookings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    gst_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    status: Mapped[CorporateInvoiceStatus] = mapped_column(
        Enum(CorporateInvoiceStatus, values_callable=lambda obj: [e.value for e in obj], name="corporateinvoicestatus"),
        default=CorporateInvoiceStatus.DRAFT, nullable=False, index=True
    )
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    company: Mapped["Company"] = relationship("Company", back_populates="invoices")
    line_items: Mapped[List["InvoiceLineItem"]] = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(Base, UUIDMixin, TimestampMixin):
    """Per-booking line item on a corporate invoice."""
    __tablename__ = "invoice_line_items"

    invoice_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("corporate_invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    membership_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("company_memberships.id", ondelete="CASCADE"), nullable=False)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    service_type: Mapped[str] = mapped_column(String(50), nullable=False)  # ride, rental, outstation, airport, hotel
    booking_reference: Mapped[str] = mapped_column(String(50), nullable=False)
    booking_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    fare_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    gst_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    business_purpose: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cost_center_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    invoice: Mapped["CorporateInvoice"] = relationship("CorporateInvoice", back_populates="line_items")


# ============================================================
# FEATURE 22: BOOK FOR SOMEONE ELSE — SAVED RIDERS
# ============================================================

class SavedRider(Base, UUIDMixin, TimestampMixin):
    """
    Saved contact / guest rider for 'Book for Someone Else' feature.
    Allows customers to save frequently booked family, friends, or colleagues.
    """
    __tablename__ = "saved_riders"

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(30), default="FRIEND", nullable=False)  # FAMILY, FRIEND, COLLEAGUE, GUEST, OTHER
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id])


# ============================================================
# FEATURE 26: CUSTOMER SECURITY & TRUST ARCHITECTURE
# ============================================================

class DeviceTrustStatus(str, PyEnum):
    NEW = "NEW"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    TRUSTED = "TRUSTED"
    RESTRICTED = "RESTRICTED"
    REVOKED = "REVOKED"


class CustomerDevice(Base, UUIDMixin, TimestampMixin):
    """
    Device identity, hardware trust state, and security posture for Customer App.
    Zero raw IMEI/serial storage; uses privacy-safe application device identifier.
    """
    __tablename__ = "customer_devices"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    device_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(20), default="android", nullable=False)  # android, ios, web
    device_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g. Samsung Galaxy S23, iPhone 15 Pro
    os_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)     # e.g. Android 14, iOS 17.4
    app_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)    # e.g. 2.4.0
    trust_status: Mapped[str] = mapped_column(String(30), default="TRUSTED", nullable=False, index=True)  # NEW, PENDING_VERIFICATION, TRUSTED, RESTRICTED, REVOKED
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)    # 0.0 to 100.0
    last_ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)   # SHA-256 hashed client IP
    last_active_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    is_biometric_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class CustomerSecurityEvent(Base, UUIDMixin, TimestampMixin):
    """
    Immutable customer-centric security audit stream.
    Zero plain secret storage; strictly captures structured security events.
    """
    __tablename__ = "customer_security_events"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    device_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)  
    # LOGIN_SUCCESS, LOGIN_FAILED, OTP_REQUESTED, OTP_VERIFIED, NEW_DEVICE_DETECTED, 
    # DEVICE_TRUSTED, DEVICE_REVOKED, SUSPICIOUS_LOGIN, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED,
    # PAYMENT_VERIFIED, PROMO_ABUSE_FLAGGED, COLLUSION_FLAGGED, PASSWORD_CHANGED, SESSION_REVOKED
    risk_level: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    location_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Approximate city (e.g. Pune, Mumbai)
    ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    details_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)
    action_taken: Mapped[str] = mapped_column(String(30), default="ALLOW", nullable=False)  # ALLOW, CHALLENGE, RESTRICT, LOCK, NOTIFY

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class CustomerRiskSignal(Base, UUIDMixin, TimestampMixin):
    """
    Internal risk telemetry & multi-factor anomaly signals for Customer ecosystem.
    Evaluates velocity anomalies, fake bookings, promo farming, and collusion.
    """
    __tablename__ = "customer_risk_signals"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    signal_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)  
    # VELOCITY_LOGIN, SUSPICIOUS_DEVICE_CLUSTER, BOOKING_CANCEL_SURGE, 
    # PROMO_FARMING, COLLUSION_REPEATED_DRIVER, UNAUTHORIZED_IDOR_PROBE
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0.0 to 100.0
    severity: Mapped[str] = mapped_column(String(20), default="LOW", nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, INVESTIGATING, RESOLVED, FALSE_POSITIVE
    details_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


# ============================================================
# FEATURE 27: SMART FEATURES & INTELLIGENCE TELEMETRY
# ============================================================

class SmartRecommendationLog(Base, UUIDMixin, TimestampMixin):
    """
    Immutable audit & analytics log for Smart Intelligence recommendations.
    Tracks decisions, confidence, explainability reasons, and conversion outcomes.
    """
    __tablename__ = "smart_recommendation_logs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    recommendation_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # DESTINATION, VEHICLE, CROSS_SERVICE, PRICING_SIGNAL, MATCHING_RANK, BOOKING_SUGGESTION
    input_context_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    recommended_item: Mapped[str] = mapped_column(String(100), nullable=False)
    # e.g. "SUV", "HOME", "AIRPORT_TRANSFER", "GOODS_TRANSPORT"
    confidence: Mapped[str] = mapped_column(String(20), default="HIGH", nullable=False)  # HIGH, MEDIUM, LOW
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    action_taken: Mapped[str] = mapped_column(String(30), default="SHOWN", nullable=False)  # SHOWN, ACCEPTED, DISMISSED, EXPIRED
    model_version: Mapped[str] = mapped_column(String(30), default="v1.0.0", nullable=False)
    details_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class SmartDestinationCache(Base, UUIDMixin, TimestampMixin):
    """
    User-specific destination scoring cache for fast sub-millisecond retrieval.
    Harmonizes saved addresses, frequent commute habits, and day-of-week patterns.
    """
    __tablename__ = "smart_destination_cache"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    destination_title: Mapped[str] = mapped_column(String(150), nullable=False)
    destination_address: Mapped[str] = mapped_column(String(255), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    place_type: Mapped[str] = mapped_column(String(30), default="RECENT", nullable=False)  # HOME, WORK, FAVORITE, RECENT, PREDICTED
    time_bucket: Mapped[str] = mapped_column(String(30), default="GENERAL", nullable=False)  # MORNING_COMMUTE, EVENING_RETURN, WEEKEND, NIGHT, GENERAL
    frequency: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    last_visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


# =============================================================================
# FEATURE 28: CROSS-SERVICE ORCHESTRATION & JOURNEY LIFECYCLE ENTITIES
# =============================================================================

class JourneyStatus(str, PyEnum):
    PLANNED = "PLANNED"
    PARTIALLY_ACTIVE = "PARTIALLY_ACTIVE"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    ATTENTION_REQUIRED = "ATTENTION_REQUIRED"


class Journey(Base, UUIDMixin, TimestampMixin):
    """
    Canonical Multi-Service Journey grouping container (e.g. JRN-2608-XXXX).
    Connects independent domain records (Hotel, Airport, Cab, Transport)
    without merging their distinct domain tables.
    """
    __tablename__ = "journeys"

    journey_reference: Mapped[str] = mapped_column(
        String(32), unique=True, nullable=False, index=True
    )  # JRN-YYMMDD-XXXX
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    status: Mapped[JourneyStatus] = mapped_column(
        Enum(JourneyStatus, values_callable=lambda obj: [e.value for e in obj], name="journeystatus"),
        default=JourneyStatus.ACTIVE, nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. "Mumbai Business Trip"
    origin_service: Mapped[str] = mapped_column(String(50), nullable=False)  # hotel, airport, ride, outstation
    origin_reference_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    notes_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)

    # Relationships
    customer: Mapped["User"] = relationship("User", foreign_keys=[customer_id])
    links: Mapped[List["CrossServiceLink"]] = relationship(
        "CrossServiceLink", back_populates="journey", cascade="all, delete-orphan"
    )


class CrossServiceLink(Base, UUIDMixin, TimestampMixin):
    """
    Directional link between two independent service domain records
    coordinated through the Cross-Service Orchestration layer.
    """
    __tablename__ = "cross_service_links"

    journey_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("journeys.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    source_service: Mapped[str] = mapped_column(String(50), nullable=False)  # hotel, airport, parcel, etc.
    source_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_service: Mapped[str] = mapped_column(String(50), nullable=False)  # ride, airport, transport, etc.
    target_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    link_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # AIRPORT_TRANSFER, HOTEL_STAY, PARCEL_TRANSPORT, OUTSTATION_STAY
    status: Mapped[str] = mapped_column(
        String(30), default="SUGGESTED", nullable=False
    )  # SUGGESTED, CONFIRMED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
    metadata_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)

    # Relationships
    journey: Mapped["Journey"] = relationship("Journey", back_populates="links")


class DomainEventRecord(Base, UUIDMixin, TimestampMixin):
    """
    Immutable Event Sourcing and Audit Record for cross-service domain events.
    Enforces correlation IDs, causation tracking, and strict consumer idempotency.
    """
    __tablename__ = "domain_event_records"

    event_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)  # hotel.booking.confirmed
    aggregate_type: Mapped[str] = mapped_column(String(50), nullable=False)  # HOTEL_BOOKING, RIDE, PARCEL
    aggregate_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    source_service: Mapped[str] = mapped_column(String(50), nullable=False)
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    journey_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("journeys.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    correlation_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    causation_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    payload_json: Mapped[dict] = mapped_column(JSONB, default={}, nullable=False)


class ProcessedEventRecord(Base, UUIDMixin, TimestampMixin):
    """
    Tracks event consumption per consumer worker to guarantee at-most-once/exactly-once processing.
    """
    __tablename__ = "processed_event_records"

    event_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    consumer_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="PROCESSED", nullable=False)  # PROCESSED, FAILED, IGNORED
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


# ============================================================
# SPATIAL HIERARCHY — Service Cities, Zones, Hexes (PostGIS + H3)
# ============================================================

class ServiceCity(Base, UUIDMixin, TimestampMixin):
    """
    Master table of cities where the platform operates.
    Boundary is a PostGIS POLYGON/MULTIPOLYGON for precise spatial matching.
    Center + radius is a fallback for development/seed bootstrapping.
    """
    __tablename__ = "service_cities"

    name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), default="India", nullable=False)
    center_location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    center_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    center_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    radius_km: Mapped[float] = mapped_column(Float, default=25.0, nullable=False)  # Fallback radius
    boundary: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326), nullable=True
    )  # Actual city polygon boundary — production use
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata", nullable=False)
    # Dispatch policy per city
    max_pickup_radius_km: Mapped[float] = mapped_column(Float, default=15.0, nullable=False)
    max_pickup_eta_min: Mapped[int] = mapped_column(Integer, default=30, nullable=False)


class ServiceZone(Base, UUIDMixin, TimestampMixin):
    """
    Subdivisions within a service city (e.g., South Sangli, Airport Zone).
    Used for operational grouping and zone-level service configuration.
    """
    __tablename__ = "service_zones"

    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_cities.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    boundary: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326), nullable=True
    )
    center_location: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    center_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    center_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    city: Mapped["ServiceCity"] = orm_relationship("ServiceCity", foreign_keys=[city_id])

    __table_args__ = (
        UniqueConstraint("city_id", "name", name="uq_service_zone_city_name"),
    )


class ServiceHex(Base, UUIDMixin, TimestampMixin):
    """
    H3 hexagonal grid cells mapped to service zones/cities.
    Used for fine-grained driver coverage preference (SPECIFIC_HEX mode).
    h3_index stores the H3 cell index string for fast coordinate → cell lookups.
    """
    __tablename__ = "service_hexes"

    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_cities.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    zone_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_zones.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    h3_index: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)  # H3 cell index
    resolution: Mapped[int] = mapped_column(Integer, default=7, nullable=False)  # H3 resolution level
    display_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)  # Human-readable name
    center_lat: Mapped[float] = mapped_column(Float, nullable=False)
    center_lng: Mapped[float] = mapped_column(Float, nullable=False)
    boundary: Mapped[Optional[object]] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    city: Mapped["ServiceCity"] = orm_relationship("ServiceCity", foreign_keys=[city_id])
    zone: Mapped[Optional["ServiceZone"]] = orm_relationship("ServiceZone", foreign_keys=[zone_id])


# ============================================================
# DRIVER COVERAGE — City & Hex Coverage Preferences
# ============================================================

class DriverCityCoverage(Base, UUIDMixin, TimestampMixin):
    """
    Junction table: which cities a driver covers.
    In ALL_CITY mode, all of a driver's city coverages are used.
    In SPECIFIC_CITY mode, only is_selected=True cities are used.
    """
    __tablename__ = "driver_city_coverage"
    __table_args__ = (
        UniqueConstraint("driver_id", "city_id", name="uq_driver_city_coverage"),
    )

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_cities.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # For SPECIFIC_CITY filtering

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])
    city: Mapped["ServiceCity"] = orm_relationship("ServiceCity", foreign_keys=[city_id])


class DriverHexCoverage(Base, UUIDMixin, TimestampMixin):
    """
    Junction table: which H3 hex cells a driver covers.
    Used only when visibility_mode = SPECIFIC_HEX.
    """
    __tablename__ = "driver_hex_coverage"
    __table_args__ = (
        UniqueConstraint("driver_id", "hex_id", name="uq_driver_hex_coverage"),
    )

    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    hex_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("service_hexes.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    driver: Mapped["Driver"] = orm_relationship("Driver", foreign_keys=[driver_id])
    hex_cell: Mapped["ServiceHex"] = orm_relationship("ServiceHex", foreign_keys=[hex_id])
