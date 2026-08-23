/**
 * Feature 25: Notification Service
 * Client API handler for notifications feed, unread counters, bulk mark-as-read,
 * granular preferences, and developer sandbox triggers.
 */
import { api } from '../api/client';
import { NotificationItem, NotificationPreferences, NotificationCategory } from '../types/notifications';

export const NotificationService = {
  /**
   * Fetches paginated notification feed
   */
  async getNotifications(
    category?: NotificationCategory,
    unreadOnly: boolean = false
  ): Promise<{ notifications: NotificationItem[]; unread_count: number }> {
    try {
      let url = '/matching/notifications?';
      if (category && category !== 'ALL') url += `category=${encodeURIComponent(category)}&`;
      if (unreadOnly) url += 'unread_only=true&';
      const res = await api.get(url);
      if (res.data?.notifications) {
        return {
          notifications: res.data.notifications,
          unread_count: res.data.unread_count || 0,
        };
      }
    } catch (e) {
      console.warn('[NotificationService] getNotifications fallback:', e);
    }
    return { notifications: [], unread_count: 0 };
  },

  /**
   * Fetches active unread count for badge indicators
   */
  async getUnreadCount(): Promise<number> {
    try {
      const res = await api.get('/matching/notifications/unread-count');
      return res.data?.unread_count || 0;
    } catch (e) {
      console.warn('[NotificationService] getUnreadCount error:', e);
      return 0;
    }
  },

  /**
   * Marks a single notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const res = await api.post(`/matching/notifications/${notificationId}/read`);
      return !!res.data?.success;
    } catch (e) {
      console.warn('[NotificationService] markAsRead error:', e);
      return false;
    }
  },

  /**
   * Bulk marks all notifications as read
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const res = await api.post('/matching/notifications/read-all');
      return !!res.data?.success;
    } catch (e) {
      console.warn('[NotificationService] markAllAsRead error:', e);
      return false;
    }
  },

  /**
   * Dismisses / deletes a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const res = await api.delete(`/matching/notifications/${notificationId}`);
      return !!res.data?.success;
    } catch (e) {
      console.warn('[NotificationService] deleteNotification error:', e);
      return false;
    }
  },

  /**
   * Fetches driver notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const res = await api.get('/matching/notifications/preferences');
      if (res.data?.driver_id) {
        return res.data;
      }
    } catch (e) {
      console.warn('[NotificationService] getPreferences fallback:', e);
    }
    return {
      driver_id: 'default',
      trip_alerts: true,
      earnings_alerts: true,
      payout_alerts: true,
      safety_alerts: true,
      promotions_alerts: true,
      sound_enabled: true,
      vibration_enabled: true,
    };
  },

  /**
   * Updates driver notification preferences
   */
  async updatePreferences(payload: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      const res = await api.put('/matching/notifications/preferences', payload);
      if (res.data?.driver_id) {
        return res.data;
      }
    } catch (e) {
      console.warn('[NotificationService] updatePreferences error:', e);
    }
    return await this.getPreferences();
  },

  /**
   * Developer Mode sandbox simulator
   */
  async simulateDevScenario(scenarioKey: string): Promise<any> {
    if (!__DEV__) {
      console.warn('[NotificationService] simulateDevScenario is disabled in production builds.');
      return null;
    }
    try {
      const res = await api.post('/matching/notifications/dev-simulate', { scenario_key: scenarioKey });
      return res.data;
    } catch (e) {
      console.warn('[NotificationService] simulateDevScenario error:', e);
      return { scenario: scenarioKey, message: 'Sandbox executed.' };
    }
  },
};
