/**
 * Natural-language product-filter parser.
 *
 * Converts strings like
 *    "red case for iPhone 15 under 2000 with MagSafe"
 * into structured filters
 *    { q: "case", color: "red", device: "iPhone 15", maxPrice: 2000,
 *      features: ["MagSafe"] }
 *
 * Completely client-side and regex-based — no ML, no deps, fast.
 */

// Known devices we can pull out of "for <device>" phrases.
// Kept in sync (roughly) with the values seeded into Product.compatibleWith.
// Longest strings first so "iPhone 15 Pro" wins over plain "iPhone 15".
const DEVICE_HINTS = [
  'iPhone 15 Pro',
  'iPhone 15',
  'iPhone 14',
  'iPhone 13',
  'Samsung Galaxy S24',
  'Galaxy S24',
  'Pixel 8',
  'OnePlus 12',
  'Nothing Phone 2',
  'Redmi Note 13',
  'Realme GT 6',
  'Vivo X100',
  'MacBook Air',
  'iPad Pro',
]

// Single-word colors we recognize
const COLORS = [
  'red', 'black', 'blue', 'white', 'green',
  'silver', 'gold', 'pink', 'purple', 'orange',
  'grey', 'gray', 'yellow', 'beige',
]

// Map of lowercase pattern → canonical label shown on chips + added to search.
// Longer patterns MUST come first so "fast charging" wins over "charging".
const FEATURE_HINTS = [
  ['fast charging', 'Fast Charging'],
  ['noise cancellation', 'ANC'],
  ['noise cancelling', 'ANC'],
  ['water resistant', 'Waterproof'],
  ['waterproof', 'Waterproof'],
  ['wireless', 'Wireless'],
  ['magsafe', 'MagSafe'],
  ['thunderbolt', 'Thunderbolt'],
  ['usb-c', 'USB-C'],
  ['usb c', 'USB-C'],
  ['anc', 'ANC'],
  ['5g', '5G'],
]

// Product-type nouns. Longer variants first to avoid mid-word matches.
const CATEGORY_KEYWORDS = [
  'screen protector',
  'earphones', 'headphones', 'earbuds',
  'smartphone', 'charger', 'adapter',
  'tablet', 'cover', 'case', 'cable',
  'watch', 'band', 'phone', 'buds', 'protector',
]

// Escape a literal string so it can be safely used inside `new RegExp`.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Main parser. Always returns an object — never throws.
 * If nothing structured could be extracted, `filters.q` holds the raw string
 * so the caller can still perform a plain keyword search.
 */
export function parseNaturalQuery(input) {
  const original = String(input || '').trim()
  if (!original) return {}

  let text = ' ' + original.toLowerCase() + ' '
  const filters = {}

  // ── 1. Max price: "under 2000", "below 2k", "less than 1500" ──
  const maxMatch = text.match(
    /\b(?:under|below|less than|upto|up to|within|<)\s*₹?\s*(\d+)\s*(k)?\b/i
  )
  if (maxMatch) {
    filters.maxPrice = Number(maxMatch[1]) * (maxMatch[2] ? 1000 : 1)
    text = text.replace(maxMatch[0], ' ')
  }

  // ── 2. Min price: "above 500", "over 1000" ──
  const minMatch = text.match(
    /\b(?:above|over|more than|from|>)\s*₹?\s*(\d+)\s*(k)?\b/i
  )
  if (minMatch) {
    filters.minPrice = Number(minMatch[1]) * (minMatch[2] ? 1000 : 1)
    text = text.replace(minMatch[0], ' ')
  }

  // ── 3. Device compatibility ──
  for (const device of DEVICE_HINTS) {
    const re = new RegExp(`(?:for\\s+)?${escapeRe(device)}`, 'i')
    if (re.test(text)) {
      filters.device = device
      text = text.replace(re, ' ')
      break
    }
  }

  // ── 4. Color ──
  for (const color of COLORS) {
    const re = new RegExp(`\\b${color}\\b`, 'i')
    if (re.test(text)) {
      filters.color = color
      text = text.replace(re, ' ')
      break
    }
  }

  // ── 5. Features (multi-select) ──
  const features = []
  for (const [pattern, label] of FEATURE_HINTS) {
    const re = new RegExp(`\\b${escapeRe(pattern)}\\b`, 'i')
    if (re.test(text)) {
      features.push(label)
      text = text.replace(re, ' ')
    }
  }
  if (features.length) filters.features = features

  // ── 6. Product-type keyword ──
  for (const kw of CATEGORY_KEYWORDS) {
    const re = new RegExp(`\\b${escapeRe(kw)}\\b`, 'i')
    if (re.test(text)) {
      filters.q = kw
      text = text.replace(re, ' ')
      break
    }
  }

  // ── 7. Fallback: whatever noise is left becomes the free-text q ──
  if (!filters.q) {
    const leftover = text.replace(/\s+/g, ' ').trim()
    // Drop very short leftovers, and obvious glue-words
    if (leftover && leftover.length >= 2 && !/^(with|and|the|a|for)$/i.test(leftover)) {
      filters.q = leftover
    }
  }

  return filters
}

/**
 * Convert a parsed-filters object into a URLSearchParams-friendly flat map,
 * matching the keys the CategoryPage tracks in the URL.
 */
export function filtersToUrlParams(filters) {
  const out = {}
  if (filters.q) out.q = filters.q
  if (filters.color) out.color = filters.color
  if (filters.device) out.device = filters.device
  if (filters.minPrice != null) out.min = String(filters.minPrice)
  if (filters.maxPrice != null) out.max = String(filters.maxPrice)
  if (filters.features?.length) out.features = filters.features.join(',')
  return out
}
