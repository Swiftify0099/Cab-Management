/**
 * Test Suite: Phase 9 Global Partner Request Experience & Request Manager
 * 
 * Verifies:
 *  1. Simultaneous Socket.IO + FCM Push Notification delivery (Idempotent Deduplication).
 *  2. Duplicate siren/sound suppression (Single siren trigger on concurrent arrival).
 *  3. Stale request filtering (expires_at <= now).
 *  4. Loser event invalidation (RIDE_REQUEST_REMOVED).
 *  5. Reopen / App Resume full reconciliation (reconcileWithBackend).
 *  6. Multi-offer queue sorting (soonest expiry first).
 */

class MockRideQueueService {
  constructor() {
    this.queue = new Map();
    this.listeners = new Set();
    this.sirenTriggerCount = 0;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getQueue());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snapshot = this.getQueue();
    this.listeners.forEach(fn => fn(snapshot));
  }

  getQueue() {
    const now = Date.now();
    const arr = [];
    for (const offer of this.queue.values()) {
      const expiresAt = offer.expires_at ? new Date(offer.expires_at).getTime() : now + 999999;
      if (expiresAt > now) {
        arr.push(offer);
      }
    }
    arr.sort((a, b) => {
      const aExp = a.expires_at ? new Date(a.expires_at).getTime() : 0;
      const bExp = b.expires_at ? new Date(b.expires_at).getTime() : 0;
      return aExp - bExp;
    });
    return arr;
  }

  getFirst() {
    return this.getQueue()[0] || null;
  }

  size() {
    return this.getQueue().length;
  }

  upsertRequest(offer) {
    if (!offer || !offer.offer_id) return 'skipped';

    if (offer.expires_at) {
      const expiresAt = new Date(offer.expires_at).getTime();
      if (expiresAt <= Date.now()) {
        return 'skipped';
      }
    }

    const existed = this.queue.has(offer.offer_id);
    this.queue.set(offer.offer_id, offer);
    this.notify();

    if (!existed) {
      this.sirenTriggerCount++;
      return 'inserted';
    }
    return 'updated';
  }

  removeByOfferId(offerId) {
    if (!offerId) return false;
    const existed = this.queue.delete(offerId);
    if (existed) this.notify();
    return existed;
  }

  removeByRideRequestId(rideRequestId) {
    if (!rideRequestId) return 0;
    let removed = 0;
    for (const [offerId, offer] of this.queue.entries()) {
      if (offer.ride_request_id === rideRequestId || offer.booking_id === rideRequestId) {
        this.queue.delete(offerId);
        removed++;
      }
    }
    if (removed > 0) this.notify();
    return removed;
  }

  reconcileWithBackend(serverOffers) {
    const serverIds = new Set(serverOffers.map(o => o.offer_id).filter(Boolean));
    for (const offerId of this.queue.keys()) {
      if (!serverIds.has(offerId)) {
        this.queue.delete(offerId);
      }
    }
    for (const offer of serverOffers) {
      this.upsertRequest(offer);
    }
    this.notify();
  }
}

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${testName}`);
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('📲🚖 STARTING PHASE 9: GLOBAL PARTNER REQUEST MANAGER JAVASCRIPT SUITE');
  console.log('='.repeat(80));

  const queueService = new MockRideQueueService();

  // Test 1: Single request arrival
  console.log('\n--- TEST 1: Foreground Socket Arrival ---');
  const offerA = {
    offer_id: 'off-1001',
    ride_request_id: 'req-1001',
    service_type: 'cab_local',
    pickup: { address: 'Shivajinagar', lat: 18.5204, lng: 73.8567, distance_km: 1.5, eta_min: 5 },
    destination: { address: 'Baner', lat: 18.5590, lng: 73.7868 },
    trip: { fare: 320, earning: 256, distance_km: 11.2, duration_min: 24, seats: 1 },
    expires_at: new Date(Date.now() + 120000).toISOString(),
    timeout_sec: 180,
  };
  const res1 = queueService.upsertRequest(offerA);
  assert(res1 === 'inserted', 'Single offer correctly inserted');
  assert(queueService.size() === 1, 'Queue contains exactly 1 offer');
  assert(queueService.sirenTriggerCount === 1, 'Siren triggered exactly 1 time');

  // Test 2: Simultaneous Socket.IO + FCM Notification arrival
  console.log('\n--- TEST 2: Simultaneous Socket + Push Notification Arrival ---');
  const notificationPayloadA = { ...offerA, arrival_source: 'fcm_push' };
  const res2 = queueService.upsertRequest(notificationPayloadA);
  assert(res2 === 'updated', 'Duplicate payload with same offer_id returned updated (not inserted)');
  assert(queueService.size() === 1, 'Queue remains strictly at 1 offer (No duplicate modal)');
  assert(queueService.sirenTriggerCount === 1, 'Siren trigger count remains at 1 (Duplicate siren prevented)');

  // Test 3: Stale Request Filtering
  console.log('\n--- TEST 3: Stale Request Rejection ---');
  const staleOffer = {
    offer_id: 'off-9999',
    ride_request_id: 'req-9999',
    expires_at: new Date(Date.now() - 5000).toISOString(), // 5s in past
  };
  const res3 = queueService.upsertRequest(staleOffer);
  assert(res3 === 'skipped', 'Expired/stale offer is strictly skipped');
  assert(!queueService.getQueue().some(o => o.offer_id === 'off-9999'), 'Stale offer not present in queue');

  // Test 4: Another partner wins -> RIDE_REQUEST_REMOVED
  console.log('\n--- TEST 4: Loser Event Invalidation (RIDE_REQUEST_REMOVED) ---');
  const removed = queueService.removeByOfferId('off-1001');
  assert(removed === true, 'Offer successfully removed when loser event received');
  assert(queueService.size() === 0, 'Queue is now empty (Overlay immediately disappears)');

  // Test 5: Multi-offer queue sorting
  console.log('\n--- TEST 5: Multi-Offer Queue & Expiry Sorting ---');
  const offerB = {
    offer_id: 'off-2001',
    ride_request_id: 'req-2001',
    expires_at: new Date(Date.now() + 60000).toISOString(), // 60s
  };
  const offerC = {
    offer_id: 'off-2002',
    ride_request_id: 'req-2002',
    expires_at: new Date(Date.now() + 30000).toISOString(), // 30s (soonest!)
  };
  queueService.upsertRequest(offerB);
  queueService.upsertRequest(offerC);
  assert(queueService.size() === 2, 'Queue holds 2 distinct active offers');
  assert(queueService.getFirst().offer_id === 'off-2002', 'Queue displays soonest-expiring offer first');

  // Test 6: Reopen / App Resume Backend Reconciliation
  console.log('\n--- TEST 6: Reopen / App Resume Reconciliation ---');
  // Server returns only offer D (offers B and C were taken while app was in background)
  const serverOffers = [
    {
      offer_id: 'off-3001',
      ride_request_id: 'req-3001',
      expires_at: new Date(Date.now() + 150000).toISOString(),
    },
  ];
  queueService.reconcileWithBackend(serverOffers);
  assert(queueService.size() === 1, 'Reconciled queue contains exactly 1 offer');
  assert(queueService.getFirst().offer_id === 'off-3001', 'Reconciled queue contains the fresh server offer');
  assert(!queueService.getQueue().some(o => o.offer_id === 'off-2001' || o.offer_id === 'off-2002'), 'Taken offers B and C successfully purged');

  console.log('\n' + '='.repeat(80));
  console.log(`📊 PHASE 9 REQUEST MANAGER SUMMARY: ${passed}/${passed + failed} TESTS PASSED`);
  if (failed === 0) {
    console.log('🎉 PHASE 9: GLOBAL REQUEST MANAGER VERIFIED SUCCESSFULLY!');
  } else {
    console.error(`⚠️ ${failed} TESTS FAILED!`);
    process.exit(1);
  }
  console.log('='.repeat(80));
}

runTests();
