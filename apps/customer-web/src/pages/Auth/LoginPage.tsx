import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Car, ArrowLeft } from 'lucide-react'
import { authApi } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'
import toast from 'react-hot-toast'

const OTP_LENGTH = 6

// ── Phone entry ──────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10) { toast.error('Enter a valid 10-digit number'); return }

    setLoading(true)
    try {
      await authApi.sendOtp(`+91${cleaned}`)
      navigate('/login/otp', { state: { phone: `+91${cleaned}` } })
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex gradient-hero">
      {/* Left — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl" />

        <Link to="/" className="flex items-center gap-2 relative z-10">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
            <Car size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white">CabBooking</span>
        </Link>

        <div className="relative z-10">
          <h1 className="font-display text-4xl font-bold text-white mb-4 leading-tight">
            Travel smarter,{'\n'}travel together
          </h1>
          <p className="text-slate-300 max-w-sm">
            Book intercity cabs, send parcels, and stay at top hotels — all in one platform.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              ['50K+', 'Happy Riders'],
              ['5K+', 'Verified Drivers'],
              ['200+', 'Routes'],
              ['4.8★', 'Rating'],
            ].map(([v, l]) => (
              <div key={l} className="glass rounded-xl p-4">
                <div className="text-2xl font-display font-bold text-white">{v}</div>
                <div className="text-slate-400 text-xs">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-slate-500 text-xs relative z-10">© 2025 CabBooking</div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
              <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                <Car size={15} className="text-white" />
              </div>
              <span className="font-display font-bold text-slate-900">CabBooking</span>
            </Link>
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm">Enter your mobile number to sign in</p>
          </div>

          <form onSubmit={handleSend}>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile Number</label>
            <div className="flex mb-4">
              <div className="flex items-center gap-2 px-4 bg-slate-100 border-2 border-r-0 border-slate-200 rounded-l-xl">
                <span>🇮🇳</span>
                <span className="text-sm font-semibold text-slate-600">+91</span>
              </div>
              <input
                type="tel"
                className="input rounded-l-none border-l-0 flex-1"
                placeholder="Enter 10-digit number"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                autoFocus
              />
            </div>

            {import.meta.env.DEV && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700">
                🔧 Dev mode — any number works, OTP is <strong>123456</strong>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="btn-primary w-full py-3 text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send OTP →'}
            </button>
          </form>

          <p className="text-xs text-center text-slate-400 mt-6">
            By continuing, you agree to our{' '}
            <a href="#" className="text-blue-500 hover:underline">Terms</a> and{' '}
            <a href="#" className="text-blue-500 hover:underline">Privacy Policy</a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

// ── OTP Verification ──────────────────────────────────────────

export function OTPPage() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const location = window.history.state?.usr
  const phone = location?.phone || sessionStorage.getItem('otp_phone') || ''

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timer, setTimer] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setTimer(p => p - 1), 1000)
    return () => clearTimeout(t)
  }, [timer])

  const handleChange = (val: string, idx: number) => {
    const d = val.replace(/\D/g, '').slice(-1)
    const n = [...otp]; n[idx] = d; setOtp(n); setError('')
    if (d && idx < OTP_LENGTH - 1) refs.current[idx + 1]?.focus()
    if (d && idx === OTP_LENGTH - 1 && n.every(x => x)) verify(n.join(''))
  }

  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) refs.current[idx - 1]?.focus()
  }

  const verify = useCallback(async (code?: string) => {
    const otpCode = code || otp.join('')
    if (otpCode.length < OTP_LENGTH) { setError('Enter the full 6-digit OTP'); return }
    setLoading(true); setError('')
    try {
      const res = await authApi.verifyOtp(phone, otpCode)
      const d = res.data.data
      login({ userId: d.user_id, phone, role: d.role, profileComplete: d.profile_complete, isNewUser: d.is_new_user }, d.access_token, d.refresh_token)
      navigate(d.profile_complete ? '/book' : '/setup-profile', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid OTP')
      setOtp(Array(OTP_LENGTH).fill(''))
      refs.current[0]?.focus()
    } finally { setLoading(false) }
  }, [otp, phone, login, navigate])

  const resend = async () => {
    if (!canResend) return
    setCanResend(false); setTimer(30); setOtp(Array(OTP_LENGTH).fill('')); setError('')
    try { await authApi.sendOtp(phone) } catch { toast.error('Failed to resend') }
  }

  const maskedPhone = phone.replace(/(\+91)(\d{3})\d{4}(\d{3})/, '$1 $2****$3')

  return (
    <div className="min-h-screen flex gradient-hero">
      <div className="hidden lg:flex flex-col justify-center w-1/2 p-12 relative overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl" />
        <Link to="/" className="flex items-center gap-2 absolute top-12 left-12">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
            <Car size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-white">CabBooking</span>
        </Link>
        <div className="relative z-10 text-center">
          <div className="text-6xl mb-6">📱</div>
          <h2 className="font-display text-3xl font-bold text-white mb-3">OTP Verification</h2>
          <p className="text-slate-300">Keeping your account secure with one-time passwords</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <button onClick={() => navigate('/login')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-8 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">Enter OTP</h2>
            <p className="text-slate-500 text-sm">
              We sent a 6-digit code to <span className="font-semibold text-slate-700">{maskedPhone}</span>
            </p>
          </div>

          {/* OTP boxes */}
          <div className="flex gap-3 mb-4 justify-center">
            {Array(OTP_LENGTH).fill(null).map((_, i) => (
              <input
                key={i}
                ref={r => { refs.current[i] = r }}
                type="tel"
                maxLength={1}
                value={otp[i]}
                onChange={e => handleChange(e.target.value, i)}
                onKeyDown={e => handleKey(e, i)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all ${
                  otp[i] ? 'border-blue-600 bg-blue-50 text-blue-700' :
                  error ? 'border-red-400 bg-red-50' :
                  'border-slate-200 focus:border-blue-500'
                }`}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

          {import.meta.env.DEV && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700 text-center">
              🔧 Dev mode — OTP: <strong>123456</strong>
            </div>
          )}

          <button
            onClick={() => verify()}
            disabled={loading || otp.join('').length < OTP_LENGTH}
            className="btn-primary w-full py-3 text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>

          <div className="text-center text-sm text-slate-500">
            Didn't receive it?{' '}
            {canResend
              ? <button onClick={resend} className="text-blue-600 font-semibold hover:underline">Resend OTP</button>
              : <span className="text-slate-400">Resend in {timer}s</span>
            }
          </div>
        </motion.div>
      </div>
    </div>
  )
}
