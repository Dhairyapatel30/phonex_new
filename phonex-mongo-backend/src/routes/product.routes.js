import { Router } from 'express'
import mongoose from 'mongoose'
import { Product, Category, Review, Order, RecommendationCache } from '../models/index.js'
import { generateHighlights } from '../utils/highlights.js'

const { ObjectId } = mongoose.Types

// How long a cached recommendation row stays fresh before we recompute.
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

const router = Router()

function serialize(p) {
  const cat = p.category && typeof p.category === 'object' && p.category.slug
    ? {
        id: p.category._id,
        name: p.category.name,
        slug: p.category.slug,
        tint_color: p.category.tint_color,
        icon_type: p.category.icon_type,
      }
    : null
  return {
    id: p._id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    icon_type: p.icon_type,
    image_url: p.image_url,
    featured: p.featured,
    stock: p.stock,
    specs: p.specs,
    compatibleWith: p.compatibleWith || [],
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    category_id: cat?.id,
    categories: cat,
  }
}

// GET /api/products?category=slug&q=search&sort=price_asc&min=&max=&featured=true&compatibleWith=iPhone+15
router.get('/', async (req, res, next) => {
  try {
    const { category, q, sort, min, max, featured, compatibleWith } = req.query
    const filter = {}

    if (category) {
      const cat = await Category.findOne({ slug: category })
      if (cat) filter.category = cat._id
      else return res.json([])
    }

    if (featured === 'true') filter.featured = true

    if (min || max) {
      filter.price = {}
      if (min) filter.price.$gte = Number(min)
      if (max) filter.price.$lte = Number(max)
    }

    // Natural-language filter support — case-insensitive match against
    // the product's compatibleWith array.
    if (compatibleWith) {
      const safe = String(compatibleWith).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.compatibleWith = { $elemMatch: { $regex: safe, $options: 'i' } }
    }

    if (q) {
      // Split on whitespace so "case red magsafe" matches products whose
      // name/description contains ANY of those tokens. Each token becomes
      // its own $or entry so the aggregation remains indexable.
      const tokens = String(q).split(/\s+/).filter(Boolean)
      filter.$or = tokens.flatMap((token) => {
        const safe = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        return [
          { name: { $regex: safe, $options: 'i' } },
          { description: { $regex: safe, $options: 'i' } },
        ]
      })
    }

    let sortSpec = { createdAt: -1 }
    if (sort === 'price_asc') sortSpec = { price: 1 }
    else if (sort === 'price_desc') sortSpec = { price: -1 }
    else if (sort === 'rating') sortSpec = { ratingAvg: -1 }

    const products = await Product.find(filter)
      .populate('category')
      .sort(sortSpec)
      .limit(200)

    res.json(products.map(serialize))
  } catch (err) {
    next(err)
  }
})

// GET /api/products/devices
// Returns the distinct list of devices seeded across all products'
// compatibleWith arrays — used to populate the autocomplete suggestions.
router.get('/devices', async (_req, res, next) => {
  try {
    const devices = await Product.distinct('compatibleWith')
    // Drop empty strings, keep sorted + deduped
    const cleaned = [...new Set(devices.filter(Boolean))].sort((a, b) => a.localeCompare(b))
    res.json(cleaned)
  } catch (err) {
    next(err)
  }
})

// GET /api/products/by-device?device=iPhone+15
// Finds every product whose compatibleWith array loosely matches the device.
// Uses case-insensitive regex so "iphone 15" also matches "iPhone 15 Pro".
router.get('/by-device', async (req, res, next) => {
  try {
    const { device } = req.query
    if (!device || !device.trim()) {
      return res.status(400).json({ error: 'device query param required' })
    }
    // Escape any regex special chars the user may have typed
    const safe = String(device).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const products = await Product.find({
      compatibleWith: { $elemMatch: { $regex: safe, $options: 'i' } },
    })
      .populate('category')
      .sort({ ratingAvg: -1, price: 1 })
      .limit(60)

    res.json(products.map(serialize))
  } catch (err) {
    next(err)
  }
})

// GET /api/products/:id/recommendations
// "Frequently bought together" — computed from the Order collection via
// a MongoDB aggregation. Results are cached in RecommendationCache for
// CACHE_TTL_MS and lazily refreshed. If there's not enough co-occurrence
// data yet, falls back to top-rated products in the same category so
// the UI always has something to show.
router.get('/:id/recommendations', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid product id' })

    const productId = new ObjectId(id)

    // 1. Try the cache first
    const cached = await RecommendationCache.findOne({ product: productId }).populate({
      path: 'recommendations',
      populate: { path: 'category' },
    })
    if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS) {
      return res.json({ recommendations: cached.recommendations.map(serialize) })
    }

    // 2. Compute co-occurrence via aggregation
    const coOccurring = await computeCoOccurrences(productId)

    // 3. Fallback: if we have too few results, fill with same-category products
    const recommendations = await backfillWithCategory(productId, coOccurring, 5)

    // 4. Write-through cache (upsert)
    await RecommendationCache.findOneAndUpdate(
      { product: productId },
      {
        product: productId,
        recommendations: recommendations.map((p) => p._id),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    res.json({ recommendations: recommendations.map(serialize) })
  } catch (err) {
    next(err)
  }
})

/**
 * Find products that appear in the SAME orders as `productId`.
 *
 * Pipeline:
 *   1. Match orders that contain the product
 *   2. Unwind items so each line is its own doc
 *   3. Drop lines that point back to the original product
 *   4. Group by product, summing quantities → "frequency"
 *   5. Sort by frequency desc, take top 5
 */
async function computeCoOccurrences(productId) {
  const rows = await Order.aggregate([
    { $match: { 'items.product': productId } },
    { $unwind: '$items' },
    { $match: { 'items.product': { $ne: productId } } },
    {
      $group: {
        _id: '$items.product',
        count: { $sum: '$items.quantity' },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ])
  if (rows.length === 0) return []

  const ids = rows.map((r) => r._id)
  // Fetch full product docs, preserving the aggregation order
  const products = await Product.find({ _id: { $in: ids } }).populate('category')
  const byId = new Map(products.map((p) => [p._id.toString(), p]))
  return ids.map((id) => byId.get(id.toString())).filter(Boolean)
}

/**
 * If fewer than `limit` real co-occurrence results exist, top the list up
 * with highly-rated products from the same category. Keeps the UI filled
 * on a fresh install where no orders have been placed yet.
 */
async function backfillWithCategory(productId, existing, limit) {
  if (existing.length >= limit) return existing

  const base = await Product.findById(productId)
  if (!base) return existing

  const existingIds = new Set([productId.toString(), ...existing.map((p) => p._id.toString())])

  const fill = await Product.find({
    category: base.category,
    _id: { $nin: Array.from(existingIds).map((s) => new ObjectId(s)) },
  })
    .populate('category')
    .sort({ ratingAvg: -1, createdAt: -1 })
    .limit(limit - existing.length)

  return [...existing, ...fill]
}

// GET /api/products/:id/highlights
// AI-generated "What buyers love" / "What to watch for" lists.
// Uses review text when available, otherwise falls back to the product's
// top specs. Always returns { positives, negatives }.
router.get('/:id/highlights', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid product id' })

    const product = await Product.findById(id)
    if (!product) return res.status(404).json({ error: 'Product not found' })

    const reviews = await Review.find({ product: product._id }).limit(50)
    const result = generateHighlights({ product, reviews })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// GET /api/products/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).populate('category')
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(serialize(product))
  } catch (err) {
    next(err)
  }
})

// GET /api/products/:slug/reviews
router.get('/:slug/reviews', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    const reviews = await Review.find({ product: product._id })
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
    res.json(
      reviews.map((r) => ({
        id: r._id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
        user: { fullName: r.user?.fullName || 'Anonymous' },
      }))
    )
  } catch (err) {
    next(err)
  }
})

export default router
