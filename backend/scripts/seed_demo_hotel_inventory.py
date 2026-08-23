"""
Seed verified demo hotel inventory in major Indian cities (Pune, Mumbai, Goa, Bengaluru, Sangli).
"""
import asyncio
import os
import sys
import uuid
from decimal import Decimal

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
_COMMON_DIR = os.path.join(_BACKEND_DIR, "common")
if _COMMON_DIR not in sys.path:
    sys.path.insert(0, _COMMON_DIR)

from sqlalchemy import select
from common.database import async_session_maker
from common.models.all_models import (
    User, UserRole, Vendor, VendorStatus,
    Property, PropertyType, PropertyStatus, PropertyUnit, PropertyImage
)

DEMO_HOTELS = [
    {
        "name": "Taj Blue Diamond (IHCL)",
        "city": "Pune",
        "state": "Maharashtra",
        "address": "11 Koregaon Park Road, Pune",
        "pincode": "411001",
        "latitude": 18.5362,
        "longitude": 73.8847,
        "star_rating": 5,
        "rating": 4.8,
        "reviews_count": 1420,
        "type": PropertyType.HOTEL,
        "description": "Iconic luxury property in lush Koregaon Park with award-winning dining, spa, and outdoor pool.",
        "amenities": {"free_wifi": True, "swimming_pool": True, "restaurant": True, "spa": True, "parking": True, "bar": True, "gym": True},
        "policies": {"couple_friendly": True, "family_friendly": True, "pet_friendly": True, "smoking_allowed": False, "alcohol_allowed": True},
        "featured": True,
        "photos": [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200",
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200",
            "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200",
        ],
        "units": [
            {
                "name": "Deluxe King Room",
                "room_type": "DELUXE",
                "bed_type": "1 King Bed",
                "capacity": 2,
                "price": Decimal("6500.00"),
                "count": 10,
                "available_count": 8,
                "free_breakfast": True,
                "is_refundable": True,
                "cancellation_hours": 24,
                "amenities": {"city_view": True, "bathtub": True, "coffee_maker": True, "minibar": True},
            },
            {
                "name": "Executive Garden Suite",
                "room_type": "SUITE",
                "bed_type": "1 Super King Bed + Living Area",
                "capacity": 3,
                "price": Decimal("12500.00"),
                "count": 4,
                "available_count": 3,
                "free_breakfast": True,
                "is_refundable": True,
                "cancellation_hours": 48,
                "amenities": {"garden_view": True, "jacuzzi": True, "lounge_access": True, "butler_service": True},
            },
        ],
    },
    {
        "name": "The Westin Pune Koregaon Park",
        "city": "Pune",
        "state": "Maharashtra",
        "address": "36/3-B Koregaon Park Annexe, Pune",
        "pincode": "411001",
        "latitude": 18.5392,
        "longitude": 73.8998,
        "star_rating": 5,
        "rating": 4.7,
        "reviews_count": 980,
        "type": PropertyType.HOTEL,
        "description": "Overlooking the Mula Mutha river, offering Heavenly Beds, scenic infinity pool, and seamless airport connectivity.",
        "amenities": {"free_wifi": True, "swimming_pool": True, "gym": True, "parking": True, "river_view": True},
        "policies": {"couple_friendly": True, "family_friendly": True, "pet_friendly": False},
        "featured": True,
        "photos": [
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200",
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200",
        ],
        "units": [
            {
                "name": "Heavenly Deluxe Room",
                "room_type": "DELUXE",
                "bed_type": "1 Westin Heavenly Bed",
                "capacity": 2,
                "price": Decimal("7800.00"),
                "count": 8,
                "available_count": 6,
                "free_breakfast": True,
                "is_refundable": True,
                "cancellation_hours": 24,
                "amenities": {"rain_shower": True, "work_desk": True, "espresso_machine": True},
            }
        ],
    },
    {
        "name": "The Oberoi Mumbai (Marine Drive)",
        "city": "Mumbai",
        "state": "Maharashtra",
        "address": "Nariman Point, Marine Drive, Mumbai",
        "pincode": "400021",
        "latitude": 18.9272,
        "longitude": 72.8205,
        "star_rating": 5,
        "rating": 4.9,
        "reviews_count": 3500,
        "type": PropertyType.HOTEL,
        "description": "Perched along the iconic Queen's Necklace offering panoramic Arabian Sea vistas and unmatched hospitality.",
        "amenities": {"free_wifi": True, "ocean_view": True, "swimming_pool": True, "fine_dining": True, "butler_service": True},
        "policies": {"couple_friendly": True, "family_friendly": True, "pet_friendly": False},
        "featured": True,
        "photos": [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200",
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
        ],
        "units": [
            {
                "name": "Luxury Ocean View Room",
                "room_type": "DELUXE",
                "bed_type": "1 King Bed",
                "capacity": 2,
                "price": Decimal("16500.00"),
                "count": 6,
                "available_count": 4,
                "free_breakfast": True,
                "is_refundable": True,
                "cancellation_hours": 48,
                "amenities": {"sea_view": True, "marble_bathroom": True, "soundproof": True},
            }
        ],
    },
    {
        "name": "Taj Fort Aguada Resort & Spa",
        "city": "Goa",
        "state": "Goa",
        "address": "Sinquerim, Candolim, Goa",
        "pincode": "403515",
        "latitude": 15.4989,
        "longitude": 73.7667,
        "star_rating": 5,
        "rating": 4.9,
        "reviews_count": 2890,
        "type": PropertyType.RESORT,
        "description": "Historic beachfront resort overlooking the 16th-century Portuguese fortress and Arabian Sea.",
        "amenities": {"free_wifi": True, "private_beach": True, "swimming_pool": True, "water_sports": True, "spa": True},
        "policies": {"couple_friendly": True, "family_friendly": True, "pet_friendly": True},
        "featured": True,
        "photos": [
            "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200",
            "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200",
        ],
        "units": [
            {
                "name": "Sea View Cottage Villa",
                "room_type": "VILLA",
                "bed_type": "1 King Bed + Private Balcony",
                "capacity": 3,
                "price": Decimal("14000.00"),
                "count": 5,
                "available_count": 3,
                "free_breakfast": True,
                "is_refundable": True,
                "cancellation_hours": 72,
                "amenities": {"private_balcony": True, "hammock": True, "sunset_view": True},
            }
        ],
    },
    {
        "name": "Hotel New Pride Sangli",
        "city": "Sangli",
        "state": "Maharashtra",
        "address": "Opposite ST Stand, Sangli-Miraj Road, Sangli",
        "pincode": "416416",
        "latitude": 16.8524,
        "longitude": 74.5815,
        "star_rating": 3,
        "rating": 4.4,
        "reviews_count": 450,
        "type": PropertyType.HOTEL,
        "description": "Modern business and family hotel in the heart of Sangli with multi-cuisine restaurant and conference rooms.",
        "amenities": {"free_wifi": True, "air_conditioning": True, "restaurant": True, "parking": True, "room_service": True},
        "policies": {"couple_friendly": True, "family_friendly": True, "pet_friendly": False},
        "featured": True,
        "photos": [
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200",
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200",
        ],
        "units": [
            {
                "name": "Executive AC Room",
                "room_type": "EXECUTIVE",
                "bed_type": "1 Queen Bed",
                "capacity": 2,
                "price": Decimal("2400.00"),
                "count": 12,
                "available_count": 10,
                "free_breakfast": True,
                "is_refundable": True,
                "cancellation_hours": 12,
                "amenities": {"work_desk": True, "lcd_tv": True, "hot_water": True},
            }
        ],
    },
]


async def seed_inventory():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    print("\n" + "=" * 70)
    print("🌱 SEEDING VERIFIED HOTEL INVENTORY FOR FEATURE 16")
    print("=" * 70)

    async with async_session_maker() as db:
        # Create or fetch vendor
        vendor_user_id = uuid.uuid4()
        vendor_user = User(
            id=vendor_user_id,
            phone="+919890011223",
            role=UserRole.ADMIN,
        )
        db.add(vendor_user)

        vendor_id = uuid.uuid4()
        vendor = Vendor(
            id=vendor_id,
            user_id=vendor_user_id,
            business_name="Verified Hospitality Partners Hub",
            aadhaar_number="123456789012",
            pan_number="ABCDE1234F",
            status=VendorStatus.APPROVED,
        )
        db.add(vendor)
        await db.flush()

        for h_data in DEMO_HOTELS:
            # Check if property already exists
            existing_res = await db.execute(
                select(Property).where(Property.name == h_data["name"])
            )
            if existing_res.scalar_one_or_none():
                print(f"  - Skipped (already exists): {h_data['name']}")
                continue

            prop_id = uuid.uuid4()
            prop = Property(
                id=prop_id,
                vendor_id=vendor.id,
                name=h_data["name"],
                type=h_data["type"],
                description=h_data["description"],
                location=f"SRID=4326;POINT({h_data['longitude']} {h_data['latitude']})",
                latitude=h_data["latitude"],
                longitude=h_data["longitude"],
                address=h_data["address"],
                city=h_data["city"],
                state=h_data["state"],
                pincode=h_data["pincode"],
                status=PropertyStatus.APPROVED,
                rating=h_data["rating"],
                star_rating=h_data["star_rating"],
                reviews_count=h_data["reviews_count"],
                policies=h_data["policies"],
                amenities=h_data["amenities"],
                featured=h_data["featured"],
            )
            db.add(prop)
            await db.flush()

            # Add images
            for img_url in h_data["photos"]:
                db.add(PropertyImage(
                    id=uuid.uuid4(),
                    property_id=prop.id,
                    url=img_url,
                    type="GENERAL",
                ))

            # Add room units
            for u_data in h_data["units"]:
                unit = PropertyUnit(
                    id=uuid.uuid4(),
                    property_id=prop.id,
                    name=u_data["name"],
                    room_type=u_data["room_type"],
                    bed_type=u_data["bed_type"],
                    capacity=u_data["capacity"],
                    price=u_data["price"],
                    count=u_data["count"],
                    available_count=u_data["available_count"],
                    free_breakfast=u_data["free_breakfast"],
                    is_refundable=u_data["is_refundable"],
                    cancellation_hours=u_data["cancellation_hours"],
                    amenities=u_data["amenities"],
                )
                db.add(unit)

            print(f"  ✓ Seeded: {h_data['name']} in {h_data['city']} ({len(h_data['units'])} room tiers)")

        await db.commit()

    print("=" * 70)
    print("DEMO HOTEL INVENTORY SEEDED SUCCESSFULLY")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(seed_inventory())
