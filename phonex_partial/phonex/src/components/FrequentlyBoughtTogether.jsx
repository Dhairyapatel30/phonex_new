import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAddToCart } from '../hooks/useCart.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { formatPrice, getProductImage } from '../lib/utils.js'
import { toast } from 'sonner'

/**
 * "Frequently Bought Together" — horizontal scroll row of up to 5
 * products that co-occur in past orders with the current product.
 *
 * - Data from GET /api/products/:id/recommendations
 * - Cached server-side via RecommendationCache (1h TTL)
 * - Falls back server-side to same-category top-rated when there's
 *   not enough co-occurrence data yet.
 * - Renders nothing if the endpoint returns an empty list.
 */
export default function FrequentlyBoughtTogether({ product }) {
  const { user } = useAuth()
  const addToCart = useAddToCart()

  const { data, isLoading } = useQuery({
    queryKey: ['recommendations', product?.id],
    queryFn: () => api.recommendations(product.id),
    enabled: !!product?.id,
    staleTime: 1000 * 60 * 5, // 5 min on the client in addition to the 1h server cache
  })

  const recommendations = data?.recommendations || []

  async function handleAddAll() {
    if (!user) return toast.error('Sign in to add items to your cart')
    try {
      // Add each recommendation sequentially so the server-side
      // upsert logic (quantity merging) behaves predictably.
      for (const p of recommendations) {
        await addToCart.mutateAsync({ product: p, quantity: 1 })
      }
      toast.success(`Added ${recommendations.length} item${recommendations.length !== 1 ? 's' : ''} to your cart`)
    } catch (err) {
      toast.error(err.message || 'Could not add items')
    }
  }

  // Hide the whole section if we have nothing to show
  if (isLoading) {
    return (
      <section className="mt-12">
        <div className="h-40 rounded-3xl bg-muted-custom animate-pulse" />
      </section>
    )
  }
  if (recommendations.length === 0) return null

  const bundleTotal = recommendations.reduce((sum, p) => sum + p.price, 0)

  return (
    <section
      className="mt-12 rounded-3xl border bg-card p-8"
      style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
      aria-labelledby="fbt-heading"
    >
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <span className="section-label">Smart recommendations</span>
          <h2 id="fbt-heading" className="mt-2 text-2xl font-serif-display">
            Frequently bought together
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Other shoppers added these items alongside {product.name}.
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Bundle total
          </p>
          <p className="mt-1 text-xl font-semibold gold-text">{formatPrice(bundleTotal)}</p>
          <button
            onClick={handleAddAll}
            disabled={addToCart.isPending}
            className="mt-3 btn-primary flex items-center gap-2 text-xs"
          >
            <ShoppingBag size={14} />
            Add all to cart
          </button>
        </div>
      </div>

      {/* Horizontally scrollable rail on small screens, grid on wider ones */}
      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 xl:grid-cols-5 md:overflow-visible">
        {recommendations.map((p) => (
          <RecommendationCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}

function RecommendationCard({ product }) {
  const imageSrc = getProductImage(product)
  return (
    <Link
      to={`/product/${product.slug}`}
      className="shrink-0 w-40 md:w-auto rounded-2xl border p-3 hover:bg-cream transition-colors"
      style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--cream))' }}
    >
      <div className="aspect-square rounded-xl overflow-hidden bg-card" style={{ backgroundColor: 'hsl(var(--card))' }}>
        <img
          src={imageSrc}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      <p className="mt-3 text-sm font-medium leading-tight line-clamp-2">{product.name}</p>
      <p className="mt-1 text-xs gold-text">{formatPrice(product.price)}</p>
    </Link>
  )
}
