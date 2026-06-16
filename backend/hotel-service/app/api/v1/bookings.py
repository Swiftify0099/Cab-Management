from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser
from app.schemas.property import BookingCreateRequest, BookingResponse
from app.services.property_service import PropertyService
import httpx

router = APIRouter()

@router.post("/", response_model=BookingResponse)
async def create_booking(
    data: BookingCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user)
):
    service = PropertyService(db)
    try:
        booking = await service.create_booking(user.user_id_str, data)
        
        # Integration with Payment Service if needed, or returning booking ID to UI for direct Razorpay
        
        return booking
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{booking_id}/action", response_model=BookingResponse)
async def vendor_booking_action(
    booking_id: str,
    data: __import__('app.schemas.property', fromlist=['VendorActionRequest']).VendorActionRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user)
):
    service = PropertyService(db)
    try:
        booking = await service.vendor_action_booking(user.user_id_str, booking_id, data.action)
        return booking
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
