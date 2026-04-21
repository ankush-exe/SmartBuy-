import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, LocateFixed, MapPin, X } from 'lucide-react'
import { useLocation, LOCATION_PROMPT_EVENT } from '../hooks/useLocation'

export default function LocationPrompt() {
  const { city, saved, loading, saveLocation } = useLocation()
  const [input, setInput] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [forceVisible, setForceVisible] = useState(false)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
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
        setMessage('')
        setInput(detail.city || city || '')
      } else if (detail.saved) {
        setDismissed(false)
        setForceVisible(false)
        setStatus('idle')
        setMessage('')
        setInput('')
      }
    }

    window.addEventListener(LOCATION_PROMPT_EVENT, handlePromptEvent)
    return () => window.removeEventListener(LOCATION_PROMPT_EVENT, handlePromptEvent)
  }, [city])

  const handleSave = async (cityOverride) => {
    const cityToSave = typeof cityOverride === 'string' ? cityOverride.trim() : input.trim()
    if (!cityToSave) {
      setStatus('error')
      setMessage('Enter a city first.')
      return
    }

    setStatus('saving')
    setMessage('')

    try {
      await saveLocation(cityToSave)
      setInput('')
      setSuggestions([])
      setShowSuggestions(false)
      setStatus('saved')
      setMessage(`${cityToSave} saved for delivery estimates.`)
      window.setTimeout(() => {
        setDismissed(true)
        setForceVisible(false)
        setStatus('idle')
        setMessage('')
      }, 1500)
    } catch {
      setStatus('error')
      setMessage('Could not save your city. Please try again.')
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error')
      setMessage('Current location is not supported in this browser.')
      return
    }

    setStatus('locating')
    setMessage('Requesting location permission...')
    setSuggestions([])
    setShowSuggestions(false)

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          setMessage('Finding your nearest city...')
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } },
          )
          if (!res.ok) {
            throw new Error(`Reverse lookup failed with ${res.status}`)
          }

          const data = await res.json()
          const address = data.address || {}
          const detectedCity = address.city || address.town || address.village || address.county || address.state_district

          if (!detectedCity) {
            throw new Error('No city in geocoder response')
          }

          setInput(detectedCity)
          await handleSave(detectedCity)
        } catch {
          setStatus('error')
          setMessage('Could not detect your city. You can type it manually.')
        }
      },
      (error) => {
        setStatus('error')
        if (error.code === error.PERMISSION_DENIED) {
          setMessage('Location permission was denied. Type your city instead.')
        } else {
          setMessage('Could not get your current location. Type your city instead.')
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  const handleInputChange = (e) => {
    const val = e.target.value
    setInput(val)
    setStatus('idle')
    setMessage('')

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

  if ((loading && !forceVisible) || (saved && !forceVisible) || dismissed) return null

  return (
    <div className="w-full max-w-3xl mx-auto mt-4 px-2 sm:px-4">
      <div className="rounded-xl border border-white/10 bg-surface/90 px-4 py-4 text-left shadow-card backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">Set delivery city</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                SmartBuy uses this to show better delivery estimates.
              </p>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Dismiss location prompt"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={status === 'locating' || status === 'saving'}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 text-sm font-medium text-accent transition-colors hover:border-accent/60 hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'locating' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            Use current location
          </button>

          <div className="relative min-w-0 flex-1">
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
              placeholder="Type city, e.g. Mumbai"
              className="h-11 w-full rounded-lg border border-white/10 bg-obsidian/60 px-3 pr-20 text-sm text-white placeholder-text-muted outline-none transition-colors focus:border-accent/70"
            />

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={status === 'saving' || status === 'locating'}
              className="absolute right-1.5 top-1.5 inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 hover:text-accent-glow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : 'Save'}
            </button>

            {showSuggestions && suggestions.length > 0 ? (
              <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-white/10 bg-[#111119] shadow-2xl">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion}-${index}`}
                    onMouseDown={() => handleSelect(suggestion)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <MapPin className="h-3.5 w-3.5 text-text-muted" />
                    <span className="truncate">{suggestion}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {message ? (
          <p className={`mt-3 flex items-center gap-2 text-xs ${
            status === 'error' ? 'text-red-300' : status === 'saved' ? 'text-emerald-300' : 'text-text-secondary'
          }`}>
            {status === 'saved' ? <Check className="h-3.5 w-3.5" /> : null}
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
