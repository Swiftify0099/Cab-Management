"""
Admin API  Phase 9. All admin endpoints.
"""
from typing import Optional
from datetime import datetime
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


@router.get("/admin/finance/transactions", response_model=SuccessResponse, summary="Get all financial transactions")
async def get_finance_transactions(
    page: int = 1,
    db: AsyncSession = Depends(get_db)
):
    from common.models.all_models import Transaction, WalletTransaction, LedgerType
    from sqlalchemy import select, union_all
    
    # We can fetch recent Transactions and WalletTransactions
    # For now, just return transactions
    query = select(Transaction).order_by(Transaction.created_at.desc()).offset((page - 1) * 50).limit(50)
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    data = [
        {
            "id": str(t.id),
            "type": "booking" if t.ledger_type == LedgerType.BOOKING else "settlement",
            "description": f"Transaction for {t.ledger_type.value}",
            "amount": float(t.amount),
            "status": t.status.value,
            "user": str(t.user_id),
            "created_at": t.created_at.isoformat()
        }
        for t in transactions
    ]
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
        query = query.where(Trip.status == TripStatus(q))
    result = await db.execute(query)
    trips = result.scalars().all()
    return SuccessResponse(success=True, message="OK", data=[
        {
            "id": str(t.id),
            "pickup_lat": t.pickup_latitude,
            "destination_lat": t.destination_latitude,
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

# ============================================================
# SUPPORT TICKETS (ADMIN VIEW)
# ============================================================

@router.get("/admin/support/tickets", response_model=SuccessResponse, summary="List all support tickets")
async def admin_list_tickets(
    status: Optional[str] = None,
    page: int = 1,
    db: AsyncSession = Depends(get_db)
):
    from common.models.all_models import SupportTicket, TicketStatus
    from sqlalchemy import select

    query = select(SupportTicket).order_by(SupportTicket.created_at.desc()).offset((page - 1) * 20).limit(20)
    if status:
        query = query.where(SupportTicket.status == TicketStatus(status))
        
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    return SuccessResponse(success=True, message="OK", data=[
        {
            "id": str(t.id),
            "user_id": str(t.user_id),
            "booking_id": str(t.booking_id) if t.booking_id else None,
            "complaint_type": t.complaint_type.value,
            "subject": t.subject,
            "description": t.description,
            "status": t.status.value,
            "created_at": t.created_at.isoformat(),
            "resolution": t.resolution
        }
        for t in tickets
    ])

class ResolveTicketRequest(BaseModel):
    resolution: str

@router.post("/admin/support/tickets/{ticket_id}/resolve", response_model=SuccessResponse, summary="Resolve a ticket")
async def admin_resolve_ticket(
    ticket_id: str,
    payload: ResolveTicketRequest,
    db: AsyncSession = Depends(get_db)
):
    from common.models.all_models import SupportTicket, TicketStatus
    from sqlalchemy import select
    from uuid import UUID
    from datetime import datetime, timezone

    result = await db.execute(select(SupportTicket).where(SupportTicket.id == UUID(ticket_id)))
    ticket = result.scalar_one_or_none()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket.status = TicketStatus.RESOLVED if hasattr(TicketStatus, 'RESOLVED') else TicketStatus.COMPLETED
    ticket.resolution = payload.resolution
    ticket.resolved_at = datetime.now(timezone.utc)
    
    await db.commit()
    return SuccessResponse(success=True, message="Ticket resolved", data={"ticket_id": str(ticket.id)})


@router.post("/admin/customers/{customer_id}/{action}", response_model=SuccessResponse, summary="Block/unblock customer")
async def customer_action(customer_id: str, action: str, db: AsyncSession = Depends(get_db)):
    from common.models.all_models import User
    from sqlalchemy import select
    from uuid import UUID

    result = await db.execute(select(User).where(User.id == UUID(customer_id)))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if action == "block":
        customer.is_active = False
    elif action == "unblock":
        customer.is_active = True
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await db.commit()
    return SuccessResponse(success=True, message=f"Customer {action}ed", data={"customer_id": customer_id})

# ============================================================
# PROMOTIONS & COUPONS (ADMIN)
# ============================================================

class CreateCouponRequest(BaseModel):
    code: str
    description: str
    coupon_type: str
    discount_value: float
    min_trip_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    end_date: datetime
    usage_limit: Optional[int] = None

@router.get("/admin/coupons", response_model=SuccessResponse, summary="List all coupons")
async def admin_list_coupons(db: AsyncSession = Depends(get_db)):
    from common.models.all_models import Coupon
    from sqlalchemy import select

    result = await db.execute(select(Coupon).order_by(Coupon.created_at.desc()))
    coupons = result.scalars().all()
    
    return SuccessResponse(success=True, message="OK", data=[
        {
            "id": str(c.id),
            "code": c.code,
            "description": c.description,
            "coupon_type": c.coupon_type.value,
            "discount_value": c.discount_value,
            "min_trip_amount": c.min_trip_amount,
            "max_discount_amount": c.max_discount_amount,
            "start_date": c.start_date.isoformat(),
            "end_date": c.end_date.isoformat(),
            "is_active": c.is_active,
            "usage_limit": c.usage_limit,
            "times_used": c.times_used
        }
        for c in coupons
    ])

@router.post("/admin/coupons", response_model=SuccessResponse, summary="Create a new coupon")
async def admin_create_coupon(payload: CreateCouponRequest, db: AsyncSession = Depends(get_db)):
    from common.models.all_models import Coupon, CouponType
    from sqlalchemy import select

    # Check if code exists
    existing = await db.execute(select(Coupon).where(Coupon.code == payload.code.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    new_coupon = Coupon(
        code=payload.code.upper(),
        description=payload.description,
        coupon_type=CouponType(payload.coupon_type),
        discount_value=payload.discount_value,
        min_trip_amount=payload.min_trip_amount,
        max_discount_amount=payload.max_discount_amount,
        end_date=payload.end_date,
        usage_limit=payload.usage_limit
    )
    db.add(new_coupon)
    await db.commit()
    
    return SuccessResponse(success=True, message="Coupon created", data={"id": str(new_coupon.id)})

@router.post("/admin/coupons/{coupon_id}/toggle", response_model=SuccessResponse, summary="Toggle coupon active status")
async def admin_toggle_coupon(coupon_id: str, db: AsyncSession = Depends(get_db)):
    from common.models.all_models import Coupon
    from sqlalchemy import select
    from uuid import UUID

    result = await db.execute(select(Coupon).where(Coupon.id == UUID(coupon_id)))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    coupon.is_active = not coupon.is_active
    await db.commit()
    
    return SuccessResponse(success=True, message=f"Coupon {'activated' if coupon.is_active else 'deactivated'}")


@router.post("/admin/drivers/{driver_id}/{action}", response_model=SuccessResponse, summary="Approve/suspend/activate driver")
async def driver_action(driver_id: str, action: str, db: AsyncSession = Depends(get_db)):
    from common.models.all_models import Driver
    from sqlalchemy import select
    from uuid import UUID

    if action not in ["approve", "suspend", "activate"]:
        raise HTTPException(status_code=400, detail="Invalid action")

    result = await db.execute(select(Driver).where(Driver.id == UUID(driver_id)))
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if action == "approve":
        driver.is_verified = True
    elif action == "suspend":
        driver.is_active = False
    elif action == "activate":
        driver.is_active = True

    await db.commit()
    return SuccessResponse(success=True, message=f"Driver {action}d", data={"driver_id": driver_id})
