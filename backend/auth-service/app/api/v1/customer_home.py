"""
Customer Home API Router.
Endpoint: /api/v1/customer/home
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_user
from app.schemas.customer_home import CustomerHomeSummaryResponse
from app.services.customer_home_service import get_customer_home_summary

router = APIRouter()


@router.get(
    "/summary",
    response_model=CustomerHomeSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get unified Customer Home summary data",
)
async def get_home_summary(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_customer_home_summary(db, current_user)
