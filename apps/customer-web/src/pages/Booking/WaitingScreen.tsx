/**
 * Waiting Screen — Customer sees this while we find a driver.
 * Shows live matching status, driver info when accepted, cancel option.
 */
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import { bookingApi } from '../../api/client'
import toast from 'react-hot-toast'
import { X, MapPin, Phone, Star, Clock } from 'lucide-react'

type MatchState =
  | 'searching'
  | 'found'
  | 'failed'
  | 'timeout'

interface DriverInfo {
  driver_id: string
  full_name: string
  rating: number
  phone: string
  vehicle: string
  registration_number: string
  vehicle_type: string
  distance_km: number
}

const DOTS_ANIMATION = ['●○○', '○●○', '○○●', '○●○']

export function WaitingScreen() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { on, off, connected } = useSocket()
  const [state, setState] = useState<MatchState>('searching')
  const [driver, setDriver] = useState<DriverInfo | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [dotsIdx, setDotsIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dotsRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const MAX_WAIT = 120 // 2 minutes

  useEffect(() => {
    // Elapsed time
    timerRef.current = setInterval(() => {
      setElapsed(p => {
        if (p >= MAX_WAIT) {
          setState('timeout')
          clearInterval(timerRef.current!)
          return p
        }
        return p + 1
      })
    }, 1000)

    // Dots animation
    dotsRef.current = setInterval(() => {
      setDotsIdx(p => (p + 1) % DOTS_ANIMATION.length)
    }, 500)

    return () => {
      clearInterval(timerRef.current!)
      clearInterval(dotsRef.current!)
    }
  }, [])

  useEffect(() => {
    if (!connected) return

    const handleAccepted = (data: any) => {
      if (data.booking_id !== bookingId) return
      setDriver(data.driver)
      setState('found')
      clearInterval(timerRef.current!)
      toast.success('🎉 Driver found!')
    }

    const handleFailed = (data: any) => {
      if (data.booking_id !== bookingId) return
      setState('failed')
      clearInterval(timerRef.current!)
      toast.error('No driver available right now')
    }

    on('DRIVER_ACCEPTED', handleAccepted)
    on('MATCHING_FAILED', handleFailed)

    return () => {
      off('DRIVER_ACCEPTED', handleAccepted)
      off('MATCHING_FAILED', handleFailed)
    }
  }, [connected, bookingId, on, off])

  const handleCancel = async () => {
    try {
      await bookingApi.cancelTrip(bookingId!, 'Customer cancelled while waiting')
      toast('Booking cancelled')
    } catch {}
    navigate('/trips')
  }

  const handleTrack = () => {
    navigate(`/trips/${bookingId}/track`)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-blue-500/20"
            style={{ width: i * 180, height: i * 180 }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {state === 'searching' && (
          <motion.div
            key="searching"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center z-10"
          >
            {/* Spinning car */}
            <motion.div
              className="text-7xl mb-8"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🚗
            </motion.div>

            <h1 className="text-white font-display text-3xl font-bold mb-2">
              Finding your driver
            </h1>
            <p className="text-slate-400 text-lg mb-2">
              {DOTS_ANIMATION[dotsIdx]}
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Searching nearby drivers • {MAX_WAIT - elapsed}s remaining
            </p>

            {/* Progress bar */}
            <div className="w-64 h-1.5 bg-slate-700 rounded-full mb-10 overflow-hidden">
              <motion.div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(elapsed / MAX_WAIT) * 100}%` }}
                transition={{ duration: 1 }}
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-800 rounded-2xl px-5 py-3 mb-6 border border-slate-700 text-sm text-slate-400">
              <Clock size={14} className="text-blue-400" />
              We try up to 5 nearby drivers automatically
            </div>

            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm border border-red-800 hover:border-red-600 px-5 py-2.5 rounded-xl transition-all"
            >
              <X size={14} /> Cancel Search
            </button>
          </motion.div>
        )}

        {state === 'found' && driver && (
          <motion.div
            key="found"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="z-10 w-full max-w-sm"
          >
            <div className="text-center mb-6">
              <motion.div
                className="text-6xl mb-3"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 1, repeat: 3 }}
              >
                🎉
              </motion.div>
              <h2 className="text-white font-display text-2xl font-bold">Driver Found!</h2>
              <p className="text-slate-400 text-sm mt-1">Your cab is on the way</p>
            </div>

            {/* Driver card */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-2xl font-bold">{driver.full_name.charAt(0)}</span>
                </div>
                <div>
                  <div className="text-white font-semibold text-base">{driver.full_name}</div>
                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    <Star size={13} fill="currentColor" /> {driver.rating.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-700/60 rounded-xl p-3">
                  <div className="text-slate-400 text-xs mb-1">Vehicle</div>
                  <div className="text-white font-medium capitalize">{driver.vehicle}</div>
                </div>
                <div className="bg-slate-700/60 rounded-xl p-3">
                  <div className="text-slate-400 text-xs mb-1">Registration</div>
                  <div className="text-white font-medium">{driver.registration_number}</div>
                </div>
                <div className="bg-slate-700/60 rounded-xl p-3">
                  <div className="text-slate-400 text-xs mb-1">Distance Away</div>
                  <div className="text-white font-medium">{driver.distance_km} km</div>
                </div>
                <div className="bg-slate-700/60 rounded-xl p-3">
                  <div className="text-slate-400 text-xs mb-1">ETA</div>
                  <div className="text-white font-medium">~{Math.round(driver.distance_km * 3)} min</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <a href={`tel:${driver.phone}`}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-green-700 transition-colors">
                <Phone size={16} /> Call Driver
              </a>
              <button onClick={handleTrack}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-blue-700 transition-colors">
                <MapPin size={16} /> Track Live
              </button>
            </div>
          </motion.div>
        )}

        {(state === 'failed' || state === 'timeout') && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center z-10 max-w-sm"
          >
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-white font-display text-2xl font-bold mb-2">
              {state === 'timeout' ? 'Search Timed Out' : 'No Driver Available'}
            </h2>
            <p className="text-slate-400 text-sm mb-6 px-4">
              No drivers are available in your area right now. Please try again in a few minutes.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/book')}
                className="bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors">
                Try Again
              </button>
              <button onClick={() => navigate('/trips')}
                className="text-slate-400 hover:text-white text-sm transition-colors">
                View My Trips
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
