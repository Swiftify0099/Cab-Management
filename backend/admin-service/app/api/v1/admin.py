"""
Admin API  Phase 9. All admin endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from common.database import get_db
from common.middleware.auth import get_current_user, AuthenticatedUser, require_role
from common.schemas.base import SuccessResponse
from app.services.dashboard_service import AdminDashboardService

router = APIRouter(dependencies=[Depends(require_role("admin"))])


#  Dashboard 

@router.get("/admin/dashboard", response_model=SuccessResponse, summary="Admin dashboard KPIs")
async def dashboard(db: AsyncSession = Depends(get_db)):
    svc = AdminDashboardService(db)
    stats = await svc.get_dashboard_stats()
    return SuccessResponse(success=True, message="OK", data=stats)


@router.get("/admin/analytics/revenue", response_model=SuccessResponse, summary="Daily revenue chart")
async def revenue_chart(days: int = 30, db: AsyncSession = Depends(get_db)):
    svc = AdminDashboardService(db)
    data = await svc.get_revenue_chart(days=min(days, 365))
    return SuccessResponse(success=True, message="OK", data=data)


#  Fleet Map 

@router.get("/admin/fleet/online-drivers", response_model=SuccessResponse, summary="Live fleet: all online drivers + GPS")
async def online_drivers(db: AsyncSession = Depends(get_db)):
    svc = AdminDashboardService(db)
    drivers = await svc.get_online_drivers()
    return SuccessResponse(success=True, message=f"{len(drivers)} online drivers", data=drivers)


#  Trips 

@router.get("/admin/trips", response_model=SuccessResponse, summary="All trips with filters")
async def list_trips(
    status: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    from common.models.all_models import Trip, TripStatus, Driver
    from sqlalchemy import select, or_, ilike

    query = (
        select(Trip)
        .order_by(Trip.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if status:
        query = query.where(Trip.status == TripStatus(status))
    if q:
        query = query.where(
            or_(Trip.pickup_city.ilike(f"%{q}%"), Trip.destination_city.ilike(f"%{q}%"))
        )
    result = await db.execute(query)
    trips = result.scalars().all()
    return SuccessResponse(success=True, message="OK", data=[
        {
            "id": str(t.id),
            "pickup_city": t.pickup_city,
            "destination_city": t.destination_city,
            "status": t.status.value,
            "departure_time": t.departure_time.isoformat(),
            "total_seats": t.total_seats,
            "available_seats": t.available_seats,
            "base_fare": float(t.base_fare),
            "distance_km": t.distance_km,
            "driver_id": str(t.driver_id) if t.driver_id else None,
        }
        for t in trips
    ])


@router.post("/admin/trips/{trip_id}/cancel", response_model=SuccessResponse, summary="Admin cancel a trip")
async def cancel_trip(trip_id: str, db: AsyncSession = Depends(get_db)):
    from common.models.all_models import Trip, TripStatus
    from sqlalchemy import select
    from uuid import UUID

    result = await db.execute(select(Trip).where(Trip.id == UUID(trip_id)))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip.status = TripStatus.CANCELLED
    await db.commit()
    return SuccessResponse(success=True, message="Trip cancelled", data={"trip_id": trip_id})


#  Parcels 

@router.get("/admin/parcels", response_model=SuccessResponse, summary="All parcels with filters")
async def list_parcels(
    status: Optional[str] = None,
    page: int = 1,
    db: AsyncSession = Depends(get_db),
):
    from common.models.all_models import Parcel, ParcelStatus
    from sqlalchemy import select

    query = (
        select(Parcel)
        .order_by(Parcel.created_at.desc())
        .offset((page - 1) * 20)
        .limit(20)
    )
    if status:
        query = query.where(Parcel.status == ParcelStatus(status))
    result = await db.execute(query)
    parcels = result.scalars().all()
    return SuccessResponse(success=True, message="OK", data=[
        {
            "id": str(p.id),
            "tracking_number": p.tracking_number,
            "status": p.status.value,
            "sender_name": p.sender_name,
            "receiver_name": p.receiver_name,
            "receiver_address": p.receiver_address,
            "weight_kg": p.weight_kg,
            "fare": float(p.fare),
            "is_fragile": p.is_fragile,
            "is_urgent": p.is_urgent,
            "created_at": p.created_at.isoformat(),
        }
        for p in parcels
    ])


#  KYC 

@router.get("/admin/kyc", response_model=SuccessResponse, summary="Pending KYC documents")
async def kyc_queue(page: int = 1, db: AsyncSession = Depends(get_db)):
    svc = AdminDashboardService(db)
    docs = await svc.get_kyc_queue(page=page)
    return SuccessResponse(success=True, message="OK", data=docs)


class KYCDecisionRequest(BaseModel):
    approved: bool
    notes: str = ""


@router.post("/admin/kyc/{doc_id}/decision", response_model=SuccessResponse, summary="Approve/reject KYC document")
async def kyc_decision(
    doc_id: str, request: KYCDecisionRequest, db: AsyncSession = Depends(get_db)
):
    svc = AdminDashboardService(db)
    try:
        result = await svc.approve_kyc(doc_id, request.approved, request.notes)
        return SuccessResponse(success=True, message=f"KYC {'approved' if request.approved else 'rejected'}", data=result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


#  Complaints 

@router.get("/admin/complaints", response_model=SuccessResponse, summary="Support complaints")
async def complaints(
    status: Optional[str] = None,
    page: int = 1,
    db: AsyncSession = Depends(get_db),
):
    svc = AdminDashboardService(db)
    data = await svc.get_complaints(status=status, page=page)
    return SuccessResponse(success=True, message="OK", data=data)


#  Customers / Drivers 

@router.get("/admin/customers", response_model=SuccessResponse, summary="List customers")
async def list_customers(
    q: Optional[str] = None,
    page: int = 1,
    db: AsyncSession = Depends(get_db),
):
    from common.models.all_models import Customer
    from sqlalchemy import select, or_

    query = select(Customer).order_by(Customer.created_at.desc()).offset((page - 1) * 20).limit(20)
    if q:
        query = query.where(or_(Customer.full_name.ilike(f"%{q}%"), Customer.phone.ilike(f"%{q}%")))
    result = await db.execute(query)
    customers = result.scalars().all()
    return SuccessResponse(success=True, message="OK", data=[
        {
            "id": str(c.id),
            "full_name": c.full_name,
            "phone": c.phone,
            "email": c.email,
            "is_active": c.is_active,
            "wallet_balance": float(c.wallet_balance or 0),
            "reward_points": c.reward_points or 0,
            "created_at": c.created_at.isoformat(),
        }
        for c in customers
    ])


@router.get("/admin/drivers", response_model=SuccessResponse, summary="List drivers")
async def list_drivers(
    q: Optional[str] = None,
    is_online: Optional[bool] = None,
    page: int = 1,
    db: AsyncSession = Depends(get_db),
):
    from common.models.all_models import Driver
    from sqlalchemy import select, or_

    query = select(Driver).order_by(Driver.created_at.desc()).offset((page - 1) * 20).limit(20)
    if q:
        query = query.where(or_(Driver.full_name.ilike(f"%{q}%"), Driver.phone.ilike(f"%{q}%")))
    if is_online is not None:
        query = query.where(Driver.is_online == is_online)
    result = await db.execute(query)
    drivers = result.scalars().all()
    return SuccessResponse(success=True, message="OK", data=[
        {
            "id": str(d.id),
            "full_name": d.full_name,
            "phone": d.phone,
            "is_online": d.is_online,
            "is_verified": d.is_verified,
            "rating": float(d.rating or 0),
            "vehicle_type": d.vehicle_type,
            "total_trips": d.total_trips or 0,
            "created_at": d.created_at.isoformat(),
        }
        for d in drivers
    ])
