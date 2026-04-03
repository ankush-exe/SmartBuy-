import { SlidersHorizontal, ArrowUpDown, Tag, Star, Package } from 'lucide-react'

export default function FilterSidebar({
  filters,
  sort,
  availableSources,
  currency = 'INR',
  onChangeFilter,
  onChangeSort,
  onResetFilters,
}) {
  const handleSourceChange = (source) => {
    const nextSources = { ...filters.sources }
    nextSources[source] = !nextSources[source]
    onChangeFilter({ ...filters, sources: nextSources })
  }

  const handlePriceChange = (field, value) => {
    onChangeFilter({
      ...filters,
      priceRange: { ...filters.priceRange, [field]: value }
    })
  }

  const enabledSourceCount = availableSources.filter((source) => filters.sources[source]).length

  const handleSetAllSources = (checked) => {
    const nextSources = {}
    availableSources.forEach((source) => {
      nextSources[source] = checked
    })
    onChangeFilter({ ...filters, sources: nextSources })
  }

  return (
    <div className="w-full sm:w-64 flex-shrink-0 space-y-6">
      {/* Sort Section */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4 text-text-primary font-display font-semibold">
          <ArrowUpDown size={16} className="text-accent" />
          <h3>Sort By</h3>
        </div>
        <div className="space-y-2">
          {[
            { value: 'relevance', label: 'Relevance (Default)' },
            { value: 'price_asc', label: 'Price: Low to High' },
            { value: 'price_desc', label: 'Price: High to Low' },
            { value: 'rating_desc', label: 'Rating: High to Low' }
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="sort"
                value={option.value}
                checked={sort === option.value}
                onChange={(e) => onChangeSort(e.target.value)}
                className="w-4 h-4 text-accent bg-void border-border focus:ring-accent focus:ring-offset-surface"
              />
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-text-primary font-display font-semibold">
            <SlidersHorizontal size={16} className="text-accent" />
            <h3>Filters</h3>
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-mono uppercase tracking-wider text-text-muted transition-colors hover:text-accent"
          >
            Reset
          </button>
        </div>

        {/* Source Filter */}
        {availableSources.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-text-secondary text-sm font-semibold">
                <Tag size={14} />
                <h4>Store</h4>
              </div>
              <span className="text-xs text-text-muted font-mono">
                {enabledSourceCount}/{availableSources.length}
              </span>
            </div>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleSetAllSources(true)}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => handleSetAllSources(false)}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableSources.map((source) => (
                <label key={source} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!filters.sources[source]}
                    onChange={() => handleSourceChange(source)}
                    className="w-4 h-4 rounded text-accent bg-void border-border focus:ring-accent focus:ring-offset-surface"
                  />
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                    {source}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Price Range Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-text-secondary text-sm font-semibold">
            <span className="text-accent">{currency === 'INR' ? '₹' : currency}</span>
            <h4>Price Range</h4>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceRange.min}
              onChange={(e) => handlePriceChange('min', e.target.value)}
              className="w-full py-1.5 px-3 bg-void border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent transition-colors"
            />
            <span className="text-text-muted">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.priceRange.max}
              onChange={(e) => handlePriceChange('max', e.target.value)}
              className="w-full py-1.5 px-3 bg-void border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Rating Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-text-secondary text-sm font-semibold">
            <Star size={14} className="text-gold" />
            <h4>Minimum Rating</h4>
          </div>
          <div className="space-y-2">
            {[4, 3, 2].map((stars) => (
              <label key={stars} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="minRating"
                  value={stars}
                  checked={filters.minRating === stars}
                  onChange={() => onChangeFilter({ ...filters, minRating: stars })}
                  className="w-4 h-4 text-accent bg-void border-border focus:ring-accent focus:ring-offset-surface"
                />
                <span className="text-sm text-text-secondary group-hover:text-text-primary flex items-center transition-colors">
                  {stars} Stars & Up
                </span>
              </label>
            ))}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="minRating"
                value={0}
                checked={filters.minRating === 0}
                onChange={() => onChangeFilter({ ...filters, minRating: 0 })}
                className="w-4 h-4 text-accent bg-void border-border focus:ring-accent focus:ring-offset-surface"
              />
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                Any Rating
              </span>
            </label>
          </div>
        </div>

        {/* Availability */}
        <div>
          <div className="flex items-center gap-2 mb-3 text-text-secondary text-sm font-semibold">
            <Package size={14} className="text-emerald-400" />
            <h4>Availability</h4>
          </div>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => onChangeFilter({ ...filters, inStockOnly: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-500 bg-void border-border focus:ring-emerald-500 focus:ring-offset-surface"
            />
            <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
              In Stock Only
            </span>
          </label>
        </div>

      </div>
    </div>
  )
}
