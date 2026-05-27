import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Car, Package, Hotel, MapPin, Shield, Zap, ArrowRight,
  CheckCircle
} from 'lucide-react'

const FEATURES = [
  { icon: Car, title: 'Intercity Cab Booking', desc: 'Book shared or private cabs between cities with real-time driver tracking.', color: 'text-blue-600 bg-blue-50' },
  { icon: Package, title: 'Parcel Delivery', desc: 'Send parcels with your cab ride — safe, insured, and door-to-door.', color: 'text-purple-600 bg-purple-50' },
  { icon: Hotel, title: 'Hotel Booking', desc: 'Book budget or premium hotels at your destination, all in one app.', color: 'text-emerald-600 bg-emerald-50' },
  { icon: Shield, title: 'SOS & Safety', desc: 'One-tap SOS, live trip sharing, and women-only cab options.', color: 'text-rose-600 bg-rose-50' },
  { icon: Zap, title: 'Instant Matching', desc: 'AI-powered driver matching in under 30 seconds for any route.', color: 'text-amber-600 bg-amber-50' },
  { icon: MapPin, title: 'Live GPS Tracking', desc: 'Real-time ETA, route tracking, and turn-by-turn navigation.', color: 'text-cyan-600 bg-cyan-50' },
]

const STATS = [
  { value: '50K+', label: 'Happy Riders' },
  { value: '5K+', label: 'Verified Drivers' },
  { value: '200+', label: 'Routes' },
  { value: '4.8★', label: 'Average Rating' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Enter your route', desc: 'Tell us where you\'re going and when. We\'ll find the best options.' },
  { step: '02', title: 'Choose your ride', desc: 'Pick from shared or private cab, select seats, and add parcels.' },
  { step: '03', title: 'Pay securely', desc: 'Pay via UPI, card, wallet or cash. Instant confirmation.' },
  { step: '04', title: 'Track live', desc: 'Watch your driver in real-time with live GPS. Share your trip.' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <Car size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900">CabBooking</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-3 py-2">
              Sign In
            </Link>
            <Link to="/login" className="btn-primary text-sm px-4 py-2 rounded-lg">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero min-h-screen flex items-center relative overflow-hidden pt-16">
        {/* Background orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto px-4 py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — text */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white/80 text-sm font-medium">Live Tracking Available</span>
              </div>

              <h1 className="font-display text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Travel Smarter,{' '}
                <span className="text-gradient bg-gradient-to-r from-blue-400 to-purple-400" style={{ WebkitTextFillColor: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text', backgroundImage: 'linear-gradient(to right, #60A5FA, #A78BFA)' }}>
                  Together
                </span>
              </h1>

              <p className="text-slate-300 text-lg leading-relaxed mb-8 max-w-lg">
                Book intercity cabs, send parcels, and reserve hotels — all in one platform. 
                Real-time tracking, verified drivers, and instant booking.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link to="/login" className="btn-white text-base px-6 py-3 rounded-xl font-bold">
                  Book a Ride <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" className="btn-outline border-white/30 text-white hover:bg-white/10 text-base px-6 py-3 rounded-xl" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>
                  How It Works
                </a>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-6">
                {STATS.map(s => (
                  <div key={s.label}>
                    <div className="text-2xl font-display font-bold text-white">{s.value}</div>
                    <div className="text-slate-400 text-xs">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right — booking card mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="hidden lg:block"
            >
              <div className="glass rounded-3xl p-6 max-w-sm mx-auto animate-float">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
                    <Car size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">Book Your Ride</div>
                    <div className="text-white/50 text-xs">Intercity travel made easy</div>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <MapPin size={14} className="text-green-400" />
                    </div>
                    <div>
                      <div className="text-white/50 text-xs">From</div>
                      <div className="text-white text-sm font-medium">Pune, Maharashtra</div>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <MapPin size={14} className="text-red-400" />
                    </div>
                    <div>
                      <div className="text-white/50 text-xs">To</div>
                      <div className="text-white text-sm font-medium">Mumbai, Maharashtra</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mb-5">
                  {['Shared', 'Private', 'Parcel'].map((t, i) => (
                    <div key={t} className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold ${i === 0 ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'}`}>
                      {t}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between bg-white/10 rounded-xl p-3 mb-4">
                  <div>
                    <div className="text-white/50 text-xs">Estimated Fare</div>
                    <div className="text-white font-bold text-lg">₹480 <span className="text-white/40 text-xs font-normal">/ seat</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/50 text-xs">ETA</div>
                    <div className="text-white font-semibold text-sm">~3.5 hrs</div>
                  </div>
                </div>

                <button className="w-full py-3 gradient-brand rounded-xl text-white font-bold text-sm">
                  Confirm Booking →
                </button>

                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-1 text-white/50 text-xs">
                    <Shield size={11} /> Insured
                  </div>
                  <div className="flex items-center gap-1 text-white/50 text-xs">
                    <CheckCircle size={11} /> Verified Driver
                  </div>
                  <div className="flex items-center gap-1 text-white/50 text-xs">
                    <Zap size={11} /> Instant
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="badge badge-blue mb-3">Everything in One App</span>
            <h2 className="font-display text-4xl font-bold text-slate-900 mb-4">
              More than just a cab app
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              CabBooking combines intercity travel, parcel delivery, and hotel booking into a single seamless platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className="card p-6 hover:shadow-lg transition-shadow group"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon size={22} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="badge badge-purple mb-3">Simple & Fast</span>
            <h2 className="font-display text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-slate-500">Book your trip in 4 easy steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center relative"
              >
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-2/3 w-full h-px bg-gradient-to-r from-blue-200 to-transparent" />
                )}
                <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-sm mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #4F46E5, transparent)' }} />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            Ready to travel smarter?
          </h2>
          <p className="text-slate-300 mb-8">
            Join 50,000+ happy riders across Maharashtra and beyond.
          </p>
          <Link to="/login" className="btn-white text-base px-8 py-4 rounded-xl font-bold inline-flex items-center gap-2">
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
              <Car size={14} className="text-white" />
            </div>
            <span className="text-white font-display font-bold">CabBooking</span>
          </div>
          <div className="text-sm">© 2025 CabBooking. Built with ❤️ in India</div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
