import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, Car, Shield, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/auth.store'
import { apiClient } from '../../api/client'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('admin@cabooking.com')
  const [password, setPassword] = useState('123456')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await apiClient.post('/admin/auth/login', { email, password })
      const { data } = res.data

      login(
        {
          id: data.user_id,
          email,
          role: data.role,
          must_change_password: false,
        },
        data.access_token,
        data.refresh_token,
      )

      toast.success('Welcome back, Admin! 👋')
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Invalid credentials'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary-600/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary-600/20 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary-500/5 blur-3xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo + Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-brand shadow-glow-primary mb-4">
            <Car className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">
            CabBooking Admin
          </h1>
          <p className="text-slate-400 text-sm">
            Intercity Mobility SuperApp — Admin Console
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="glass-card p-8"
        >
          {/* Feature badges */}
          <div className="flex items-center gap-3 mb-6">
            <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <Shield className="w-3 h-3 text-emerald-400" />
              Secure Login
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <Zap className="w-3 h-3 text-amber-400" />
              2FA Ready
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm"
                  placeholder="admin@cabooking.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  id="admin-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-sm"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  id="toggle-password"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5"
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <motion.button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-gradient-brand text-white font-semibold rounded-xl shadow-glow-primary hover:shadow-glow-secondary transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </motion.button>
          </form>

          {/* Default credentials hint */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-xs text-center text-slate-500">
              Default credentials:{' '}
              <code className="text-primary-400 bg-primary-900/30 px-1.5 py-0.5 rounded">
                admin@cabooking.com
              </code>
              {' / '}
              <code className="text-primary-400 bg-primary-900/30 px-1.5 py-0.5 rounded">
                123456
              </code>
            </p>
            <p className="text-xs text-center text-slate-600 mt-1">
              You will be prompted to change your password on first login.
            </p>
          </div>
        </motion.div>

        {/* Version */}
        <p className="text-center text-slate-600 text-xs mt-6">
          CabBooking SuperApp v1.0.0 — Enterprise Edition
        </p>
      </div>
    </div>
  )
}
