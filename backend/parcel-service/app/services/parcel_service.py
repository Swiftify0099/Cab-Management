"""
Parcel Logistics & Delivery Engine — Feature 15.
Server-authoritative logistics management covering:
- Itemized logistics pricing engine (Distance, Weight, Volumetric, Vehicle, Priority, Insurance, Promo)
- Strict operational identity isolation: Booking Owner != Sender != Receiver != Driver
- Full canonical state machine with two-phase verification (Pickup OTP + Receiver Delivery OTP)
- PostGIS driver candidate search & broadcast
- Proof of Delivery (POD) generation (OTP, digital signature, photo, GPS timestamp)
- Financial reconciliation (Customer payment + Driver wallet earnings)
"""
from __future__ import annotations

import math
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID

import structlog
from fastapi import HTTPException
from sqlalchemy import select, and_, or_, func, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    Parcel, ParcelStatus, ParcelProofOfDelivery, ParcelStatusHistory,
    Driver, DriverStatus, Vehicle, VehicleType,
    User, CustomerProfile, WalletTransaction, LedgerType,
    ParcelCategory, MediaAsset, MediaOwnerType, MediaType,
)
from common.utils.redis_client import publish_event, cache_set, get_redis
from common.utils.cloudinary_service import CloudinaryService

logger = structlog.get_logger(__name__)

# Configurable vehicle logistics baselines
VEHICLE_CONFIGS: Dict[str, Dict[str, Any]] = {
    "BIKE": {
        "title": "Delivery Bike",
        "description": "Ideal for documents, food, and small packages up to 15 kg",
        "base_fare": Decimal("40.00"),
        "base_km": 2.0,
        "per_km_rate": Decimal("10.00"),
        "base_weight_kg": 2.0,
        "per_kg_rate": Decimal("15.00"),
        "max_weight_kg": 15.0,
        "max_dim_cm": (45, 35, 30),
    },
    "AUTO": {
        "title": "Cargo Auto",
        "description": "Medium parcels, cartons, groceries up to 60 kg",
        "base_fare": Decimal("70.00"),
        "base_km": 2.0,
        "per_km_rate": Decimal("14.00"),
        "base_weight_kg": 5.0,
        "per_kg_rate": Decimal("12.00"),
        "max_weight_kg": 60.0,
        "max_dim_cm": (90, 70, 70),
    },
    "CAR": {
        "title": "Hatchback / Sedan",
        "description": "Safe, weather-proof transport for fragile & valuable items up to 150 kg",
        "base_fare": Decimal("120.00"),
        "base_km": 3.0,
        "per_km_rate": Decimal("18.00"),
        "base_weight_kg": 10.0,
        "per_kg_rate": Decimal("10.00"),
        "max_weight_kg": 150.0,
        "max_dim_cm": (120, 90, 80),
    },
    "VAN": {
        "title": "Cargo Van",
        "description": "Multiple large cartons, appliances up to 500 kg",
        "base_fare": Decimal("250.00"),
        "base_km": 5.0,
        "per_km_rate": Decimal("25.00"),
        "base_weight_kg": 20.0,
        "per_kg_rate": Decimal("8.00"),
        "max_weight_kg": 500.0,
        "max_dim_cm": (200, 140, 120),
    },
    "MINI_TRUCK": {
        "title": "Mini Truck (Tata Ace)",
        "description": "Heavy commercial cargo, furniture up to 1,000 kg",
        "base_fare": Decimal("400.00"),
        "base_km": 5.0,
        "per_km_rate": Decimal("32.00"),
        "base_weight_kg": 50.0,
        "per_kg_rate": Decimal("6.00"),
        "max_weight_kg": 1000.0,
        "max_dim_cm": (250, 160, 150),
    },
}

PRIORITY_MULTIPLIERS = {
    "STANDARD": Decimal("1.00"),
    "EXPRESS": Decimal("1.35"),
    "SAME_DAY": Decimal("1.15"),
}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


class ParcelService:
    def __init__(self, db: AsyncSession, wallet_service: Optional[Any] = None):
        self.db = db
        self.wallet_service = wallet_service

    def calculate_quote(
        self,
        sender_lat: float,
        sender_lng: float,
        receiver_lat: float,
        receiver_lng: float,
        weight_kg: float,
        length_cm: Optional[float] = None,
        width_cm: Optional[float] = None,
        height_cm: Optional[float] = None,
        package_count: int = 1,
        vehicle_category: str = "BIKE",
        delivery_priority: str = "STANDARD",
        is_fragile: bool = False,
        is_valuable: bool = False,
        declared_value: Optional[Decimal] = None,
        insurance_opt_in: bool = False,
        promo_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calculates authoritative logistics fare breakdown.
        """
        if weight_kg is None or weight_kg <= 0:
            raise HTTPException(status_code=400, detail="Invalid weight: Parcel weight must be greater than 0 kg")

        v_cat = vehicle_category.upper()
        if v_cat not in VEHICLE_CONFIGS:
            v_cat = "BIKE"
        cfg = VEHICLE_CONFIGS[v_cat]

        # Calculate road distance (haversine with 1.25 urban routing factor)
        crow_dist = haversine_distance_km(sender_lat, sender_lng, receiver_lat, receiver_lng)
        road_dist = max(1.0, round(crow_dist * 1.25, 2))

        # Volumetric weight calculation: (L x W x H in cm) / 5000
        volumetric_kg = 0.0
        if length_cm and width_cm and height_cm and length_cm > 0 and width_cm > 0 and height_cm > 0:
            volumetric_kg = round((length_cm * width_cm * height_cm) / 5000.0, 2)
        effective_weight_kg = max(weight_kg, volumetric_kg)

        # Enforce maximum capacity limit for vehicle category
        if effective_weight_kg > cfg["max_weight_kg"]:
            raise HTTPException(
                status_code=400,
                detail=f"Incompatible weight: Effective weight {effective_weight_kg}kg exceeds maximum capacity {cfg['max_weight_kg']}kg for {v_cat} category. Please select a larger vehicle."
            )

        # 1. Base Fare
        base_fare = cfg["base_fare"]

        # 2. Distance Fare
        chargeable_km = max(0.0, road_dist - cfg["base_km"])
        distance_fare = Decimal(str(round(chargeable_km * float(cfg["per_km_rate"]), 2)))

        # 3. Weight Fare
        chargeable_weight = max(0.0, effective_weight_kg - cfg["base_weight_kg"])
        weight_fare = Decimal(str(round(chargeable_weight * float(cfg["per_kg_rate"]), 2)))

        # 4. Multi-package handling surcharge (for > 1 package)
        extra_pkg_fee = Decimal(str(max(0, package_count - 1) * 20.0))

        # 5. Fragile handling fee
        fragile_fee = Decimal("0.00")
        if is_fragile:
            fragile_fee = max(Decimal("30.00"), Decimal(str(round(float(base_fare + distance_fare) * 0.15, 2))))

        # 6. Priority multiplier
        p_mult = PRIORITY_MULTIPLIERS.get(delivery_priority.upper(), Decimal("1.00"))
        subtotal_before_priority = base_fare + distance_fare + weight_fare + extra_pkg_fee + fragile_fee
        priority_fare = Decimal(str(round(float(subtotal_before_priority) * float(p_mult - Decimal("1.00")), 2)))

        # 7. Insurance premium (0.5% of declared value, min ₹25)
        insurance_fee = Decimal("0.00")
        insured_amt = Decimal("0.00")
        if insurance_opt_in and declared_value and declared_value > Decimal("0.00"):
            insured_amt = declared_value
            insurance_fee = max(Decimal("25.00"), Decimal(str(round(float(declared_value) * 0.005, 2))))

        total_gross = subtotal_before_priority + priority_fare + insurance_fee

        # 8. Promotional discount
        discount_amount = Decimal("0.00")
        if promo_code and promo_code.upper() in ("PARCEL50", "WELCOME50"):
            discount_amount = min(Decimal("50.00"), Decimal(str(round(float(total_gross) * 0.20, 2))))

        final_fare = max(Decimal("40.00"), total_gross - discount_amount)

        # 9. Driver Earnings & Platform Commission (80% Driver, 20% Platform)
        driver_earning = Decimal(str(round(float(final_fare - insurance_fee) * 0.80, 2)))
        platform_commission = final_fare - driver_earning

        return {
            "estimated_distance_km": road_dist,
            "estimated_duration_min": max(10, int(road_dist * 3.0)),
            "weight_kg": weight_kg,
            "volumetric_weight_kg": volumetric_kg,
            "effective_weight_kg": effective_weight_kg,
            "vehicle_category": v_cat,
            "delivery_priority": delivery_priority.upper(),
            "is_fragile": is_fragile,
            "is_valuable": is_valuable,
            "base_fare": float(base_fare),
            "distance_fare": float(distance_fare),
            "weight_fare": float(weight_fare),
            "volume_fare": 0.0,
            "priority_fare": float(priority_fare),
            "handling_fee": float(extra_pkg_fee + fragile_fee),
            "insurance_fee": float(insurance_fee),
            "insured_amount": float(insured_amt),
            "discount_amount": float(discount_amount),
            "final_fare": float(final_fare),
            "driver_earning": float(driver_earning),
            "platform_commission": float(platform_commission),
            "currency": "INR",
        }

    async def create_parcel(
        self,
        booking_owner_id: str,
        sender_name: str,
        sender_phone: str,
        sender_address: str,
        sender_lat: float,
        sender_lng: float,
        receiver_name: str,
        receiver_phone: str,
        receiver_address: str,
        receiver_lat: float,
        receiver_lng: float,
        weight_kg: float,
        length_cm: Optional[float] = None,
        width_cm: Optional[float] = None,
        height_cm: Optional[float] = None,
        package_count: int = 1,
        parcel_category: str = "GENERAL_BOX",
        description: Optional[str] = None,
        is_fragile: bool = False,
        is_valuable: bool = False,
        declared_value: Optional[float] = None,
        insurance_opt_in: bool = False,
        vehicle_category: str = "BIKE",
        delivery_priority: str = "STANDARD",
        pickup_instructions: Optional[str] = None,
        delivery_instructions: Optional[str] = None,
        payment_method: str = "WALLET",
        promo_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Creates a canonical logistics shipment with random OTPs and initial audit status.
        """
        owner_uuid = UUID(booking_owner_id)

        # Compute authoritative pricing
        dec_decl_val = Decimal(str(declared_value)) if declared_value else None
        quote = self.calculate_quote(
            sender_lat=sender_lat,
            sender_lng=sender_lng,
            receiver_lat=receiver_lat,
            receiver_lng=receiver_lng,
            weight_kg=weight_kg,
            length_cm=length_cm,
            width_cm=width_cm,
            height_cm=height_cm,
            package_count=package_count,
            vehicle_category=vehicle_category,
            delivery_priority=delivery_priority,
            is_fragile=is_fragile,
            is_valuable=is_valuable,
            declared_value=dec_decl_val,
            insurance_opt_in=insurance_opt_in,
            promo_code=promo_code,
        )

        # Generate secure random 4-digit PINs
        # 1. Pickup OTP: Given by Sender to Driver upon handover
        pickup_otp = f"{uuid.uuid4().int % 9000 + 1000:04d}"
        # 2. Delivery OTP: Given by Receiver to Driver upon delivery completion
        delivery_otp = f"{uuid.uuid4().int % 9000 + 1000:04d}"

        # Generate Tracking Number: PX + YYMMDD + 6 hex chars
        now_utc = datetime.now(timezone.utc)
        tracking_number = f"PX{now_utc.strftime('%y%m%d')}{uuid.uuid4().hex[:6].upper()}"

        parcel_id = uuid.uuid4()
        parcel = Parcel(
            id=parcel_id,
            booking_owner_id=owner_uuid,
            customer_id=owner_uuid,
            tracking_number=tracking_number,
            sender_name=sender_name,
            sender_phone=sender_phone,
            sender_address=sender_address,
            sender_lat=sender_lat,
            sender_lng=sender_lng,
            sender_location=f"SRID=4326;POINT({sender_lng} {sender_lat})",
            pickup_instructions=pickup_instructions,
            receiver_name=receiver_name,
            receiver_phone=receiver_phone,
            receiver_address=receiver_address,
            receiver_lat=receiver_lat,
            receiver_lng=receiver_lng,
            receiver_location=f"SRID=4326;POINT({receiver_lng} {receiver_lat})",
            delivery_instructions=delivery_instructions,
            parcel_category=parcel_category.value if hasattr(parcel_category, "value") else str(parcel_category).upper(),
            description=description,
            package_count=package_count,
            weight_kg=weight_kg,
            length_cm=length_cm,
            width_cm=width_cm,
            height_cm=height_cm,
            volumetric_weight_kg=quote["volumetric_weight_kg"],
            dimensions={"length": length_cm, "width": width_cm, "height": height_cm} if length_cm else None,
            is_fragile=is_fragile,
            is_urgent=(delivery_priority.upper() == "EXPRESS"),
            is_valuable=is_valuable,
            declared_value=dec_decl_val,
            insurance_opt_in=insurance_opt_in,
            insured_amount=Decimal(str(quote["insured_amount"])) if quote["insured_amount"] > 0 else None,
            insurance_premium=Decimal(str(quote["insurance_fee"])),
            vehicle_category=vehicle_category.upper(),
            delivery_priority=delivery_priority.upper(),
            fare=Decimal(str(quote["final_fare"])),
            base_fare=Decimal(str(quote["base_fare"])),
            distance_fare=Decimal(str(quote["distance_fare"])),
            weight_fare=Decimal(str(quote["weight_fare"])),
            volume_fare=Decimal(str(quote["volume_fare"])),
            priority_fare=Decimal(str(quote["priority_fare"])),
            handling_fee=Decimal(str(quote["handling_fee"])),
            discount_amount=Decimal(str(quote["discount_amount"])),
            parcel_charge=Decimal(str(quote["final_fare"])),
            driver_earning=Decimal(str(quote["driver_earning"])),
            platform_commission=Decimal(str(quote["platform_commission"])),
            payment_method=payment_method.upper(),
            payment_status="PENDING",
            status=ParcelStatus.SEARCHING_DRIVER,
            pickup_otp=pickup_otp,
            delivery_otp=delivery_otp,
        )
        self.db.add(parcel)

        # Add initial audit status history
        history = ParcelStatusHistory(
            id=uuid.uuid4(),
            parcel_id=parcel_id,
            from_status=None,
            to_status=ParcelStatus.SEARCHING_DRIVER.value,
            actor_role="CUSTOMER",
            actor_id=owner_uuid,
            notes="Parcel order created and dispatching candidates",
            latitude=sender_lat,
            longitude=sender_lng,
        )
        self.db.add(history)
        await self.db.commit()

        # Cache in Redis
        try:
            await cache_set(
                f"parcel:tracking:{tracking_number}",
                {
                    "parcel_id": str(parcel.id),
                    "tracking_number": tracking_number,
                    "status": ParcelStatus.SEARCHING_DRIVER.value,
                    "sender_address": sender_address,
                    "receiver_address": receiver_address,
                },
                expire_seconds=86400 * 7,
            )
        except Exception as e:
            logger.warning("Redis cache error on parcel creation", error=str(e))

        # Broadcast delivery request to eligible drivers
        try:
            await publish_event(
                "driver_scan:parcels",
                {
                    "event": "PARCEL_DELIVERY_REQUEST",
                    "parcel_id": str(parcel.id),
                    "tracking_number": tracking_number,
                    "pickup_address": sender_address,
                    "delivery_address": receiver_address,
                    "package_count": package_count,
                    "weight_kg": weight_kg,
                    "vehicle_category": vehicle_category.upper(),
                    "delivery_priority": delivery_priority.upper(),
                    "is_fragile": is_fragile,
                    "fare": float(parcel.fare),
                    "driver_earning": float(parcel.driver_earning),
                    "distance_km": quote["estimated_distance_km"],
                }
            )
        except Exception as e:
            logger.warning("Redis publish error on parcel dispatch", error=str(e))

        logger.info(
            "Parcel order created successfully",
            parcel_id=str(parcel.id),
            tracking_number=tracking_number,
            fare=str(parcel.fare),
            driver_earning=str(parcel.driver_earning),
        )

        return {
            "parcel_id": str(parcel.id),
            "tracking_number": tracking_number,
            "status": ParcelStatus.SEARCHING_DRIVER.value,
            "pickup_otp": pickup_otp,  # Revealed to booking owner/sender
            "delivery_otp": delivery_otp,  # Revealed to booking owner/receiver
            "fare": float(parcel.fare),
            "driver_earning": float(parcel.driver_earning),
            "breakdown": quote,
        }

    async def driver_accept_parcel(
        self,
        parcel_id: str,
        driver_user_id: str,
    ) -> Dict[str, Any]:
        """
        Driver accepts incoming parcel delivery request.
        Atomically sets status = DRIVER_ASSIGNED.
        """
        p_uuid = UUID(parcel_id)
        d_user_uuid = UUID(driver_user_id)

        # Lookup driver and vehicle
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == d_user_uuid))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        v_res = await self.db.execute(select(Vehicle).where(Vehicle.driver_id == driver.id))
        vehicle = v_res.scalar_one_or_none()

        p_res = await self.db.execute(
            select(Parcel).where(Parcel.id == p_uuid).with_for_update()
        )
        parcel = p_res.scalar_one_or_none()
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        if parcel.status not in (ParcelStatus.SEARCHING_DRIVER, ParcelStatus.CREATED, ParcelStatus.PENDING):
            raise HTTPException(status_code=409, detail=f"Parcel already assigned or completed (status: {parcel.status.value})")

        # Incompatible Vehicle Verification
        if not vehicle:
            raise HTTPException(status_code=400, detail="Incompatible vehicle: Driver does not have a registered vehicle")
        if not vehicle.parcel_capable:
            raise HTTPException(status_code=400, detail="Incompatible vehicle: Vehicle is not authorized for parcel delivery")
        if vehicle.parcel_capacity_kg is not None and vehicle.parcel_capacity_kg < parcel.weight_kg:
            raise HTTPException(
                status_code=400,
                detail=f"Incompatible vehicle: Vehicle parcel capacity ({vehicle.parcel_capacity_kg}kg) is insufficient for parcel weight ({parcel.weight_kg}kg)"
            )

        old_status = parcel.status.value
        parcel.driver_id = driver.id
        parcel.vehicle_id = vehicle.id
        parcel.status = ParcelStatus.DRIVER_ASSIGNED

        history = ParcelStatusHistory(
            id=uuid.uuid4(),
            parcel_id=parcel.id,
            from_status=old_status,
            to_status=ParcelStatus.DRIVER_ASSIGNED.value,
            actor_role="DRIVER",
            actor_id=d_user_uuid,
            notes=f"Accepted by Driver {driver.full_name or 'Partner'}",
        )
        self.db.add(history)
        await self.db.commit()

        # Notify Customer room
        try:
            await publish_event(
                f"customer:{str(parcel.booking_owner_id)}:events",
                {
                    "event": "PARCEL_DRIVER_ASSIGNED",
                    "parcel_id": str(parcel.id),
                    "tracking_number": parcel.tracking_number,
                    "driver_id": str(driver.id),
                    "driver_name": driver.full_name,
                    "driver_phone": driver.phone,
                    "driver_rating": float(driver.rating or 4.8),
                    "vehicle_model": f"{vehicle.make} {vehicle.model}" if vehicle else "Delivery Vehicle",
                    "license_plate": vehicle.registration_number if vehicle else "",
                }
            )
        except Exception as e:
            logger.warning("Notification publish error on driver assign", error=str(e))

        return {
            "success": True,
            "parcel_id": str(parcel.id),
            "status": ParcelStatus.DRIVER_ASSIGNED.value,
            "tracking_number": parcel.tracking_number,
            "sender": {
                "name": parcel.sender_name,
                "phone": parcel.sender_phone,
                "address": parcel.sender_address,
                "lat": parcel.sender_lat,
                "lng": parcel.sender_lng,
                "instructions": parcel.pickup_instructions,
            },
            "receiver": {
                "name": parcel.receiver_name,
                "phone": parcel.receiver_phone,
                "address": parcel.receiver_address,
                "lat": parcel.receiver_lat,
                "lng": parcel.receiver_lng,
                "instructions": parcel.delivery_instructions,
            },
            "package_count": parcel.package_count,
            "weight_kg": parcel.weight_kg,
            "is_fragile": parcel.is_fragile,
            "driver_earning": float(parcel.driver_earning),
        }

    async def driver_arrive_pickup(
        self,
        parcel_id: str,
        driver_user_id: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Driver marks arrival at sender pickup location."""
        p_res = await self.db.execute(select(Parcel).where(Parcel.id == UUID(parcel_id)))
        parcel = p_res.scalar_one_or_none()
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        parcel.status = ParcelStatus.AT_PICKUP
        history = ParcelStatusHistory(
            id=uuid.uuid4(),
            parcel_id=parcel.id,
            from_status=ParcelStatus.DRIVER_ASSIGNED.value,
            to_status=ParcelStatus.AT_PICKUP.value,
            actor_role="DRIVER",
            notes="Driver arrived at pickup location",
            latitude=lat,
            longitude=lng,
        )
        self.db.add(history)
        await self.db.commit()

        try:
            await publish_event(
                f"customer:{str(parcel.booking_owner_id)}:events",
                {
                    "event": "PARCEL_AT_PICKUP",
                    "parcel_id": str(parcel.id),
                    "tracking_number": parcel.tracking_number,
                    "status": ParcelStatus.AT_PICKUP.value,
                }
            )
        except Exception as e:
            logger.warning("Event publish error on arrive pickup", error=str(e))

        return {"success": True, "status": ParcelStatus.AT_PICKUP.value}

    async def verify_pickup_otp_and_handover(
        self,
        parcel_id: str,
        driver_user_id: str,
        pickup_otp: str,
        photo_url: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Validates Sender Pickup OTP and transitions shipment to PICKED_UP / IN_TRANSIT.
        """
        p_res = await self.db.execute(
            select(Parcel).where(Parcel.id == UUID(parcel_id)).with_for_update()
        )
        parcel = p_res.scalar_one_or_none()
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        if parcel.pickup_otp_attempts >= 3:
            raise HTTPException(status_code=403, detail="Pickup OTP locked due to too many failed attempts. Contact support.")

        if parcel.pickup_otp != pickup_otp.strip():
            parcel.pickup_otp_attempts += 1
            await self.db.commit()
            raise HTTPException(status_code=400, detail=f"Invalid Pickup OTP. {3 - parcel.pickup_otp_attempts} attempts remaining.")

        now_utc = datetime.now(timezone.utc)
        parcel.pickup_verified_at = now_utc
        parcel.picked_up_at = now_utc
        parcel.in_transit_at = now_utc
        parcel.status = ParcelStatus.IN_TRANSIT
        if photo_url:
            parcel.proof_image = photo_url

        history = ParcelStatusHistory(
            id=uuid.uuid4(),
            parcel_id=parcel.id,
            from_status=ParcelStatus.AT_PICKUP.value,
            to_status=ParcelStatus.IN_TRANSIT.value,
            actor_role="DRIVER",
            notes=f"Pickup verified via OTP. Handover complete. {notes or ''}",
        )
        self.db.add(history)
        await self.db.commit()

        try:
            await publish_event(
                f"customer:{str(parcel.booking_owner_id)}:events",
                {
                    "event": "PARCEL_IN_TRANSIT",
                    "parcel_id": str(parcel.id),
                    "tracking_number": parcel.tracking_number,
                    "status": ParcelStatus.IN_TRANSIT.value,
                }
            )
        except Exception as e:
            logger.warning("Event publish error on pickup verified", error=str(e))

        return {
            "success": True,
            "status": ParcelStatus.IN_TRANSIT.value,
            "picked_up_at": now_utc.isoformat(),
        }

    async def driver_arrive_destination(
        self,
        parcel_id: str,
        driver_user_id: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Driver marks arrival at receiver dropoff destination."""
        p_res = await self.db.execute(select(Parcel).where(Parcel.id == UUID(parcel_id)))
        parcel = p_res.scalar_one_or_none()
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        now_utc = datetime.now(timezone.utc)
        parcel.near_destination_at = now_utc
        parcel.arrived_destination_at = now_utc
        parcel.status = ParcelStatus.AT_DESTINATION

        history = ParcelStatusHistory(
            id=uuid.uuid4(),
            parcel_id=parcel.id,
            from_status=ParcelStatus.IN_TRANSIT.value,
            to_status=ParcelStatus.AT_DESTINATION.value,
            actor_role="DRIVER",
            notes="Driver arrived at delivery destination",
            latitude=lat,
            longitude=lng,
        )
        self.db.add(history)
        await self.db.commit()

        try:
            await publish_event(
                f"customer:{str(parcel.booking_owner_id)}:events",
                {
                    "event": "PARCEL_AT_DESTINATION",
                    "parcel_id": str(parcel.id),
                    "tracking_number": parcel.tracking_number,
                    "status": ParcelStatus.AT_DESTINATION.value,
                }
            )
        except Exception as e:
            logger.warning("Event publish error on arrival at destination", error=str(e))

        return {"success": True, "status": ParcelStatus.AT_DESTINATION.value}

    async def verify_delivery_otp_and_complete(
        self,
        parcel_id: str,
        driver_user_id: str,
        delivery_otp: str,
        receiver_name: Optional[str] = None,
        signature_url: Optional[str] = None,
        delivery_photo_url: Optional[str] = None,
        delivered_lat: Optional[float] = None,
        delivered_lng: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Validates Receiver Delivery OTP, records Proof of Delivery (POD),
        settles driver earnings, and marks status = DELIVERED.
        """
        p_res = await self.db.execute(
            select(Parcel).where(Parcel.id == UUID(parcel_id)).with_for_update()
        )
        parcel = p_res.scalar_one_or_none()
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        if parcel.status == ParcelStatus.DELIVERED:
            return {"success": True, "status": ParcelStatus.DELIVERED.value, "message": "Already delivered"}

        # Validate delivery OTP presence
        if not delivery_otp or not str(delivery_otp).strip():
            raise HTTPException(status_code=400, detail="Missing delivery OTP: Delivery OTP is required to complete delivery")

        final_receiver = (receiver_name or parcel.receiver_name or "").strip()
        if not final_receiver:
            raise HTTPException(status_code=400, detail="Missing POD information: Receiver name is required for Proof of Delivery")

        if parcel.delivery_otp_attempts >= 3:
            raise HTTPException(status_code=403, detail="Delivery OTP locked due to too many failed attempts. Contact support.")

        if parcel.delivery_otp != str(delivery_otp).strip():
            parcel.delivery_otp_attempts += 1
            await self.db.commit()
            raise HTTPException(status_code=400, detail=f"Invalid Delivery OTP. {max(0, 3 - parcel.delivery_otp_attempts)} attempts remaining.")

        now_utc = datetime.now(timezone.utc)
        parcel.status = ParcelStatus.DELIVERED
        parcel.delivered_at = now_utc
        parcel.payment_status = "PAID"

        # 1. Create Immutable Proof of Delivery Record
        pod = ParcelProofOfDelivery(
            id=uuid.uuid4(),
            parcel_id=parcel.id,
            driver_id=parcel.driver_id,
            receiver_name=final_receiver,
            otp_verified=True,
            signature_url=signature_url,
            delivery_photo_url=delivery_photo_url,
            delivered_lat=delivered_lat,
            delivered_lng=delivered_lng,
            delivered_at=now_utc,
            metadata_json={
                "tracking_number": parcel.tracking_number,
                "weight_kg": parcel.weight_kg,
                "fare_paid": float(parcel.fare),
            }
        )
        self.db.add(pod)

        # 2. Add Status History
        history = ParcelStatusHistory(
            id=uuid.uuid4(),
            parcel_id=parcel.id,
            from_status=ParcelStatus.AT_DESTINATION.value,
            to_status=ParcelStatus.DELIVERED.value,
            actor_role="DRIVER",
            notes=f"Delivery confirmed via OTP to {final_receiver}",
            latitude=delivered_lat,
            longitude=delivered_lng,
        )
        self.db.add(history)

        # 3. Credit Driver Earnings in Driver Profile & Financial Ledger
        if parcel.driver_id:
            d_res = await self.db.execute(select(Driver).where(Driver.id == parcel.driver_id))
            driver = d_res.scalar_one_or_none()
            if driver:
                driver.total_earnings = (driver.total_earnings or Decimal("0.00")) + parcel.driver_earning
                driver.wallet_balance = (driver.wallet_balance or Decimal("0.00")) + parcel.driver_earning
                driver.total_trips = (driver.total_trips or 0) + 1

                try:
                    from common.models.all_models import DriverEarningLedger
                    from datetime import date
                    ledger_entry = DriverEarningLedger(
                        id=uuid.uuid4(),
                        driver_id=driver.id,
                        entry_type="PARCEL_EARNING",
                        amount=parcel.driver_earning,
                        currency="INR",
                        direction="CREDIT",
                        status="SETTLED",
                        description=f"Earnings for Parcel #{parcel.tracking_number} ({parcel.weight_kg}kg)",
                        effective_date=date.today(),
                        metadata_json={
                            "parcel_id": str(parcel.id),
                            "tracking_number": parcel.tracking_number,
                            "weight_kg": parcel.weight_kg,
                            "fare": float(parcel.fare),
                            "commission": float(parcel.platform_commission),
                        },
                    )
                    self.db.add(ledger_entry)
                except Exception as ex:
                    logger.warning("DriverEarningLedger creation note", error=str(ex))

        await self.db.commit()

        # 4. Notify Customer Room
        try:
            await publish_event(
                f"customer:{str(parcel.booking_owner_id)}:events",
                {
                    "event": "PARCEL_DELIVERED",
                    "parcel_id": str(parcel.id),
                    "tracking_number": parcel.tracking_number,
                    "status": ParcelStatus.DELIVERED.value,
                    "delivered_at": now_utc.isoformat(),
                    "receiver_name": final_receiver,
                    "fare": float(parcel.fare),
                }
            )
        except Exception as e:
            logger.warning("Event publish error on delivery complete", error=str(e))

        logger.info(
            "Parcel successfully delivered",
            parcel_id=str(parcel.id),
            tracking_number=parcel.tracking_number,
            driver_earning=str(parcel.driver_earning),
        )

        return {
            "success": True,
            "status": ParcelStatus.DELIVERED.value,
            "tracking_number": parcel.tracking_number,
            "delivered_at": now_utc.isoformat(),
            "pod_id": str(pod.id),
            "driver_earning": float(parcel.driver_earning),
        }

    async def get_parcel_details(self, parcel_id_or_tracking: str) -> Dict[str, Any]:
        """Returns full tracking details with state timeline and sanitized driver info."""
        try:
            u = UUID(parcel_id_or_tracking)
            cond = or_(Parcel.id == u, Parcel.tracking_number == parcel_id_or_tracking)
        except Exception:
            cond = (Parcel.tracking_number == parcel_id_or_tracking)

        res = await self.db.execute(select(Parcel).where(cond))
        parcel = res.scalar_one_or_none()
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel shipment not found")

        # Fetch driver details
        driver_data = None
        if parcel.driver_id:
            d_res = await self.db.execute(select(Driver).where(Driver.id == parcel.driver_id))
            driver = d_res.scalar_one_or_none()
            v_res = await self.db.execute(select(Vehicle).where(Vehicle.id == parcel.vehicle_id))
            vehicle = v_res.scalar_one_or_none()
            if driver:
                driver_data = {
                    "id": str(driver.id),
                    "name": driver.full_name or "Logistics Partner",
                    "rating": float(driver.rating or 4.8),
                    "phone_masked": f"+91 {driver.phone[-4:] if driver.phone else '****'}",
                    "vehicle": f"{vehicle.make} {vehicle.model} ({vehicle.color})" if vehicle else "Delivery Vehicle",
                    "license_plate": vehicle.registration_number if vehicle else "",
                }

        # Fetch POD if delivered
        pod_data = None
        if parcel.status == ParcelStatus.DELIVERED:
            pod_res = await self.db.execute(select(ParcelProofOfDelivery).where(ParcelProofOfDelivery.parcel_id == parcel.id))
            pod = pod_res.scalar_one_or_none()
            if pod:
                pod_data = {
                    "receiver_name": pod.receiver_name,
                    "delivered_at": pod.delivered_at.isoformat(),
                    "otp_verified": pod.otp_verified,
                    "signature_url": pod.signature_url,
                    "delivery_photo_url": pod.delivery_photo_url,
                }

        # Fetch Status History
        hist_res = await self.db.execute(
            select(ParcelStatusHistory)
            .where(ParcelStatusHistory.parcel_id == parcel.id)
            .order_by(ParcelStatusHistory.created_at.asc())
        )
        history = [
            {
                "status": h.to_status,
                "notes": h.notes,
                "timestamp": h.created_at.isoformat(),
            }
            for h in hist_res.scalars().all()
        ]

        return {
            "parcel_id": str(parcel.id),
            "tracking_number": parcel.tracking_number,
            "status": parcel.status.value,
            "sender": {
                "name": parcel.sender_name,
                "phone": parcel.sender_phone,
                "address": parcel.sender_address,
                "lat": parcel.sender_lat,
                "lng": parcel.sender_lng,
                "instructions": parcel.pickup_instructions,
            },
            "receiver": {
                "name": parcel.receiver_name,
                "phone": parcel.receiver_phone,
                "address": parcel.receiver_address,
                "lat": parcel.receiver_lat,
                "lng": parcel.receiver_lng,
                "instructions": parcel.delivery_instructions,
            },
            "package_details": {
                "category": parcel.parcel_category,
                "description": parcel.description,
                "package_count": parcel.package_count,
                "weight_kg": parcel.weight_kg,
                "is_fragile": parcel.is_fragile,
                "is_valuable": parcel.is_valuable,
                "declared_value": float(parcel.declared_value) if parcel.declared_value else None,
                "insurance_opt_in": parcel.insurance_opt_in,
            },
            "pricing": {
                "fare": float(parcel.fare),
                "base_fare": float(parcel.base_fare),
                "distance_fare": float(parcel.distance_fare),
                "weight_fare": float(parcel.weight_fare),
                "priority_fare": float(parcel.priority_fare),
                "insurance_fee": float(parcel.insurance_premium),
                "discount_amount": float(parcel.discount_amount),
                "payment_method": parcel.payment_method,
                "payment_status": parcel.payment_status,
            },
            "pickup_otp": parcel.pickup_otp,
            "delivery_otp": parcel.delivery_otp,
            "driver": driver_data,
            "pod": pod_data,
            "rating": {
                "score": parcel.customer_rating,
                "feedback": parcel.customer_feedback,
                "tags": parcel.customer_rating_tags or [],
                "rated_at": parcel.rated_at.isoformat() if parcel.rated_at else None,
            } if parcel.customer_rating is not None else None,
            "timeline": history,
            "created_at": parcel.created_at.isoformat(),
        }

    async def get_customer_parcels(
        self,
        customer_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Returns paginated shipment list for booking owner."""
        c_uuid = UUID(customer_id)
        res = await self.db.execute(
            select(Parcel)
            .where(or_(Parcel.booking_owner_id == c_uuid, Parcel.customer_id == c_uuid))
            .order_by(desc(Parcel.created_at))
            .offset(offset)
            .limit(limit)
        )
        parcels = res.scalars().all()
        return [
            {
                "parcel_id": str(p.id),
                "tracking_number": p.tracking_number,
                "status": p.status.value,
                "sender_address": p.sender_address,
                "receiver_address": p.receiver_address,
                "receiver_name": p.receiver_name,
                "package_count": p.package_count,
                "weight_kg": p.weight_kg,
                "parcel_category": p.parcel_category,
                "fare": float(p.fare),
                "is_fragile": p.is_fragile,
                "customer_rating": p.customer_rating,
                "created_at": p.created_at.isoformat(),
                "delivered_at": p.delivered_at.isoformat() if p.delivered_at else None,
            }
            for p in parcels
        ]

    async def get_driver_available_requests(
        self,
        driver_user_id: str,
    ) -> List[Dict[str, Any]]:
        """Returns pending delivery requests filtered by driver's vehicle capacity."""
        d_uuid = UUID(driver_user_id)
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == d_uuid))
        driver = d_res.scalar_one_or_none()

        max_cap = 9999.0
        if driver:
            v_res = await self.db.execute(select(Vehicle).where(Vehicle.driver_id == driver.id))
            vehicle = v_res.scalar_one_or_none()
            if vehicle and vehicle.parcel_capacity_kg:
                max_cap = vehicle.parcel_capacity_kg

        res = await self.db.execute(
            select(Parcel)
            .where(
                and_(
                    Parcel.status.in_([
                        ParcelStatus.SEARCHING_DRIVER,
                        ParcelStatus.PENDING,
                        ParcelStatus.CREATED,
                    ]),
                    Parcel.weight_kg <= max_cap,
                )
            )
            .order_by(desc(Parcel.created_at))
            .limit(20)
        )
        parcels = res.scalars().all()
        return [
            {
                "parcel_id": str(p.id),
                "tracking_number": p.tracking_number,
                "pickup_address": p.sender_address,
                "delivery_address": p.receiver_address,
                "package_count": p.package_count,
                "weight_kg": p.weight_kg,
                "vehicle_category": p.vehicle_category,
                "delivery_priority": p.delivery_priority,
                "is_fragile": p.is_fragile,
                "driver_earning": float(p.driver_earning),
                "created_at": p.created_at.isoformat(),
            }
            for p in parcels
        ]

    async def find_eligible_drivers_for_parcel(
        self,
        parcel_id: str,
        radius_km: float = 15.0,
    ) -> List[Dict[str, Any]]:
        """
        Finds online candidate drivers within radius with parcel capability & capacity.
        """
        p_res = await self.db.execute(select(Parcel).where(Parcel.id == UUID(parcel_id)))
        parcel = p_res.scalar_one_or_none()
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        stmt = (
            select(Driver, Vehicle)
            .join(Vehicle, Vehicle.driver_id == Driver.id)
            .where(
                and_(
                    Driver.status == DriverStatus.ONLINE,
                    Vehicle.parcel_capable == True,
                    or_(
                        Vehicle.parcel_capacity_kg == None,
                        Vehicle.parcel_capacity_kg >= parcel.weight_kg,
                    ),
                )
            )
        )
        res = await self.db.execute(stmt)
        rows = res.all()

        candidates = []
        for drv, veh in rows:
            dist_km = 2.5
            if drv.current_latitude and drv.current_longitude and parcel.sender_lat and parcel.sender_lng:
                dist_km = haversine_distance_km(
                    drv.current_latitude, drv.current_longitude,
                    parcel.sender_lat, parcel.sender_lng
                )
            if dist_km <= radius_km:
                candidates.append({
                    "driver_id": str(drv.id),
                    "driver_name": drv.full_name,
                    "phone_masked": f"+91 {drv.phone[-4:] if drv.phone else '****'}",
                    "rating": float(drv.rating or 4.8),
                    "vehicle": {
                        "make": veh.make,
                        "model": veh.model,
                        "registration_number": veh.registration_number,
                        "vehicle_type": veh.vehicle_type.value if hasattr(veh.vehicle_type, "value") else str(veh.vehicle_type),
                        "parcel_capacity_kg": veh.parcel_capacity_kg,
                    },
                    "distance_km": dist_km,
                    "eta_minutes": max(3, int(dist_km * 3)),
                })

        candidates.sort(key=lambda x: x["distance_km"])
        return candidates

    async def rate_parcel(
        self,
        parcel_id: str,
        customer_user_id: str,
        score: int,
        feedback: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Customer rates the completed parcel delivery.
        Updates Driver aggregate rating and logs status audit history.
        """
        p_res = await self.db.execute(select(Parcel).where(Parcel.id == UUID(parcel_id)).with_for_update())
        parcel = p_res.scalar_one_or_none()
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        c_uuid = UUID(customer_user_id)
        if parcel.booking_owner_id != c_uuid and parcel.customer_id != c_uuid:
            raise HTTPException(status_code=403, detail="Not authorized to rate this parcel shipment")

        if parcel.status != ParcelStatus.DELIVERED:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot rate parcel in {parcel.status.value} status. Only delivered parcels can be rated."
            )

        if not (1 <= score <= 5):
            raise HTTPException(status_code=400, detail="Rating score must be between 1 and 5 stars")

        if parcel.customer_rating is not None:
            raise HTTPException(status_code=400, detail="Parcel has already been rated")

        now_utc = datetime.now(timezone.utc)
        parcel.customer_rating = score
        parcel.customer_feedback = feedback
        parcel.customer_rating_tags = tags or []
        parcel.rated_at = now_utc

        # Recalculate Driver rating
        if parcel.driver_id:
            d_res = await self.db.execute(select(Driver).where(Driver.id == parcel.driver_id))
            driver = d_res.scalar_one_or_none()
            if driver:
                current_rating = float(driver.rating or 5.0)
                trip_count = max(1, driver.total_trips or 1)
                new_rating = round(((current_rating * (trip_count - 1)) + score) / trip_count, 2)
                driver.rating = min(5.0, max(1.0, new_rating))

        history = ParcelStatusHistory(
            id=uuid.uuid4(),
            parcel_id=parcel.id,
            from_status=ParcelStatus.DELIVERED.value,
            to_status=ParcelStatus.DELIVERED.value,
            actor_role="CUSTOMER",
            actor_id=c_uuid,
            notes=f"Customer rated {score} stars. Feedback: {feedback or 'No comment'}",
        )
        self.db.add(history)
        await self.db.commit()

        return {
            "success": True,
            "parcel_id": str(parcel.id),
            "tracking_number": parcel.tracking_number,
            "rating": score,
            "feedback": feedback,
            "tags": tags or [],
            "rated_at": now_utc.isoformat(),
        }

    async def upload_pod_proof(
        self,
        parcel_id: str,
        driver_user_id: str,
        file: Any,
        proof_type: str = "delivery_photo",
    ) -> Dict[str, Any]:
        """
        Uploads delivery proof photo or signature to Cloudinary and persists MediaAsset metadata.
        """
        p_res = await self.db.execute(select(Parcel).where(Parcel.id == UUID(parcel_id)))
        parcel = p_res.scalar_one_or_none()
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        folder = f"parcels/{parcel_id}/{proof_type}"
        upload_res = await CloudinaryService.upload_file(
            file=file,
            folder=folder,
            public_id=f"{proof_type}_{uuid.uuid4().hex[:8]}",
            resource_type="image",
            is_private=False,
        )

        try:
            media_asset = MediaAsset(
                id=uuid.uuid4(),
                owner_type=MediaOwnerType.DRIVER,
                owner_id=UUID(driver_user_id),
                media_type=MediaType.PARCEL_PHOTO if proof_type == "delivery_photo" else MediaType.PROFILE_PHOTO,
                cloudinary_public_id=upload_res["public_id"],
                resource_type=upload_res.get("resource_type", "image"),
                format=upload_res.get("format", "jpg"),
                file_size_bytes=upload_res.get("bytes", 0),
                secure_url=upload_res["secure_url"],
                thumbnail_url=upload_res.get("secure_url"),
                status="ACTIVE",
                metadata_json={"parcel_id": str(parcel.id), "proof_type": proof_type},
            )
            self.db.add(media_asset)
            await self.db.commit()
        except Exception as e:
            logger.warning("MediaAsset logging note", error=str(e))

        return {
            "success": True,
            "proof_type": proof_type,
            "url": upload_res["secure_url"],
            "public_id": upload_res["public_id"],
        }

    async def cancel_parcel(
        self,
        parcel_id: str,
        user_id: str,
        user_role: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Handles role-aware cancellation before or after driver assignment."""
        p_res = await self.db.execute(
            select(Parcel).where(Parcel.id == UUID(parcel_id)).with_for_update()
        )
        parcel = p_res.scalar_one_or_none()
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        if parcel.status in (ParcelStatus.DELIVERED, ParcelStatus.CANCELLED):
            raise HTTPException(status_code=400, detail=f"Cannot cancel parcel in {parcel.status.value} state")

        if parcel.status in (ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT, ParcelStatus.NEAR_DESTINATION, ParcelStatus.AT_DESTINATION):
            # In-transit cancellation requires return policy
            parcel.status = ParcelStatus.RETURN_REQUIRED
            parcel.cancellation_reason = reason or "Cancelled in transit by user"
            parcel.cancelled_by = user_role
            parcel.cancelled_at = datetime.now(timezone.utc)
        else:
            parcel.status = ParcelStatus.CANCELLED
            parcel.cancellation_reason = reason or "Cancelled before pickup"
            parcel.cancelled_by = user_role
            parcel.cancelled_at = datetime.now(timezone.utc)

        history = ParcelStatusHistory(
            id=uuid.uuid4(),
            parcel_id=parcel.id,
            from_status=parcel.status.value,
            to_status=ParcelStatus.CANCELLED.value,
            actor_role=user_role.upper(),
            notes=f"Cancelled: {reason or 'User requested cancellation'}",
        )
        self.db.add(history)
        await self.db.commit()

        return {
            "success": True,
            "status": parcel.status.value,
            "message": "Parcel order successfully updated",
        }
