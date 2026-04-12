import { useQuery } from '@tanstack/react-query'
import { Heart, AlertTriangle, Check, Minus } from 'lucide-react'
import { api } from '../lib/api.js'

/**
 * AI-generated "What buyers love / What to watch for" card.
 *
 * - Fetches /api/products/:id/highlights
 * - Renders nothing until the request resolves
 * - Hides itself completely if both lists are empty
 * - Two-column layout on md+, stacks on mobile
 */
export default function ProductHighlights({ product }) {
  const { data, isLoading } = useQuery({
    queryKey: ['highlights', product?.id],
    queryFn: () => api.productHighlights(product.id),
    enabled: !!product?.id,
    staleTime: 1000 * 60 * 10,
  })

  if (isLoading) {
    return (
      <div className="mt-8 h-28 rounded-3xl bg-muted-custom animate-pulse" aria-hidden="true" />
    )
  }

  const positives = data?.positives || []
  const negatives = data?.negatives || []
  if (positives.length === 0 && negatives.length === 0) return null

  return (
    <section
      className="mt-8 grid gap-4 md:grid-cols-2"
      aria-label="AI-generated product highlights"
    >
      {positives.length > 0 && (
        <HighlightCard
          title="What buyers love"
          emoji="❤️"
          tone="positive"
          icon={<Check size={14} />}
          items={positives}
        />
      )}
      {negatives.length > 0 && (
        <HighlightCard
          title="What to watch for"
          emoji="⚠️"
          tone="negative"
          icon={<Minus size={14} />}
          items={negatives}
        />
      )}
    </section>
  )
}

function HighlightCard({ title, emoji, tone, icon, items }) {
  const bg = tone === 'positive' ? 'bg-cream' : 'bg-soft-blue'

  return (
    <div
      className={`rounded-3xl border p-6 ${bg}`}
      style={{ borderColor: 'hsl(var(--border))' }}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg leading-none">
          {emoji}
        </span>
        <h3 className="text-sm uppercase tracking-[0.2em] font-medium">{title}</h3>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm leading-snug">
            <span
              className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                tone === 'positive' ? 'bg-white text-foreground' : 'bg-white text-foreground'
              }`}
              aria-hidden="true"
            >
              {icon}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Auto-generated from reviews & specs
      </p>
    </div>
  )
}
