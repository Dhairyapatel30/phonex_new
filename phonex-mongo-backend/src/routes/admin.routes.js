import { Router } from 'express'
import mongoose from 'mongoose'
import { Product, Category, Order, Coupon, User } from '../models/index.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requireAdmin)

const { ObjectId } = mongoose.Types

/* ─────────────────────────────────────────────────────────────
 *  Dashboard / stats
 * ──────────────────────────────────────────────────────────── */

// GET /api/admin/stats
// Returns a rich payload suitable for the dashboard:
// counts, total revenue, 30-day revenue timeseries, status breakdown,
// top selling products, and low-stock warnings.
router.get('/stats', async (_req, res, next) => {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      productsCount,
      ordersCount,
      usersCount,
      revenueAgg,
      statusBreakdown,
      revenueTimeseries,
      topProducts,
      lowStock,
      recentOrders,
    ] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments(),

      // Total revenue only counts paid / shipped / delivered orders
      Order.aggregate([
        { $match: { status: { $in: ['paid', 'shipped', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),

      // Orders grouped by status
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

      // Daily revenue for the last 30 days
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top 5 best selling products by quantity sold
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.unit_price', '$items.quantity'] } },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 5 },
      ]),

      // Products running low on stock
      Product.find({ stock: { $lte: 10 } })
        .select('name slug stock price image_url')
        .sort({ stock: 1 })
        .limit(5),

      // Most recent 5 orders
      Order.find().populate('user', 'email fullName').sort({ createdAt: -1 }).limit(5),
    ])

    res.json({
      products: productsCount,
      orders: ordersCount,
      users: usersCount,
      revenue: revenueAgg[0]?.total || 0,
      statusBreakdown: statusBreakdown.reduce(
        (acc, s) => ({ ...acc, [s._id]: s.count }),
        {}
      ),
      revenueTimeseries,
      topProducts,
      lowStock,
      recentOrders,
    })
  } catch (err) {
    next(err)
  }
})

/* ─────────────────────────────────────────────────────────────
 *  Products CRUD
 * ──────────────────────────────────────────────────────────── */
router.post('/products', async (req, res, next) => {
  try {
    const product = await Product.create(req.body)
    res.json(product)
  } catch (err) {
    next(err)
  }
})

router.patch('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json(product)
  } catch (err) {
    next(err)
  }
})

router.delete('/products/:id', async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/* ─────────────────────────────────────────────────────────────
 *  Orders + Payments
 * ──────────────────────────────────────────────────────────── */
router.get('/orders', async (req, res, next) => {
  try {
    const { status, q } = req.query
    const filter = {}
    if (status) filter.status = status
    if (q && ObjectId.isValid(q)) filter._id = new ObjectId(q)

    const orders = await Order.find(filter)
      .populate('user', 'email fullName')
      .sort({ createdAt: -1 })
      .limit(200)
    res.json(orders)
  } catch (err) {
    next(err)
  }
})

router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'email fullName')
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json(order)
  } catch (err) {
    next(err)
  }
})

router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body || {}
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true })
    res.json(order)
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/payments
// Flat "payments" view derived from orders. Includes method, reference,
// amount, status and user for every order.
router.get('/payments', async (req, res, next) => {
  try {
    const { method } = req.query
    const filter = {}
    if (method) filter['payment.method'] = method

    const orders = await Order.find(filter)
      .populate('user', 'email fullName')
      .sort({ createdAt: -1 })
      .limit(200)

    const payments = orders.map((o) => ({
      id: o._id,
      orderId: o._id,
      user: o.user,
      amount: o.total,
      method: o.payment?.method || 'cod',
      reference: o.payment?.reference || null,
      status: o.status,
      createdAt: o.createdAt,
    }))

    res.json(payments)
  } catch (err) {
    next(err)
  }
})

/* ─────────────────────────────────────────────────────────────
 *  Users management
 * ──────────────────────────────────────────────────────────── */
router.get('/users', async (_req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).limit(500)

    // Decorate with order counts via a single aggregation
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          orders: { $sum: 1 },
          spent: { $sum: '$total' },
        },
      },
    ])
    const byId = new Map(orderStats.map((s) => [s._id.toString(), s]))

    res.json(
      users.map((u) => ({
        id: u._id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        createdAt: u.createdAt,
        orders: byId.get(u._id.toString())?.orders || 0,
        spent: byId.get(u._id.toString())?.spent || 0,
      }))
    )
  } catch (err) {
    next(err)
  }
})

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body || {}
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select(
      '-passwordHash'
    )
    res.json(user)
  } catch (err) {
    next(err)
  }
})

/* ─────────────────────────────────────────────────────────────
 *  Categories CRUD
 * ──────────────────────────────────────────────────────────── */
router.get('/categories', async (_req, res, next) => {
  try {
    const cats = await Category.find().sort({ sort_order: 1 })
    res.json(cats)
  } catch (err) {
    next(err)
  }
})

router.post('/categories', async (req, res, next) => {
  try {
    const cat = await Category.create(req.body)
    res.json(cat)
  } catch (err) {
    next(err)
  }
})

router.patch('/categories/:id', async (req, res, next) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json(cat)
  } catch (err) {
    next(err)
  }
})

router.delete('/categories/:id', async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

/* ─────────────────────────────────────────────────────────────
 *  Coupons (existing)
 * ──────────────────────────────────────────────────────────── */
router.get('/coupons', async (_req, res, next) => {
  try {
    res.json(await Coupon.find().sort({ createdAt: -1 }))
  } catch (err) {
    next(err)
  }
})

router.post('/coupons', async (req, res, next) => {
  try {
    res.json(await Coupon.create(req.body))
  } catch (err) {
    next(err)
  }
})

router.delete('/coupons/:id', async (req, res, next) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
