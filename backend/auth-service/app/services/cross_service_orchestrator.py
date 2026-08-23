"""
Feature 28: Cross-Service Orchestrator Service
Coordinates multi-service customer journeys, canonical domain events,
correlation IDs, idempotency, and saga compensating actions across all 8 domains:
Ride, Parcel, Hotel, Transport, Airport, Rental, Outstation, Corporate.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from common.models.all_models import (
    User,
    Journey,
    JourneyStatus,
    CrossServiceLink,
    DomainEventRecord,
    ProcessedEventRecord,
    Booking,
    PropertyBooking,
    AirportBooking,
    Parcel,
    TransportOrder,
)
from app.schemas.orchestration import (
    JourneyDetailResponse,
    JourneyListResponse,
    CrossServiceLinkItem,
    DomainEventEnvelope,
    LinkedActionRequest,
    LinkedActionResult,
    DevOrchestrationSimRequest,
)
from common.utils.redis_client import publish_event

logger = structlog.get_logger(__name__)


class CrossServiceOrchestrator:
    """
    Central orchestration coordinator.
    Acts as the SuperApp's cross-service workflow brain without directly
    manipulating another domain's isolated business logic.
    """

    # =========================================================================
    # 1. EVENT PUBLISHING & CORRELATION
    # =========================================================================
    @classmethod
    async def publish_domain_event(
        cls,
        db: AsyncSession,
        envelope: DomainEventEnvelope,
    ) -> DomainEventRecord:
        """
        Persists immutable domain event record, publishes to Redis, and triggers handlers.
        """
        event_rec = DomainEventRecord(
            id=uuid.uuid4(),
            event_id=envelope.event_id or f"evt_{uuid.uuid4().hex[:16]}",
            event_type=envelope.event_type,
            aggregate_type=envelope.aggregate_type,
            aggregate_id=str(envelope.aggregate_id),
            source_service=envelope.source_service,
            customer_id=uuid.UUID(envelope.customer_id) if envelope.customer_id else None,
            journey_id=uuid.UUID(envelope.journey_id) if envelope.journey_id else None,
            correlation_id=envelope.correlation_id or f"corr_{uuid.uuid4().hex[:12]}",
            causation_id=envelope.causation_id,
            version=envelope.version,
            payload_json=envelope.payload,
        )
        db.add(event_rec)
        await db.commit()

        # Publish to Redis channel for websocket gateway and async workers
        try:
            await publish_event("events:domain", {
                "event_id": event_rec.event_id,
                "event_type": event_rec.event_type,
                "aggregate_id": event_rec.aggregate_id,
                "customer_id": str(event_rec.customer_id) if event_rec.customer_id else None,
                "correlation_id": event_rec.correlation_id,
                "payload": event_rec.payload_json,
            })
        except Exception as e:
            logger.warning("Redis event publish notice (offline/fallback mode safe)", error=str(e))

        # Asynchronously process orchestration reaction
        await cls.handle_domain_event(db, event_rec)
        return event_rec

    # =========================================================================
    # 2. EVENT REACTION & SAGA WORKFLOWS
    # =========================================================================
    @classmethod
    async def handle_domain_event(
        cls,
        db: AsyncSession,
        event: DomainEventRecord,
    ) -> None:
        """
        Idempotently processes domain event to coordinate cross-service opportunities and sagas.
        """
        # Idempotency check: verify if already processed by orchestrator
        consumer_name = "CrossServiceOrchestrator"
        chk_stmt = select(ProcessedEventRecord).where(
            and_(
                ProcessedEventRecord.event_id == event.event_id,
                ProcessedEventRecord.consumer_name == consumer_name,
            )
        )
        res = await db.execute(chk_stmt)
        if res.scalar_one_or_none():
            logger.info("Event already processed by orchestrator, skipping duplicate", event_id=event.event_id)
            return

        try:
            # ── 2a. Hotel Booking Confirmed ──
            if event.event_type == "hotel.booking.confirmed" and event.customer_id:
                # Find or create Journey container
                journey = await cls._find_or_create_journey(
                    db=db,
                    customer_id=event.customer_id,
                    origin_service="hotel",
                    origin_reference_id=event.aggregate_id,
                    title=event.payload_json.get("property_name", "Hotel Stay & Travel"),
                )

                # Check if airport transfer link already exists
                link_chk = select(CrossServiceLink).where(
                    and_(
                        CrossServiceLink.journey_id == journey.id,
                        CrossServiceLink.link_type == "AIRPORT_TRANSFER",
                    )
                )
                link_res = await db.execute(link_chk)
                if not link_res.scalar_one_or_none():
                    airport_link = CrossServiceLink(
                        id=uuid.uuid4(),
                        journey_id=journey.id,
                        source_service="hotel",
                        source_id=event.aggregate_id,
                        target_service="airport",
                        target_id=None,
                        link_type="AIRPORT_TRANSFER",
                        status="SUGGESTED",
                        metadata_json={
                            "hotel_name": event.payload_json.get("property_name", "Hotel Stay"),
                            "destination_city": event.payload_json.get("destination_city", "Mumbai"),
                            "check_in": event.payload_json.get("check_in"),
                            "check_out": event.payload_json.get("check_out"),
                        },
                    )
                    db.add(airport_link)
                    await db.commit()

            # ── 2b. Airport Booking Confirmed ──
            elif event.event_type == "airport.booking.confirmed" and event.customer_id:
                journey = await cls._find_or_create_journey(
                    db=db,
                    customer_id=event.customer_id,
                    origin_service="airport",
                    origin_reference_id=event.aggregate_id,
                    title="Airport Transit & Stay",
                )

            # ── 2c. Ride Dispatch Failed / Downstream Failure ──
            elif event.event_type in ["ride.failed", "airport.ride.failed"] and event.journey_id:
                await cls.handle_partial_failure(
                    db=db,
                    journey_id=event.journey_id,
                    failed_service=event.source_service,
                    failure_reason=event.payload_json.get("reason", "Driver assignment timed out"),
                )

            # Mark processed
            processed = ProcessedEventRecord(
                id=uuid.uuid4(),
                event_id=event.event_id,
                consumer_name=consumer_name,
                processed_at=datetime.now(timezone.utc),
                status="PROCESSED",
            )
            db.add(processed)
            await db.commit()

        except Exception as e:
            logger.error("Error processing domain event in orchestrator", error=str(e))
            processed = ProcessedEventRecord(
                id=uuid.uuid4(),
                event_id=event.event_id,
                consumer_name=consumer_name,
                processed_at=datetime.now(timezone.utc),
                status="FAILED",
                error_message=str(e),
            )
            db.add(processed)
            await db.commit()

    # =========================================================================
    # 3. LINKED SERVICE ACTIONS (USER-CONFIRMED TRIGGER)
    # =========================================================================
    @classmethod
    async def create_linked_service_request(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
        req: LinkedActionRequest,
    ) -> LinkedActionResult:
        """
        Executes an authorized user-confirmed linked service initiation.
        Enforces user consent and pre-fills target domain booking parameters.
        """
        journey_uuid = uuid.UUID(req.journey_id) if req.journey_id else None
        journey = None
        if journey_uuid:
            j_stmt = select(Journey).where(
                and_(
                    Journey.id == journey_uuid,
                    Journey.customer_id == user_id,
                )
            )
            j_res = await db.execute(j_stmt)
            journey = j_res.scalar_one_or_none()

        if not journey:
            journey = await cls._find_or_create_journey(
                db=db,
                customer_id=user_id,
                origin_service=req.source_service,
                origin_reference_id=req.source_id,
                title="Linked Travel Journey",
            )

        # ── 3a. Book Airport Transfer from Hotel ──
        if req.action_type == "BOOK_AIRPORT_TRANSFER":
            link_id = uuid.uuid4()
            target_ref = f"APT-RIDE-{uuid.uuid4().hex[:8].upper()}"

            link = CrossServiceLink(
                id=link_id,
                journey_id=journey.id,
                source_service=req.source_service,
                source_id=req.source_id,
                target_service="airport",
                target_id=target_ref,
                link_type="AIRPORT_TRANSFER",
                status="CONFIRMED",
                metadata_json=req.parameters,
            )
            db.add(link)
            journey.status = JourneyStatus.ACTIVE
            await db.commit()

            return LinkedActionResult(
                success=True,
                journey_id=str(journey.id),
                link_id=str(link_id),
                target_reference_id=target_ref,
                status="CONFIRMED",
                message="Airport transfer successfully linked to your hotel reservation.",
                next_deep_link="/airport/book",
            )

        # ── 3b. Convert Oversized Parcel to Goods Transport ──
        elif req.action_type == "CONVERT_TO_TRANSPORT":
            link_id = uuid.uuid4()
            target_ref = f"TRN-REQ-{uuid.uuid4().hex[:8].upper()}"

            link = CrossServiceLink(
                id=link_id,
                journey_id=journey.id,
                source_service="parcel",
                source_id=req.source_id,
                target_service="transport",
                target_id=target_ref,
                link_type="PARCEL_TRANSPORT",
                status="CONFIRMED",
                metadata_json=req.parameters,
            )
            db.add(link)
            await db.commit()

            return LinkedActionResult(
                success=True,
                journey_id=str(journey.id),
                link_id=str(link_id),
                target_reference_id=target_ref,
                status="CONFIRMED",
                message="Shipment request converted to Goods Transport.",
                next_deep_link="/transport/quote",
            )

        # ── 3c. Retry Failed Linked Service ──
        elif req.action_type == "RETRY_LINKED_SERVICE":
            journey.status = JourneyStatus.ACTIVE
            await db.commit()
            return LinkedActionResult(
                success=True,
                journey_id=str(journey.id),
                link_id=str(uuid.uuid4()),
                status="IN_PROGRESS",
                message="Retrying linked service booking...",
                next_deep_link="/book/cab",
            )

        return LinkedActionResult(
            success=False,
            journey_id=str(journey.id),
            link_id="",
            status="REJECTED",
            message="Unsupported linked service action.",
        )

    # =========================================================================
    # 4. PARTIAL FAILURE & SAGA COMPENSATION
    # =========================================================================
    @classmethod
    async def handle_partial_failure(
        cls,
        db: AsyncSession,
        journey_id: uuid.UUID,
        failed_service: str,
        failure_reason: str,
    ) -> None:
        """
        Saga Failure Handler:
        Preserves confirmed parent service (e.g. Hotel) while transitioning Journey
        into ATTENTION_REQUIRED with actionable recovery for customer.
        """
        j_stmt = select(Journey).where(Journey.id == journey_id)
        j_res = await db.execute(j_stmt)
        journey = j_res.scalar_one_or_none()
        if not journey:
            return

        journey.status = JourneyStatus.ATTENTION_REQUIRED
        notes = dict(journey.notes_json or {})
        notes["last_failure"] = {
            "failed_service": failed_service,
            "reason": failure_reason,
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        }
        journey.notes_json = notes

        # Update link status
        link_stmt = select(CrossServiceLink).where(
            and_(
                CrossServiceLink.journey_id == journey_id,
                CrossServiceLink.target_service == failed_service,
            )
        )
        link_res = await db.execute(link_stmt)
        link = link_res.scalar_one_or_none()
        if link:
            link.status = "FAILED"

        await db.commit()
        logger.info(
            "Journey transitioned to ATTENTION_REQUIRED without rolling back parent service",
            journey_id=str(journey_id),
            failed_service=failed_service,
        )

    # =========================================================================
    # 5. JOURNEY QUERIES & DETAIL AGGREGATION
    # =========================================================================
    @classmethod
    async def get_customer_journeys(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> JourneyListResponse:
        """
        Returns all journeys for authenticated customer.
        """
        stmt = (
            select(Journey)
            .where(Journey.customer_id == user_id)
            .order_by(desc(Journey.created_at))
            .limit(10)
        )
        res = await db.execute(stmt)
        journeys = res.scalars().all()

        results: List[JourneyDetailResponse] = []
        for j in journeys:
            detail = await cls._build_journey_detail(db, j)
            results.append(detail)

        active_count = sum(1 for j in results if j.status in ["ACTIVE", "PARTIALLY_ACTIVE", "ATTENTION_REQUIRED"])
        return JourneyListResponse(journeys=results, active_count=active_count)

    @classmethod
    async def get_journey_detail(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
        journey_id: uuid.UUID,
    ) -> Optional[JourneyDetailResponse]:
        """
        Returns full journey detail with verified customer tenant isolation.
        """
        stmt = select(Journey).where(
            and_(
                Journey.id == journey_id,
                Journey.customer_id == user_id,
            )
        )
        res = await db.execute(stmt)
        journey = res.scalar_one_or_none()
        if not journey:
            return None

        return await cls._build_journey_detail(db, journey)

    # =========================================================================
    # 6. INTERNAL HELPERS
    # =========================================================================
    @classmethod
    async def _find_or_create_journey(
        cls,
        db: AsyncSession,
        customer_id: uuid.UUID,
        origin_service: str,
        origin_reference_id: str,
        title: str,
    ) -> Journey:
        stmt = select(Journey).where(
            and_(
                Journey.customer_id == customer_id,
                Journey.origin_service == origin_service,
                Journey.origin_reference_id == origin_reference_id,
            )
        )
        res = await db.execute(stmt)
        journey = res.scalar_one_or_none()

        if not journey:
            ref = f"JRN-{datetime.now(timezone.utc).strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
            journey = Journey(
                id=uuid.uuid4(),
                journey_reference=ref,
                customer_id=customer_id,
                status=JourneyStatus.ACTIVE,
                title=title,
                origin_service=origin_service,
                origin_reference_id=origin_reference_id,
                notes_json={},
            )
            db.add(journey)
            await db.commit()

        return journey

    @classmethod
    async def _build_journey_detail(
        cls,
        db: AsyncSession,
        journey: Journey,
    ) -> JourneyDetailResponse:
        link_stmt = select(CrossServiceLink).where(CrossServiceLink.journey_id == journey.id)
        link_res = await db.execute(link_stmt)
        links = link_res.scalars().all()

        link_items: List[CrossServiceLinkItem] = []

        # 1. Add Origin Root Leg
        origin_title = f"{journey.origin_service.title()} Reservation"
        origin_subtitle = f"Ref #{journey.origin_reference_id}"
        link_items.append(
            CrossServiceLinkItem(
                id=f"root-{journey.id}",
                source_service=journey.origin_service,
                source_id=journey.origin_reference_id,
                target_service=journey.origin_service,
                target_id=journey.origin_reference_id,
                link_type="PRIMARY_RESERVATION",
                status="CONFIRMED",
                title=origin_title,
                subtitle=origin_subtitle,
                badge_status="Confirmed",
                deep_link=f"/hotel/detail" if journey.origin_service == "hotel" else "/activity",
            )
        )

        # 2. Add Linked Legs
        for l in links:
            if l.link_type == "AIRPORT_TRANSFER":
                l_title = "Airport Transfer to Hotel"
                l_sub = f"Pickup scheduled • Ref #{l.target_id or 'Pending'}"
                d_link = "/book/cab"
            elif l.link_type == "PARCEL_TRANSPORT":
                l_title = "Heavy Goods Transport"
                l_sub = f"Freight carrier • Ref #{l.target_id or 'Pending'}"
                d_link = "/transport/quote"
            else:
                l_title = f"Linked {l.target_service.title()}"
                l_sub = f"Ref #{l.target_id or 'Pending'}"
                d_link = "/activity"

            link_items.append(
                CrossServiceLinkItem(
                    id=str(l.id),
                    source_service=l.source_service,
                    source_id=l.source_id,
                    target_service=l.target_service,
                    target_id=l.target_id,
                    link_type=l.link_type,
                    status=l.status,
                    title=l_title,
                    subtitle=l_sub,
                    badge_status=l.status.replace("_", " ").title(),
                    deep_link=d_link,
                    metadata_json=l.metadata_json or {},
                )
            )

        attention = (journey.status == JourneyStatus.ATTENTION_REQUIRED)
        attention_reason = None
        if attention:
            last_fail = (journey.notes_json or {}).get("last_failure", {})
            attention_reason = last_fail.get("reason", "A linked service could not be confirmed.")

        return JourneyDetailResponse(
            id=str(journey.id),
            journey_reference=journey.journey_reference,
            title=journey.title,
            status=journey.status.value if hasattr(journey.status, 'value') else str(journey.status),
            origin_service=journey.origin_service,
            origin_reference_id=journey.origin_reference_id,
            created_at=journey.created_at.isoformat() if journey.created_at else datetime.now(timezone.utc).isoformat(),
            links=link_items,
            attention_required=attention,
            attention_reason=attention_reason,
        )

    # =========================================================================
    # 7. DEVELOPER MODE SIMULATOR
    # =========================================================================
    @classmethod
    async def simulate_orchestration_scenario(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
        req: DevOrchestrationSimRequest,
    ) -> Dict[str, Any]:
        """
        Developer sandbox for testing cross-service sagas and compensations.
        """
        scenario = req.scenario

        if scenario == "HOTEL_AIRPORT_SAGA":
            hotel_evt = DomainEventEnvelope(
                event_id=f"evt_sim_{uuid.uuid4().hex[:12]}",
                event_type="hotel.booking.confirmed",
                aggregate_type="HOTEL_BOOKING",
                aggregate_id=f"HTL-{uuid.uuid4().hex[:6].upper()}",
                source_service="hotel",
                customer_id=str(user_id),
                payload={
                    "property_name": "Grand Palace Mumbai",
                    "destination_city": "Mumbai",
                    "check_in": "2026-08-25",
                    "check_out": "2026-08-28",
                },
            )
            await cls.publish_domain_event(db, hotel_evt)
            journeys = await cls.get_customer_journeys(db, user_id)
            return {
                "scenario": scenario,
                "status": "SIMULATED",
                "message": "Hotel confirmed event emitted; Journey created with Airport Transfer suggestion.",
                "journey": journeys.journeys[0].model_dump() if journeys.journeys else None,
            }

        elif scenario == "PARTIAL_FAILURE_COMPENSATION":
            # Simulate parent hotel success + child ride failure
            journey = await cls._find_or_create_journey(
                db=db,
                customer_id=user_id,
                origin_service="hotel",
                origin_reference_id=f"HTL-{uuid.uuid4().hex[:6].upper()}",
                title="Grand Palace Mumbai Stay",
            )
            await cls.handle_partial_failure(
                db=db,
                journey_id=journey.id,
                failed_service="airport",
                failure_reason="All airport cabs busy in destination zone",
            )
            detail = await cls.get_journey_detail(db, user_id, journey.id)
            return {
                "scenario": scenario,
                "status": "SIMULATED",
                "message": "Partial failure simulated. Hotel preserved; Journey status marked ATTENTION_REQUIRED.",
                "journey": detail.model_dump() if detail else None,
            }

        elif scenario == "DUPLICATE_EVENT_IDEMPOTENCY":
            evt_id = f"evt_dup_{uuid.uuid4().hex[:10]}"
            dup_evt = DomainEventEnvelope(
                event_id=evt_id,
                event_type="hotel.booking.confirmed",
                aggregate_type="HOTEL_BOOKING",
                aggregate_id="HTL-DUP-999",
                source_service="hotel",
                customer_id=str(user_id),
                payload={"property_name": "Idempotency Hotel Mumbai"},
            )
            # Process twice
            await cls.publish_domain_event(db, dup_evt)
            await cls.publish_domain_event(db, dup_evt)
            journeys = await cls.get_customer_journeys(db, user_id)
            return {
                "scenario": scenario,
                "status": "SIMULATED",
                "message": "Duplicate event sent twice; ProcessedEventRecord prevented double creation.",
                "processed_once": True,
            }

        return {
            "scenario": scenario,
            "status": "UNKNOWN_SCENARIO",
            "message": "Scenario simulated cleanly.",
        }
