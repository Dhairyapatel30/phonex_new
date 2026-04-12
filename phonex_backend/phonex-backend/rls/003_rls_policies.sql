-- ============================================================
-- PHONEX — Migration 003: Row Level Security Policies
-- Run after 002_triggers_functions.sql
-- ============================================================


-- ─── Categories (public read) ─────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT
  USING (true);


-- ─── Products (public read) ───────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  USING (true);

-- Only service_role / admin can write products
CREATE POLICY "products_admin_write"
  ON public.products FOR ALL
  USING (auth.role() = 'service_role');


-- ─── Profiles ─────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- The trigger (SECURITY DEFINER) handles insert — no user insert policy needed


-- ─── Addresses ────────────────────────────────────────────
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_select_own"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "addresses_insert_own"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_update_own"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_delete_own"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);


-- ─── Cart Items ───────────────────────────────────────────
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_select_own"
  ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "cart_insert_own"
  ON public.cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cart_update_own"
  ON public.cart_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cart_delete_own"
  ON public.cart_items FOR DELETE
  USING (auth.uid() = user_id);


-- ─── Wishlist Items ───────────────────────────────────────
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist_select_own"
  ON public.wishlist_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "wishlist_insert_own"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wishlist_delete_own"
  ON public.wishlist_items FOR DELETE
  USING (auth.uid() = user_id);


-- ─── Orders ───────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only create orders for themselves
CREATE POLICY "orders_insert_own"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users cannot directly update orders (only via RPC / service_role)
CREATE POLICY "orders_admin_update"
  ON public.orders FOR UPDATE
  USING (auth.role() = 'service_role');


-- ─── Order Items ──────────────────────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Users can read items belonging to their own orders
CREATE POLICY "order_items_select_own"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

-- Only RPC / service_role inserts order items
CREATE POLICY "order_items_admin_write"
  ON public.order_items FOR INSERT
  WITH CHECK (auth.role() = 'service_role');


-- ─── Reviews ──────────────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can read reviews
CREATE POLICY "reviews_public_read"
  ON public.reviews FOR SELECT
  USING (true);

-- Authenticated users can submit their own review
CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update/delete their own review
CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);


-- ─── Coupons (public read for validation) ─────────────────
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can read active coupons (to validate at checkout)
CREATE POLICY "coupons_public_read"
  ON public.coupons FOR SELECT
  USING (active = true);

-- Only admin/service_role can write coupons
CREATE POLICY "coupons_admin_write"
  ON public.coupons FOR ALL
  USING (auth.role() = 'service_role');
