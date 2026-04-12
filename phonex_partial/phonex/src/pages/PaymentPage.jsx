import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Lock, CheckCircle2, XCircle, Loader2, Smartphone } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { formatPriceUSD } from '../lib/utils.js'
import { toast } from 'sonner'

// Steps: details → otp → processing → success | failed
export default function PaymentPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.order(id),
    enabled: !!user && !!id,
  })

  const [step, setStep] = useState('details')
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [upiId, setUpiId] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')

  // Which payment flow to render — driven by the method stored on the order
  // (set at checkout). Fallback to 'card' if the field is missing.
  const method = order?.payment?.method === 'upi' ? 'upi' : 'card'

  if (!user) return <Navigate to="/login" replace />
  if (isLoading || !order) {
    return (
      <main className="flex-1 py-20">
        <div className="max-w-xl mx-auto px-6">
          <div className="h-60 rounded-3xl bg-muted-custom animate-pulse" />
        </div>
      </main>
    )
  }

  if (order.status !== 'pending') {
    return (
      <main className="flex-1 py-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-serif-display">This order is already {order.status}</h1>
          <button onClick={() => navigate(`/orders/${order._id}`)} className="mt-8 btn-primary">
            View order
          </button>
        </div>
      </main>
    )
  }

  function formatCardNumber(v) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }
  function formatExpiry(v) {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    if (digits.length < 3) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  function submitDetails(e) {
    e.preventDefault()
    setError('')
    const digits = card.number.replace(/\s/g, '')
    if (digits.length !== 16) return setError('Enter a valid 16-digit card number')
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) return setError('Expiry must be MM/YY')
    if (!/^\d{3}$/.test(card.cvv)) return setError('CVV must be 3 digits')
    if (!card.name.trim()) return setError('Cardholder name required')
    setStep('otp')
  }

  // Very light UPI VPA validation — handle@bank
  function submitUpi(e) {
    e.preventDefault()
    setError('')
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) {
      return setError('Enter a valid UPI ID, e.g. name@okicici')
    }
    setStep('otp')
  }

  async function submitOtp(e) {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit OTP')

    setStep('processing')
    // Simulate gateway latency
    await new Promise((r) => setTimeout(r, 2200))

    // 90% success rate for realism. OTP "000000" always fails.
    const willFail = otp === '000000' || Math.random() < 0.1
    if (willFail) {
      setStep('failed')
      return
    }

    try {
      const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 9999)}`
      await api.confirmPayment(order._id, reference)
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['cart', user?.id] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      setStep('success')
      setTimeout(() => navigate(`/orders/${order._id}`), 1800)
    } catch (err) {
      setError(err.message)
      setStep('failed')
    }
  }

  return (
    <main className="flex-1 py-16">
      <div className="max-w-2xl mx-auto px-6">
        {/* Gateway "frame" — imitates a hosted payment page */}
        <div className="rounded-3xl border bg-white overflow-hidden shadow-sm" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between px-8 py-5 border-b bg-cream" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center gap-3">
              <Lock size={16} />
              <span className="text-xs uppercase tracking-[0.2em]">Secure checkout · phonex pay</span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {formatPriceUSD(order.total)}
            </span>
          </div>

          <div className="px-8 py-10">
            <StepIndicator step={step} />

            {step === 'details' && method === 'upi' && (
              <form onSubmit={submitUpi} className="space-y-5" noValidate>
                <h2 className="text-2xl font-serif-display">Pay by UPI</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your UPI ID. You'll be asked to approve the payment on your
                  UPI app (PhonePe, Google Pay, Paytm, BHIM, etc.). This is a{' '}
                  <strong>simulated</strong> gateway — no real money is moved.
                </p>

                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em]" htmlFor="upi">
                    UPI ID
                  </label>
                  <div className="mt-2 relative">
                    <input
                      id="upi"
                      placeholder="yourname@okicici"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full rounded-xl border bg-white px-4 py-3 pl-11 text-sm"
                      style={{ borderColor: 'hsl(var(--border))' }}
                      autoComplete="off"
                      spellCheck="false"
                    />
                    <Smartphone
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['phonepe', 'okhdfcbank', 'okaxis', 'paytm', 'ybl'].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() =>
                        setUpiId((prev) => {
                          const handle = prev.split('@')[0] || 'demo'
                          return `${handle}@${h}`
                        })
                      }
                      className="rounded-full border px-3 py-1 text-[11px] hover:bg-cream"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      @{h}
                    </button>
                  ))}
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button type="submit" className="btn-primary w-full">
                  Request payment of {formatPriceUSD(order.total)}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/orders/${order._id}`)}
                  className="text-xs uppercase tracking-[0.2em] text-muted-foreground w-full text-center block"
                >
                  Cancel and return to order
                </button>
              </form>
            )}

            {step === 'details' && method === 'card' && (
              <form onSubmit={submitDetails} className="space-y-5" noValidate>
                <h2 className="text-2xl font-serif-display">Card details</h2>
                <p className="text-sm text-muted-foreground">
                  This is a <strong>simulated</strong> gateway. No real card will be charged — feel free to use any test number.
                </p>

                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em]" htmlFor="ccn">Card number</label>
                  <div className="mt-2 relative">
                    <input
                      id="ccn"
                      inputMode="numeric"
                      placeholder="4242 4242 4242 4242"
                      value={card.number}
                      onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                      className="w-full rounded-xl border bg-white px-4 py-3 pl-11 text-sm tracking-wider"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    />
                    <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em]" htmlFor="ccname">Cardholder name</label>
                  <input
                    id="ccname"
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em]" htmlFor="ccexp">Expiry</label>
                    <input
                      id="ccexp"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={card.expiry}
                      onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                      className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.2em]" htmlFor="cccvv">CVV</label>
                    <input
                      id="cccvv"
                      inputMode="numeric"
                      placeholder="123"
                      maxLength={3}
                      value={card.cvv}
                      onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button type="submit" className="btn-primary w-full">
                  Pay {formatPriceUSD(order.total)}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/orders/${order._id}`)}
                  className="text-xs uppercase tracking-[0.2em] text-muted-foreground w-full text-center block"
                >
                  Cancel and return to order
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={submitOtp} className="space-y-5" noValidate>
                <h2 className="text-2xl font-serif-display">
                  {method === 'upi' ? 'Approve on your UPI app' : 'One-time password'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {method === 'upi'
                    ? 'A collect request has been "sent" to ' + (upiId || 'your UPI ID') + '. Enter the 6-digit MPIN your UPI app shows (use any digits; ' + '000000 simulates a failure).'
                    : 'A 6-digit OTP was "sent" to your registered mobile. Enter any 6 digits to continue (use 000000 to simulate a failure).'}
                </p>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl border bg-white px-4 py-4 text-center text-2xl tracking-[0.5em]"
                  style={{ borderColor: 'hsl(var(--border))' }}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" className="btn-primary w-full">
                  Confirm payment
                </button>
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-xs uppercase tracking-[0.2em] text-muted-foreground w-full text-center block"
                >
                  ← Back
                </button>
              </form>
            )}

            {step === 'processing' && (
              <div className="py-10 text-center">
                <Loader2 size={48} className="mx-auto animate-spin gold-text" />
                <h2 className="mt-6 text-2xl font-serif-display">Processing payment…</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Please do not refresh or close this window.
                </p>
              </div>
            )}

            {step === 'success' && (
              <div className="py-10 text-center">
                <CheckCircle2 size={56} className="mx-auto text-green-600" />
                <h2 className="mt-6 text-2xl font-serif-display">Payment successful</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Your order is confirmed. Items have been removed from your cart. Redirecting…
                </p>
              </div>
            )}

            {step === 'failed' && (
              <div className="py-10 text-center">
                <XCircle size={56} className="mx-auto text-red-600" />
                <h2 className="mt-6 text-2xl font-serif-display">Payment failed</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {error || 'The transaction was declined. No amount has been charged.'}
                </p>
                <div className="mt-6 flex gap-3 justify-center">
                  <button onClick={() => { setStep('details'); setOtp(''); setError('') }} className="btn-primary">
                    Retry
                  </button>
                  <button onClick={() => navigate(`/orders/${order._id}`)} className="btn-secondary">
                    Back to order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function StepIndicator({ step }) {
  const steps = [
    { key: 'details', label: 'Card' },
    { key: 'otp', label: 'OTP' },
    { key: 'processing', label: 'Processing' },
    { key: 'success', label: 'Done' },
  ]
  const active = steps.findIndex((s) => s.key === step)
  const shownIndex = step === 'failed' ? 1 : active
  return (
    <ol className="flex items-center gap-2 mb-8" aria-label="Payment progress">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2 flex-1">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-medium ${
              i <= shownIndex ? 'gold-bg text-white' : 'bg-muted-custom text-muted-foreground'
            }`}
          >
            {i + 1}
          </div>
          <span className={`text-[10px] uppercase tracking-[0.2em] ${i <= shownIndex ? '' : 'text-muted-foreground'}`}>
            {s.label}
          </span>
          {i < steps.length - 1 && <div className="flex-1 h-px bg-muted-custom" />}
        </li>
      ))}
    </ol>
  )
}
