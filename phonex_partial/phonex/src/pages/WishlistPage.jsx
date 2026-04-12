import { Link, Navigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useWishlist, useRemoveWishlist, useAddToCart } from '../hooks/useCart.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { formatPriceUSD, getProductImage } from '../lib/utils.js'
import { toast } from 'sonner'

export default function WishlistPage() {
  const { user } = useAuth()
  const { data: wishlist = [], isLoading } = useWishlist()
  const remove = useRemoveWishlist()
  const addToCart = useAddToCart()

  if (!user) return <Navigate to="/login" state={{ from: '/wishlist' }} replace />

  return (
    <main className="flex-1 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <h1 className="text-4xl font-serif-display">Wishlist</h1>
        {isLoading ? (
          <div className="mt-10 h-40 rounded-3xl bg-muted-custom animate-pulse" />
        ) : wishlist.length === 0 ? (
          <div className="mt-10 rounded-3xl border bg-white p-10 text-center" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-sm text-muted-foreground">No saved items yet.</p>
            <Link to="/category" className="mt-6 inline-block btn-secondary">Browse products</Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {wishlist.map((w) => {
              const imageSrc = getProductImage(w.products)
              return (
                <li
                  key={w.id}
                  className="flex items-center gap-4 rounded-3xl border bg-white p-5"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  <div className="rounded-2xl bg-cream overflow-hidden flex items-center justify-center" style={{ width: 96, height: 96 }}>
                    <img src={imageSrc} alt={w.products?.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <Link to={`/product/${w.products?.slug}`} className="font-medium">
                      {w.products?.name}
                    </Link>
                    <p className="mt-1 text-sm gold-text">{formatPriceUSD(w.products?.price || 0)}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={async () => {
                          await addToCart.mutateAsync({ product: w.products, quantity: 1 })
                          toast.success('Added to cart')
                        }}
                        className="btn-secondary text-xs"
                      >
                        Add to cart
                      </button>
                    </div>
                  </div>
                  <button
                    aria-label="Remove from wishlist"
                    onClick={() => remove.mutate(w.product_id)}
                    className="p-2 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
