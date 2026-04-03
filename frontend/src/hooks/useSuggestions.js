import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api'

export function useSuggestions(query, enabled) {
  const { currentUser } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [personalCount, setPersonalCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!enabled || !trimmedQuery) {
      setSuggestions([])
      setPersonalCount(0)
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)

      try {
        const params = new URLSearchParams({ q: trimmedQuery, limit: '6' })
        const headers = {}

        if (currentUser?.uid) {
          const token = await currentUser.getIdToken()
          headers.Authorization = `Bearer ${token}`
        }

        const response = await fetch(
          `${API_BASE}/suggestions?${params.toString()}`,
          { headers, signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(`Suggestions request failed with ${response.status}`)
        }

        const data = await response.json()
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
        setPersonalCount(Number.isInteger(data.personal_count) ? data.personal_count : 0)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSuggestions([])
          setPersonalCount(0)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, 220)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [currentUser, enabled, query])

  return { suggestions, personalCount, loading }
}
