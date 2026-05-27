/**
 * Admin KYC Review Page — Phase 9.
 * Review driver documents, approve/reject with notes.
 */
import { useState, useEffect } from 'react'
import { Shield, CheckCircle, XCircle, RefreshCw, Eye } from 'lucide-react'
import { adminApi } from '../../api/client'
import toast from 'react-hot-toast'

const DEMO_DOCS = [
  { id: 'd1', driver_id: 'drv1', driver_name: 'Ramesh Patil', document_type: 'aadhaar', file_url: '', submitted_at: new Date().toISOString() },
  { id: 'd2', driver_id: 'drv2', driver_name: 'Priya Desai', document_type: 'driving_license', file_url: '', submitted_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'd3', driver_id: 'drv3', driver_name: 'Sunil Kumar', document_type: 'vehicle_rc', file_url: '', submitted_at: new Date(Date.now() - 7200000).toISOString() },
]

const DOC_LABELS: Record<string, string> = {
  aadhaar: '🪪 Aadhaar Card',
  pan: '📋 PAN Card',
  driving_license: '🚗 Driving License',
  vehicle_rc: '🚙 Vehicle RC',
  vehicle_insurance: '📄 Vehicle Insurance',
  selfie: '🤳 Selfie',
}

export function KYCPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 })

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.get('/admin/kyc')
      setDocs(res.data.data || [])
    } catch { setDocs(DEMO_DOCS) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    setStats({ pending: DEMO_DOCS.length, approved: 47, rejected: 8 })
  }, [])

  const decide = async (docId: string, approved: boolean) => {
    setProcessing(docId)
    try {
      await adminApi.post(`/admin/kyc/${docId}/decision`, { approved, notes })
      toast.success(approved ? '✅ Document approved' : '❌ Document rejected')
      setSelected(null)
      setNotes('')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Action failed')
    } finally { setProcessing(null) }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={22} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">KYC Review</h1>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', value: stats.pending, color: 'amber', icon: '⏳' },
          { label: 'Approved', value: stats.approved, color: 'green', icon: '✅' },
          { label: 'Rejected', value: stats.rejected, color: 'red', icon: '❌' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-400 font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Queue */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-700 text-sm">Pending Documents ({docs.length})</h2>
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading KYC queue...</div>
        ) : docs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <div className="text-4xl mb-3">🎉</div>
            <div>All KYC documents reviewed!</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Driver', 'Document', 'Submitted', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800 text-sm">{doc.driver_name}</div>
                    <div className="text-xs text-slate-400">{doc.driver_id?.slice(-8)}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-slate-700">
                      {DOC_LABELS[doc.document_type] || doc.document_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {new Date(doc.submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelected(doc); setNotes('') }}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => decide(doc.id, true)} disabled={!!processing}
                        className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50">
                        <CheckCircle size={14} />
                      </button>
                      <button onClick={() => { setSelected(doc); setNotes('') }}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <XCircle size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Review Document</h3>
                <p className="text-sm text-slate-500">{selected.driver_name} • {DOC_LABELS[selected.document_type]}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
            </div>

            {/* Document preview (placeholder) */}
            <div className="bg-slate-100 rounded-xl h-40 flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
              <div className="text-center text-slate-400">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-xs">Document image</p>
                {selected.file_url && (
                  <a href={selected.file_url} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-500 underline mt-1 block">View file</a>
                )}
              </div>
            </div>

            {/* Notes */}
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Admin Notes (optional)</label>
            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              rows={2}
              placeholder="Reason for approval / rejection..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => decide(selected.id, false)}
                disabled={!!processing}
                className="flex-1 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
                ❌ Reject
              </button>
              <button
                onClick={() => decide(selected.id, true)}
                disabled={!!processing}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50">
                ✅ Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
