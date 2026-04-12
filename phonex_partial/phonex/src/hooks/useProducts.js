import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api.js'

export function useProducts(categorySlug = null, extra = {}) {
  const params = { category: categorySlug || undefined, ...extra };
  console.log('[useProducts] categorySlug:', categorySlug, 'params:', params);
  return useQuery({
    queryKey: ['products', categorySlug, extra],
    queryFn: () => api.products(params),
  })
}

export function useProduct(slug) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.product(slug),
    enabled: !!slug,
  })
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.products({ featured: 'true' }),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.categories(),
  })
}

export function useProductReviews(slug) {
  return useQuery({
    queryKey: ['product-reviews', slug],
    queryFn: () => api.productReviews(slug),
    enabled: !!slug,
  })
}
