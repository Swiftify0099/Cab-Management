import { motion } from 'framer-motion'
import { Car } from 'lucide-react'

export function DriversPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Drivers</h1>
          <p className="text-slate-500 text-sm">Manage and monitor all drivers</p>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-12 flex flex-col items-center justify-center text-center"
      >
        <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center mb-4">
          <Car className="w-8 h-8 text-primary-500" />
        </div>
        <h2 className="text-xl font-display font-semibold text-slate-800 dark:text-white mb-2">Drivers Module</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          Full implementation in the corresponding phase.
        </p>
        <span className="mt-4 badge badge-primary">Phase Implementation Pending</span>
      </motion.div>
    </div>
  )
}
