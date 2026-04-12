import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Smartphone, Search } from 'lucide-react'
import { api } from '../lib/api.js'
import ProductCard from '../components/ProductCard.jsx'

/**
 * CompatibilityPage — "I own a ___" accessory finder.
 *
 * - Fetches the list of known devices from /api/products/devices for
 *   autocomplete-style quick picks and suggestions.
 * - On submit, queries /api/products/by-device?device=... and renders
 *   matches via the shared ProductCard component.
 */
export default function CompatibilityPage() {
  const [input, setInput] = useState('')
  const [device, setDevice] = useState('')

  // Devices are cached and rarely change → long staleTime is fine.
  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.devices(),
    staleTime: 1000 * 60 * 10,
  })

  // Run the search only when we have a committed device.
  const {
    data: products = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['products-by-device', device],
    queryFn: () => api.productsByDevice(device),
    enabled: !!device,
  })

  // Filter suggestions as the user types — pure client-side, no extra request.
  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase()
    if (!q) return devices.slice(0, 6)
    return devices.filter((d) => d.toLowerCase().includes(q)).slice(0, 6)
  }, [input, devices])

  function handleSubmit(e) {
    e.preventDefault()
    if (input.trim()) setDevice(input.trim())
  }

  function pick(d) {
    setInput(d)
    setDevice(d)
  }

  return (
    <main className="flex-1 py-16">
      <div className="max-w-5xl mx-auto px-6">
        <span className="section-label">Compatibility checker</span>
        <h1 className="mt-4 text-4xl md:text-5xl font-serif-display tracking-tight">
          Find accessories that fit your device.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Tell us which phone, tablet, or laptop you own — we'll show you every PHONEX
          accessory engineered to work with it. No more guessing which case fits.
        </p>

        {/* Search */}
        <form
          onSubmit={handleSubmit}
          className="mt-10 flex flex-col sm:flex-row gap-3"
          role="search"
          aria-label="Device compatibility search"
        >
          <div className="relative flex-1">
            <Smartphone
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="I own a…  e.g. iPhone 15, Pixel 8, Galaxy S24"
              className="w-full rounded-2xl border bg-card pl-12 pr-4 py-4 text-base"
              style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
              aria-label="Your device"
            />
          </div>
          <button type="submit" className="btn-primary px-8 flex items-center gap-2 justify-center">
            <Search size={16} />
            Find
          </button>
        </form>

        {/* Quick picks / suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Device suggestions">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground self-center mr-1">
              {input ? 'Suggestions' : 'Quick picks'}
            </span>
            {suggestions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => pick(d)}
                className="rounded-full border px-4 py-1.5 text-xs hover:bg-background transition-colors"
                style={{ borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <section className="mt-14" aria-live="polite">
          {!device ? (
            <EmptyState />
          ) : isLoading || isFetching ? (
            <LoadingGrid />
          ) : products.length === 0 ? (
            <NoMatches device={device} />
          ) : (
            <>
              <div className="mb-6 flex items-baseline justify-between">
                <h2 className="text-2xl font-serif-display">
                  Compatible with <span className="gold-text">{device}</span>
                </h2>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {products.length} result{products.length !== 1 && 's'}
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <div
      className="rounded-3xl border bg-white p-12 text-center"
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      <Smartphone size={32} className="mx-auto text-muted-foreground" aria-hidden="true" />
      <p className="mt-4 text-sm text-muted-foreground">
        Enter a device above to see matching accessories.
      </p>
    </div>
  )
}

function NoMatches({ device }) {
  return (
    <div
      className="rounded-3xl border bg-white p-12 text-center"
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      <h3 className="text-xl font-serif-display">No matches for "{device}"</h3>
      <p className="mt-3 text-sm text-muted-foreground">
        Try a different model name, or pick one of the suggestions above.
      </p>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-80 rounded-3xl bg-muted-custom animate-pulse" />
      ))}
    </div>
  )
}
