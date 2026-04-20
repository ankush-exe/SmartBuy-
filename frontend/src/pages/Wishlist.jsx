import { useEffect, useState } from 'react'
import { ExternalLink, Heart, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../hooks/useWishlist'

const API_BASE = import.meta.env.VITE_API_URL

const formatPrice = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)

export default function Wishlist() {
  const { currentUser } = useAuth()
  const { toggle } = useWishlist()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('Wishlist API_BASE', API_BASE)

    if (!currentUser) {
      setItems([])
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const token = await currentUser.getIdToken()
        const res = await fetch(`${API_BASE}/api/wishlist`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setItems(data.wishlist || [])
      } catch (error) {
        console.error('Failed to fetch wishlist', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [currentUser])

  const handleRemove = async (product) => {
    await toggle(product)
    setItems((prev) => prev.filter((item) => item.id !== product.product_id))
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void">
        <p className="text-text-muted">Sign in to view your wishlist.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-void px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <Heart className="fill-red-500 text-red-500" size={24} />
          <h1 className="text-2xl font-display font-bold text-text-primary">
            Your Wishlist
          </h1>
          {items.length > 0 ? (
            <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-sm text-text-muted">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-2xl border border-border bg-surface"
              />
            ))}
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <Heart size={48} className="text-text-muted" />
            <p className="text-lg text-text-muted">No items in your wishlist yet.</p>
            <p className="text-sm text-text-muted">
              Search for products and click the heart icon to save them here.
            </p>
          </div>
        ) : null}

        {!loading && items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
              >
                <button
                  onClick={() => handleRemove({
                    product_id: item.id,
                    title: item.title,
                    price: item.price,
                    currency: item.currency,
                    thumbnail: item.thumbnail,
                    url: item.url,
                    query: item.query,
                  })}
                  className="absolute right-3 top-3 rounded-full bg-black/40 p-1.5 transition-colors hover:bg-red-500/20"
                  title="Remove from wishlist"
                >
                  <Trash2 size={14} className="text-gray-400 hover:text-red-400" />
                </button>

                {item.thumbnail ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-void/60">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="h-36 w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border bg-void/60">
                    <p className="text-xs text-text-muted">No image</p>
                  </div>
                )}

                <div className="flex-1">
                  <p className="mb-1 text-xs font-mono uppercase tracking-wider text-text-muted">
                    {item.source || 'Unknown'}
                  </p>
                  <h3 className="line-clamp-2 text-sm font-display font-semibold leading-snug text-text-primary">
                    {item.title}
                  </h3>
                </div>

                <p className="text-xl font-display font-bold text-text-primary">
                  {formatPrice(item.price, item.currency)}
                </p>

                <p className="flex items-center gap-1 text-xs text-text-muted">
                  🔔 You'll get an email if the price drops
                </p>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-void py-2.5 text-sm font-display font-semibold text-text-secondary transition-all hover:border-accent hover:text-accent"
                >
                  View Deal
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
