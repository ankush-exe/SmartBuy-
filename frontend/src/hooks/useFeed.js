import { useCallback, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api'

export function useFeed() {
  const { currentUser } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchFeed = useCallback(async () => {
    if (!currentUser) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const token = await currentUser.getIdToken()
      const response = await fetch(`${API_BASE}/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error(`Feed request failed with ${response.status}`)
      }

      const data = await response.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch (error) {
      console.error('Failed to fetch feed', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  return { items, loading, fetchFeed }
}
