"""
Customer Home Summary & Service Catalog Service.
Aggregates active rides, upcoming bookings, service catalog, and promotions for Customer App.
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc

from common.models.all_models import (
    User,
    CustomerProfile,
    RideRequest,
    RideRequestStatus,
    Booking,
    BookingStatus,
    Driver,
)
from app.schemas.customer_home import (
    ServiceCatalogItem,
    CustomerHomeSummaryResponse,
    ActiveRideSummary,
    ActiveRideDriver,
    UpcomingBookingSummary,
    PromotionSummary,
)

# Standard Platform Service Catalog
SERVICE_CATALOG: List[ServiceCatalogItem] = [
    ServiceCatalogItem(
        code="ride",
        title="Intercity Cab",
        description="One-way & Round-trip outstation rides",
        category="transport",
        icon="car-sport",
        status="AVAILABLE",
        badge="Popular",
        sort_order=1,
        route="/book/cab",
    ),
    ServiceCatalogItem(
        code="parcel",
        title="Send Parcel",
        description="Same-day intercity parcel delivery",
        category="logistics",
        icon="package",
        status="AVAILABLE",
        badge="Instant",
        sort_order=2,
        route="/parcel-booking",
    ),
    ServiceCatalogItem(
        code="hotel",
        title="Book Hotel",
        description="Verified hotels, resorts & stays",
        category="hospitality",
        icon="business",
        status="AVAILABLE",
        badge="Stays",
        sort_order=3,
        route="/book/properties",
    ),
    ServiceCatalogItem(
        code="transport",
        title="Transport & Bus",
        description="Scheduled routes & group transport",
        category="transport",
        icon="bus",
        status="AVAILABLE",
        badge="Schedules",
        sort_order=4,
        route="/book/properties",
    ),
    ServiceCatalogItem(
        code="airport",
        title="Airport Transfer",
        description="Guaranteed on-time airport pickup & drop",
        category="transport",
        icon="airplane",
        status="AVAILABLE",
        badge="24x7",
        sort_order=5,
        route="/book/cab",
    ),
    ServiceCatalogItem(
        code="rental",
        title="Car Rental",
        description="Hourly and daily self/chauffeur rentals",
        category="transport",
        icon="key",
        status="COMING_SOON",
        badge="Coming Soon",
        sort_order=6,
        route=None,
    ),
    ServiceCatalogItem(
        code="corporate",
        title="Corporate Rides",
        description="Business billing & team management",
        category="corporate",
        icon="briefcase",
        status="COMING_SOON",
        badge="Coming Soon",
        sort_order=7,
        route=None,
    ),
    ServiceCatalogItem(
        code="moving",
        title="Packers & Movers",
        description="House & office relocation service",
        category="logistics",
        icon="truck",
        status="COMING_SOON",
        badge="Coming Soon",
        sort_order=8,
        route=None,
    ),
]


async def get_service_catalog() -> List[ServiceCatalogItem]:
    """Returns dynamic service catalog items."""
    return sorted(SERVICE_CATALOG, key=lambda x: x.sort_order)


async def get_customer_home_summary(
    db: AsyncSession, user: User
) -> CustomerHomeSummaryResponse:
    """Aggregates all critical home dashboard data for the customer."""
    # 1. Fetch Profile
    prof_res = await db.execute(
        select(CustomerProfile).where(CustomerProfile.user_id == user.id)
    )
    profile = prof_res.scalar_one_or_none()
    customer_name = profile.full_name if profile and profile.full_name else (user.phone or "Traveller")
    photo_url = getattr(profile, "profile_photo", None) if profile else None

    # 2. Check for Active Ride in Progress
    active_ride: Optional[ActiveRideSummary] = None
    active_statuses = [
        RideRequestStatus.ASSIGNED,
        RideRequestStatus.PICKUP,
        RideRequestStatus.IN_PROGRESS,
    ]
    ride_res = await db.execute(
        select(RideRequest)
        .where(
            and_(
                or_(
                    RideRequest.customer_id == user.id,
                    RideRequest.booking_owner_id == user.id,
                ),
                RideRequest.status.in_(active_statuses),
            )
        )
        .order_by(desc(RideRequest.created_at))
        .limit(1)
    )
    current_ride = ride_res.scalar_one_or_none()

    if current_ride:
        driver_info: Optional[ActiveRideDriver] = None
        if current_ride.assigned_driver_id:
            driver_res = await db.execute(
                select(Driver).where(Driver.id == current_ride.assigned_driver_id)
            )
            driver = driver_res.scalar_one_or_none()
            if driver:
                driver_info = ActiveRideDriver(
                    id=str(driver.id),
                    name=driver.first_name + " " + (driver.last_name or ""),
                    phone=driver.phone or "",
                    rating=float(driver.rating or 4.9),
                    vehicle_model=getattr(driver, "vehicle_model", "Sedan"),
                    license_plate=getattr(driver, "vehicle_plate", "MH12-CAB"),
                )

        active_ride = ActiveRideSummary(
            ride_id=str(current_ride.id),
            status=str(current_ride.status.value if hasattr(current_ride.status, "value") else current_ride.status),
            pickup_address=current_ride.pickup_address,
            destination_address=current_ride.destination_address,
            pickup_lat=float(current_ride.pickup_lat or 0.0),
            pickup_lng=float(current_ride.pickup_lng or 0.0),
            destination_lat=float(current_ride.destination_lat or 0.0),
            destination_lng=float(current_ride.destination_lng or 0.0),
            pickup_otp=current_ride.start_pin_plain or "1234",
            estimated_fare=float(current_ride.estimated_fare or 0.0),
            eta_minutes=4,
            driver=driver_info,
        )

    # 3. Check for Upcoming Scheduled Booking
    upcoming_booking: Optional[UpcomingBookingSummary] = None
    book_res = await db.execute(
        select(Booking)
        .where(
            and_(
                Booking.customer_id == user.id,
                Booking.status == BookingStatus.CONFIRMED,
            )
        )
        .order_by(Booking.created_at.desc())
        .limit(1)
    )
    next_b = book_res.scalar_one_or_none()
    if next_b:
        upcoming_booking = UpcomingBookingSummary(
            booking_id=str(next_b.id),
            service_type="cab",
            title=f"Booking #{str(next_b.id)[:8]}",
            scheduled_time=next_b.created_at or datetime.now(timezone.utc),
            pickup_address=next_b.pickup_address or "Pickup Point",
            destination_address=next_b.dropoff_address or "Destination",
            status="CONFIRMED",
        )

    # 4. Promotions / Offers
    promotions = [
        PromotionSummary(
            id="promo_fest_2026",
            code="DIWALI2026",
            title="Festival Special 20% Off",
            description="Save up to ₹250 on all intercity cab rides this week.",
            discount_text="FLAT 20% OFF",
            service="ride",
            banner_gradient=["#4F46E5", "#7C3AED"],
        ),
        PromotionSummary(
            id="promo_parcel_safe",
            code="PARCEL50",
            title="Send First Parcel Free",
            description="Flat ₹50 instant cashback on your first intercity parcel.",
            discount_text="₹50 CASHBACK",
            service="parcel",
            banner_gradient=["#059669", "#10B981"],
        ),
    ]

    return CustomerHomeSummaryResponse(
        customer_id=str(user.id),
        customer_name=customer_name,
        profile_photo_url=photo_url,
        unread_notifications_count=2,
        active_ride=active_ride,
        upcoming_booking=upcoming_booking,
        promotions=promotions,
        services=await get_service_catalog(),
    )
