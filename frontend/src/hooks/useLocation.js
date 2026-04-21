import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../lib/apiBase'
const LOCATION_PROMPT_EVENT = 'smartbuy:location-prompt'
const LOCATION_CACHE_PREFIX = 'smartbuy:location:'

function getLocationCacheKey(uid) {
  return `${LOCATION_CACHE_PREFIX}${uid}`
}

function readCachedLocation(uid) {
  if (!uid || typeof window === 'undefined') return ''

  try {
    return String(window.localStorage.getItem(getLocationCacheKey(uid)) || '').trim()
  } catch {
    return ''
  }
}

function writeCachedLocation(uid, city) {
  if (!uid || typeof window === 'undefined') return

  try {
    const trimmedCity = city.trim()
    if (trimmedCity) {
      window.localStorage.setItem(getLocationCacheKey(uid), trimmedCity)
    } else {
      window.localStorage.removeItem(getLocationCacheKey(uid))
    }
  } catch {
    // Local storage can be blocked; backend persistence still works.
  }
}

export function useLocation() {
  const { currentUser } = useAuth()
  const [city, setCity] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchLocation = useCallback(async () => {
    if (!currentUser) {
      setCity('')
      setSaved(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const cachedCity = readCachedLocation(currentUser.uid)
    if (cachedCity) {
      setCity(cachedCity)
      setSaved(true)
    }

    try {
      const token = await currentUser.getIdToken()
      const res = await fetch(`${API_BASE}/api/user/location`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new Error(`Location request failed with ${res.status}`)
      }
      const data = await res.json()
      const nextCity = String(data.city || '').trim()
      setCity(nextCity)
      setSaved(Boolean(nextCity))
      writeCachedLocation(currentUser.uid, nextCity)
    } catch {
      if (cachedCity) {
        setCity(cachedCity)
        setSaved(true)
      } else {
        setCity('')
        setSaved(false)
      }
    } finally {
      setLoading(false)
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
        if (currentUser && detail.saved !== false) {
          writeCachedLocation(currentUser.uid, nextCity)
        }
        return
      }

      if (detail.reopen) {
        setSaved(false)
      }
    }

    window.addEventListener(LOCATION_PROMPT_EVENT, handlePromptEvent)
    return () => window.removeEventListener(LOCATION_PROMPT_EVENT, handlePromptEvent)
  }, [currentUser])

  const saveLocation = useCallback(async (newCity) => {
    const trimmedCity = newCity.trim()
    if (!currentUser || !trimmedCity) return

    const token = await currentUser.getIdToken()
    const res = await fetch(`${API_BASE}/api/user/location`, {
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

    const data = await res.json()
    const savedCity = String(data.city || trimmedCity).trim()
    setCity(savedCity)
    setSaved(true)
    writeCachedLocation(currentUser.uid, savedCity)
    window.dispatchEvent(new CustomEvent(LOCATION_PROMPT_EVENT, {
      detail: { city: savedCity, saved: true },
    }))
  }, [currentUser])

  const reopenPrompt = useCallback(() => {
    setSaved(false)
    window.dispatchEvent(new CustomEvent(LOCATION_PROMPT_EVENT, {
      detail: { city, saved: false, reopen: true },
    }))
  }, [city])

  return { city, saved, loading, saveLocation, fetchLocation, reopenPrompt }
}

export { LOCATION_PROMPT_EVENT }
