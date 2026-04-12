import { useState, useMemo, Fragment } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  LayoutDashboard, Package, ShoppingBag, CreditCard,
  Users, Tag, Ticket, Plus, Pencil, Trash2, Search,
  AlertTriangle, TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../lib/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { formatPrice, getProductImage } from '../lib/utils.js'
import { LineChart, DonutChart, BarChart } from '../components/admin/Charts.jsx'
import ProductFormModal from '../components/admin/ProductFormModal.jsx'

/**
 * AdminPage — full-featured admin console with:
 *   - Dashboard (KPI cards, revenue chart, order status donut, top products)
 *   - Products CRUD (add / edit / delete)
 *   - Orders management (status updates, expand for items)
 *   - Payments tracking (method + reference)
 *   - Users (role promotion)
 *   - Categories CRUD
 *   - Coupons CRUD
 *
 * Layout: left sidebar navigation + right content area.
 */
export default function AdminPage() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState('dashboard')

  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: '/admin' }} replace />
  if (user.role !== 'admin') {
    return (
      <main className="flex-1 py-20">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-serif-display">Admin access required</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            You must be signed in as an administrator to view this page.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 py-10">
      <div className="max-w-7xl mx-auto px-6 grid gap-8 md:grid-cols-[220px_1fr]">
        <AdminSidebar tab={tab} setTab={setTab} />
        <div className="min-w-0">
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'products' && <ProductsPanel />}
          {tab === 'orders' && <OrdersPanel />}
          {tab === 'payments' && <PaymentsPanel />}
          {tab === 'users' && <UsersPanel />}
          {tab === 'categories' && <CategoriesPanel />}
          {tab === 'coupons' && <CouponsPanel />}
        </div>
      </div>
    </main>
  )
}

/* ─────────────────────────────────────────────────────────
 *  Sidebar
 * ──────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'orders', label: 'Orders', icon: ShoppingBag },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'categories', label: 'Categories', icon: Tag },
  { key: 'coupons', label: 'Coupons', icon: Ticket },
]

function AdminSidebar({ tab, setTab }) {
  return (
    <aside className="md:sticky md:top-24 self-start">
      <h1 className="text-2xl font-serif-display mb-6">Admin</h1>
      <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-colors shrink-0 ${
              tab === key ? 'bg-cream font-medium' : 'hover:bg-cream/50 text-muted-foreground'
            }`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

/* ─────────────────────────────────────────────────────────
 *  Dashboard
 * ──────────────────────────────────────────────────────── */
function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.adminStats(),
  })

  if (isLoading || !data) {
    return <div className="h-80 rounded-3xl bg-muted-custom animate-pulse" />
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-serif-display">Dashboard</h2>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue" value={formatPrice(data.revenue)} accent="gold-text" />
        <KpiCard label="Orders" value={data.orders} />
        <KpiCard label="Products" value={data.products} />
        <KpiCard label="Users" value={data.users} />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Revenue (last 30 days)" icon={TrendingUp}>
          <div className="h-56">
            <LineChart data={data.revenueTimeseries || []} />
          </div>
        </Card>
        <Card title="Order status">
          <DonutChart data={data.statusBreakdown || {}} />
        </Card>
      </div>

      {/* Top + Low stock row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top selling">
          <BarChart data={data.topProducts || []} />
        </Card>
        <Card title="Low stock alert" icon={AlertTriangle}>
          {(!data.lowStock || data.lowStock.length === 0) ? (
            <p className="text-xs text-muted-foreground">All products are stocked comfortably.</p>
          ) : (
            <ul className="space-y-3">
              {data.lowStock.map((p) => (
                <li key={p._id} className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream shrink-0">
                    <img src={getProductImage(p)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.stock} left · {formatPrice(p.price)}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-cream'}`}>
                    {p.stock === 0 ? 'OUT' : 'LOW'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent orders */}
      <Card title="Recent orders">
        {(!data.recentOrders || data.recentOrders.length === 0) ? (
          <p className="text-xs text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Order</th>
                  <th className="text-left">User</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((o) => (
                  <tr key={o._id} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                    <td className="py-2">#{o._id.slice(-6)}</td>
                    <td>{o.user?.email || '—'}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td className="text-right">{formatPrice(o.total)}</td>
                    <td className="text-right text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function KpiCard({ label, value, accent }) {
  return (
    <div className="rounded-3xl border bg-white p-6" style={{ borderColor: 'hsl(var(--border))' }}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={`mt-3 text-3xl font-serif-display ${accent || ''}`}>{value}</p>
    </div>
  )
}

function Card({ title, icon: Icon, children }) {
  return (
    <section className="rounded-3xl border bg-white p-6" style={{ borderColor: 'hsl(var(--border))' }}>
      <header className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={14} className="text-muted-foreground" />}
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</h3>
      </header>
      {children}
    </section>
  )
}

function StatusPill({ status }) {
  const colors = {
    pending: 'bg-cream',
    paid: 'bg-soft-blue',
    shipped: 'bg-soft-blue',
    delivered: 'bg-greige',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.15em] ${colors[status] || ''}`}>
      {status}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────
 *  Products panel
 * ──────────────────────────────────────────────────────── */
function ProductsPanel() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(undefined) // undefined = closed, null = create, object = edit

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api.products({}),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories(),
  })

  const del = useMutation({
    mutationFn: (id) => api.adminDeleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted')
    },
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    )
  }, [products, search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-3xl font-serif-display">Products</h2>
        <button onClick={() => setEditing(null)} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> New product
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full rounded-xl border bg-white pl-11 pr-4 py-2.5 text-sm"
          style={{ borderColor: 'hsl(var(--border))' }}
        />
      </div>

      {/* Table */}
      <div className="rounded-3xl border bg-white overflow-x-auto" style={{ borderColor: 'hsl(var(--border))' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <th className="p-4">Product</th>
              <th>Category</th>
              <th className="text-right">Price</th>
              <th className="text-right">Stock</th>
              <th className="text-center">Featured</th>
              <th className="text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-cream shrink-0">
                      <img src={getProductImage(p)} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="text-xs text-muted-foreground">{p.categories?.name}</td>
                <td className="text-right">{formatPrice(p.price)}</td>
                <td className={`text-right ${p.stock <= 10 ? 'text-red-600 font-medium' : ''}`}>{p.stock}</td>
                <td className="text-center">{p.featured ? '★' : '—'}</td>
                <td className="pr-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditing(p)}
                      className="p-2 rounded-lg hover:bg-cream"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${p.name}"?`)) del.mutate(p.id)
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">No products found.</p>
        )}
      </div>

      {editing !== undefined && (
        <ProductFormModal
          product={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
 *  Orders panel (expandable rows)
 * ──────────────────────────────────────────────────────── */
function OrdersPanel() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded] = useState(null)

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: () => api.adminOrders({ status: statusFilter || undefined }),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.adminUpdateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Status updated')
    },
  })

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-serif-display">Orders</h2>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-xl border bg-white px-4 py-2 text-sm"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <option value="">All statuses</option>
        {['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="rounded-3xl border bg-white overflow-x-auto" style={{ borderColor: 'hsl(var(--border))' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <th className="p-4">Order</th>
              <th>Customer</th>
              <th>Payment</th>
              <th>Status</th>
              <th className="text-right pr-4">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <Fragment key={o._id}>
                <tr
                  onClick={() => setExpanded(expanded === o._id ? null : o._id)}
                  className="border-t cursor-pointer hover:bg-cream/30"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  <td className="p-4">
                    <p className="font-medium">#{o._id.slice(-6)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString('en-IN')}
                    </p>
                  </td>
                  <td className="text-xs">
                    {o.user?.fullName || o.user?.email || '—'}
                  </td>
                  <td className="text-xs capitalize">{o.payment?.method || 'cod'}</td>
                  <td>
                    <select
                      value={o.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateStatus.mutate({ id: o._id, status: e.target.value })}
                      className="rounded-lg border px-2 py-1 text-xs bg-white"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      {['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="text-right pr-4 font-medium">{formatPrice(o.total)}</td>
                </tr>
                {expanded === o._id && (
                  <tr className="border-t bg-cream/20" style={{ borderColor: 'hsl(var(--border))' }}>
                    <td colSpan={5} className="p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Items</h4>
                          <ul className="space-y-1 text-sm">
                            {o.items.map((it, i) => (
                              <li key={i} className="flex justify-between">
                                <span>{it.name} × {it.quantity}</span>
                                <span>{formatPrice(it.unit_price * it.quantity)}</span>
                              </li>
                            ))}
                          </ul>
                          {o.discount > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Discount ({o.couponCode}): − {formatPrice(o.discount)}
                            </p>
                          )}
                        </div>
                        <div>
                          <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Shipping</h4>
                          <address className="text-xs not-italic leading-relaxed text-muted-foreground">
                            {o.shipping_address?.line1}<br />
                            {o.shipping_address?.line2 && <>{o.shipping_address.line2}<br /></>}
                            {o.shipping_address?.city}, {o.shipping_address?.state} {o.shipping_address?.postalCode}<br />
                            {o.shipping_address?.country}<br />
                            {o.shipping_address?.phone}
                          </address>
                          {o.payment?.reference && (
                            <p className="mt-3 text-xs text-muted-foreground">
                              Payment ref: <code>{o.payment.reference}</code>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">No orders found.</p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
 *  Payments panel
 * ──────────────────────────────────────────────────────── */
function PaymentsPanel() {
  const [method, setMethod] = useState('')
  const { data: payments = [] } = useQuery({
    queryKey: ['admin-payments', method],
    queryFn: () => api.adminPayments({ method: method || undefined }),
  })

  // Quick totals for the header cards
  const totals = useMemo(() => {
    return payments.reduce(
      (acc, p) => {
        acc.total += p.amount
        if (p.status === 'paid' || p.status === 'shipped' || p.status === 'delivered') {
          acc.captured += p.amount
        } else if (p.status === 'pending') {
          acc.pending += p.amount
        }
        return acc
      },
      { total: 0, captured: 0, pending: 0 }
    )
  }, [payments])

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-serif-display">Payments</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Captured" value={formatPrice(totals.captured)} accent="gold-text" />
        <KpiCard label="Pending" value={formatPrice(totals.pending)} />
        <KpiCard label="Transactions" value={payments.length} />
      </div>

      <div className="flex gap-2">
        {['', 'upi', 'card', 'cod'].map((m) => (
          <button
            key={m || 'all'}
            onClick={() => setMethod(m)}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.15em] ${
              method === m ? 'bg-cream' : 'hover:bg-cream/50'
            }`}
            style={{ borderColor: 'hsl(var(--border))' }}
          >
            {m || 'all'}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border bg-white overflow-x-auto" style={{ borderColor: 'hsl(var(--border))' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <th className="p-4">Order</th>
              <th>Customer</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
              <th className="text-right pr-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <td className="p-4">#{String(p.orderId).slice(-6)}</td>
                <td className="text-xs">{p.user?.email || '—'}</td>
                <td className="text-xs uppercase">{p.method}</td>
                <td className="text-xs font-mono text-muted-foreground">{p.reference || '—'}</td>
                <td><StatusPill status={p.status} /></td>
                <td className="text-right pr-4 font-medium">{formatPrice(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">No payments found.</p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
 *  Users panel
 * ──────────────────────────────────────────────────────── */
function UsersPanel() {
  const qc = useQueryClient()
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.adminUsers(),
  })

  const updateRole = useMutation({
    mutationFn: ({ id, role }) => api.adminUpdateUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Role updated')
    },
  })

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-serif-display">Users</h2>

      <div className="rounded-3xl border bg-white overflow-x-auto" style={{ borderColor: 'hsl(var(--border))' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <th className="p-4">User</th>
              <th>Orders</th>
              <th>Total spent</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <td className="p-4">
                  <p className="font-medium">{u.fullName || u.email.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td>{u.orders}</td>
                <td>{formatPrice(u.spent)}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) => updateRole.mutate({ id: u.id, role: e.target.value })}
                    className="rounded-lg border px-2 py-1 text-xs bg-white"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
 *  Categories panel
 * ──────────────────────────────────────────────────────── */
function CategoriesPanel() {
  const qc = useQueryClient()
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api.adminCategories(),
  })
  const [form, setForm] = useState({ name: '', slug: '', description: '', sort_order: 0 })

  const create = useMutation({
    mutationFn: (body) => api.adminCreateCategory(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      setForm({ name: '', slug: '', description: '', sort_order: 0 })
      toast.success('Category created')
    },
  })
  const del = useMutation({
    mutationFn: (id) => api.adminDeleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Deleted')
    },
  })

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-serif-display">Categories</h2>

      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate(form)
          }}
          className="rounded-3xl border bg-white p-6 space-y-3"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          <h3 className="text-lg font-serif-display">New category</h3>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'hsl(var(--border))' }}
            required
          />
          <input
            placeholder="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'hsl(var(--border))' }}
            required
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'hsl(var(--border))' }}
          />
          <input
            type="number"
            placeholder="Sort order"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'hsl(var(--border))' }}
          />
          <button type="submit" className="btn-primary w-full">Create</button>
        </form>

        <div className="rounded-3xl border bg-white p-6" style={{ borderColor: 'hsl(var(--border))' }}>
          <h3 className="text-lg font-serif-display mb-4">Existing</h3>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c._id} className="flex items-center justify-between text-sm rounded-lg px-3 py-2 hover:bg-cream/50">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.slug}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${c.name}"?`)) del.mutate(c._id)
                  }}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
 *  Coupons panel
 * ──────────────────────────────────────────────────────── */
function CouponsPanel() {
  const qc = useQueryClient()
  const { data: coupons = [] } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api.adminCoupons(),
  })
  const [form, setForm] = useState({ code: '', type: 'percent', amount: 10, minSubtotal: 0 })

  const create = useMutation({
    mutationFn: (body) => api.adminCreateCoupon(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Coupon created')
      setForm({ code: '', type: 'percent', amount: 10, minSubtotal: 0 })
    },
  })
  const del = useMutation({
    mutationFn: (id) => api.adminDeleteCoupon(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-serif-display">Coupons</h2>

      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate(form)
          }}
          className="rounded-3xl border bg-white p-6 space-y-3"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          <h3 className="text-lg font-serif-display">New coupon</h3>
          <input
            placeholder="CODE"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'hsl(var(--border))' }}
            required
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'hsl(var(--border))' }}
          >
            <option value="percent">Percent</option>
            <option value="flat">Flat</option>
          </select>
          <input
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'hsl(var(--border))' }}
          />
          <input
            type="number"
            placeholder="Min subtotal"
            value={form.minSubtotal}
            onChange={(e) => setForm({ ...form, minSubtotal: Number(e.target.value) })}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'hsl(var(--border))' }}
          />
          <button type="submit" className="btn-primary w-full">Create</button>
        </form>

        <div className="rounded-3xl border bg-white p-6" style={{ borderColor: 'hsl(var(--border))' }}>
          <h3 className="text-lg font-serif-display mb-4">Existing</h3>
          <ul className="space-y-2">
            {coupons.map((c) => (
              <li key={c._id} className="flex items-center justify-between text-sm rounded-lg px-3 py-2 hover:bg-cream/50">
                <div>
                  <p className="font-medium">{c.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.type === 'percent' ? `${c.amount}% off` : `${formatPrice(c.amount)} off`}
                    {c.minSubtotal > 0 && ` · min ${formatPrice(c.minSubtotal)}`}
                  </p>
                </div>
                <button
                  onClick={() => del.mutate(c._id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

