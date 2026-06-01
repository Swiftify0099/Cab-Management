/**
 * Admin Settings Page — Platform configuration, admin profile, notifications.
 */
import { useState } from 'react'
import { Save, Settings2, Bell, Shield, Globe, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'platform', label: 'Platform', icon: Globe },
  { id: 'admins', label: 'Admin Users', icon: Users },
]

const DEMO_ADMINS = [
  { id: 'a1', name: 'Super Admin', email: 'admin@swiftify.in', role: 'super_admin', last_login: '2025-05-29T14:30:00Z', status: 'active' },
  { id: 'a2', name: 'Ops Manager', email: 'ops@swiftify.in', role: 'manager', last_login: '2025-05-28T09:00:00Z', status: 'active' },
  { id: 'a3', name: 'Support Agent', email: 'support@swiftify.in', role: 'support', last_login: '2025-05-27T11:00:00Z', status: 'active' },
]

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  support: 'bg-green-100 text-green-700',
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)

  const [generalSettings, setGeneralSettings] = useState({
    platform_name: 'Swiftify',
    support_email: 'support@swiftify.in',
    support_phone: '+91 1800-XXX-XXXX',
    platform_currency: 'INR',
    timezone: 'Asia/Kolkata',
    booking_commission_pct: 10,
    parcel_commission_pct: 15,
    driver_min_rating: 3.5,
  })

  const [notifications, setNotifications] = useState({
    email_new_driver: true,
    email_kyc_submission: true,
    email_daily_report: true,
    email_trip_sos: true,
    sms_new_booking: false,
    sms_trip_cancel: true,
    push_sos_alert: true,
    push_payment_fail: true,
  })

  const [platform, setPlatform] = useState({
    allow_guest_booking: false,
    require_kyc_for_drivers: true,
    auto_approve_drivers: false,
    max_seats_per_trip: 8,
    min_advance_booking_hrs: 0.5,
    max_advance_booking_days: 14,
    enable_hotels: true,
    enable_parcels: true,
    enable_referrals: true,
  })

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    toast.success('Settings saved successfully!')
    setSaving(false)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configure and manage your platform</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-52 space-y-1 flex-shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* General */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-slate-900 mb-4">General Configuration</h2>
              <div className="grid grid-cols-2 gap-5">
                {[
                  { label: 'Platform Name', key: 'platform_name', type: 'text' },
                  { label: 'Support Email', key: 'support_email', type: 'email' },
                  { label: 'Support Phone', key: 'support_phone', type: 'text' },
                  { label: 'Currency', key: 'platform_currency', type: 'text' },
                  { label: 'Timezone', key: 'timezone', type: 'text' },
                  { label: 'Booking Commission (%)', key: 'booking_commission_pct', type: 'number' },
                  { label: 'Parcel Commission (%)', key: 'parcel_commission_pct', type: 'number' },
                  { label: 'Min Driver Rating', key: 'driver_min_rating', type: 'number' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      value={(generalSettings as any)[field.key]}
                      onChange={e => setGeneralSettings(s => ({ ...s, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-bold text-slate-900 mb-5">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { group: 'Email Notifications', items: [
                    { key: 'email_new_driver', label: 'New driver registration' },
                    { key: 'email_kyc_submission', label: 'KYC document submitted' },
                    { key: 'email_daily_report', label: 'Daily summary report' },
                    { key: 'email_trip_sos', label: 'Trip SOS alert' },
                  ]},
                  { group: 'SMS Notifications', items: [
                    { key: 'sms_new_booking', label: 'New booking placed' },
                    { key: 'sms_trip_cancel', label: 'Trip cancellation' },
                  ]},
                  { group: 'Push Notifications', items: [
                    { key: 'push_sos_alert', label: 'Emergency SOS alerts' },
                    { key: 'push_payment_fail', label: 'Payment failures' },
                  ]},
                ].map(group => (
                  <div key={group.group}>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{group.group}</h3>
                    <div className="space-y-3">
                      {group.items.map(item => (
                        <div key={item.key} className="flex items-center justify-between py-2.5 px-4 rounded-xl hover:bg-slate-50 transition-colors">
                          <span className="text-sm text-slate-700">{item.label}</span>
                          <button
                            onClick={() => setNotifications(n => ({ ...n, [item.key]: !(n as any)[item.key] }))}
                            className={`relative w-11 h-6 rounded-full transition-colors ${(notifications as any)[item.key] ? 'bg-blue-600' : 'bg-slate-200'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${(notifications as any)[item.key] ? 'left-6' : 'left-1'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-slate-900">Security Settings</h2>
              <div className="space-y-4">
                {[
                  { label: 'Two-Factor Authentication', desc: 'Require 2FA for all admin logins', enabled: true },
                  { label: 'Session Timeout', desc: 'Auto-logout after 8 hours of inactivity', enabled: true },
                  { label: 'IP Allowlisting', desc: 'Restrict admin access to specific IPs', enabled: false },
                  { label: 'Login Audit Log', desc: 'Track all admin login activity', enabled: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                    <button className={`relative w-11 h-6 rounded-full transition-colors ${item.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 text-sm">Change Admin Password</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
                    <div key={label} className={label === 'Current Password' ? 'col-span-2' : ''}>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
                      <input type="password" className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="••••••••" />
                    </div>
                  ))}
                </div>
                <button className="mt-3 px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 transition-colors">
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* Platform */}
          {activeTab === 'platform' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <h2 className="font-bold text-slate-900">Platform Configuration</h2>
              <div className="space-y-3">
                {[
                  { key: 'allow_guest_booking', label: 'Allow Guest Bookings', desc: 'Let non-registered users make bookings' },
                  { key: 'require_kyc_for_drivers', label: 'Require Driver KYC', desc: 'Drivers must complete KYC to accept trips' },
                  { key: 'auto_approve_drivers', label: 'Auto-Approve Drivers', desc: 'Skip manual approval for new drivers' },
                  { key: 'enable_hotels', label: 'Enable Hotels Module', desc: 'Show hotel listings to customers' },
                  { key: 'enable_parcels', label: 'Enable Parcels Module', desc: 'Allow parcel delivery bookings' },
                  { key: 'enable_referrals', label: 'Enable Referral Program', desc: 'Activate the referral & rewards system' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => setPlatform(p => ({ ...p, [item.key]: !(p as any)[item.key] }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${(platform as any)[item.key] ? 'bg-blue-600' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${(platform as any)[item.key] ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'max_seats_per_trip', label: 'Max Seats / Trip', type: 'number' },
                  { key: 'min_advance_booking_hrs', label: 'Min Advance Booking (hrs)', type: 'number' },
                  { key: 'max_advance_booking_days', label: 'Max Advance Booking (days)', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">{f.label}</label>
                    <input
                      type="number"
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={(platform as any)[f.key]}
                      onChange={e => setPlatform(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Users */}
          {activeTab === 'admins' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Admin Users</h2>
                <button className="flex items-center gap-2 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                  <Users size={13} /> Invite Admin
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Admin', 'Role', 'Last Login', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEMO_ADMINS.map(admin => (
                    <tr key={admin.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-sm">
                            {admin.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{admin.name}</div>
                            <div className="text-xs text-slate-400">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[admin.role]}`}>
                          {admin.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {new Date(admin.last_login).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">active</span>
                      </td>
                      <td className="px-5 py-4">
                        <button className="text-xs text-slate-500 hover:text-red-500 font-medium transition-colors">Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
