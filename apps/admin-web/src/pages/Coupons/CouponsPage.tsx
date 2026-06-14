/**
 * Admin Coupons Page — Create and manage discount coupons & promo codes.
 */
import { useState, useEffect } from 'react'
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight, RefreshCw, Copy } from 'lucide-react'
import { adminApi } from '../../api/client'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-600',
  expired: 'bg-red-100 text-red-600',
}

const DEMO_COUPONS = [
  { id: 'cp1', code: 'SAVE50', coupon_type: 'flat', discount_value: 50, min_trip_amount: 200, usage_limit: 1000, times_used: 437, is_active: true, end_date: '2025-12-31', description: '₹50 off on bookings above ₹200' },
  { id: 'cp2', code: 'NEWUSER20', coupon_type: 'percentage', discount_value: 20, min_trip_amount: 100, usage_limit: 500, times_used: 198, is_active: true, end_date: '2025-09-30', description: '20% off for first-time users' },
  { id: 'cp3', code: 'MONSOON30', coupon_type: 'flat', discount_value: 30, min_trip_amount: 150, usage_limit: 2000, times_used: 2000, is_active: false, end_date: '2024-09-30', description: 'Monsoon season promo (expired)' },
  { id: 'cp4', code: 'VIP100', coupon_type: 'flat', discount_value: 100, min_trip_amount: 500, usage_limit: 100, times_used: 23, is_active: true, end_date: '2025-12-31', description: 'VIP customer exclusive — ₹100 off' },
  { id: 'cp5', code: 'REFER15', coupon_type: 'percentage', discount_value: 15, min_trip_amount: 0, usage_limit: -1, times_used: 342, is_active: true, end_date: '2026-06-30', description: '15% off for referral bookings' },
]

const EMPTY_FORM = {
  code: '', description: '', coupon_type: 'flat', discount_value: 0,
  min_trip_amount: 0, usage_limit: 100, end_date: '',
}

export function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.get('/admin/coupons')
      setCoupons(res.data.data || [])
    } catch {
      setCoupons(DEMO_COUPONS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.code || !form.discount_value || !form.end_date) {
      toast.error('Please fill all required fields')
      return
    }
    setSubmitting(true)
    try {
      await adminApi.post('/admin/coupons', form)
      toast.success('Coupon created successfully!')
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to create coupon')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (couponId: string, active: boolean) => {
    setProcessing(couponId)
    try {
      await adminApi.post(`/admin/coupons/${couponId}/toggle`, {})
      toast.success(`Coupon ${active ? 'deactivated' : 'activated'}`)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Action failed')
    } finally {
      setProcessing(null) }
  }

  const handleDelete = async (couponId: string) => {
    if (!confirm('Delete this coupon? This cannot be undone.')) return
    setProcessing(couponId)
    try {
      await adminApi.delete(`/admin/coupons/${couponId}`)
      toast.success('Coupon deleted')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Delete failed')
    } finally {
      setProcessing(null)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Copied: ${code}`)
  }

  const getStatus = (c: any) => {
    if (!c.is_active) return 'inactive'
    if (new Date(c.end_date) < new Date()) return 'expired'
    return 'active'
  }

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.is_active).length,
    totalUses: coupons.reduce((s, c) => s + (c.times_used || 0), 0),
    avgDiscount: coupons.filter(c => c.coupon_type === 'flat').length > 0
      ? Math.round(coupons.filter(c => c.coupon_type === 'flat').reduce((s, c) => s + c.discount_value, 0) / coupons.filter(c => c.coupon_type === 'flat').length)
      : 0,
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Coupons & Promotions</h1>
          <p className="text-sm text-slate-400 mt-0.5">Create and manage discount codes for customers</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> New Coupon
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Coupons', value: stats.total, icon: '🏷️' },
          { label: 'Active', value: stats.active, icon: '✅' },
          { label: 'Total Uses', value: stats.totalUses.toLocaleString('en-IN'), icon: '🎫' },
          { label: 'Avg Flat Discount', value: `₹${stats.avgDiscount}`, icon: '💸' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Coupons Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading coupons...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {coupons.map(coupon => {
            const status = getStatus(coupon)
            const usagePercent = coupon.usage_limit > 0 ? Math.min(100, Math.round((coupon.times_used / coupon.usage_limit) * 100)) : 0
            return (
              <div key={coupon.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Tag size={22} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-lg tracking-widest font-mono">{coupon.code}</span>
                        <button onClick={() => copyCode(coupon.code)} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                          <Copy size={13} className="text-slate-400" />
                        </button>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>{status}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{coupon.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(coupon.id, coupon.is_active)}
                      disabled={processing === coupon.id}
                      className="p-2 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      {coupon.is_active
                        ? <ToggleRight size={22} className="text-green-500" />
                        : <ToggleLeft size={22} className="text-slate-400" />
                      }
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      disabled={processing === coupon.id}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mt-4">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">Discount</div>
                    <div className="font-bold text-slate-900 text-sm">
                      {coupon.coupon_type === 'flat' ? `₹${coupon.discount_value}` : `${coupon.discount_value}%`}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">Min Order</div>
                    <div className="font-bold text-slate-900 text-sm">₹{coupon.min_trip_amount || 0}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">Uses</div>
                    <div className="font-bold text-slate-900 text-sm">
                      {coupon.times_used} {coupon.usage_limit > 0 ? `/ ${coupon.usage_limit}` : '/ ∞'}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">Expires</div>
                    <div className="font-bold text-slate-900 text-sm">
                      {new Date(coupon.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1.5">Usage</div>
                    <div className="bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, usagePercent)}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{usagePercent}%</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Coupon Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-lg text-slate-900">Create New Coupon</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Coupon Code *</label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="e.g. SAVE50"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description</label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Brief description for admin reference"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Discount Type *</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={form.coupon_type}
                    onChange={e => setForm(f => ({ ...f, coupon_type: e.target.value }))}
                  >
                    <option value="flat">Flat (₹)</option>
                    <option value="percentage">Percent (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Discount Value *</label>
                  <input
                    type="number" min={1}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder={form.coupon_type === 'flat' ? '₹50' : '20%'}
                    value={form.discount_value || ''}
                    onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Minimum Order (₹)</label>
                  <input
                    type="number" min={0}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={form.min_trip_amount || ''}
                    onChange={e => setForm(f => ({ ...f, min_trip_amount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Max Uses (-1 = unlimited)</label>
                  <input
                    type="number"
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={form.usage_limit}
                    onChange={e => setForm(f => ({ ...f, usage_limit: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Expiry Date *</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
