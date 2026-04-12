-- ============================================================
-- PHONEX — Migration 005: Admin Views & Analytics
-- Run after 003_rls_policies.sql
-- ============================================================


-- ─── View: Order summary with user info ───────────────────
CREATE OR REPLACE VIEW public.v_orders_summary AS
SELECT
  o.id,
  o.status,
  o.payment_status,
  o.subtotal,
  o.shipping_fee,
  o.discount,
  o.total,
  o.currency,
  o.tracking_number,
  o.created_at,
  o.updated_at,
  u.email        AS user_email,
  p.display_name AS user_name,
  COUNT(oi.id)   AS item_count
FROM public.orders o
JOIN auth.users u  ON u.id = o.user_id
JOIN public.profiles p ON p.user_id = o.user_id
LEFT JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY o.id, u.email, p.display_name;


-- ─── View: Product sales performance ─────────────────────
CREATE OR REPLACE VIEW public.v_product_sales AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.price,
  p.stock_qty,
  p.in_stock,
  c.name                         AS category,
  COALESCE(SUM(oi.quantity), 0)  AS units_sold,
  COALESCE(SUM(oi.total_price), 0) AS revenue
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
LEFT JOIN public.order_items oi ON oi.product_id = p.id
LEFT JOIN public.orders o ON o.id = oi.order_id
  AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY p.id, c.name
ORDER BY revenue DESC;


-- ─── View: Daily revenue (last 90 days) ───────────────────
CREATE OR REPLACE VIEW public.v_daily_revenue AS
SELECT
  DATE(o.created_at)        AS day,
  COUNT(DISTINCT o.id)      AS order_count,
  SUM(o.total)              AS revenue
FROM public.orders o
WHERE
  o.status NOT IN ('cancelled', 'refunded')
  AND o.created_at >= now() - INTERVAL '90 days'
GROUP BY DATE(o.created_at)
ORDER BY day DESC;


-- ─── View: Average product rating ─────────────────────────
CREATE OR REPLACE VIEW public.v_product_ratings AS
SELECT
  p.id,
  p.name,
  p.slug,
  ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
  COUNT(r.id)                       AS review_count
FROM public.products p
LEFT JOIN public.reviews r ON r.product_id = p.id
GROUP BY p.id;


-- ─── Function: Dashboard KPIs ─────────────────────────────
-- Returns key stats for an admin dashboard.
-- Call via: SELECT * FROM public.get_dashboard_kpis();
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis()
RETURNS TABLE (
  total_revenue       NUMERIC,
  revenue_this_month  NUMERIC,
  total_orders        BIGINT,
  orders_this_month   BIGINT,
  total_customers     BIGINT,
  avg_order_value     NUMERIC,
  pending_orders      BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    (SELECT COALESCE(SUM(total), 0) FROM public.orders
     WHERE status NOT IN ('cancelled','refunded'))                        AS total_revenue,
    (SELECT COALESCE(SUM(total), 0) FROM public.orders
     WHERE status NOT IN ('cancelled','refunded')
       AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now())) AS revenue_this_month,
    (SELECT COUNT(*) FROM public.orders
     WHERE status NOT IN ('cancelled','refunded'))                        AS total_orders,
    (SELECT COUNT(*) FROM public.orders
     WHERE status NOT IN ('cancelled','refunded')
       AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now())) AS orders_this_month,
    (SELECT COUNT(*) FROM public.profiles)                                AS total_customers,
    (SELECT ROUND(AVG(total)::numeric, 2) FROM public.orders
     WHERE status NOT IN ('cancelled','refunded'))                        AS avg_order_value,
    (SELECT COUNT(*) FROM public.orders WHERE status = 'pending')         AS pending_orders;
$$;


-- ─── Function: Top selling products ───────────────────────
CREATE OR REPLACE FUNCTION public.get_top_products(limit_n INT DEFAULT 5)
RETURNS TABLE (
  product_id   UUID,
  name         TEXT,
  units_sold   BIGINT,
  revenue      NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.name,
    COALESCE(SUM(oi.quantity), 0)      AS units_sold,
    COALESCE(SUM(oi.total_price), 0)   AS revenue
  FROM public.products p
  LEFT JOIN public.order_items oi ON oi.product_id = p.id
  LEFT JOIN public.orders o ON o.id = oi.order_id
    AND o.status NOT IN ('cancelled','refunded')
  GROUP BY p.id
  ORDER BY units_sold DESC
  LIMIT limit_n;
$$;
