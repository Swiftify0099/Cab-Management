export interface AvailableScheduledRide {
  id: string;
  scheduled_pickup_time: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  estimated_fare: number;
  estimated_distance_km: number;
  ride_category: string;
  dispatch_buffer_minutes: number;
  created_at: string;
}

export interface UpcomingReservedTrip {
  id: string;
  scheduled_status: 'RESERVED' | 'DISPATCHED' | 'ACTIVE';
  scheduled_pickup_time: string;
  countdown_seconds: number;
  is_ready_to_start: boolean;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  estimated_fare: number;
  customer_name: string;
  customer_phone_masked: string;
}
