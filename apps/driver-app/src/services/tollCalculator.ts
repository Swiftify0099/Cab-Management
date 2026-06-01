/**
 * Toll Calculator Service
 * ─────────────────────────────────────────────────────────────
 * Detects toll roads from Google Directions API route data and
 * estimates FastTag toll costs based on vehicle type and distance.
 *
 * Uses:
 *  - route.warnings[] from Directions API for toll detection
 *  - Average Indian expressway toll rates per km
 */

import type { RouteData, RouteLeg } from './googleMaps'

// ─── Types ────────────────────────────────────────────────────
export interface TollPlaza {
  name: string
  estimatedCost: number   // ₹
  roadType: 'expressway' | 'highway' | 'local'
}

export interface TollSummary {
  tollsDetected: boolean
  estimatedTotal: number  // ₹ (FastTag rate)
  plazas: TollPlaza[]
  formatted: string
}

// ─── Average Toll Rates ───────────────────────────────────────
// Based on NHAI 2024 rates for FastTag (50% of cash)
const TOLL_RATES_PER_KM: Record<string, Record<string, number>> = {
  sedan:           { expressway: 0.9,  highway: 0.6,  local: 0.3 },
  suv:             { expressway: 1.2,  highway: 0.8,  local: 0.4 },
  mini:            { expressway: 0.8,  highway: 0.5,  local: 0.25 },
  tempo_traveller: { expressway: 2.1,  highway: 1.4,  local: 0.7 },
  bus:             { expressway: 3.0,  highway: 2.0,  local: 1.0 },
  coach:           { expressway: 3.5,  highway: 2.5,  local: 1.2 },
}

// Known Indian expressways/highways (partial list for detection)
const KNOWN_TOLLED_ROUTES = [
  'mumbai pune expressway',
  'yamuna expressway',
  'delhi meerut expressway',
  'agra lucknow expressway',
  'nh 48',
  'nh 44',
  'nh 8',
  'nh 7',
]

// ─── Toll Detection ───────────────────────────────────────────
/**
 * Check if a Google Directions route contains toll roads.
 * Uses both the warnings[] array and route summary text.
 */
export function detectTolls(route: RouteData): boolean {
  if (route.tollsDetected) return true

  const summary = route.warnings.join(' ').toLowerCase()
  const isTolled = KNOWN_TOLLED_ROUTES.some(r => summary.includes(r))
  if (isTolled) return true

  // Check leg start/end addresses for expressway patterns
  for (const leg of route.legs) {
    const addr = `${leg.startAddress} ${leg.endAddress}`.toLowerCase()
    if (addr.includes('expressway') || addr.includes('nh-') || addr.includes('national highway')) {
      return true
    }
  }
  return false
}

/**
 * Estimate total toll cost for a route based on distance and vehicle type.
 * Provides a breakdown per leg (useful for multi-stop trips).
 */
export function estimateTollCost(
  route: RouteData,
  vehicleType: string = 'sedan'
): TollSummary {
  if (!detectTolls(route)) {
    return {
      tollsDetected: false,
      estimatedTotal: 0,
      plazas: [],
      formatted: '₹0 (No Tolls)',
    }
  }

  const rates = TOLL_RATES_PER_KM[vehicleType] ?? TOLL_RATES_PER_KM.sedan
  const plazas: TollPlaza[] = []
  let total = 0

  for (const leg of route.legs) {
    const addr = `${leg.startAddress} ${leg.endAddress}`.toLowerCase()
    const roadType: TollPlaza['roadType'] = addr.includes('expressway')
      ? 'expressway'
      : addr.includes('national highway') || addr.includes(' nh')
        ? 'highway'
        : 'local'

    const ratePerKm = rates[roadType]
    const legCost = Math.round(leg.distanceKm * ratePerKm)

    // Only add a plaza entry if there's a meaningful toll
    if (legCost > 20) {
      plazas.push({
        name: `${leg.startAddress.split(',')[0]} → ${leg.endAddress.split(',')[0]}`,
        estimatedCost: legCost,
        roadType,
      })
      total += legCost
    }
  }

  // Minimum toll if route says toll but no specific leg matched
  if (total === 0 && detectTolls(route)) {
    total = Math.round(route.distanceKm * rates.highway)
    plazas.push({
      name: 'Route Toll (estimated)',
      estimatedCost: total,
      roadType: 'highway',
    })
  }

  return {
    tollsDetected: true,
    estimatedTotal: total,
    plazas,
    formatted: `₹${total.toLocaleString('en-IN')} (FastTag)`,
  }
}

/**
 * Simplified toll estimation when you only have distance and vehicle type
 * (useful before route is loaded — shows rough estimate on trip creation form)
 */
export function quickTollEstimate(
  distanceKm: number,
  vehicleType: string = 'sedan',
  isExpressway: boolean = false
): number {
  const rates = TOLL_RATES_PER_KM[vehicleType] ?? TOLL_RATES_PER_KM.sedan
  const rate  = isExpressway ? rates.expressway : rates.highway
  return Math.round(distanceKm * rate * 0.5) // ~50% of distance is typically tolled
}

/**
 * Format toll summary for UI display
 */
export function formatTollDisplay(summary: TollSummary): string {
  if (!summary.tollsDetected) return '₹0'
  return `₹${summary.estimatedTotal.toLocaleString('en-IN')}`
}
