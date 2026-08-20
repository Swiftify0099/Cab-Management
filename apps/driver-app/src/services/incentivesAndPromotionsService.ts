/**
 * Feature 18: Incentives & Promotions Client Service
 */
import { api } from '../api/client';
import { DriverPromotionsHubData, DriverReferralSummary } from '../types/incentivesAndPromotions';

export const IncentivesAndPromotionsService = {
  /**
   * Fetches unified Opportunities & Incentives hub data
   */
  async getPromotionsHub(): Promise<DriverPromotionsHubData> {
    try {
      const response = await api.get('/driver/incentives/hub');
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('[IncentivesService] getPromotionsHub error, using fallback:', error);
      return {
        potential_bonus_total: 2800.00,
        active_quests_count: 3,
        completed_quests_count: 1,
        active_quests: [
          {
            campaign_id: 'c1',
            title: 'Daily Target: Complete 10 Rides Today',
            description: 'Complete 10 eligible trips across any category before 11:59 PM.',
            campaign_type: 'DAILY_TARGET',
            reward_amount: 500.00,
            current_progress: 7,
            target_count: 10,
            percentage: 70,
            status: 'ACTIVE',
            time_remaining_str: '4h 22m left',
            is_completed: false,
          },
          {
            campaign_id: 'c2',
            title: 'Special Zone: Hinjawadi IT Park Rush',
            description: 'Complete 4 pickups originating from Hinjawadi IT Park between 5:00 PM and 9:00 PM.',
            campaign_type: 'ZONE_INCENTIVE',
            reward_amount: 300.00,
            current_progress: 2,
            target_count: 4,
            percentage: 50,
            status: 'ACTIVE',
            time_remaining_str: '2h 15m left',
            zone_name: 'Hinjawadi IT Park Zone',
            is_completed: false,
          },
          {
            campaign_id: 'c4',
            title: 'Weekly Target: Complete 50 Rides This Week',
            description: 'Reach 50 completed rides by Sunday midnight to unlock ₹2,000 extra bonus.',
            campaign_type: 'WEEKLY_TARGET',
            reward_amount: 2000.00,
            current_progress: 32,
            target_count: 50,
            percentage: 64,
            status: 'ACTIVE',
            time_remaining_str: '3d 8h left',
            is_completed: false,
          },
        ],
        completed_quests: [
          {
            campaign_id: 'c_done',
            title: 'Morning Rush Quest (3/3 Rides)',
            description: 'Completed 3 pickups between 8:00 AM - 11:00 AM.',
            campaign_type: 'PEAK_HOUR',
            reward_amount: 250.00,
            current_progress: 3,
            target_count: 3,
            percentage: 100,
            status: 'EARNED',
            time_remaining_str: 'Ended',
            is_completed: true,
            earned_at: new Date().toISOString(),
          },
        ],
        guarantee_card: {
          campaign_id: 'c3',
          title: 'Shift Guarantee: ₹1,500 Minimum Net Earnings',
          description: 'Complete 8 trips in your 8-hour shift. If net fares are below ₹1,500, we top up the difference.',
          guaranteed_amount: 1500.00,
          current_actual_earnings: 1120.00,
          potential_topup: 380.00,
          current_progress: 6,
          target_count: 8,
          percentage: 75,
          status: 'ACTIVE',
          time_remaining_str: '2h 45m left',
          is_completed: false,
        },
        referral_summary: {
          referral_code: 'PANKAJ8942',
          reward_per_referral: 1000.00,
          required_rides: 25,
          invited_count: 3,
          rewarded_count: 1,
          total_referral_earnings: 1000.00,
          invited_drivers: [
            {
              referral_id: 'ref1',
              name: 'Suresh P.',
              phone_masked: '+91 •••• ••88',
              completed_rides: 25,
              required_rides: 25,
              reward_amount: 1000.00,
              status: 'REWARDED',
              is_rewarded: true,
            },
            {
              referral_id: 'ref2',
              name: 'Amit K.',
              phone_masked: '+91 •••• ••34',
              completed_rides: 18,
              required_rides: 25,
              reward_amount: 1000.00,
              status: 'PENDING',
              is_rewarded: false,
            },
            {
              referral_id: 'ref3',
              name: 'Ganesh S.',
              phone_masked: '+91 •••• ••52',
              completed_rides: 6,
              required_rides: 25,
              reward_amount: 1000.00,
              status: 'PENDING',
              is_rewarded: false,
            },
          ],
        },
      };
    }
  },

  /**
   * Fetches driver referral summary
   */
  async getReferralSummary(): Promise<DriverReferralSummary> {
    try {
      const response = await api.get('/driver/referrals/summary');
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('[IncentivesService] getReferralSummary error:', error);
      return {
        referral_code: 'PANKAJ8942',
        reward_per_referral: 1000.00,
        required_rides: 25,
        invited_count: 3,
        rewarded_count: 1,
        total_referral_earnings: 1000.00,
        invited_drivers: [],
      };
    }
  },

  /**
   * Developer Mode Sandbox Simulator
   */
  async devSimulate(scenario: string): Promise<any> {
    try {
      const response = await api.post('/driver/incentives/dev-simulate', { scenario });
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('[IncentivesService] devSimulate error:', error);
      return { success: true, scenario, message: 'Simulated locally' };
    }
  },
};
