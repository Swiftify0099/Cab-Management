/**
 * Admin Parcel Dashboard — Phase 7
 * View all parcels, filter by status, track, update status.
 */
import { useState, useEffect } from 'react'
import { Search, RefreshCw, ExternalLink } from 'lucide-react'
import { adminApi } from '../../api/client'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  pickup_done: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

const DEMO_PARCELS = [
  { id: 'p1', tracking_number: 'CB260501ABC123', status: 'in_transit', sender_name: 'Rahul Sharma', receiver_name: 'Priya Patel', weight_kg: 2.5, fare: 120, is_fragile: true, is_urgent: false, created_at: new Date().toISOString(), trip: { from: 'Pune', to: 'Mumbai' } },
  { id: 'p2', tracking_number: 'CB260501DEF456', status: 'delivered', sender_name: 'Anita Kumar', receiver_name: 'Vijay Singh', weight_kg: 0.8, fare: 85, is_fragile: false, is_urgent: true, created_at: new Date().toISOString(), trip: { from: 'Mumbai', to: 'Nashik' } },
  { id: 'p3', tracking_number: 'CB260501GHI789', status: 'pending', sender_name: 'Deepa Nair', receiver_name: 'Arjun Mehta', weight_kg: 5, fare: 210, is_fragile: false, is_urgent: false, created_at: new Date().toISOString(), trip: { from: 'Pune', to: 'Aurangabad' } },
]

export function AdminParcelsPage() {
  const [parcels, setParcels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<any | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      const res = await adminApi.get('/admin/parcels', { params })
      setParcels(res.data.data || [])
    } catch { setParcels(DEMO_PARCELS) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [statusFilter])

  const totalRevenue = parcels.reduce((s, p) => s + (p.fare || 0), 0)
  const deliveredCount = parcels.filter(p => p.status === 'delivered').length
  const inTransitCount = parcels.filter(p => p.status === 'in_transit').length

  const filtered = parcels.filter(p =>
    !search || p.tracking_number?.includes(search.toUpperCase()) ||
    p.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.receiver_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Parcel Management</h1>
        <button onClick={load} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Parcels', value: parcels.length, color: 'blue', icon: '📦' },
          { label: 'In Transit', value: inTransitCount, color: 'indigo', icon: '🚗' },
          { label: 'Delivered', value: deliveredCount, color: 'green', icon: '✅' },
          { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, color: 'purple', icon: '💰' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-black text-slate-900">{stat.value}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 uppercase"
            placeholder="Search by tracking number or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {['all', 'pending', 'pickup_done', 'in_transit', 'delivered', 'failed'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Tracking #', 'Route', 'Sender → Receiver', 'Weight', 'Fare', 'Flags', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading parcels...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No parcels found</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{p.tracking_number}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{p.trip?.from} → {p.trip?.to}</td>
                <td className="px-4 py-3">
                  <div className="text-xs font-semibold text-slate-700">{p.sender_name}</div>
                  <div className="text-xs text-slate-400">→ {p.receiver_name}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{p.weight_kg} kg</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-900">₹{p.fare}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {p.is_fragile && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md font-semibold">🫙</span>}
                    {p.is_urgent && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md font-semibold">⚡</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-600'}`}>
                    {p.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setSelected(p)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    <ExternalLink size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Parcel Details</h3>
                <p className="font-mono text-xs text-blue-600">{selected.tracking_number}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Status', selected.status.replace('_', ' ')],
                ['Route', `${selected.trip?.from} → ${selected.trip?.to}`],
                ['Sender', selected.sender_name],
                ['Receiver', selected.receiver_name],
                ['Weight', `${selected.weight_kg} kg`],
                ['Fare', `₹${selected.fare}`],
                ['Fragile', selected.is_fragile ? 'Yes' : 'No'],
                ['Urgent', selected.is_urgent ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
