/**
 * Admin Analytics Page — Advanced BI & analytics.
 * Growth trends, route popularity, driver performance, city heatmaps.
 */
import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Users, Car, MapPin } from 'lucide-react'

const GROWTH_DATA = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
  customers: Math.floor(200 + i * 80 + Math.random() * 50),
  drivers: Math.floor(30 + i * 12 + Math.random() * 10),
  trips: Math.floor(800 + i * 300 + Math.random() * 200),
}))

const ROUTE_DATA = [
  { route: 'Pune→Mumbai', trips: 2847, revenue: 136656, growth: '+18%' },
  { route: 'Mumbai→Nashik', trips: 1923, revenue: 73074, growth: '+12%' },
  { route: 'Pune→Aurangabad', trips: 1456, revenue: 75712, growth: '+9%' },
  { route: 'Nashik→Pune', trips: 1312, revenue: 49856, growth: '+22%' },
  { route: 'Mumbai→Pune', trips: 2134, revenue: 102432, growth: '+15%' },
  { route: 'Aurangabad→Mumbai', trips: 876, revenue: 62372, growth: '+7%' },
]

const VEHICLE_DIST = [
  { name: 'Sedan', value: 48, color: '#3B82F6' },
  { name: 'SUV', value: 28, color: '#8B5CF6' },
  { name: 'Hatchback', value: 16, color: '#10B981' },
  { name: 'Mini', value: 8, color: '#F59E0B' },
]

const DRIVER_PERF = [
  { name: 'Ramesh P.', rating: 4.8, trips: 342, earnings: 48620, completion: 97 },
  { name: 'Priya D.', rating: 4.6, trips: 218, earnings: 32100, completion: 94 },
  { name: 'Meena R.', rating: 4.7, trips: 510, earnings: 76300, completion: 98 },
  { name: 'Sunil K.', rating: 4.9, trips: 189, earnings: 28900, completion: 99 },
  { name: 'Ajay S.', rating: 3.2, trips: 78, earnings: 11250, completion: 71 },
]

const HOURLY_DATA = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h.toString().padStart(2, '0')}:00`,
  bookings: h >= 6 && h <= 22 ? Math.floor(10 + Math.sin((h - 8) * 0.5) * 30 + Math.random() * 15) : Math.floor(Math.random() * 5),
}))

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'routes' | 'drivers' | 'patterns'>('overview')

  const TABS = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'routes', label: 'Route Analytics', icon: MapPin },
    { id: 'drivers', label: 'Driver Performance', icon: Car },
    { id: 'patterns', label: 'Booking Patterns', icon: Users },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
        <p className="text-sm text-slate-400 mt-0.5">Advanced business intelligence and performance metrics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Trips (YTD)', value: '18,934', change: '+34%', icon: '🚗' },
              { label: 'Active Customers', value: '1,247', change: '+22%', icon: '👥' },
              { label: 'Avg Trip Distance', value: '187 km', change: '+5%', icon: '📏' },
              { label: 'Platform Revenue', value: '₹28.4L', change: '+41%', icon: '💹' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl">{kpi.icon}</div>
                  <span className="text-xs font-bold text-green-600">{kpi.change}</span>
                </div>
                <div className="text-2xl font-black text-slate-900">{kpi.value}</div>
                <div className="text-xs text-slate-400 font-medium mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Growth Chart */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-1">Platform Growth</h2>
            <p className="text-xs text-slate-400 mb-5">Monthly customers, drivers & trips — current year</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={GROWTH_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '12px', color: '#F1F5F9', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#64748B' }} />
                <Line type="monotone" dataKey="customers" stroke="#3B82F6" strokeWidth={2.5} dot={false} name="Customers" />
                <Line type="monotone" dataKey="trips" stroke="#10B981" strokeWidth={2.5} dot={false} name="Trips" />
                <Line type="monotone" dataKey="drivers" stroke="#8B5CF6" strokeWidth={2.5} dot={false} name="Drivers" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Vehicle Distribution */}
          <div className="grid grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-1">Vehicle Type Mix</h2>
              <p className="text-xs text-slate-400 mb-3">Fleet distribution (%)</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={VEHICLE_DIST} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    dataKey="value" paddingAngle={3}>
                    {VEHICLE_DIST.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '10px', color: '#F1F5F9', fontSize: '12px' }}
                    formatter={(v: any) => [`${v}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {VEHICLE_DIST.map(v => (
                  <div key={v.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />
                      <span className="text-slate-600">{v.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{v.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-1">Top Routes by Revenue</h2>
              <p className="text-xs text-slate-400 mb-5">All time revenue contribution</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ROUTE_DATA} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="route" tick={{ fontSize: 10, fill: '#64748B' }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '10px', color: '#F1F5F9', fontSize: '12px' }}
                    formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Routes Tab */}
      {activeTab === 'routes' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-slate-700 text-sm">Route Performance — All Time</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Route', 'Total Trips', 'Revenue', 'Avg Fare', 'Growth'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROUTE_DATA.map((route, i) => (
                  <tr key={route.route} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">{i + 1}</div>
                        <span className="font-semibold text-slate-800 text-sm">{route.route}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">{route.trips.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">₹{route.revenue.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">₹{Math.round(route.revenue / route.trips)}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">{route.growth}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drivers Tab */}
      {activeTab === 'drivers' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-slate-700 text-sm">Top Driver Performance</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Driver', 'Rating', 'Total Trips', 'Earnings', 'Completion Rate'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DRIVER_PERF.map((d, i) => (
                  <tr key={d.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'
                        }`}>{i + 1}</div>
                        <span className="font-semibold text-slate-800 text-sm">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400">⭐</span>
                        <span className="font-bold text-slate-900 text-sm">{d.rating}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">{d.trips}</td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">₹{d.earnings.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-24">
                          <div
                            className={`h-2 rounded-full ${d.completion >= 90 ? 'bg-green-500' : 'bg-amber-500'}`}
                            style={{ width: `${d.completion}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{d.completion}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-1">Hourly Booking Distribution</h2>
            <p className="text-xs text-slate-400 mb-5">Average bookings per hour of day</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={HOURLY_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                  interval={3} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '12px', color: '#F1F5F9', fontSize: '12px' }}
                />
                <Bar dataKey="bookings" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={22} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Peak Hour', value: '08:00 AM', sub: 'Most bookings in morning', icon: '🌅' },
              { label: 'Peak Day', value: 'Friday', sub: 'Highest weekly demand', icon: '📅' },
              { label: 'Avg Booking Lead', value: '2.3 hrs', sub: 'Before departure time', icon: '⏰' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="text-2xl mb-3">{item.icon}</div>
                <div className="text-xl font-black text-slate-900">{item.value}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">{item.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
