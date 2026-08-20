/**
 * Feature 19: Demand / Heatmap & Surge Intelligence TypeScript Definitions
 */

export type DemandLevel = 'LOW' | 'NORMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
  surge_multiplier: number;
  zone_name: string;
}

export interface HotspotZone {
  zone_id: string;
  name: string;
  category: 'AIRPORT' | 'TECH_PARK' | 'TRANSIT_HUB' | 'SHOPPING_MALL' | 'NIGHTLIFE' | 'COMMERCIAL';
  centroid_lat: number;
  centroid_lng: number;
  distance_km: number;
  eta_minutes: number;
  surge_multiplier: number;
  demand_level: DemandLevel;
  active_requests_count: number;
  available_drivers_count: number;
  opportunity_score: number;
}

export interface ExpectedDemandHour {
  hour_label: string;
  time_iso: string;
  demand_level: DemandLevel;
  expected_surge_multiplier: number;
  context_tag: string;
}
