import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { Product, Category, Order, User } from '../models/index.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

/**
 * Soft-auth: resolve a user if a JWT is present, but don't fail the request
 * when the visitor is anonymous. Chat works for guests, with personalised
 * responses when signed in.
 */
async function softAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (token) {
      const payload = jwt.verify(token, JWT_SECRET)
      req.user = await User.findById(payload.sub)
    }
  } catch {
    /* ignore */
  }
  next()
}

/**
 * POST /api/chat
 * Body: { message: string }
 * Response: { reply, suggestions?, products?, comparison? }
 *
 * This handler is organised as a prioritised intent chain. Each intent is
 * small, self-contained, and can return `null` to fall through. The final
 * intent — smartProductSearch — catches anything that looks like a product
 * query using fuzzy matching, combined filters, and sensible fallbacks.
 */
router.post('/', softAuth, async (req, res, next) => {
  try {
    const raw = String(req.body?.message || '').trim()
    if (!raw) {
      return res.json({
        reply: "Ask me anything about PHONEX — products, orders, shipping, coupons…",
      })
    }
    const ctx = preprocess(raw)
    const result = await route(ctx, req.user)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

/* ─────────────────────────────────────────────────────────────
 *  Preprocessing
 * ──────────────────────────────────────────────────────────── */
function preprocess(text) {
  const lower = text.toLowerCase()
  // Strip punctuation for token matching but keep the original for display
  const cleaned = lower.replace(/[^\w\s₹+-.@]/g, ' ').replace(/\s+/g, ' ').trim()
  const tokens = cleaned.split(' ').filter(Boolean)
  return { raw: text, lower, cleaned, tokens }
}

/* ─────────────────────────────────────────────────────────────
 *  Router
 * ──────────────────────────────────────────────────────────── */
async function route(ctx, user) {
  // Order matters — most specific intents first.
  const intents = [
    tryGreeting,
    tryThanks,
    tryHelp,
    tryComparison,
    tryMyOrders,
    tryCoupons,
    tryShipping,
    tryCategoriesList,
    tryStockCheck,
    trySmartProductSearch, // always last — catches everything else
  ]

  for (const intent of intents) {
    const result = await intent(ctx, user)
    if (result) return result
  }

  return fallbackReply(ctx)
}

/* ─────────────────────────────────────────────────────────────
 *  Greetings / thanks / help
 * ──────────────────────────────────────────────────────────── */
const GREETING_WORDS = ['hi', 'hello', 'hey', 'yo', 'hola', 'namaste', 'namaskar', 'greetings', 'sup']
const THANK_WORDS = ['thanks', 'thank', 'thx', 'ty', 'appreciate']
const HELP_WORDS = ['help', 'assist', 'support', 'what can you do', 'how do you work']

function tryGreeting(ctx, user) {
  const hasGreeting = ctx.tokens.some((t) => GREETING_WORDS.includes(t))
  if (!hasGreeting) return null
  // Only treat a greeting as standalone if the message is short —
  // "hi show me phones" should go straight to product search.
  if (ctx.tokens.length > 4) return null
  const name = user ? ' ' + (user.fullName || user.email.split('@')[0]) : ''
  return {
    reply: `Hi${name}! I'm the PHONEX assistant. How can I help today?`,
    suggestions: ['Show me smartphones', 'My orders', 'Coupons', 'Recommend me a watch'],
  }
}

function tryThanks(ctx) {
  if (!ctx.tokens.some((t) => THANK_WORDS.includes(t))) return null
  return { reply: "You're welcome! Anything else I can help with?" }
}

function tryHelp(ctx) {
  const isHelp =
    ctx.tokens.some((t) => HELP_WORDS.includes(t)) ||
    /what can you do|how do you work|who are you/.test(ctx.lower)
  if (!isHelp) return null
  return {
    reply:
      "I can help you:\n• Find products by category, price, or device\n• Compare two products side-by-side\n• Check coupons, shipping, returns & warranty\n• Look up your orders\n\nTry asking: *'wireless buds under ₹20000'*, *'compare Zenith and Eclipse'*, or *'track my orders'*.",
    suggestions: ['Show me smartphones', 'Any coupons?', 'Compare Zenith and Eclipse'],
  }
}

/* ─────────────────────────────────────────────────────────────
 *  Coupons / shipping / categories
 * ──────────────────────────────────────────────────────────── */
function tryCoupons(ctx) {
  if (!/\b(coupon|coupons|discount|discounts|promo|offer|offers|deal|deals|sale|save)\b/.test(ctx.lower)) {
    return null
  }
  return {
    reply:
      'Active coupons:\n• **WELCOME10** — 10% off any order\n• **PHONEX20** — 20% off orders ₹40,000+\n• **FLAT500** — ₹500 off orders ₹15,000+\n\nApply them at checkout.',
  }
}

function tryShipping(ctx) {
  if (!/\b(ship|shipping|delivery|deliver|arrive|return|returns|refund|warranty|exchange)\b/.test(ctx.lower)) {
    return null
  }
  return {
    reply:
      'Shipping is free across India on orders over ₹10,000 and usually arrives in 3–5 business days.\n\nYou also get a 30-day return window and a 2-year warranty on every device.',
  }
}

async function tryMyOrders(ctx, user) {
  if (!/\b(my orders|my order|order status|track( my)? order|where is my|my purchases|my bookings)\b/.test(ctx.lower)) {
    return null
  }
  if (!user) return { reply: 'Sign in first, then ask me again and I can fetch your orders.' }

  const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(3)
  if (orders.length === 0) {
    return { reply: "You don't have any orders yet. Browse the collection to get started!" }
  }
  const lines = orders.map(
    (o) =>
      `• #${o._id.toString().slice(-6)} — ${o.status} — ₹${o.total.toLocaleString('en-IN')} (${o.items.length} item${o.items.length !== 1 ? 's' : ''})`
  )
  return { reply: `Your latest orders:\n${lines.join('\n')}` }
}

async function tryCategoriesList(ctx) {
  if (!/\b(categor(y|ies)|what do you (sell|have|stock)|types? of products?)\b/.test(ctx.lower)) {
    return null
  }
  const cats = await Category.find().sort({ sort_order: 1 })
  return {
    reply: `We have ${cats.length} categories: ${cats.map((c) => c.name).join(', ')}.`,
    suggestions: cats.map((c) => `Show me ${c.name.toLowerCase()}`),
  }
}

/* ─────────────────────────────────────────────────────────────
 *  Comparison  (compare X and Y / X vs Y)
 * ──────────────────────────────────────────────────────────── */
async function tryComparison(ctx) {
  const cmp = parseComparison(ctx.lower)
  if (!cmp) return null
  const built = await buildComparison(cmp.a, cmp.b)
  return built // may be null → falls through to search
}

function parseComparison(text) {
  const cleaned = text.replace(/^compare\s+/i, '')
  const m = cleaned.match(/^(.+?)\s+(?:vs\.?|versus|and|with)\s+(.+)$/i)
  if (!m) return null
  const a = m[1].trim()
  const b = m[2].trim()
  if (a.length < 2 || b.length < 2) return null
  // Require "compare " prefix OR an unambiguous "vs"/"versus" separator
  if (!/^compare\s/i.test(text) && !/\bvs\.?|versus\b/i.test(text)) return null
  return { a, b }
}

async function buildComparison(queryA, queryB) {
  const [a, b] = await Promise.all([fuzzyFindProduct(queryA), fuzzyFindProduct(queryB)])

  if (!a && !b) return { reply: `I couldn't find "${queryA}" or "${queryB}" in the catalog.` }
  if (!a) return { reply: `I couldn't find "${queryA}". Try the exact product name.` }
  if (!b) return { reply: `I couldn't find "${queryB}". Try the exact product name.` }

  // Merge specs preserving insertion order
  const labels = []
  const mapA = new Map()
  const mapB = new Map()
  for (const [label, value] of a.specs || []) {
    if (!mapA.has(label)) {
      labels.push(label)
      mapA.set(label, value)
    }
  }
  for (const [label, value] of b.specs || []) {
    if (!mapB.has(label)) {
      if (!mapA.has(label)) labels.push(label)
      mapB.set(label, value)
    }
  }

  const rows = [
    {
      label: 'Price',
      valueA: `₹${a.price.toLocaleString('en-IN')}`,
      valueB: `₹${b.price.toLocaleString('en-IN')}`,
    },
    {
      label: 'Category',
      valueA: a.category?.name || '—',
      valueB: b.category?.name || '—',
    },
    ...labels.map((label) => ({
      label,
      valueA: mapA.get(label) || '—',
      valueB: mapB.get(label) || '—',
    })),
  ]

  return {
    reply: `Here's a side-by-side comparison of **${a.name}** and **${b.name}**:`,
    comparison: {
      productA: serializeForChat(a),
      productB: serializeForChat(b),
      rows,
    },
  }
}

/* ─────────────────────────────────────────────────────────────
 *  Stock check — "is Zenith in stock", "do you have Aura Buds"
 * ──────────────────────────────────────────────────────────── */
async function tryStockCheck(ctx) {
  const m = ctx.lower.match(
    /(?:is|are|do you have|got any|any)\s+(.+?)(?:\s+(?:in stock|available|left))?$/
  )
  if (!m) return null

  // Avoid the generic "any product under 20k" case — those belong to smart search
  if (/under|below|above|over|between|for|with|cheap|best|top|expensive|popular/i.test(m[1])) {
    return null
  }
  if (/\b(coupon|order|shipping|return|category|help)\b/i.test(m[1])) return null

  const name = m[1].trim()
  if (name.length < 3) return null

  const product = await fuzzyFindProduct(name)
  if (!product) return null

  if (product.stock > 0) {
    return {
      reply: `✅ **${product.name}** is in stock — ${product.stock} available at ₹${product.price.toLocaleString('en-IN')}.`,
      products: [serializeForChat(product)],
    }
  }
  return {
    reply: `❌ Sorry, **${product.name}** is currently out of stock. You can ask me to notify you when it's back.`,
    products: [serializeForChat(product)],
  }
}

/* ─────────────────────────────────────────────────────────────
 *  Smart product search  — the workhorse intent
 *
 *  Extracts every filter it can recognise from a free-text query, then
 *  runs a Mongo query + client-side scoring + typo-tolerant fuzzy match.
 * ──────────────────────────────────────────────────────────── */
async function trySmartProductSearch(ctx) {
  const filters = await parseFiltersFromText(ctx)

  // Build the Mongo query
  const query = {}
  if (filters.categoryId) query.category = filters.categoryId
  if (filters.device) {
    const safe = escapeRegex(filters.device)
    query.compatibleWith = { $elemMatch: { $regex: safe, $options: 'i' } }
  }
  if (filters.minPrice != null || filters.maxPrice != null) {
    query.price = {}
    if (filters.minPrice != null) query.price.$gte = filters.minPrice
    if (filters.maxPrice != null) query.price.$lte = filters.maxPrice
  }
  if (filters.keywords.length > 0) {
    // Token OR match against name + description
    query.$or = filters.keywords.flatMap((kw) => {
      const safe = escapeRegex(kw)
      return [
        { name: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
      ]
    })
  }

  // If we have absolutely nothing to filter on, bail so the fallback runs
  const hasAnyFilter =
    filters.categoryId ||
    filters.device ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.keywords.length > 0
  if (!hasAnyFilter) return null

  const sort = filters.topRated
    ? { ratingAvg: -1, createdAt: -1 }
    : filters.cheapest
    ? { price: 1 }
    : filters.expensive
    ? { price: -1 }
    : { featured: -1, ratingAvg: -1, createdAt: -1 }

  let products = await Product.find(query).sort(sort).limit(8)

  // ── Fallback: broaden the search if the initial query returned nothing ──
  if (products.length === 0) {
    // Drop keywords first, keep structural filters
    if (filters.categoryId || filters.device || filters.minPrice != null || filters.maxPrice != null) {
      const relaxed = { ...query }
      delete relaxed.$or
      products = await Product.find(relaxed).sort(sort).limit(5)
    }
  }

  // ── Client-side token scoring to re-rank the first N candidates ──
  if (products.length > 1 && filters.keywords.length > 0) {
    products = products
      .map((p) => ({ p, score: scoreProduct(p, filters.keywords) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p)
  }

  if (products.length === 0) {
    // Suggest popular products if we still have nothing
    const popular = await Product.find().sort({ ratingAvg: -1, featured: -1 }).limit(3)
    return {
      reply:
        "I couldn't find anything matching that. Here are some popular picks instead:",
      products: popular.map(serializeForChat),
    }
  }

  // Compose the reply
  const headline = composeSearchHeadline(filters, products.length)
  const lines = products
    .slice(0, 5)
    .map((p) => `• ${p.name} — ₹${p.price.toLocaleString('en-IN')}`)

  return {
    reply: `${headline}\n${lines.join('\n')}`,
    products: products.slice(0, 5).map(serializeForChat),
  }
}

function composeSearchHeadline(filters, count) {
  const parts = []
  if (filters.topRated) parts.push('Top-rated')
  if (filters.cheapest) parts.push('Cheapest')
  if (filters.expensive) parts.push('Premium')

  if (filters.categoryName) parts.push(filters.categoryName.toLowerCase())
  else parts.push('products')

  if (filters.device) parts.push(`for ${filters.device}`)
  if (filters.maxPrice != null) parts.push(`under ₹${filters.maxPrice.toLocaleString('en-IN')}`)
  if (filters.minPrice != null) parts.push(`above ₹${filters.minPrice.toLocaleString('en-IN')}`)

  const prefix = parts.join(' ')
  const suffix = count === 1 ? '' : ' (' + count + ' matches)'
  return `Here ${count === 1 ? 'is' : 'are'} some ${prefix}${suffix}:`
}

/* ─────────────────────────────────────────────────────────────
 *  Filter extraction (regex + typo-tolerant category match)
 * ──────────────────────────────────────────────────────────── */
const DEVICE_HINTS = [
  'iPhone 15 Pro', 'iPhone 15', 'iPhone 14', 'iPhone 13',
  'Samsung Galaxy S24', 'Galaxy S24', 'Pixel 8',
  'OnePlus 12', 'Nothing Phone 2', 'Redmi Note 13',
  'Realme GT 6', 'Vivo X100', 'MacBook Air', 'iPad Pro',
]

// category slug → list of typo-tolerant keyword candidates
const CATEGORY_KEYWORDS = {
  smartphones: [
    'phone', 'phones', 'smartphone', 'smartphones', 'mobile',
    'mobiles', 'handset', 'handsets', 'cell',
  ],
  wearables: [
    'watch', 'watches', 'wearable', 'wearables', 'band', 'bands',
    'smartwatch', 'smartwatches', 'fitness', 'tracker', 'trackers',
  ],
  tablets: ['tablet', 'tablets', 'ipad', 'ipads', 'pad', 'slate'],
  accessories: [
    'accessory', 'accessories', 'case', 'cases', 'cover', 'covers',
    'charger', 'chargers', 'buds', 'earbuds', 'earphones', 'headphones',
    'cable', 'cables', 'adapter', 'adapters', 'protector', 'protectors',
  ],
}

async function parseFiltersFromText(ctx) {
  let text = ' ' + ctx.lower + ' '
  const filters = {
    keywords: [],
    categoryId: null,
    categoryName: null,
    device: null,
    minPrice: null,
    maxPrice: null,
    cheapest: false,
    expensive: false,
    topRated: false,
  }

  // ── Price range "between X and Y" / "from X to Y" ──
  const rangeMatch = text.match(
    /\bbetween\s*₹?\s*(\d+)\s*(k)?\s+(?:and|to|-)\s*₹?\s*(\d+)\s*(k)?\b/
  )
  if (rangeMatch) {
    filters.minPrice = Number(rangeMatch[1]) * (rangeMatch[2] ? 1000 : 1)
    filters.maxPrice = Number(rangeMatch[3]) * (rangeMatch[4] ? 1000 : 1)
    text = text.replace(rangeMatch[0], ' ')
  }

  // ── Max price ──
  const maxMatch = text.match(
    /\b(?:under|below|less than|upto|up to|within|cheaper than)\s*₹?\s*(\d+)\s*(k)?\b/
  )
  if (maxMatch && filters.maxPrice == null) {
    filters.maxPrice = Number(maxMatch[1]) * (maxMatch[2] ? 1000 : 1)
    text = text.replace(maxMatch[0], ' ')
  }

  // ── Min price ──
  const minMatch = text.match(
    /\b(?:above|over|more than|starting from|from|pricier than)\s*₹?\s*(\d+)\s*(k)?\b/
  )
  if (minMatch && filters.minPrice == null) {
    filters.minPrice = Number(minMatch[1]) * (minMatch[2] ? 1000 : 1)
    text = text.replace(minMatch[0], ' ')
  }

  // ── Intent modifiers ──
  if (/\b(cheap|cheapest|affordable|budget|lowest)\b/.test(text)) filters.cheapest = true
  if (/\b(expensive|premium|luxury|flagship|top end|high end)\b/.test(text)) filters.expensive = true
  if (/\b(best|top|highest|best rated|top rated|popular|recommended)\b/.test(text)) filters.topRated = true

  // ── Device ──
  for (const device of DEVICE_HINTS) {
    const re = new RegExp(`(?:for\\s+)?${escapeRegex(device)}`, 'i')
    if (re.test(text)) {
      filters.device = device
      text = text.replace(re, ' ')
      break
    }
  }

  // ── Category with typo tolerance ──
  const cats = await Category.find().sort({ sort_order: 1 })
  const bySlug = Object.fromEntries(cats.map((c) => [c.slug, c]))
  const tokens = text.split(/\s+/).filter(Boolean)

  outer: for (const [slug, candidates] of Object.entries(CATEGORY_KEYWORDS)) {
    if (!bySlug[slug]) continue
    for (const token of tokens) {
      for (const kw of candidates) {
        if (token === kw || (token.length > 3 && levenshtein(token, kw) <= 1)) {
          filters.categoryId = bySlug[slug]._id
          filters.categoryName = bySlug[slug].name
          // Remove matched token so it doesn't pollute keywords
          text = text.replace(new RegExp(`\\b${escapeRegex(token)}\\b`, 'g'), ' ')
          break outer
        }
      }
    }
  }

  // ── Remaining meaningful tokens become free-text keywords ──
  const stopWords = new Set([
    'a', 'an', 'the', 'for', 'with', 'and', 'or', 'of', 'to', 'from',
    'show', 'me', 'give', 'find', 'get', 'recommend', 'suggest', 'want',
    'need', 'like', 'any', 'some', 'please', 'can', 'you', 'i', 'my',
    'it', 'that', 'this', 'which', 'what', 'thing', 'product', 'item',
    'have', 'have got', 'good', 'new', 'one', 'is', 'in', 'are', 'do',
  ])
  filters.keywords = text
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stopWords.has(t) && !/^\d+$/.test(t))
    .slice(0, 4) // cap to avoid huge $or queries

  return filters
}

/* ─────────────────────────────────────────────────────────────
 *  Fuzzy product lookup — used by comparison + stock check
 * ──────────────────────────────────────────────────────────── */
async function fuzzyFindProduct(name) {
  if (!name) return null
  const query = String(name).trim()
  if (query.length < 2) return null

  // 1. Try direct case-insensitive contains
  const safe = escapeRegex(query)
  let product = await Product.findOne({ name: { $regex: safe, $options: 'i' } })
    .populate('category')
    .sort({ ratingAvg: -1 })
  if (product) return product

  // 2. Score every product against the query tokens, fuzzy-tolerant
  const all = await Product.find().populate('category')
  const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean)

  let best = null
  let bestScore = 0
  for (const p of all) {
    const nameTokens = p.name.toLowerCase().split(/\s+/)
    let score = 0
    for (const qt of queryTokens) {
      for (const nt of nameTokens) {
        if (nt === qt) score += 3
        else if (nt.startsWith(qt) || qt.startsWith(nt)) score += 2
        else if (qt.length > 3 && levenshtein(qt, nt) <= 1) score += 1
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  // Require a reasonable confidence
  return bestScore >= 2 ? best : null
}

function scoreProduct(product, keywords) {
  const haystack = `${product.name} ${product.description || ''}`.toLowerCase()
  let score = 0
  for (const kw of keywords) {
    const needle = kw.toLowerCase()
    if (haystack.includes(needle)) score += 2
    // Token match inside name counts extra
    if (product.name.toLowerCase().includes(needle)) score += 2
  }
  if (product.featured) score += 1
  score += (product.ratingAvg || 0) * 0.5
  return score
}

/* ─────────────────────────────────────────────────────────────
 *  Final fallback
 * ──────────────────────────────────────────────────────────── */
function fallbackReply(_ctx) {
  return {
    reply:
      "I'm not sure I understood that. I can help with products, orders, coupons or shipping — try one of the buttons below.",
    suggestions: [
      'Show me smartphones',
      'Any coupons?',
      'Track my orders',
      'Compare Zenith and Eclipse',
    ],
  }
}

/* ─────────────────────────────────────────────────────────────
 *  String utilities
 * ──────────────────────────────────────────────────────────── */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Classic O(m × n) Levenshtein edit distance. Used only for short tokens
 * (≤ ~20 chars) so performance is a non-issue.
 */
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1)
  const curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      )
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

function serializeForChat(p) {
  return {
    id: p._id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    image_url: p.image_url,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
  }
}

export default router
