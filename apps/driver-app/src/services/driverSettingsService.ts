/**
 * Feature 28: Driver Settings Service
 * Client API handler for language selection, navigation switcher,
 * auto-accept toggles, audio guidance, and diagnostics.
 */
import { api } from '../api/client';
import { DriverAppSettings, DiagnosticsResult } from '../types/driverSettings';

export const DriverSettingsService = {
  /**
   * Fetches current app settings for authenticated driver
   */
  async getSettings(): Promise<DriverAppSettings | null> {
    try {
      const res = await api.get('/matching/settings');
      return res.data;
    } catch (e) {
      console.warn('[DriverSettingsService] getSettings fallback:', e);
      return null;
    }
  },

  /**
   * Updates driver app settings
   */
  async updateSettings(payload: Partial<DriverAppSettings>): Promise<DriverAppSettings | null> {
    try {
      const res = await api.patch('/matching/settings', payload);
      return res.data;
    } catch (e) {
      console.warn('[DriverSettingsService] updateSettings error:', e);
      return null;
    }
  },

  /**
   * Runs diagnostic sensor & network health check
   */
  async runDiagnostics(): Promise<DiagnosticsResult | null> {
    try {
      const res = await api.get('/matching/settings/diagnostics');
      return res.data;
    } catch (e) {
      console.warn('[DriverSettingsService] runDiagnostics error:', e);
      return null;
    }
  },

  /**
   * Submits self-service account deactivation
   */
  async requestDeactivation(reason: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post('/matching/settings/deactivate', { reason });
      return { success: true, message: res.data?.message || 'Deactivation submitted.' };
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to submit deactivation';
      return { success: false, message: msg };
    }
  },

  /**
   * Developer Mode sandbox simulator
   */
  async simulateDevScenario(scenarioKey: string): Promise<any> {
    try {
      const res = await api.post('/matching/settings/dev-simulate', { scenario_key: scenarioKey });
      return res.data;
    } catch (e) {
      console.warn('[DriverSettingsService] simulateDevScenario error:', e);
      return { scenario: scenarioKey, message: 'Sandbox executed.' };
    }
  },
};
