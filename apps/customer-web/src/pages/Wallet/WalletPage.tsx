import { motion } from 'framer-motion'
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Zap } from 'lucide-react'

const DEMO_TRANSACTIONS = [
  { id: '1', type: 'debit',  label: 'Booking #PNQ-MUM-0012', amount: 480, date: '26 May 2025', balance: 770 },
  { id: '2', type: 'credit', label: 'Referral Bonus', amount: 100, date: '24 May 2025', balance: 1250 },
  { id: '3', type: 'credit', label: 'Wallet Top-up', amount: 500, date: '22 May 2025', balance: 1150 },
  { id: '4', type: 'debit',  label: 'Booking #PNQ-NSK-0008', amount: 380, date: '20 May 2025', balance: 650 },
  { id: '5', type: 'credit', label: 'Reward Redemption', amount: 50, date: '18 May 2025', balance: 1030 },
]

const QUICK_ADD = [100, 250, 500, 1000]

export function WalletPage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-6">Wallet</h1>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-hero rounded-2xl p-6 mb-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-10 w-24 h-24 bg-purple-500/20 rounded-full translate-y-1/2" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-white/60" />
              <span className="text-white/60 text-sm">Available Balance</span>
            </div>
            <div className="text-4xl font-display font-bold text-white mb-4">₹770.00</div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 text-white/70 text-xs">
                <Zap size={12} /> Instant transfers
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 text-white/70 text-xs">
                ⭐ 120 points = ₹12
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Add */}
        <div className="card p-5 mb-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Add Money</h3>
          <div className="flex gap-2 mb-3 flex-wrap">
            {QUICK_ADD.map(amt => (
              <button key={amt}
                className="flex-1 min-w-[70px] py-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-all">
                ₹{amt}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Custom amount (₹)" type="number" min="10" />
            <button className="btn-primary px-5 py-2.5 rounded-xl text-sm">
              <Plus size={16} /> Add
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Powered by Razorpay • UPI / Card / NetBanking</p>
        </div>

        {/* Transaction History */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Transaction History</h3>
          <div className="space-y-1">
            {DEMO_TRANSACTIONS.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'credit' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {tx.type === 'credit'
                    ? <ArrowDownLeft size={16} className="text-green-600" />
                    : <ArrowUpRight size={16} className="text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{tx.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{tx.date} • Bal ₹{tx.balance}</div>
                </div>
                <div className={`text-sm font-bold flex-shrink-0 ${
                  tx.type === 'credit' ? 'text-green-600' : 'text-red-500'
                }`}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
