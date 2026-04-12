/**
 * AI Product Highlights — lightweight sentiment + keyword extraction.
 *
 * Two modes:
 *   1. generateHighlightsFromReviews(reviews)
 *      Splits each review into sentences, classifies each sentence as
 *      positive or negative by simple lexicon lookup, then returns the
 *      top few trimmed sentences as human-readable highlights.
 *
 *   2. generateHighlightsFromSpecs(product)
 *      Fallback used when there are no reviews. Converts the product's
 *      top specs into short, natural-sounding positive highlights.
 *
 * `generateHighlights({ product, reviews })` chooses the right strategy
 * and ALWAYS returns a `{ positives, negatives }` object so the route
 * and frontend can stay trivial.
 *
 * Zero dependencies. Pure JS. Fast.
 */

// ─── Lexicons ─────────────────────────────────────────────
const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'amazing', 'fantastic', 'awesome',
  'love', 'loved', 'loving', 'perfect', 'premium', 'solid', 'durable',
  'fast', 'smooth', 'bright', 'comfortable', 'impressive', 'worth',
  'recommended', 'crisp', 'clear', 'powerful', 'sharp', 'stunning',
  'beautiful', 'elegant', 'reliable', 'quick', 'long-lasting',
]

const NEGATIVE_WORDS = [
  'bad', 'poor', 'slow', 'cheap', 'weak', 'issue', 'problem', 'problems',
  'heating', 'laggy', 'lag', 'disappointed', 'disappointing', 'broken',
  'flimsy', 'terrible', 'awful', 'noisy', 'bulky', 'dim', 'defective',
  'useless', 'waste', 'buggy', 'crash', 'crashes', 'overheats', 'stuck',
]

// ─── Helpers ──────────────────────────────────────────────
function capitalize(s) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function truncate(s, max = 80) {
  if (!s) return s
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s
}

// Normalize for dedup — strip punctuation, collapse whitespace, lowercase.
function normalizeForDedup(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function containsWord(text, word) {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
}

function hasAny(text, lexicon) {
  return lexicon.some((w) => containsWord(text, w))
}

// Split review text into rough sentences. Handles newlines and .!?
function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// ─── Mode 1: reviews ──────────────────────────────────────
export function generateHighlightsFromReviews(reviews = [], limits = { pos: 3, neg: 2 }) {
  const positives = []
  const negatives = []
  const seen = new Set()

  for (const review of reviews) {
    const combined = `${review.title || ''}. ${review.body || ''}`
    const sentences = splitSentences(combined)

    for (const raw of sentences) {
      if (raw.length < 8) continue // skip "Good." / "Ok."

      const key = normalizeForDedup(raw)
      if (!key || seen.has(key)) continue

      const isPositive = hasAny(raw, POSITIVE_WORDS)
      const isNegative = hasAny(raw, NEGATIVE_WORDS)

      // If a sentence is mixed, negativity wins (more actionable signal).
      if (isNegative && negatives.length < limits.neg) {
        negatives.push(capitalize(truncate(raw)))
        seen.add(key)
      } else if (isPositive && !isNegative && positives.length < limits.pos) {
        positives.push(capitalize(truncate(raw)))
        seen.add(key)
      }

      if (positives.length >= limits.pos && negatives.length >= limits.neg) break
    }
  }

  return { positives, negatives }
}

// ─── Mode 2: specs fallback ───────────────────────────────
export function generateHighlightsFromSpecs(product, count = 3) {
  const specs = Array.isArray(product?.specs) ? product.specs : []
  const top = specs.slice(0, count)
  const positives = top
    .map(([label, value]) => specToHighlight(label, value))
    .filter(Boolean)
  return { positives, negatives: [] }
}

/**
 * Convert a raw spec tuple into a natural-sounding highlight string.
 * Uses simple keyword matching on the label so the phrasing stays human.
 */
function specToHighlight(label, value) {
  if (!label || !value) return ''
  const l = String(label).toLowerCase()

  if (/battery/.test(l)) return `Long-lasting ${value} battery`
  if (/display|screen/.test(l)) return `Gorgeous ${value} display`
  if (/camera/.test(l)) return `Pro-grade ${value} camera`
  if (/chip|processor|cpu|soc/.test(l)) return `Powered by the ${value}`
  if (/storage/.test(l)) return `Spacious ${value} storage`
  if (/ram|memory/.test(l)) return `Blazing ${value} of RAM`
  if (/weight/.test(l)) return `Featherlight at just ${value}`
  if (/connect|connectivity|network|5g|wifi|wi-fi/.test(l)) return `Modern ${value} connectivity`
  if (/water|resistance|ipx|rating/.test(l)) return `Tough ${value} protection`
  if (/material|case|build|frame|body/.test(l)) return `Premium ${value} build`
  if (/sensor|sensors/.test(l)) return `Advanced ${value} sensors`
  if (/charg/.test(l)) return `Fast ${value} charging`
  if (/driver/.test(l)) return `Rich sound from ${value}`
  if (/anc|noise/.test(l)) return `Adaptive ${value}`
  if (/crystal|glass/.test(l)) return `Protected by ${value}`

  // Generic template — still reads naturally
  return `${label}: ${value}`
}

// ─── Unified entry point used by the route ──────────────
export function generateHighlights({ product, reviews }) {
  if (Array.isArray(reviews) && reviews.length > 0) {
    const fromReviews = generateHighlightsFromReviews(reviews)
    if (fromReviews.positives.length > 0 || fromReviews.negatives.length > 0) {
      return fromReviews
    }
  }
  return generateHighlightsFromSpecs(product)
}
