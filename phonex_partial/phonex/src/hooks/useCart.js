import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '../lib/api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export function useCart() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => api.cart(),
    enabled: !!user,
  })
}

export function useCartCount() {
  const { data: cart = [] } = useCart()
  return useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
}

export function useAddToCart() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ product, quantity = 1 }) => {
      if (!user) throw new Error('Please sign in to add items to your cart')
      return api.addToCart(product.id, quantity)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart', user?.id] }),
  })
}

export function useUpdateCartItem() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, quantity }) => api.updateCart(itemId, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart', user?.id] }),
  })
}

export function useRemoveCartItem() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId) => api.removeCart(itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart', user?.id] }),
  })
}

export function useClearCart() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.clearCart(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart', user?.id] }),
  })
}

// ─── Wishlist ──
export function useWishlist() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: () => api.wishlist(),
    enabled: !!user,
  })
}

export function useAddWishlist() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productId) => api.addWishlist(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist', user?.id] }),
  })
}

export function useRemoveWishlist() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (productId) => api.removeWishlist(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist', user?.id] }),
  })
}
