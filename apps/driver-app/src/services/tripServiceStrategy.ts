/**
 * Trip Service Strategy & Types
 * Unified abstraction layer for the 7 supported mobility verticals:
 * 1. Cab (Passenger Rideshare)
 * 2. Transport (Goods / Cargo)
 * 3. Organization (Colleges / Corporate Routes)
 * 4. Parcel (Courier / Package Delivery)
 * 5. Hotel Transfer (Airport / Station / City Hospitality Transfers)
 * 6. Airport Transfer (Flight-based Scheduled Airport Rides)
 * 7. Packers & Movers (Residential / Commercial Relocation)
 */

export type ServiceTypeKey =
  | 'cab'
  | 'transport'
  | 'organization'
  | 'parcel'
  | 'hotel'
  | 'airport'
  | 'packers'

export interface ServiceDefinition {
  key: ServiceTypeKey
  title: string
  subtitle: string
  icon: string
  iconFamily: 'MaterialCommunityIcons' | 'Feather' | 'Ionicons'
  badge: string
  color: string
}

export const SUPPORTED_SERVICES: ServiceDefinition[] = [
  {
    key: 'cab',
    title: 'Cab Service',
    subtitle: 'Intercity passenger rideshare & fixed routes',
    icon: 'car-side',
    iconFamily: 'MaterialCommunityIcons',
    badge: 'Popular',
    color: '#3B82F6',
  },
  {
    key: 'transport',
    title: 'Transport / Goods',
    subtitle: 'Commercial cargo, machinery & freight loads',
    icon: 'truck',
    iconFamily: 'Feather',
    badge: 'Commercial',
    color: '#F59E0B',
  },
  {
    key: 'organization',
    title: 'Organization / College',
    subtitle: 'Campus bus & student/employee fixed timetable',
    icon: 'school-outline',
    iconFamily: 'Ionicons',
    badge: 'Institutional',
    color: '#8B5CF6',
  },
  {
    key: 'parcel',
    title: 'Parcel Delivery',
    subtitle: 'Direct package, documents & box courier',
    icon: 'package-variant-closed',
    iconFamily: 'MaterialCommunityIcons',
    badge: 'Express',
    color: '#10B981',
  },
  {
    key: 'hotel',
    title: 'Hotel Transfer',
    subtitle: 'Airport & station guest pickup/drop transfers',
    icon: 'office-building',
    iconFamily: 'MaterialCommunityIcons',
    badge: 'Hospitality',
    color: '#EC4899',
  },
  {
    key: 'airport',
    title: 'Airport Transfer',
    subtitle: 'Flight-scheduled terminal pickup & luggage rides',
    icon: 'airplane-takeoff',
    iconFamily: 'MaterialCommunityIcons',
    badge: 'Priority',
    color: '#06B6D4',
  },
  {
    key: 'packers',
    title: 'Packers & Movers',
    subtitle: 'Home shifting, office relocation & full loading',
    icon: 'dolly',
    iconFamily: 'MaterialCommunityIcons',
    badge: 'Relocation',
    color: '#F97316',
  },
]

// ─── Service Specific Metadata Schemas ───────────────────────────────────────

export interface CabServiceMeta {
  trip_purpose: 'fixed_route' | 'commercial' | 'contracted' | 'personal'
  allow_luggage: boolean
}

export interface TransportServiceMeta {
  material_category: 'industrial' | 'electronics' | 'commercial' | 'general' | 'fragile'
  weight_capacity_kg: number
  volume_capacity_cft?: number
  loading_unloading_included: boolean
  special_handling_notes?: string
}

export interface OrganizationServiceMeta {
  organization_id?: string
  organization_name?: string
  route_id?: string
  route_name?: string
  designated_shift: 'morning_pickup' | 'evening_drop' | 'custom'
  student_count?: number
}

export interface ParcelServiceMeta {
  max_weight_kg: number
  max_dimensions?: string // e.g. '50x40x30 cm'
  fragile_accepted: boolean
  document_only: boolean
  same_day_delivery: boolean
  special_instructions?: string
}

export interface HotelServiceMeta {
  hotel_name: string
  room_or_lobby_pickup: boolean
  transfer_target: 'airport' | 'railway_station' | 'bus_terminal' | 'city_center'
  guest_luggage_count: number
  flight_or_train_number?: string
}

export interface AirportServiceMeta {
  airport_name: string
  terminal_number: string
  flight_number?: string
  flight_time_type: 'arrival' | 'departure'
  buffer_minutes: number
  passenger_count: number
  luggage_count: number
}

export interface PackersServiceMeta {
  move_type: '1bhk' | '2bhk' | '3bhk' | 'office' | 'custom_relocation'
  furniture_count: number
  boxes_count: number
  has_lift_pickup: boolean
  has_lift_drop: boolean
  floor_pickup: number
  floor_drop: number
  service_tier: 'transport_only' | 'loading_transport' | 'full_packing_moving'
}

export type AnyServiceMeta =
  | CabServiceMeta
  | TransportServiceMeta
  | OrganizationServiceMeta
  | ParcelServiceMeta
  | HotelServiceMeta
  | AirportServiceMeta
  | PackersServiceMeta

export const DEFAULT_SERVICE_METADATA: Record<ServiceTypeKey, any> = {
  cab: { trip_purpose: 'fixed_route', allow_luggage: true },
  transport: {
    material_category: 'general',
    weight_capacity_kg: 500,
    loading_unloading_included: false,
  },
  organization: {
    designated_shift: 'morning_pickup',
  },
  parcel: {
    max_weight_kg: 15,
    fragile_accepted: true,
    document_only: false,
    same_day_delivery: true,
  },
  hotel: {
    hotel_name: '',
    room_or_lobby_pickup: true,
    transfer_target: 'airport',
    guest_luggage_count: 2,
  },
  airport: {
    airport_name: 'Pune International Airport (PNQ)',
    terminal_number: 'T1',
    flight_time_type: 'departure',
    buffer_minutes: 30,
    passenger_count: 3,
    luggage_count: 3,
  },
  packers: {
    move_type: '2bhk',
    furniture_count: 8,
    boxes_count: 15,
    has_lift_pickup: true,
    has_lift_drop: true,
    floor_pickup: 2,
    floor_drop: 3,
    service_tier: 'loading_transport',
  },
}
