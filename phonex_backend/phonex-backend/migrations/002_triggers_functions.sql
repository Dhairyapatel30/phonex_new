-- ============================================================
-- PHONEX — Migration 002: Triggers & Functions
-- Run after 001_create_tables.sql
-- ============================================================


-- ─── 1. Auto-create profile on signup ─────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── 2. Auto-update updated_at timestamps ─────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to products
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apply to profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apply to cart_items
DROP TRIGGER IF EXISTS trg_cart_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apply to orders
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 3. Recalculate order total on item changes ────────────
CREATE OR REPLACE FUNCTION public.sync_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_subtotal NUMERIC;
BEGIN
  -- Determine which order changed
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  -- Sum all items for this order
  SELECT COALESCE(SUM(total_price), 0)
  INTO v_subtotal
  FROM public.order_items
  WHERE order_id = v_order_id;

  -- Update order subtotal + total (total = subtotal + shipping - discount)
  UPDATE public.orders
  SET
    subtotal   = v_subtotal,
    total      = v_subtotal + shipping_fee - discount,
    updated_at = now()
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_total ON public.order_items;
CREATE TRIGGER trg_sync_order_total
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_total();


-- ─── 4. Decrement stock on order confirmed ─────────────────
CREATE OR REPLACE FUNCTION public.decrement_stock_on_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run when status changes TO 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE public.products p
    SET stock_qty = p.stock_qty - oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND p.id        = oi.product_id;

    -- Mark as out of stock if needed
    UPDATE public.products
    SET in_stock = false
    WHERE stock_qty <= 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock ON public.orders;
CREATE TRIGGER trg_decrement_stock
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_confirm();


-- ─── 5. Restore stock on order cancelled ──────────────────
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status NOT IN ('cancelled', 'refunded') THEN
    UPDATE public.products p
    SET stock_qty = p.stock_qty + oi.quantity,
        in_stock  = true
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND p.id        = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock ON public.orders;
CREATE TRIGGER trg_restore_stock
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_cancel();


-- ─── 6. Ensure only one default address per user ──────────
CREATE OR REPLACE FUNCTION public.enforce_single_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_default_address ON public.addresses;
CREATE TRIGGER trg_single_default_address
  BEFORE INSERT OR UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_default_address();


-- ─── 7. Increment coupon used_count ───────────────────────
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When order status moves to 'confirmed' and has a payment_ref that matches a coupon
  -- (Simplified — in production link via coupon_id FK on orders)
  -- Extend this function with actual coupon_id column logic if needed
  RETURN NEW;
END;
$$;


-- ─── 8. Helper: place_order RPC ───────────────────────────
-- Atomically creates an order + items from user's cart in one transaction
CREATE OR REPLACE FUNCTION public.place_order(
  p_shipping_address JSONB,
  p_shipping_fee     NUMERIC DEFAULT 0,
  p_coupon_code      TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_order_id     UUID;
  v_discount     NUMERIC := 0;
  v_coupon       RECORD;
BEGIN
  -- Validate user
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate cart is not empty
  IF NOT EXISTS (SELECT 1 FROM public.cart_items WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;

  -- Apply coupon if provided
  IF p_coupon_code IS NOT NULL THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE code = UPPER(p_coupon_code)
      AND active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR used_count < max_uses);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or expired coupon: %', p_coupon_code;
    END IF;

    -- Calculate discount (applied after order creation when subtotal is known)
    -- We'll update after inserting items
  END IF;

  -- Create order (totals calculated by trigger)
  INSERT INTO public.orders (
    user_id, status, shipping_fee, shipping_address, currency
  )
  VALUES (
    v_user_id, 'pending', p_shipping_fee, p_shipping_address, 'USD'
  )
  RETURNING id INTO v_order_id;

  -- Insert order items from cart (snapshot product name + price)
  INSERT INTO public.order_items (order_id, product_id, product_name, quantity, unit_price)
  SELECT
    v_order_id,
    ci.product_id,
    p.name,
    ci.quantity,
    p.price
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  WHERE ci.user_id = v_user_id;

  -- Apply coupon discount after subtotal is computed by trigger
  IF v_coupon IS NOT NULL THEN
    IF v_coupon.discount_type = 'percent' THEN
      SELECT subtotal * (v_coupon.discount_value / 100.0)
      INTO v_discount
      FROM public.orders WHERE id = v_order_id;
    ELSE
      v_discount := v_coupon.discount_value;
    END IF;

    UPDATE public.orders
    SET
      discount = v_discount,
      total    = GREATEST(subtotal + shipping_fee - v_discount, 0),
      updated_at = now()
    WHERE id = v_order_id;

    -- Increment coupon usage
    UPDATE public.coupons SET used_count = used_count + 1 WHERE id = v_coupon.id;
  END IF;

  -- Clear cart
  DELETE FROM public.cart_items WHERE user_id = v_user_id;

  RETURN v_order_id;
END;
$$;


-- ─── 9. Helper: get_cart_summary RPC ─────────────────────
CREATE OR REPLACE FUNCTION public.get_cart_summary()
RETURNS TABLE (
  item_count  BIGINT,
  subtotal    NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(SUM(ci.quantity), 0)              AS item_count,
    COALESCE(SUM(ci.quantity * p.price), 0)    AS subtotal
  FROM public.cart_items ci
  JOIN public.products p ON p.id = ci.product_id
  WHERE ci.user_id = auth.uid();
$$;


-- ─── 10. Helper: product search ───────────────────────────
CREATE OR REPLACE FUNCTION public.search_products(query TEXT)
RETURNS SETOF public.products
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.products
  WHERE
    to_tsvector('english', name || ' ' || COALESCE(description, ''))
    @@ plainto_tsquery('english', query)
  ORDER BY featured DESC, created_at DESC;
$$;
