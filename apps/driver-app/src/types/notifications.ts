export type NotificationCategory =
  | 'ALL'
  | 'TRIP'
  | 'EARNINGS'
  | 'PAYOUT'
  | 'ACCOUNT'
  | 'SAFETY'
  | 'PROMOTIONS'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  category: string;
  data: {
    deep_link?: string;
    trip_id?: string;
    payout_ref?: string;
    quest_id?: string;
    [key: string]: any;
  };
  deep_link?: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  driver_id: string;
  trip_alerts: boolean;
  earnings_alerts: boolean;
  payout_alerts: boolean;
  safety_alerts: boolean;
  promotions_alerts: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
}
