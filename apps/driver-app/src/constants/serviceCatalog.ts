/**
 * SuperApp Central Normalized Service Catalog — Production Grade
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative single source of truth for all 10 mobility & logistics verticals:
 *  1. CAB_LOCAL — On-demand urban passenger rides
 *  2. INTERCITY — Point-to-point intercity cabs
 *  3. AIRPORT_TRANSFER — Terminal pickups & flight radar tracking
 *  4. RENTAL — Hourly rental packages (2hr/20km, 4hr/40km, 8hr/80km)
 *  5. OUTSTATION — Multi-day trips, night allowances & toll logging
 *  6. CARPOOL — Corridor ridesharing with per-seat billing
 *  7. PARCEL — Direct package delivery with photo & OTP POD
 *  8. GOODS_TRANSPORT — Commercial freight, mini trucks & open bidding
 *  9. PACKERS_MOVERS — Residential & commercial relocation shifting
 * 10. CORPORATE — Tech park employee commute & direct company billing
 */

export type ServiceType =
  | 'CAB_LOCAL'
  | 'INTERCITY'
  | 'AIRPORT_TRANSFER'
  | 'RENTAL'
  | 'OUTSTATION'
  | 'CARPOOL'
  | 'PARCEL'
  | 'GOODS_TRANSPORT'
  | 'PACKERS_MOVERS'
  | 'CORPORATE'

export type ServiceCategory = 'PASSENGER_MOBILITY' | 'LOGISTICS_FREIGHT' | 'INSTITUTIONAL_B2B'

export type PricingModel =
  | 'METERED_DISTANCE_TIME'
  | 'PER_SEAT_FLAT'
  | 'HOURLY_PACKAGE'
  | 'CARGO_OPEN_BIDDING'
  | 'CORPORATE_INVOICE'
  | 'DIRECT_HOTEL_FOLIO'

export type MatchingModel =
  | 'UBER_NEARBY_FANOUT'
  | 'CORRIDOR_WAYPOINT'
  | 'OPEN_BIDDING_MARKET'
  | 'SCHEDULED_ROSTER'

export interface ServiceCatalogItem {
  service_type: ServiceType
  display_name: string
  description: string
  category: ServiceCategory
  required_vehicle_types: string[]
  required_documents: string[]
  pricing_model: PricingModel
  matching_model: MatchingModel
  negotiation_allowed: boolean
  tracking_required: boolean
  otp_required: boolean
  proof_of_delivery_required: boolean
  payment_model: 'CASH_AND_ONLINE' | 'DIRECT_CORPORATE_INVOICE' | 'HOTEL_FOLIO'
  icon: string
  color: string
}

export const CENTRAL_SERVICE_CATALOG: Record<ServiceType, ServiceCatalogItem> = {
  CAB_LOCAL: {
    service_type: 'CAB_LOCAL',
    display_name: 'City Ride',
    description: 'On-demand local passenger cab service with metered fare',
    category: 'PASSENGER_MOBILITY',
    required_vehicle_types: ['hatchback', 'sedan', 'suv'],
    required_documents: ['driving_license', 'vehicle_rc', 'insurance', 'permit', 'puc'],
    pricing_model: 'METERED_DISTANCE_TIME',
    matching_model: 'UBER_NEARBY_FANOUT',
    negotiation_allowed: false,
    tracking_required: true,
    otp_required: true,
    proof_of_delivery_required: false,
    payment_model: 'CASH_AND_ONLINE',
    icon: 'navigation',
    color: '#3B82F6',
  },
  INTERCITY: {
    service_type: 'INTERCITY',
    display_name: 'Intercity Cab',
    description: 'Point-to-point intercity passenger transport',
    category: 'PASSENGER_MOBILITY',
    required_vehicle_types: ['sedan', 'suv', 'tempo_traveller'],
    required_documents: ['driving_license', 'vehicle_rc', 'insurance', 'permit', 'puc'],
    pricing_model: 'METERED_DISTANCE_TIME',
    matching_model: 'UBER_NEARBY_FANOUT',
    negotiation_allowed: true,
    tracking_required: true,
    otp_required: true,
    proof_of_delivery_required: false,
    payment_model: 'CASH_AND_ONLINE',
    icon: 'map',
    color: '#0284C7',
  },
  AIRPORT_TRANSFER: {
    service_type: 'AIRPORT_TRANSFER',
    display_name: 'Airport Transfer',
    description: 'Airport terminal pickups with live flight radar and delay adjustments',
    category: 'PASSENGER_MOBILITY',
    required_vehicle_types: ['sedan', 'suv', 'luxury_sedan'],
    required_documents: ['driving_license', 'vehicle_rc', 'insurance', 'permit', 'puc'],
    pricing_model: 'METERED_DISTANCE_TIME',
    matching_model: 'SCHEDULED_ROSTER',
    negotiation_allowed: false,
    tracking_required: true,
    otp_required: true,
    proof_of_delivery_required: false,
    payment_model: 'CASH_AND_ONLINE',
    icon: 'navigation-2',
    color: '#0284C7',
  },
  RENTAL: {
    service_type: 'RENTAL',
    display_name: 'Hourly Rental',
    description: 'Chauffeur-driven cab packages (2hr/20km, 4hr/40km, 8hr/80km)',
    category: 'PASSENGER_MOBILITY',
    required_vehicle_types: ['sedan', 'suv'],
    required_documents: ['driving_license', 'vehicle_rc', 'insurance', 'permit', 'puc'],
    pricing_model: 'HOURLY_PACKAGE',
    matching_model: 'UBER_NEARBY_FANOUT',
    negotiation_allowed: false,
    tracking_required: true,
    otp_required: true,
    proof_of_delivery_required: false,
    payment_model: 'CASH_AND_ONLINE',
    icon: 'clock',
    color: '#8B5CF6',
  },
  OUTSTATION: {
    service_type: 'OUTSTATION',
    display_name: 'Outstation Packages',
    description: 'Multi-day one-way or round-trip outstation travel with night allowance',
    category: 'PASSENGER_MOBILITY',
    required_vehicle_types: ['sedan', 'suv', 'tempo_traveller'],
    required_documents: ['driving_license', 'vehicle_rc', 'insurance', 'permit', 'puc'],
    pricing_model: 'METERED_DISTANCE_TIME',
    matching_model: 'UBER_NEARBY_FANOUT',
    negotiation_allowed: true,
    tracking_required: true,
    otp_required: true,
    proof_of_delivery_required: false,
    payment_model: 'CASH_AND_ONLINE',
    icon: 'map-pin',
    color: '#8B5CF6',
  },
  CARPOOL: {
    service_type: 'CARPOOL',
    display_name: 'Carpool & Rideshare',
    description: 'Daily commuter corridor ridesharing with per-seat fixed pricing',
    category: 'PASSENGER_MOBILITY',
    required_vehicle_types: ['hatchback', 'sedan', 'suv'],
    required_documents: ['driving_license', 'vehicle_rc', 'insurance'],
    pricing_model: 'PER_SEAT_FLAT',
    matching_model: 'CORRIDOR_WAYPOINT',
    negotiation_allowed: false,
    tracking_required: true,
    otp_required: true,
    proof_of_delivery_required: false,
    payment_model: 'CASH_AND_ONLINE',
    icon: 'users',
    color: '#10B981',
  },
  PARCEL: {
    service_type: 'PARCEL',
    display_name: 'Parcel Delivery',
    description: 'Express door-to-door document & parcel delivery with photo POD',
    category: 'LOGISTICS_FREIGHT',
    required_vehicle_types: ['bike', 'hatchback', 'sedan'],
    required_documents: ['driving_license', 'vehicle_rc', 'insurance'],
    pricing_model: 'METERED_DISTANCE_TIME',
    matching_model: 'UBER_NEARBY_FANOUT',
    negotiation_allowed: false,
    tracking_required: true,
    otp_required: true,
    proof_of_delivery_required: true,
    payment_model: 'CASH_AND_ONLINE',
    icon: 'package',
    color: '#10B981',
  },
  GOODS_TRANSPORT: {
    service_type: 'GOODS_TRANSPORT',
    display_name: 'Commercial Freight',
    description: 'Heavy goods, machinery & cargo transport with open quotation bidding',
    category: 'LOGISTICS_FREIGHT',
    required_vehicle_types: ['mini_truck', 'truck', 'large_truck'],
    required_documents: ['driving_license', 'vehicle_rc', 'insurance', 'commercial_permit', 'fitness_certificate'],
    pricing_model: 'CARGO_OPEN_BIDDING',
    matching_model: 'OPEN_BIDDING_MARKET',
    negotiation_allowed: true,
    tracking_required: true,
    otp_required: true,
    proof_of_delivery_required: true,
    payment_model: 'CASH_AND_ONLINE',
    icon: 'truck',
    color: '#0284C7',
  },
  PACKERS_MOVERS: {
    service_type: 'PACKERS_MOVERS',
    display_name: 'Packers & Movers',
    description: 'House shifting & office relocation with labor crew and packaging',
    category: 'LOGISTICS_FREIGHT',
    required_vehicle_types: ['truck', 'large_truck', 'container_truck'],
    required_documents: ['driving_license', 'vehicle_rc', 'insurance', 'commercial_permit'],
    pricing_model: 'CARGO_OPEN_BIDDING',
    matching_model: 'OPEN_BIDDING_MARKET',
    negotiation_allowed: true,
    tracking_required: true,
    otp_required: true,
    proof_of_delivery_required: true,
    payment_model: 'CASH_AND_ONLINE',
    icon: 'box',
    color: '#F97316',
  },
  CORPORATE: {
    service_type: 'CORPORATE',
    display_name: 'Corporate Commute',
    description: 'Dedicated tech park shift rosters with 100% direct company billing',
    category: 'INSTITUTIONAL_B2B',
    required_vehicle_types: ['sedan', 'suv', 'tempo_traveller', 'mini_bus'],
    required_documents: ['driving_license', 'vehicle_rc', 'insurance', 'commercial_permit', 'police_verification'],
    pricing_model: 'CORPORATE_INVOICE',
    matching_model: 'SCHEDULED_ROSTER',
    negotiation_allowed: false,
    tracking_required: true,
    otp_required: true,
    proof_of_delivery_required: false,
    payment_model: 'DIRECT_CORPORATE_INVOICE',
    icon: 'briefcase',
    color: '#2563EB',
  },
}

export function getServiceConfig(type: ServiceType): ServiceCatalogItem {
  return CENTRAL_SERVICE_CATALOG[type] || CENTRAL_SERVICE_CATALOG.CAB_LOCAL
}
