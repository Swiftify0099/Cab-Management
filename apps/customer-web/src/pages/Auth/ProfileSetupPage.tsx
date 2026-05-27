import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { profileApi } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'
import toast from 'react-hot-toast'

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'
const GENDERS: { value: Gender; label: string; emoji: string }[] = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'other', label: 'Other', emoji: '🧑' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', emoji: '🔒' },
]

export function ProfileSetupPage() {
  const navigate = useNavigate()
  const setProfileComplete = useAuthStore(s => s.setProfileComplete)

  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [dob, setDob] = useState('')
  const [emergency, setEmergency] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) e.fullName = 'Enter your full name'
    if (!gender) e.gender = 'Select your gender'
    if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) e.dob = 'Enter date of birth (YYYY-MM-DD)'
    if (!emergency || emergency.replace(/\D/g, '').length < 10) e.emergency = 'Enter a valid 10-digit emergency contact'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await profileApi.setup({
        full_name: fullName.trim(),
        gender,
        dob,
        emergency_contact: `+91${emergency.replace(/\D/g, '')}`,
      })
      setProfileComplete()
      toast.success('Profile saved!')
      navigate('/book', { replace: true })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save profile')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center pt-16 pb-12 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👤</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-1">Complete Your Profile</h1>
          <p className="text-slate-500 text-sm">This helps us personalize and secure your experience</p>
          {/* Progress */}
          <div className="mt-4 h-1.5 bg-slate-200 rounded-full max-w-xs mx-auto">
            <div className="h-full w-1/2 gradient-brand rounded-full" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
            <input
              className={`input ${errors.fullName ? 'border-red-400' : ''}`}
              placeholder="Your full legal name"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })) }}
              autoFocus
            />
            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender *</label>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map(g => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => { setGender(g.value); setErrors(p => ({ ...p, gender: '' })) }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    gender === g.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{g.emoji}</span> {g.label}
                </button>
              ))}
            </div>
            {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
          </div>

          {/* DOB */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of Birth * (must be 18+)</label>
            <input
              type="date"
              className={`input ${errors.dob ? 'border-red-400' : ''}`}
              value={dob}
              onChange={e => { setDob(e.target.value); setErrors(p => ({ ...p, dob: '' })) }}
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            />
            {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
          </div>

          {/* Emergency Contact */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Emergency Contact *</label>
            <div className="flex">
              <div className="flex items-center px-3 bg-slate-100 border-2 border-r-0 border-slate-200 rounded-l-xl text-sm text-slate-500 font-semibold">+91</div>
              <input
                type="tel"
                className={`input rounded-l-none border-l-0 flex-1 ${errors.emergency ? 'border-red-400' : ''}`}
                placeholder="Family member's number"
                value={emergency}
                onChange={e => { setEmergency(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors(p => ({ ...p, emergency: '' })) }}
                maxLength={10}
              />
            </div>
            {errors.emergency && <p className="text-red-500 text-xs mt-1">{errors.emergency}</p>}
          </div>

          {/* Safety info */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
            🔒 Your data is encrypted and never shared without your consent.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Profile & Continue →'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
