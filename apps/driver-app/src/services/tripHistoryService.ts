/**
 * Feature 27: Trip History Service
 * Client API handler for paginated history querying, KPI summaries,
 * detailed itemized receipts, and export statements.
 */
import { api } from '../api/client';
import {
  TripHistoryItem,
  TripKPIPeriodSummary,
  DetailedTripReceipt,
  TripStatusFilter,
  TripDateFilter,
} from '../types/tripHistory';

export const TripHistoryService = {
  /**
   * Fetches paginated driver trip history feed with filters
   */
  async getTripHistory(
    status: TripStatusFilter = 'ALL',
    period: TripDateFilter = 'ALL_TIME',
    offset: number = 0,
    limit: number = 25
  ): Promise<{ trips: TripHistoryItem[]; kpi_summary: TripKPIPeriodSummary }> {
    try {
      const res = await api.get(
        `/matching/history/trips?status=${status}&period=${period}&offset=${offset}&limit=${limit}`
      );
      if (res.data?.trips) {
        return {
          trips: res.data.trips,
          kpi_summary: res.data.kpi_summary || {
            period,
            total_completed_trips: 0,
            total_net_earnings: 0,
            total_distance_km: 0,
          },
        };
      }
    } catch (e) {
      console.warn('[TripHistoryService] getTripHistory fallback:', e);
    }
    return {
      trips: [],
      kpi_summary: { period, total_completed_trips: 0, total_net_earnings: 0, total_distance_km: 0 },
    };
  },

  /**
   * Fetches full itemized receipt details, route timeline & feedback for a trip
   */
  async getTripReceiptDetails(rideId: string): Promise<DetailedTripReceipt | null> {
    try {
      const res = await api.get(`/matching/history/trips/${rideId}`);
      if (res.data?.financial_breakdown) {
        return res.data;
      }
    } catch (e) {
      console.warn('[TripHistoryService] getTripReceiptDetails error:', e);
    }
    return null;
  },

  /**
   * Exports formatted text/receipt statement
   */
  async exportTripReceipt(rideId: string): Promise<string> {
    try {
      const res = await api.get(`/matching/history/trips/${rideId}/export`);
      return res.data?.formatted_statement || '';
    } catch (e) {
      console.warn('[TripHistoryService] exportTripReceipt error:', e);
      return '';
    }
  },

  /**
   * Developer Mode sandbox simulator
   */
  async simulateDevScenario(scenarioKey: string): Promise<any> {
    if (!__DEV__) {
      console.warn('[TripHistoryService] simulateDevScenario is disabled in production builds.');
      return null;
    }
    try {
      const res = await api.post('/matching/history/dev-simulate', { scenario_key: scenarioKey });
      return res.data;
    } catch (e) {
      console.warn('[TripHistoryService] simulateDevScenario error:', e);
      return { scenario: scenarioKey, message: 'Sandbox executed.' };
    }
  },
};
