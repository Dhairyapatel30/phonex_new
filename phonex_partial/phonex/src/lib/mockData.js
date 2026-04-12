// ─── Mock Data ────────────────────────────────────────────
// Use this data when Supabase is not yet configured.
// These IDs are placeholders — real UUIDs come from Supabase.

export const MOCK_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'Smartphones',
    slug: 'smartphones',
    description: 'Flagship devices from leading brands',
    icon_type: 'smartphone',
    tint_color: 'cream',
    sort_order: 1,
  },
  {
    id: 'cat-2',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Cases, chargers, and premium add-ons',
    icon_type: 'accessory',
    tint_color: 'soft-blue',
    sort_order: 2,
  },
  {
    id: 'cat-3',
    name: 'Wearables',
    slug: 'wearables',
    description: 'Watches, bands, and fitness trackers',
    icon_type: 'wearable',
    tint_color: 'cream',
    sort_order: 3,
  },
  {
    id: 'cat-4',
    name: 'Tablets',
    slug: 'tablets',
    description: 'Professional-grade tablets and e-readers',
    icon_type: 'tablet',
    tint_color: 'greige',
    sort_order: 4,
  },
]

export const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Zenith Pro Max',
    slug: 'zenith-pro-max',
    description:
      'Our most advanced smartphone. Featuring a 6.7" ProMotion OLED display, the new A19 Bionic chip, and a triple 48MP camera system engineered for professionals and creatives alike. Perfect for Indian users with 5G connectivity across all major carriers.',
    price: 89999, // INR pricing
    image_url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop&crop=center',
    icon_type: 'smartphone',
    category_id: 'cat-1',
    featured: true,
    specs: [
      ['Display', '6.7" OLED ProMotion'],
      ['Chip', 'A19 Bionic'],
      ['Camera', '48MP Triple System'],
      ['Battery', '4800 mAh'],
      ['Storage', '256GB / 512GB / 1TB'],
      ['Connectivity', '5G + Wi-Fi 7'],
    ],
    categories: { id: 'cat-1', name: 'Smartphones', slug: 'smartphones', tint_color: 'cream' },
  },
  {
    id: 'prod-2',
    name: 'Aura Wireless Buds',
    slug: 'aura-wireless-buds',
    description:
      'Studio-quality sound in a refined, minimal form. Adaptive ANC with transparency mode, 30-hour total battery life, and custom 11mm dynamic drivers tuned by acoustic engineers. Ideal for Indian commutes and work-from-home setups.',
    price: 24999, // INR pricing
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop&crop=center',
    icon_type: 'accessory',
    category_id: 'cat-2',
    featured: true,
    specs: [
      ['Driver', '11mm Dynamic'],
      ['ANC', 'Adaptive Active Noise Cancellation'],
      ['Battery', '30h total (10h + case)'],
      ['Connectivity', 'Bluetooth 5.3'],
      ['Codec', 'LDAC / AAC / SBC'],
      ['IPX', 'IPX4 Splash Resistant'],
    ],
    categories: { id: 'cat-2', name: 'Accessories', slug: 'accessories', tint_color: 'soft-blue' },
  },
  {
    id: 'prod-3',
    name: 'Meridian Watch Ultra',
    slug: 'meridian-watch-ultra',
    description:
      'Precision timekeeping meets advanced health monitoring. A titanium case, sapphire crystal display, and a sensor suite that tracks SpO₂, ECG, body temperature, and more. Designed for the active Indian lifestyle.',
    price: 55999, // INR pricing
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&crop=center',
    icon_type: 'wearable',
    category_id: 'cat-3',
    featured: true,
    specs: [
      ['Display', '1.9" AMOLED, Always-On'],
      ['Sensors', 'SpO₂, ECG, Temp, Gyro'],
      ['Battery', '72 hours (standard)'],
      ['Water Resistance', '100m / 10 ATM'],
      ['Case', 'Grade 5 Titanium'],
      ['Crystal', 'Sapphire'],
    ],
    categories: { id: 'cat-3', name: 'Wearables', slug: 'wearables', tint_color: 'cream' },
  },
  {
    id: 'prod-4',
    name: 'Slate Air 12',
    slug: 'slate-air-12',
    description:
      'Ultra-thin tablet for creators and professionals. Powered by the M3 chip with a 12.9" Liquid Retina XDR display — the studio in your bag. Perfect for Indian students and professionals.',
    price: 69999, // INR pricing
    image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop&crop=center',
    icon_type: 'tablet',
    category_id: 'cat-4',
    featured: false,
    specs: [
      ['Display', '12.9" Liquid Retina XDR'],
      ['Chip', 'M3 (10-core GPU)'],
      ['Storage', '256GB / 512GB / 1TB / 2TB'],
      ['Weight', '468g'],
      ['Connectivity', 'Thunderbolt 4, Wi-Fi 6E'],
      ['Battery', '10 hours'],
    ],
    categories: { id: 'cat-4', name: 'Tablets', slug: 'tablets', tint_color: 'greige' },
  },
  {
    id: 'prod-5',
    name: 'Obsidian Case Pro',
    slug: 'obsidian-case-pro',
    description:
      'Precision-milled aramid fiber case. Military-grade drop protection at 18g, with full MagSafe compatibility and a textured grip that improves with age. Essential protection for Indian users.',
    price: 8999, // INR pricing
    image_url: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=400&h=400&fit=crop&crop=center',
    icon_type: 'accessory',
    category_id: 'cat-2',
    featured: false,
    specs: [
      ['Material', 'Aramid Fiber + Polycarbonate'],
      ['Weight', '18g'],
      ['MagSafe', 'Yes — Full N52 magnet array'],
      ['Protection', 'MIL-STD-810H'],
      ['Thickness', '0.85mm'],
      ['Color', 'Obsidian / Slate / Natural'],
    ],
    categories: { id: 'cat-2', name: 'Accessories', slug: 'accessories', tint_color: 'soft-blue' },
  },
  {
    id: 'prod-6',
    name: 'Pulse Band SE',
    slug: 'pulse-band-se',
    description:
      'Everyday health and fitness tracker with a refined silhouette. Continuous heart rate, SpO₂ monitoring, and 14-day battery life keep you informed around the clock. Perfect for Indian fitness enthusiasts.',
    price: 13999, // INR pricing
    image_url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400&h=400&fit=crop&crop=center',
    icon_type: 'wearable',
    category_id: 'cat-3',
    featured: false,
    specs: [
      ['Display', '1.1" AMOLED'],
      ['Sensors', 'Heart Rate, SpO₂, Stress'],
      ['Battery', '14 days'],
      ['Water', '50m / 5 ATM'],
      ['GPS', 'Connected GPS'],
      ['Strap', '20mm Quick-Release'],
    ],
    categories: { id: 'cat-3', name: 'Wearables', slug: 'wearables', tint_color: 'cream' },
  },
  {
    id: 'prod-7',
    name: 'Eclipse Phone',
    slug: 'eclipse-phone',
    description:
      'A compact flagship with zero compromises. The Snapdragon 8 Gen 4 processor paired with a 6.1" OLED display and a dual 50MP camera makes this the definitive pocket powerhouse. Optimized for Indian networks.',
    price: 69999, // INR pricing
    image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&crop=center',
    icon_type: 'smartphone',
    category_id: 'cat-1',
    featured: false,
    specs: [
      ['Display', '6.1" OLED, 120Hz'],
      ['Chip', 'Snapdragon 8 Gen 4'],
      ['Camera', '50MP Dual (OIS)'],
      ['Battery', '4200 mAh + 65W Fast Charge'],
      ['RAM', '12GB LPDDR5X'],
      ['Storage', '256GB UFS 4.0'],
    ],
    categories: { id: 'cat-1', name: 'Smartphones', slug: 'smartphones', tint_color: 'cream' },
  },
  {
    id: 'prod-8',
    name: 'Volt Charger 65W',
    slug: 'volt-charger-65w',
    description:
      'GaN III technology in a palm-sized charger. 65W across three ports simultaneously — charge a laptop, phone, and tablet without compromise. Essential for Indian power users.',
    price: 5499, // INR pricing
    image_url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop&crop=center',
    icon_type: 'accessory',
    category_id: 'cat-2',
    featured: false,
    specs: [
      ['Total Output', '65W'],
      ['Ports', '2× USB-C + 1× USB-A'],
      ['Technology', 'GaN III'],
      ['Weight', '120g'],
      ['Safety', 'UL Certified, Over-voltage protection'],
      ['Compatibility', 'Universal 100–240V'],
    ],
    categories: { id: 'cat-2', name: 'Accessories', slug: 'accessories', tint_color: 'soft-blue' },
  },
  {
    id: 'prod-9',
    name: 'Nova Tab Mini',
    slug: 'nova-tab-mini',
    description:
      'Compact 8.3" tablet engineered for reading, note-taking, and media. The A16 chip delivers pro-level performance in the most portable form factor. Perfect for Indian students and commuters.',
    price: 41999, // INR pricing
    image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop&crop=center',
    icon_type: 'tablet',
    category_id: 'cat-4',
    featured: false,
    specs: [
      ['Display', '8.3" IPS Liquid Retina'],
      ['Chip', 'A16'],
      ['Storage', '128GB / 256GB'],
      ['Weight', '293g'],
      ['Connectivity', 'USB-C, Wi-Fi 6'],
      ['Battery', '10 hours'],
    ],
    categories: { id: 'cat-4', name: 'Tablets', slug: 'tablets', tint_color: 'greige' },
  },
]
      ['Battery', '12 hours'],
    ],
    categories: { id: 'cat-4', name: 'Tablets', slug: 'tablets', tint_color: 'greige' },
  },
]

export const MARQUEE_ITEMS = [
  'New Arrivals',
  'Free Shipping Over ₹10,000',
  'Curated Technology',
  '2-Year Warranty',
  'Editorial Selection',
  'Premium Materials',
  'Exclusive Members',
  'Priority Support',
]

export const TRUST_STATS = [
  { value: '50K+', label: 'Products Delivered' },
  { value: '4.9', label: 'Average Rating' },
  { value: '120+', label: 'Countries Served' },
  { value: '24/7', label: 'Client Support' },
]
