import { Router } from 'express'
import { Order, CartItem, Product, Coupon } from '../models/index.js' // eslint-disable-line
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/orders — user's orders
router.get('/', async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json(orders)
  } catch (err) {
    next(err)
  }
})

// GET /api/orders/:id
router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json(order)
  } catch (err) {
    next(err)
  }
})

// POST /api/orders/:id/confirm-payment — fake payment-gateway callback
router.post('/:id/confirm-payment', async (req, res, next) => {
  try {
    const { reference } = req.body || {}
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    if (!order) return res.status(404).json({ error: 'Order not found' })
    if (order.status !== 'pending') {
      return res.status(400).json({ error: `Order already ${order.status}` })
    }
    order.status = 'paid'
    order.payment = {
      method: order.payment?.method || 'card',
      reference: reference || `PAY-${Date.now()}`,
    }
    await order.save()

    // Purchased items are now automatically removed from the cart
    await CartItem.deleteMany({ user: req.user._id })

    res.json(order)
  } catch (err) {
    next(err)
  }
})

// POST /api/orders { shipping_address, couponCode, payment_method }
router.post('/', async (req, res, next) => {
  try {
    const { shipping_address, couponCode, payment_method = 'cod' } = req.body || {}
    if (!shipping_address) return res.status(400).json({ error: 'shipping_address required' })

    const cartItems = await CartItem.find({ user: req.user._id }).populate('product')
    if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' })

    // Build order items & subtotal
    const items = []
    let subtotal = 0
    for (const ci of cartItems) {
      if (!ci.product) continue
      if (ci.product.stock < ci.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${ci.product.name}` })
      }
      items.push({
        product: ci.product._id,
        name: ci.product.name,
        unit_price: ci.product.price,
        quantity: ci.quantity,
      })
      subtotal += ci.product.price * ci.quantity
    }

    // Apply coupon
    let discount = 0
    let appliedCode = null
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true })
      if (coupon && subtotal >= coupon.minSubtotal) {
        if (!coupon.expiresAt || coupon.expiresAt > new Date()) {
          discount =
            coupon.type === 'percent'
              ? Math.round(subtotal * (coupon.amount / 100))
              : coupon.amount
          appliedCode = coupon.code
        }
      }
    }

    const total = Math.max(0, subtotal - discount)

    const order = await Order.create({
      user: req.user._id,
      items,
      subtotal,
      discount,
      couponCode: appliedCode,
      total,
      shipping_address,
      status: 'pending',
      payment: { method: payment_method, reference: null },
    })

    // Decrement stock
    for (const it of items) {
      await Product.updateOne({ _id: it.product }, { $inc: { stock: -it.quantity } })
    }

    // COD is "done" at order time — clear cart now.
    // Card orders clear the cart AFTER the fake payment gateway confirms.
    if (payment_method === 'cod') {
      await CartItem.deleteMany({ user: req.user._id })
    }

    res.json(order)
  } catch (err) {
    next(err)
  }
})

export default router
