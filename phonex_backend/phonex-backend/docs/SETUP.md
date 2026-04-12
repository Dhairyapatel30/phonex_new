# PHONEX — Backend Setup Guide

## Stack
- **Database:** Supabase (PostgreSQL 15)
- **Auth:** Supabase Auth (Email + Password)
- **Edge Functions:** Deno (TypeScript)
- **Storage:** Supabase Storage (images/avatars)
- **RLS:** Row Level Security on all tables

---

## Prerequisites

1. A [Supabase](https://supabase.com) account (free tier works)
2. [Supabase CLI](https://supabase.com/docs/guides/cli) installed:
   ```bash
   npm install -g supabase
   ```
3. Node.js 18+ (for the frontend)

---

## Step-by-Step Setup

### 1. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose a name (e.g. `phonex`), set a strong DB password, pick a region
4. Wait ~2 minutes for provisioning

---

### 2. Run Migrations in Order

Go to **SQL Editor** in your Supabase dashboard and run each file in order:

| Order | File | Description |
|-------|------|-------------|
| 1 | `migrations/001_create_tables.sql` | All tables + indexes |
| 2 | `migrations/002_triggers_functions.sql` | Triggers, RPC functions |
| 3 | `rls/003_rls_policies.sql` | Row Level Security |
| 4 | `seed/004_seed_data.sql` | Categories, products, coupons |
| 5 | `migrations/005_admin_views.sql` | Analytics views |
| 6 | `migrations/006_storage_buckets.sql` | Storage buckets + policies |

> Paste each file's contents into the SQL Editor and click **Run**.

---

### 3. Configure Auth

In your Supabase dashboard → **Authentication → Settings**:

- **Email confirmations:** Enable (recommended for production)
- **Site URL:** Set to your frontend URL (e.g. `http://localhost:5173` for dev)
- **Redirect URLs:** Add `http://localhost:5173/**` and your production URL

---

### 4. Get Your API Keys

Dashboard → **Settings → API**:

```
Project URL:   https://xxxxxxxxxxxx.supabase.co
Anon Key:      eyJhbGciOiJIUzI1NiIsInR5...  (safe to expose)
Service Role:  eyJhbGciOiJIUzI1NiIsInR5...  (KEEP SECRET)
```

---

### 5. Set Up Environment Variables

In the frontend project root, copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### 6. Deploy Edge Functions (Optional)

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set WEBHOOK_SECRET=your-random-secret
# supabase secrets set RESEND_API_KEY=re_xxxxx  # if using email

# Deploy each function
supabase functions deploy process-order
supabase functions deploy validate-coupon
supabase functions deploy update-order-status
```

---

## Database Schema Overview

```
auth.users               ← Managed by Supabase Auth
    ↓ (trigger)
public.profiles          ← Display name, avatar

public.categories        ← Smartphones / Accessories / etc.
public.products          ← All products with specs (JSONB)

public.cart_items        ← Per-user persistent cart
public.wishlist_items    ← Per-user wishlist

public.orders            ← Order header (status, totals)
public.order_items       ← Order line items (price snapshot)

public.addresses         ← Saved shipping addresses
public.reviews           ← Product reviews (1–5 stars)
public.coupons           ← Discount codes
```

---

## RPC Functions (call from frontend)

```js
// Place an order from current cart
const { data: orderId } = await supabase.rpc('place_order', {
  p_shipping_address: { full_name: 'Raj', line1: '...' },
  p_shipping_fee: 0,
  p_coupon_code: 'WELCOME10',  // optional
})

// Get cart summary (count + subtotal)
const { data } = await supabase.rpc('get_cart_summary')
// → { item_count: 2, subtotal: 1448 }

// Search products
const { data } = await supabase.rpc('search_products', { query: 'titanium watch' })
```

---

## Edge Function Endpoints

### POST `/functions/v1/process-order`
Confirms a pending order and triggers stock decrement.
```json
{ "order_id": "uuid", "payment_ref": "pi_xxx", "payment_method": "card" }
```

### POST `/functions/v1/validate-coupon`
Validates a coupon and returns the discount amount.
```json
{ "code": "WELCOME10", "cart_total": 1299 }
```

### POST `/functions/v1/update-order-status`
Admin/webhook endpoint to update shipping status.
Headers: `x-webhook-secret: your-secret`
```json
{ "order_id": "uuid", "status": "shipped", "tracking_number": "TRK123" }
```

---

## Sample Coupon Codes

| Code | Type | Value | Min Order |
|------|------|-------|-----------|
| `WELCOME10` | % | 10% off | No minimum |
| `PHONEX20` | % | 20% off | $500+ |
| `FLAT50` | Fixed | $50 off | $300+ |

---

## Storage Structure

```
product-images/
  └── {product-slug}.webp

avatars/
  └── {user-id}/avatar.jpg
```

---

## Useful Supabase Dashboard Links

- **Table Editor** → view/edit data
- **SQL Editor** → run queries
- **Authentication → Users** → manage users
- **Storage** → upload/manage images
- **Edge Functions** → logs + invocations
- **Logs** → real-time DB/auth/function logs
