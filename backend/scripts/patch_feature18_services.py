"""
Script to create IncentivesPromotionsService with foreign key validation for ride_id.
"""
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

backend_root = r"C:\Users\panka\OneDrive\Desktop\CabBooking\backend"
services_dir = os.path.join(backend_root, "matching-service", "app", "services")

SERVICE_CODE = '''"""
Authoritative Incentives & Promotions Engine for Feature 18.
Handles dynamic campaigns, daily/weekly targets, ride milestones, peak-hour quests,
shift earnings guarantees, PostGIS geofenced zone bonuses, and driver referrals.
Integrates directly with the double-entry financial ledger (Feature 14) and wallet (Feature 15).
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select, func, and_, desc, update, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    IncentiveCampaign,
    DriverIncentiveProgress,
    DriverReferral,
    Driver,
    DriverEarningLedger,
    RideRequest,
    RideRequestStatus,
    User,
)


class IncentivesPromotionsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_driver_promotions_hub(self, driver_user_id: str) -> Dict[str, Any]:
        """
        Returns full opportunities and promotions hub data:
        - Active quests with progress & time remaining
        - Shift earnings guarantee status
        - Completed / earned rewards
        - Potential extra earnings total
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        now = datetime.now(timezone.utc)

        # 1. Fetch active campaigns
        camp_res = await self.db.execute(
            select(IncentiveCampaign)
            .where(
                and_(
                    IncentiveCampaign.is_active == True,
                    IncentiveCampaign.end_time > now,
                )
            )
            .order_by(IncentiveCampaign.start_time.asc())
        )
        campaigns = camp_res.scalars().all()

        # If no active campaigns in DB, seed standard baseline campaigns for today
        if not campaigns:
            await self._seed_default_campaigns()
            camp_res = await self.db.execute(
                select(IncentiveCampaign)
                .where(
                    and_(
                        IncentiveCampaign.is_active == True,
                        IncentiveCampaign.end_time > now,
                    )
                )
                .order_by(IncentiveCampaign.start_time.asc())
            )
            campaigns = camp_res.scalars().all()

        # 2. Fetch driver progress records
        prog_res = await self.db.execute(
            select(DriverIncentiveProgress)
            .where(DriverIncentiveProgress.driver_id == driver.id)
        )
        progress_map = {p.campaign_id: p for p in prog_res.scalars().all()}

        active_quests = []
        completed_quests = []
        guarantee_card = None
        potential_bonus_total = Decimal("0.00")

        for camp in campaigns:
            prog = progress_map.get(camp.id)
            curr_prog = prog.current_progress if prog else 0
            curr_earnings = prog.current_actual_earnings if prog else Decimal("0.00")
            status = prog.status if prog else "ACTIVE"

            time_remaining_sec = max(int((camp.end_time - now).total_seconds()), 0)
            hours_left = time_remaining_sec // 3600
            mins_left = (time_remaining_sec % 3600) // 60
            time_left_str = f"{hours_left}h {mins_left}m left" if hours_left > 0 else f"{mins_left}m left"

            pct = min(round((curr_prog / camp.target_count) * 100), 100) if camp.target_count > 0 else 0

            # Special Handling for Guaranteed Earnings
            if camp.campaign_type == "GUARANTEED_EARNINGS":
                guaranteed_amt = camp.guaranteed_amount or Decimal("1500.00")
                potential_topup = max(guaranteed_amt - curr_earnings, Decimal("0.00"))
                guarantee_card = {
                    "campaign_id": str(camp.id),
                    "title": camp.title,
                    "description": camp.description,
                    "guaranteed_amount": float(guaranteed_amt),
                    "current_actual_earnings": float(curr_earnings),
                    "potential_topup": float(potential_topup),
                    "current_progress": curr_prog,
                    "target_count": camp.target_count,
                    "percentage": pct,
                    "status": status,
                    "time_remaining_str": time_left_str,
                    "is_completed": curr_prog >= camp.target_count,
                }
                potential_bonus_total += potential_topup
                continue

            quest_item = {
                "campaign_id": str(camp.id),
                "title": camp.title,
                "description": camp.description,
                "campaign_type": camp.campaign_type,
                "reward_amount": float(camp.reward_amount),
                "current_progress": curr_prog,
                "target_count": camp.target_count,
                "percentage": pct,
                "status": status,
                "time_remaining_str": time_left_str,
                "zone_name": camp.zone_name,
                "is_completed": status in ["COMPLETED", "EARNED"],
                "earned_at": prog.earned_at.isoformat() if prog and prog.earned_at else None,
            }

            if status in ["COMPLETED", "EARNED"]:
                completed_quests.append(quest_item)
            else:
                active_quests.append(quest_item)
                potential_bonus_total += camp.reward_amount

        # 3. Referral summary
        ref_summary = await self.get_referral_summary(driver_user_id)

        return {
            "potential_bonus_total": float(potential_bonus_total),
            "active_quests_count": len(active_quests),
            "completed_quests_count": len(completed_quests),
            "active_quests": active_quests,
            "completed_quests": completed_quests,
            "guarantee_card": guarantee_card,
            "referral_summary": ref_summary,
        }

    async def record_ride_completion_incentive(
        self,
        driver_id: uuid.UUID,
        ride_id: Optional[uuid.UUID],
        fare_amount: Decimal,
        is_zone_match: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Server-authoritative trigger called upon ride completion.
        Updates matching campaign progress and automatically settles completed rewards
        into the driver double-entry financial ledger.
        """
        now = datetime.now(timezone.utc)

        # Validate ride exists in DB if passed to avoid FK failure
        valid_ride_id = None
        if ride_id:
            r_chk = await self.db.execute(select(RideRequest.id).where(RideRequest.id == ride_id))
            if r_chk.scalar_one_or_none():
                valid_ride_id = ride_id

        camp_res = await self.db.execute(
            select(IncentiveCampaign)
            .where(
                and_(
                    IncentiveCampaign.is_active == True,
                    IncentiveCampaign.start_time <= now,
                    IncentiveCampaign.end_time >= now,
                )
            )
        )
        campaigns = camp_res.scalars().all()
        awarded_bonuses = []

        for camp in campaigns:
            # Zone filter
            if camp.campaign_type == "ZONE_INCENTIVE" and not is_zone_match:
                continue

            # Load or create driver progress
            prog_res = await self.db.execute(
                select(DriverIncentiveProgress)
                .where(
                    and_(
                        DriverIncentiveProgress.driver_id == driver_id,
                        DriverIncentiveProgress.campaign_id == camp.id,
                    )
                )
            )
            prog = prog_res.scalar_one_or_none()

            if not prog:
                prog = DriverIncentiveProgress(
                    id=uuid.uuid4(),
                    driver_id=driver_id,
                    campaign_id=camp.id,
                    current_progress=1,
                    target_count=camp.target_count,
                    current_actual_earnings=fare_amount,
                    reward_amount=camp.reward_amount,
                    status="ACTIVE",
                )
                self.db.add(prog)
            else:
                if prog.status in ["COMPLETED", "EARNED", "EXPIRED"]:
                    continue  # Already finished
                prog.current_progress += 1
                prog.current_actual_earnings += fare_amount

            # Check if milestone achieved
            if prog.current_progress >= camp.target_count:
                prog.status = "EARNED"
                prog.completed_at = now
                prog.earned_at = now

                # Calculate reward amount (Top-up for guarantee vs fixed for target)
                if camp.campaign_type == "GUARANTEED_EARNINGS":
                    guarantee = camp.guaranteed_amount or Decimal("1500.00")
                    credit_amt = max(guarantee - prog.current_actual_earnings, Decimal("0.00"))
                else:
                    credit_amt = camp.reward_amount

                if credit_amt > 0:
                    # Post double-entry ledger credit (Feature 14 & 15 integration)
                    ledger_entry = DriverEarningLedger(
                        id=uuid.uuid4(),
                        driver_id=driver_id,
                        ride_id=valid_ride_id,
                        entry_type="INCENTIVE",
                        amount=credit_amt,
                        description=f"Incentive Reward: {camp.title}",
                        created_at=now,
                    )
                    self.db.add(ledger_entry)
                    prog.ledger_entry_id = ledger_entry.id

                    # Update driver wallet balance
                    await self.db.execute(
                        update(Driver)
                        .where(Driver.id == driver_id)
                        .values(
                            wallet_balance=Driver.wallet_balance + credit_amt,
                            total_earnings=Driver.total_earnings + credit_amt,
                        )
                    )

                    awarded_bonuses.append({
                        "campaign_id": str(camp.id),
                        "title": camp.title,
                        "reward_amount": float(credit_amt),
                    })

        # Also evaluate driver referrals milestone
        ref_res = await self.db.execute(
            select(DriverReferral)
            .where(
                and_(
                    DriverReferral.referred_driver_id == driver_id,
                    DriverReferral.status == "PENDING",
                )
            )
        )
        referral = ref_res.scalar_one_or_none()
        if referral:
            referral.completed_rides += 1
            if referral.completed_rides >= referral.required_rides:
                referral.status = "REWARDED"
                referral.rewarded_at = now

                # Credit referrer driver ledger
                ref_ledger = DriverEarningLedger(
                    id=uuid.uuid4(),
                    driver_id=referral.referrer_driver_id,
                    ride_id=None,
                    entry_type="BONUS",
                    amount=referral.reward_amount,
                    description=f"Referral Bonus: Partner completed {referral.required_rides} rides",
                    created_at=now,
                )
                self.db.add(ref_ledger)
                await self.db.execute(
                    update(Driver)
                    .where(Driver.id == referral.referrer_driver_id)
                    .values(
                        wallet_balance=Driver.wallet_balance + referral.reward_amount,
                        total_earnings=Driver.total_earnings + referral.reward_amount,
                    )
                )

        await self.db.commit()
        return awarded_bonuses

    async def get_referral_summary(self, driver_user_id: str) -> Dict[str, Any]:
        """
        Returns referral program details, referral code, invited drivers list, and total bonuses.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        ref_code = driver.referral_code or f"DRV{str(driver.id).replace('-', '')[:6].upper()}"

        refs_res = await self.db.execute(
            select(DriverReferral, Driver)
            .join(Driver, DriverReferral.referred_driver_id == Driver.id)
            .where(DriverReferral.referrer_driver_id == driver.id)
            .order_by(desc(DriverReferral.created_at))
        )
        rows = refs_res.all()

        invited_list = []
        total_earned = Decimal("0.00")

        for ref_record, ref_driver in rows:
            masked_phone = f"+91 •••• ••{ref_driver.phone[-2:]}" if ref_driver.phone else "Partner"
            name_parts = (ref_driver.full_name or "Driver Partner").split()
            masked_name = f"{name_parts[0]} {name_parts[1][0]}." if len(name_parts) > 1 else name_parts[0]

            if ref_record.status == "REWARDED":
                total_earned += ref_record.reward_amount

            invited_list.append({
                "referral_id": str(ref_record.id),
                "name": masked_name,
                "phone_masked": masked_phone,
                "completed_rides": ref_record.completed_rides,
                "required_rides": ref_record.required_rides,
                "reward_amount": float(ref_record.reward_amount),
                "status": ref_record.status,
                "is_rewarded": ref_record.status == "REWARDED",
            })

        return {
            "referral_code": ref_code,
            "reward_per_referral": 1000.00,
            "required_rides": 25,
            "invited_count": len(invited_list),
            "rewarded_count": len([i for i in invited_list if i["is_rewarded"]]),
            "total_referral_earnings": float(total_earned),
            "invited_drivers": invited_list,
        }

    async def simulate_incentives_dev_mode(
        self,
        driver_user_id: str,
        scenario: str,
    ) -> Dict[str, Any]:
        """
        Developer Mode Sandbox simulator for testing all incentive states and edge cases.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        now = datetime.now(timezone.utc)
        hub_data = await self.get_driver_promotions_hub(driver_user_id)

        if scenario == "PROGRESS_DAILY_QUEST":
            # Increment daily quest
            active_q = next((q for q in hub_data["active_quests"] if q["campaign_type"] == "DAILY_TARGET"), None)
            if active_q:
                await self.record_ride_completion_incentive(
                    driver_id=driver.id,
                    ride_id=None,
                    fare_amount=Decimal("150.00"),
                )
        elif scenario == "COMPLETE_DAILY_QUEST":
            # Complete 10 rides on daily quest
            active_q = next((q for q in hub_data["active_quests"] if q["campaign_type"] == "DAILY_TARGET"), None)
            if active_q:
                camp_id = uuid.UUID(active_q["campaign_id"])
                p_res = await self.db.execute(
                    select(DriverIncentiveProgress).where(
                        and_(
                            DriverIncentiveProgress.driver_id == driver.id,
                            DriverIncentiveProgress.campaign_id == camp_id,
                        )
                    )
                )
                prog = p_res.scalar_one_or_none()
                if not prog:
                    prog = DriverIncentiveProgress(
                        id=uuid.uuid4(),
                        driver_id=driver.id,
                        campaign_id=camp_id,
                        current_progress=10,
                        target_count=10,
                        reward_amount=Decimal("500.00"),
                        status="EARNED",
                        completed_at=now,
                        earned_at=now,
                    )
                    self.db.add(prog)
                else:
                    prog.current_progress = prog.target_count
                    prog.status = "EARNED"
                    prog.completed_at = now
                    prog.earned_at = now
                await self.db.commit()
        elif scenario == "TRIGGER_GUARANTEE_TOPUP":
            # Set guarantee progress to 8/8 with ₹1,120 net fare -> ₹380 topup
            g_card = hub_data.get("guarantee_card")
            if g_card:
                camp_id = uuid.UUID(g_card["campaign_id"])
                p_res = await self.db.execute(
                    select(DriverIncentiveProgress).where(
                        and_(
                            DriverIncentiveProgress.driver_id == driver.id,
                            DriverIncentiveProgress.campaign_id == camp_id,
                        )
                    )
                )
                prog = p_res.scalar_one_or_none()
                if not prog:
                    prog = DriverIncentiveProgress(
                        id=uuid.uuid4(),
                        driver_id=driver.id,
                        campaign_id=camp_id,
                        current_progress=8,
                        target_count=8,
                        current_actual_earnings=Decimal("1120.00"),
                        reward_amount=Decimal("380.00"),
                        status="EARNED",
                        completed_at=now,
                        earned_at=now,
                    )
                    self.db.add(prog)
                else:
                    prog.current_progress = 8
                    prog.current_actual_earnings = Decimal("1120.00")
                    prog.status = "EARNED"
                    prog.completed_at = now
                    prog.earned_at = now
                await self.db.commit()
        elif scenario == "SIMULATE_REFERRAL_QUALIFIED":
            # Add referred driver with 25 completed rides
            sub_d_user = User(
                id=uuid.uuid4(),
                phone=f"+9198{str(uuid.uuid4().int)[:8]}",
                role="DRIVER",
                is_verified=True,
                is_active=True,
            )
            self.db.add(sub_d_user)
            sub_d = Driver(
                id=uuid.uuid4(),
                user_id=sub_d_user.id,
                full_name="Vikram More",
                phone=sub_d_user.phone,
                rating=4.9,
                total_trips=25,
            )
            self.db.add(sub_d)
            await self.db.flush()

            ref = DriverReferral(
                id=uuid.uuid4(),
                referrer_driver_id=driver.id,
                referred_driver_id=sub_d.id,
                referral_code_used=driver.referral_code or "PROMO2026",
                required_rides=25,
                completed_rides=25,
                reward_amount=Decimal("1000.00"),
                status="REWARDED",
                rewarded_at=now,
            )
            self.db.add(ref)
            await self.db.commit()
        elif scenario == "RESET_DEFAULTS":
            # Clean progress
            await self.db.execute(
                update(DriverIncentiveProgress)
                .where(DriverIncentiveProgress.driver_id == driver.id)
                .values(current_progress=0, status="ACTIVE", completed_at=None, earned_at=None)
            )
            await self.db.commit()

        updated_hub = await self.get_driver_promotions_hub(driver_user_id)
        return {
            "success": True,
            "scenario": scenario,
            "hub": updated_hub,
            "message": f"Dev scenario '{scenario}' applied successfully.",
        }

    async def _seed_default_campaigns(self):
        """Seeds standard baseline campaigns if none exist."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        week_end = today_start + timedelta(days=7)

        c1 = IncentiveCampaign(
            id=uuid.uuid4(),
            title="Daily Target: Complete 10 Rides Today",
            description="Complete 10 eligible trips across any category before 11:59 PM.",
            campaign_type="DAILY_TARGET",
            target_count=10,
            reward_amount=Decimal("500.00"),
            start_time=today_start,
            end_time=today_end,
            is_active=True,
        )
        c2 = IncentiveCampaign(
            id=uuid.uuid4(),
            title="Special Zone: Hinjawadi IT Park Rush",
            description="Complete 4 pickups originating from Hinjawadi IT Park Zone between 5:00 PM and 9:00 PM.",
            campaign_type="ZONE_INCENTIVE",
            target_count=4,
            reward_amount=Decimal("300.00"),
            zone_name="Hinjawadi IT Park Zone",
            start_time=today_start,
            end_time=today_end,
            is_active=True,
        )
        c3 = IncentiveCampaign(
            id=uuid.uuid4(),
            title="Shift Guarantee: ₹1,500 Minimum Net Earnings",
            description="Complete 8 trips in your 8-hour shift. If net fares are below ₹1,500, we top up the difference.",
            campaign_type="GUARANTEED_EARNINGS",
            target_count=8,
            reward_amount=Decimal("0.00"),
            guaranteed_amount=Decimal("1500.00"),
            start_time=today_start,
            end_time=today_end,
            is_active=True,
        )
        c4 = IncentiveCampaign(
            id=uuid.uuid4(),
            title="Weekly Target: Complete 50 Rides This Week",
            description="Reach 50 completed rides by Sunday midnight to unlock ₹2,000 extra bonus.",
            campaign_type="WEEKLY_TARGET",
            target_count=50,
            reward_amount=Decimal("2000.00"),
            start_time=today_start,
            end_time=week_end,
            is_active=True,
        )

        self.db.add_all([c1, c2, c3, c4])
        await self.db.commit()
'''

service_file = os.path.join(services_dir, "incentives_promotions_service.py")
with open(service_file, "w", encoding="utf-8") as f:
    f.write(SERVICE_CODE)
print(f"✓ Updated {service_file} with foreign key validation")
