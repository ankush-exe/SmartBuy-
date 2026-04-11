import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api'
const LOCATION_PROMPT_EVENT = 'smartbuy:location-prompt'

export function useLocation() {
  const { currentUser } = useAuth()
  const [city, setCity] = useState('')
  const [saved, setSaved] = useState(false)

  const fetchLocation = useCallback(async () => {
    if (!currentUser) {
      setCity('')
      setSaved(false)
      return
    }

    try {
      const token = await currentUser.getIdToken()
      const res = await fetch(`${API_BASE}/user/location`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new Error(`Location request failed with ${res.status}`)
      }
      const data = await res.json()
      const nextCity = String(data.city || '').trim()
      setCity(nextCity)
      setSaved(Boolean(nextCity))
    } catch {
      setCity('')
      setSaved(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchLocation()
  }, [fetchLocation])

  useEffect(() => {
    const handlePromptEvent = (event) => {
      const detail = event.detail || {}
      if (typeof detail.city === 'string') {
        const nextCity = detail.city.trim()
        setCity(nextCity)
        setSaved(Boolean(nextCity) && detail.saved !== false)
        return
      }

      if (detail.reopen) {
        setSaved(false)
      }
    }

    window.addEventListener(LOCATION_PROMPT_EVENT, handlePromptEvent)
    return () => window.removeEventListener(LOCATION_PROMPT_EVENT, handlePromptEvent)
  }, [])

  const saveLocation = useCallback(async (newCity) => {
    const trimmedCity = newCity.trim()
    if (!currentUser || !trimmedCity) return

    const token = await currentUser.getIdToken()
    const res = await fetch(`${API_BASE}/user/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ city: trimmedCity }),
    })
    if (!res.ok) {
      throw new Error(`Location save failed with ${res.status}`)
    }

    setCity(trimmedCity)
    setSaved(true)
    window.dispatchEvent(new CustomEvent(LOCATION_PROMPT_EVENT, {
      detail: { city: trimmedCity, saved: true },
    }))
  }, [currentUser])

  const reopenPrompt = useCallback(() => {
    setSaved(false)
    window.dispatchEvent(new CustomEvent(LOCATION_PROMPT_EVENT, {
      detail: { city, saved: false, reopen: true },
    }))
  }, [city])

  return { city, saved, saveLocation, fetchLocation, reopenPrompt }
}

export { LOCATION_PROMPT_EVENT }
