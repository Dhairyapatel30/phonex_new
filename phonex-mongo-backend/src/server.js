import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import mongoose from 'mongoose'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.routes.js'
import categoryRoutes from './routes/category.routes.js'
import productRoutes from './routes/product.routes.js'
import cartRoutes from './routes/cart.routes.js'
import wishlistRoutes from './routes/wishlist.routes.js'
import orderRoutes from './routes/order.routes.js'
import couponRoutes from './routes/coupon.routes.js'
import reviewRoutes from './routes/review.routes.js'
import adminRoutes from './routes/admin.routes.js'
import chatRoutes from './routes/chat.routes.js'

const app = express()
const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/phonex'
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: CORS_ORIGIN.split(','), credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

// Basic rate limiting
const limiter = rateLimit({ windowMs: 60_000, max: 120 })
app.use('/api/', limiter)

// Auth routes with stricter limit
const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30 })
app.use('/api/auth', authLimiter, authRoutes)

app.use('/api/categories', categoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/coupons', couponRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/chat', chatRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }))

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('[mongo] connected')
    app.listen(PORT, () => console.log(`[api] http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('[mongo] connection error:', err)
    process.exit(1)
  })
