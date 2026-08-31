/**
 * Comprehensive Vehicle Catalog for Indian Transportation & Ride-Hailing Market
 * Provides categorized Brands, Models, Vehicle Types, Seat Capacities, and Colors.
 */

export interface VehicleModelInfo {
  model: string
  vehicle_type: 'sedan' | 'suv' | 'mini' | 'premium_suv' | 'auto' | 'tempo_traveller' | 'goods_carrier'
  seat_capacity: number
  fuel_types: string[]
  display_type: string
}

export interface VehicleBrandInfo {
  brand: string
  logo_icon: string
  category: 'car' | 'auto' | 'traveller' | 'commercial'
  models: VehicleModelInfo[]
}

export const VEHICLE_BRANDS_CATALOG: VehicleBrandInfo[] = [
  {
    brand: 'Maruti Suzuki',
    logo_icon: '🚗',
    category: 'car',
    models: [
      { model: 'Dzire', vehicle_type: 'sedan', seat_capacity: 4, fuel_types: ['CNG', 'Petrol'], display_type: 'Sedan' },
      { model: 'Swift', vehicle_type: 'mini', seat_capacity: 4, fuel_types: ['Petrol', 'CNG'], display_type: 'Hatchback / Mini' },
      { model: 'WagonR', vehicle_type: 'mini', seat_capacity: 4, fuel_types: ['CNG', 'Petrol'], display_type: 'Hatchback / Mini' },
      { model: 'Ertiga', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['CNG', 'Petrol'], display_type: 'MPV / 6 Seater' },
      { model: 'Baleno', vehicle_type: 'mini', seat_capacity: 4, fuel_types: ['Petrol', 'CNG'], display_type: 'Hatchback / Mini' },
      { model: 'Brezza', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Petrol', 'CNG'], display_type: 'Compact SUV' },
      { model: 'Ciaz', vehicle_type: 'sedan', seat_capacity: 4, fuel_types: ['Petrol'], display_type: 'Premium Sedan' },
      { model: 'XL6', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Petrol', 'CNG'], display_type: 'MPV / 6 Seater' },
      { model: 'Grand Vitara', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Hybrid', 'Petrol', 'CNG'], display_type: 'SUV' },
      { model: 'Eeco', vehicle_type: 'mini', seat_capacity: 6, fuel_types: ['CNG', 'Petrol'], display_type: 'Van / 6 Seater' },
      { model: 'Alto K10', vehicle_type: 'mini', seat_capacity: 4, fuel_types: ['CNG', 'Petrol'], display_type: 'Hatchback / Mini' },
      { model: 'Fronx', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Petrol', 'CNG'], display_type: 'Compact SUV' },
    ],
  },
  {
    brand: 'Hyundai',
    logo_icon: '🚘',
    category: 'car',
    models: [
      { model: 'Aura', vehicle_type: 'sedan', seat_capacity: 4, fuel_types: ['CNG', 'Petrol'], display_type: 'Sedan' },
      { model: 'Grand i10 Nios', vehicle_type: 'mini', seat_capacity: 4, fuel_types: ['Petrol', 'CNG'], display_type: 'Hatchback / Mini' },
      { model: 'Creta', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Diesel', 'Petrol'], display_type: 'Mid-size SUV' },
      { model: 'Verna', vehicle_type: 'sedan', seat_capacity: 4, fuel_types: ['Petrol'], display_type: 'Premium Sedan' },
      { model: 'Venue', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Petrol', 'Diesel'], display_type: 'Compact SUV' },
      { model: 'Alcazar', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Diesel', 'Petrol'], display_type: 'SUV / 6-7 Seater' },
      { model: 'Exter', vehicle_type: 'mini', seat_capacity: 4, fuel_types: ['Petrol', 'CNG'], display_type: 'Micro SUV' },
      { model: 'i20', vehicle_type: 'mini', seat_capacity: 4, fuel_types: ['Petrol'], display_type: 'Premium Hatchback' },
    ],
  },
  {
    brand: 'Tata Motors',
    logo_icon: '🚙',
    category: 'car',
    models: [
      { model: 'Tigor / Tigor EV', vehicle_type: 'sedan', seat_capacity: 4, fuel_types: ['Electric', 'CNG', 'Petrol'], display_type: 'Sedan / EV' },
      { model: 'Tiago / Tiago EV', vehicle_type: 'mini', seat_capacity: 4, fuel_types: ['Electric', 'CNG', 'Petrol'], display_type: 'Hatchback / EV' },
      { model: 'Nexon / Nexon EV', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Electric', 'Petrol', 'Diesel', 'CNG'], display_type: 'Compact SUV' },
      { model: 'Punch / Punch EV', vehicle_type: 'mini', seat_capacity: 4, fuel_types: ['Petrol', 'CNG', 'Electric'], display_type: 'Micro SUV' },
      { model: 'Harrier', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Diesel'], display_type: 'Premium SUV' },
      { model: 'Safari', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Diesel'], display_type: 'Luxury SUV / 6-7 Seater' },
      { model: 'Curvv', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Electric', 'Petrol', 'Diesel'], display_type: 'Coupe SUV' },
      { model: 'Tata Ace (Chota Hathi)', vehicle_type: 'goods_carrier', seat_capacity: 2, fuel_types: ['Diesel', 'CNG', 'Electric'], display_type: 'Goods Mini Truck' },
      { model: 'Intra V30 / V50', vehicle_type: 'goods_carrier', seat_capacity: 2, fuel_types: ['Diesel'], display_type: 'Commercial Pickup' },
      { model: 'Winger', vehicle_type: 'tempo_traveller', seat_capacity: 12, fuel_types: ['Diesel'], display_type: 'Traveller / 12-15 Seater' },
    ],
  },
  {
    brand: 'Mahindra',
    logo_icon: '🚙',
    category: 'car',
    models: [
      { model: 'Scorpio-N', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Diesel', 'Petrol'], display_type: 'SUV / 6-7 Seater' },
      { model: 'Scorpio Classic', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Diesel'], display_type: 'SUV / 7 Seater' },
      { model: 'XUV700', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Diesel', 'Petrol'], display_type: 'Luxury SUV / 6-7 Seater' },
      { model: 'XUV 3XO', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Petrol', 'Diesel'], display_type: 'Compact SUV' },
      { model: 'Bolero', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Diesel'], display_type: 'Utility SUV / 7 Seater' },
      { model: 'Bolero Neo', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Diesel'], display_type: 'Compact SUV / 7 Seater' },
      { model: 'Thar / Thar Roxx', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Diesel', 'Petrol'], display_type: 'Off-Road 4x4 / 5-Door' },
      { model: 'Marazzo', vehicle_type: 'suv', seat_capacity: 7, fuel_types: ['Diesel'], display_type: 'MPV / 7-8 Seater' },
      { model: 'Bolero Maxi Truck', vehicle_type: 'goods_carrier', seat_capacity: 2, fuel_types: ['Diesel', 'CNG'], display_type: 'Commercial Pickup' },
    ],
  },
  {
    brand: 'Toyota',
    logo_icon: '🚘',
    category: 'car',
    models: [
      { model: 'Innova Crysta', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Diesel'], display_type: 'Premium MPV / 6-7 Seater' },
      { model: 'Innova Hycross', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Hybrid', 'Petrol'], display_type: 'Luxury Hybrid MPV' },
      { model: 'Fortuner', vehicle_type: 'premium_suv', seat_capacity: 6, fuel_types: ['Diesel', 'Petrol'], display_type: 'Luxury Full-size SUV' },
      { model: 'Glanza', vehicle_type: 'mini', seat_capacity: 4, fuel_types: ['Petrol', 'CNG'], display_type: 'Hatchback / Mini' },
      { model: 'Urban Cruiser Taisor', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Petrol', 'CNG'], display_type: 'Compact SUV' },
      { model: 'Rumion', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['CNG', 'Petrol'], display_type: 'MPV / 6 Seater' },
      { model: 'Camry Hybrid', vehicle_type: 'sedan', seat_capacity: 4, fuel_types: ['Hybrid'], display_type: 'Executive Luxury Sedan' },
      { model: 'Vellfire', vehicle_type: 'premium_suv', seat_capacity: 6, fuel_types: ['Hybrid'], display_type: 'VIP Luxury Chauffeur' },
    ],
  },
  {
    brand: 'Kia',
    logo_icon: '🏎️',
    category: 'car',
    models: [
      { model: 'Carens', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Diesel', 'Petrol'], display_type: 'MPV / 6-7 Seater' },
      { model: 'Seltos', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Petrol', 'Diesel'], display_type: 'Mid-size SUV' },
      { model: 'Sonet', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Diesel', 'Petrol'], display_type: 'Compact SUV' },
      { model: 'Carnival', vehicle_type: 'premium_suv', seat_capacity: 6, fuel_types: ['Diesel'], display_type: 'VIP Luxury MPV' },
      { model: 'EV6', vehicle_type: 'premium_suv', seat_capacity: 4, fuel_types: ['Electric'], display_type: 'Luxury Electric Crossover' },
    ],
  },
  {
    brand: 'Honda',
    logo_icon: '🚗',
    category: 'car',
    models: [
      { model: 'Amaze', vehicle_type: 'sedan', seat_capacity: 4, fuel_types: ['Petrol'], display_type: 'Sedan' },
      { model: 'City / City Hybrid', vehicle_type: 'sedan', seat_capacity: 4, fuel_types: ['Petrol', 'Hybrid'], display_type: 'Executive Sedan' },
      { model: 'Elevate', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Petrol'], display_type: 'Mid-size SUV' },
    ],
  },
  {
    brand: 'MG Motor',
    logo_icon: '🚘',
    category: 'car',
    models: [
      { model: 'Hector / Hector Plus', vehicle_type: 'suv', seat_capacity: 6, fuel_types: ['Petrol', 'Diesel'], display_type: 'SUV / 6-7 Seater' },
      { model: 'ZS EV', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Electric'], display_type: 'Electric SUV' },
      { model: 'Astor', vehicle_type: 'suv', seat_capacity: 4, fuel_types: ['Petrol'], display_type: 'Compact SUV' },
      { model: 'Comet EV', vehicle_type: 'mini', seat_capacity: 3, fuel_types: ['Electric'], display_type: 'Compact City EV' },
      { model: 'Gloster', vehicle_type: 'premium_suv', seat_capacity: 6, fuel_types: ['Diesel'], display_type: 'Luxury 4x4 SUV' },
    ],
  },
  {
    brand: 'Bajaj Auto',
    logo_icon: '🛺',
    category: 'auto',
    models: [
      { model: 'Compact RE 4S Auto', vehicle_type: 'auto', seat_capacity: 3, fuel_types: ['CNG', 'LPG', 'Petrol'], display_type: '3-Wheeler Passenger Auto' },
      { model: 'Maxima Z Auto', vehicle_type: 'auto', seat_capacity: 4, fuel_types: ['CNG', 'Diesel'], display_type: 'Large Passenger Auto' },
      { model: 'Bajaj Maxima C (Cargo)', vehicle_type: 'goods_carrier', seat_capacity: 1, fuel_types: ['CNG', 'Diesel'], display_type: 'Cargo 3-Wheeler' },
      { model: 'Qute (Quadricycle)', vehicle_type: 'mini', seat_capacity: 3, fuel_types: ['CNG', 'Petrol'], display_type: '4-Wheel City Auto' },
    ],
  },
  {
    brand: 'Piaggio',
    logo_icon: '🛺',
    category: 'auto',
    models: [
      { model: 'Ape City Plus', vehicle_type: 'auto', seat_capacity: 3, fuel_types: ['CNG', 'LPG', 'Petrol'], display_type: '3-Wheeler Auto' },
      { model: 'Ape Auto DX', vehicle_type: 'auto', seat_capacity: 4, fuel_types: ['Diesel', 'CNG'], display_type: 'Passenger Auto DX' },
      { model: 'Ape E-City (Electric)', vehicle_type: 'auto', seat_capacity: 3, fuel_types: ['Electric'], display_type: 'Electric Auto' },
      { model: 'Ape Xtra LDX (Cargo)', vehicle_type: 'goods_carrier', seat_capacity: 1, fuel_types: ['CNG', 'Diesel'], display_type: 'Cargo Delivery Auto' },
    ],
  },
  {
    brand: 'Force Motors',
    logo_icon: '🚐',
    category: 'traveller',
    models: [
      { model: 'Traveller 3050 (9-12 Seater)', vehicle_type: 'tempo_traveller', seat_capacity: 12, fuel_types: ['Diesel'], display_type: 'Tempo Traveller / 12 Seats' },
      { model: 'Traveller 3350 (13-17 Seater)', vehicle_type: 'tempo_traveller', seat_capacity: 16, fuel_types: ['Diesel'], display_type: 'Tempo Traveller / 16 Seats' },
      { model: 'Traveller 4020 (20-26 Seater)', vehicle_type: 'tempo_traveller', seat_capacity: 20, fuel_types: ['Diesel'], display_type: 'Mini Bus / 20-26 Seats' },
      { model: 'Urbania (Luxury Van)', vehicle_type: 'tempo_traveller', seat_capacity: 13, fuel_types: ['Diesel'], display_type: 'Luxury Executive Traveller' },
      { model: 'Trax Cruiser', vehicle_type: 'suv', seat_capacity: 9, fuel_types: ['Diesel'], display_type: 'Multi-Utility / 9-12 Seater' },
    ],
  },
  {
    brand: 'Ashok Leyland',
    logo_icon: '🚚',
    category: 'commercial',
    models: [
      { model: 'Dost+ / Dost Strong', vehicle_type: 'goods_carrier', seat_capacity: 2, fuel_types: ['Diesel', 'CNG'], display_type: 'Commercial Mini Truck' },
      { model: 'Bada Dost i3 / i4', vehicle_type: 'goods_carrier', seat_capacity: 3, fuel_types: ['Diesel'], display_type: 'Heavy Pickup Truck' },
      { model: 'Partner 4-Tyre', vehicle_type: 'goods_carrier', seat_capacity: 3, fuel_types: ['Diesel'], display_type: 'Light Commercial Vehicle' },
    ],
  },
]

export const POPULAR_VEHICLE_COLORS = [
  { name: 'Pearl White', hex: '#FFFFFF', border: '#CBD5E1' },
  { name: 'Silky Silver', hex: '#E2E8F0', border: '#94A3B8' },
  { name: 'Midnight Black', hex: '#0F172A', border: '#475569' },
  { name: 'Magma Grey', hex: '#64748B', border: '#475569' },
  { name: 'Nexa Blue', hex: '#1E3A8A', border: '#3B82F6' },
  { name: 'Prime Red', hex: '#DC2626', border: '#EF4444' },
  { name: 'Golden Brown', hex: '#78350F', border: '#D97706' },
  { name: 'Yellow & Black (Auto)', hex: '#EAB308', border: '#CA8A04' },
  { name: 'Olive Green', hex: '#365314', border: '#65A30D' },
]

export const VEHICLE_YEARS = Array.from({ length: 12 }, (_, i) => String(2026 - i))

/**
 * Helper to find model info from brand and model name
 */
export function getModelDetails(brandName: string, modelName: string): VehicleModelInfo | undefined {
  const brand = VEHICLE_BRANDS_CATALOG.find(
    b => b.brand.toLowerCase() === brandName.toLowerCase()
  )
  if (!brand) return undefined
  return brand.models.find(
    m => m.model.toLowerCase() === modelName.toLowerCase()
  )
}
