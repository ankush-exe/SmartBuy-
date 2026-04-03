import { useEffect } from 'react'
import { Clock3, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useFeed } from '../hooks/useFeed'

function formatDate(iso) {
  if (!iso) return 'Recent'

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Recent'

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function formatPrice(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export default function RecentSearches({ onSearch, refreshKey = 0, hidden = false }) {
  const { currentUser } = useAuth()
  const { items, loading, fetchFeed } = useFeed()

  useEffect(() => {
    if (!currentUser) return
    fetchFeed()
  }, [currentUser, fetchFeed, refreshKey])

  if (!currentUser) return null

  if (hidden) return null

  if (!loading && items.length === 0) {
    return null
  }

  return (
    <section className="mt-5 max-w-4xl mx-auto animate-fade-up">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-text-muted font-mono uppercase tracking-[0.22em]">
            For You
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Based on products from your recent searches
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="min-w-[260px] rounded-2xl border border-border bg-surface/80 p-4"
            >
              <div className="h-36 rounded-xl bg-void animate-pulse" />
              <div className="mt-4 h-3 w-24 rounded bg-void animate-pulse" />
              <div className="mt-3 h-4 w-40 rounded bg-void animate-pulse" />
              <div className="mt-4 h-3 w-28 rounded bg-void animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item, index) => (
            <button
              key={`${item.query}-${item.cached_at || index}`}
              type="button"
              onClick={() => onSearch(item.query)}
              className="group min-w-[240px] max-w-[280px] flex-shrink-0 rounded-2xl border border-border
                bg-surface/80 p-4 text-left transition-all duration-200 hover:-translate-y-0.5
                hover:border-accent/40 hover:bg-surface hover:shadow-card"
            >
              {item.product?.thumbnail ? (
                <div className="overflow-hidden rounded-xl border border-border bg-void/60">
                  <img
                    src={item.product.thumbnail}
                    alt={item.product.title}
                    className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center rounded-xl border border-border bg-void/60">
                  <Clock3 size={24} className="text-text-muted" />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-void px-2.5 py-1 text-text-muted">
                  <Clock3 size={12} className="text-accent" />
                  {formatDate(item.cached_at ? new Date(item.cached_at * 1000).toISOString() : '')}
                </span>
                <span className="mt-4 rounded-full border border-border px-2 py-0.5 text-text-muted">
                  {item.product?.source || item.data_source}
                </span>
              </div>

              <p className="mt-4 line-clamp-2 min-h-[3rem] text-sm font-medium text-text-primary">
                {item.product?.title || item.query}
              </p>

              <p className="mt-2 text-xs uppercase tracking-wider text-text-muted">
                Inspired by "{item.query}"
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-lg font-display font-bold text-text-primary">
                  {formatPrice(item.product?.price || 0, item.product?.currency || 'INR')}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-text-secondary transition-colors group-hover:text-accent">
                  Search again
                  <ExternalLink size={12} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
