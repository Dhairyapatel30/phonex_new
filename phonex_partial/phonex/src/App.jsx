
import { useState, useMemo, useEffect } from 'react'
import { Link, Routes, Route, useParams, useSearchParams } from 'react-router-dom'
import { Heart, Star } from 'lucide-react'
import {
  useCategories,
  useFeaturedProducts,
  useProducts,
  useProduct,
  useProductReviews,
} from './hooks/useProducts.js'
import {
  useAddToCart,
  useAddWishlist,
  useWishlist,
  useRemoveWishlist,
} from './hooks/useCart.js'
import ProductCard from './components/ProductCard.jsx'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import FrequentlyBoughtTogether from './components/FrequentlyBoughtTogether.jsx'
import ProductHighlights from './components/ProductHighlights.jsx'
import SectionHeader from './components/SectionHeader.jsx'
import { getProductIcon, getProductImage, formatPriceUSD, HERO_IMAGE } from './lib/utils.js'
import { parseNaturalQuery, filtersToUrlParams } from './lib/nlFilter.js'
import { useAuth } from './contexts/AuthContext.jsx'
import { api } from './lib/api.js'
import { toast } from 'sonner'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import { OrdersPage, OrderDetailPage } from './pages/OrdersPage.jsx'
import WishlistPage from './pages/WishlistPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import PaymentPage from './pages/PaymentPage.jsx'
import CompatibilityPage from './pages/CompatibilityPage.jsx'
import Chatbot from './components/Chatbot.jsx'


function HomePage() {
  const { data: categories = [], isLoading: categoriesLoading } = useCategories()
  const { data: featuredProducts = [], isLoading: featuredLoading } = useFeaturedProducts()

  return (
    <main className="flex-1">
      <section className="bg-background py-20" aria-labelledby="hero-heading">
        <div className="max-w-7xl mx-auto px-6 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <span className="section-label">Premium technology for India</span>
            <h1 id="hero-heading" className="mt-6 text-5xl md:text-6xl font-serif-display tracking-tight leading-tight">
              Discover modern devices crafted for the Indian lifestyle.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              PHONEX brings you flagship smartphones, intelligent wearables, sleek tablets, and premium accessories.
              Curated for Indian users with pan-India delivery, local support, and competitive pricing.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/category" className="btn-primary">Browse collection</Link>
              <Link to="/about" className="btn-secondary">Learn more</Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="card-hover border overflow-hidden rounded-3xl bg-card" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
              <img src={HERO_IMAGE} alt="PHONEX hero device" className="w-full h-full object-cover" />
            </div>
            <div className="card-hover border rounded-3xl p-8 bg-card" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
              <span className="section-label">Featured release</span>
              <h3 className="mt-4 text-2xl font-serif-display">Zenith Pro Max</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Our signature flagship smartphone built for creativity, performance, and effortless style.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <span className="text-2xl font-semibold gold-text">₹89,999</span>
                <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">From</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16" aria-labelledby="categories-heading">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Category highlights"
            title="Shop by curated device classes."
            description="Browse the collections that define our assortment."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {categoriesLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-40 rounded-3xl bg-muted-custom animate-pulse" />
              ))
            ) : (
              categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="card-hover group rounded-3xl border p-8 bg-card"
                  style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="section-label">{category.name}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">View</span>
                  </div>
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                    {category.description}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="pb-20" aria-labelledby="featured-heading">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            eyebrow="Featured products"
            title="Selected items from across the store."
            description="Handpicked favorites from our current collection."
          />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-80 rounded-3xl bg-muted-custom animate-pulse" />
              ))
            ) : (
              featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function CategoryPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  // All filter state comes from the URL, so pages are shareable / refreshable
  const q = searchParams.get('q') || ''
  const color = searchParams.get('color') || ''
  const device = searchParams.get('device') || ''
  const features = (searchParams.get('features') || '').split(',').filter(Boolean)
  const min = searchParams.get('min') || ''
  const max = searchParams.get('max') || ''
  const sort = searchParams.get('sort') || ''

  // Local input buffer so typing in the NL search bar doesn't re-fire requests
  // on every keystroke. We only re-filter on form submit / Enter.
  const [nlInput, setNlInput] = useState(() => buildDisplayQuery(q, color, features))

  // The backend `q` is a space-joined "bag of words" so color + features still
  // help narrow the catalog even though they aren't stored as structured fields.
  const searchQuery = [q, color, ...features].filter(Boolean).join(' ')

  const { data: categories = [] } = useCategories()
  const { data: products = [], isLoading: productsLoading } = useProducts(slug, {
    q: searchQuery || undefined,
    sort: sort || undefined,
    min: min || undefined,
    max: max || undefined,
    compatibleWith: device || undefined,
  })
  const category = slug ? categories.find((cat) => cat.slug === slug) : null

  // Helper: replace / delete a single URL param while preserving the rest.
  function setParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  // Parse the NL string and atomically overwrite every NL-driven URL param.
  // Non-NL params (slug, sort) are preserved.
  function handleNlSubmit(e) {
    e.preventDefault()
    const parsed = parseNaturalQuery(nlInput)
    const mapped = filtersToUrlParams(parsed)

    const next = new URLSearchParams(searchParams)
    for (const k of ['q', 'color', 'device', 'min', 'max', 'features']) next.delete(k)
    for (const [k, v] of Object.entries(mapped)) next.set(k, v)
    setSearchParams(next)
  }

  function clearAllFilters() {
    const next = new URLSearchParams()
    if (sort) next.set('sort', sort)
    setSearchParams(next)
    setNlInput('')
  }

  // Build the list of currently-active chips from the URL state.
  const chips = useMemo(() => {
    const list = []
    if (q) list.push({ key: 'q', label: q })
    if (color) list.push({ key: 'color', label: capitalize(color) })
    if (device) list.push({ key: 'device', label: device })
    if (min) list.push({ key: 'min', label: `Above ₹${Number(min).toLocaleString('en-IN')}` })
    if (max) list.push({ key: 'max', label: `Under ₹${Number(max).toLocaleString('en-IN')}` })
    for (const f of features) list.push({ key: `feat:${f}`, label: f })
    return list
  }, [q, color, device, min, max, features])

  return (
    <main className="flex-1 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader
          eyebrow={slug ? category?.name || 'Shop' : 'Shop'}
          title={slug ? `Products in ${category?.name || 'this collection'}` : 'All products'}
          description={slug ? category?.description : 'Explore every product available in the PHONEX catalog.'}
        />

        {/* Natural-language search bar */}
        <form onSubmit={handleNlSubmit} className="mb-4" role="search" aria-label="Natural language product search">
          <label htmlFor="nl-search" className="sr-only">Search</label>
          <div className="flex gap-2">
            <input
              id="nl-search"
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              placeholder='Try: "red case for iPhone 15 under ₹3000 with MagSafe"'
              className="flex-1 rounded-2xl border bg-white px-5 py-3 text-sm"
              style={{ borderColor: 'hsl(var(--border))' }}
            />
            <button type="submit" className="btn-primary px-6">Search</button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Type naturally — I'll pull out the category, color, device, price and features.
          </p>
        </form>

        {/* Structured controls (sort + numeric price) still available */}
        <div className="mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <label htmlFor="sort" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Sort</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="mt-1 rounded-xl border bg-white px-4 py-2 text-sm"
              style={{ borderColor: 'hsl(var(--border))' }}
            >
              <option value="">Newest</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
              <option value="rating">Rating</option>
            </select>
          </div>
          <div>
            <label htmlFor="min" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Min ₹</label>
            <input
              id="min"
              type="number"
              value={min}
              onChange={(e) => setParam('min', e.target.value)}
              className="mt-1 w-24 rounded-xl border bg-white px-3 py-2 text-sm"
              style={{ borderColor: 'hsl(var(--border))' }}
            />
          </div>
          <div>
            <label htmlFor="max" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Max ₹</label>
            <input
              id="max"
              type="number"
              value={max}
              onChange={(e) => setParam('max', e.target.value)}
              className="mt-1 w-24 rounded-xl border bg-white px-3 py-2 text-sm"
              style={{ borderColor: 'hsl(var(--border))' }}
            />
          </div>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2 items-center" aria-label="Active filters">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mr-1">
              Filters
            </span>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => removeChip(chip)}
                className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-cream"
                style={{ borderColor: 'hsl(var(--border))' }}
                aria-label={`Remove filter ${chip.label}`}
              >
                <span>{chip.label}</span>
                <span className="text-muted-foreground">✕</span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] uppercase tracking-[0.15em] underline text-muted-foreground ml-2"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {productsLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-80 rounded-3xl bg-muted-custom animate-pulse" />
            ))
          ) : products.length > 0 ? (
            products.map((product) => <ProductCard key={product.id} product={product} />)
          ) : (
            <div className="rounded-3xl border bg-card p-10 text-center md:col-span-2 xl:col-span-3" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
              <p className="text-sm text-muted-foreground">No products match your filters.</p>
              <button onClick={clearAllFilters} className="mt-4 inline-block btn-secondary">Reset</button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// Recompose a human-readable query from URL state, so the search box shows
// whatever the user (or a previous visit) last typed.
function buildDisplayQuery(q, color, features) {
  return [color, q, ...features].filter(Boolean).join(' ')
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function ProductPage() {
  const { slug } = useParams()
  const { data: product, isLoading, error } = useProduct(slug)
  const { data: reviews = [] } = useProductReviews(slug)
  const addToCart = useAddToCart()
  const addWishlist = useAddWishlist()
  const removeWishlist = useRemoveWishlist()
  const { data: wishlist = [] } = useWishlist()
  const { user } = useAuth()
  const [qty, setQty] = useState(1)

  const inWishlist = wishlist.some((w) => w.product_id === product?.id)

  const handleAddToCart = async () => {
    try {
      await addToCart.mutateAsync({ product, quantity: qty })
      toast.success('Added to cart')
    } catch (err) {
      toast.error(err.message || 'Could not add to cart')
    }
  }

  const handleWishlist = async () => {
    if (!user) return toast.error('Sign in to save items')
    if (inWishlist) {
      await removeWishlist.mutateAsync(product.id)
      toast.success('Removed from wishlist')
    } else {
      await addWishlist.mutateAsync(product.id)
      toast.success('Saved to wishlist')
    }
  }

  if (isLoading) {
    return (
      <main className="flex-1 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-96 rounded-3xl bg-muted-custom animate-pulse" />
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="flex-1 py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="rounded-3xl border bg-card p-10" style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}>
            <p className="text-lg text-muted-foreground">Product not found.</p>
            <Link to="/category" className="mt-6 inline-block btn-secondary">Browse products</Link>
          </div>
        </div>
      </main>
    )
  }

  const imageSrc = getProductImage(product)

  return (
    <main className="flex-1 py-16">
      <div className="max-w-7xl mx-auto px-6 grid gap-10 lg:grid-cols-[0.95fr_0.7fr]">
        <section className="rounded-3xl border bg-white p-10" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-start gap-8 flex-col lg:flex-row">
            <div className="rounded-3xl bg-cream overflow-hidden flex items-center justify-center" style={{ width: '320px', height: '320px' }}>
              <img src={imageSrc} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="section-label">{product.categories?.name}</span>
              <h1 className="mt-4 text-4xl font-serif-display tracking-tight">{product.name}</h1>
              {product.ratingCount > 0 && (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Star size={14} fill="currentColor" className="gold-text" />
                  {product.ratingAvg} ({product.ratingCount} reviews)
                </p>
              )}
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <span className="text-3xl font-semibold gold-text">{formatPriceUSD(product.price)}</span>
                <Link to={`/category/${product.categories?.slug}`} className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  View category
                </Link>
              </div>
            </div>
          </div>

          {/* AI-generated highlights from reviews + specs */}
          <ProductHighlights product={product} />

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {product.specs?.map(([label, value]) => (
              <div key={label} className="rounded-3xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <p className="mt-2 font-medium">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border bg-white p-8" style={{ borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-xl font-serif-display">Order details</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Stock: {product.stock ?? 100} available
            </p>

            <div className="mt-6 flex items-center gap-3">
              <label htmlFor="qty" className="text-xs uppercase tracking-[0.2em]">Qty</label>
              <input
                id="qty"
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="w-20 rounded-xl border bg-white px-3 py-2 text-sm"
                style={{ borderColor: 'hsl(var(--border))' }}
              />
            </div>

            <button
              onClick={handleAddToCart}
              disabled={addToCart.isPending}
              className="mt-6 btn-primary w-full"
            >
              {user ? 'Add to cart' : 'Sign in to purchase'}
            </button>
            <button
              onClick={handleWishlist}
              className="mt-3 btn-secondary w-full flex items-center justify-center gap-2"
              aria-pressed={inWishlist}
            >
              <Heart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
              {inWishlist ? 'Saved to wishlist' : 'Add to wishlist'}
            </button>
          </div>

          <ReviewsSection product={product} reviews={reviews} />
        </aside>
      </div>

      {/* Frequently bought together — lives outside the 2-col grid so it
          gets full width on larger screens. Hides itself if the server
          returns no recommendations. */}
      <div className="max-w-7xl mx-auto px-6">
        <FrequentlyBoughtTogether product={product} />
      </div>
    </main>
  )
}

function ReviewsSection({ product, reviews }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  async function submit(e) {
    e.preventDefault()
    try {
      await api.createReview({ productId: product.id, rating, title, body })
      toast.success('Review submitted')
      setTitle('')
      setBody('')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="rounded-3xl border bg-white p-8" style={{ borderColor: 'hsl(var(--border))' }}>
      <h3 className="text-lg font-serif-display">Reviews</h3>
      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No reviews yet. Be the first to write one.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.slice(0, 5).map((r) => (
            <li key={r.id} className="border-t pt-4" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex items-center gap-2 text-xs">
                <span className="gold-text">{'★'.repeat(r.rating)}</span>
                <span className="text-muted-foreground">{r.user.fullName || 'Anonymous'}</span>
              </div>
              {r.title && <p className="mt-1 font-medium text-sm">{r.title}</p>}
              {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}

      {user && (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-xs uppercase tracking-[0.2em]">Your rating
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
              style={{ borderColor: 'hsl(var(--border))' }}
            >
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n !== 1 && 's'}</option>)}
            </select>
          </label>
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'hsl(var(--border))' }}
          />
          <textarea
            placeholder="Write a short review…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
            style={{ borderColor: 'hsl(var(--border))' }}
          />
          <button type="submit" className="btn-secondary text-xs">Submit review</button>
        </form>
      )}
    </div>
  )
}

function NotFoundPage() {
  return (
    <main className="flex-1 py-20">
      <div className="max-w-xl mx-auto px-6 text-center">
        <h1 className="text-5xl font-serif-display">404</h1>
        <p className="mt-4 text-sm text-muted-foreground">The page you were looking for does not exist.</p>
        <Link to="/" className="mt-8 inline-block btn-primary">Return home</Link>
      </div>
    </main>
  )
}

export default function App() {
  function getPreferredTheme() {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const [theme, setTheme] = useState(getPreferredTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/category" element={<CategoryPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment/:id" element={<PaymentPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/compatibility" element={<CompatibilityPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
      <Footer />
      <Chatbot />
    </div>
  )
}
