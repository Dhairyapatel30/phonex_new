import { Smartphone, Headphones, Watch, Tablet, Zap, Package } from 'lucide-react'
import heroDevice from '../assets/hero-device.svg'
import smartphoneImage from '../assets/product-smartphone.svg'
import wearableImage from '../assets/product-wearable.svg'
import tabletImage from '../assets/product-tablet.svg'
import accessoryImage from '../assets/product-accessory.svg'

/**
 * Maps icon_type string from database to a Lucide React component.
 * @param {string} iconType
 * @returns {React.ComponentType}
 */
export function getProductIcon(iconType) {
  switch (iconType) {
    case 'smartphone': return Smartphone
    case 'accessory':  return Headphones
    case 'wearable':   return Watch
    case 'tablet':     return Tablet
    case 'charger':    return Zap
    default:           return Package
  }
}

export function getProductImage(productOrIconType) {
  // Accept either a product object or a raw icon_type string
  if (productOrIconType && typeof productOrIconType === 'object') {
    const imageUrl = productOrIconType.image_url || productOrIconType.imageUrl || productOrIconType.product?.image_url || productOrIconType.product?.imageUrl
    if (imageUrl) return imageUrl
    return fallbackImage(productOrIconType.icon_type || productOrIconType.product?.icon_type)
  }
  return fallbackImage(productOrIconType)
}

function fallbackImage(iconType) {
  switch (iconType) {
    case 'smartphone': return smartphoneImage
    case 'accessory': return accessoryImage
    case 'wearable': return wearableImage
    case 'tablet': return tabletImage
    default: return smartphoneImage
  }
}

export const HERO_IMAGE = heroDevice

/**
 * Returns the tint background class for a category tint_color value.
 */
export function getTintClass(tintColor) {
  switch (tintColor) {
    case 'cream':     return 'bg-cream'
    case 'soft-blue': return 'bg-soft-blue'
    case 'greige':    return 'bg-greige'
    default:          return 'bg-cream'
  }
}

/**
 * Format a price in Indian Rupees using en-IN locale
 * (produces the Indian 1,00,000 grouping).
 */
export function formatPrice(price = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price)
}

// Backwards-compat alias. The name is legacy — it now returns INR.
// Kept so older imports keep working without a sweeping rename.
export const formatPriceUSD = formatPrice
