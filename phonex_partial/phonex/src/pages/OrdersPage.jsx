import { useQuery } from '@tanstack/react-query'
import { Link, useParams, Navigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { formatPriceUSD } from '../lib/utils.js'

export function OrdersPage() {
  const { user } = useAuth()
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api.orders(),
    enabled: !!user,
  })

  if (!user) return <Navigate to="/login" state={{ from: '/orders' }} replace />

  return (
    <main className="flex-1 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <h1 className="text-4xl font-serif-display">Your orders</h1>
        {isLoading ? (
          <div className="mt-10 h-40 rounded-3xl bg-muted-custom animate-pulse" />
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-3xl border bg-white p-10 text-center" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-sm text-muted-foreground">You haven't placed any orders yet.</p>
            <Link to="/category" className="mt-6 inline-block btn-secondary">Browse products</Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {orders.map((o) => (
              <li
                key={o._id}
                className="rounded-3xl border bg-white p-6"
                style={{ borderColor: 'hsl(var(--border))' }}
              >
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Order #{o._id.slice(-6)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString()} · {o.items.length} item{o.items.length !== 1 && 's'}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                  <div className="text-right">
                    <p className="font-semibold gold-text">{formatPriceUSD(o.total)}</p>
                    <Link to={`/orders/${o._id}`} className="mt-2 inline-block text-xs uppercase tracking-[0.2em] underline">
                      Details
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

export function OrderDetailPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.order(id),
    enabled: !!user && !!id,
  })

  if (!user) return <Navigate to="/login" replace />
  if (isLoading) return <main className="flex-1 py-16"><div className="max-w-3xl mx-auto px-6"><div className="h-40 rounded-3xl bg-muted-custom animate-pulse" /></div></main>
  if (!order) return <main className="flex-1 py-16"><div className="max-w-3xl mx-auto px-6"><p>Order not found.</p></div></main>

  return (
    <main className="flex-1 py-16">
      <div className="max-w-3xl mx-auto px-6">
        <Link to="/orders" className="text-xs uppercase tracking-[0.2em] text-muted-foreground">← All orders</Link>
        <h1 className="mt-4 text-4xl font-serif-display">Order #{order._id.slice(-6)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        <div className="mt-4"><StatusBadge status={order.status} /></div>

        <section className="mt-10 rounded-3xl border bg-white p-8" style={{ borderColor: 'hsl(var(--border))' }}>
          <h2 className="text-xl font-serif-display">Items</h2>
          <ul className="mt-6 space-y-4">
            {order.items.map((it, idx) => (
              <li key={idx} className="flex justify-between text-sm">
                <span>{it.name} × {it.quantity}</span>
                <span>{formatPriceUSD(it.unit_price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="divider my-5" />
          <Row label="Subtotal" value={formatPriceUSD(order.subtotal)} />
          {order.discount > 0 && <Row label={`Discount (${order.couponCode})`} value={`- ${formatPriceUSD(order.discount)}`} />}
          <Row label="Total" value={formatPriceUSD(order.total)} bold />
        </section>

        <section className="mt-6 rounded-3xl border bg-white p-8" style={{ borderColor: 'hsl(var(--border))' }}>
          <h2 className="text-xl font-serif-display">Shipping to</h2>
          <address className="mt-4 text-sm not-italic text-muted-foreground leading-relaxed">
            {order.shipping_address?.line1}<br />
            {order.shipping_address?.line2 && <>{order.shipping_address.line2}<br /></>}
            {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postalCode}<br />
            {order.shipping_address?.country}
          </address>
        </section>
      </div>
    </main>
  )
}

function StatusBadge({ status }) {
  const colors = {
    pending: 'bg-cream text-foreground',
    paid: 'bg-soft-blue text-foreground',
    shipped: 'bg-soft-blue text-foreground',
    delivered: 'bg-greige text-foreground',
    cancelled: 'bg-muted-custom text-foreground',
  }
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] ${colors[status] || ''}`}>
      {status}
    </span>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between text-sm mt-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-semibold' : ''}>{value}</span>
    </div>
  )
}
