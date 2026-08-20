export interface OpportunityZone {
  zone_id: string;
  zone_name: string;
  zone_code: string;
  center_latitude: number;
  center_longitude: number;
  distance_km: number;
  estimated_eta_mins: number;
  surge_multiplier: number;
  opportunity_score: number;
  expected_hourly_earning: number;
  forecast_30m: string;
  reason: string;
}

export interface DriverFatigueSummary {
  driver_id: string;
  continuous_online_seconds: number;
  continuous_driving_hours: number;
  advisory_level: 'NONE' | 'SUGGESTION' | 'RECOMMENDED_BREAK' | 'MANDATORY_REST';
  needs_break: boolean;
  advisory_message: string;
  last_evaluated_at: string;
}

export interface DriverAIInsights {
  driver_id: string;
  generated_at: string;
  predicted_hourly_earning: number;
  earnings_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  demand_status: 'NORMAL' | 'SURGE' | 'HIGH';
  top_recommended_zone?: OpportunityZone;
  nearby_opportunity_zones: OpportunityZone[];
  fatigue_summary: DriverFatigueSummary;
  actionable_insights: string[];
  is_estimate: boolean;
  ai_engine_status: 'ONLINE' | 'FALLBACK';
}

export interface EarningsPrediction {
  driver_id: string;
  timeframe: string;
  predicted_hourly_earning: number;
  predicted_per_trip_earning: number;
  predicted_full_day_earning: number;
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  is_peak_hour: boolean;
  is_estimate: boolean;
  disclaimer: string;
}

export interface DemandForecastItem {
  zone_id: string;
  zone_name: string;
  zone_code: string;
  center_latitude: number;
  center_longitude: number;
  distance_km: number;
  current_demand: string;
  forecast_15m: string;
  forecast_30m: string;
  forecast_60m: string;
  surge_multiplier: number;
  expected_hourly_earning: number;
  active_drivers_count: number;
  polygon_geojson?: any;
}
