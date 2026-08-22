export type AppLanguage = 'en' | 'mr' | 'hi';
export type NavigationApp = 'IN_APP' | 'GOOGLE_MAPS' | 'WAZE';
export type AppThemeMode = 'light' | 'dark' | 'system';

export interface DriverAppSettings {
  driver_id: string;
  language: AppLanguage;
  navigation_app: NavigationApp;
  auto_accept_rides: boolean;
  auto_accept_min_fare: number;
  voice_navigation_enabled: boolean;
  sound_alerts_enabled: boolean;
  high_contrast_mode: boolean;
  theme_mode: AppThemeMode;
  speed_limit_warning: boolean;
  is_deactivated: boolean;
  deactivation_reason?: string | null;
  deactivated_at?: string | null;
  updated_at?: string | null;
}

export interface DiagnosticsResult {
  status: string;
  server_latency_ms: number;
  spatial_engine: string;
  network_status: string;
  diagnostics_timestamp: string;
  cache_size_kb: number;
  checks: Array<{
    name: string;
    status: string;
    detail: string;
  }>;
}
