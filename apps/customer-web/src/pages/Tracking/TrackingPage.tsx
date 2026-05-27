import { motion } from 'framer-motion'

export function TrackingPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900">Live Tracking</h1>
          <p className="text-slate-500 text-sm mt-1">Phase 3+ — coming soon</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-12 text-center"
        >
          <div className="text-5xl mb-4">🚀</div>
          <h3 className="font-semibold text-slate-700 mb-1">Live Tracking Module</h3>
          <p className="text-slate-400 text-sm">Full implementation in Phase 3+</p>
          <span className="mt-4 inline-block badge badge-blue">Coming Soon</span>
        </motion.div>
      </div>
    </div>
  )
}
