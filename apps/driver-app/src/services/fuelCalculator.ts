/**
 * Fuel Cost Calculator Service
 * ─────────────────────────────────────────────────────────────
 * Estimates fuel cost, net earnings and profit margin
 * based on vehicle mileage, fuel price, distance, fare, and tolls.
 */

// ─── Types ────────────────────────────────────────────────────
export interface FuelEstimate {
  litresNeeded: number
  fuelCost: number          // ₹
  fuelCostFormatted: string
}

export interface EarningsEstimate {
  grossEarnings: number
  fuelCost: number
  tollCost: number
  platformFee: number
  netEarnings: number
  profitMargin: number      // 0–100 %
  grossFormatted: string
  netFormatted: string
}

export interface TripCostBreakdown {
  distanceKm: number
  fuelLitres: number
  fuelCost: number
  tollCost: number
  totalCost: number
  fare: number
  netProfit: number
  profitPercent: number
  summary: string
}

// ─── Vehicle Presets (average Indian km/L) ───────────────────
export const VEHICLE_MILEAGE: Record<string, number> = {
  sedan:           16,
  suv:             12,
  mini:            18,
  tempo_traveller: 8,
  bus:             6,
  coach:           5,
}

// Default petrol price ₹/litre (user can override)
export const DEFAULT_FUEL_PRICE = 105

// Platform fee percentage
const PLATFORM_FEE_PERCENT = 8

// ─── Core Calculations ────────────────────────────────────────
/**
 * Estimate fuel cost for a trip
 * @param distanceKm    Total trip distance in kilometres
 * @param mileageKmpl   Vehicle fuel efficiency in km/litre
 * @param pricePerLitre Fuel price in ₹/litre
 */
export function estimateFuelCost(
  distanceKm: number,
  mileageKmpl: number = 14,
  pricePerLitre: number = DEFAULT_FUEL_PRICE
): FuelEstimate {
  const litresNeeded = distanceKm / mileageKmpl
  const fuelCost     = Math.round(litresNeeded * pricePerLitre)

  return {
    litresNeeded: Math.round(litresNeeded * 10) / 10,
    fuelCost,
    fuelCostFormatted: `₹${fuelCost.toLocaleString('en-IN')}`,
  }
}

/**
 * Estimate net driver earnings after deducting fuel, toll, platform fee
 * @param fare          Total fare collected ₹
 * @param fuelCost      Fuel cost ₹ (from estimateFuelCost)
 * @param tollCost      Total toll cost ₹
 */
export function estimateNetEarnings(
  fare: number,
  fuelCost: number,
  tollCost: number = 0
): EarningsEstimate {
  const platformFee  = Math.round(fare * (PLATFORM_FEE_PERCENT / 100))
  const netEarnings  = fare - fuelCost - tollCost - platformFee
  const profitMargin = fare > 0 ? Math.round((netEarnings / fare) * 100) : 0

  return {
    grossEarnings:  fare,
    fuelCost,
    tollCost,
    platformFee,
    netEarnings:    Math.max(0, netEarnings),
    profitMargin:   Math.max(0, profitMargin),
    grossFormatted: `₹${fare.toLocaleString('en-IN')}`,
    netFormatted:   `₹${Math.max(0, netEarnings).toLocaleString('en-IN')}`,
  }
}

/**
 * Full trip cost breakdown in one call
 */
export function calculateTripBreakdown(
  distanceKm: number,
  fare: number,
  vehicleType: string = 'sedan',
  tollCost: number = 0,
  customMileage?: number,
  fuelPrice: number = DEFAULT_FUEL_PRICE
): TripCostBreakdown {
  const mileage = customMileage ?? (VEHICLE_MILEAGE[vehicleType] || 14)
  const fuel    = estimateFuelCost(distanceKm, mileage, fuelPrice)
  const earn    = estimateNetEarnings(fare, fuel.fuelCost, tollCost)

  return {
    distanceKm,
    fuelLitres:    fuel.litresNeeded,
    fuelCost:      fuel.fuelCost,
    tollCost,
    totalCost:     fuel.fuelCost + tollCost,
    fare,
    netProfit:     earn.netEarnings,
    profitPercent: earn.profitMargin,
    summary: [
      `Distance: ${distanceKm} km`,
      `Fuel: ${fuel.fuelCostFormatted} (${fuel.litresNeeded}L)`,
      `Toll: ₹${tollCost}`,
      `Platform: ₹${earn.platformFee}`,
      `Net Earnings: ${earn.netFormatted}`,
    ].join(' | '),
  }
}

/**
 * Format currency in Indian Rupee format
 */
export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

/**
 * Get mileage for a vehicle type (returns default if unknown)
 */
export function getMileage(vehicleType: string): number {
  return VEHICLE_MILEAGE[vehicleType] ?? 14
}
