/**
 * Admin Trips Page — Full trip management table.
 * Filter by status, search by city, view details, cancel trips.
 */
import { useState, useEffect } from 'react'
import { Search, Filter, Eye, XCircle, RefreshCw, MapPin } from 'lucide-react'
import { adminApi } from '../../api/client'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-blue-100 text-blue-700',
  full: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_OPTIONS = ['all', 'draft', 'published', 'full', 'in_progress', 'completed', 'cancelled']

export function AdminTripsPage() {
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<any | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: PAGE_SIZE }
      if (statusFilter !== 'all') params.status = statusFilter
      if (search) params.q = search
      const res = await adminApi.get('/admin/trips', { params })
      setTrips(res.data.data || [])
    } catch {
      // Demo data
      setTrips([
        { id: 't1', pickup_city: 'Pune', destination_city: 'Mumbai', status: 'in_progress', departure_time: new Date().toISOString(), total_seats: 4, available_seats: 1, base_fare: 480, distance_km: 149, driver: { full_name: 'Ramesh Patil', rating: 4.8 }, bookings_count: 3 },
        { id: 't2', pickup_city: 'Mumbai', destination_city: 'Nashik', status: 'published', departure_time: new Date(Date.now() + 3600000).toISOString(), total_seats: 6, available_seats: 4, base_fare: 380, distance_km: 166, driver: { full_name: 'Priya Desai', rating: 4.6 }, bookings_count: 2 },
        { id: 't3', pickup_city: 'Pune', destination_city: 'Aurangabad', status: 'completed', departure_time: new Date(Date.now() - 86400000).toISOString(), total_seats: 4, available_seats: 0, base_fare: 520, distance_km: 235, driver: { full_name: 'Sunil Kumar', rating: 4.9 }, bookings_count: 4 },
        { id: 't4', pickup_city: 'Nashik', destination_city: 'Pune', status: 'draft', departure_time: new Date(Date.now() + 7200000).toISOString(), total_seats: 4, available_seats: 4, base_fare: 380, distance_km: 211, driver: { full_name: 'Ajay Singh', rating: 4.5 }, bookings_count: 0 },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter, page])

  const handleCancel = async (tripId: string) => {
    if (!confirm('Cancel this trip? All passengers will be refunded.')) return
    setCancelling(tripId)
    try {
      await adminApi.post(`/admin/trips/${tripId}/cancel`)
      toast.success('Trip cancelled and passengers notified')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Cancel failed')
    } finally { setCancelling(null) }
  }

  const filtered = trips.filter(t =>
    (!search || `${t.pickup_city} ${t.destination_city}`.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Trip Management</h1>
        <button onClick={load} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="Search by city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Filter size={14} className="text-slate-400" />
          <select
            className="text-sm text-slate-700 bg-transparent border-none outline-none cursor-pointer"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Route', 'Departure', 'Driver', 'Seats', 'Fare', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading trips...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">No trips found</td></tr>
            ) : filtered.map(trip => {
              const dep = new Date(trip.departure_time)
              return (
                <tr key={trip.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-blue-500 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{trip.pickup_city} → {trip.destination_city}</div>
                        <div className="text-xs text-slate-400">{trip.distance_km} km</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <div>{dep.toLocaleDateString('en-IN')}</div>
                    <div className="text-xs text-slate-400">{dep.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-700">{trip.driver?.full_name || '—'}</div>
                    {trip.driver?.rating && <div className="text-xs text-amber-500">⭐ {trip.driver.rating}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <span className="font-semibold">{trip.available_seats}</span>
                    <span className="text-slate-400">/{trip.total_seats}</span>
                    <div className="text-xs text-slate-400">{trip.bookings_count} bookings</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">₹{trip.base_fare}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[trip.status] || 'bg-slate-100 text-slate-600'}`}>
                      {trip.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected(trip)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Eye size={13} />
                      </button>
                      {!['completed', 'cancelled'].includes(trip.status) && (
                        <button
                          onClick={() => handleCancel(trip.id)}
                          disabled={cancelling === trip.id}
                          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                          <XCircle size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">{filtered.length} trips</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">← Prev</button>
            <span className="px-3 py-1.5 text-xs text-slate-600">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={filtered.length < PAGE_SIZE}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Next →</button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-slate-900">{selected.pickup_city} → {selected.destination_city}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Trip ID', selected.id.slice(-8)],
                ['Status', selected.status],
                ['Driver', selected.driver?.full_name || '—'],
                ['Distance', `${selected.distance_km} km`],
                ['Seats', `${selected.available_seats}/${selected.total_seats}`],
                ['Fare/seat', `₹${selected.base_fare}`],
                ['Bookings', selected.bookings_count],
                ['Departure', new Date(selected.departure_time).toLocaleString('en-IN')],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-1">{label}</div>
                  <div className="font-semibold text-slate-800 text-xs">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
