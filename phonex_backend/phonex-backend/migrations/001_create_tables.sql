-- ============================================================
-- PHONEX — Migration 001: Create Tables
-- Run this in Supabase → SQL Editor
-- ============================================================

-- ─── Enable UUID extension ────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Categories ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  slug         TEXT        UNIQUE NOT NULL,
  description  TEXT,
  icon_type    TEXT        DEFAULT 'smartphone',
  tint_color   TEXT        DEFAULT 'cream',
  sort_order   INT         DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── Products ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  slug         TEXT        UNIQUE NOT NULL,
  description  TEXT,
  price        NUMERIC     NOT NULL CHECK (price >= 0),
  image_url    TEXT,
  icon_type    TEXT        DEFAULT 'smartphone',
  category_id  UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
  featured     BOOLEAN     DEFAULT false,
  specs        JSONB,        -- Array of [label, value] pairs e.g. [["Display","6.7 OLED"]]
  in_stock     BOOLEAN     DEFAULT true,
  stock_qty    INT         DEFAULT 100,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── Profiles (auto-created on signup) ────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  phone        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── Addresses ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.addresses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label        TEXT        DEFAULT 'Home',   -- Home / Work / Other
  full_name    TEXT        NOT NULL,
  line1        TEXT        NOT NULL,
  line2        TEXT,
  city         TEXT        NOT NULL,
  state        TEXT        NOT NULL,
  postal_code  TEXT        NOT NULL,
  country      TEXT        NOT NULL DEFAULT 'IN',
  phone        TEXT,
  is_default   BOOLEAN     DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── Cart Items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cart_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id   UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity     INT         NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- ─── Wishlists ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id   UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, product_id)
);

-- ─── Orders ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  subtotal         NUMERIC     NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  shipping_fee     NUMERIC     NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  discount         NUMERIC     NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total            NUMERIC     NOT NULL DEFAULT 0 CHECK (total >= 0),
  currency         TEXT        NOT NULL DEFAULT 'USD',
  payment_status   TEXT        NOT NULL DEFAULT 'unpaid'
                               CHECK (payment_status IN ('unpaid','paid','refunded','failed')),
  payment_method   TEXT,
  payment_ref      TEXT,
  shipping_address JSONB,      -- snapshot of address at time of order
  notes            TEXT,
  tracking_number  TEXT,
  shipped_at       TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── Order Items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   UUID        NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT        NOT NULL,  -- snapshot at time of order
  quantity     INT         NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC     NOT NULL CHECK (unit_price >= 0),
  total_price  NUMERIC     GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── Reviews ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating       INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT,
  body         TEXT,
  verified     BOOLEAN     DEFAULT false,  -- verified purchase
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, user_id)
);

-- ─── Coupons ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT        UNIQUE NOT NULL,
  description     TEXT,
  discount_type   TEXT        NOT NULL DEFAULT 'percent'
                              CHECK (discount_type IN ('percent','fixed')),
  discount_value  NUMERIC     NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC     DEFAULT 0,
  max_uses        INT,
  used_count      INT         DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  active          BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category     ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured     ON public.products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_slug         ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_cart_user             ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user           ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status         ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order     ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product       ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user        ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user         ON public.wishlist_items(user_id);
