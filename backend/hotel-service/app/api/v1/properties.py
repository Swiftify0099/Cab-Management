from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser
from app.schemas.property import PropertyCreateRequest, PropertyResponse
from app.services.property_service import PropertyService

router = APIRouter()

@router.post("/", response_model=PropertyResponse)
async def create_property(
    data: PropertyCreateRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user)
):
    service = PropertyService(db)
    try:
        prop = await service.create_property(user.user_id_str, data)
        return prop
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/search")
async def search_properties(
    city: str = Query(...),
    type: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    service = PropertyService(db)
    props = await service.search_properties(city, type)
    return props

@router.put("/{property_id}/status", response_model=PropertyResponse)
async def approve_property(
    property_id: str,
    data: __import__('app.schemas.property', fromlist=['AdminActionRequest']).AdminActionRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user)
):
    # Verify admin role
    service = PropertyService(db)
    try:
        prop = await service.admin_approve_property(user.user_id_str, property_id, data.approve)
        return prop
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
