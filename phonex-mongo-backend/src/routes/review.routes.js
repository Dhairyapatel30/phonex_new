import { Router } from 'express'
import { Review, Product } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/reviews { productId, rating, title, body }
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { productId, rating, title, body } = req.body || {}
    if (!productId || !rating) return res.status(400).json({ error: 'productId and rating required' })
    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ error: 'Product not found' })

    const review = await Review.findOneAndUpdate(
      { user: req.user._id, product: productId },
      { rating, title, body },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    // Recompute product rating
    const all = await Review.find({ product: productId })
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length
    product.ratingAvg = Math.round(avg * 10) / 10
    product.ratingCount = all.length
    await product.save()

    res.json(review)
  } catch (err) {
    next(err)
  }
})

export default router
