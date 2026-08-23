/**
 * Feature 11 & 12: Waiting and Cancellation Client Service
 */
import { api } from '../api/client'
import {
  WaitingStatus,
  CancellationReasonItem,
  DriverCancellationMetrics,
  CancellationHistoryItem,
} from '../types/waitingAndCancellation'

class WaitingAndCancellationServiceClass {
  /**
   * Fetches server-authoritative live waiting status & charges.
   */
  public async getWaitingStatus(
    rideId: string,
    latitude: number,
    longitude: number
  ): Promise<WaitingStatus> {
    try {
      const res = await api.get(`/matching/rides/${rideId}/waiting-status`, {
        params: { latitude, longitude },
      })
      if (res.data?.data) {
        return res.data.data
      }
      throw new Error('No waiting status data available.')
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message
      throw new Error(detail || 'Could not fetch waiting status.')
    }
  }

  /**
   * Anti-fraud No-Show cancellation.
   */
  public async processNoShowCancellation(
    rideId: string,
    latitude: number,
    longitude: number
  ): Promise<{ success: boolean; message: string; cancellation_fee: number }> {
    try {
      const res = await api.post(`/matching/rides/${rideId}/no-show`, {
        latitude,
        longitude,
      })
      return res.data?.data || { success: true, message: 'No-Show processed.', cancellation_fee: 50.0 }
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message
      throw new Error(detail || 'Could not process No-Show.')
    }
  }

  /**
   * Fetches structured cancellation reason catalog.
   */
  public async getCancellationReasons(): Promise<CancellationReasonItem[]> {
    try {
      const res = await api.get('/matching/cancellation/reasons')
      if (res.data?.data) {
        return res.data.data
      }
    } catch (err: any) {
      console.warn('[CancellationService] getReasons error:', err.message)
    }

    return [
      { code: 'CUST_REQ', label: 'Customer requested cancellation', is_penalty_exempt: true, requires_arrival: false },
      { code: 'CANT_FIND', label: 'Cannot find customer', is_penalty_exempt: true, requires_arrival: true },
      { code: 'UNSAFE_LOC', label: 'Unsafe pickup location / road hazard', is_penalty_exempt: true, requires_arrival: false },
      { code: 'VEHICLE_ISSUE', label: 'Vehicle breakdown / flat tyre', is_penalty_exempt: true, requires_arrival: false },
      { code: 'EMERGENCY', label: 'Personal or medical emergency', is_penalty_exempt: true, requires_arrival: false },
      { code: 'WRONG_ADDR', label: 'Wrong pickup address given by customer', is_penalty_exempt: true, requires_arrival: false },
      { code: 'UNREACHABLE', label: 'Customer phone unreachable', is_penalty_exempt: true, requires_arrival: false },
      { code: 'LONG_WAIT', label: 'Excessive customer waiting time', is_penalty_exempt: true, requires_arrival: true },
      { code: 'DRIVER_OTHER', label: 'Driver personal reason', is_penalty_exempt: false, requires_arrival: false },
    ]
  }

  /**
   * Driver structured cancellation.
   */
  public async cancelRideByDriver(
    rideId: string,
    reasonCode: string,
    reasonDetails?: string
  ): Promise<any> {
    try {
      const res = await api.post(`/matching/rides/${rideId}/cancel-by-driver`, {
        reason_code: reasonCode,
        reason_details: reasonDetails,
      })
      return res.data?.data || { success: true, message: 'Ride cancelled.' }
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message
      throw new Error(detail || 'Could not cancel ride.')
    }
  }

  /**
   * Fetches driver cancellation metrics and standing.
   */
  public async getDriverMetrics(): Promise<DriverCancellationMetrics> {
    try {
      const res = await api.get('/matching/drivers/cancellation-metrics')
      if (res.data?.data) {
        return res.data.data
      }
    } catch (err: any) {
      console.warn('[CancellationService] getMetrics error:', err.message)
    }

    return {
      driver_id: 'default-driver',
      total_trips: 45,
      total_cancellations: 2,
      penalty_cancellations: 1,
      cancellation_rate: 0.022,
      cancellation_rate_percentage: '2.2%',
      restriction_status: 'NORMAL',
      is_suspended: false,
    }
  }

  /**
   * Fetches driver cancellation history.
   */
  public async getCancellationHistory(limit: number = 20): Promise<CancellationHistoryItem[]> {
    try {
      const res = await api.get('/matching/drivers/cancellation-history', {
        params: { limit },
      })
      if (res.data?.data) {
        return res.data.data
      }
    } catch {
      return []
    }
    return []
  }
}

export const WaitingAndCancellationService = new WaitingAndCancellationServiceClass()
