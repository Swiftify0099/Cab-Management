/**
 * Carpooling & Shared Seats Commuter Service — Partner App
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative client for Corridor Ridesharing, Seat Management & Split Fares:
 *  - Active Carpool Trip & Multi-Passenger Manifest retrieval
 *  - Live Seat Occupancy Metering (Booked vs Vacant Seats)
 *  - Individual Co-Passenger 4-Digit Seat PIN Verification
 *  - Corridor Waypoint Management & Passenger Dropoff
 *  - Multi-Passenger Split Fare Reconciliation & Net Payout Ledger
 */
import { api } from '../api/client'

export interface CarpoolPassengerItem {
  booking_id: string
  passenger_name: string
  passenger_phone_masked: string
  seats_count: number
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  dropoff_address: string
  dropoff_lat: number
  dropoff_lng: number
  fare_amount: number
  status: 'CONFIRMED' | 'BOARDED' | 'DROPPED' | 'CANCELLED'
  boarded_at?: string
  seat_pin?: string
}

export interface CarpoolTripJob {
  id: string
  job_type: 'CARPOOL'
  status: string
  status_label: string
  corridor_name: string // e.g. "Pune Swargate → Mumbai Dadar"
  departure_time: string
  origin_address: string
  destination_address: string
  total_seats: number
  booked_seats: number
  available_seats: number
  per_seat_fare: number
  passengers: CarpoolPassengerItem[]
  total_fare_collected: number
  driver_net_earnings: number
}

class CarpoolServiceClass {
  /**
   * Fetch active carpool trip with all booked co-passengers
   */
  public async getActiveCarpoolTrip(): Promise<CarpoolTripJob | null> {
    try {
      const res = await api.get('/driver/jobs/active')
      const job = res.data?.data
      if (job && (job.job_type === 'CARPOOL' || job.metadata?.is_carpool)) {
        const totalSeats = job.metadata?.total_seats || 4
        const passengers: CarpoolPassengerItem[] = job.metadata?.passengers || []
        const bookedSeats = passengers.reduce((sum, p) => sum + (p.seats_count || 1), 0)

        return {
          id: job.id || job.job_id,
          job_type: 'CARPOOL',
          status: job.status,
          status_label: job.status_label || job.status,
          corridor_name: job.metadata?.corridor_name || 'Pune → Hinjawadi Phase 3 Daily Corridor',
          departure_time: job.metadata?.departure_time || '09:00 AM',
          origin_address: job.locations?.pickup?.address || 'Swargate Bus Stand, Pune',
          destination_address: job.locations?.dropoff?.address || 'Hinjawadi Phase 3 Circle, Pune',
          total_seats: totalSeats,
          booked_seats: bookedSeats,
          available_seats: Math.max(0, totalSeats - bookedSeats),
          per_seat_fare: job.metadata?.per_seat_fare || 120,
          passengers,
          total_fare_collected: Number(job.fare?.total_fare || bookedSeats * 120),
          driver_net_earnings: Number(job.fare?.driver_earnings || Math.round(bookedSeats * 120 * 0.85)),
        }
      }
      return null
    } catch (err: any) {
      console.warn('[CarpoolService] getActiveCarpoolTrip error:', err.message)
      return null
    }
  }

  /**
   * Fetch open commuter seat booking requests along the route
   */
  public async getAvailableSeatRequests(): Promise<any[]> {
    try {
      const res = await api.get('/carpool/driver-requests')
      return Array.isArray(res.data?.data) ? res.data.data : []
    } catch (err: any) {
      console.warn('[CarpoolService] getAvailableSeatRequests error:', err.message)
      return []
    }
  }

  /**
   * Publish a new carpool route with seats for daily commuters
   */
  public async publishCarpoolRoute(payload: {
    origin_address: string
    destination_address: string
    departure_time: string
    total_seats: number
    per_seat_fare: number
  }): Promise<{ success: boolean; trip_id: string; message: string }> {
    try {
      const res = await api.post('/carpool/publish-trip', payload)
      return res.data?.data || res.data || { success: true, trip_id: 'trip_' + Date.now(), message: 'Carpool route published' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Could not publish carpool route'
      throw new Error(msg)
    }
  }

  /**
   * Verify individual passenger seat PIN and mark boarded
   */
  public async verifyPassengerSeatPIN(
    tripId: string,
    bookingId: string,
    pin: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/carpool/trips/${tripId}/passengers/${bookingId}/verify-pin`, {
        seat_pin: pin,
      })
      return res.data?.data || res.data || { success: true, message: 'Seat PIN verified. Passenger boarded.' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Invalid Seat PIN'
      throw new Error(msg)
    }
  }

  /**
   * Complete individual co-passenger dropoff
   */
  public async completePassengerDropoff(
    tripId: string,
    bookingId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/carpool/trips/${tripId}/passengers/${bookingId}/dropoff`)
      return res.data?.data || res.data || { success: true, message: 'Passenger dropped off' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Could not complete dropoff'
      throw new Error(msg)
    }
  }

  /**
   * Complete entire carpool corridor trip
   */
  public async completeCarpoolTrip(tripId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/driver/jobs/${tripId}/command`, {
        command: 'COMPLETE',
        params: { completion_type: 'CARPOOL_CORRIDOR_FINISH' },
      })
      return res.data?.data || res.data || { success: true, message: 'Carpool trip finished' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to complete carpool trip'
      throw new Error(msg)
    }
  }
}

export const CarpoolService = new CarpoolServiceClass()
