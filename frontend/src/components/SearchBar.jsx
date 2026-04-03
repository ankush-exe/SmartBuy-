import { useState, useRef, useEffect } from 'react'
import { Clock3, Search } from 'lucide-react'
import { useSuggestions } from '../hooks/useSuggestions'

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const {
    suggestions,
    personalCount,
    loading: suggestionsLoading,
  } = useSuggestions(query, focused && !loading)
  const showSuggestions = focused && query.trim() && (suggestionsLoading || suggestions.length > 0)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    setActiveIndex(-1)
  }, [query, suggestions])

  const submitSearch = (value) => {
    const nextQuery = value.trim()
    if (!nextQuery || loading) return
    setQuery(nextQuery)
    onSearch(nextQuery)
    setFocused(false)
    setActiveIndex(-1)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    submitSearch(query)
  }

  const handleSuggestion = (suggestion) => {
    submitSearch(suggestion)
  }

  const handleKeyDown = (e) => {
    if (!suggestions.length) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((current) => (
        current >= suggestions.length - 1 ? 0 : current + 1
      ))
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((current) => (
        current <= 0 ? suggestions.length - 1 : current - 1
      ))
    }

    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSuggestion(suggestions[activeIndex])
    }

    if (e.key === 'Escape') {
      setActiveIndex(-1)
      setFocused(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className={`
          relative flex items-center rounded-2xl border transition-all duration-300
          ${focused
            ? 'border-accent bg-surface shadow-glow-accent'
            : 'border-border bg-void hover:border-text-muted'
          }
        `}>
          {/* Icon */}
          <div className="pl-5 pr-3 flex-shrink-0">
            {loading ? (
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search size={20} className={focused ? 'text-accent' : 'text-text-secondary'} />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="Search any product online…"
            disabled={loading}
            className="
              flex-1 py-4 bg-transparent text-text-primary placeholder-text-muted
              font-body text-base outline-none disabled:opacity-60
            "
          />

          {/* Keyboard hint */}
          {!focused && !query && (
            <kbd className="hidden sm:flex mr-4 items-center gap-1 px-2 py-1 rounded-md
              bg-surface border border-border text-text-muted text-xs font-mono">
              /
            </kbd>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="
              flex-shrink-0 mr-2 px-5 py-2.5 rounded-xl font-display font-semibold text-sm
              bg-accent text-white
              hover:bg-accent-glow active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 py-2 rounded-2xl
          bg-surface border border-border shadow-card z-50 animate-fade-up">
          <p className="px-4 py-1.5 text-xs text-text-muted font-mono uppercase tracking-wider">
            {suggestionsLoading && !suggestions.length ? 'Finding suggestions' : 'Suggestions'}
          </p>
          {suggestionsLoading && !suggestions.length ? (
            <div className="px-4 py-3 text-sm text-text-muted font-body">
              Looking for products that match "{query.trim()}"...
            </div>
          ) : (
            suggestions.map((suggestion, index) => {
              const isPersonal = index < personalCount

              return (
                <button
                  key={suggestion}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSuggestion(suggestion)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left
                    transition-colors text-sm font-body ${
                      activeIndex === index
                        ? 'bg-void text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-void'
                    }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {isPersonal ? (
                      <Clock3 size={14} className="text-accent flex-shrink-0" />
                    ) : (
                      <Search size={14} className="text-text-muted flex-shrink-0" />
                    )}
                    <span className={isPersonal ? 'text-text-primary' : 'text-text-secondary'}>
                      {suggestion}
                    </span>
                  </span>
                  {isPersonal ? (
                    <span className="flex-shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                      Your search
                    </span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
