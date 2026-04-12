import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus } from 'lucide-react'
import { useCart, useUpdateCartItem, useRemoveCartItem } from '../hooks/useCart.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { formatPriceUSD, getProductImage } from '../lib/utils.js'
import { toast } from 'sonner'

export default function CartPage() {
  const { user } = useAuth()
  const { data: cart = [], isLoading } = useCart()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()

  if (!user) {
    return (
      <main className="flex-1 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-serif-display">Your cart</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Sign in to view items saved to your cart.
          </p>
          <Link to="/login" className="mt-8 inline-block btn-primary">
            Sign in
          </Link>
        </div>
      </main>
    )
  }

  const subtotal = cart.reduce(
    (sum, it) => sum + (it.products?.price || 0) * it.quantity,
    0
  )

  return (
    <main className="flex-1 py-16">
      <div className="max-w-7xl mx-auto px-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <h1 className="text-4xl font-serif-display">Your cart</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {cart.length} {cart.length === 1 ? 'item' : 'items'} in your bag
          </p>

          {isLoading ? (
            <div className="mt-10 h-40 rounded-3xl bg-muted-custom animate-pulse" />
          ) : cart.length === 0 ? (
            <div className="mt-10 rounded-3xl border bg-white p-10 text-center" style={{ borderColor: 'hsl(var(--border))' }}>
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              <Link to="/category" className="mt-6 inline-block btn-secondary">
                Browse products
              </Link>
            </div>
          ) : (
            <ul className="mt-8 space-y-4">
              {cart.map((item) => {
                const imageSrc = getProductImage(item.products)
                return (
                  <li
                    key={item.id}
                    className="flex gap-5 items-center rounded-3xl border bg-white p-5"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  >
                    <div className="rounded-2xl bg-cream overflow-hidden flex items-center justify-center" style={{ width: 96, height: 96 }}>
                      <img src={imageSrc} alt={item.products?.name} className="w-full h-full object-cover bg-card" style={{ backgroundColor: 'hsl(var(--card))' }} />
                    </div>
                    <div className="flex-1">
                      <Link to={`/product/${item.products?.slug}`} className="font-medium">
                        {item.products?.name}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatPriceUSD(item.products?.price || 0)}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          aria-label="Decrease quantity"
                          onClick={() =>
                            updateItem.mutate({ itemId: item.id, quantity: item.quantity - 1 })
                          }
                          className="p-1 rounded-full border"
                          style={{ borderColor: 'hsl(var(--border))' }}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm w-8 text-center">{item.quantity}</span>
                        <button
                          aria-label="Increase quantity"
                          onClick={() =>
                            updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })
                          }
                          className="p-1 rounded-full border"
                          style={{ borderColor: 'hsl(var(--border))' }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <button
                      aria-label="Remove from cart"
                      onClick={() => {
                        removeItem.mutate(item.id)
                        toast.success('Removed from cart')
                      }}
                      className="p-2 text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside className="h-fit rounded-3xl border bg-white p-8 sticky top-24" style={{ borderColor: 'hsl(var(--border))' }}>
          <h2 className="text-xl font-serif-display">Order summary</h2>
          <div className="mt-6 space-y-3 text-sm">
            <Row label="Subtotal" value={formatPriceUSD(subtotal)} />
            <Row label="Shipping" value="Calculated at checkout" />
            <div className="divider my-4" />
            <Row label="Estimated total" value={formatPriceUSD(subtotal)} bold />
          </div>
          <Link
            to="/checkout"
            aria-disabled={cart.length === 0}
            className={`mt-8 btn-primary w-full text-center ${cart.length === 0 ? 'pointer-events-none opacity-50' : ''}`}
          >
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </main>
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
