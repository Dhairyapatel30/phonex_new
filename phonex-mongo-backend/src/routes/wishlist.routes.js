import { Router } from 'express'
import { WishlistItem, Product } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function serialize(w) {
  const p = w.product
  return {
    id: w._id,
    product_id: p?._id,
    products: p
      ? { id: p._id, name: p.name, slug: p.slug, price: p.price, icon_type: p.icon_type }
      : null,
  }
}

router.get('/', async (req, res, next) => {
  try {
    const items = await WishlistItem.find({ user: req.user._id }).populate('product')
    res.json(items.map(serialize))
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { productId } = req.body || {}
    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    try {
      const item = await WishlistItem.create({ user: req.user._id, product: productId })
      await item.populate('product')
      res.json(serialize(item))
    } catch (e) {
      if (e.code === 11000) return res.json({ ok: true, existing: true })
      throw e
    }
  } catch (err) {
    next(err)
  }
})

router.delete('/:productId', async (req, res, next) => {
  try {
    await WishlistItem.deleteOne({ user: req.user._id, product: req.params.productId })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
