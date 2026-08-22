/**
 * Feature 18: Incentives & Promotions TypeScript Definitions
 */

export type CampaignType =
  | 'DAILY_TARGET'
  | 'WEEKLY_TARGET'
  | 'RIDE_MILESTONE'
  | 'PEAK_HOUR'
  | 'GUARANTEED_EARNINGS'
  | 'ZONE_INCENTIVE'
  | 'FESTIVAL'
  | 'REFERRAL';

export type IncentiveStatus =
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'EARNED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'NOT_ELIGIBLE';

export interface IncentiveQuest {
  campaign_id: string;
  title: string;
  description: string;
  campaign_type: CampaignType;
  reward_amount: number;
  current_progress: number;
  target_count: number;
  percentage: number;
  status: IncentiveStatus;
  time_remaining_str: string;
  zone_name?: string | null;
  is_completed: boolean;
  earned_at?: string | null;
}

export interface GuaranteedEarningsData {
  campaign_id: string;
  title: string;
  description: string;
  guaranteed_amount: number;
  current_actual_earnings: number;
  potential_topup: number;
  current_progress: number;
  target_count: number;
  percentage: number;
  status: IncentiveStatus;
  time_remaining_str: string;
  is_completed: boolean;
}

export interface InvitedDriver {
  referral_id: string;
  name: string;
  phone_masked: string;
  completed_rides: number;
  required_rides: number;
  reward_amount: number;
  status: 'PENDING' | 'QUALIFIED' | 'REWARDED';
  is_rewarded: boolean;
}

export interface DriverReferralSummary {
  referral_code: string;
  reward_per_referral: number;
  required_rides: number;
  invited_count: number;
  rewarded_count: number;
  total_referral_earnings: number;
  invited_drivers: InvitedDriver[];
}

export interface DriverPromotionsHubData {
  potential_bonus_total: number;
  active_quests_count: number;
  completed_quests_count: number;
  active_quests: IncentiveQuest[];
  completed_quests: IncentiveQuest[];
  guarantee_card: GuaranteedEarningsData | null;
  referral_summary: DriverReferralSummary;
}
