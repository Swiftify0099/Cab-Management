from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from decimal import Decimal
import uuid
from datetime import datetime

from common.models.all_models import (
    Vendor, VendorApplication, VendorStatus,
    Property, PropertyType, PropertyStatus, PropertyUnit, PropertyImage,
    PropertyBooking, BookingStatus, Notification, NotificationType, UserRole, User
)
from app.schemas.property import (
    VendorRegisterRequest, PropertyCreateRequest, BookingCreateRequest
)
from common.config import settings

class PropertyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _send_notification(self, user_id: uuid.UUID, title: str, body: str, n_type: NotificationType):
        notification = Notification(
            user_id=user_id,
            title=title,
            body=body,
            notification_type=n_type
        )
        self.db.add(notification)
        # In a real system, we might also push to FCM or Kafka here

    async def _get_admins(self):
        result = await self.db.execute(select(User).where(User.role == UserRole.ADMIN))
        return result.scalars().all()

    async def register_vendor(self, user_id: str, data: VendorRegisterRequest) -> Vendor:
        result = await self.db.execute(select(Vendor).where(Vendor.user_id == uuid.UUID(user_id)))
        if result.scalar_one_or_none():
            raise ValueError("User is already registered as a vendor")

        vendor = Vendor(
            user_id=uuid.UUID(user_id),
            business_name=data.business_name,
            aadhaar_number=data.aadhaar_number,
            pan_number=data.pan_number,
            gst_number=data.gst_number,
            status=VendorStatus.PENDING
        )
        self.db.add(vendor)
        await self.db.flush()

        app = VendorApplication(
            vendor_id=vendor.id,
            documents=data.documents,
            status=VendorStatus.PENDING
        )
        self.db.add(app)

        # Notify Admins
        admins = await self._get_admins()
        for admin in admins:
            await self._send_notification(
                admin.id, "New Vendor Registration", f"{data.business_name} has applied.", NotificationType.VENDOR
            )

        await self.db.commit()
        await self.db.refresh(vendor)
        return vendor

    async def admin_approve_vendor(self, admin_id: str, vendor_id: str, approve: bool):
        result = await self.db.execute(select(Vendor).where(Vendor.id == uuid.UUID(vendor_id)))
        vendor = result.scalar_one_or_none()
        if not vendor:
            raise ValueError("Vendor not found")

        status = VendorStatus.APPROVED if approve else VendorStatus.REJECTED
        vendor.status = status
        
        # Also update application
        app_res = await self.db.execute(select(VendorApplication).where(VendorApplication.vendor_id == vendor.id))
        application = app_res.scalar_one_or_none()
        if application:
            application.status = status
            application.reviewed_at = datetime.utcnow()
            application.reviewed_by = uuid.UUID(admin_id)

        # Notify Vendor
        msg = "Your vendor application has been approved!" if approve else "Your vendor application was rejected."
        await self._send_notification(vendor.user_id, "Vendor Application Status", msg, NotificationType.VENDOR)
        
        await self.db.commit()
        return vendor

    async def get_vendor_by_user(self, user_id: str) -> Vendor:
        result = await self.db.execute(select(Vendor).where(Vendor.user_id == uuid.UUID(user_id)))
        vendor = result.scalar_one_or_none()
        if not vendor:
            raise ValueError("Vendor profile not found")
        return vendor

    async def create_property(self, user_id: str, data: PropertyCreateRequest) -> Property:
        vendor = await self.get_vendor_by_user(user_id)
        if vendor.status != VendorStatus.APPROVED:
            raise ValueError("Vendor is not approved yet")

        prop = Property(
            vendor_id=vendor.id,
            type=PropertyType(data.type),
            name=data.name,
            description=data.description,
            location=f"POINT({data.longitude} {data.latitude})",
            latitude=data.latitude,
            longitude=data.longitude,
            address=data.address,
            city=data.city,
            state=data.state,
            pincode=data.pincode,
            status=PropertyStatus.SUBMITTED,
            policies=data.policies
        )
        self.db.add(prop)
        await self.db.flush()

        for unit_data in data.units:
            unit = PropertyUnit(
                property_id=prop.id,
                name=unit_data.name,
                capacity=unit_data.capacity,
                price=Decimal(str(unit_data.price)),
                amenities=unit_data.amenities,
                count=unit_data.count
            )
            self.db.add(unit)

        for img_url in data.images:
            img = PropertyImage(
                property_id=prop.id,
                url=img_url,
                type="general"
            )
            self.db.add(img)

        # Notify Admins
        admins = await self._get_admins()
        for admin in admins:
            await self._send_notification(
                admin.id, "New Property Submitted", f"Vendor {vendor.business_name} submitted {data.name}.", NotificationType.PROPERTY
            )

        await self.db.commit()
        await self.db.refresh(prop)
        return prop

    async def admin_approve_property(self, admin_id: str, property_id: str, approve: bool):
        result = await self.db.execute(select(Property).where(Property.id == uuid.UUID(property_id)))
        prop = result.scalar_one_or_none()
        if not prop:
            raise ValueError("Property not found")
        
        status = PropertyStatus.APPROVED if approve else PropertyStatus.REJECTED
        prop.status = status

        # Fetch vendor to notify
        vendor_res = await self.db.execute(select(Vendor).where(Vendor.id == prop.vendor_id))
        vendor = vendor_res.scalar_one_or_none()

        if vendor:
            msg = f"Your property {prop.name} has been approved!" if approve else f"Your property {prop.name} was rejected."
            await self._send_notification(vendor.user_id, "Property Status", msg, NotificationType.PROPERTY)
        
        await self.db.commit()
        return prop

    async def search_properties(self, city: str, type: str):
        query = select(Property).where(
            Property.city == city,
            Property.type == PropertyType(type),
            Property.status == PropertyStatus.APPROVED
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_booking(self, user_id: str, data: BookingCreateRequest) -> PropertyBooking:
        prop_res = await self.db.execute(select(Property).where(Property.id == data.property_id))
        prop = prop_res.scalar_one_or_none()
        if not prop:
            raise ValueError("Property not found")

        booking = PropertyBooking(
            property_id=data.property_id,
            unit_id=data.unit_id,
            customer_id=uuid.UUID(user_id),
            vendor_id=prop.vendor_id,
            check_in=data.check_in,
            check_out=data.check_out,
            nights=data.nights,
            guests=data.guests,
            total_fare=Decimal(str(data.total_fare)),
            status=BookingStatus.PAYMENT_PENDING
        )
        self.db.add(booking)
        await self.db.commit()
        await self.db.refresh(booking)
        return booking

    async def vendor_action_booking(self, user_id: str, booking_id: str, action: str):
        vendor = await self.get_vendor_by_user(user_id)
        b_res = await self.db.execute(select(PropertyBooking).where(PropertyBooking.id == uuid.UUID(booking_id)))
        booking = b_res.scalar_one_or_none()
        if not booking or booking.vendor_id != vendor.id:
            raise ValueError("Booking not found or unauthorized")

        if action == "accept":
            booking.status = BookingStatus.CONFIRMED
            msg = "Your booking has been confirmed by the vendor."
        elif action == "reject":
            booking.status = BookingStatus.REJECTED
            msg = "Your booking was rejected by the vendor."
            # Refund logic would be triggered via Payment Service events
        elif action == "checkin":
            booking.status = BookingStatus.STARTED
            msg = "You have checked in successfully."
        elif action == "checkout":
            booking.status = BookingStatus.COMPLETED
            msg = "You have checked out successfully. Thank you!"
        else:
            raise ValueError("Invalid action")
        
        await self._send_notification(booking.customer_id, "Booking Update", msg, NotificationType.BOOKING)
        
        await self.db.commit()
        return booking
