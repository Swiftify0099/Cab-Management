/**
 * Feature 16: Driver Performance & Analytics Client Service
 */
import { api } from '../api/client'
import { DriverPerformanceDashboardData } from '../types/driverPerformance'

class DriverPerformanceServiceClass {
  /**
   * Fetches authoritative performance dashboard, reliability scores, ratings, and PostGIS distance.
   */
  public async getPerformanceDashboard(
    period: 'today' | 'week' | 'month' | 'all' = 'today'
  ): Promise<DriverPerformanceDashboardData> {
    try {
      const res = await api.get('/matching/driver/performance/dashboard', {
        params: { period },
      })
      if (res.data?.data) {
        return res.data.data
      }
      throw new Error('No performance data available.')
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message
      throw new Error(detail || 'Could not fetch performance dashboard.')
    }
  }

  /**
   * Authoritative online session recording on status switch.
   */
  public async toggleOnlineSession(isOnline: boolean): Promise<any> {
    try {
      const res = await api.post('/matching/driver/session/toggle', null, {
        params: { is_online: isOnline },
      })
      return res.data?.data
    } catch (err: any) {
      console.warn('[PerformanceService] toggleOnlineSession error:', err.message)
      return { status: isOnline ? 'ACTIVE' : 'ENDED' }
    }
  }
}

export const DriverPerformanceService = new DriverPerformanceServiceClass()
