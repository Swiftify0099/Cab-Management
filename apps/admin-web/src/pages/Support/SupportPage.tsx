import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LifeBuoy, Search, Filter, CheckCircle, Clock } from 'lucide-react'
import { adminApi } from '../../api/client'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

interface Ticket {
  id: string
  user_id: string
  booking_id: string | null
  complaint_type: string
  subject: string
  description: string
  status: string
  created_at: string
  resolution: string | null
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionText, setResolutionText] = useState('')

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const res = await adminApi.get('/support/tickets')
      setTickets(res.data?.data || [])
    } catch (error) {
      toast.error('Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleResolve = async (ticketId: string) => {
    if (!resolutionText.trim()) {
      toast.error('Please enter a resolution note')
      return
    }
    
    try {
      await adminApi.post(`/support/tickets/${ticketId}/resolve`, {
        resolution: resolutionText
      })
      toast.success('Ticket marked as resolved')
      setResolvingId(null)
      setResolutionText('')
      fetchTickets()
    } catch (error) {
      toast.error('Failed to resolve ticket')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            Support & Ticketing
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage customer and driver complaints
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tickets..."
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
            <LifeBuoy className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Open Tickets</p>
          <p className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-1">
            {tickets.filter(t => t.status === 'open').length}
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Resolved Today</p>
          <p className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-1">
            {tickets.filter(t => t.status !== 'open').length}
          </p>
        </motion.div>
      </div>

      {/* Ticket List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No support tickets found.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {tickets.map(ticket => (
              <div key={ticket.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                        {ticket.subject}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.status === 'open' 
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                      }`}>
                        {ticket.status.toUpperCase()}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 uppercase">
                        {ticket.complaint_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      {dayjs(ticket.created_at).format('MMM D, YYYY h:mm A')}
                      <span className="px-1">•</span>
                      User: <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{ticket.user_id.split('-')[0]}</span>
                    </p>
                  </div>
                  
                  {ticket.status === 'open' && resolvingId !== ticket.id && (
                    <button 
                      onClick={() => setResolvingId(ticket.id)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
                
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {ticket.description}
                  </p>
                </div>
                
                {ticket.status !== 'open' && ticket.resolution && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl">
                    <p className="text-xs font-semibold text-green-800 dark:text-green-400 uppercase tracking-wider mb-1">Resolution Notes</p>
                    <p className="text-sm text-green-900 dark:text-green-300">{ticket.resolution}</p>
                  </div>
                )}
                
                {resolvingId === ticket.id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-4 border border-primary-200 dark:border-primary-900/50 rounded-xl bg-primary-50/50 dark:bg-primary-900/10"
                  >
                    <textarea 
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      placeholder="Enter resolution notes or actions taken..."
                      className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm mb-3 focus:ring-2 focus:ring-primary-500"
                      rows={3}
                    />
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setResolvingId(null)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleResolve(ticket.id)}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Mark as Resolved
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
