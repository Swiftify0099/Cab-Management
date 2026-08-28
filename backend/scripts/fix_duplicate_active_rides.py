"""
One-time cleanup: Fix drivers with multiple concurrent active rides.

Root cause: a driver could accept a new ride while a previous ride was stuck
in ASSIGNED/PICKUP/IN_PROGRESS due to a crash, timeout, or missing completion call.

Strategy:
  - Find all drivers who have >1 ride in (ASSIGNED, PICKUP, IN_PROGRESS).
  - For each such driver: keep the NEWEST ride (by assigned_at DESC, created_at DESC).
  - Cancel all older duplicates with cancellation_reason = 'system_cleanup'.

Safe to re-run: already-cleaned rows will show 0 affected.

Usage (from backend/ directory):
    python -m scripts.fix_duplicate_active_rides
OR:
    python scripts/fix_duplicate_active_rides.py
"""
import asyncio
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlalchemy import select
from common.database import async_session_maker
from common.models.all_models import Driver, RideRequest, RideRequestStatus


ACTIVE_STATUSES = [
    RideRequestStatus.ASSIGNED,
    RideRequestStatus.PICKUP,
    RideRequestStatus.IN_PROGRESS,
]


def _now_utc():
    return datetime.now(timezone.utc)


async def find_and_fix_duplicate_active_rides(dry_run=False):
    async with async_session_maker() as db:
        res = await db.execute(
            select(RideRequest)
            .where(RideRequest.status.in_(ACTIVE_STATUSES))
            .where(RideRequest.assigned_driver_id.is_not(None))
            .order_by(
                RideRequest.assigned_driver_id,
                RideRequest.assigned_at.desc().nullslast(),
                RideRequest.created_at.desc(),
            )
        )
        all_active = res.scalars().all()

        by_driver = {}
        for ride in all_active:
            key = str(ride.assigned_driver_id)
            by_driver.setdefault(key, []).append(ride)

        dirty_drivers = {k: v for k, v in by_driver.items() if len(v) > 1}

        prefix = "[DRY RUN] " if dry_run else ""
        print(f"\n{prefix}Scan complete.")
        print(f"  Total active rides scanned : {len(all_active)}")
        print(f"  Drivers with active rides  : {len(by_driver)}")
        print(f"  Drivers with DUPLICATES    : {len(dirty_drivers)}")

        if not dirty_drivers:
            print("\nNo duplicate active rides found. DB is clean.")
            return {"dirty_drivers": 0, "rides_cancelled": 0}

        total_cancelled = 0
        now = _now_utc()

        for driver_id_str, rides in dirty_drivers.items():
            winner = rides[0]
            losers = rides[1:]

            d_res = await db.execute(
                select(Driver).where(Driver.id == winner.assigned_driver_id)
            )
            driver = d_res.scalars().first()
            driver_label = driver.full_name if driver else driver_id_str

            print(f"\n  DRIVER: {driver_label} ({driver_id_str})")
            print(f"  KEEP   -> ride {winner.id}  status={winner.status.value}  created={winner.created_at}")
            for loser in losers:
                print(f"  CANCEL -> ride {loser.id}  status={loser.status.value}  created={loser.created_at}")
                if not dry_run:
                    loser.status = RideRequestStatus.CANCELLED
                    loser.cancelled_at = now
                    loser.cancelled_by = "system_cleanup"
                    loser.cancellation_reason = (
                        f"Cancelled by system_cleanup: driver had concurrent active rides. "
                        f"Kept ride {winner.id} as canonical."
                    )
                total_cancelled += 1

        if not dry_run:
            await db.commit()
            print(f"\nDone. Cancelled {total_cancelled} duplicate ride(s) and committed.")
        else:
            print(f"\n[DRY RUN] Would cancel {total_cancelled} duplicate ride(s). No changes committed.")

        return {"dirty_drivers": len(dirty_drivers), "rides_cancelled": total_cancelled}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Fix duplicate active rides per driver.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Report without making changes.")
    args = parser.parse_args()
    result = asyncio.run(find_and_fix_duplicate_active_rides(dry_run=args.dry_run))
    sys.exit(0)
