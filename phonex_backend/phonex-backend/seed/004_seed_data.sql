-- ============================================================
-- PHONEX — Seed Data
-- Run after 003_rls_policies.sql
-- Safe to re-run (uses ON CONFLICT DO NOTHING)
-- ============================================================


-- ─── Categories ───────────────────────────────────────────
INSERT INTO public.categories (name, slug, description, icon_type, tint_color, sort_order)
VALUES
  ('Smartphones',  'smartphones',  'Flagship devices from leading brands',          'smartphone', 'cream',     1),
  ('Accessories',  'accessories',  'Cases, chargers, and premium add-ons',          'accessory',  'soft-blue', 2),
  ('Wearables',    'wearables',    'Watches, bands, and fitness trackers',           'wearable',   'cream',     3),
  ('Tablets',      'tablets',      'Professional-grade tablets and e-readers',       'tablet',     'greige',    4)
ON CONFLICT (slug) DO NOTHING;


-- ─── Products ─────────────────────────────────────────────
INSERT INTO public.products
  (name, slug, description, price, icon_type, category_id, featured, in_stock, stock_qty, specs)
VALUES

-- Smartphones
(
  'Zenith Pro Max', 'zenith-pro-max',
  'Our most advanced smartphone. Featuring a 6.7" ProMotion OLED display, the A19 Bionic chip, and a triple 48MP camera system engineered for professionals and creatives alike.',
  1299, 'smartphone',
  (SELECT id FROM public.categories WHERE slug = 'smartphones'),
  true, true, 50,
  '[["Display","6.7\" OLED ProMotion 120Hz"],["Chip","A19 Bionic"],["Camera","48MP Triple System (OIS)"],["Battery","4800 mAh — All-day"],["Storage","256GB / 512GB / 1TB"],["Connectivity","5G + Wi-Fi 7"]]'
),
(
  'Eclipse Phone', 'eclipse-phone',
  'A compact flagship with zero compromises. The Snapdragon 8 Gen 4 processor paired with a 6.1" OLED and dual 50MP camera makes this the definitive pocket powerhouse.',
  999, 'smartphone',
  (SELECT id FROM public.categories WHERE slug = 'smartphones'),
  false, true, 75,
  '[["Display","6.1\" OLED 120Hz"],["Chip","Snapdragon 8 Gen 4"],["Camera","50MP Dual (OIS)"],["Battery","4200 mAh + 65W Fast Charge"],["RAM","12GB LPDDR5X"],["Storage","256GB UFS 4.0"]]'
),
(
  'Solstice Ultra', 'solstice-ultra',
  'A titanium-framed powerhouse with a satellite connectivity chip, periscope zoom lens, and the largest battery in the lineup. For those who demand the absolute best.',
  1599, 'smartphone',
  (SELECT id FROM public.categories WHERE slug = 'smartphones'),
  false, true, 30,
  '[["Display","6.9\" LTPO OLED 1–120Hz"],["Chip","A19 Pro"],["Camera","50MP Triple + 10× Periscope"],["Battery","5500 mAh"],["Frame","Grade 5 Titanium"],["Extra","Satellite SOS"]]'
),

-- Accessories
(
  'Aura Wireless Buds', 'aura-wireless-buds',
  'Studio-quality sound in a refined, minimal form. Adaptive ANC with transparency mode, 30-hour total battery life, and custom 11mm dynamic drivers tuned by acoustic engineers.',
  349, 'accessory',
  (SELECT id FROM public.categories WHERE slug = 'accessories'),
  true, true, 120,
  '[["Driver","11mm Dynamic"],["ANC","Adaptive Active Noise Cancellation"],["Battery","30h total (10h + case)"],["Connectivity","Bluetooth 5.3"],["Codec","LDAC / AAC / SBC"],["IPX","IPX4 Splash Resistant"]]'
),
(
  'Obsidian Case Pro', 'obsidian-case-pro',
  'Precision-milled aramid fiber case. Military-grade drop protection at 18g with full MagSafe compatibility and a textured grip that improves with age.',
  129, 'accessory',
  (SELECT id FROM public.categories WHERE slug = 'accessories'),
  false, true, 200,
  '[["Material","Aramid Fiber + Polycarbonate"],["Weight","18g"],["MagSafe","Yes — Full N52 magnet array"],["Protection","MIL-STD-810H"],["Thickness","0.85mm"],["Colors","Obsidian / Slate / Natural"]]'
),
(
  'Volt Charger 65W', 'volt-charger-65w',
  'GaN III technology in a palm-sized charger. 65W across three ports simultaneously — charge a laptop, phone, and tablet without compromise.',
  79, 'accessory',
  (SELECT id FROM public.categories WHERE slug = 'accessories'),
  false, true, 300,
  '[["Total Output","65W"],["Ports","2× USB-C + 1× USB-A"],["Technology","GaN III"],["Weight","120g"],["Safety","UL Certified, Over-voltage protection"],["Compatibility","Universal 100–240V"]]'
),
(
  'Crystal Screen Guard', 'crystal-screen-guard',
  'Tempered glass screen protector with anti-fingerprint oleophobic coating, 9H hardness, and edge-to-edge fit for zero interference with touch sensitivity.',
  39, 'accessory',
  (SELECT id FROM public.categories WHERE slug = 'accessories'),
  false, true, 500,
  '[["Hardness","9H Tempered Glass"],["Coating","Anti-fingerprint Oleophobic"],["Thickness","0.33mm"],["Compatibility","Zenith Pro Max / Eclipse"],["Installation","Dust-free kit included"],["Pack","2 units"]]'
),

-- Wearables
(
  'Meridian Watch Ultra', 'meridian-watch-ultra',
  'Precision timekeeping meets advanced health monitoring. A titanium case, sapphire crystal, and a sensor suite that tracks SpO₂, ECG, body temperature and more.',
  799, 'wearable',
  (SELECT id FROM public.categories WHERE slug = 'wearables'),
  true, true, 60,
  '[["Display","1.9\" AMOLED Always-On"],["Sensors","SpO₂, ECG, Temp, Gyro"],["Battery","72 hours standard"],["Water","100m / 10 ATM"],["Case","Grade 5 Titanium"],["Crystal","Sapphire"]]'
),
(
  'Pulse Band SE', 'pulse-band-se',
  'Everyday health and fitness tracker with a refined silhouette. Continuous heart rate, SpO₂ monitoring, and 14-day battery life keep you informed around the clock.',
  199, 'wearable',
  (SELECT id FROM public.categories WHERE slug = 'wearables'),
  false, true, 150,
  '[["Display","1.1\" AMOLED"],["Sensors","Heart Rate, SpO₂, Stress"],["Battery","14 days"],["Water","50m / 5 ATM"],["GPS","Connected GPS"],["Strap","20mm Quick-Release"]]'
),

-- Tablets
(
  'Slate Air 12', 'slate-air-12',
  'Ultra-thin tablet for creators and professionals. Powered by the M3 chip with a 12.9" Liquid Retina XDR display — the studio in your bag.',
  999, 'tablet',
  (SELECT id FROM public.categories WHERE slug = 'tablets'),
  false, true, 40,
  '[["Display","12.9\" Liquid Retina XDR"],["Chip","M3 (10-core GPU)"],["Storage","256GB / 512GB / 1TB / 2TB"],["Weight","468g"],["Connectivity","Thunderbolt 4, Wi-Fi 6E"],["Battery","10 hours"]]'
),
(
  'Nova Tab Mini', 'nova-tab-mini',
  'Compact 8.3" tablet engineered for reading, note-taking, and media. The A16 chip delivers pro-level performance in the most portable form factor.',
  599, 'tablet',
  (SELECT id FROM public.categories WHERE slug = 'tablets'),
  false, true, 80,
  '[["Display","8.3\" IPS Liquid Retina"],["Chip","A16"],["Storage","128GB / 256GB"],["Weight","293g"],["Connectivity","USB-C, Wi-Fi 6"],["Battery","12 hours"]]'
)
ON CONFLICT (slug) DO NOTHING;


-- ─── Sample Coupons ────────────────────────────────────────
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_value, max_uses, active)
VALUES
  ('WELCOME10',  '10% off your first order',          'percent', 10,  0,    1000, true),
  ('PHONEX20',   '20% off orders over $500',          'percent', 20,  500,  500,  true),
  ('FLAT50',     '$50 off orders over $300',          'fixed',   50,  300,  200,  true),
  ('LAUNCH2024', 'Launch special — 15% off anything', 'percent', 15,  0,    100,  false)
ON CONFLICT (code) DO NOTHING;
