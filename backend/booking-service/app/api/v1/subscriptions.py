"""
Subscription Plans API  Phase 6.
Manage and purchase subscription plans for customers/drivers.
"""
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_user, require_role
from common.schemas.response import APIResponse

router = APIRouter(prefix="/api/v1/subscriptions", tags=["Subscriptions"])

# Mock DB for plans
MOCK_PLANS = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Pro Driver",
        "price": 499.0,
        "duration_days": 30,
        "benefits": {"commission_discount": 5, "priority_matching": True}
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "name": "Customer Premium",
        "price": 199.0,
        "duration_days": 30,
        "benefits": {"zero_platform_fee": True, "free_cancellation": True}
    }
]

class SubscriptionResponse(BaseModel):
    id: str
    name: str
    price: float
    duration_days: int
    benefits: dict

@router.get(
    "/plans",
    response_model=APIResponse[List[SubscriptionResponse]],
    summary="List all subscription plans"
)
async def list_plans(
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Returns active subscription plans."""
    # Filter by name just for the stub logic
    plans = MOCK_PLANS
    if role == "driver":
        plans = [p for p in plans if "Driver" in p["name"]]
    elif role == "customer":
        plans = [p for p in plans if "Customer" in p["name"]]
        
    return APIResponse(
        message="Plans fetched",
        data=[SubscriptionResponse(**p) for p in plans]
    )

class SubscribeRequest(BaseModel):
    plan_id: str

@router.post(
    "/subscribe",
    response_model=APIResponse[dict],
    summary="Subscribe to a plan"
)
async def subscribe(
    payload: SubscribeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Subscribe user to a plan (deducts from wallet/triggers payment in full impl)."""
    plan = next((p for p in MOCK_PLANS if p["id"] == payload.plan_id), None)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    return APIResponse(
        message=f"Successfully subscribed to {plan['name']}",
        data={"plan": plan, "expires_in_days": plan['duration_days']}
    )
