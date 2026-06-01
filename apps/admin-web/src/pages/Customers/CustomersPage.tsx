/**
 * Admin Customers Page — Full customer management.
 * List, search, filter, view profile, block/unblock customers.
 */
import { useState, useEffect } from 'react'
import { Search, Filter, Eye, UserX, UserCheck, RefreshCw, Phone, Mail, MapPin } from 'lucide-react'
import { adminApi } from '../../api/client'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  inactive: 'bg-slate-100 text-slate-600',
}

const DEMO_CUSTOMERS = [
  { id: 'c1', full_name: 'Ananya Sharma', phone: '+91 98765 11111', email: 'ananya@example.com', status: 'active', city: 'Pune', total_bookings: 47, total_spent: 14200, joined_at: '2023-06-15', last_active: '2025-05-28' },
  { id: 'c2', full_name: 'Vikram Mehta', phone: '+91 87654 22222', email: 'vikram@example.com', status: 'active', city: 'Mumbai', total_bookings: 122, total_spent: 38900, joined_at: '2022-11-20', last_active: '2025-05-29' },
  { id: 'c3', full_name: 'Sunita Patel', phone: '+91 76543 33333', email: 'sunita@example.com', status: 'blocked', city: 'Nashik', total_bookings: 8, total_spent: 1800, joined_at: '2024-02-10', last_active: '2024-09-01' },
  { id: 'c4', full_name: 'Rahul Nair', phone: '+91 65432 44444', email: 'rahul@example.com', status: 'active', city: 'Pune', total_bookings: 31, total_spent: 9600, joined_at: '2024-01-05', last_active: '2025-05-27' },
  { id: 'c5', full_name: 'Deepika Joshi', phone: '+91 54321 55555', email: 'deepika@example.com', status: 'inactive', city: 'Aurangabad', total_bookings: 5, total_spent: 1200, joined_at: '2024-08-22', last_active: '2024-10-15' },
  { id: 'c6', full_name: 'Arjun Kulkarni', phone: '+91 43210 66666', email: 'arjun@example.com', status: 'active', city: 'Mumbai', total_bookings: 89, total_spent: 27400, joined_at: '2023-03-12', last_active: '2025-05-29' },
]

export function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<any | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { page, page_size: PAGE_SIZE }
      if (statusFilter !== 'all') params.status = statusFilter
      if (search) params.q = search
      const res = await adminApi.get('/admin/customers', { params })
      setCustomers(res.data.data || [])
    } catch {
      setCustomers(DEMO_CUSTOMERS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter, page])

  const handleToggleBlock = async (customerId: string, isBlocked: boolean) => {
    setProcessing(customerId)
    try {
      const action = isBlocked ? 'unblock' : 'block'
      await adminApi.post(`/admin/customers/${customerId}/${action}`)
      toast.success(`Customer ${action}ed successfully`)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Action failed')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = customers.filter(c =>
    !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    blocked: customers.filter(c => c.status === 'blocked').length,
    totalRevenue: customers.reduce((s, c) => s + (c.total_spent || 0), 0),
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">View and manage all registered customers</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: stats.total.toLocaleString('en-IN'), icon: '👥' },
          { label: 'Active Users', value: stats.active.toLocaleString('en-IN'), icon: '🟢' },
          { label: 'Blocked', value: stats.blocked.toLocaleString('en-IN'), icon: '🔴' },
          { label: 'Total Revenue', value: `₹${(stats.totalRevenue / 1000).toFixed(1)}k`, icon: '💰' },
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
            placeholder="Search by name, phone, or email..."
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
            {['all', 'active', 'blocked', 'inactive'].map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Customer', 'Contact', 'City', 'Bookings', 'Total Spent', 'Last Active', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">Loading customers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No customers found</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {c.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{c.full_name}</div>
                      <div className="text-xs text-slate-400">Since {new Date(c.joined_at).getFullYear()}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-slate-600"><Phone size={11} />{c.phone}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5"><Mail size={11} />{c.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-slate-600"><MapPin size={12} />{c.city}</div>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{c.total_bookings}</td>
                <td className="px-4 py-3 text-sm font-bold text-slate-900">
                  {c.total_spent > 0 ? `₹${c.total_spent.toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(c.last_active).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelected(c)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                      <Eye size={13} />
                    </button>
                    {c.status === 'blocked' ? (
                      <button
                        onClick={() => handleToggleBlock(c.id, true)}
                        disabled={processing === c.id}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50">
                        <UserCheck size={13} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleBlock(c.id, false)}
                        disabled={processing === c.id}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
                        <UserX size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">{filtered.length} customers</span>
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
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {selected.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{selected.full_name}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status]}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Phone', selected.phone],
                ['Email', selected.email],
                ['City', selected.city],
                ['Total Bookings', selected.total_bookings],
                ['Total Spent', selected.total_spent > 0 ? `₹${selected.total_spent.toLocaleString('en-IN')}` : '—'],
                ['Joined', new Date(selected.joined_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
                ['Last Active', new Date(selected.last_active).toLocaleDateString('en-IN')],
                ['Customer ID', selected.id?.slice(-8)],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-1">{label}</div>
                  <div className="font-semibold text-slate-800 text-xs break-all">{value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              {selected.status === 'blocked' ? (
                <button
                  onClick={() => { handleToggleBlock(selected.id, true); setSelected(null) }}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                  Unblock Customer
                </button>
              ) : (
                <button
                  onClick={() => { handleToggleBlock(selected.id, false); setSelected(null) }}
                  className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">
                  Block Customer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
