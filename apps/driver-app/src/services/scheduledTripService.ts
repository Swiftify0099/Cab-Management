/**
 * Feature 26: Scheduled Trip Service
 * Client API handler for available advance reservations discovery, claiming,
 * upcoming confirmed bookings timeline, and navigation transitions.
 */
import { api } from '../api/client';
import { AvailableScheduledRide, UpcomingReservedTrip } from '../types/scheduledTrips';

export const ScheduledTripService = {
  /**
   * Fetches open advance scheduled bookings
   */
  async getAvailableRides(): Promise<AvailableScheduledRide[]> {
    try {
      const res = await api.get('/matching/scheduled/available');
      return res.data?.available_rides || [];
    } catch (e) {
      console.warn('[ScheduledTripService] getAvailableRides fallback:', e);
      return [];
    }
  },

  /**
   * Atomically claims an advance booking
   */
  async acceptReservation(rideId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/matching/scheduled/${rideId}/accept`);
      return { success: true, message: res.data?.message || 'Reservation claimed!' };
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to claim reservation';
      return { success: false, message: msg };
    }
  },

  /**
   * Fetches driver's upcoming confirmed reserved trips
   */
  async getUpcomingTrips(): Promise<UpcomingReservedTrip[]> {
    try {
      const res = await api.get('/matching/scheduled/upcoming');
      return res.data?.upcoming_trips || [];
    } catch (e) {
      console.warn('[ScheduledTripService] getUpcomingTrips fallback:', e);
      return [];
    }
  },

  /**
   * Driver starts heading to scheduled pickup location
   */
  async startHeadingToPickup(rideId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/matching/scheduled/${rideId}/start-heading`);
      return { success: true, message: res.data?.message || 'Navigation started!' };
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to start heading';
      return { success: false, message: msg };
    }
  },

  /**
   * Cancels a confirmed reservation
   */
  async cancelReservation(rideId: string, reason: string): Promise<{ success: boolean; message: string; is_late: boolean }> {
    try {
      const res = await api.post(`/matching/scheduled/${rideId}/cancel`, { reason });
      return {
        success: true,
        message: res.data?.message || 'Reservation cancelled.',
        is_late: !!res.data?.is_late_cancellation,
      };
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to cancel reservation';
      return { success: false, message: msg, is_late: false };
    }
  },

  /**
   * Developer Mode sandbox simulator
   */
  async simulateDevScenario(scenarioKey: string): Promise<any> {
    try {
      const res = await api.post('/matching/scheduled/dev-simulate', { scenario_key: scenarioKey });
      return res.data;
    } catch (e) {
      console.warn('[ScheduledTripService] simulateDevScenario error:', e);
      return { scenario: scenarioKey, message: 'Sandbox executed.' };
    }
  },
};
