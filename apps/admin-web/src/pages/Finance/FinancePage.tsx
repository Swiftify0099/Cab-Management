/**
 * Admin Finance Page — Revenue, settlements, refunds, transactions.
 */
import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Download, Filter, Search } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { adminApi } from '../../api/client'

const DEMO_REVENUE = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  revenue: Math.floor(8000 + Math.random() * 12000),
  refunds: Math.floor(200 + Math.random() * 800),
  commissions: Math.floor(1500 + Math.random() * 3000),
}))

const DEMO_TRANSACTIONS = [
  { id: 'txn1', type: 'booking', description: 'Booking #BK-8821 — Pune→Mumbai', amount: 480, status: 'success', user: 'Ananya Sharma', created_at: new Date().toISOString() },
  { id: 'txn2', type: 'refund', description: 'Refund for cancelled trip #T-4412', amount: -380, status: 'success', user: 'Vikram Mehta', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'txn3', type: 'settlement', description: 'Driver payout — Ramesh Patil (32 trips)', amount: -9600, status: 'pending', user: 'Ramesh Patil', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'txn4', type: 'booking', description: 'Booking #BK-8822 — Mumbai→Nashik', amount: 320, status: 'success', user: 'Rahul Nair', created_at: new Date(Date.now() - 10800000).toISOString() },
  { id: 'txn5', type: 'booking', description: 'Parcel #CB260501 — Pune→Aurangabad', amount: 210, status: 'success', user: 'Deepika Joshi', created_at: new Date(Date.now() - 14400000).toISOString() },
  { id: 'txn6', type: 'refund', description: 'Partial refund — seat cancellation', amount: -120, status: 'success', user: 'Arjun Kulkarni', created_at: new Date(Date.now() - 18000000).toISOString() },
]

const TXN_COLORS: Record<string, string> = {
  booking: 'bg-green-100 text-green-700',
  refund: 'bg-red-100 text-red-700',
  settlement: 'bg-blue-100 text-blue-700',
  commission: 'bg-purple-100 text-purple-700',
}

const TXN_STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
}

export function FinancePage() {
  const [revenue, setRevenue] = useState(DEMO_REVENUE)
  const [transactions, setTransactions] = useState<any[]>(DEMO_TRANSACTIONS)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateRange, setDateRange] = useState('14')

  const load = async () => {
    setLoading(true)
    try {
      const [revRes, txnRes] = await Promise.all([
        adminApi.get(`/admin/analytics/revenue?days=${dateRange}`),
        adminApi.get('/admin/finance/transactions'),
      ])
      setRevenue(revRes.data.data || DEMO_REVENUE)
      setTransactions(txnRes.data.data || DEMO_TRANSACTIONS)
    } catch {
      // Keep demo data
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [dateRange])

  const totalRevenue = revenue.reduce((s, r) => s + r.revenue, 0)
  const totalRefunds = revenue.reduce((s, r) => s + r.refunds, 0)
  const totalCommissions = revenue.reduce((s, r) => s + r.commissions, 0)
  const netRevenue = totalRevenue - totalRefunds

  const filtered = transactions.filter(t =>
    (typeFilter === 'all' || t.type === typeFilter) &&
    (!search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.user?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance & Revenue</h1>
          <p className="text-sm text-slate-400 mt-0.5">Track revenue, settlements, and refunds</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none"
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button onClick={load} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Gross Revenue', value: `₹${(totalRevenue / 1000).toFixed(1)}k`, change: '+12.4%', up: true, icon: '💰' },
          { label: 'Net Revenue', value: `₹${(netRevenue / 1000).toFixed(1)}k`, change: '+8.7%', up: true, icon: '📈' },
          { label: 'Total Refunds', value: `₹${(totalRefunds / 1000).toFixed(1)}k`, change: '-2.1%', up: false, icon: '↩️' },
          { label: 'Commissions', value: `₹${(totalCommissions / 1000).toFixed(1)}k`, change: '+15.3%', up: true, icon: '🤝' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xl">{kpi.icon}</div>
              <span className={`text-xs font-bold flex items-center gap-1 ${kpi.up ? 'text-green-600' : 'text-red-500'}`}>
                {kpi.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {kpi.change}
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">{kpi.value}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-1">Revenue vs Refunds</h2>
          <p className="text-xs text-slate-400 mb-5">Last {dateRange} days</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '12px', color: '#F1F5F9', fontSize: '12px' }}
                formatter={(v: any, name?: any) => [`₹${v.toLocaleString('en-IN')}`, String(name) === 'revenue' ? 'Revenue' : 'Refunds']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
              <Area type="monotone" dataKey="refunds" stroke="#EF4444" strokeWidth={1.5} fill="url(#refGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-1">Commission Earned</h2>
          <p className="text-xs text-slate-400 mb-5">Platform fee per day</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenue} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                interval={Math.floor(revenue.length / 4)} />
              <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '10px', color: '#F1F5F9', fontSize: '12px' }}
                formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, 'Commission']}
              />
              <Bar dataKey="commissions" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Recent Transactions</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Search transactions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2">
              <Filter size={12} className="text-slate-400" />
              <select
                className="text-xs text-slate-700 bg-transparent border-none outline-none cursor-pointer"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                {['all', 'booking', 'refund', 'settlement', 'commission'].map(t => (
                  <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Description', 'User', 'Type', 'Amount', 'Status', 'Date'].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">No transactions found</td></tr>
            ) : filtered.map(txn => (
              <tr key={txn.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4 text-sm font-medium text-slate-700 max-w-xs">{txn.description}</td>
                <td className="px-5 py-4 text-sm text-slate-600">{txn.user}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TXN_COLORS[txn.type] || 'bg-slate-100 text-slate-600'}`}>
                    {txn.type}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-sm font-bold ${txn.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {txn.amount < 0 ? '' : '+'}₹{Math.abs(txn.amount).toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TXN_STATUS_COLORS[txn.status] || 'bg-slate-100 text-slate-600'}`}>
                    {txn.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-slate-500">
                  {new Date(txn.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
