import { Router } from 'express'
import { Coupon, CartItem } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/coupons/validate { code } — returns discount preview against user's current cart
router.post('/validate', requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body || {}
    if (!code) return res.status(400).json({ error: 'Code required' })
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true })
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon' })
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Coupon expired' })
    }

    const cart = await CartItem.find({ user: req.user._id }).populate('product')
    const subtotal = cart.reduce(
      (sum, ci) => sum + (ci.product?.price || 0) * ci.quantity,
      0
    )
    if (subtotal < coupon.minSubtotal) {
      return res.status(400).json({
        error: `Minimum order of ₹${coupon.minSubtotal.toLocaleString('en-IN')} required`,
      })
    }
    const discount =
      coupon.type === 'percent'
        ? Math.round(subtotal * (coupon.amount / 100))
        : coupon.amount

    res.json({
      code: coupon.code,
      type: coupon.type,
      amount: coupon.amount,
      discount,
      subtotal,
      total: Math.max(0, subtotal - discount),
    })
  } catch (err) {
    next(err)
  }
})

export default router
