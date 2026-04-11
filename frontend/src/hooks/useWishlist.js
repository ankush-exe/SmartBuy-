import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api'

export function useWishlist() {
  const { currentUser } = useAuth()
  const [wishlist, setWishlist] = useState(new Set())
  const [loading, setLoading] = useState(false)

  const fetchWishlist = useCallback(async () => {
    if (!currentUser) {
      setWishlist(new Set())
      return
    }

    try {
      const token = await currentUser.getIdToken()
      const res = await fetch(`${API_BASE}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new Error(`Wishlist request failed with ${res.status}`)
      }
      const data = await res.json()
      setWishlist(new Set((data.wishlist || []).map((item) => item.id)))
    } catch (error) {
      console.error('Failed to fetch wishlist', error)
    }
  }, [currentUser])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const toggle = useCallback(async (product) => {
    if (!currentUser) return

    setLoading(true)
    try {
      const token = await currentUser.getIdToken()
      const id = product.product_id

      if (wishlist.has(id)) {
        const res = await fetch(`${API_BASE}/wishlist/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          throw new Error(`Wishlist delete failed with ${res.status}`)
        }
        setWishlist((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      } else {
        const res = await fetch(`${API_BASE}/wishlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(product),
        })
        if (!res.ok) {
          throw new Error(`Wishlist save failed with ${res.status}`)
        }
        setWishlist((prev) => new Set(prev).add(id))
      }
    } catch (error) {
      console.error('Wishlist toggle failed', error)
    } finally {
      setLoading(false)
    }
  }, [currentUser, wishlist])

  return { wishlist, toggle, loading, fetchWishlist }
}
