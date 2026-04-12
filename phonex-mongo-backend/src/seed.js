import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User, Category, Product, Coupon } from './models/index.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/phonex'

const CATEGORIES = [
  { name: 'Smartphones', slug: 'smartphones', description: 'Flagship devices from leading brands', icon_type: 'smartphone', tint_color: 'cream', sort_order: 1 },
  { name: 'Accessories', slug: 'accessories', description: 'Cases, chargers, and premium add-ons', icon_type: 'accessory', tint_color: 'soft-blue', sort_order: 2 },
  { name: 'Wearables', slug: 'wearables', description: 'Watches, bands, and fitness trackers', icon_type: 'wearable', tint_color: 'cream', sort_order: 3 },
  { name: 'Tablets', slug: 'tablets', description: 'Professional-grade tablets and e-readers', icon_type: 'tablet', tint_color: 'greige', sort_order: 4 },
]

// Unsplash images — free to use, hotlinkable, high quality
const IMG = {
  zenith: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=800&q=80',
  buds: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=800&q=80',
  watch: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
  slate: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=800&q=80',
  case: 'https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=800&q=80',
  band: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80',
  eclipse: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80',
  charger: 'https://images.unsplash.com/photo-1725304382197-663ae3864750?auto=format&fit=crop&w=800&q=80',
  nova: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=800&q=80',
}

// Prices in INR (not USD). Rounded to the nearest realistic MRP
// you'd see on Flipkart / Amazon India.
const PRODUCTS = [
  {
    name: 'Zenith Pro Max', slug: 'zenith-pro-max', price: 89999, featured: true, icon_type: 'smartphone', catSlug: 'smartphones',
    image_url: IMG.zenith,
    description: 'Our most advanced smartphone. Featuring a 6.7" ProMotion OLED display, the A19 Bionic chip, and a triple 48MP camera system.',
    specs: [['Display','6.7" OLED ProMotion'],['Chip','A19 Bionic'],['Camera','48MP Triple System'],['Battery','4800 mAh'],['Storage','256GB / 512GB / 1TB'],['Connectivity','5G + Wi-Fi 7']],
  },
  {
    name: 'Aura Wireless Buds', slug: 'aura-wireless-buds', price: 18999, featured: true, icon_type: 'accessory', catSlug: 'accessories',
    image_url: IMG.buds,
    description: 'Studio-quality sound. Adaptive ANC, 30-hour battery, and custom 11mm drivers tuned by acoustic engineers.',
    specs: [['Driver','11mm Dynamic'],['ANC','Adaptive ANC'],['Battery','30h total'],['Connectivity','Bluetooth 5.3'],['Codec','LDAC / AAC'],['IPX','IPX4']],
    compatibleWith: [
      'iPhone 15', 'iPhone 15 Pro', 'iPhone 14',
      'Samsung Galaxy S24', 'Pixel 8',
      'OnePlus 12', 'Nothing Phone 2', 'Redmi Note 13', 'Realme GT 6', 'Vivo X100',
    ],
  },
  {
    name: 'Meridian Watch Ultra', slug: 'meridian-watch-ultra', price: 49999, featured: true, icon_type: 'wearable', catSlug: 'wearables',
    image_url: IMG.watch,
    description: 'Titanium case, sapphire crystal, and a sensor suite that tracks SpO₂, ECG, body temperature, and more.',
    specs: [['Display','1.9" AMOLED'],['Sensors','SpO₂, ECG, Temp'],['Battery','72 hours'],['Water Resistance','100m / 10 ATM'],['Case','Grade 5 Titanium'],['Crystal','Sapphire']],
    compatibleWith: ['iPhone 15', 'iPhone 15 Pro', 'iPhone 14', 'Samsung Galaxy S24', 'OnePlus 12'],
  },
  {
    name: 'IPAD Air 12 Slate', slug: 'ipad-air-12-slate', price: 74999, featured: false, icon_type: 'tablet', catSlug: 'tablets',
    image_url: IMG.slate,
    description: 'Ultra-thin tablet for creators. M3 chip, 12.9" Liquid Retina XDR — the studio in your bag.',
    specs: [['Display','12.9" Liquid Retina XDR'],['Chip','M3 (10-core GPU)'],['Storage','256GB / 512GB / 1TB'],['Weight','468g'],['Connectivity','Thunderbolt 4'],['Battery','10 hours']],
  },
  {
    name: 'Obsidian Case Pro', slug: 'obsidian-case-pro', price: 2999, featured: false, icon_type: 'accessory', catSlug: 'accessories',
    image_url: IMG.case,
    description: 'Precision-milled aramid fiber case. Military-grade drop protection at 18g with full MagSafe compatibility.',
    specs: [['Material','Aramid Fiber'],['Weight','18g'],['MagSafe','Yes'],['Protection','MIL-STD-810H'],['Thickness','0.85mm'],['Color','Obsidian']],
    compatibleWith: ['iPhone 15', 'iPhone 15 Pro', 'iPhone 14', 'iPhone 13'],
  },
  {
    name: 'Pulse Band SE', slug: 'pulse-band-se', price: 8999, featured: false, icon_type: 'wearable', catSlug: 'wearables',
    image_url: IMG.band,
    description: 'Everyday health tracker. Continuous heart rate, SpO₂ monitoring, and 14-day battery life.',
    specs: [['Display','1.1" AMOLED'],['Sensors','HR, SpO₂, Stress'],['Battery','14 days'],['Water','50m'],['GPS','Connected GPS'],['Strap','20mm Quick-Release']],
    compatibleWith: [
      'iPhone 15', 'Samsung Galaxy S24', 'Pixel 8',
      'OnePlus 12', 'Redmi Note 13', 'Realme GT 6', 'Nothing Phone 2',
    ],
  },
  {
    name: 'Eclipse Phone', slug: 'eclipse-phone', price: 64999, featured: false, icon_type: 'smartphone', catSlug: 'smartphones',
    image_url: IMG.eclipse,
    description: 'A compact flagship. Snapdragon 8 Gen 4, 6.1" OLED 120Hz, and dual 50MP camera.',
    specs: [['Display','6.1" OLED 120Hz'],['Chip','Snapdragon 8 Gen 4'],['Camera','50MP Dual OIS'],['Battery','4200 mAh + 65W'],['RAM','12GB'],['Storage','256GB UFS 4.0']],
  },
  {
    name: '65W Fast Charger', slug: '65w-fast-charger', price: 2499, featured: false, icon_type: 'accessory', catSlug: 'accessories',
    image_url: IMG.charger,
    description: 'GaN III charger. 65W across three ports — charge laptop, phone, and tablet simultaneously.',
    specs: [['Total Output','65W'],['Ports','2× USB-C + 1× USB-A'],['Technology','GaN III'],['Weight','120g'],['Safety','UL Certified'],['Compatibility','100–240V']],
    compatibleWith: [
      'iPhone 15', 'iPhone 14', 'Samsung Galaxy S24', 'Pixel 8',
      'OnePlus 12', 'Nothing Phone 2', 'Redmi Note 13', 'Realme GT 6', 'Vivo X100',
      'MacBook Air', 'iPad Pro',
    ],
  },
  {
    name: 'Nova Tab Mini', slug: 'nova-tab-mini', price: 34999, featured: false, icon_type: 'tablet', catSlug: 'tablets',
    image_url: IMG.nova,
    description: 'Compact 8.3" tablet. A16 chip delivers pro performance in the most portable form factor.',
    specs: [['Display','8.3" Liquid Retina'],['Chip','A16'],['Storage','128GB / 256GB'],['Weight','293g'],['Connectivity','USB-C, Wi-Fi 6'],['Battery','12 hours']],
  },
]

// Coupon values in INR to match the new rupee pricing
const COUPONS = [
  { code: 'WELCOME10', type: 'percent', amount: 10, minSubtotal: 0 },
  { code: 'PHONEX20', type: 'percent', amount: 20, minSubtotal: 40000 },
  { code: 'FLAT500', type: 'flat', amount: 500, minSubtotal: 15000 },
]

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('[seed] connected')

  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
    Coupon.deleteMany({}),
  ])

  const cats = await Category.insertMany(CATEGORIES)
  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c._id]))

  const products = PRODUCTS.map((p) => {
    const { catSlug, ...rest } = p
    return { ...rest, category: catBySlug[catSlug] }
  })
  await Product.insertMany(products)
  await Coupon.insertMany(COUPONS)

  // Ensure demo admin user exists
  const adminEmail = 'admin@phonex.local'
  const existing = await User.findOne({ email: adminEmail })
  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 10)
    await User.create({
      email: adminEmail,
      passwordHash,
      fullName: 'PHONEX Admin',
      role: 'admin',
    })
    console.log('[seed] admin created → admin@phonex.local / admin123')
  }

  console.log('[seed] done')
  await mongoose.disconnect()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
