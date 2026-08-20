/**
 * Live Tracking Page — Customer Web
 * Real-time driver location on embedded map + ETA + trip status.
 * Uses Socket.IO for live updates + REST fallback polling.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { Phone, Star, Clock, Navigation, X } from 'lucide-react'
import { useSocket } from '../../hooks/useSocket'
import { bookingApi } from '../../api/client'
import toast from 'react-hot-toast'
import Map, { Marker } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface LocationData {
  latitude: number
  longitude: number
  speed_kmh: number
  heading: number
  eta_minutes: number | null
  distance_remaining_km: number | null
  recorded_at: string
}

interface BookingDetails {
  id: string
  status: string
  seat_count: number
  total_fare: number
  trip: {
    pickup_city: string
    destination_city: string
    departure_time: string
    distance_km: number
    pickup_lon: number
    pickup_lat: number
  }
  driver?: {
    full_name: string
    rating: number
    phone: string
    vehicle: string
    registration_number: string
  }
}

export function LiveTrackPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { on, off, joinTrip, leaveTrip, sendSOS, connected } = useSocket()
  const [location, setLocation] = useState<LocationData | null>(null)
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSOS, setShowSOS] = useState(false)
  const tripIdRef = useRef<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load booking details
  useEffect(() => {
    if (!bookingId) return
    bookingApi.getTrip(bookingId).then(res => {
      const data = res.data.data
      setBooking(data)
      tripIdRef.current = data?.trip_id
      setLoading(false)
    }).catch(() => {
      // Demo booking
      setBooking({
        id: bookingId,
        status: 'started',
        seat_count: 2,
        total_fare: 980,
        trip: { pickup_city: 'Pune', destination_city: 'Mumbai', departure_time: new Date().toISOString(), distance_km: 149, pickup_lon: 73.8567, pickup_lat: 18.5204 },
        driver: { full_name: 'Ramesh Patil', rating: 4.8, phone: '+919876543210', vehicle: 'Swift Dzire (White)', registration_number: 'MH12AB1234' },
      })
      tripIdRef.current = 'demo-trip'
      setLoading(false)
    })
  }, [bookingId])

  // Join trip room + listen for location updates
  useEffect(() => {
    if (!connected || !tripIdRef.current) return
    joinTrip(tripIdRef.current)

    const handleLocation = (data: any) => {
      setLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        speed_kmh: data.speed_kmh || 0,
        heading: data.heading || 0,
        eta_minutes: data.eta_minutes,
        distance_remaining_km: data.distance_remaining_km,
        recorded_at: data.recorded_at,
      })
    }

    const handleCompleted = () => {
      toast.success('Trip completed! 🎉')
      setTimeout(() => navigate('/trips'), 3000)
    }

    on('LOCATION_UPDATE', handleLocation)
    on('TRIP_COMPLETED', handleCompleted)

    // REST fallback poll every 15s
    pollRef.current = setInterval(async () => {
      if (!tripIdRef.current) return
      try {
        const { api } = await import('../../api/client')
        const res = await api.get(`/tracking/trip/${tripIdRef.current}/current`)
        handleLocation(res.data.data)
      } catch {}
    }, 15000)

    return () => {
      leaveTrip(tripIdRef.current!)
      off('LOCATION_UPDATE', handleLocation)
      off('TRIP_COMPLETED', handleCompleted)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [connected, tripIdRef.current, on, off, joinTrip, leaveTrip])

  const handleSOS = useCallback(() => {
    sendSOS({
      booking_id: bookingId,
      latitude: location?.latitude,
      longitude: location?.longitude,
      message: 'Customer emergency during trip',
    })
    setShowSOS(false)
    toast.error('🆘 SOS sent! Help is on the way.')
  }, [sendSOS, bookingId, location])



  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="text-5xl mb-4">🗺️</div>
        <div className="text-lg font-semibold">Loading trip details...</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Map */}
      <div className="flex-1 relative min-h-[55vh]">
        <Map
          mapLib={maplibregl}
          initialViewState={{
            longitude: location?.longitude || booking?.trip?.pickup_lon || 73.8567,
            latitude: location?.latitude || booking?.trip?.pickup_lat || 18.5204,
            zoom: 14
          }}
          style={{width: '100%', height: '100%'}}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        >
          {location && (
            <Marker longitude={location.longitude} latitude={location.latitude}>
              <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse" />
            </Marker>
          )}
        </Map>

        {/* Map overlay controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <button onClick={() => navigate(-1)}
            className="bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:bg-white transition-colors">
            <X size={18} className="text-slate-700" />
          </button>

          <div className="flex items-center gap-2">
            {/* WS connection indicator */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
              connected ? 'bg-green-500/90 text-white' : 'bg-amber-500/90 text-white'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-white animate-pulse' : 'bg-white'}`} />
              {connected ? 'Live' : 'Connecting...'}
            </div>

            {/* SOS */}
            <button onClick={() => setShowSOS(true)}
              className="bg-red-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-red-700 transition-colors">
              🆘 SOS
            </button>
          </div>
        </div>

        {/* Driver location marker overlay */}
        {location && (
          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-semibold">
              🚗 Driver is here
            </div>
          </motion.div>
        )}
      </div>

      {/* Trip Info Panel */}
      <div className="bg-white rounded-t-3xl -mt-6 shadow-2xl z-10">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          {/* ETA Banner */}
          <div className={`flex items-center gap-3 p-4 rounded-2xl mb-4 ${
            booking?.status === 'started'
              ? 'bg-blue-50 border border-blue-100'
              : 'bg-amber-50 border border-amber-100'
          }`}>
            <Clock size={20} className={booking?.status === 'started' ? 'text-blue-600' : 'text-amber-600'} />
            <div className="flex-1">
              <div className="font-bold text-slate-900 text-sm">
                {location?.eta_minutes != null
                  ? `ETA: ${location.eta_minutes} min`
                  : booking?.status === 'driver_accepted'
                  ? 'Driver is coming to pick you up'
                  : 'Trip in progress'}
              </div>
              {location?.distance_remaining_km != null && (
                <div className="text-xs text-slate-500 mt-0.5">
                  {location.distance_remaining_km} km remaining
                  {location.speed_kmh > 0 && ` • ${Math.round(location.speed_kmh)} km/h`}
                </div>
              )}
            </div>
            <Navigation size={16} className="text-slate-400" style={{ transform: `rotate(${location?.heading || 0}deg)` }} />
          </div>

          {/* Route */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-600" />
              <div className="w-px h-8 bg-slate-200" />
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-700 mb-2">{booking?.trip?.pickup_city}</div>
              <div className="text-sm font-semibold text-slate-700">{booking?.trip?.destination_city}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">{booking?.trip?.distance_km} km</div>
              <div className="text-sm font-bold text-slate-900 mt-1">₹{booking?.total_fare}</div>
            </div>
          </div>

          {/* Driver Card */}
          {booking?.driver && (
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">{booking.driver.full_name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm">{booking.driver.full_name}</div>
                <div className="flex items-center gap-1 text-amber-500 text-xs mt-0.5">
                  <Star size={11} fill="currentColor" /> {booking.driver.rating}
                </div>
                <div className="text-xs text-slate-500 truncate">{booking.driver.vehicle} • {booking.driver.registration_number}</div>
              </div>
              <a href={`tel:${booking.driver.phone}`}
                className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-green-200 transition-colors">
                <Phone size={13} /> Call
              </a>
            </div>
          )}
        </div>
      </div>

      {/* SOS Confirmation Modal */}
      <AnimatePresence>
        {showSOS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
            onClick={() => setShowSOS(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-5xl text-center mb-4">🆘</div>
              <h3 className="font-display text-xl font-bold text-center text-red-600 mb-2">Emergency SOS</h3>
              <p className="text-slate-600 text-sm text-center mb-6">
                This will alert our emergency team with your current location. Use only in genuine emergencies.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowSOS(false)}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleSOS}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700">
                  Send SOS Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
