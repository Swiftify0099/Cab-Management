from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser
from app.schemas.property import VendorRegisterRequest, VendorResponse
from app.services.property_service import PropertyService

router = APIRouter()

@router.post("/register", response_model=VendorResponse)
async def register_vendor(
    data: VendorRegisterRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user)
):
    service = PropertyService(db)
    try:
        vendor = await service.register_vendor(user.user_id_str, data)
        return vendor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{vendor_id}/status", response_model=VendorResponse)
async def approve_vendor(
    vendor_id: str,
    data: __import__('app.schemas.property', fromlist=['AdminActionRequest']).AdminActionRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user)
):
    # In a real app, verify user.role == "admin"
    service = PropertyService(db)
    try:
        vendor = await service.admin_approve_vendor(user.user_id_str, vendor_id, data.approve)
        return vendor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
