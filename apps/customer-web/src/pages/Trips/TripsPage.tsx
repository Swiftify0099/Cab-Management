import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Clock, Package, X, RefreshCw } from 'lucide-react'
import { bookingApi } from '../../api/client'
import toast from 'react-hot-toast'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:         { label: 'Pending',        color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-400' },
  confirmed:       { label: 'Confirmed',      color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     dot: 'bg-blue-500' },
  payment_pending: { label: 'Pay Now',        color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-400' },
  paid:            { label: 'Paid',           color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200',dot: 'bg-emerald-500' },
  driver_accepted: { label: 'Driver En Route',color: 'text-cyan-700',   bg: 'bg-cyan-50 border-cyan-200',     dot: 'bg-cyan-500' },
  started:         { label: 'In Progress 🚗', color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   dot: 'bg-green-500' },
  completed:       { label: 'Completed ✅',   color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  cancelled:       { label: 'Cancelled',      color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       dot: 'bg-red-400' },
}

const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Upcoming', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

export function TripsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-trips', statusFilter],
    queryFn: async () => {
      try {
        const res = await bookingApi.getMyTrips(statusFilter ? { status: statusFilter } : undefined)
        return res.data.data || []
      } catch {
        // Demo data
        return [
          {
            id: 'b1', trip_id: 't1', seat_count: 2, has_parcel: false,
            base_fare: 960, platform_fee: 20, total_fare: 980,
            status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString(),
            pickup_address: null, drop_address: null,
            trip: { pickup_city: 'Pune', destination_city: 'Mumbai', departure_time: new Date(Date.now() - 86400000).toISOString() }
          },
          {
            id: 'b2', trip_id: 't2', seat_count: 1, has_parcel: true,
            base_fare: 480, platform_fee: 10, total_fare: 540,
            status: 'pending', created_at: new Date().toISOString(),
            pickup_address: null, drop_address: null,
            trip: { pickup_city: 'Pune', destination_city: 'Nashik', departure_time: new Date(Date.now() + 7200000).toISOString() }
          },
        ]
      }
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bookingApi.cancelTrip(id, reason),
    onSuccess: () => {
      toast.success('Booking cancelled')
      setCancelBookingId(null)
      setCancelReason('')
      qc.invalidateQueries({ queryKey: ['my-trips'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Cancellation failed'),
  })

  const trips = (statusFilter ? data?.filter((t: any) => t.status === statusFilter) : data) || []

  const canCancel = (status: string) =>
    ['pending', 'confirmed', 'payment_pending'].includes(status)

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900">My Trips</h1>
            <p className="text-slate-500 text-sm mt-0.5">{trips.length} booking{trips.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                statusFilter === f.value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="card p-14 text-center">
            <div className="text-5xl mb-4">🗺️</div>
            <h3 className="font-semibold text-slate-700 mb-1">No trips yet</h3>
            <p className="text-slate-400 text-sm mb-5">Book your first ride to see it here</p>
            <a href="/book" className="btn-primary text-sm px-6 py-2.5 rounded-xl">Book a Cab</a>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {trips.map((trip: any, i: number) => {
                const cfg = STATUS_CONFIG[trip.status] || STATUS_CONFIG.pending
                const depTime = trip.trip?.departure_time
                  ? new Date(trip.trip.departure_time)
                  : null

                return (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: i * 0.05 }}
                    className="card p-5"
                  >
                    {/* Route + Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cfg.dot} mt-0.5`} />
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">
                            {trip.trip?.pickup_city || '—'} → {trip.trip?.destination_city || '—'}
                          </div>
                          {depTime && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                              <Clock size={11} />
                              {depTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' '}at{' '}
                              {depTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`badge text-xs border ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Details row */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                      <span>💺 {trip.seat_count} seat{trip.seat_count > 1 ? 's' : ''}</span>
                      {trip.has_parcel && (
                        <span className="flex items-center gap-1">
                          <Package size={11} /> Parcel included
                        </span>
                      )}
                      <span className="ml-auto font-semibold text-slate-700 text-sm">
                        ₹{trip.total_fare?.toFixed(0)}
                      </span>
                    </div>

                    {/* Fare breakdown (compact) */}
                    <div className="bg-slate-50 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between text-xs text-slate-500">
                      <span>Base ₹{trip.base_fare?.toFixed(0)}</span>
                      <span>+</span>
                      <span>Fee ₹{trip.platform_fee?.toFixed(0)}</span>
                      <span>=</span>
                      <span className="font-bold text-slate-800 text-sm">₹{trip.total_fare?.toFixed(0)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {trip.status === 'started' && (
                        <a href={`/trips/${trip.id}/track`}
                          className="btn-primary text-xs px-4 py-2 rounded-lg flex items-center gap-1">
                          <MapPin size={13} /> Live Track
                        </a>
                      )}
                      {trip.status === 'payment_pending' && (
                        <button className="btn-primary text-xs px-4 py-2 rounded-lg">
                          Pay ₹{trip.total_fare?.toFixed(0)} →
                        </button>
                      )}
                      {canCancel(trip.status) && (
                        <button
                          onClick={() => setCancelBookingId(trip.id)}
                          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-2 rounded-lg transition-colors"
                        >
                          <X size={12} /> Cancel
                        </button>
                      )}
                      <span className="ml-auto text-xs text-slate-400">
                        {new Date(trip.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelBookingId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
            onClick={() => setCancelBookingId(null)}
          >
            <motion.div
              initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-display font-bold text-lg text-slate-900 mb-1">Cancel Booking</h3>
              <p className="text-slate-500 text-sm mb-4">Please tell us why you're cancelling</p>
              <textarea
                className="input mb-4 h-24 resize-none"
                placeholder="e.g. Change of plans, found another ride..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button onClick={() => setCancelBookingId(null)}
                  className="flex-1 btn-outline text-sm py-2.5 rounded-xl">Keep Booking</button>
                <button
                  onClick={() => cancelMutation.mutate({ id: cancelBookingId, reason: cancelReason })}
                  disabled={!cancelReason.trim() || cancelMutation.isPending}
                  className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-600 disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
