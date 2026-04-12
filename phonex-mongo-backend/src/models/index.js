import mongoose from 'mongoose'

const { Schema, model, Types } = mongoose

// ─── User ────────────────────────────────────────────────
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    addresses: [
      {
        label: String,
        line1: String,
        line2: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        phone: String,
      },
    ],
  },
  { timestamps: true }
)

// ─── Category ────────────────────────────────────────────
const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    icon_type: String,
    tint_color: String,
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// ─── Product ─────────────────────────────────────────────
const productSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    icon_type: String,
    image_url: String,
    category: { type: Types.ObjectId, ref: 'Category', required: true },
    featured: { type: Boolean, default: false },
    stock: { type: Number, default: 100 },
    specs: [[String]], // array of [label, value] tuples
    // Devices this product is compatible with (e.g. accessories).
    // Example: ["iPhone 15", "iPhone 15 Pro", "Pixel 8"]
    compatibleWith: { type: [String], default: [] },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

productSchema.index({ name: 'text', description: 'text' })
productSchema.index({ compatibleWith: 1 })

// ─── CartItem ────────────────────────────────────────────
const cartItemSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
)
cartItemSchema.index({ user: 1, product: 1 }, { unique: true })

// ─── WishlistItem ────────────────────────────────────────
const wishlistItemSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: true }
)
wishlistItemSchema.index({ user: 1, product: 1 }, { unique: true })

// ─── Order ───────────────────────────────────────────────
const orderSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    items: [
      {
        product: { type: Types.ObjectId, ref: 'Product', required: true },
        name: String,
        unit_price: Number,
        quantity: Number,
      },
    ],
    subtotal: Number,
    discount: { type: Number, default: 0 },
    couponCode: String,
    total: { type: Number, required: true },
    shipping_address: Object,
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    payment: {
      method: String, // 'cod' | 'card' (demo)
      reference: String,
    },
  },
  { timestamps: true }
)

// ─── Coupon ──────────────────────────────────────────────
const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, enum: ['percent', 'flat'], required: true },
    amount: { type: Number, required: true }, // percent (e.g. 10) or flat amount
    minSubtotal: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiresAt: Date,
  },
  { timestamps: true }
)

// ─── Review ──────────────────────────────────────────────
const reviewSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    product: { type: Types.ObjectId, ref: 'Product', required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: String,
    body: String,
  },
  { timestamps: true }
)
reviewSchema.index({ user: 1, product: 1 }, { unique: true })

// ─── RecommendationCache ────────────────────────────────
// One row per product, storing the latest "frequently bought together"
// lookup. Refreshed lazily — if the row is older than CACHE_TTL_MS the
// route recomputes and overwrites it.
const recommendationCacheSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: 'Product', required: true, unique: true },
    recommendations: [{ type: Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
)

export const User = model('User', userSchema)
export const Category = model('Category', categorySchema)
export const Product = model('Product', productSchema)
export const CartItem = model('CartItem', cartItemSchema)
export const WishlistItem = model('WishlistItem', wishlistItemSchema)
export const Order = model('Order', orderSchema)
export const Coupon = model('Coupon', couponSchema)
export const Review = model('Review', reviewSchema)
export const RecommendationCache = model('RecommendationCache', recommendationCacheSchema)
