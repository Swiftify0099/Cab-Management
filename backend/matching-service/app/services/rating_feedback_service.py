"""
Authoritative Rating & Feedback Engine for Feature 17.
Handles two-way ratings, 1-5 star breakdown, structured compliments/complaints,
rating recalculation, 30-day rolling trend, low-rating alerts, and dispute workflows.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select, func, and_, desc, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    CustomerDriverRating,
    DriverCustomerRating,
    Driver,
    RideRequest,
    RideRequestStatus,
    User,
)

COMPLIMENT_CATALOG = {
    "CLEAN_VEHICLE": "Clean Vehicle",
    "SAFE_DRIVING": "Safe Driving",
    "PROFESSIONAL": "Professional & Polite",
    "SMOOTH_RIDE": "Smooth Ride",
    "GREAT_COMMUNICATION": "Great Communication",
    "PUNCTUAL": "Punctual Pickup",
    "HELPFUL": "Helpful with Luggage",
}

COMPLAINT_CATALOG = {
    "UNSAFE_DRIVING": "Unsafe Driving",
    "LATE_PICKUP": "Late Pickup",
    "POOR_COMMUNICATION": "Poor Communication",
    "VEHICLE_ISSUE": "Vehicle Condition Issue",
    "ROUTE_ISSUE": "Incorrect Route Taken",
    "BEHAVIOUR_ISSUE": "Unprofessional Behaviour",
    "OTHER": "Other Issue",
}


class RatingFeedbackService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def rate_driver(
        self,
        customer_user_id: str,
        ride_id: uuid.UUID,
        rating: int,
        compliments: List[str] = [],
        complaint_tags: List[str] = [],
        feedback: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Submits authoritative customer rating for the driver on completed ride.
        Enforces integer 1-5 star validation, participant auth, and updates driver rating.
        Atomic PostgreSQL UPSERT eliminates concurrency race conditions.
        """
        # Validate rating integer scale
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be an integer between 1 and 5 stars")

        # Load ride
        r_res = await self.db.execute(select(RideRequest).where(RideRequest.id == ride_id))
        ride = r_res.scalar_one_or_none()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride request not found")

        # Must be completed
        if ride.status != RideRequestStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Rating is only permitted for COMPLETED rides")

        # Customer auth check
        c_res = await self.db.execute(select(User).where(User.id == uuid.UUID(customer_user_id)))
        customer_user = c_res.scalar_one_or_none()
        if not customer_user or ride.customer_id != customer_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized: User did not participate in this ride")

        if not ride.assigned_driver_id:
            raise HTTPException(status_code=400, detail="No driver assigned to this ride")

        # Filter valid compliments / complaint tags
        valid_compliments = [c for c in compliments if c in COMPLIMENT_CATALOG]
        valid_complaints = [c for c in complaint_tags if c in COMPLAINT_CATALOG]

        # Atomic PostgreSQL UPSERT on ride_id unique constraint
        stmt = pg_insert(CustomerDriverRating).values(
            id=uuid.uuid4(),
            ride_id=ride.id,
            driver_id=ride.assigned_driver_id,
            customer_id=ride.customer_id,
            rating=rating,
            compliments=valid_compliments,
            complaint_tags=valid_complaints,
            feedback=feedback,
            status="APPROVED",
        ).on_conflict_do_update(
            index_elements=[CustomerDriverRating.ride_id],
            set_={
                "rating": rating,
                "compliments": valid_compliments,
                "complaint_tags": valid_complaints,
                "feedback": feedback,
                "updated_at": func.now(),
            }
        )
        await self.db.execute(stmt)
        await self.db.flush()

        # Recalculate driver's overall rating authoritatively
        driver_id = ride.assigned_driver_id
        avg_res = await self.db.execute(
            select(
                func.avg(CustomerDriverRating.rating),
                func.count(CustomerDriverRating.id)
            ).where(
                and_(
                    CustomerDriverRating.driver_id == driver_id,
                    CustomerDriverRating.status == "APPROVED"
                )
            )
        )
        avg_row = avg_res.one()
        raw_avg = float(avg_row[0]) if avg_row[0] is not None else 5.0
        total_count = int(avg_row[1]) if avg_row[1] is not None else 0
        new_rating = round(raw_avg, 2)

        # Update driver profile
        await self.db.execute(
            update(Driver)
            .where(Driver.id == driver_id)
            .values(rating=new_rating)
        )
        await self.db.commit()

        # Publish realtime event (non-blocking with 0.5s timeout)
        try:
            from common.utils.redis_client import get_redis
            import json, asyncio
            r = await get_redis()
            await asyncio.wait_for(
                r.publish(
                    f"driver:{driver_id}:events",
                    json.dumps({
                        "event": "rating:new_feedback",
                        "rating": rating,
                        "overall_rating": new_rating,
                        "total_ratings": total_count,
                        "compliments": valid_compliments,
                    })
                ),
                timeout=0.5
            )
        except Exception:
            pass

        return {
            "success": True,
            "ride_id": str(ride.id),
            "driver_id": str(driver_id),
            "rating": rating,
            "overall_rating": new_rating,
            "compliments": valid_compliments,
            "message": "Thank you! Driver rating submitted successfully.",
        }

    async def get_driver_ratings_summary(self, driver_user_id: str) -> Dict[str, Any]:
        """
        Calculates driver rating breakdown (5★-1★), rolling 30-day trend, top compliments,
        and low-rating alerts.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        # Fetch all approved ratings
        ratings_res = await self.db.execute(
            select(CustomerDriverRating)
            .where(
                and_(
                    CustomerDriverRating.driver_id == driver.id,
                    CustomerDriverRating.status == "APPROVED"
                )
            )
        )
        ratings = ratings_res.scalars().all()
        total_count = len(ratings)

        if total_count == 0:
            overall_r = float(driver.rating or 5.0)
            is_low_alert = overall_r < 4.70
            alert_msg = "Your average rating is lower than usual (below 4.70)." if is_low_alert else None
            tips = [
                "Ensure vehicle is clean and air conditioning is comfortable.",
                "Greet passengers politely and confirm pickup/drop destinations.",
            ] if is_low_alert else []

            return {
                "overall_rating": overall_r,
                "total_ratings": 0,
                "rating_trend": 0.0,
                "rating_trend_direction": "UP",
                "five_star_pct": 100,
                "breakdown": [
                    {"star": 5, "count": 0, "percentage": 100},
                    {"star": 4, "count": 0, "percentage": 0},
                    {"star": 3, "count": 0, "percentage": 0},
                    {"star": 2, "count": 0, "percentage": 0},
                    {"star": 1, "count": 0, "percentage": 0},
                ],
                "top_compliments": [],
                "standing": "EXCELLENT" if overall_r >= 4.85 else ("NEEDS_ATTENTION" if is_low_alert else "GOOD"),
                "standing_badge": "Top Rated Driver" if overall_r >= 4.85 else ("Action Required" if is_low_alert else "Standard Partner"),
                "is_low_rating_alert": is_low_alert,
                "alert_message": alert_msg,
                "improvement_tips": tips,
            }

        # Calculate star breakdown
        counts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        compliments_count: Dict[str, int] = {}
        now = datetime.now(timezone.utc)
        last_30_days_ratings: List[int] = []
        prior_30_days_ratings: List[int] = []

        sum_scores = 0
        for r in ratings:
            star = int(r.rating)
            if star in counts:
                counts[star] += 1
            sum_scores += star

            # Compliments tally
            if r.compliments:
                for comp in r.compliments:
                    label = COMPLIMENT_CATALOG.get(comp, comp)
                    compliments_count[label] = compliments_count.get(label, 0) + 1

            # Trend temporal buckets
            if r.created_at:
                created_utc = r.created_at if r.created_at.tzinfo else r.created_at.replace(tzinfo=timezone.utc)
                age_days = (now - created_utc).days
                if age_days <= 30:
                    last_30_days_ratings.append(star)
                elif age_days <= 60:
                    prior_30_days_ratings.append(star)

        # Mathematical breakdown
        breakdown = []
        for star in [5, 4, 3, 2, 1]:
            c = counts[star]
            pct = round((c / total_count) * 100) if total_count > 0 else 0
            breakdown.append({
                "star": star,
                "count": c,
                "percentage": pct,
            })

        overall_rating = round(sum_scores / total_count, 2)
        if driver.rating and abs(float(driver.rating) - overall_rating) > 0.05:
            overall_rating = float(driver.rating)

        # Rolling 30-day trend
        rating_trend = 0.0
        if len(last_30_days_ratings) >= 5 and len(prior_30_days_ratings) >= 5:
            curr_avg = sum(last_30_days_ratings) / len(last_30_days_ratings)
            prev_avg = sum(prior_30_days_ratings) / len(prior_30_days_ratings)
            rating_trend = round(curr_avg - prev_avg, 2)
        elif len(last_30_days_ratings) >= 3:
            curr_avg = sum(last_30_days_ratings) / len(last_30_days_ratings)
            rating_trend = round(curr_avg - overall_rating, 2)

        trend_direction = "UP" if rating_trend >= 0 else "DOWN"

        # Sorted top compliments
        top_compliments = [
            {"tag": k, "count": v}
            for k, v in sorted(compliments_count.items(), key=lambda x: x[1], reverse=True)
        ]

        # Standing logic
        if overall_rating >= 4.85:
            standing = "EXCELLENT"
            standing_badge = "Top 5% Partner"
        elif overall_rating >= 4.70:
            standing = "GOOD"
            standing_badge = "Preferred Partner"
        elif overall_rating >= 4.50:
            standing = "AVERAGE"
            standing_badge = "Standard Partner"
        else:
            standing = "NEEDS_ATTENTION"
            standing_badge = "Action Required"

        # Low rating alert
        is_low_alert = overall_rating < 4.70
        alert_msg = None
        improvement_tips = []
        if is_low_alert:
            alert_msg = "Your average rating is lower than usual (below 4.70)."
            improvement_tips = [
                "Ensure vehicle is clean and air conditioning is comfortable.",
                "Greet passengers politely and confirm pickup/drop destinations.",
                "Follow standard GPS routes and avoid harsh braking or rapid acceleration.",
                "Contact passengers promptly if delayed in traffic before pickup.",
            ]

        return {
            "overall_rating": overall_rating,
            "total_ratings": total_count,
            "rating_trend": rating_trend,
            "rating_trend_direction": trend_direction,
            "five_star_pct": round((counts[5] / total_count) * 100) if total_count > 0 else 100,
            "breakdown": breakdown,
            "top_compliments": top_compliments,
            "standing": standing,
            "standing_badge": standing_badge,
            "is_low_rating_alert": is_low_alert,
            "alert_message": alert_msg,
            "improvement_tips": improvement_tips,
        }

    async def get_driver_ratings_history(
        self,
        driver_user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Returns paginated list of driver rating feedback with strict customer PII anonymization.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        q = (
            select(CustomerDriverRating, RideRequest)
            .join(RideRequest, CustomerDriverRating.ride_id == RideRequest.id)
            .where(
                and_(
                    CustomerDriverRating.driver_id == driver.id,
                    CustomerDriverRating.status.in_(["APPROVED", "DISPUTED", "FLAGGED"])
                )
            )
            .order_by(desc(CustomerDriverRating.created_at))
            .limit(limit)
            .offset(offset)
        )
        res = await self.db.execute(q)
        rows = res.all()

        history = []
        for r_rating, r_ride in rows:
            # Redact customer identity into masked reference
            ride_snippet = f"#{str(r_ride.id).split('-')[0].upper()}"
            pickup_short = r_ride.pickup_address.split(",")[0] if r_ride.pickup_address else "Pickup Point"
            dest_short = r_ride.destination_address.split(",")[0] if r_ride.destination_address else "Destination Point"

            compliments_labels = [COMPLIMENT_CATALOG.get(c, c) for c in (r_rating.compliments or [])]

            history.append({
                "rating_id": str(r_rating.id),
                "ride_id": str(r_ride.id),
                "ride_reference": f"Ride {ride_snippet} ({pickup_short} → {dest_short})",
                "rating": r_rating.rating,
                "compliments": compliments_labels,
                "feedback": r_rating.feedback,
                "status": r_rating.status,
                "is_disputed": r_rating.status == "DISPUTED",
                "dispute_reason": r_rating.dispute_reason,
                "created_at": r_rating.created_at.isoformat() if r_rating.created_at else None,
            })

        return history

    async def dispute_rating(
        self,
        driver_user_id: str,
        rating_id: uuid.UUID,
        dispute_reason: str,
    ) -> Dict[str, Any]:
        """
        Allows driver to submit an appeal/dispute against an unfair or abusive rating.
        Updates status to DISPUTED for admin investigation without allowing deletion.
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        r_res = await self.db.execute(
            select(CustomerDriverRating).where(
                and_(
                    CustomerDriverRating.id == rating_id,
                    CustomerDriverRating.driver_id == driver.id,
                )
            )
        )
        rating_record = r_res.scalar_one_or_none()
        if not rating_record:
            raise HTTPException(status_code=404, detail="Rating record not found or does not belong to driver")

        if rating_record.status == "DISPUTED":
            return {
                "success": True,
                "rating_id": str(rating_record.id),
                "status": "DISPUTED",
                "message": "This rating dispute is already under review.",
            }

        rating_record.status = "DISPUTED"
        rating_record.dispute_reason = dispute_reason
        rating_record.disputed_at = datetime.now(timezone.utc)

        await self.db.commit()

        return {
            "success": True,
            "rating_id": str(rating_record.id),
            "status": "DISPUTED",
            "message": "Rating dispute submitted successfully. Our safety & moderation team will review this within 24 hours.",
        }

    async def simulate_ratings_dev_mode(
        self,
        driver_user_id: str,
        scenario: str,
    ) -> Dict[str, Any]:
        """
        Developer sandbox simulator for testing edge cases (5-star boost, low-rating warning, compliment wave).
        """
        d_res = await self.db.execute(select(Driver).where(Driver.user_id == uuid.UUID(driver_user_id)))
        driver = d_res.scalar_one_or_none()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver profile not found")

        if scenario == "LOW_RATING_WARNING":
            await self.db.execute(update(Driver).where(Driver.id == driver.id).values(rating=4.42))
        elif scenario == "FIVE_STAR_BOOST":
            await self.db.execute(update(Driver).where(Driver.id == driver.id).values(rating=4.95))
        elif scenario == "RESET_DEFAULTS":
            await self.db.execute(update(Driver).where(Driver.id == driver.id).values(rating=4.88))

        await self.db.commit()

        summary = await self.get_driver_ratings_summary(driver_user_id)
        return {
            "success": True,
            "scenario": scenario,
            "summary": summary,
            "message": f"Dev simulation '{scenario}' applied successfully.",
        }
