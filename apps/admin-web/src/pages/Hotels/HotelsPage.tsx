/**
 * Admin Hotels Page — Manage hotel/lodge partner listings.
 */
import { useState, useEffect } from 'react'
import { Search, Plus, Eye, ToggleLeft, ToggleRight, Star, RefreshCw, MapPin, Phone } from 'lucide-react'
import { adminApi } from '../../api/client'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
}

const DEMO_HOTELS = [
  { id: 'h1', name: 'Hotel Grand Palace', city: 'Pune', address: 'FC Road, Shivajinagar', contact_phone: '+91 20 2553 1234', rating: 4.5, price_per_night: 2500, category: 'premium', status: 'active', bookings: 127, amenities: ['wifi', 'ac', 'parking', 'restaurant'] },
  { id: 'h2', name: 'Mumbai Inn & Suites', city: 'Mumbai', address: 'Bandra West, Link Road', contact_phone: '+91 22 6545 7890', rating: 4.2, price_per_night: 3800, category: 'premium', status: 'active', bookings: 89, amenities: ['wifi', 'ac', 'gym', 'pool'] },
  { id: 'h3', name: 'Nashik Budget Stay', city: 'Nashik', address: 'Dwarka Circle, Nashik Road', contact_phone: '+91 253 223 4567', rating: 3.8, price_per_night: 800, category: 'budget', status: 'active', bookings: 54, amenities: ['wifi', 'ac'] },
  { id: 'h4', name: 'Highway Comfort Lodge', city: 'Aurangabad', address: 'MIDC Road, Aurangabad', contact_phone: '+91 240 234 5678', rating: 4.0, price_per_night: 1200, category: 'standard', status: 'pending', bookings: 0, amenities: ['wifi', 'parking'] },
  { id: 'h5', name: 'Pune Budget Hostel', city: 'Pune', address: 'Koregaon Park, Pune', contact_phone: '+91 20 2613 4321', rating: 3.5, price_per_night: 450, category: 'budget', status: 'inactive', bookings: 31, amenities: ['wifi'] },
]

const CATEGORY_COLORS: Record<string, string> = {
  budget: 'bg-slate-100 text-slate-600',
  standard: 'bg-blue-100 text-blue-700',
  premium: 'bg-purple-100 text-purple-700',
  luxury: 'bg-amber-100 text-amber-700',
}

const AMENITY_ICONS: Record<string, string> = {
  wifi: '📶', ac: '❄️', parking: '🅿️', restaurant: '🍽️', pool: '🏊', gym: '💪',
}

export function HotelsPage() {
  const [hotels, setHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<any | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      const res = await adminApi.get('/admin/hotels', { params })
      setHotels(res.data.data || [])
    } catch {
      setHotels(DEMO_HOTELS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  const handleToggle = async (hotelId: string, active: boolean) => {
    setProcessing(hotelId)
    try {
      await adminApi.patch(`/admin/hotels/${hotelId}`, { status: active ? 'inactive' : 'active' })
      toast.success(`Hotel ${active ? 'deactivated' : 'activated'}`)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Action failed')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = hotels.filter(h =>
    !search || h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.city?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: hotels.length,
    active: hotels.filter(h => h.status === 'active').length,
    totalBookings: hotels.reduce((s, h) => s + (h.bookings || 0), 0),
    avgRating: hotels.length > 0
      ? (hotels.reduce((s, h) => s + h.rating, 0) / hotels.length).toFixed(1)
      : 0,
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hotel Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage partner hotels and lodges</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Add Hotel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Hotels', value: stats.total, icon: '🏨' },
          { label: 'Active Partners', value: stats.active, icon: '✅' },
          { label: 'Total Bookings', value: stats.totalBookings, icon: '📋' },
          { label: 'Avg Rating', value: `⭐ ${stats.avgRating}`, icon: '🌟' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="Search by hotel name or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {['all', 'active', 'inactive', 'pending'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Hotels Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading hotels...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(hotel => (
            <div key={hotel.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Header gradient band */}
              <div className="h-3 bg-gradient-to-r from-blue-500 to-purple-500" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{hotel.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <MapPin size={11} />{hotel.city}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[hotel.status]}`}>
                        {hotel.status}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[hotel.category]}`}>
                        {hotel.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="font-bold text-slate-900">{hotel.rating}</span>
                    </div>
                    <div className="text-lg font-black text-slate-900 mt-1">₹{hotel.price_per_night.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-slate-400">per night</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                  <Phone size={11} />{hotel.contact_phone}
                </div>

                <div className="flex gap-1 mb-4">
                  {hotel.amenities?.map((a: string) => (
                    <span key={a} className="text-base" title={a}>{AMENITY_ICONS[a] || '•'}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <span className="text-xs text-slate-500">{hotel.bookings} bookings</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelected(hotel)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleToggle(hotel.id, hotel.status === 'active')}
                      disabled={processing === hotel.id}
                      className="p-1 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      {hotel.status === 'active'
                        ? <ToggleRight size={22} className="text-green-500" />
                        : <ToggleLeft size={22} className="text-slate-400" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12 text-slate-400">No hotels found</div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selected.name}</h3>
                <p className="text-sm text-slate-500">{selected.address}, {selected.city}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Category', selected.category],
                ['Status', selected.status],
                ['Rating', `⭐ ${selected.rating}`],
                ['Price/Night', `₹${selected.price_per_night.toLocaleString('en-IN')}`],
                ['Phone', selected.contact_phone],
                ['Total Bookings', selected.bookings],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-1">{label}</div>
                  <div className="font-semibold text-slate-800 text-sm">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-2">Amenities</div>
              <div className="flex gap-2 flex-wrap">
                {selected.amenities?.map((a: string) => (
                  <span key={a} className="text-sm bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                    {AMENITY_ICONS[a]} {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
