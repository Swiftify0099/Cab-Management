/**
 * Rental & Outstation Packages Service — Partner App
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative client for Hourly Rentals, Day Packages & Outstation Trips:
 *  - Active Rental / Outstation job retrieval (via Common Job Contract)
 *  - Package metering: Included vs Extra KM & Hours
 *  - Trip Expense Logging: Tolls, Parking, State Permits & Driver Night Allowance
 *  - Start OTP & End OTP verification and final settlement calculations
 */
import { api } from '../api/client'

export interface RentalPackageMeta {
  package_name: string // e.g. "4 Hrs / 40 Kms"
  included_hours: number
  included_km: number
  extra_km_rate: number
  extra_hour_rate: number
  used_km?: number
  used_minutes?: number
}

export interface OutstationPackageMeta {
  trip_type: 'one_way' | 'round_trip' | 'multi_day'
  estimated_distance_km: number
  min_daily_km: number
  per_km_rate: number
  days_count: number
  night_allowance_per_night: number
  night_stay_count: number
}

export interface TripExpenseItem {
  id: string
  expense_type: 'toll' | 'parking' | 'permit' | 'night_allowance' | 'other'
  amount: number
  description?: string
  receipt_url?: string
  logged_at: string
}

export interface RentalOutstationJob {
  id: string
  job_type: 'RENTAL' | 'OUTSTATION'
  status: string
  status_label: string
  customer_name: string
  customer_phone_masked: string
  pickup_address: string
  pickup_lat: number
  pickup_lng: number
  destination_address?: string
  destination_lat?: number
  destination_lng?: number
  started_at?: string
  package_details: RentalPackageMeta | OutstationPackageMeta | any
  base_fare: number
  current_fare: number
  extra_km_cost: number
  extra_time_cost: number
  expenses: TripExpenseItem[]
  driver_earnings: number
}

class RentalOutstationServiceClass {
  /**
   * Fetch driver's active rental or outstation job from Common Job Contract
   */
  public async getActiveJob(): Promise<RentalOutstationJob | null> {
    try {
      const res = await api.get('/driver/jobs/active')
      const job = res.data?.data
      if (job && (job.job_type === 'RENTAL' || job.job_type === 'OUTSTATION')) {
        return {
          id: job.id || job.job_id,
          job_type: job.job_type,
          status: job.status,
          status_label: job.status_label || job.status,
          customer_name: job.customer?.name || 'Customer',
          customer_phone_masked: job.customer?.phone_masked || '',
          pickup_address: job.locations?.pickup?.address || 'Pickup Location',
          pickup_lat: job.locations?.pickup?.lat || 18.5204,
          pickup_lng: job.locations?.pickup?.lng || 73.8567,
          destination_address: job.locations?.dropoff?.address || 'As directed by customer',
          destination_lat: job.locations?.dropoff?.lat,
          destination_lng: job.locations?.dropoff?.lng,
          started_at: job.started_at,
          package_details: job.metadata?.package_details || {
            package_name: '4 Hrs / 40 Kms',
            included_hours: 4,
            included_km: 40,
            extra_km_rate: 14,
            extra_hour_rate: 120,
          },
          base_fare: Number(job.fare?.base_fare || job.fare?.estimated_total || 950),
          current_fare: Number(job.fare?.total_fare || job.fare?.estimated_total || 950),
          extra_km_cost: Number(job.fare?.extra_km_charge || 0),
          extra_time_cost: Number(job.fare?.extra_time_charge || 0),
          expenses: job.fare?.expenses || [],
          driver_earnings: Number(job.fare?.driver_earnings || Math.round(Number(job.fare?.estimated_total || 950) * 0.8)),
        }
      }
      return null
    } catch (err: any) {
      console.warn('[RentalOutstationService] getActiveJob error:', err.message)
      return null
    }
  }

  /**
   * Fetch available open rental / outstation requests for booking accept
   */
  public async getAvailableRequests(): Promise<any[]> {
    try {
      const [rentalRes, outstationRes] = await Promise.allSettled([
        api.get('/rental/driver-requests'),
        api.get('/outstation/driver-requests'),
      ])
      const list: any[] = []
      if (rentalRes.status === 'fulfilled' && Array.isArray(rentalRes.value.data?.data)) {
        list.push(...rentalRes.value.data.data)
      }
      if (outstationRes.status === 'fulfilled' && Array.isArray(outstationRes.value.data?.data)) {
        list.push(...outstationRes.value.data.data)
      }
      return list
    } catch (err: any) {
      console.warn('[RentalOutstationService] getAvailableRequests error:', err.message)
      return []
    }
  }

  /**
   * Execute job command (ARRIVE_PICKUP, START, COMPLETE, CANCEL)
   */
  public async executeCommand(jobId: string, command: string, params?: Record<string, any>): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/driver/jobs/${jobId}/command`, {
        command,
        params: params || {},
      })
      return res.data?.data || res.data || { success: true, message: 'Command executed successfully' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Command execution failed'
      throw new Error(msg)
    }
  }

  /**
   * Log extra trip expense (Toll, Parking, Night Allowance, Border Tax)
   */
  public async logTripExpense(jobId: string, expense: {
    expense_type: 'toll' | 'parking' | 'permit' | 'night_allowance' | 'other'
    amount: number
    description?: string
    receipt_url?: string
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/driver/jobs/${jobId}/command`, {
        command: 'ADD_EXPENSE',
        params: expense,
      })
      return res.data?.data || res.data || { success: true, message: 'Expense logged to trip ledger' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to log trip expense'
      throw new Error(msg)
    }
  }

  /**
   * Complete trip with Customer End OTP and calculate final reconciled settlement
   */
  public async completeTrip(jobId: string, endOtp: string, finalOdometerKm?: number): Promise<{ success: boolean; message: string; settlement?: any }> {
    try {
      const res = await api.post(`/driver/jobs/${jobId}/command`, {
        command: 'COMPLETE',
        params: {
          otp: endOtp,
          final_odometer_km: finalOdometerKm,
        },
      })
      return res.data?.data || res.data || { success: true, message: 'Trip completed and settlement processed' }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Invalid End OTP'
      throw new Error(msg)
    }
  }
}

export const RentalOutstationService = new RentalOutstationServiceClass()
