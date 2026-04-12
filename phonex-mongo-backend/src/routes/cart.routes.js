import { Router } from 'express'
import { CartItem, Product } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function serialize(item) {
  const p = item.product
  return {
    id: item._id,
    user_id: item.user,
    product_id: p?._id,
    quantity: item.quantity,
    products: p
      ? {
          id: p._id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          icon_type: p.icon_type,
          image_url: p.image_url,
          stock: p.stock,
        }
      : null,
  }
}

// GET /api/cart
router.get('/', async (req, res, next) => {
  try {
    const items = await CartItem.find({ user: req.user._id }).populate('product')
    res.json(items.map(serialize))
  } catch (err) {
    next(err)
  }
})

// POST /api/cart { productId, quantity }
router.post('/', async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body || {}
    if (!productId) return res.status(400).json({ error: 'productId required' })
    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ error: 'Product not found' })

    const existing = await CartItem.findOne({ user: req.user._id, product: productId })
    let item
    if (existing) {
      existing.quantity += Number(quantity) || 1
      await existing.save()
      item = existing
    } else {
      item = await CartItem.create({
        user: req.user._id,
        product: productId,
        quantity: Number(quantity) || 1,
      })
    }
    await item.populate('product')
    res.json(serialize(item))
  } catch (err) {
    next(err)
  }
})

// PATCH /api/cart/:id { quantity }
router.patch('/:id', async (req, res, next) => {
  try {
    const { quantity } = req.body || {}
    const item = await CartItem.findOne({ _id: req.params.id, user: req.user._id })
    if (!item) return res.status(404).json({ error: 'Cart item not found' })
    if (quantity < 1) {
      await item.deleteOne()
      return res.json({ deleted: true })
    }
    item.quantity = quantity
    await item.save()
    await item.populate('product')
    res.json(serialize(item))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/cart/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await CartItem.deleteOne({ _id: req.params.id, user: req.user._id })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/cart — clear cart
router.delete('/', async (req, res, next) => {
  try {
    await CartItem.deleteMany({ user: req.user._id })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
