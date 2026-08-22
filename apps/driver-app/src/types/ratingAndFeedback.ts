/**
 * Feature 17: Rating & Feedback TypeScript Definitions
 */

export interface StarBreakdownItem {
  star: number;
  count: number;
  percentage: number;
}

export interface ComplimentTagItem {
  tag: string;
  count: number;
}

export interface DriverRatingSummary {
  overall_rating: number;
  total_ratings: number;
  rating_trend: number;
  rating_trend_direction: 'UP' | 'DOWN';
  five_star_pct: number;
  breakdown: StarBreakdownItem[];
  top_compliments: ComplimentTagItem[];
  standing: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'NEEDS_ATTENTION' | string;
  standing_badge: string;
  is_low_rating_alert: boolean;
  alert_message: string | null;
  improvement_tips: string[];
}

export interface DriverRatingHistoryItem {
  rating_id: string;
  ride_id: string;
  ride_reference: string;
  rating: number;
  compliments: string[];
  feedback: string | null;
  status: 'APPROVED' | 'DISPUTED' | 'FLAGGED' | 'HIDDEN' | string;
  is_disputed: boolean;
  dispute_reason: string | null;
  created_at: string;
}
