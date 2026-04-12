// REST API client — MongoDB backend replacement for Supabase
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const TOKEN_KEY = 'phonex_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json() : null
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

// ─── Auth ──
export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me', { auth: true }),
  updateProfile: (body) => request('/auth/me', { method: 'PATCH', body, auth: true }),
  addAddress: (body) => request('/auth/addresses', { method: 'POST', body, auth: true }),
  deleteAddress: (id) => request(`/auth/addresses/${id}`, { method: 'DELETE', auth: true }),

  // Categories
  categories: () => request('/categories'),

  // Products
  products: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString()
    return request(`/products${qs ? `?${qs}` : ''}`)
  },
  product: (slug) => request(`/products/${slug}`),
  productReviews: (slug) => request(`/products/${slug}/reviews`),

  // Compatibility checker
  devices: () => request('/products/devices'),
  productsByDevice: (device) =>
    request(`/products/by-device?device=${encodeURIComponent(device)}`),

  // Co-occurrence ("frequently bought together") recommendations for a product
  recommendations: (productId) => request(`/products/${productId}/recommendations`),

  // AI-generated product highlights (positives / negatives)
  productHighlights: (productId) => request(`/products/${productId}/highlights`),

  // Cart
  cart: () => request('/cart', { auth: true }),
  addToCart: (productId, quantity = 1) =>
    request('/cart', { method: 'POST', body: { productId, quantity }, auth: true }),
  updateCart: (id, quantity) =>
    request(`/cart/${id}`, { method: 'PATCH', body: { quantity }, auth: true }),
  removeCart: (id) => request(`/cart/${id}`, { method: 'DELETE', auth: true }),
  clearCart: () => request('/cart', { method: 'DELETE', auth: true }),

  // Wishlist
  wishlist: () => request('/wishlist', { auth: true }),
  addWishlist: (productId) =>
    request('/wishlist', { method: 'POST', body: { productId }, auth: true }),
  removeWishlist: (productId) =>
    request(`/wishlist/${productId}`, { method: 'DELETE', auth: true }),

  // Orders
  orders: () => request('/orders', { auth: true }),
  order: (id) => request(`/orders/${id}`, { auth: true }),
  createOrder: (body) => request('/orders', { method: 'POST', body, auth: true }),
  confirmPayment: (id, reference) =>
    request(`/orders/${id}/confirm-payment`, { method: 'POST', body: { reference }, auth: true }),

  // Chatbot
  chat: (message) => request('/chat', { method: 'POST', body: { message }, auth: true }),

  // Coupons
  validateCoupon: (code) =>
    request('/coupons/validate', { method: 'POST', body: { code }, auth: true }),

  // Reviews
  createReview: (body) => request('/reviews', { method: 'POST', body, auth: true }),

  // Admin — dashboard
  adminStats: () => request('/admin/stats', { auth: true }),

  // Admin — products
  adminCreateProduct: (body) =>
    request('/admin/products', { method: 'POST', body, auth: true }),
  adminUpdateProduct: (id, body) =>
    request(`/admin/products/${id}`, { method: 'PATCH', body, auth: true }),
  adminDeleteProduct: (id) =>
    request(`/admin/products/${id}`, { method: 'DELETE', auth: true }),

  // Admin — orders
  adminOrders: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString()
    return request(`/admin/orders${qs ? `?${qs}` : ''}`, { auth: true })
  },
  adminOrder: (id) => request(`/admin/orders/${id}`, { auth: true }),
  adminUpdateOrderStatus: (id, status) =>
    request(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status }, auth: true }),

  // Admin — payments
  adminPayments: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString()
    return request(`/admin/payments${qs ? `?${qs}` : ''}`, { auth: true })
  },

  // Admin — users
  adminUsers: () => request('/admin/users', { auth: true }),
  adminUpdateUserRole: (id, role) =>
    request(`/admin/users/${id}/role`, { method: 'PATCH', body: { role }, auth: true }),

  // Admin — categories
  adminCategories: () => request('/admin/categories', { auth: true }),
  adminCreateCategory: (body) =>
    request('/admin/categories', { method: 'POST', body, auth: true }),
  adminUpdateCategory: (id, body) =>
    request(`/admin/categories/${id}`, { method: 'PATCH', body, auth: true }),
  adminDeleteCategory: (id) =>
    request(`/admin/categories/${id}`, { method: 'DELETE', auth: true }),

  // Admin — coupons
  adminCoupons: () => request('/admin/coupons', { auth: true }),
  adminCreateCoupon: (body) =>
    request('/admin/coupons', { method: 'POST', body, auth: true }),
  adminDeleteCoupon: (id) =>
    request(`/admin/coupons/${id}`, { method: 'DELETE', auth: true }),
}
