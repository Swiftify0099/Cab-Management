/**
 * Admin Drivers Page — Full driver management.
 * List, search, filter by status, view profile, approve/suspend drivers.
 */
import { useState, useEffect } from 'react'
import { Search, Filter, Eye, CheckCircle, XCircle, RefreshCw, Star, Car, Phone, Mail } from 'lucide-react'
import { adminApi } from '../../api/client'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  offline: 'bg-slate-100 text-slate-600',
  kyc_pending: 'bg-blue-100 text-blue-700',
}

const VEHICLE_TYPES = ['all', 'sedan', 'suv', 'hatchback', 'mini']
const STATUS_OPTIONS = ['all', 'active', 'pending', 'kyc_pending', 'suspended', 'offline']

const DEMO_DRIVERS = [
  { id: 'drv1', full_name: 'Ramesh Patil', phone: '+91 98765 43210', email: 'ramesh@example.com', status: 'active', vehicle_type: 'sedan', vehicle_number: 'MH12AB1234', rating: 4.8, total_trips: 342, total_earnings: 48620, joined_at: '2024-03-15', is_kyc_verified: true },
  { id: 'drv2', full_name: 'Priya Desai', phone: '+91 87654 32109', email: 'priya@example.com', status: 'active', vehicle_type: 'suv', vehicle_number: 'MH14CD5678', rating: 4.6, total_trips: 218, total_earnings: 32100, joined_at: '2024-05-20', is_kyc_verified: true },
  { id: 'drv3', full_name: 'Sunil Kumar', phone: '+91 76543 21098', email: 'sunil@example.com', status: 'kyc_pending', vehicle_type: 'hatchback', vehicle_number: 'MH11EF9012', rating: 4.9, total_trips: 0, total_earnings: 0, joined_at: '2025-01-02', is_kyc_verified: false },
  { id: 'drv4', full_name: 'Ajay Singh', phone: '+91 65432 10987', email: 'ajay@example.com', status: 'suspended', vehicle_type: 'sedan', vehicle_number: 'MH15GH3456', rating: 3.2, total_trips: 78, total_earnings: 11250, joined_at: '2024-08-10', is_kyc_verified: true },
  { id: 'drv5', full_name: 'Meena Rao', phone: '+91 54321 09876', email: 'meena@example.com', status: 'active', vehicle_type: 'suv', vehicle_number: 'MH01IJ7890', rating: 4.7, total_trips: 510, total_earnings: 76300, joined_at: '2023-11-05', is_kyc_verified: true },
  { id: 'drv6', full_name: 'Rohit Joshi', phone: '+91 43210 98765', email: 'rohit@example.com', status: 'pending', vehicle_type: 'mini', vehicle_number: 'MH02KL1234', rating: 0, total_trips: 0, total_earnings: 0, joined_at: '2025-05-28', is_kyc_verified: false },
]

export function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [vehicleFilter, setVehicleFilter] = useState('all')
  const [selected, setSelected] = useState<any | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: PAGE_SIZE }
      if (statusFilter !== 'all') params.status = statusFilter
      if (vehicleFilter !== 'all') params.vehicle_type = vehicleFilter
      if (search) params.q = search
      const res = await adminApi.get('/admin/drivers', { params })
      setDrivers(res.data.data || [])
    } catch {
      setDrivers(DEMO_DRIVERS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter, vehicleFilter, page])

  const handleAction = async (driverId: string, action: 'approve' | 'suspend' | 'activate') => {
    setProcessing(driverId)
    try {
      await adminApi.post(`/admin/drivers/${driverId}/${action}`)
      toast.success(`Driver ${action}d successfully`)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Action failed')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = drivers.filter(d =>
    !search || d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search) || d.vehicle_number?.includes(search.toUpperCase())
  )

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    pending: drivers.filter(d => d.status === 'pending' || d.status === 'kyc_pending').length,
    suspended: drivers.filter(d => d.status === 'suspended').length,
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Driver Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage and monitor all registered drivers</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Drivers', value: stats.total, icon: '🚗', color: 'blue' },
          { label: 'Active', value: stats.active, icon: '🟢', color: 'green' },
          { label: 'Pending Approval', value: stats.pending, icon: '⏳', color: 'amber' },
          { label: 'Suspended', value: stats.suspended, icon: '🔴', color: 'red' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            placeholder="Search by name, phone, or vehicle number..."
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
              <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Car size={14} className="text-slate-400" />
          <select
            className="text-sm text-slate-700 bg-transparent border-none outline-none cursor-pointer"
            value={vehicleFilter}
            onChange={e => { setVehicleFilter(e.target.value); setPage(1) }}
          >
            {VEHICLE_TYPES.map(v => (
              <option key={v} value={v}>{v === 'all' ? 'All Vehicles' : v.charAt(0).toUpperCase() + v.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Driver', 'Contact', 'Vehicle', 'Rating', 'Trips', 'Earnings', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading drivers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No drivers found</td></tr>
            ) : filtered.map(driver => (
              <tr key={driver.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {driver.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{driver.full_name}</div>
                      <div className="text-xs text-slate-400">ID: {driver.id?.slice(-8)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-slate-600"><Phone size={11} />{driver.phone}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5"><Mail size={11} />{driver.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-slate-700 capitalize">{driver.vehicle_type}</div>
                  <div className="text-xs text-slate-400 font-mono">{driver.vehicle_number}</div>
                </td>
                <td className="px-4 py-3">
                  {driver.rating > 0 ? (
                    <div className="flex items-center gap-1">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-slate-800 text-sm">{driver.rating}</span>
                    </div>
                  ) : <span className="text-slate-300 text-xs">N/A</span>}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{driver.total_trips.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-900">
                  {driver.total_earnings > 0 ? `₹${driver.total_earnings.toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${STATUS_COLORS[driver.status] || 'bg-slate-100 text-slate-600'}`}>
                      {driver.status.replace('_', ' ')}
                    </span>
                    {driver.is_kyc_verified && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle size={10} /> KYC Verified
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelected(driver)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="View">
                      <Eye size={13} />
                    </button>
                    {driver.status === 'active' ? (
                      <button
                        onClick={() => handleAction(driver.id, 'suspend')}
                        disabled={processing === driver.id}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50" title="Suspend">
                        <XCircle size={13} />
                      </button>
                    ) : ['pending', 'suspended', 'kyc_pending'].includes(driver.status) && (
                      <button
                        onClick={() => handleAction(driver.id, 'activate')}
                        disabled={processing === driver.id}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50" title="Activate">
                        <CheckCircle size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">{filtered.length} drivers</span>
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
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                  {selected.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{selected.full_name}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status]}`}>
                    {selected.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Phone', selected.phone],
                ['Email', selected.email],
                ['Vehicle Type', selected.vehicle_type],
                ['Vehicle No.', selected.vehicle_number],
                ['Rating', selected.rating > 0 ? `⭐ ${selected.rating}` : 'N/A'],
                ['Total Trips', selected.total_trips.toLocaleString('en-IN')],
                ['Total Earnings', selected.total_earnings > 0 ? `₹${selected.total_earnings.toLocaleString('en-IN')}` : '—'],
                ['KYC Status', selected.is_kyc_verified ? '✅ Verified' : '⏳ Pending'],
                ['Joined', new Date(selected.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
                ['Driver ID', selected.id?.slice(-8)],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-1">{label}</div>
                  <div className="font-semibold text-slate-800 text-xs break-all">{value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              {selected.status === 'active' ? (
                <button
                  onClick={() => { handleAction(selected.id, 'suspend'); setSelected(null) }}
                  className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">
                  Suspend Driver
                </button>
              ) : (
                <button
                  onClick={() => { handleAction(selected.id, 'activate'); setSelected(null) }}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                  Activate Driver
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
