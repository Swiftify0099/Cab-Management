/**
 * Feature 16: Driver Performance & Analytics Type Definitions
 */

export interface ReliabilityMetrics {
  acceptance_rate: number
  cancellation_rate: number
  completion_rate: number
  acceptance_target: number
  cancellation_target: number
  completion_target: number
}

export interface ActivityMetrics {
  total_trips: number
  online_hours: number
  distance_km: number
  distance_source: string
}

export interface FinancialMetrics {
  total_earnings: number
  earning_per_hour: number
  currency: string
}

export interface RatingDistributionItem {
  stars: number
  count: number
  percentage: number
}

export interface ComplimentBadgeItem {
  badge: string
  count: number
  icon: string
}

export interface RatingMetrics {
  average: number
  total_ratings: number
  distribution: RatingDistributionItem[]
  compliments: ComplimentBadgeItem[]
  complaints_count: number
}

export interface PerformanceTrends {
  acceptance_delta: string
  cancellation_delta: string
  rating_delta: string
  earning_per_hour_delta: string
}

export interface DriverPerformanceDashboardData {
  period: 'today' | 'week' | 'month' | 'all'
  start_date: string
  standing: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'RESTRICTED'
  tier_label: string
  reliability: ReliabilityMetrics
  activity: ActivityMetrics
  financial: FinancialMetrics
  rating: RatingMetrics
  trends: PerformanceTrends
}
