/**
 * Payment Page — Customer Web (Phase 6)
 * Loads Razorpay checkout, handles success/failure, shows post-payment state.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { Shield, Tag, Wallet, ChevronRight, CheckCircle, XCircle } from 'lucide-react'
import { api, bookingApi } from '../../api/client'
import { useAuthStore } from '../../store/auth.store'
import toast from 'react-hot-toast'

declare global {
  interface Window { Razorpay: any }
}

type PayState = 'loading' | 'ready' | 'processing' | 'success' | 'failed'

export function PaymentPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [booking, setBooking] = useState<any>(null)
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [useWallet, setUseWallet] = useState(false)
  const [payState, setPayState] = useState<PayState>('loading')

  // Load booking + wallet
  useEffect(() => {
    if (!bookingId) return
    Promise.all([
      bookingApi.getTrip(bookingId),
      api.get('/wallet'),
    ]).then(([bRes, wRes]) => {
      setBooking(bRes.data.data)
      setWalletBalance(wRes.data.data?.balance || 0)
      setPayState('ready')
    }).catch(() => {
      // Demo
      setBooking({ id: bookingId, total_fare: 980, seat_count: 2, trip: { pickup_city: 'Pune', destination_city: 'Mumbai' } })
      setWalletBalance(250)
      setPayState('ready')
    })

    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [bookingId])

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return
    setValidatingCoupon(true)
    try {
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim().toUpperCase(),
        booking_amount: booking?.total_fare,
      })
      const data = res.data.data
      setDiscount(data.discount_amount)
      toast.success(`✅ Coupon applied! Save ₹${data.discount_amount}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Invalid coupon')
      setDiscount(0)
    } finally { setValidatingCoupon(false) }
  }

  const handlePay = async () => {
    if (!booking) return
    setPayState('processing')

    const walletDeduction = useWallet ? Math.min(walletBalance, finalAmount) : 0
    const razorpayAmount = Math.max(finalAmount - walletDeduction, 0)

    try {
      // If fully paid by wallet
      if (razorpayAmount === 0) {
        await api.post(`/payments/wallet-pay`, { booking_id: bookingId, amount: finalAmount })
        setPayState('success')
        return
      }

      // Create Razorpay order
      const orderRes = await api.post('/payments/create-order', {
        booking_id: bookingId,
        amount: razorpayAmount,
      })
      const order = orderRes.data.data

      const options = {
        key: order.key_id,
        amount: order.amount_paise,
        currency: 'INR',
        name: 'CabBooking',
        description: `${booking.trip?.pickup_city} → ${booking.trip?.destination_city}`,
        order_id: order.order_id,
        prefill: {
          name: user?.phone || '',
          contact: user?.phone || '',
        },
        theme: { color: '#2563EB' },
        modal: { ondismiss: () => setPayState('ready') },
        handler: async (response: any) => {
          try {
            // Capture payment on backend
            await api.post('/payments/capture', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            setPayState('success')
          } catch {
            setPayState('failed')
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
      rzp.on('payment.failed', () => setPayState('failed'))
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Payment initiation failed')
      setPayState('ready')
    }
  }

  const totalFare = booking?.total_fare || 0
  const finalAmount = Math.max(totalFare - discount, 0)
  const walletUsed = useWallet ? Math.min(walletBalance, finalAmount) : 0
  const razorpayDue = Math.max(finalAmount - walletUsed, 0)

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-md mx-auto px-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">Complete Payment</h1>

        <AnimatePresence mode="wait">
          {/* SUCCESS */}
          {payState === 'success' && (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="card p-10 text-center">
              <motion.div animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.5 }}>
                <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">Payment Done! 🎉</h2>
              <p className="text-slate-500 mb-6">Your booking is confirmed.</p>
              <button onClick={() => navigate('/trips')} className="btn-primary w-full py-3 rounded-xl">
                View My Trips →
              </button>
            </motion.div>
          )}

          {/* FAILED */}
          {payState === 'failed' && (
            <motion.div key="failed"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="card p-10 text-center">
              <XCircle size={64} className="text-red-500 mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-slate-900 mb-2">Payment Failed</h2>
              <p className="text-slate-500 mb-6">Please try again.</p>
              <button onClick={() => setPayState('ready')} className="btn-primary w-full py-3 rounded-xl">
                Try Again
              </button>
            </motion.div>
          )}

          {/* PAYMENT FORM */}
          {(payState === 'ready' || payState === 'processing' || payState === 'loading') && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

              {/* Booking Summary */}
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 mb-3 text-sm">Booking Summary</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600 text-sm">
                    {booking?.trip?.pickup_city || '...'} → {booking?.trip?.destination_city || '...'}
                  </span>
                  <span className="font-semibold text-slate-900">₹{totalFare}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>💺 {booking?.seat_count || 1} seat(s)</span>
                  <span>Booking #{bookingId?.slice(-8)}</span>
                </div>
              </div>

              {/* Coupon */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={16} className="text-blue-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Coupon Code</h3>
                </div>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm uppercase"
                    placeholder="Enter code (e.g. FIRST100)"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    disabled={discount > 0}
                  />
                  <button
                    onClick={discount > 0 ? () => { setDiscount(0); setCouponCode('') } : handleValidateCoupon}
                    disabled={validatingCoupon}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      discount > 0
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {validatingCoupon ? '...' : discount > 0 ? 'Remove' : 'Apply'}
                  </button>
                </div>
                {discount > 0 && (
                  <p className="text-green-600 text-xs mt-2 font-semibold">✅ -₹{discount} saved!</p>
                )}
              </div>

              {/* Wallet */}
              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-green-500" />
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">Use Wallet</div>
                      <div className="text-xs text-slate-400">Balance: ₹{walletBalance.toFixed(2)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseWallet(v => !v)}
                    className={`w-11 h-6 rounded-full transition-all ${useWallet ? 'bg-green-500' : 'bg-slate-200'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${useWallet ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                {useWallet && walletBalance > 0 && (
                  <p className="text-green-600 text-xs mt-2 font-semibold">✅ ₹{Math.min(walletBalance, finalAmount).toFixed(2)} will be deducted from wallet</p>
                )}
              </div>

              {/* Bill Summary */}
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800 text-sm mb-3">Bill Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Booking fare</span><span>₹{totalFare}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon discount</span><span>-₹{discount}</span>
                    </div>
                  )}
                  {useWallet && walletUsed > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Wallet</span><span>-₹{walletUsed.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2 mt-2 text-base">
                    <span>Pay via Razorpay</span>
                    <span>₹{razorpayDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
                <Shield size={13} /> 256-bit SSL encrypted • Powered by Razorpay
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePay}
                disabled={payState === 'processing' || payState === 'loading'}
                className="btn-primary w-full py-4 rounded-2xl text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {payState === 'processing' ? (
                  <><div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Processing...</>
                ) : (
                  <>Pay ₹{razorpayDue > 0 ? razorpayDue.toFixed(0) : '0'} <ChevronRight size={18} /></>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
