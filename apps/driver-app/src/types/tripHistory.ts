export type TripStatusFilter = 'ALL' | 'COMPLETED' | 'CANCELLED';
export type TripDateFilter = 'ALL_TIME' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';

export interface TripHistoryItem {
  id: string;
  pickup_address: string;
  destination_address: string;
  status: string;
  is_completed: boolean;
  is_cancelled: boolean;
  driver_net_earning: number;
  customer_final_fare: number;
  distance_km: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  destination_arrived_at?: string | null;
}

export interface TripKPIPeriodSummary {
  period: string;
  total_completed_trips: number;
  total_net_earnings: number;
  total_distance_km: number;
}

export interface DetailedTripReceipt {
  ride_id: string;
  status: string;
  financial_breakdown: {
    receipt_number: string;
    base_fare: number;
    distance_km: number;
    distance_charge: number;
    duration_min: number;
    time_charge: number;
    waiting_charge: number;
    stops_fee: number;
    tolls_charge: number;
    parking_charge: number;
    taxes_and_fees: number;
    discount_amount: number;
    surge_multiplier: number;
    customer_final_fare: number;
    platform_commission: number;
    driver_net_earning: number;
    tip_amount: number;
    payment_method: string;
    payment_status: string;
  };
  route_timeline: {
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    pickup_time: string;
    intermediate_stops: Array<{
      sequence: number;
      address: string;
      arrived_at?: string;
    }>;
    destination_address: string;
    destination_lat: number;
    destination_lng: number;
    dropoff_time?: string;
    total_distance_km: number;
  };
  passenger_feedback?: {
    rating: number;
    compliments: string[];
    feedback?: string;
    rated_at: string;
  } | null;
  cancellation_info?: {
    cancelled_by: string;
    reason_code: string;
    reason_text: string;
    cancelled_at: string;
  } | null;
  support_dispute_link: string;
}
