import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useCart } from '../hooks/useCart.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { api } from '../lib/api.js'
import { formatPriceUSD } from '../lib/utils.js'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export default function CheckoutPage() {
  const { user } = useAuth()
  const { data: cart = [] } = useCart()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '', // 6-digit Indian pincode
    country: 'India',
    phone: '', // +91 ##### #####
  })
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [placing, setPlacing] = useState(false)

  if (!user) return <Navigate to="/login" state={{ from: '/checkout' }} replace />
  if (cart.length === 0) return <Navigate to="/cart" replace />

  const subtotal = cart.reduce((sum, it) => sum + (it.products?.price || 0) * it.quantity, 0)
  const discount = coupon?.discount || 0
  const total = Math.max(0, subtotal - discount)

  async function applyCoupon() {
    try {
      const res = await api.validateCoupon(couponInput)
      setCoupon(res)
      toast.success(`Coupon ${res.code} applied`)
    } catch (err) {
      setCoupon(null)
      toast.error(err.message)
    }
  }

  async function placeOrder(e) {
    e.preventDefault()
    setPlacing(true)
    try {
      const order = await api.createOrder({
        shipping_address: address,
        couponCode: coupon?.code,
        payment_method: paymentMethod,
      })
      qc.invalidateQueries({ queryKey: ['cart', user?.id] })
      // Both card and UPI route through the fake payment gateway;
      // COD is done as soon as the order is placed.
      if (paymentMethod === 'card' || paymentMethod === 'upi') {
        navigate(`/payment/${order._id}`)
      } else {
        toast.success('Order placed!')
        navigate(`/orders/${order._id}`)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPlacing(false)
    }
  }

  return (
    <main className="flex-1 py-16">
      <div className="max-w-7xl mx-auto px-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={placeOrder} className="space-y-8" noValidate>
          <h1 className="text-4xl font-serif-display">Checkout</h1>

          <section className="rounded-3xl border bg-white p-8" style={{ borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-xl font-serif-display">Shipping address</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Address line 1" value={address.line1} onChange={(v) => setAddress({ ...address, line1: v })} required />
              <Field label="Address line 2" value={address.line2} onChange={(v) => setAddress({ ...address, line2: v })} />
              <Field label="City" value={address.city} onChange={(v) => setAddress({ ...address, city: v })} required />
              <StateSelect
                value={address.state}
                onChange={(v) => setAddress({ ...address, state: v })}
              />
              <Field
                label="Pincode"
                value={address.postalCode}
                onChange={(v) => setAddress({ ...address, postalCode: v.replace(/\D/g, '').slice(0, 6) })}
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
              />
              <Field label="Country" value={address.country} readOnly />
              <Field
                label="Phone"
                value={address.phone}
                onChange={(v) => setAddress({ ...address, phone: v })}
                placeholder="+91 98765 43210"
                inputMode="tel"
              />
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-8" style={{ borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-xl font-serif-display">Payment method</h2>
            <div className="mt-6 space-y-3">
              <Radio name="pay" value="upi" current={paymentMethod} onChange={setPaymentMethod}>
                UPI — PhonePe / GPay / Paytm
              </Radio>
              <Radio name="pay" value="card" current={paymentMethod} onChange={setPaymentMethod}>
                Credit / Debit card
              </Radio>
              <Radio name="pay" value="cod" current={paymentMethod} onChange={setPaymentMethod}>
                Cash on delivery
              </Radio>
            </div>
          </section>

          <button type="submit" disabled={placing} className="btn-primary w-full">
            {placing ? 'Placing order…' : `Place order — ${formatPriceUSD(total)}`}
          </button>
        </form>

        <aside className="h-fit rounded-3xl border bg-white p-8 sticky top-24" style={{ borderColor: 'hsl(var(--border))' }}>
          <h2 className="text-xl font-serif-display">Order summary</h2>
          <ul className="mt-6 space-y-3 text-sm">
            {cart.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span className="text-muted-foreground">{it.products?.name} × {it.quantity}</span>
                <span>{formatPriceUSD((it.products?.price || 0) * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="divider my-5" />

          <div className="space-y-3 text-sm">
            <Row label="Subtotal" value={formatPriceUSD(subtotal)} />
            {discount > 0 && <Row label={`Discount (${coupon?.code})`} value={`- ${formatPriceUSD(discount)}`} />}
            <Row label="Total" value={formatPriceUSD(total)} bold />
          </div>

          <div className="mt-6 flex gap-2">
            <input
              aria-label="Coupon code"
              placeholder="Coupon code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              className="flex-1 rounded-xl border bg-white px-3 py-2 text-sm"
              style={{ borderColor: 'hsl(var(--border))' }}
            />
            <button type="button" onClick={applyCoupon} className="btn-secondary text-xs">
              Apply
            </button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Try <code>WELCOME10</code>, <code>PHONEX20</code>, or <code>FLAT500</code>
          </p>
        </aside>
      </div>
    </main>
  )
}

function Field({ label, value, onChange, required, readOnly, ...rest }) {
  return (
    <label className="text-xs uppercase tracking-[0.2em] block">
      {label}
      <input
        value={value}
        required={required}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm normal-case tracking-normal ${
          readOnly ? 'bg-cream text-muted-foreground cursor-not-allowed' : 'bg-white'
        }`}
        style={{ borderColor: 'hsl(var(--border))' }}
        {...rest}
      />
    </label>
  )
}

// Indian states + UTs — used by the shipping address dropdown.
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]

function StateSelect({ value, onChange }) {
  return (
    <label className="text-xs uppercase tracking-[0.2em] block">
      State
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm normal-case tracking-normal"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <option value="">Select a state…</option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  )
}

function Radio({ name, value, current, onChange, children }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={current === value}
        onChange={() => onChange(value)}
      />
      <span className="text-sm">{children}</span>
    </label>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  )
}
