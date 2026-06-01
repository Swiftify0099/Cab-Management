import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Calendar, Users, Package, Search,
  ArrowRight, Zap, Clock, ChevronRight, X
} from 'lucide-react'
import { bookingApi } from '../../api/client'
import toast from 'react-hot-toast'

interface Trip {
  id: string
  pickup_city: string
  destination_city: string
  departure_time: string
  available_seats: number
  total_seats: number
  base_fare: number
  distance_km: number
  parcel_enabled: boolean
  women_only: boolean
  window_seats: number
  window_seat_charge: number
}

interface FareEstimate {
  vehicle_type: string
  per_seat_fare: number
  total_fare: number
  distance_km: number
  eta_minutes: number
  platform_fee: number
}

const VEHICLE_ICONS: Record<string, string> = {
  sedan: '🚗', suv: '🚙', mini: '🚕', tempo_traveller: '🚐', bus: '🚌',
}

export function BookCabPage() {
  const navigate = useNavigate()

  // Step 1: Search params
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')
  const [seats, setSeats] = useState(1)
  const [withParcel, setWithParcel] = useState(false)
  const [womenOnly, setWomenOnly] = useState(false)

  // Results
  const [trips, setTrips] = useState<Trip[]>([])
  const [fares, setFares] = useState<FareEstimate[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'search' | 'trips' | 'fare'>('search')

  // Booking
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [booking, setBooking] = useState(false)

  // Search trips on the platform
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!from.trim() || !to.trim() || !date) {
      toast.error('Fill in all fields')
      return
    }
    setLoading(true)
    try {
      // Try real trip search first
      const res = await bookingApi.searchTrips({
        from_city: from, to_city: to,
        departure_date: date.split('T')[0],
        seats_needed: seats,
        with_parcel: withParcel,
        women_only: womenOnly,
      })
      setTrips(res.data.data || [])
      setStep('trips')
      if ((res.data.data || []).length === 0) {
        // Fall back to fare estimates when no trips found
        await loadFareEstimates()
      }
    } catch {
      // No backend yet — show fare estimates
      await loadFareEstimates()
    } finally {
      setLoading(false)
    }
  }

  const loadFareEstimates = async () => {
    try {
      const res = await bookingApi.getFare({
        from_city: from, to_city: to,
        departure_time: new Date(date).toISOString(),
        seats, with_parcel: withParcel,
      })
      setFares(res.data.data || [])
    } catch {
      // Demo fares
      setFares([
        { vehicle_type: 'sedan', per_seat_fare: 480, total_fare: 480, distance_km: 150, eta_minutes: 180, platform_fee: 10 },
        { vehicle_type: 'suv', per_seat_fare: 700, total_fare: 700, distance_km: 150, eta_minutes: 170, platform_fee: 10 },
        { vehicle_type: 'mini', per_seat_fare: 380, total_fare: 380, distance_km: 150, eta_minutes: 195, platform_fee: 10 },
        { vehicle_type: 'tempo_traveller', per_seat_fare: 220, total_fare: 220, distance_km: 150, eta_minutes: 200, platform_fee: 10 },
      ])
    }
    setStep('fare')
  }

  const handleBookTrip = async (trip: Trip) => {
    setSelectedTrip(trip)
    setBooking(true)
    try {
      await bookingApi.create({
        trip_id: trip.id,
        seat_count: seats,
        has_parcel: withParcel,
      })
      toast.success('🎉 Seats booked! Check My Trips.')
      navigate('/trips')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Booking failed')
    } finally {
      setBooking(false); setSelectedTrip(null)
    }
  }

  const reset = () => {
    setStep('search'); setTrips([]); setFares([])
    setFrom(''); setTo(''); setDate(''); setSeats(1)
  }

  const etaLabel = (mins: number) => `${Math.floor(mins / 60)}h ${mins % 60}m`

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900">Book a Cab</h1>
            <p className="text-slate-500 text-sm mt-0.5">Intercity rides — shared or private</p>
          </div>
          {step !== 'search' && (
            <button onClick={reset} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors">
              <X size={15} /> New Search
            </button>
          )}
        </div>

        {/* ── Step 1: Search Form ─────────────────────────────── */}
        <AnimatePresence mode="wait">
          {step === 'search' && (
            <motion.form
              key="search"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              onSubmit={handleSearch}
              className="card p-6 mb-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* From */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">From</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
                    <input className="input pl-9" placeholder="Departure city (e.g. Pune)"
                      value={from} onChange={e => setFrom(e.target.value)} autoFocus />
                  </div>
                </div>

                {/* To */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">To</label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" />
                    <input className="input pl-9" placeholder="Destination city (e.g. Mumbai)"
                      value={to} onChange={e => setTo(e.target.value)} />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Travel Date & Time</label>
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                    <input type="datetime-local" className="input pl-9" value={date}
                      onChange={e => setDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)} />
                  </div>
                </div>

                {/* Seats */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Seats</label>
                  <div className="relative">
                    <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                    <select className="input pl-9 bg-white" value={seats} onChange={e => setSeats(Number(e.target.value))}>
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-3 mb-5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={withParcel} onChange={e => setWithParcel(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Package size={14} className="text-purple-500" /> Add parcel
                    <span className="badge badge-purple">+₹50</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={womenOnly} onChange={e => setWomenOnly(e.target.checked)}
                    className="w-4 h-4 rounded accent-pink-500" />
                  <span className="text-sm text-slate-600">👩 Women-only cab</span>
                </label>
              </div>

              {import.meta.env.DEV && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
                  🔧 Dev: Try <strong>Pune → Mumbai</strong>. Backend connects via Docker.
                </div>
              )}

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3 rounded-xl disabled:opacity-50">
                {loading
                  ? <span className="flex items-center gap-2 justify-center"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Searching...</span>
                  : <span className="flex items-center gap-2 justify-center"><Search size={16} /> Search Rides</span>
                }
              </button>
            </motion.form>
          )}

          {/* ── Step 2A: Available Trips ──────────────────────── */}
          {step === 'trips' && (
            <motion.div key="trips" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {trips.length > 0 ? `${trips.length} trips available` : 'No trips found'}
                </h2>
                <span className="text-sm text-slate-400">{from} → {to}</span>
              </div>

              {trips.length === 0 ? (
                <div className="card p-10 text-center mb-4">
                  <div className="text-5xl mb-3">🔍</div>
                  <p className="text-slate-600 font-medium mb-1">No trips for this route yet</p>
                  <p className="text-slate-400 text-sm mb-4">See estimated fares for a private cab instead</p>
                  <button onClick={loadFareEstimates} className="btn-primary text-sm px-5 py-2.5 rounded-xl">
                    View Fare Estimates
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {trips.map(trip => (
                    <motion.div key={trip.id} whileHover={{ scale: 1.01 }}
                      className="card p-5 cursor-pointer hover:border-blue-300 transition-all"
                      onClick={() => handleBookTrip(trip)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">🚗</div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {trip.pickup_city} → {trip.destination_city}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> {new Date(trip.departure_time).toLocaleString('en-IN')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users size={11} /> {trip.available_seats}/{trip.total_seats} seats
                              </span>
                              {trip.parcel_enabled && <span>📦 Parcel OK</span>}
                              {trip.women_only && <span>👩 Women only</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xl font-display font-bold text-slate-900">₹{trip.base_fare}</div>
                            <div className="text-xs text-slate-400">per seat</div>
                          </div>
                          <ChevronRight size={18} className="text-slate-400" />
                        </div>
                      </div>
                      {(selectedTrip?.id === trip.id && booking) && (
                        <div className="mt-3 pt-3 border-t border-blue-100 flex items-center gap-2 text-sm text-blue-600">
                          <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                          Booking your seat{seats > 1 ? 's' : ''}...
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Step 2B: Fare Estimates (private cab) ─────────── */}
          {step === 'fare' && (
            <motion.div key="fare" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-slate-900">Fare Estimates</h2>
                <span className="text-sm text-slate-400">{from} → {to}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700 flex items-center gap-2">
                <Zap size={13} /> No shared trips available — showing private cab fares. Book and we'll match you with a driver.
              </div>
              <div className="space-y-3">
                {fares.map((fare, i) => (
                  <motion.div key={fare.vehicle_type} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="card p-5 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                    onClick={() => {
                      // Generate a temporary booking ID until backend is fully wired
                      const tempBookingId = 'req_' + Math.random().toString(36).substring(2, 9);
                      navigate(`/booking/${tempBookingId}/waiting`)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{VEHICLE_ICONS[fare.vehicle_type] || '🚗'}</div>
                        <div>
                          <div className="font-semibold text-slate-900 capitalize">
                            {fare.vehicle_type.replace('_', ' ')}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Clock size={11} />{etaLabel(fare.eta_minutes)}</span>
                            <span className="flex items-center gap-1"><MapPin size={11} />{fare.distance_km} km</span>
                            <span className="flex items-center gap-1"><Zap size={11} />₹{fare.platform_fee} fee</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-display font-bold text-slate-900">₹{fare.per_seat_fare}</div>
                          <div className="text-xs text-slate-400">per seat</div>
                          {seats > 1 && <div className="text-xs text-blue-600 font-medium">₹{fare.total_fare * seats} total</div>}
                        </div>
                        <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty initial state */}
        {step === 'search' && !loading && (
          <div className="card p-10 text-center">
            <div className="text-5xl mb-3 animate-float">🚗</div>
            <h3 className="font-semibold text-slate-700 mb-1">Ready to go?</h3>
            <p className="text-slate-400 text-sm">Enter your route above to find shared trips or get fare estimates</p>
          </div>
        )}
      </div>
    </div>
  )
}
