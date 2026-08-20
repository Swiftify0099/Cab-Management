/**
 * Feature 19: Demand / Heatmap & Surge Client Service
 */
import { api } from '../api/client';
import { HeatmapPoint, HotspotZone, ExpectedDemandHour } from '../types/demandAndHeatmap';

export const DemandAndHeatmapService = {
  /**
   * Fetches PostGIS weighted heatmap coordinates
   */
  async getHeatmapPoints(city = 'Pune', lat = 18.5204, lng = 73.8567): Promise<HeatmapPoint[]> {
    try {
      const response = await api.get('/demand/heatmap', {
        params: { city, lat, lng },
      });
      return response.data?.data || response.data || [];
    } catch (error) {
      console.warn('[DemandService] getHeatmapPoints fallback:', error);
      return [
        { latitude: 18.582, longitude: 73.920, weight: 0.95, surge_multiplier: 2.2, zone_name: 'Pune Airport' },
        { latitude: 18.591, longitude: 73.739, weight: 0.85, surge_multiplier: 1.75, zone_name: 'Hinjawadi' },
        { latitude: 18.536, longitude: 73.894, weight: 0.70, surge_multiplier: 1.6, zone_name: 'Koregaon Park' },
        { latitude: 18.531, longitude: 73.845, weight: 0.60, surge_multiplier: 1.4, zone_name: 'Shivajinagar' },
      ];
    }
  },

  /**
   * Fetches ranked high-demand hotspot zones with internal distance and road ETA
   */
  async getActiveHotspots(lat = 18.5204, lng = 73.8567, limit = 5): Promise<HotspotZone[]> {
    try {
      const response = await api.get('/demand/hotspots', {
        params: { lat, lng, limit },
      });
      return response.data?.data || response.data || [];
    } catch (error) {
      console.warn('[DemandService] getActiveHotspots fallback:', error);
      return [
        {
          zone_id: 'z1',
          name: 'Pune International Airport (T2)',
          category: 'AIRPORT',
          centroid_lat: 18.5822,
          centroid_lng: 73.9197,
          distance_km: 9.4,
          eta_minutes: 18,
          surge_multiplier: 2.2,
          demand_level: 'CRITICAL',
          active_requests_count: 24,
          available_drivers_count: 5,
          opportunity_score: 95.4,
        },
        {
          zone_id: 'z2',
          name: 'Hinjawadi IT Park Phase 1 & 2',
          category: 'TECH_PARK',
          centroid_lat: 18.5913,
          centroid_lng: 73.7389,
          distance_km: 3.2,
          eta_minutes: 7,
          surge_multiplier: 1.75,
          demand_level: 'HIGH',
          active_requests_count: 32,
          available_drivers_count: 12,
          opportunity_score: 88.2,
        },
        {
          zone_id: 'z4',
          name: 'Koregaon Park & North Main Rd',
          category: 'NIGHTLIFE',
          centroid_lat: 18.5362,
          centroid_lng: 73.8938,
          distance_km: 4.8,
          eta_minutes: 11,
          surge_multiplier: 1.6,
          demand_level: 'HIGH',
          active_requests_count: 19,
          available_drivers_count: 7,
          opportunity_score: 79.6,
        },
        {
          zone_id: 'z5',
          name: 'Phoenix Marketcity Mall',
          category: 'SHOPPING_MALL',
          centroid_lat: 18.5621,
          centroid_lng: 73.9168,
          distance_km: 5.8,
          eta_minutes: 13,
          surge_multiplier: 1.35,
          demand_level: 'MODERATE',
          active_requests_count: 14,
          available_drivers_count: 8,
          opportunity_score: 64.0,
        },
      ];
    }
  },

  /**
   * Fetches predictive 6-hour expected demand timeline
   */
  async getExpectedDemandTimeline(lat = 18.5204, lng = 73.8567): Promise<ExpectedDemandHour[]> {
    try {
      const response = await api.get('/demand/expected-timeline', {
        params: { lat, lng },
      });
      return response.data?.data || response.data || [];
    } catch (error) {
      console.warn('[DemandService] getExpectedDemandTimeline fallback:', error);
      return [
        { hour_label: '5 PM', time_iso: new Date().toISOString(), demand_level: 'NORMAL', expected_surge_multiplier: 1.2, context_tag: 'Early Commute' },
        { hour_label: '6 PM', time_iso: new Date().toISOString(), demand_level: 'HIGH', expected_surge_multiplier: 1.75, context_tag: 'Peak Tech Park Exit' },
        { hour_label: '7 PM', time_iso: new Date().toISOString(), demand_level: 'CRITICAL', expected_surge_multiplier: 2.1, context_tag: 'Evening Dinner & Mall Rush' },
        { hour_label: '8 PM', time_iso: new Date().toISOString(), demand_level: 'CRITICAL', expected_surge_multiplier: 2.2, context_tag: 'Airport Flight Wave' },
        { hour_label: '9 PM', time_iso: new Date().toISOString(), demand_level: 'HIGH', expected_surge_multiplier: 1.65, context_tag: 'Late Evening Transit' },
        { hour_label: '10 PM', time_iso: new Date().toISOString(), demand_level: 'NORMAL', expected_surge_multiplier: 1.25, context_tag: 'Steady Night Demand' },
      ];
    }
  },

  /**
   * Developer Mode Sandbox Simulator
   */
  async devSimulate(scenario: string): Promise<any> {
    try {
      const response = await api.post('/demand/dev-simulate', { scenario });
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('[DemandService] devSimulate fallback:', error);
      return { success: true, scenario, message: 'Simulated locally' };
    }
  },
};
