import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api'

export function useHistory() {
  const { currentUser } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!currentUser) return

    setLoading(true)
    try {
      const token = await currentUser.getIdToken()
      const res = await fetch(`${API_BASE}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error(`History request failed with ${res.status}`)
      }

      const data = await res.json()
      setHistory(Array.isArray(data.history) ? data.history : [])
    } catch (e) {
      console.error('Failed to fetch history', e)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  return { history, loading, fetchHistory }
}
