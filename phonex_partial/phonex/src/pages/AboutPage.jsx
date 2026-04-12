import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <main className="flex-1 py-20">
      <div className="max-w-3xl mx-auto px-6">
        <span className="section-label">About PHONEX India</span>
        <h1 className="mt-4 text-4xl md:text-5xl font-serif-display">
          Premium technology, built for India.
        </h1>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          PHONEX is an India-first storefront for flagship smartphones, intelligent
          wearables, sleek tablets, and refined accessories. Every product is
          hand-selected by our editors for quality, design, and lasting value —
          priced fairly in rupees with pan-India delivery.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Pay the way you want — UPI, card, or cash on delivery — and enjoy free
          shipping on orders above ₹10,000, a 30-day return window, and a 2-year
          warranty backed by local support.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Stat label="Orders delivered" value="50K+" />
          <Stat label="Average rating" value="4.9 / 5" />
          <Stat label="Pincodes served" value="19,000+" />
          <Stat label="Support" value="24/7" />
        </div>

        <Link to="/category" className="mt-10 inline-block btn-primary">
          Browse the collection
        </Link>
      </div>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-3xl border bg-white p-6" style={{ borderColor: 'hsl(var(--border))' }}>
      <p className="text-3xl font-serif-display gold-text">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  )
}
