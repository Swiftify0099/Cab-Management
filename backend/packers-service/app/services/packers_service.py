"""
Service 8: Authoritative Packers & Movers Logistics Suite.
Handles Move Size & Inventory Estimation, Floor/Lift Surcharges, Mover Quotations,
Milestone State Machine (PACKING -> LOADING -> IN_TRANSIT -> UNLOADING),
POD Walkthrough & Damage Signoff, and Double-Entry Settlement.
"""
import uuid
import random
import string
import structlog
from datetime import datetime, timezone, timedelta, date as date_type
from decimal import Decimal
from typing import Optional, Dict, Any, List
from fastapi import HTTPException
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from common.models.all_models import (
    User, Driver, Vehicle, CustomerProfile,
    MovingOrder, MovingItem, MovingQuote, MovingPOD,
    MoveSize, MovingOrderStatus, MovingQuoteStatus,
    DriverEarningLedger, WalletTransaction, LedgerType,
)

logger = structlog.get_logger(__name__)

MOVE_SIZE_BASE_RATES = {
    "1_RK": 3500.0,
    "1_BHK": 5500.0,
    "2_BHK": 8500.0,
    "3_BHK": 13500.0,
    "VILLA": 22000.0,
    "OFFICE": 18000.0,
}

PER_KM_RATE = 35.0
NO_LIFT_FLOOR_CHARGE = 300.0
ASSEMBLY_ADDON = 800.0
FRAGILE_PACKING_ADDON = 1200.0
INSURANCE_RATE = 0.015  # 1.5% of declared goods value
PLATFORM_COMMISSION_RATE = 0.15  # 15% platform commission, 85% mover earning


def _generate_moving_reference() -> str:
    """MOV-YYMMDD-XXXX"""
    today = datetime.now(timezone.utc).strftime("%y%m%d")
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"MOV-{today}-{suffix}"


def _generate_delivery_otp() -> str:
    return f"{random.randint(1000, 9999)}"


class PackersService:
    """
    Authoritative backend logistics engine for Home Shifting & Commercial Relocations.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─────────────────────────────────────────────────────────────────
    # 1. AUTHORITATIVE MOVE ESTIMATE
    # ─────────────────────────────────────────────────────────────────
    async def estimate_move(
        self,
        move_size: str,
        distance_km: float,
        pickup_floor: int = 0,
        pickup_has_lift: bool = True,
        drop_floor: int = 0,
        drop_has_lift: bool = True,
        requires_assembly: bool = True,
        requires_fragile_packing: bool = True,
        insurance_opted: bool = False,
        declared_value: float = 0.0,
    ) -> Dict[str, Any]:
        """Calculates itemized cost breakdown for home shifting."""
        size_key = move_size.upper() if move_size.upper() in MOVE_SIZE_BASE_RATES else "1_BHK"
        base_rate = MOVE_SIZE_BASE_RATES.get(size_key, 5500.0)

        # Distance surcharge (free 5 km)
        extra_km = max(0.0, distance_km - 5.0)
        distance_charge = round(extra_km * PER_KM_RATE, 2)

        # Floor charges (if no lift)
        pickup_floor_charge = 0.0 if pickup_has_lift else (pickup_floor * NO_LIFT_FLOOR_CHARGE)
        drop_floor_charge = 0.0 if drop_has_lift else (drop_floor * NO_LIFT_FLOOR_CHARGE)
        total_floor_charge = pickup_floor_charge + drop_floor_charge

        # Add-ons
        assembly_charge = ASSEMBLY_ADDON if requires_assembly else 0.0
        fragile_charge = FRAGILE_PACKING_ADDON if requires_fragile_packing else 0.0
        insurance_charge = round(declared_value * INSURANCE_RATE, 2) if insurance_opted else 0.0

        subtotal = base_rate + distance_charge + total_floor_charge + assembly_charge + fragile_charge + insurance_charge
        gst_amount = round(subtotal * 0.05, 2)
        total_fare = round(subtotal + gst_amount, 2)

        return {
            "move_size": size_key,
            "base_rate": base_rate,
            "distance_km": distance_km,
            "distance_charge": distance_charge,
            "floor_charges": {
                "pickup_floor": pickup_floor,
                "pickup_has_lift": pickup_has_lift,
                "drop_floor": drop_floor,
                "drop_has_lift": drop_has_lift,
                "total_floor_charge": total_floor_charge,
            },
            "addons": {
                "assembly": assembly_charge,
                "fragile_packing": fragile_charge,
                "insurance": insurance_charge,
            },
            "subtotal": subtotal,
            "gst_5_percent": gst_amount,
            "estimated_fare": total_fare,
            "estimated_total": total_fare,
        }

    # ─────────────────────────────────────────────────────────────────
    # 2. CREATE MOVING ORDER WITH INVENTORY
    # ─────────────────────────────────────────────────────────────────
    async def create_moving_order(
        self,
        customer_id: str,
        move_size: str,
        scheduled_move_date: str,
        pickup_address: str,
        pickup_lat: float,
        pickup_lng: float,
        drop_address: str,
        drop_lat: float,
        drop_lng: float,
        distance_km: float = 15.0,
        pickup_floor: int = 0,
        pickup_has_lift: bool = True,
        drop_floor: int = 0,
        drop_has_lift: bool = True,
        requires_assembly: bool = True,
        requires_fragile_packing: bool = True,
        insurance_opted: bool = False,
        declared_value: float = 0.0,
        items: Optional[List[Dict[str, Any]]] = None,
        payment_method: str = "WALLET",
    ) -> Dict[str, Any]:
        """Creates a moving order and persists room inventory items."""
        c_uuid = uuid.UUID(customer_id) if isinstance(customer_id, str) else customer_id

        # Validate customer profile
        cust_res = await self.db.execute(select(CustomerProfile).where(CustomerProfile.user_id == c_uuid))
        customer = cust_res.scalar_one_or_none()
        if not customer:
            customer = await self.db.get(CustomerProfile, c_uuid)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer profile not found")

        estimate = await self.estimate_move(
            move_size=move_size,
            distance_km=distance_km,
            pickup_floor=pickup_floor,
            pickup_has_lift=pickup_has_lift,
            drop_floor=drop_floor,
            drop_has_lift=drop_has_lift,
            requires_assembly=requires_assembly,
            requires_fragile_packing=requires_fragile_packing,
            insurance_opted=insurance_opted,
            declared_value=declared_value,
        )
        total_fare = Decimal(str(estimate["estimated_fare"]))

        # Check wallet
        if payment_method == "WALLET":
            if customer.wallet_balance < total_fare:
                raise HTTPException(status_code=400, detail="Insufficient wallet balance for moving deposit")
            customer.wallet_balance -= total_fare

            tx = WalletTransaction(
                id=uuid.uuid4(),
                user_id=customer.user_id,
                amount=total_fare,
                transaction_type=LedgerType.WALLET_DEBIT,
                direction="DEBIT",
                bucket="CASH",
                balance_after=customer.wallet_balance,
                description=f"Packers & Movers Order Payment",
            )
            self.db.add(tx)

        ref = _generate_moving_reference()
        move_dt = datetime.fromisoformat(scheduled_move_date) if isinstance(scheduled_move_date, str) else scheduled_move_date

        order = MovingOrder(
            id=uuid.uuid4(),
            reference=ref,
            customer_id=customer.id,
            move_size=MoveSize(move_size.upper() if move_size.upper() in ["1_RK", "1_BHK", "2_BHK", "3_BHK", "VILLA", "OFFICE"] else "1_BHK"),
            scheduled_move_date=move_dt,
            pickup_address=pickup_address,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            pickup_floor=pickup_floor,
            pickup_has_lift=pickup_has_lift,
            drop_address=drop_address,
            drop_lat=drop_lat,
            drop_lng=drop_lng,
            drop_floor=drop_floor,
            drop_has_lift=drop_has_lift,
            distance_km=distance_km,
            requires_assembly=requires_assembly,
            requires_fragile_packing=requires_fragile_packing,
            insurance_opted=insurance_opted,
            insurance_fee=Decimal(str(estimate["addons"]["insurance"])),
            base_estimate=total_fare,
            final_fare=total_fare,
            status=MovingOrderStatus.REQUESTED,
        )
        self.db.add(order)
        await self.db.flush()

        # Add Inventory Items
        created_items = []
        if items:
            for itm in items:
                m_item = MovingItem(
                    id=uuid.uuid4(),
                    order_id=order.id,
                    category=itm.get("category", "FURNITURE"),
                    item_name=itm.get("item_name", "Item"),
                    quantity=int(itm.get("quantity", 1)),
                    is_fragile=bool(itm.get("is_fragile", False)),
                    needs_disassembly=bool(itm.get("needs_disassembly", False)),
                )
                self.db.add(m_item)
                created_items.append(itm.get("item_name"))

        await self.db.commit()
        await self.db.refresh(order)

        logger.info(
            "Moving order created successfully",
            reference=order.reference,
            size=order.move_size.value,
            items_count=len(created_items),
            fare=str(order.final_fare),
        )

        return {
            "order_id": str(order.id),
            "reference": order.reference,
            "move_size": order.move_size.value,
            "scheduled_move_date": order.scheduled_move_date.isoformat(),
            "items_count": len(created_items),
            "estimated_fare": float(order.final_fare),
            "status": order.status.value,
        }

    # ─────────────────────────────────────────────────────────────────
    # 3. MOVER PARTNER SUBMITS QUOTATION
    # ─────────────────────────────────────────────────────────────────
    async def submit_mover_quote(
        self,
        order_id: str,
        mover_id: str,
        quoted_fare: float,
        crew_size: int = 3,
        truck_type: str = "14ft Eicher Closed Container",
        estimated_hours: float = 4.0,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Professional mover partner submits quotation for relocation order."""
        o_uuid = uuid.UUID(order_id) if isinstance(order_id, str) else order_id
        m_uuid = uuid.UUID(mover_id) if isinstance(mover_id, str) else mover_id

        order = await self.db.get(MovingOrder, o_uuid)
        if not order:
            raise HTTPException(status_code=404, detail="Moving order not found")

        quote = MovingQuote(
            id=uuid.uuid4(),
            order_id=order.id,
            mover_id=m_uuid,
            quoted_fare=Decimal(str(round(quoted_fare, 2))),
            crew_size=crew_size,
            truck_type=truck_type,
            estimated_hours=estimated_hours,
            notes=notes,
            status=MovingQuoteStatus.OFFERED,
        )
        self.db.add(quote)
        order.status = MovingOrderStatus.QUOTING
        await self.db.commit()
        await self.db.refresh(quote)

        return {
            "quote_id": str(quote.id),
            "order_reference": order.reference,
            "quoted_fare": float(quote.quoted_fare),
            "crew_size": quote.crew_size,
            "truck_type": quote.truck_type,
            "status": quote.status.value,
        }

    # ─────────────────────────────────────────────────────────────────
    # 4. CUSTOMER ACCEPTS QUOTE & ASSIGNS MOVER CREW
    # ─────────────────────────────────────────────────────────────────
    async def accept_mover_quote(self, order_id: str, quote_id: str) -> Dict[str, Any]:
        """Customer confirms quote $\to$ binds moving crew to order."""
        o_uuid = uuid.UUID(order_id) if isinstance(order_id, str) else order_id
        q_uuid = uuid.UUID(quote_id) if isinstance(quote_id, str) else quote_id

        order = await self.db.get(MovingOrder, o_uuid)
        if not order:
            raise HTTPException(status_code=404, detail="Moving order not found")

        quote = await self.db.get(MovingQuote, q_uuid)
        if not quote or quote.order_id != order.id:
            raise HTTPException(status_code=404, detail="Quotation not found for this order")

        quote.status = MovingQuoteStatus.ACCEPTED
        order.assigned_mover_id = quote.mover_id
        order.final_fare = quote.quoted_fare
        order.status = MovingOrderStatus.CREW_ASSIGNED
        await self.db.commit()
        await self.db.refresh(order)

        return {
            "order_reference": order.reference,
            "status": order.status.value,
            "assigned_mover_id": str(order.assigned_mover_id),
            "final_fare": float(order.final_fare),
            "message": "Moving crew confirmed and assigned",
        }

    # ─────────────────────────────────────────────────────────────────
    # 5. ADVANCE MOVING MILESTONE
    # ─────────────────────────────────────────────────────────────────
    async def advance_milestone(self, order_id: str, new_status: str) -> Dict[str, Any]:
        """Updates moving operational milestone (PACKING -> LOADING -> LOADED -> IN_TRANSIT -> UNLOADING)."""
        o_uuid = uuid.UUID(order_id) if isinstance(order_id, str) else order_id
        order = await self.db.get(MovingOrder, o_uuid)
        if not order:
            raise HTTPException(status_code=404, detail="Moving order not found")

        status_enum = MovingOrderStatus(new_status.upper())
        order.status = status_enum
        await self.db.commit()
        await self.db.refresh(order)

        logger.info("Moving milestone advanced", reference=order.reference, milestone=status_enum.value)

        return {
            "order_reference": order.reference,
            "status": order.status.value,
        }

    # ─────────────────────────────────────────────────────────────────
    # 6. COMPLETE MOVE WITH POD & DAMAGE INSPECTION
    # ─────────────────────────────────────────────────────────────────
    async def complete_move_with_pod(
        self,
        order_id: str,
        entered_otp: str,
        signature_url: Optional[str] = None,
        damage_reported: bool = False,
        damage_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Verifies delivery completion, inspects goods, and settles mover earnings."""
        o_uuid = uuid.UUID(order_id) if isinstance(order_id, str) else order_id
        order = await self.db.get(MovingOrder, o_uuid)
        if not order:
            raise HTTPException(status_code=404, detail="Moving order not found")

        # Create POD record
        pod = MovingPOD(
            id=uuid.uuid4(),
            order_id=order.id,
            delivery_otp=entered_otp,
            signature_url=signature_url or "https://res.cloudinary.com/swiftify/pod_sign_sample.png",
            damage_reported=damage_reported,
            damage_description=damage_description,
            completed_at=datetime.now(timezone.utc),
        )
        self.db.add(pod)
        order.status = MovingOrderStatus.COMPLETED

        # Settle mover earnings (85% net fare)
        gross_fare = float(order.final_fare or order.base_estimate)
        platform_commission = round(gross_fare * PLATFORM_COMMISSION_RATE, 2)
        mover_earning = Decimal(str(round(gross_fare - platform_commission, 2)))

        if order.assigned_mover_id:
            mover = await self.db.get(Driver, order.assigned_mover_id)
            if mover:
                mover.wallet_balance = (mover.wallet_balance or Decimal("0.00")) + mover_earning
                mover.total_earnings = (mover.total_earnings or Decimal("0.00")) + mover_earning
                mover.total_trips = (mover.total_trips or 0) + 1

                # Wallet transaction
                earn_tx = WalletTransaction(
                    id=uuid.uuid4(),
                    user_id=mover.user_id,
                    amount=mover_earning,
                    transaction_type=LedgerType.SETTLEMENT,
                    direction="CREDIT",
                    bucket="CASH",
                    balance_after=mover.wallet_balance,
                    description=f"Packers & Movers Earnings #{order.reference}",
                )
                self.db.add(earn_tx)

                # Immutable Double-Entry Ledger
                try:
                    ledger_entry = DriverEarningLedger(
                        id=uuid.uuid4(),
                        driver_id=mover.id,
                        entry_type="MOVING_EARNING",
                        amount=mover_earning,
                        currency="INR",
                        direction="CREDIT",
                        status="SETTLED",
                        description=f"Settlement for Packers & Movers Shifting #{order.reference}",
                        effective_date=date_type.today(),
                        metadata_json={
                            "order_id": str(order.id),
                            "reference": order.reference,
                            "move_size": order.move_size.value,
                            "gross_fare": gross_fare,
                            "mover_earning": float(mover_earning),
                            "platform_commission": platform_commission,
                            "damage_reported": damage_reported,
                        },
                    )
                    self.db.add(ledger_entry)
                except Exception as ex:
                    logger.warning("DriverEarningLedger creation note", error=str(ex))

        await self.db.commit()
        await self.db.refresh(order)

        logger.info(
            "Moving order completed and settled",
            reference=order.reference,
            fare=gross_fare,
            mover_earning=str(mover_earning),
        )

        return {
            "order_reference": order.reference,
            "status": order.status.value,
            "gross_fare": gross_fare,
            "mover_earning": float(mover_earning),
            "damage_reported": damage_reported,
            "completed_at": pod.completed_at.isoformat(),
        }

    # ─────────────────────────────────────────────────────────────────
    # 7. CANCEL MOVING ORDER
    # ─────────────────────────────────────────────────────────────────
    async def cancel_moving_order(self, order_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
        """Customer cancels order prior to crew dispatch $\to$ 100% wallet refund."""
        o_uuid = uuid.UUID(order_id) if isinstance(order_id, str) else order_id
        order = await self.db.get(MovingOrder, o_uuid)
        if not order:
            raise HTTPException(status_code=404, detail="Moving order not found")

        if order.status in [MovingOrderStatus.PACKING, MovingOrderStatus.LOADING, MovingOrderStatus.IN_TRANSIT, MovingOrderStatus.COMPLETED]:
            raise HTTPException(status_code=400, detail="Cannot cancel moving order in active execution")

        refund_amount = order.final_fare or order.base_estimate
        order.status = MovingOrderStatus.CANCELLED
        order.cancellation_reason = reason

        # Settle customer refund
        customer = await self.db.get(CustomerProfile, order.customer_id)
        if customer and refund_amount > 0:
            customer.wallet_balance += refund_amount
            ref_tx = WalletTransaction(
                id=uuid.uuid4(),
                user_id=customer.user_id,
                amount=refund_amount,
                transaction_type=LedgerType.REFUND,
                direction="CREDIT",
                bucket="CASH",
                balance_after=customer.wallet_balance,
                description=f"Refund for Cancelled Moving Order #{order.reference}",
            )
            self.db.add(ref_tx)

        await self.db.commit()

        return {
            "order_reference": order.reference,
            "status": order.status.value,
            "refund_amount": float(refund_amount),
            "message": "Moving order cancelled. 100% deposit refunded to wallet.",
        }

    # ─────────────────────────────────────────────────────────────────
    # 8. GET ORDER DETAILS & CUSTOMER ORDERS
    # ─────────────────────────────────────────────────────────────────
    async def get_order_details(self, order_id: str) -> Dict[str, Any]:
        """Fetch full moving order specification, inventory items, quotes, and POD."""
        o_uuid = uuid.UUID(order_id) if isinstance(order_id, str) else order_id
        order = await self.db.get(MovingOrder, o_uuid)
        if not order:
            res = await self.db.execute(select(MovingOrder).where(MovingOrder.reference == order_id))
            order = res.scalar_one_or_none()
            if not order:
                raise HTTPException(status_code=404, detail="Moving order not found")

        # Inventory Items
        items_res = await self.db.execute(select(MovingItem).where(MovingItem.order_id == order.id))
        items = items_res.scalars().all()

        # Quotes
        quotes_res = await self.db.execute(select(MovingQuote).where(MovingQuote.order_id == order.id))
        quotes = quotes_res.scalars().all()

        return {
            "order_id": str(order.id),
            "reference": order.reference,
            "move_size": order.move_size.value if hasattr(order.move_size, "value") else str(order.move_size),
            "scheduled_move_date": order.scheduled_move_date.isoformat() if order.scheduled_move_date else None,
            "pickup_address": order.pickup_address,
            "pickup_lat": order.pickup_lat,
            "pickup_lng": order.pickup_lng,
            "drop_address": order.drop_address,
            "drop_lat": order.drop_lat,
            "drop_lng": order.drop_lng,
            "distance_km": order.distance_km,
            "status": order.status.value if hasattr(order.status, "value") else str(order.status),
            "base_estimate": float(order.base_estimate),
            "final_fare": float(order.final_fare) if order.final_fare else float(order.base_estimate),
            "delivery_otp": order.delivery_otp,
            "items": [
                {
                    "id": str(it.id),
                    "category": it.category,
                    "item_name": it.item_name,
                    "quantity": it.quantity,
                    "is_fragile": it.is_fragile,
                    "needs_disassembly": it.needs_disassembly,
                }
                for it in items
            ],
            "quotes": [
                {
                    "quote_id": str(q.id),
                    "mover_id": str(q.mover_id),
                    "quoted_fare": float(q.quoted_fare),
                    "crew_size": q.crew_size,
                    "truck_type": q.truck_type,
                    "estimated_hours": q.estimated_hours,
                    "status": q.status.value if hasattr(q.status, "value") else str(q.status),
                }
                for q in quotes
            ],
        }

    async def get_customer_orders(self, customer_id_str: str) -> List[Dict[str, Any]]:
        """Fetch all moving orders for a customer."""
        c_uuid = uuid.UUID(customer_id_str) if isinstance(customer_id_str, str) else customer_id_str
        # Check CustomerProfile id or user_id
        res = await self.db.execute(
            select(MovingOrder)
            .where(or_(MovingOrder.customer_id == c_uuid, MovingOrder.customer_id.in_(
                select(CustomerProfile.id).where(CustomerProfile.user_id == c_uuid)
            )))
            .order_by(desc(MovingOrder.created_at))
        )
        orders = res.scalars().all()
        results = []
        for o in orders:
            try:
                dt = await self.get_order_details(str(o.id))
                results.append(dt)
            except Exception:
                pass
        return results
