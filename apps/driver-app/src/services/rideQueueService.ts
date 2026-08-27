/**
 * Ride Queue Service — Centralized Pending Request Queue
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the normalized collection of pending ride offers for the driver.
 *
 * Key guarantees:
 *  1. No duplicate entries — every offer is keyed by offer_id.
 *  2. Idempotent upsert — socket + FCM + API returning the same offer_id → 1 entry.
 *  3. reconcileWithBackend() replaces local state with server truth atomically.
 *  4. Reactive subscription — UI gets notified on every change.
 *  5. removeByRideRequestId() — removes any offer matching a ride_request_id
 *     (used when RIDE_REQUEST_REMOVED arrives before offer_id is known).
 */
import { IncomingRideRequestPayload } from './driverSocketService'

type QueueListener = (queue: IncomingRideRequestPayload[]) => void

class RideQueueServiceClass {
  // Keyed by offer_id for O(1) deduplication
  private queue: Map<string, IncomingRideRequestPayload> = new Map()
  private listeners: Set<QueueListener> = new Set()

  // ── Subscription ────────────────────────────────────────────────────────────
  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener)
    listener(this.getQueue()) // immediate snapshot
    return () => this.listeners.delete(listener)
  }

  private notify() {
    const snapshot = this.getQueue()
    this.listeners.forEach(fn => {
      try { fn(snapshot) } catch (e) { console.warn('[RideQueueService] Listener error:', e) }
    })
  }

  // ── Read ────────────────────────────────────────────────────────────────────
  public getQueue(): IncomingRideRequestPayload[] {
    const now = Date.now()
    const arr: IncomingRideRequestPayload[] = []
    for (const offer of this.queue.values()) {
      const expiresAt = offer.expires_at ? new Date(offer.expires_at).getTime() : now + 999999
      if (expiresAt > now) {
        arr.push(offer)
      }
    }
    // Sort by created_at desc (newest first), then expires_at asc (soonest expiry first)
    arr.sort((a, b) => {
      const aExp = a.expires_at ? new Date(a.expires_at).getTime() : 0
      const bExp = b.expires_at ? new Date(b.expires_at).getTime() : 0
      return aExp - bExp // show soonest-expiring first
    })
    return arr
  }

  public getFirst(): IncomingRideRequestPayload | null {
    return this.getQueue()[0] ?? null
  }

  public size(): number {
    return this.getQueue().length
  }

  public has(offerId: string): boolean {
    return this.queue.has(offerId)
  }

  // ── Write ────────────────────────────────────────────────────────────────────

  /**
   * Idempotent upsert — if offer_id already exists, update in place.
   * Prevents duplicates from Socket.IO + FCM + resume API all returning same offer.
   */
  public upsertRequest(offer: IncomingRideRequestPayload): 'inserted' | 'updated' | 'skipped' {
    if (!offer?.offer_id) {
      console.warn('[RideQueueService] upsertRequest: offer missing offer_id', offer)
      return 'skipped'
    }

    // Check if already expired
    if (offer.expires_at) {
      const expiresAt = new Date(offer.expires_at).getTime()
      if (expiresAt <= Date.now()) {
        console.log('[RideQueueService] Skipping already-expired offer:', offer.offer_id)
        return 'skipped'
      }
    }

    const existed = this.queue.has(offer.offer_id)
    this.queue.set(offer.offer_id, offer)

    console.log(`[RideQueueService] ${existed ? 'Updated' : 'Inserted'} offer:`, offer.offer_id, `Queue size: ${this.queue.size}`)
    this.notify()
    return existed ? 'updated' : 'inserted'
  }

  /**
   * Remove a specific offer by offer_id.
   */
  public removeByOfferId(offerId: string): boolean {
    if (!offerId) return false
    const existed = this.queue.delete(offerId)
    if (existed) {
      console.log('[RideQueueService] Removed offer:', offerId, `Queue size: ${this.queue.size}`)
      this.notify()
    }
    return existed
  }

  /**
   * Remove all offers matching a ride_request_id.
   * Used when RIDE_REQUEST_REMOVED arrives with ride_request_id but not offer_id.
   */
  public removeByRideRequestId(rideRequestId: string): number {
    if (!rideRequestId) return 0
    let removed = 0
    for (const [offerId, offer] of this.queue.entries()) {
      if (offer.ride_request_id === rideRequestId || offer.booking_id === rideRequestId) {
        this.queue.delete(offerId)
        removed++
      }
    }
    if (removed > 0) {
      console.log('[RideQueueService] Removed', removed, 'offer(s) for ride_request_id:', rideRequestId)
      this.notify()
    }
    return removed
  }

  /**
   * Full reconciliation with backend state.
   *
   * This is the source-of-truth sync:
   *   - Adds new offers from server that we don't have locally
   *   - Removes local offers NOT returned by server (they were taken/expired/cancelled)
   *   - Updates existing offers with fresh server data (e.g. updated expires_at)
   *
   * Called on: app resume, socket reconnect, network reconnect, notification tap.
   */
  public reconcileWithBackend(serverOffers: IncomingRideRequestPayload[]): void {
    const serverIds = new Set(serverOffers.map(o => o.offer_id).filter(Boolean))

    // Remove local offers that server no longer returns
    let removedCount = 0
    for (const offerId of this.queue.keys()) {
      if (!serverIds.has(offerId)) {
        this.queue.delete(offerId)
        removedCount++
      }
    }

    // Upsert all server offers
    let addedCount = 0
    for (const offer of serverOffers) {
      if (offer?.offer_id) {
        const existed = this.queue.has(offer.offer_id)
        if (!existed) addedCount++
        this.queue.set(offer.offer_id, offer)
      }
    }

    console.log(
      `[RideQueueService] Reconciled: removed=${removedCount}, added=${addedCount}, total=${this.queue.size}`,
    )
    this.notify()
  }

  /**
   * Clear all offers (on logout or driver going offline).
   */
  public clear(): void {
    this.queue.clear()
    this.notify()
  }
}

export const RideQueueService = new RideQueueServiceClass()
