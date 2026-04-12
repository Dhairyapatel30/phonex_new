# PHONEX — Setup Guide (MongoDB edition)

The project is now split into two independently-run apps:

```
Noopur/
├── phonex-mongo-backend/     # Node/Express + MongoDB API
└── phonex_partial/phonex/    # React + Vite frontend
```

## Prerequisites

- Node.js 18+
- MongoDB running locally at `mongodb://127.0.0.1:27017` (or any URI — set `MONGODB_URI`)

## 1. Start the backend

```bash
cd phonex-mongo-backend
cp .env.example .env        # edit if needed
npm install
npm run seed                # populates categories, products, coupons + admin user
npm run dev                 # http://localhost:5000
```

The seed command creates an admin user:

- **Email:** `admin@phonex.local`
- **Password:** `admin123`

Change it before doing anything real.

## 2. Start the frontend

```bash
cd phonex_partial/phonex
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                 # http://localhost:5173
```

## What's included

### Backend (`phonex-mongo-backend`)

- Express + Mongoose, JWT auth (bcrypt-hashed passwords)
- Rate limiting on all routes, stricter on `/api/auth`
- Routes: `auth`, `categories`, `products`, `cart`, `wishlist`, `orders`,
  `coupons`, `reviews`, `admin`
- Admin-only endpoints for product/order/coupon CRUD and stats
- Atomic stock decrement + coupon application at order time

### Frontend (`phonex_partial/phonex`)

- `src/lib/api.js` — typed REST client replacing Supabase
- `src/contexts/AuthContext.jsx` — JWT stored in `localStorage`
- `src/pages/` — new pages:
  - `LoginPage`, `RegisterPage`
  - `CartPage` (qty controls, remove)
  - `CheckoutPage` (address + coupon + payment method)
  - `OrdersPage` + `OrderDetailPage`
  - `WishlistPage`
  - `AccountPage` (profile + saved addresses)
  - `AdminPage` (stats, products CRUD, orders, coupons)
  - `AboutPage`, `NotFoundPage`
- `src/components/ErrorBoundary.jsx` — global error fallback
- Category page: search, sort, min/max price filters (URL-driven)
- Product page: quantity picker, wishlist toggle, reviews list + submit

## API quick reference

| Method | Path                              | Auth  |
| ------ | --------------------------------- | ----- |
| POST   | /api/auth/register                | —     |
| POST   | /api/auth/login                   | —     |
| GET    | /api/auth/me                      | user  |
| GET    | /api/categories                   | —     |
| GET    | /api/products?category=&q=&sort=  | —     |
| GET    | /api/products/:slug               | —     |
| GET    | /api/products/:slug/reviews       | —     |
| GET    | /api/cart                         | user  |
| POST   | /api/cart                         | user  |
| PATCH  | /api/cart/:id                     | user  |
| DELETE | /api/cart/:id                     | user  |
| GET    | /api/wishlist                     | user  |
| POST   | /api/wishlist                     | user  |
| GET    | /api/orders                       | user  |
| POST   | /api/orders                       | user  |
| POST   | /api/coupons/validate             | user  |
| POST   | /api/reviews                      | user  |
| GET    | /api/admin/stats                  | admin |
| *      | /api/admin/products\|orders\|coupons | admin |

## Seeded coupons

- `WELCOME10` — 10% off (no minimum)
- `PHONEX20` — 20% off orders $500+
- `FLAT50` — $50 off orders $200+

## Notes

- The old `phonex_backend/phonex-backend` (Supabase) folder is no longer used.
- `src/lib/supabase.js` is a deprecated stub and can be deleted once you're sure nothing imports it.
- `src/lib/mockData.js` is no longer referenced by the app (products come from Mongo).
