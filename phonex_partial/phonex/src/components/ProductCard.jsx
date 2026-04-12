// ProductCard.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getProductImage, getTintClass, formatPriceUSD } from '../lib/utils.js'

export default function ProductCard({ product, showCategory = true }) {
  const imageSrc = getProductImage(product)
  const tintClass = getTintClass(product.categories?.tint_color)
  const [zoomed, setZoomed] = useState(false)

  return (
    <Link to={`/product/${product.slug}`} className="block group">
      <article
        className={`card-hover border bg-card flex flex-col`}
        style={{
          borderColor: 'hsl(var(--border))',
          borderWidth: '0.5px',
          backgroundColor: 'hsl(var(--card), #fff)',
          color: 'hsl(var(--card-foreground), #111)',
        }}
      >
        {/* Image area */}
        <div
          className={`${tintClass} aspect-[4/3] overflow-hidden relative cursor-zoom-in`}
          onMouseEnter={() => setZoomed(true)}
          onMouseLeave={() => setZoomed(false)}
          onClick={() => setZoomed((z) => !z)}
          style={{ position: 'relative' }}
        >
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-300 ${zoomed ? 'scale-125 z-20' : 'scale-100'}`}
            style={{ cursor: zoomed ? 'zoom-out' : 'zoom-in' }}
          />
          {/* Featured badge */}
          {product.featured && (
            <div className="badge-gold absolute top-3 left-3">
              Editorial Pick
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-5 flex flex-col gap-2 flex-1">
          {showCategory && product.categories && (
            <span className="section-label text-[10px]">
              {product.categories.name}
            </span>
          )}

          <h3
            className="font-serif-display text-base font-normal leading-snug"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            {product.name}
          </h3>

          <p
            className="text-xs leading-relaxed line-clamp-2 mt-0.5 font-body"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            {product.description}
          </p>

          <div className="flex items-center justify-between mt-auto pt-3">
            <span
              className="font-body text-sm font-medium gold-text"
            >
              {formatPriceUSD(product.price)}
            </span>
            <span
              className="text-[10px] uppercase tracking-widest font-medium transition-transform duration-200 group-hover:translate-x-0.5"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              View →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
