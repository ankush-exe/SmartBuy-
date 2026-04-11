import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { useLocation, LOCATION_PROMPT_EVENT } from '../hooks/useLocation'

export default function LocationPrompt() {
  const { city, saved, saveLocation } = useLocation()
  const [input, setInput] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [forceVisible, setForceVisible] = useState(false)
  const [status, setStatus] = useState('idle')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (city) {
      setInput(city)
    }
  }, [city])

  useEffect(() => (
    () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  ), [])

  useEffect(() => {
    const handlePromptEvent = (event) => {
      const detail = event.detail || {}
      if (detail.reopen) {
        setDismissed(false)
        setForceVisible(true)
        setStatus('idle')
        setInput(detail.city || city || '')
      } else if (detail.saved) {
        setDismissed(false)
        setForceVisible(false)
        setStatus('idle')
        setInput('')
      }
    }

    window.addEventListener(LOCATION_PROMPT_EVENT, handlePromptEvent)
    return () => window.removeEventListener(LOCATION_PROMPT_EVENT, handlePromptEvent)
  }, [city])

  const handleSave = async (cityOverride) => {
    const cityToSave = (cityOverride || input).trim()
    if (!cityToSave) return
    setStatus('saving')

    try {
      await saveLocation(cityToSave)
      setInput('')
      setSuggestions([])
      setShowSuggestions(false)
      setStatus('saved')
      window.setTimeout(() => {
        setDismissed(true)
        setForceVisible(false)
        setStatus('idle')
      }, 1500)
    } catch {
      setStatus('idle')
    }
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setInput(val)
    setStatus('idle')

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    if (val.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&countrycodes=in&limit=6&format=json&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } },
        )
        if (!res.ok) {
          throw new Error(`City lookup failed with ${res.status}`)
        }

        const data = await res.json()
        const cities = [
          ...new Map(
            data
              .map((item) => item.address?.city || item.address?.town || item.address?.village || item.name)
              .filter(Boolean)
              .map((cityName) => [cityName.toLowerCase(), cityName]),
          ).values(),
        ]

        setSuggestions(cities)
        setShowSuggestions(cities.length > 0)
      } catch {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)
  }

  const handleSelect = (selectedCity) => {
    setInput(selectedCity)
    setSuggestions([])
    setShowSuggestions(false)
    handleSave(selectedCity)
  }

  if ((saved && !forceVisible) || dismissed) return null

  return (
    <div className="w-full max-w-3xl mx-auto mt-4 px-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3">
        <MapPin className="h-4 w-4 flex-shrink-0 text-accent" />

        <span className="flex-shrink-0 text-sm text-text-primary">
          Add your city for delivery estimates
        </span>

        <div className="relative min-w-[180px] flex-1">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave()
              }
            }}
            onBlur={() => {
              window.setTimeout(() => setShowSuggestions(false), 150)
            }}
            placeholder="e.g. Mumbai"
            className="w-full border-b border-accent/30 bg-transparent text-sm text-white placeholder-text-muted focus:border-accent focus:outline-none transition-colors"
          />

          {showSuggestions && suggestions.length > 0 ? (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-white/10 bg-[#0f0f0f] shadow-xl">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  onMouseDown={() => handleSelect(suggestion)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <MapPin className="h-3.5 w-3.5 text-text-muted" />
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          onClick={handleSave}
          className="flex-shrink-0 text-xs font-medium text-accent transition-colors hover:text-accent-glow"
        >
          {status === 'saving' ? 'Saving...' : status === 'saved' ? '✓ Saved' : 'Save'}
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-lg leading-none text-text-muted transition-colors hover:text-text-primary"
        >
          ×
        </button>
      </div>
    </div>
  )
}
