/**
 * CabBooking Customer App — API client with Axios + token refresh.
 */
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

export const PROD_BASE_URL = 'https://cab-management-1.onrender.com/api/v1'

const resolveBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (!envUrl) return PROD_BASE_URL
  return envUrl.replace(/\/+$/, '')
}

export const BASE_URL = resolveBaseUrl()

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach JWT
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
      config.transformRequest = [(data) => data]
    }
  } catch {}
  return config
})

// Response interceptor — token refresh on 401 & failover on Network Error
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Failover retry to production backend if a local IP threw a Network Error
    if (
      (!error.response || error.message === 'Network Error' || error.code === 'ERR_NETWORK') &&
      original &&
      !original._cloudRetry &&
      original.baseURL !== PROD_BASE_URL
    ) {
      original._cloudRetry = true
      original.baseURL = PROD_BASE_URL
      console.log('[API Client] Network failure on local URL, retrying via Cloud Backend:', PROD_BASE_URL)
      return api(original)
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token')
        if (!refresh) throw new Error('No refresh token')

        const res = await axios.post(`${PROD_BASE_URL}/auth/token/refresh`, {
          refresh_token: refresh,
        })
        const { access_token, refresh_token: newRefresh } = res.data.data
        await SecureStore.setItemAsync('access_token', access_token)
        await SecureStore.setItemAsync('refresh_token', newRefresh)

        original.headers.Authorization = `Bearer ${access_token}`
        return api(original)
      } catch {
        await SecureStore.deleteItemAsync('access_token')
        await SecureStore.deleteItemAsync('refresh_token')
        // TODO: navigate to login
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  sendOtp: (phone: string) =>
    api.post('/auth/otp/send', { phone: phone.trim(), role: 'customer' }),

  verifyOtp: (phone: string, otp_code: string, device_id?: string) =>
    api.post('/auth/otp/verify', { phone, otp_code, role: 'customer', device_id }),

  logout: (refresh_token: string, access_token_jti?: string) =>
    api.post('/auth/logout', { refresh_token, access_token_jti }),

  // Google Sign-In: sends id_token to backend for Firebase verification
  googleSignIn: (id_token: string) =>
    api.post('/auth/google/verify', { id_token, role: 'customer' }),
}

// Profile API
export const profileApi = {
  setup: (data: {
    full_name: string
    gender: string
    dob: string
    emergency_contact: string
  }) => api.post('/profile/setup', data),

  getMe: () => api.get('/profile/me'),
  updateMe: (data: object) => api.patch('/profile/me', data),
  uploadPhoto: (formData: FormData) =>
    api.post('/profile/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: () => api.delete('/profile/me/photo'),

  getAddresses: () => api.get('/profile/me/addresses'),
  addAddress: (data: {
    label: string
    address: string
    address_type?: string
    latitude?: number
    longitude?: number
    is_default?: boolean
  }) => api.post('/profile/me/addresses', {
    label: data.label,
    address_type: data.address_type || 'general',
    full_address: data.address,
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    is_default: data.is_default || false,
  }),
  updateAddress: (id: string, data: {
    label?: string
    address?: string
    address_type?: string
    latitude?: number
    longitude?: number
  }) =>
    api.patch(`/profile/me/addresses/${id}`, {
      label: data.label,
      address_type: data.address_type,
      full_address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
    }),
  deleteAddress: (id: string) => api.delete(`/profile/me/addresses/${id}`),

  // Convenience aliases used by service-preferences.tsx and other screens
  getProfile: () => api.get('/profile/me'),
  updateProfile: (data: object) => api.patch('/profile/me', data),
}

export const addressApi = profileApi
export const placesApi = profileApi

// Route API (saved pickup+drop pairs)
export const routeApi = {
  getRoutes: () => api.get('/profile/me/routes'),
  addRoute: (data: {
    route_name: string
    pickup_label: string
    pickup_address: string
    pickup_lat: number
    pickup_lon: number
    drop_label: string
    drop_address: string
    drop_lat: number
    drop_lon: number
  }) => api.post('/profile/me/routes', data),
  deleteRoute: (id: string) => api.delete(`/profile/me/routes/${id}`),
}

// Payment & Checkout API (Feature 11)
export const paymentApi = {
  createIntent: (data: {
    booking_id?: string
    ride_id?: string
    payment_method?: string
    saved_method_id?: string
    coupon_code?: string
    use_promo_credits?: boolean
    use_wallet_balance?: boolean
    idempotency_key?: string
  }) => api.post('/payments/create-intent', data),

  getMethods: () => api.get('/payments/methods'),

  addMethod: (data: {
    method_type: 'UPI' | 'CARD'
    masked_identifier: string
    token_reference: string
    display_title?: string
    card_network?: string
    card_expiry?: string
    is_default?: boolean
  }) => api.post('/payments/methods', data),

  setDefaultMethod: (methodId: string) =>
    api.patch(`/payments/methods/${methodId}/default`),

  deleteMethod: (methodId: string) =>
    api.delete(`/payments/methods/${methodId}`),

  getStatus: (orderId: string) =>
    api.get(`/payments/status/${orderId}`),

  requestRefund: (data: {
    transaction_id: string
    amount: number
    reason: string
    destination?: 'ORIGINAL_PAYMENT' | 'WALLET' | 'CREDITS'
    idempotency_key?: string
  }) => api.post('/payments/refund', data),

  validateCoupon: (code: string, booking_amount: number) =>
    api.post('/coupons/validate', { code, booking_amount }),

  applyReferral: (referral_code: string) =>
    api.post('/referrals/apply', null, { params: { referral_code } }),
}

// Unified Promotion & Campaign Engine API (Feature 13)
export const promotionApi = {
  getAvailable: (params?: { service_type?: string; pickup_lat?: number; pickup_lng?: number }) =>
    api.get('/promotions/available', { params }),

  applyPromo: (data: {
    code?: string
    campaign_id?: string
    booking_amount: number
    service_type?: string
    ride_id?: string
    pickup_lat?: number
    pickup_lng?: number
  }) => api.post('/promotions/apply', data),

  validateCode: (code: string, booking_amount: number) =>
    api.post('/promotions/apply', { code, booking_amount }),
}

// Multi-Bucket Wallet & Ledger API (Feature 12)
export const walletApi = {
  getSummary: () => api.get('/wallet/summary'),
  getBalance: () => api.get('/wallet'),
  getTransactions: (params?: { type?: string; page?: number; limit?: number }) =>
    api.get('/wallet/transactions', { params }),
  getLedger: (params?: { type?: string; page?: number; limit?: number }) =>
    api.get('/wallet/ledger', { params }),
  getRefunds: () => api.get('/wallet/refunds'),
  topUp: (data: { amount: number }) => api.post('/wallet/topup', data),
  verifyTopUp: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; amount: number }) =>
    api.post('/wallet/topup/verify', data),
  redeemPoints: (points: number) => api.post('/wallet/redeem-points', { points }),
  walletPay: (data: { booking_id?: string; ride_id?: string; amount: number; wallet_amount?: number; points_used?: number }) =>
    api.post('/payments/wallet-pay', data),
}

// Rating & Feedback API (Feature 14)
export const ratingApi = {
  rateDriver: (rideId: string, data: {
    rating: number
    compliments?: string[]
    complaint_tags?: string[]
    feedback?: string
    cleanliness_rating?: number
    driving_rating?: number
    behaviour_rating?: number
    vehicle_condition_rating?: number
  }) => api.post(`/matching/rides/${rideId}/rate-driver`, data),

  getCustomerSummary: () =>
    api.get('/matching/customer/ratings/summary'),
}

// Parcel API (Feature 15 Logistics)
export const parcelApi = {
  getQuote: (data: {
    sender_lat: number
    sender_lng: number
    receiver_lat: number
    receiver_lng: number
    weight_kg: number
    length_cm?: number
    width_cm?: number
    height_cm?: number
    package_count?: number
    vehicle_category?: string
    delivery_priority?: string
    is_fragile?: boolean
    is_valuable?: boolean
    declared_value?: number
    insurance_opt_in?: boolean
    promo_code?: string
  }) => api.post('/parcels/quote', data),

  createOrder: (data: {
    sender_name: string
    sender_phone: string
    sender_address: string
    sender_lat: number
    sender_lng: number
    pickup_instructions?: string
    receiver_name: string
    receiver_phone: string
    receiver_address: string
    receiver_lat: number
    receiver_lng: number
    delivery_instructions?: string
    parcel_category?: string
    description?: string
    package_count?: number
    weight_kg: number
    length_cm?: number
    width_cm?: number
    height_cm?: number
    is_fragile?: boolean
    is_valuable?: boolean
    declared_value?: number
    insurance_opt_in?: boolean
    vehicle_category?: string
    delivery_priority?: string
    payment_method?: string
    promo_code?: string
  }) => api.post('/parcels', data),

  getMyParcels: (params?: { limit?: number; offset?: number }) =>
    api.get('/parcels/my', { params }),

  getParcel: (id: string) =>
    api.get(`/parcels/${id}`),

  cancelParcel: (id: string, reason?: string) =>
    api.post(`/parcels/${id}/cancel`, { reason }),

  uploadPhoto: (id: string, formData: FormData) =>
    api.post(`/parcels/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

// Family API
export const familyApi = {
  getFamily: () => api.get('/family'),
  createFamily: (data: { family_name?: string; is_shared_payment_enabled?: boolean; shared_payment_method?: string; monthly_spending_limit?: number }) =>
    api.post('/family', data),
  addMember: (data: { name: string; phone: string; relationship?: string; can_use_shared_payment?: boolean; can_book_rides?: boolean; can_track_trips?: boolean }) =>
    api.post('/family/members', data),
  updateMember: (id: string, data: { name?: string; relationship?: string; can_use_shared_payment?: boolean; can_book_rides?: boolean; can_track_trips?: boolean; status?: string }) =>
    api.patch(`/family/members/${id}`, data),
  removeMember: (id: string) => api.delete(`/family/members/${id}`),
  updatePaymentSettings: (data: { is_shared_payment_enabled?: boolean; shared_payment_method?: string; monthly_spending_limit?: number }) =>
    api.patch('/family/payment-settings', data),
}

// Emergency Contacts API
export const emergencyApi = {
  getContacts: () => api.get('/customer/emergency-contacts'),
  addContact: (data: { name: string; phone: string; relationship?: string; is_primary?: boolean; auto_share_rides?: boolean }) =>
    api.post('/customer/emergency-contacts', data),
  updateContact: (id: string, data: { name?: string; phone?: string; relationship?: string; is_primary?: boolean; auto_share_rides?: boolean }) =>
    api.patch(`/customer/emergency-contacts/${id}`, data),
  deleteContact: (id: string) => api.delete(`/customer/emergency-contacts/${id}`),
}

// Customer Settings & Sessions API
export const settingsApi = {
  getSettings: () => api.get('/customer'),
  updateSettings: (data: {
    notifications_ride_updates?: boolean
    notifications_driver_arrival?: boolean
    notifications_promotions?: boolean
    notifications_security_alerts?: boolean
    privacy_location_sharing?: boolean
    privacy_family_trip_tracking?: boolean
    privacy_personalized_ads?: boolean
    language?: string
  }) => api.patch('/customer', data),
  getSessions: () => api.get('/customer/sessions'),
  revokeSession: (sessionId: string) => api.delete(`/customer/sessions/${sessionId}`),
  revokeAllSessions: () => api.post('/customer/sessions/revoke-all'),
  deleteAccount: (reason?: string) => api.post('/customer/account/delete', { confirmation: true, reason }),
}

// Booking API
export const bookingApi = {
  getMyTrips: () => api.get('/bookings/my-trips'),
  getBooking: (id: string) => api.get(`/bookings/${id}`),
  cancelBooking: (id: string, reason: string) =>
    api.post(`/bookings/${id}/cancel`, { reason }),
  /**
   * Full modification contract for Feature 4 scheduled reservations.
   * client_version enables optimistic concurrency (backend returns 409 if stale).
   */
  modifyBooking: (id: string, data: {
    new_scheduled_pickup_time?: string   // ISO8601 UTC
    timezone?: string                    // e.g. 'Asia/Kolkata'
    new_category_name?: string
    new_pickup_address?: string
    new_pickup_lat?: number
    new_pickup_lng?: number
    new_destination_address?: string
    new_destination_lat?: number
    new_destination_lng?: number
    client_version?: number              // For 409 conflict detection
    reason?: string
  }) => api.patch(`/bookings/${id}/modify`, data),
  createPendingBooking: (data: object) => api.post('/bookings/pending', data),
  deletePendingBooking: (id: string) => api.delete(`/bookings/pending/${id}`),
}

// Home & Service Discovery API (Feature 2)
export const homeApi = {
  getSummary: () => api.get('/customer/home/summary'),
}

export const servicesApi = {
  getCatalog: () => api.get('/services/catalog'),
}

// Fare & Ride Estimation API (Feature 3)
export const fareApi = {
  calculate: (data: {
    from_lat: number
    from_lng: number
    to_lat: number
    to_lng: number
    departure_time: string
    seats?: number
    with_parcel?: boolean
    window_seat?: boolean
  }) => api.post('/bookings/fare', data),
  applyCoupon: (code: string, fareAmount: number) =>
    api.post('/bookings/fare/apply-coupon', { code, fare_amount: fareAmount }),
}

// Matching & Ride Dispatch API
export const matchingApi = {
  requestRide: (data: object) => api.post('/matching/request', data),
  // Fetch actual nearby online drivers for the radar display
  // GET /rides/search-drivers — customer-facing nearby drivers (same auth as get_current_user)
  getNearbyDrivers: (params: {
    pickup_lat: number
    pickup_lng: number
    radius_km?: number
    service_type?: string
  }) => api.post('/rides/search-nearby-for-matching', params),
  searchNearbyForMatching: (data: {
    pickup_lat: number
    pickup_lng: number
    ride_request_id?: string
    radius_km?: number
  }) => api.post('/rides/search-nearby-for-matching', data),
  reDispatch: (data: {
    ride_request_id: string
    expanded_radius_km?: number
  }) => api.post('/rides/re-dispatch', data),
  getPendingRequests: (params: {
    latitude: number
    longitude: number
    radius_km?: number
  }) => api.get('/rides/pending-requests', { params }),
}

// Favourite Drivers API (Production-grade)
export const favoriteDriverApi = {
  list: () => api.get('/profile/me/favorite-drivers'),
  add: (driverId: string) => api.post(`/profile/me/favorite-drivers/${driverId}`),
  remove: (driverId: string) => api.delete(`/profile/me/favorite-drivers/${driverId}`),
}

// Ride Dispatch & Dynamic Categories API (Feature 3 & Feature 4)
export const rideApi = {
  getCategories: () => api.get('/rides/categories'),
  estimateFare: (data: {
    pickup_lat: number
    pickup_lng: number
    dest_lat: number
    dest_lng: number
    category_name?: string
    stops?: Array<{ lat: number; lng: number; address: string }>
  }) => api.post('/rides/estimate', data),
  createRequest: (data: {
    request_id?: string
    pickup_lat: number
    pickup_lng: number
    pickup_address: string
    destination_lat: number
    destination_lng: number
    destination_address: string
    category_name?: string
    seats_requested?: number
    seat_preferences?: object
    stops?: Array<{ sequence: number; lat: number; lng: number; address: string }>
    pickup_notes?: string
    rider_type?: string
    rider_name?: string
    rider_phone?: string
    is_booked_for_other?: boolean
    payment_method?: string
    is_scheduled?: boolean
    scheduled_pickup_time?: string  // ISO8601 UTC
    timezone?: string               // Device timezone e.g. 'Asia/Kolkata' — Feature 4
    scheduled_status?: string
    // Feature 5: Negotiation / Own Fare Model
    pricing_mode?: 'STANDARD' | 'NEGOTIATED'
    customer_offer_amount?: number  // Customer's proposed fare (only when pricing_mode=NEGOTIATED)
    negotiation_idempotency_key?: string  // Client-side dedup key
    // Favourite driver priority
    preferred_driver_ids?: string[]
    service_type?: string  // local, premium, luxury, outstation
  }) => api.post('/rides/request', data),
}

// Schedule Config API (Feature 4)
export const scheduleApi = {
  /**
   * Fetch scheduling configuration from backend.
   * Returns: { min_lead_time_minutes, max_advance_booking_days, operating_hours_start, operating_hours_end }
   * Used to enforce proper scheduling window without frontend hardcoding.
   */
  getConfig: () => api.get('/rides/schedule-config'),
}

// Negotiation & Own Fare Model API (Feature 5)
export const negotiationApi = {
  /**
   * Fetch current negotiation state for a ride request (for reconnect restore).
   * Returns: { offers: DriverOfferItem[], session_status, expires_at }
   */
  getNegotiationState: (rideRequestId: string) =>
    api.get(`/matching/rides/${rideRequestId}/negotiation-state`),

  /** List all pending driver offers for a negotiation session */
  getOffers: (rideRequestId: string) =>
    api.get(`/matching/rides/${rideRequestId}/offers`),

  /**
   * Customer accepts a driver's offer (exact match, competitive, or counter).
   * Backend atomically assigns driver and invalidates all competing offers.
   */
  acceptOffer: (rideRequestId: string, offerId: string) =>
    api.post(`/matching/rides/${rideRequestId}/offers/${offerId}/accept`),

  /**
   * Customer rejects a driver's offer/counter-offer.
   * Offer remains visible to other potential drivers.
   */
  rejectOffer: (rideRequestId: string, offerId: string) =>
    api.post(`/matching/rides/${rideRequestId}/offers/${offerId}/reject`),

  /**
   * Customer accepts a driver's counter-offer specifically.
   * Semantically same as acceptOffer but logged as counter-response for audit trail.
   */
  acceptCounterOffer: (rideRequestId: string, offerId: string) =>
    api.post(`/matching/rides/${rideRequestId}/offers/${offerId}/accept-counter`),

  /**
   * Customer rejects a driver's counter-offer.
   * Driver's offer status → REJECTED; customer stays in negotiation.
   */
  rejectCounterOffer: (rideRequestId: string, offerId: string) =>
    api.post(`/matching/rides/${rideRequestId}/offers/${offerId}/reject-counter`),

  /**
   * Customer triggers auto-match fallback after negotiation failure.
   * Backend switches ride to standard dispatch mode.
   */
  fallbackToStandard: (rideRequestId: string) =>
    api.post(`/matching/rides/${rideRequestId}/fallback`),

  /**
   * Customer explicitly cancels the negotiation session.
   * Closes all pending offers; ride state → CANCELLED.
   */
  cancelNegotiation: (rideRequestId: string, reason?: string) =>
    api.post(`/matching/rides/${rideRequestId}/cancel`, { reason }),
}

// Live Driver Tracking & Telemetry API (Feature 6)
export const trackingApi = {
  /**
   * Fetch driver's latest authoritative location for a trip.
   * Primary is WebSocket (LOCATION_UPDATE); this serves as REST fallback.
   */
  getLatestLocation: (tripId: string) =>
    api.get(`/matching/tracking/trip/${tripId}/current`),

  /**
   * Fetch full historical GPS route polyline for an active or completed trip.
   */
  getTripRoute: (tripId: string, limit = 500) =>
    api.get(`/matching/tracking/trip/${tripId}/route`, { params: { limit } }),
}

// Safety & Trip Sharing API (Feature 9 & 22)
export const safetyApi = {
  /**
   * Authoritative Emergency SOS trigger with PostGIS location snapshot and 112 escalation.
   */
  triggerSOS: (data: { ride_id: string; latitude: number; longitude: number; accuracy?: number; reason?: string }) =>
    api.post('/matching/safety/sos', data),

  /**
   * Generate a short-lived tokenized trip share link.
   * Token automatically expires when trip completes.
   */
  shareTrip: (rideId: string) =>
    api.post(`/matching/safety/rides/${rideId}/share`),

  /**
   * Public tracking by share token (read-only telemetry).
   */
  getSharedTrip: (shareToken: string) =>
    api.get(`/matching/safety/share/${shareToken}`),

  /**
   * Acknowledge/Resolve safety alert anomaly ("I'm Safe").
   */
  resolveSafetyAlert: (alertId: string, resolutionType: 'IM_SAFE' | 'DISMISSED' | 'SUPPORT_CALL' = 'IM_SAFE') =>
    api.post(`/matching/safety/alerts/${alertId}/resolve`, { resolution_type: resolutionType }),

  /**
   * Report in-ride or post-trip safety incident.
   */
  reportIncident: (data: { ride_id: string; category: string; description: string }) =>
    api.post(`/matching/customer/rides/${data.ride_id}/report-issue`, data),
}

// Trip Completion, Ratings, Tips & Post-Trip API (Feature 10)
export const tripCompletionApi = {
  /**
   * Fetch authoritative itemized receipt for a completed ride.
   */
  getReceipt: (rideId: string) =>
    api.get(`/matching/customer/rides/${rideId}/receipt`),

  /**
   * Submit 1-5 star driver rating with structured compliments and optional feedback.
   */
  rateDriver: (rideId: string, data: { rating: number; compliments?: string[]; complaint_tags?: string[]; feedback?: string }) =>
    api.post(`/matching/rides/${rideId}/rate-driver`, data),

  /**
   * Add post-trip driver tip credited directly to driver ledger.
   */
  addTip: (rideId: string, data: { tip_amount: number; idempotency_key?: string; payment_method?: string }) =>
    api.post(`/matching/rides/${rideId}/tip`, data),

  /**
   * Report an item lost in vehicle.
   */
  reportLostItem: (rideId: string, data: { item_category: string; description: string; contact_phone?: string }) =>
    api.post(`/matching/customer/rides/${rideId}/lost-item`, data),

  /**
   * Report a general post-trip issue (fare dispute, driver behavior, route).
   */
  reportTripIssue: (rideId: string, data: { category: string; description: string }) =>
    api.post(`/matching/customer/rides/${rideId}/report-issue`, data),
}

// During Ride API (Feature 7 & 8)
export const duringRideApi = {
  /**
   * Add intermediate waypoint stop to active trip. Max 3 stops, +₹30 stop fee.
   */
  addStop: (rideId: string, data: { address: string; latitude: number; longitude: number }) =>
    api.post(`/matching/rides/${rideId}/stops`, data),

  /**
   * Modify destination during active trip. Recalculates fare and updates driver navigation.
   */
  modifyDestination: (rideId: string, data: { destination_address: string; destination_lat: number; destination_lng: number }) =>
    api.post(`/matching/rides/${rideId}/destination`, data),

  /**
   * Fetch server-authoritative live waiting status & accumulated waiting charges.
   */
  getWaitingStatus: (rideId: string) =>
    api.get(`/matching/rides/${rideId}/waiting-status`),

  /**
   * Report pickup issue or wrong driver/vehicle before ride start.
   */
  reportPickupIssue: (rideId: string, data: { issue_type: string; notes?: string }) =>
    api.post(`/matching/rides/${rideId}/pickup-issue`, data),
}

// In-App Communication API (Feature 8 & 19)
export const communicationApi = {
  /**
   * Send real-time in-app message to assigned driver.
   */
  sendMessage: (data: { ride_id: string; message_text: string }) =>
    api.post('/matching/communication/messages', data),

  /**
   * Fetch chat history for an active ride.
   */
  getMessages: (rideId: string) =>
    api.get('/matching/communication/messages', { params: { ride_id: rideId } }),

  /**
   * Mark received messages as read.
   */
  markMessagesRead: (data: { ride_id: string; message_ids: string[] }) =>
    api.post('/matching/communication/messages/read', data),

  /**
   * Initiate secure masked proxy call to assigned driver.
   */
  initiateMaskedCall: (data: { ride_id: string }) =>
    api.post('/matching/communication/calls/initiate', data),
}

// Hotel Booking & Stays API (Feature 16)
export const hotelApi = {
  /**
   * Search hotels with PostGIS spatial radius, city, multi-filters, and price aggregation.
   */
  searchHotels: (params: {
    city?: string
    q?: string
    check_in?: string
    check_out?: string
    adults?: number
    rooms?: number
    min_price?: number
    max_price?: number
    star_ratings?: string
    amenities?: string
    policies?: string
    property_type?: string
    lat?: number
    lng?: number
    radius_km?: number
    sort_by?: string
    page?: number
    page_size?: number
  }) => api.get('/hotels/search', { params }),

  /**
   * Fetch featured and top-rated hotels for the home discovery feed.
   */
  getFeaturedHotels: (city?: string) =>
    api.get('/hotels/featured', { params: { city } }),

  /**
   * Fetch single hotel metadata, photo gallery, policies, and room tiers.
   */
  getHotelDetails: (
    propertyId: string,
    params?: { check_in?: string; check_out?: string; guests?: number }
  ) => api.get(`/hotels/${propertyId}`, { params }),

  /**
   * Calculate authoritative room quote with GST tax breakdown and add-ons.
   */
  getRoomQuote: (
    unitId: string,
    data: {
      check_in: string
      check_out: string
      rooms_count?: number
      guests_count?: number
      add_on_codes?: string[]
      promo_code?: string
    }
  ) => api.post(`/hotels/${unitId}/quote`, data),

  /**
   * Create confirmed hotel reservation with room lock and wallet settlement.
   */
  createBooking: (data: {
    unit_id: string
    check_in: string
    check_out: string
    primary_guest_name: string
    primary_guest_phone: string
    primary_guest_email?: string
    rooms_count?: number
    guests_count?: number
    special_requests?: string
    add_on_codes?: string[]
    payment_method?: string
    promo_code?: string
    idempotency_key?: string
    additional_guests?: { name: string; age: number }[]
  }) => api.post('/hotels/book', data),

  /**
   * Retrieve all hotel bookings and stay history for the logged-in customer.
   */
  getMyBookings: () => api.get('/hotels/my-bookings'),

  /**
   * Get single confirmed hotel booking voucher and stay status.
   */
  getBookingDetails: (bookingId: string) => api.get(`/hotels/bookings/${bookingId}`),

  /**
   * Cancel hotel reservation with automated refund settlement to customer wallet.
   */
  cancelBooking: (bookingId: string, reason?: string) =>
    api.post(`/hotels/bookings/${bookingId}/cancel`, { reason }),

  /**
   * Cross-Service Bridge: Create linked Airport/Hotel cab ride.
   */
  linkAirportRide: (
    bookingId: string,
    data: {
      ride_direction?: string
      airport_name?: string
      airport_lat?: number
      airport_lng?: number
      scheduled_time?: string
      vehicle_type?: string
      flight_number?: string
    }
  ) => api.post(`/hotels/bookings/${bookingId}/link-ride`, data),
}

// ── FEATURE 17: TRANSPORT & COMMERCIAL LOGISTICS API ─────────────────────────
export const transportApi = {
  /**
   * Calculate authoritative pricing quote + capacity checks for heavy goods transport.
   */
  getEstimate: (data: {
    pickup_lat: number
    pickup_lng: number
    drop_lat: number
    drop_lng: number
    goods_category?: string
    goods_description?: string
    weight_kg: number
    length_ft?: number
    width_ft?: number
    height_ft?: number
    package_count?: number
    loading_required?: boolean
    unloading_required?: boolean
    helpers_count?: number
    vehicle_category?: string
    declared_value?: number
    promo_code?: string
  }) => api.post('/transport/estimate', data),

  /**
   * Create commercial goods transport order (Instant Price or Transporter Quotes).
   */
  createOrder: (data: {
    pickup_address: string
    pickup_lat: number
    pickup_lng: number
    pickup_contact_name: string
    pickup_contact_phone: string
    drop_address: string
    drop_lat: number
    drop_lng: number
    drop_contact_name: string
    drop_contact_phone: string
    goods_category?: string
    goods_description: string
    weight_kg: number
    length_ft?: number
    width_ft?: number
    height_ft?: number
    package_count?: number
    loading_required?: boolean
    unloading_required?: boolean
    helpers_count?: number
    vehicle_category_required?: string
    pricing_mode?: string
    schedule_type?: string
    scheduled_pickup_time?: string
    pickup_notes?: string
    drop_notes?: string
    special_instructions?: string
    declared_value?: number
    fragile_handling?: boolean
    payment_method?: string
    promo_code?: string
  }) => api.post('/transport/orders', data),

  /**
   * Get transport order details, loading progress, and driver tracking telemetry.
   */
  getOrderDetails: (orderId: string) => api.get(`/transport/orders/${orderId}`),

  /**
   * Get all active and completed transport orders for the customer.
   */
  getMyOrders: () => api.get('/transport/my-orders'),

  /**
   * Transporter submits commercial quote.
   */
  submitQuote: (
    orderId: string,
    data: {
      driver_id: string
      vehicle_id: string
      amount: number
      included_helpers?: number
      estimated_pickup_eta_min?: number
      estimated_transit_duration_min?: number
    }
  ) => api.post(`/transport/orders/${orderId}/quote`, data),

  /**
   * Get list of competitive transporter quotes submitted for an order.
   */
  getOrderQuotes: (orderId: string) => api.get(`/transport/orders/${orderId}/quotes`),

  /**
   * Send negotiation counter-offer.
   */
  sendCounterOffer: (
    quoteId: string,
    data: {
      actor_type?: string
      counter_amount: number
      note?: string
    }
  ) => api.post(`/transport/quotes/${quoteId}/counter`, data),

  /**
   * Customer selects winning transporter quote and locks order.
   */
  selectQuote: (
    orderId: string,
    data: {
      quote_id: string
      payment_method?: string
    }
  ) => api.post(`/transport/orders/${orderId}/select-quote`, data),

  /**
   * Update transport operational execution state.
   */
  updateStatus: (
    orderId: string,
    data: {
      driver_user_id?: string
      next_status: string
      notes?: string
      latitude?: number
      longitude?: number
    }
  ) => api.post(`/transport/orders/${orderId}/status`, data),

  /**
   * Verify Receiver OTP, record POD certificate, and complete transport.
   */
  verifyPOD: (
    orderId: string,
    data: {
      driver_id: string
      receiver_name: string
      receiver_phone: string
      delivery_otp: string
      photo_url?: string
      signature_url?: string
      delivery_notes?: string
      latitude?: number
      longitude?: number
    }
  ) => api.post(`/transport/orders/${orderId}/verify-pod`, data),
}

// ── FEATURE 18: AIRPORT SERVICE & FLIGHT-AWARE LOGISTICS API ────────────────
export const airportApi = {
  /**
   * List all serviceable airport hubs.
   */
  listAirports: () => api.get('/airport/list'),

  /**
   * List terminals for a specific airport.
   */
  getAirportTerminals: (airportId: string) => api.get(`/airport/${airportId}/terminals`),

  /**
   * Authoritatively lookup verified flight schedule & status.
   */
  lookupFlight: (flightNumber: string, flightDate?: string) =>
    api.get('/flight/lookup', { params: { flight_number: flightNumber, flight_date: flightDate } }),

  /**
   * Calculate flight-aware pricing estimate + recommended pickup window.
   */
  getEstimate: (data: {
    airport_id: string
    transfer_type?: 'PICKUP' | 'DROP'
    vehicle_category?: string
    distance_km?: number
    flight_number?: string
    flight_date?: string
    passenger_count?: number
    large_luggage_count?: number
    cabin_luggage_count?: number
    child_seat_count?: number
    meet_and_greet?: boolean
    promo_code?: string
  }) => api.post('/airport/estimate', data),

  /**
   * Create confirmed flight-aware airport booking with driver reservation.
   */
  createBooking: (data: {
    airport_id: string
    terminal_id?: string
    transfer_type?: 'PICKUP' | 'DROP'
    vehicle_category?: string
    distance_km?: number
    flight_number?: string
    flight_date?: string
    passenger_count?: number
    large_luggage_count?: number
    cabin_luggage_count?: number
    child_seat_count?: number
    meet_and_greet_required?: boolean
    meet_and_greet_name?: string
    special_instructions?: string
    pickup_address: string
    pickup_lat: number
    pickup_lng: number
    drop_address: string
    drop_lat: number
    drop_lng: number
    payment_method?: string
    promo_code?: string
    linked_hotel_booking_id?: string
  }) => api.post('/airport/book', data),

  /**
   * Retrieve full booking voucher and live driver/waiting tracking.
   */
  getBookingDetails: (bookingId: string) => api.get(`/airport/booking/${bookingId}`),

  /**
   * Driver registers arrival at airport terminal pickup zone.
   */
  driverArrived: (bookingId: string, driverId: string) =>
    api.post(`/airport/booking/${bookingId}/driver-arrived`, { driver_id: driverId }),

  /**
   * Cancel airport booking with 100% wallet refund.
   */
  cancelBooking: (bookingId: string, reason?: string) =>
    api.post(`/airport/booking/${bookingId}/cancel`, { reason }),

  /**
   * Simulate flight update webhook from provider.
   */
  simulateFlightUpdate: (data: {
    flight_number: string
    flight_date?: string
    status: string
    delay_minutes?: number
    gate?: string
    terminal?: string
  }) => api.post('/airport/webhook/flight-update', data),
}

// ── FEATURE 19: RENTAL / HOURLY SERVICE API ──────────────────────────────────
export const rentalApi = {
  /**
   * List backend-configured rental plans. Prices are server-authoritative.
   */
  listPlans: (vehicle_category?: string) =>
    api.get('/rental/plans', { params: { vehicle_category } }),

  /**
   * Calculate itemized fare estimate for a rental plan.
   */
  estimate: (data: {
    plan_id: string
    vehicle_category?: string
    custom_duration_minutes?: number
    promo_code?: string
  }) => api.post('/rental/estimate', data),

  /**
   * Create confirmed rental booking with driver assignment and wallet hold.
   */
  createBooking: (data: {
    plan_id: string
    vehicle_category?: string
    pickup_address: string
    pickup_lat: number
    pickup_lng: number
    custom_duration_minutes?: number
    promo_code?: string
    payment_method?: string
    company_id?: string
    membership_id?: string
    department_id?: string
    is_business_trip?: boolean
    business_purpose?: string
  }) => api.post('/rental/book', data),

  /**
   * Get full rental booking details including live timer state.
   * Frontend renders elapsed time as: now() - actual_start_time (from server).
   */
  getBooking: (bookingId: string) => api.get(`/rental/booking/${bookingId}`),

  /**
   * Get the currently active rental for the authenticated customer.
   */
  getActive: () => api.get('/rental/active'),

  /**
   * Driver starts rental — backend records authoritative start time.
   * Phone clock is NOT used. Frontend computes elapsed as: now() - actual_start_time.
   */
  startRental: (bookingId: string, data: { driver_id: string; otp?: string }) =>
    api.post(`/rental/booking/${bookingId}/start`, data),

  /**
   * Backend receives GPS-derived cumulative KM. Returns live meter state.
   */
  updateKm: (bookingId: string, data: { current_lat: number; current_lng: number; current_km: number }) =>
    api.post(`/rental/booking/${bookingId}/km-update`, data),

  /**
   * Customer adds stop during active rental. Driver notified via Socket.IO.
   */
  addStop: (bookingId: string, data: { address: string; latitude: number; longitude: number }) =>
    api.post(`/rental/booking/${bookingId}/add-stop`, data),

  /**
   * Driver completes rental — backend calculates final fare with all charges.
   */
  completeRental: (bookingId: string, data: { driver_id: string; final_km: number; toll_charge?: number; parking_charge?: number }) =>
    api.post(`/rental/booking/${bookingId}/complete`, data),

  /**
   * Cancel rental booking with full wallet refund (if not yet started).
   */
  cancelRental: (bookingId: string, reason?: string) =>
    api.post(`/rental/booking/${bookingId}/cancel`, { reason }),
}

// ── FEATURE 20: OUTSTATION / INTERCITY SERVICE API ───────────────────────────
export const outstationApi = {
  /**
   * Calculate outstation fare estimate (One-Way / Round-Trip / Multi-City).
   * Returns full breakdown: base + toll + state_tax + night_halt + driver_allowance + GST.
   */
  estimate: (data: {
    journey_type: 'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_CITY'
    origin_lat: number
    origin_lng: number
    destination_lat: number
    destination_lng: number
    vehicle_category?: string
    scheduled_departure: string
    return_date?: string
    additional_legs?: Array<{ from_address: string; from_lat: number; from_lng: number; to_address: string; to_lat: number; to_lng: number }>
    promo_code?: string
    passenger_count?: number
  }) => api.post('/outstation/estimate', data),

  /**
   * Create outstation booking. Driver commits to full journey (all legs + return).
   */
  createBooking: (data: {
    journey_type: 'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_CITY'
    vehicle_category?: string
    passenger_count?: number
    luggage_count?: number
    origin_address: string
    origin_lat: number
    origin_lng: number
    destination_address: string
    destination_lat: number
    destination_lng: number
    scheduled_departure: string
    return_date?: string
    additional_legs?: Array<{ from_address: string; from_lat: number; from_lng: number; to_address: string; to_lat: number; to_lng: number }>
    promo_code?: string
    payment_method?: string
    special_instructions?: string
    company_id?: string
    membership_id?: string
    department_id?: string
    is_business_trip?: boolean
    business_purpose?: string
  }) => api.post('/outstation/book', data),

  /**
   * Retrieve full outstation booking with legs, charges, and driver info.
   */
  getBooking: (bookingId: string) => api.get(`/outstation/booking/${bookingId}`),

  /**
   * Update journey leg status (scheduled → in_progress → completed).
   */
  updateLegStatus: (bookingId: string, legId: string, data: { new_status: string; current_lat?: number; current_lng?: number }) =>
    api.post(`/outstation/booking/${bookingId}/leg/${legId}/status`, data),

  /**
   * Submit platform-verified charge (toll, parking, state_tax).
   * Customer must approve before it's added to final fare.
   */
  addCharge: (bookingId: string, data: { charge_type: string; amount: number; description?: string; evidence_url?: string; state_name?: string }) =>
    api.post(`/outstation/booking/${bookingId}/charge`, data),

  /**
   * Complete outstation trip. Backend calculates final fare with all approved charges.
   */
  completeTrip: (bookingId: string, data: { driver_id: string; final_km: number }) =>
    api.post(`/outstation/booking/${bookingId}/complete`, data),

  /**
   * Cancel outstation booking with wallet refund (if not yet in-progress).
   */
  cancelTrip: (bookingId: string, reason?: string) =>
    api.post(`/outstation/booking/${bookingId}/cancel`, { reason }),
}

// ── FEATURE 21: CORPORATE CUSTOMER API ───────────────────────────────────────
export const corporateApi = {
  /**
   * Create corporate account. Creator becomes Company Admin.
   */
  createCompany: (data: {
    legal_name: string
    display_name?: string
    gstin?: string
    billing_email: string
    billing_phone?: string
    billing_address?: string
    city?: string
    state?: string
    industry?: string
  }) => api.post('/corporate/companies', data),

  /**
   * Get the authenticated customer's active corporate account + role.
   */
  getMyCompany: () => api.get('/corporate/companies/my'),

  /**
   * Invite employee to company. Must be Company Admin or Travel Admin.
   */
  inviteEmployee: (companyId: string, data: { phone: string; employee_code?: string; department_id?: string; role?: string }) =>
    api.post(`/corporate/companies/${companyId}/invite`, data),

  /**
   * Accept a company invitation.
   */
  acceptInvitation: (membershipId: string) =>
    api.post(`/corporate/memberships/${membershipId}/accept`),

  /**
   * Get all corporate memberships for the authenticated customer.
   */
  getMyMemberships: () => api.get('/corporate/memberships/my'),

  /**
   * List company members. Company Admin / Travel Admin only.
   */
  listMembers: (companyId: string, membershipId: string) =>
    api.get(`/corporate/companies/${companyId}/members`, { params: { membership_id: membershipId } }),

  /**
   * Backend policy engine check.
   * NEVER hardcode policy logic in frontend — always call this endpoint.
   * Returns: { allowed, requires_approval, reason }
   */
  checkPolicy: (data: {
    company_id: string
    membership_id: string
    service_type: string
    vehicle_category?: string
    estimated_fare: number
    is_personal?: boolean
  }) => api.post('/corporate/policy-check', data),

  /**
   * Create approval request for above-threshold booking.
   */
  createApprovalRequest: (data: {
    company_id: string
    membership_id: string
    service_type: string
    estimated_fare: number
    purpose: string
    department_id?: string
    booking_details?: Record<string, unknown>
  }) => api.post('/corporate/approval-requests', data),

  /**
   * Approver responds to approval request.
   * Concurrent double-approval prevented server-side via SELECT FOR UPDATE.
   */
  respondToApproval: (approvalId: string, membershipId: string, data: { decision: 'approved' | 'rejected'; note?: string }) =>
    api.post(`/corporate/approval-requests/${approvalId}/respond`, data, { params: { approver_membership_id: membershipId } }),

  /**
   * Get approval requests pending the authenticated approver's action.
   */
  getPendingApprovals: (membershipId: string) =>
    api.get('/corporate/approval-requests/pending', { params: { approver_membership_id: membershipId } }),

  /**
   * Get approval requests submitted by the authenticated employee.
   */
  getMyApprovalRequests: (membershipId: string) =>
    api.get('/corporate/approval-requests/my', { params: { membership_id: membershipId } }),

  /**
   * Corporate wallet balance + transactions.
   * Completely separate from customer personal wallet.
   * Only FINANCE and COMPANY_ADMIN can view.
   */
  getCorporateWallet: (companyId: string, membershipId: string) =>
    api.get(`/corporate/companies/${companyId}/wallet`, { params: { membership_id: membershipId } }),

  /**
   * Top up corporate wallet. COMPANY_ADMIN / FINANCE only.
   */
  topupCorporateWallet: (companyId: string, membershipId: string, amount: number) =>
    api.post(`/corporate/companies/${companyId}/wallet/topup`, { amount }, { params: { membership_id: membershipId } }),

  /**
   * List corporate invoices (monthly billing). FINANCE / COMPANY_ADMIN / TRAVEL_ADMIN.
   */
  getInvoices: (companyId: string, membershipId: string) =>
    api.get(`/corporate/companies/${companyId}/invoices`, { params: { membership_id: membershipId } }),

  /**
   * Get invoice with full line items breakdown.
   */
  getInvoiceDetail: (invoiceId: string, membershipId: string) =>
    api.get(`/corporate/invoices/${invoiceId}`, { params: { membership_id: membershipId } }),

  /**
   * Generate monthly consolidated invoice.
   */
  generateInvoice: (companyId: string, membershipId: string, billing_month: string) =>
    api.post('/corporate/invoices/generate', { company_id: companyId, billing_month }, { params: { membership_id: membershipId } }),

  /**
   * Expense report aggregated by service type and department.
   */
  getExpenseReport: (data: { company_id: string; membership_id: string; period_start?: string; period_end?: string; department_id?: string }) =>
    api.post('/corporate/expense-report', data),
}

// ── FEATURE 22: BOOK FOR SOMEONE ELSE / RIDERS API ───────────────────────────
export const riderApi = {
  /**
   * List available booking participants: Myself, Family members, Saved Guests, Corporate identities.
   */
  listParticipants: () => api.get('/customer/riders'),

  /**
   * Save a guest/friend contact for quick reuse in booking.
   */
  createSavedRider: (data: { name: string; phone: string; relationship_type?: string; is_favorite?: boolean }) =>
    api.post('/customer/riders/saved', data),

  /**
   * Delete a saved contact.
   */
  deleteSavedRider: (riderId: string) =>
    api.delete(`/customer/riders/saved/${riderId}`),
}

// ── FEATURE 23: UNIFIED ACTIVITY / HISTORY API ───────────────────────────────
export const activityApi = {
  /**
   * Get polymorphic activity feed across all 8 services with status tabs and pagination.
   */
  getActivity: (params?: { category?: string; status_filter?: string; limit?: number; offset?: number }) =>
    api.get('/customer/activity', { params }),

  /**
   * Get detailed activity item with receipt and support link.
   */
  getActivityDetail: (referenceType: string, referenceId: string) =>
    api.get(`/customer/activity/${referenceType}/${referenceId}`),
}

// ── FEATURE 24: NOTIFICATION CENTER API ──────────────────────────────────────
export const notificationApi = {
  /**
   * Get notification feed with optional category filter.
   */
  getNotifications: (params?: { category?: string; unread_only?: boolean; limit?: number; offset?: number }) =>
    api.get('/notifications', { params }),

  /**
   * Get unread badge count for header bell icon.
   */
  getUnreadCount: () => api.get('/notifications/unread-count'),

  /**
   * Mark single notification as read.
   */
  markAsRead: (notificationId: string) =>
    api.post(`/notifications/${notificationId}/read`),

  /**
   * Mark all unread notifications as read.
   */
  markAllAsRead: () => api.post('/notifications/mark-all-read'),

  /**
   * Dismiss / Delete single notification.
   */
  deleteNotification: (notificationId: string) =>
    api.delete(`/notifications/${notificationId}`),

  /**
   * Simulate a test notification (Dev Mode).
   */
  simulate: (data: { title: string; body: string; notification_type?: string; deep_link?: string; reference_type?: string; reference_id?: string }) =>
    api.post('/notifications/simulate', data),
}

// ── FEATURE 25: UNIFIED SUPPORT & HELP HUB API ───────────────────────────────
export const supportApi = {
  /**
   * Get searchable FAQ articles list.
   */
  getFAQs: (params?: { category?: string; query?: string }) =>
    api.get('/support/faq', { params }),

  /**
   * Vote on FAQ helpfulness.
   */
  voteFAQ: (faqId: string, is_helpful: boolean) =>
    api.post(`/support/faq/${faqId}/vote`, { is_helpful }),

  /**
   * List customer's support tickets.
   */
  getTickets: (status_filter?: string) =>
    api.get('/support/tickets', { params: { status_filter } }),

  /**
   * Create service-linked support ticket.
   */
  createTicket: (data: {
    category: string
    subcategory?: string
    subject: string
    description: string
    reference_type?: string
    reference_id?: string
    priority?: string
  }) => api.post('/support/tickets', data),

  /**
   * Get ticket details and conversation thread.
   */
  getTicketDetail: (ticketId: string) =>
    api.get(`/support/tickets/${ticketId}`),

  /**
   * Send message in ticket thread.
   */
  sendMessage: (ticketId: string, data: { message_text: string; attachments?: string[] }) =>
    api.post(`/support/tickets/${ticketId}/messages`, data),

  /**
   * Escalate ticket to urgent supervisor review.
   */
  escalateTicket: (ticketId: string) =>
    api.post(`/support/tickets/${ticketId}/escalate`),

  /**
   * Context-bounded AI Support Assistant chat.
   */
  chatAI: (data: { message: string; reference_type?: string; reference_id?: string; context_topic?: string }) =>
    api.post('/support/ai/chat', data),
}

// ── FEATURE 26: CUSTOMER SECURITY & TRUST ARCHITECTURE API ───────────────────
export interface DeviceItem {
  id: string
  device_id: string
  platform: string
  device_model?: string
  os_version?: string
  app_version?: string
  trust_status: 'NEW' | 'PENDING_VERIFICATION' | 'TRUSTED' | 'RESTRICTED' | 'REVOKED'
  risk_score: number
  last_active_at: string
  is_biometric_enabled: boolean
  is_current_device: boolean
}

export interface SecurityAlert {
  id: string
  event_type: string
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  created_at: string
}

export interface SecurityDashboardData {
  shield_status: 'SECURE' | 'ATTENTION' | 'CRITICAL'
  security_score: number
  active_devices_count: number
  trusted_devices_count: number
  trusted_contacts_count: number
  is_two_factor_enabled: boolean
  is_biometric_enabled: boolean
  last_login_at?: string
  last_login_device?: string
  account_status: 'ACTIVE' | 'SECURITY_REVIEW' | 'TEMPORARILY_LOCKED' | 'SUSPENDED'
  recent_alerts: SecurityAlert[]
}

export interface SecurityEventItem {
  id: string
  event_type: string
  risk_level: string
  location_city?: string
  ip_hash?: string
  details_json: Record<string, any>
  action_taken: string
  created_at: string
}

export const securityApi = {
  /**
   * Get master security dashboard & health metrics.
   */
  getDashboard: () =>
    api.get('/customer/security/dashboard'),

  /**
   * List all registered and active hardware devices.
   */
  getDevices: () =>
    api.get('/customer/security/devices'),

  /**
   * Register or heartbeat current device hardware.
   */
  registerDevice: (data: {
    device_id: string
    platform?: string
    device_model?: string
    os_version?: string
    app_version?: string
    is_biometric_enabled?: boolean
  }) => api.post('/customer/security/devices/register', data),

  /**
   * Revoke trust and disconnect a specific remote device.
   */
  revokeDevice: (deviceId: string) =>
    api.delete(`/customer/security/devices/${deviceId}`),

  /**
   * Get chronological security & login activity audit log.
   */
  getActivity: (params?: { limit?: number; event_type?: string }) =>
    api.get('/customer/security/activity', { params }),

  /**
   * Verify step-up authentication challenge (OTP / PIN / Biometric).
   */
  verifyChallenge: (data: {
    challenge_type: 'OTP' | 'PIN' | 'BIOMETRIC'
    otp_code?: string
    device_id?: string
    action_context?: string
  }) => api.post('/customer/security/challenge/verify', data),

  /**
   * Recover a temporarily protected or locked account.
   */
  recoverAccount: (data: {
    phone: string
    otp_code: string
    emergency_contact_phone?: string
  }) => api.post('/customer/security/lock-recovery', data),

  /**
   * Developer Mode: Simulate threat & anomaly scenarios.
   */
  simulateThreat: (data: {
    scenario: string
    custom_risk_score?: number
    details?: Record<string, any>
  }) => api.post('/customer/security/dev/simulate', data),
}

// ── FEATURE 27: SMART FEATURES & INTELLIGENCE LAYER API ───────────────────────
export interface SmartDestination {
  id: string
  title: string
  address: string
  lat: number
  lng: number
  place_type: 'HOME' | 'WORK' | 'FAVORITE' | 'RECENT' | 'PREDICTED'
  eta_minutes?: number
  reason: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  is_favorite: boolean
}

export interface SmartCompanion {
  id: string
  companion_type: 'HOTEL_TO_AIRPORT' | 'AIRPORT_TO_HOTEL' | 'PARCEL_TO_TRANSPORT' | 'OUTSTATION_TO_HOTEL' | 'CORPORATE_TRANSFER'
  title: string
  subtitle: string
  action_label: string
  deep_link: string
  reference_service: string
  reference_id?: string
  prefilled_params: Record<string, any>
  reason: string
}

export interface SmartDemand {
  zone_name: string
  demand_level: 'LOW' | 'MODERATE' | 'HIGH' | 'SURGE'
  surge_multiplier: number
  advisory_text: string
  is_surge: boolean
}

export interface SmartHomeFeed {
  greeting: string
  suggested_destinations: SmartDestination[]
  companion_cards: SmartCompanion[]
  demand_signal: SmartDemand
  model_version: string
}

export interface VehicleCategoryItem {
  category_code: string
  display_name: string
  is_recommended: boolean
  recommendation_reason?: string
  capacity_passengers: number
  capacity_luggage_bags: number
  estimated_base_fare: number
  icon_name: string
}

export interface VehicleRecommendationResult {
  recommended_category: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
  categories: VehicleCategoryItem[]
  model_version: string
}

export const smartApi = {
  /**
   * Get smart home dashboard intelligence feed.
   */
  getHomeFeed: (params?: { lat?: number; lng?: number }) =>
    api.get('/smart/home', { params }),

  /**
   * Get ranked smart destination recommendations.
   */
  getDestinations: (params?: { lat?: number; lng?: number; limit?: number }) =>
    api.get('/smart/destinations', { params }),

  /**
   * Evaluate passenger & luggage parameters for vehicle recommendation.
   */
  getVehicleRecommendation: (data: {
    passengers: number
    luggage_count: number
    luggage_size?: string
    parcel_weight_kg?: number
    service_type?: string
    preference?: string
  }) => api.post('/smart/vehicle-recommendation', data),

  /**
   * Get active cross-service companion recommendations.
   */
  getCrossService: () =>
    api.get('/smart/cross-service'),

  /**
   * Get real-time zone demand level & pricing signals.
   */
  getDemandSignal: (params?: { lat?: number; lng?: number }) =>
    api.get('/smart/demand', { params }),

  /**
   * Developer Mode: Simulate smart recommendations & scenarios.
   */
  simulateScenario: (data: {
    scenario: string
    custom_passengers?: number
    custom_luggage?: number
    custom_demand_multiplier?: number
    details?: Record<string, any>
  }) => api.post('/smart/dev/simulate', data),
}

// ── FEATURE 28: CROSS-SERVICE ORCHESTRATION & JOURNEYS API ────────────────────
export interface CrossServiceLinkItem {
  id: string
  source_service: string
  source_id: string
  target_service: string
  target_id?: string
  link_type: string
  status: string
  title: string
  subtitle: string
  badge_status: string
  deep_link?: string
  metadata_json: Record<string, any>
}

export interface JourneyDetail {
  id: string
  journey_reference: string
  title: string
  status: 'PLANNED' | 'PARTIALLY_ACTIVE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ATTENTION_REQUIRED'
  origin_service: string
  origin_reference_id: string
  created_at: string
  links: CrossServiceLinkItem[]
  attention_required: boolean
  attention_reason?: string
}

export interface JourneyListResponse {
  journeys: JourneyDetail[]
  active_count: number
}

export const orchestrationApi = {
  /**
   * List customer's active and upcoming multi-service journeys.
   */
  getJourneys: () =>
    api.get<JourneyListResponse>('/orchestration/journeys'),

  /**
   * Get single journey detail by UUID with linked domain timelines.
   */
  getJourneyDetail: (journeyId: string) =>
    api.get<JourneyDetail>(`/orchestration/journeys/${journeyId}`),

  /**
   * Execute an authorized user-confirmed linked service initiation.
   */
  executeLinkedAction: (data: {
    journey_id?: string
    action_type: 'BOOK_AIRPORT_TRANSFER' | 'BOOK_HOTEL_STAY' | 'CONVERT_TO_TRANSPORT' | 'RETRY_LINKED_SERVICE'
    source_service: string
    source_id: string
    target_service: string
    parameters?: Record<string, any>
  }) => api.post('/orchestration/linked-action', data),

  /**
   * Developer Mode: Simulate cross-service sagas and compensations.
   */
  simulateOrchestration: (data: {
    scenario: string
    details?: Record<string, any>
  }) => api.post('/orchestration/dev/simulate', data),
}

// ── FEATURE 24: PACKERS & MOVERS LOGISTICS API ──────────────────────────────
export const packersApi = {
  /**
   * Estimate home shifting or office relocation cost.
   */
  estimate: (data: {
    move_size?: string
    distance_km?: number
    pickup_floor?: number
    pickup_has_lift?: boolean
    drop_floor?: number
    drop_has_lift?: boolean
    requires_assembly?: boolean
    requires_fragile_packing?: boolean
    insurance_opted?: boolean
    declared_value?: number
  }) => api.post('/packers/estimate', data),

  /**
   * Create moving order with full inventory.
   */
  createOrder: (data: {
    customer_id?: string
    move_size: string
    scheduled_move_date: string
    pickup_address: string
    pickup_lat: number
    pickup_lng: number
    drop_address: string
    drop_lat: number
    drop_lng: number
    distance_km?: number
    pickup_floor?: number
    pickup_has_lift?: boolean
    drop_floor?: number
    drop_has_lift?: boolean
    requires_assembly?: boolean
    requires_fragile_packing?: boolean
    insurance_opted?: boolean
    declared_value?: number
    items?: Array<{
      category: string
      item_name: string
      quantity: number
      is_fragile?: boolean
      needs_disassembly?: boolean
    }>
    payment_method?: string
  }) => api.post('/packers/orders', data),

  /**
   * Fetch customer moving order history.
   */
  getMyOrders: () => api.get('/packers/my-orders'),

  /**
   * Get single moving order details, quotes, and milestone status.
   */
  getOrderDetails: (orderId: string) => api.get(`/packers/orders/${orderId}`),

  /**
   * Customer accepts winning mover quote.
   */
  acceptQuote: (orderId: string, quoteId: string) =>
    api.post(`/packers/orders/${orderId}/quotes/${quoteId}/accept`),

  /**
   * Advance moving order milestone (PACKING -> LOADING -> IN_TRANSIT -> UNLOADING).
   */
  advanceMilestone: (orderId: string, newStatus: string) =>
    api.post(`/packers/orders/${orderId}/milestone`, { new_status: newStatus }),

  /**
   * Complete moving order with Delivery OTP & POD signoff.
   */
  completeOrder: (
    orderId: string,
    data: {
      delivery_otp: string
      signature_url?: string
      damage_reported?: boolean
      damage_description?: string
    }
  ) => api.post(`/packers/orders/${orderId}/complete`, data),

  /**
   * Cancel moving order and refund wallet balance.
   */
  cancelOrder: (orderId: string, reason?: string) =>
    api.post(`/packers/orders/${orderId}/cancel`, { reason }),
}
