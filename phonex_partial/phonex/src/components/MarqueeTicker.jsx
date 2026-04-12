// MarqueeTicker.jsx
import { Star } from 'lucide-react'

const DEFAULT_ITEMS = [
  'New Arrivals', 'Free Shipping Over ₹10,000', 'Curated Technology',
  '2-Year Warranty', 'Editorial Selection', 'Premium Materials',
  'Exclusive Members', 'Priority Support',
]

export default function MarqueeTicker({ items = DEFAULT_ITEMS }) {
  // Duplicate for seamless loop
  const doubled = [...items, ...items]

  return (
    <div
      className="overflow-hidden py-3"
      style={{ backgroundColor: 'hsl(var(--gold))' }}
    >
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-3 px-6 text-white text-xs font-medium uppercase tracking-[0.18em] shrink-0"
          >
            {item}
            <Star size={8} fill="white" stroke="none" className="opacity-70 shrink-0" />
          </span>
        ))}
      </div>
    </div>
  )
}
