"""
Analytics API  Phase 9
Provides BI reports, revenue graphs, and system usage metrics for the Admin dashboard.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from common.database import get_db
from common.middleware.auth import AuthenticatedUser, get_current_admin
from common.schemas.response import APIResponse

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])

@router.get("/revenue-timeline", response_model=APIResponse[List[Dict[str, Any]]], summary="Get revenue timeline for charts")
async def get_revenue_timeline(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedUser = Depends(get_current_admin)
):
    """Mocked BI report for revenue timeline."""
    # In production, this runs a GROUP BY date query on trips table
    data = [
        {"date": "2026-05-20", "revenue": 14000, "commission": 1400},
        {"date": "2026-05-21", "revenue": 16500, "commission": 1650},
        {"date": "2026-05-22", "revenue": 15000, "commission": 1500},
        {"date": "2026-05-23", "revenue": 18000, "commission": 1800},
        {"date": "2026-05-24", "revenue": 19500, "commission": 1950},
        {"date": "2026-05-25", "revenue": 21000, "commission": 2100},
        {"date": "2026-05-26", "revenue": 22500, "commission": 2250},
    ]
    return APIResponse(message="Revenue timeline", data=data)


@router.get("/user-demographics", response_model=APIResponse[Dict[str, Any]], summary="Get user demographics")
async def get_user_demographics(
    db: AsyncSession = Depends(get_db),
    current_admin: AuthenticatedUser = Depends(get_current_admin)
):
    """Mocked BI report for user demographics."""
    data = {
        "cities": [
            {"name": "Pune", "users": 15000},
            {"name": "Mumbai", "users": 22000},
            {"name": "Bangalore", "users": 18000}
        ],
        "roles": {
            "customers": 45000,
            "drivers": 5000
        }
    }
    return APIResponse(message="User demographics", data=data)
