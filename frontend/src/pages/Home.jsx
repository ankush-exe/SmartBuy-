import { useState, useMemo, useEffect } from 'react'
import { AlertTriangle, FilterX } from 'lucide-react'
import { useSearch } from '../hooks/useSearch'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../hooks/useLocation'
import { useWishlist } from '../hooks/useWishlist'
import HeroHeader from '../components/HeroHeader'
import SearchBar from '../components/SearchBar'
import RecentSearches from '../components/RecentSearches'
import LocationPrompt from '../components/LocationPrompt'
import ProductCard from '../components/ProductCard'
import ExplanationBox from '../components/ExplanationBox'
import LoadingSkeleton from '../components/LoadingSkeleton'
import FilterSidebar from '../components/FilterSidebar'

export default function Home() {
  const { currentUser } = useAuth()
  const { city } = useLocation()
  const { wishlist, toggle: toggleWishlist } = useWishlist()
  const { search, loading, result, error } = useSearch()
  const [recentSearchRefreshKey, setRecentSearchRefreshKey] = useState(0)
  const [lastQuery, setLastQuery] = useState('')
  
  const isMockSource = result && ['mock', 'fallback'].includes(result.data_source)
  const sourceLabel = isMockSource
    ? 'Curated Mock Catalog'
    : result?.data_source === 'google-shopping'
    ? 'Live Google Shopping'
    : result?.data_source

  // Filtering states
  const [sortOrder, setSortOrder] = useState('relevance')
  const [filters, setFilters] = useState({
    sources: {},
    priceRange: { min: '', max: '' },
    minRating: 0,
    inStockOnly: false,
  })

  const resetFilters = (sources = availableSources) => {
    const initialSources = {}
    sources.forEach((source) => {
      initialSources[source] = true
    })
    setFilters({
      sources: initialSources,
      priceRange: { min: '', max: '' },
      minRating: 0,
      inStockOnly: false,
    })
    setSortOrder('relevance')
  }

  // Extract available sources from results
  const availableSources = useMemo(() => {
    if (!result?.results) return []
    const sources = new Set(result.results.map((r) => r.source))
    if (result.best) sources.add(result.best.source)
    return Array.from(sources)
  }, [result])

  // Initialize sources to "all checked" when new results arrive
  useEffect(() => {
    if (availableSources.length > 0) {
      resetFilters(availableSources)
    }
  }, [result]) // reset when new result comes

  const productPassesFilters = (product) => {
    if (!product) return false

    const hasSourceFilters = Object.keys(filters.sources).length > 0
    const selectedSources = Object.values(filters.sources).filter(Boolean).length
    if (hasSourceFilters && selectedSources > 0 && !filters.sources[product.source]) return false
    if (hasSourceFilters && selectedSources === 0) return false
    if (filters.inStockOnly && !product.in_stock) return false
    if ((product.rating || 0) < filters.minRating) return false

    const price = Number(product.price || 0)
    const minPrice = filters.priceRange.min === '' ? null : Number(filters.priceRange.min)
    const maxPrice = filters.priceRange.max === '' ? null : Number(filters.priceRange.max)

    if (minPrice !== null && !Number.isNaN(minPrice) && price < minPrice) return false
    if (maxPrice !== null && !Number.isNaN(maxPrice) && price > maxPrice) return false

    return true
  }

  const filteredProducts = useMemo(() => {
    if (!result?.results) return []

    const filtered = result.results.filter(productPassesFilters)

    filtered.sort((a, b) => {
      if (sortOrder === 'price_asc') return a.price - b.price
      if (sortOrder === 'price_desc') return b.price - a.price
      if (sortOrder === 'rating_desc') return (b.rating || 0) - (a.rating || 0)
      return (b.relevance_score || 0) - (a.relevance_score || 0)
    })

    return filtered
  }, [result, filters, sortOrder])

  const showBestPick = useMemo(
    () => Boolean(result?.best && productPassesFilters(result.best)),
    [result, filters],
  )

  const filteredAlternatives = useMemo(() => {
    if (!filteredProducts.length) return []
    if (!result?.best || !showBestPick) {
      return filteredProducts
    }

    return filteredProducts.filter((product) => (
      !(product.title === result.best.title && product.url === result.best.url)
    ))
  }, [filteredProducts, result, showBestPick])

  const handleSearch = async (query) => {
    setLastQuery(query)
    await search(query)
    setRecentSearchRefreshKey((current) => current + 1)
  }

  useEffect(() => {
    if (lastQuery && city) {
      search(lastQuery)
    }
  }, [city, lastQuery, search])

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124,111,239,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,111,239,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center top, rgba(124,111,239,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 sm:py-16">
        {/* Hero */}
        <HeroHeader />

        {/* Search */}
        <div className="mb-10 max-w-4xl mx-auto">
          <SearchBar onSearch={handleSearch} loading={loading} />
          {currentUser ? <LocationPrompt /> : null}
          <RecentSearches
            onSearch={handleSearch}
            refreshKey={recentSearchRefreshKey}
            hidden={loading || Boolean(result)}
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="max-w-4xl mx-auto flex items-start gap-3 p-4 rounded-2xl border border-red-500/30
            bg-red-500/5 text-red-400 mb-6 animate-fade-up">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-semibold text-sm">Search failed</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingSkeleton />}

        {/* Results layout */}
        {!loading && result && (
          <div className="space-y-8 animate-fade-up">
            {/* Result header */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-6 border-b border-border">
              <div>
                <h2 className="font-display font-bold text-text-primary text-xl">
                  Results for <span className="text-accent">"{result.query}"</span>
                </h2>
                <p className="text-text-muted text-sm mt-0.5">
                  {result.results.length} total products found · prices in {result.currency || 'INR'} · {result.took_ms}ms
                </p>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full border font-mono ${
                isMockSource
                  ? 'border-amber-400/30 bg-amber-400/5 text-amber-400'
                  : 'border-emerald-400/30 bg-emerald-400/5 text-emerald-400'
              }`}>
                {sourceLabel}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Left Sidebar (Filters) */}
              <div className="w-full lg:w-64 flex-shrink-0">
                <FilterSidebar 
                  filters={filters}
                  sort={sortOrder}
                  availableSources={availableSources}
                  currency={result.currency || 'INR'}
                  onChangeFilter={setFilters}
                  onChangeSort={setSortOrder}
                  onResetFilters={() => resetFilters()}
                />
              </div>

              {/* Right Content (Products) */}
              <div className="flex-1 w-full min-w-0 space-y-8">
                
                {/* AI Best Pick + Explanation */}
                {showBestPick && (
                  <section className="space-y-6">
                    <div>
                      <p className="text-xs text-text-muted font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="inline-block w-4 h-px bg-accent" />
                        AI Best Pick
                      </p>
                      <div className="max-w-md">
                        <ProductCard
                          product={result.best}
                          rank={1}
                          isBest
                          style={{ animationDelay: '0ms' }}
                          wishlist={wishlist}
                          toggleWishlist={toggleWishlist}
                        />
                      </div>
                    </div>

                    <ExplanationBox
                      explanation={result.explanation}
                      decisionSource={result.decision_source}
                      dataSource={result.data_source}
                      currency={result.currency}
                      exchangeRate={result.exchange_rate_usd_to_inr}
                      tookMs={result.took_ms}
                    />
                  </section>
                )}

                {/* Filtered Ranked Alternatives grid */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-text-muted font-mono uppercase tracking-wider flex items-center gap-2">
                      <span className="inline-block w-4 h-px bg-border" />
                      Ranked Alternatives ({filteredAlternatives.length})
                    </p>
                    <span className="text-xs text-text-muted font-mono">
                      Showing {filteredAlternatives.length} of {result.results.length}
                    </span>
                  </div>
                  
                  {filteredAlternatives.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredAlternatives.map((product, i) => (
                        <ProductCard
                          key={product.title + i}
                          product={product}
                          rank={i + (showBestPick ? 2 : 1)}
                          isBest={false}
                          style={{ animationDelay: `${i * 40}ms` }}
                          wishlist={wishlist}
                          toggleWishlist={toggleWishlist}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border bg-void">
                      <FilterX size={40} className="text-text-muted mb-4 opacity-50" />
                      <h3 className="text-text-primary font-display font-medium mb-1">No matches found</h3>
                      <p className="text-text-muted text-sm max-w-md">
                        We couldn't find any products matching your current filters. 
                        Try adjusting your price range, lowering the minimum rating, or selecting more stores.
                      </p>
                      <button 
                        onClick={() => resetFilters()}
                        className="mt-6 px-4 py-2 border border-border text-sm text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </section>

              </div>
            </div>
          </div>
        )}

        {/* Empty state (No search) */}
        {!loading && !result && !error && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">🛒</div>
            <p className="text-text-muted font-body text-sm">
              Search a product above to compare live shopping results with AI
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
