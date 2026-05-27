import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, Mail, Shield, LogOut, Edit3, Save, X, MapPin, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { profileApi, authApi } from '../../api/client'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: '', emergency_contact: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addresses, setAddresses] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      profileApi.getMe().then(r => {
        setProfile(r.data.data)
        setForm({
          full_name: r.data.data?.full_name || '',
          emergency_contact: r.data.data?.emergency_contact?.replace('+91', '') || '',
        })
      }),
      profileApi.getAddresses().then(r => setAddresses(r.data.data || [])),
    ]).catch(() => {
      // Demo profile
      const demo = {
        full_name: 'Demo User', phone: user?.phone,
        emergency_contact: '+919876543210',
        gender: 'male', wallet_balance: 250, reward_points: 120,
      }
      setProfile(demo)
      setForm({ full_name: 'Demo User', emergency_contact: '9876543210' })
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await profileApi.updateMe({
        full_name: form.full_name,
        emergency_contact: `+91${form.emergency_contact.replace(/\D/g, '')}`,
      })
      toast.success('Profile updated!')
      setEditing(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Update failed')
    } finally { setSaving(false) }
  }

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
    toast.success('Logged out')
  }

  if (loading) return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6 mb-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center flex-shrink-0">
              <User size={28} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  className="input text-lg font-bold mb-2"
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Your name"
                  autoFocus
                />
              ) : (
                <h2 className="font-display text-xl font-bold text-slate-900 mb-0.5">{profile?.full_name || 'User'}</h2>
              )}
              <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                <Phone size={13} /> {user?.phone}
              </div>
              {profile?.email && (
                <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-0.5">
                  <Mail size={12} /> {profile.email}
                </div>
              )}
            </div>
            <button
              onClick={() => editing ? setEditing(false) : setEditing(true)}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
            >
              {editing ? <X size={18} /> : <Edit3 size={18} />}
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Wallet', value: `₹${profile?.wallet_balance || 0}`, icon: '💰', color: 'text-green-600 bg-green-50' },
              { label: 'Points', value: `${profile?.reward_points || 0}`, icon: '⭐', color: 'text-amber-600 bg-amber-50' },
              { label: 'Gender', value: profile?.gender || 'N/A', icon: '👤', color: 'text-blue-600 bg-blue-50' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-3 text-center ${s.color.split(' ')[1]}`}>
                <div className="text-lg mb-1">{s.icon}</div>
                <div className={`font-bold text-sm capitalize ${s.color.split(' ')[0]}`}>{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Editable Fields */}
        {editing && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5 mb-4">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm">Edit Profile</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Emergency Contact</label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-slate-100 border-2 border-r-0 border-slate-200 rounded-l-xl text-sm text-slate-500 font-semibold">+91</div>
                  <input className="input rounded-l-none border-l-0 flex-1" placeholder="10-digit number"
                    value={form.emergency_contact}
                    onChange={e => setForm(p => ({ ...p, emergency_contact: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    maxLength={10} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditing(false)} className="btn-outline flex-1 py-2.5 text-sm rounded-xl">Discard</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5 text-sm rounded-xl disabled:opacity-50">
                <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Saved Addresses */}
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Saved Addresses</h3>
            <button className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              <Plus size={13} /> Add New
            </button>
          </div>
          {addresses.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <MapPin size={24} className="mx-auto mb-2 opacity-40" />
              No saved addresses yet
            </div>
          ) : (
            <div className="space-y-2">
              {addresses.slice(0, 5).map((addr: any) => (
                <div key={addr.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <MapPin size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 text-sm">{addr.label}</div>
                    <div className="text-xs text-slate-500 truncate">{addr.full_address}</div>
                  </div>
                  <button className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & Account */}
        <div className="card p-5 mb-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Account & Security</h3>
          <div className="space-y-1">
            {[
              { icon: Shield, label: 'Privacy Settings', sub: 'Control your data and visibility' },
              { icon: Phone, label: 'Change Phone Number', sub: 'Requires OTP verification' },
            ].map(item => (
              <button key={item.label}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <item.icon size={15} className="text-slate-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-800">{item.label}</div>
                  <div className="text-xs text-slate-400">{item.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-semibold text-sm"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  )
}
