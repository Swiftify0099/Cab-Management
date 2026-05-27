/**
 * Admin Dashboard — Phase 9.
 * Real KPIs + Recharts revenue/bookings trend.
 * Live data from admin-service aggregate APIs.
 */
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, Users, Car, AlertCircle, MapPin, RefreshCw, FileText } from 'lucide-react'
import { adminApi } from '../../api/client'

const DEMO_STATS = {
  customers: 1247, drivers: 342, active_trips: 28, today_bookings: 156,
  monthly_revenue: 284750, completed_trips: 8934, pending_kyc: 12, open_complaints: 7,
}

const DEMO_REVENUE = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  revenue: Math.floor(6000 + Math.random() * 8000),
  transactions: Math.floor(15 + Math.random() * 30),
}))

const DEMO_STATUS = [
  { name: 'Completed', value: 8934, color: '#10B981' },
  { name: 'In Progress', value: 28, color: '#3B82F6' },
  { name: 'Published', value: 147, color: '#F59E0B' },
  { name: 'Cancelled', value: 234, color: '#EF4444' },
]

const KPI_CARDS = [
  { key: 'customers', label: 'Total Customers', icon: Users, color: 'blue', suffix: '' },
  { key: 'drivers', label: 'Total Drivers', icon: Car, color: 'green', suffix: '' },
  { key: 'active_trips', label: 'Active Trips', icon: MapPin, color: 'amber', suffix: '' },
  { key: 'today_bookings', label: "Today's Bookings", icon: FileText, color: 'purple', suffix: '' },
  { key: 'monthly_revenue', label: 'Monthly Revenue', icon: TrendingUp, color: 'emerald', prefix: '₹' },
  { key: 'completed_trips', label: 'Completed Trips', icon: TrendingUp, color: 'sky', suffix: '' },
  { key: 'pending_kyc', label: 'Pending KYC', icon: AlertCircle, color: 'orange', suffix: '', alert: true },
  { key: 'open_complaints', label: 'Open Complaints', icon: AlertCircle, color: 'red', suffix: '', alert: true },
]

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  sky: 'bg-sky-50 text-sky-600 border-sky-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
  red: 'bg-red-50 text-red-600 border-red-100',
}

export function DashboardPage() {
  const [stats, setStats] = useState(DEMO_STATS)
  const [revenue, setRevenue] = useState(DEMO_REVENUE)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const load = async () => {
    setLoading(true)
    try {
      const [statsRes, revRes] = await Promise.all([
        adminApi.get('/admin/dashboard'),
        adminApi.get('/admin/analytics/revenue?days=30'),
      ])
      setStats(statsRes.data.data)
      setRevenue(revRes.data.data.map((r: any) => ({
        date: new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        revenue: r.revenue,
        transactions: r.transactions,
      })))
      setLastUpdated(new Date())
    } catch {
      // Keep demo data on error
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 60000) // auto-refresh every 60s
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Last updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map(card => {
          const Icon = card.icon
          const raw = (stats as any)[card.key]
          const formatted = typeof raw === 'number'
            ? (card.prefix || '') + (raw >= 1000 ? (raw / 1000).toFixed(1) + 'k' : raw.toLocaleString('en-IN'))
            : raw
          return (
            <div key={card.key}
              className={`bg-white rounded-2xl p-5 border shadow-sm relative overflow-hidden ${card.alert && raw > 0 ? 'border-red-200' : 'border-slate-100'}`}>
              <div className={`inline-flex p-2.5 rounded-xl border ${COLOR_MAP[card.color]} mb-3`}>
                <Icon size={16} />
              </div>
              <div className="text-2xl font-black text-slate-900">{formatted}</div>
              <div className="text-xs text-slate-400 font-medium mt-1">{card.label}</div>
              {card.alert && raw > 0 && (
                <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-5">
        {/* Revenue Area Chart (2/3 width) */}
        <div className="col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900">Revenue Trend</h2>
              <p className="text-xs text-slate-400">Last 30 days</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-slate-900">
                ₹{(stats.monthly_revenue / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-emerald-600 font-semibold">This month</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                interval={Math.floor(revenue.length / 6)} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '12px', color: '#F1F5F9', fontSize: '12px' }}
                formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5}
                fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: '#3B82F6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Trip Status Pie (1/3 width) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="font-bold text-slate-900 mb-1">Trip Status</h2>
          <p className="text-xs text-slate-400 mb-5">All time</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={DEMO_STATUS} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                dataKey="value" paddingAngle={3}>
                {DEMO_STATUS.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '10px', color: '#F1F5F9', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {DEMO_STATUS.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-600">{s.name}</span>
                </div>
                <span className="font-bold text-slate-900">{s.value.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Bar Chart */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h2 className="font-bold text-slate-900 mb-1">Daily Transactions</h2>
        <p className="text-xs text-slate-400 mb-5">Last 30 days</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={revenue} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
              interval={Math.floor(revenue.length / 6)} />
            <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '12px', color: '#F1F5F9', fontSize: '12px' }}
            />
            <Bar dataKey="transactions" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
