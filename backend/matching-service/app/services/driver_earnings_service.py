"""
Feature 14: Driver Earnings & Double-Entry Ledger Service
Today/Weekly/Monthly financial reconciliation, ledger journaling, tips,
incentives, bonuses, and payout balance intelligence.
"""
import uuid
import json
import asyncio
from datetime import datetime, timedelta, date
from typing import Optional, Dict, Any, List
from decimal import Decimal
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from common.models.all_models import (
    User, Driver, RideRequest, RideReceipt, DriverEarningLedger,
    DriverSettlement
)


class DriverEarningsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_earnings_summary(
        self,
        driver_user_id: str,
        period: str = "today"
    ) -> Dict[str, Any]:
        """
        Reconciles double-entry ledger summaries for Today, Week, or Month.
        Calculates Net Earnings, Completed Trips, Online Hours, Earning/Hour,
        Cash vs Online split, and Available Payout Balance.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        today = date.today()
        if period == "week":
            start_date = today - timedelta(days=today.weekday())  # Monday of current week
        elif period == "month":
            start_date = today.replace(day=1)
        else:
            start_date = today

        # 1. Total Net Trip Earnings from Ledger
        net_res = await self.db.execute(
            select(func.coalesce(func.sum(DriverEarningLedger.amount), Decimal("0.00")))
            .where(
                and_(
                    DriverEarningLedger.driver_id == driver.id,
                    DriverEarningLedger.entry_type.in_(["TRIP_EARNING", "TIP", "INCENTIVE", "BONUS"]),
                    DriverEarningLedger.effective_date >= start_date,
                    DriverEarningLedger.direction == "CREDIT"
                )
            )
        )
        total_net = float(net_res.scalar() or Decimal("0.00"))

        # 2. Trip Count in Period
        trips_res = await self.db.execute(
            select(func.count(DriverEarningLedger.id))
            .where(
                and_(
                    DriverEarningLedger.driver_id == driver.id,
                    DriverEarningLedger.entry_type == "TRIP_EARNING",
                    DriverEarningLedger.effective_date >= start_date,
                )
            )
        )
        trip_count = int(trips_res.scalar() or 0)

        # 3. Cash Collected in Period
        cash_res = await self.db.execute(
            select(func.coalesce(func.sum(DriverEarningLedger.amount), Decimal("0.00")))
            .where(
                and_(
                    DriverEarningLedger.driver_id == driver.id,
                    DriverEarningLedger.entry_type == "CASH_COLLECTED",
                    DriverEarningLedger.effective_date >= start_date,
                )
            )
        )
        cash_collected = float(cash_res.scalar() or Decimal("0.00"))

        # 4. Tips in Period
        tips_res = await self.db.execute(
            select(func.coalesce(func.sum(DriverEarningLedger.amount), Decimal("0.00")))
            .where(
                and_(
                    DriverEarningLedger.driver_id == driver.id,
                    DriverEarningLedger.entry_type == "TIP",
                    DriverEarningLedger.effective_date >= start_date,
                )
            )
        )
        tips_total = float(tips_res.scalar() or Decimal("0.00"))

        # Online Earnings = Net Trip Earnings from non-cash or overall net
        online_earnings = max(round(total_net - (cash_collected * 0.8), 2), 0.0)

        # Online time simulation (or based on active shift)
        online_hours = max(round(trip_count * 0.75, 1), 1.0) if trip_count > 0 else 0.0
        earning_per_hour = round(total_net / online_hours, 2) if online_hours > 0 else 0.0

        # Weekly Daily Bars (Mon - Sun)
        daily_breakdown = []
        if period == "week":
            mon = today - timedelta(days=today.weekday())
            for i in range(7):
                d = mon + timedelta(days=i)
                d_sum = await self.db.execute(
                    select(func.coalesce(func.sum(DriverEarningLedger.amount), Decimal("0.00")))
                    .where(
                        and_(
                            DriverEarningLedger.driver_id == driver.id,
                            DriverEarningLedger.entry_type.in_(["TRIP_EARNING", "TIP", "INCENTIVE", "BONUS"]),
                            DriverEarningLedger.effective_date == d,
                            DriverEarningLedger.direction == "CREDIT"
                        )
                    )
                )
                amt = float(d_sum.scalar() or 0.0)
                daily_breakdown.append({
                    "day": d.strftime("%a"),
                    "date": d.strftime("%d %b"),
                    "amount": amt,
                    "is_today": d == today,
                })

        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "total_net_earnings": total_net,
            "trip_count": trip_count,
            "cash_collected": cash_collected,
            "online_earnings": online_earnings,
            "tips_total": tips_total,
            "online_hours": online_hours,
            "earning_per_hour": earning_per_hour,
            "available_wallet_balance": float(driver.wallet_balance or Decimal("0.00")),
            "daily_breakdown": daily_breakdown,
        }

    async def get_ledger_history(
        self,
        driver_user_id: str,
        limit: int = 30
    ) -> List[Dict[str, Any]]:
        """Returns paginated immutable financial ledger entries."""
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        entries_res = await self.db.execute(
            select(DriverEarningLedger)
            .where(DriverEarningLedger.driver_id == driver.id)
            .order_by(desc(DriverEarningLedger.created_at))
            .limit(limit)
        )
        entries = entries_res.scalars().all()

        return [
            {
                "id": str(e.id),
                "ride_id": str(e.ride_id) if e.ride_id else None,
                "entry_type": e.entry_type,
                "amount": float(e.amount),
                "currency": e.currency,
                "direction": e.direction,
                "status": e.status,
                "description": e.description,
                "effective_date": e.effective_date.isoformat(),
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]

    async def add_tip(
        self,
        ride_id: uuid.UUID,
        tip_amount: float
    ) -> Dict[str, Any]:
        """Credits customer tip to driver's balance and posts ledger entry."""
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride or not ride.assigned_driver_id:
            raise HTTPException(status_code=404, detail="Ride not found")

        tip_dec = Decimal(str(round(tip_amount, 2)))
        ride.tip_amount = (ride.tip_amount or Decimal("0.00")) + tip_dec

        # Update receipt
        rec_res = await self.db.execute(select(RideReceipt).where(RideReceipt.ride_id == ride.id))
        receipt = rec_res.scalar_one_or_none()
        if receipt:
            receipt.tip_amount = ride.tip_amount
            receipt.driver_net_earning += tip_dec

        # Post Ledger Tip Entry
        ledger_tip = DriverEarningLedger(
            id=uuid.uuid4(),
            driver_id=ride.assigned_driver_id,
            ride_id=ride.id,
            entry_type="TIP",
            amount=tip_dec,
            currency="INR",
            direction="CREDIT",
            status="SETTLED",
            description=f"Passenger Tip for Trip #{ride.id.hex[:6].upper()}",
            effective_date=date.today(),
        )
        self.db.add(ledger_tip)

        # Credit driver balance
        d_res = await self.db.execute(select(Driver).where(Driver.id == ride.assigned_driver_id))
        driver = d_res.scalar_one_or_none()
        if driver:
            driver.total_earnings = (driver.total_earnings or Decimal("0.00")) + tip_dec
            driver.wallet_balance = (driver.wallet_balance or Decimal("0.00")) + tip_dec

        await self.db.commit()

        return {
            "success": True,
            "ride_id": str(ride.id),
            "tip_added": float(tip_dec),
            "total_tips": float(ride.tip_amount),
            "message": f"₹{tip_amount:.2f} tip credited to driver successfully.",
        }
