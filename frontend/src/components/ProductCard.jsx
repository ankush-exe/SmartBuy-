import { useState } from 'react'
import { ExternalLink, ImageIcon, Star, Truck, Package, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function createProductId(title = '', source = '') {
  const value = `${title}-${source}`.trim().toLowerCase()
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return `product_${Math.abs(hash).toString(36)}`
}

const formatPrice = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)

function StarRating({ rating }) {
  const full = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={
            i <= full
              ? 'text-gold fill-gold'
              : hasHalf && i === full + 1
              ? 'text-gold-dim fill-gold-dim'
              : 'text-text-muted'
          }
        />
      ))}
      <span className="ml-1 text-xs text-text-secondary font-mono">{rating.toFixed(1)}</span>
    </div>
  )
}

export default function ProductCard({
  product,
  rank,
  isBest,
  style,
  wishlist = new Set(),
  toggleWishlist,
}) {
  const { currentUser } = useAuth()
  const [imageMissing, setImageMissing] = useState(false)
  const {
    title, price, currency, rating, source, url,
    delivery, reviews_count, in_stock, relevance_score, thumbnail, snippet
  } = product
  const productId = product.product_id
    || createProductId(product.title, product.source)
  const productPayload = {
    product_id: productId,
    title: product.title || '',
    price: product.price || 0,
    currency: product.currency || 'INR',
    thumbnail: product.thumbnail || '',
    url: product.url || '',
    query: product.query || '',
    source: product.source || '',
  }
  const isWishlisted = wishlist.has(productId)
  const showImage = Boolean(thumbnail) && !imageMissing
  const deliveryMeta = delivery && typeof delivery === 'object' ? delivery : null
  const deliveryText = typeof delivery === 'string' ? delivery : null

  return (
    <article
      style={style}
      className={`
        relative rounded-2xl border p-5 card-hover animate-fade-up
        ${isBest
          ? 'border-accent bg-gradient-to-br from-surface via-surface to-[#1a1830] shadow-glow-accent'
          : 'border-border bg-surface'
        }
      `}
    >
      {currentUser && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            toggleWishlist?.(productPayload)
          }}
          className="absolute top-3 right-3 z-10 rounded-full bg-black/40 p-1.5 backdrop-blur-sm transition-all hover:bg-black/60"
          title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <svg
            className={`h-4 w-4 transition-all duration-200 ${
              isWishlisted
                ? 'scale-110 fill-red-500 text-red-500'
                : 'fill-none text-gray-400'
            }`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>
      )}

      {/* Best badge */}
      {isBest && (
        <div className="absolute -top-3 left-5 flex items-center gap-1.5
          px-3 py-1 rounded-full bg-accent text-white text-xs font-display font-semibold
          shadow-glow-accent">
          <ShieldCheck size={12} />
          AI Best Pick
        </div>
      )}

      {/* Rank badge */}
      {!isBest && (
        <div className="absolute top-4 right-14 w-7 h-7 rounded-full bg-void border border-border
          flex items-center justify-center text-xs text-text-muted font-mono">
          #{rank}
        </div>
      )}

      {/* Header */}
      {showImage ? (
        <div className="mb-4 overflow-hidden rounded-xl border border-border bg-void/60">
          <img
            src={thumbnail}
            alt={title}
            className="h-40 w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageMissing(true)}
          />
        </div>
      ) : (
        <div className="mb-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-void/60">
          <div className="flex flex-col items-center gap-2 text-center">
            <ImageIcon size={22} className="text-text-muted" />
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Image Unavailable
            </p>
          </div>
        </div>
      )}

      <div className="mt-1 mb-4">
        <p className="text-xs text-text-muted font-mono uppercase tracking-wider mb-1.5">{source}</p>
        <h3 className="font-display font-semibold text-text-primary text-base leading-snug line-clamp-2">
          {title}
        </h3>
        {snippet && (
          <p className="mt-2 text-xs text-text-muted leading-relaxed line-clamp-2">
            {snippet}
          </p>
        )}
      </div>

      {/* Price */}
      <div className="mb-3">
        <span className={`text-2xl font-display font-bold ${isBest ? 'text-gold' : 'text-text-primary'}`}>
          {formatPrice(price, currency)}
        </span>
      </div>

      {deliveryMeta && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <Truck className="h-3.5 w-3.5 text-sky-400" />
            <span>{deliveryMeta.estimated_days}</span>
          </div>

          {deliveryMeta.free_delivery ? (
            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
              Free delivery
            </span>
          ) : null}

          <span className="text-xs text-text-muted">
            to {deliveryMeta.city}
          </span>
        </div>
      )}

      {/* Rating */}
      <div className="mb-4">
        <StarRating rating={rating} />
        {reviews_count > 0 && (
          <p className="mt-0.5 text-xs text-text-muted">
            {reviews_count.toLocaleString()} reviews
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-text-secondary">
        {deliveryText ? (
          <span className="flex items-center gap-1.5">
            <Truck size={12} className="text-accent" />
            {deliveryText}
          </span>
        ) : null}
        <span className={`flex items-center gap-1.5 ${in_stock ? 'text-emerald-400' : 'text-red-400'}`}>
          <Package size={12} />
          {in_stock ? 'In Stock' : 'Out of Stock'}
        </span>
      </div>

      {/* Relevance bar */}
      {relevance_score !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted">Relevance</span>
            <span className="text-text-secondary font-mono">{(relevance_score * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-void overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isBest ? 'bg-accent' : 'bg-border'}`}
              style={{ width: `${relevance_score * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`
          flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-display font-semibold
          transition-all duration-200 active:scale-95
          ${isBest
            ? 'bg-accent text-white hover:bg-accent-glow'
            : 'bg-void border border-border text-text-secondary hover:border-accent hover:text-accent'
          }
        `}
      >
        View Deal
        <ExternalLink size={14} />
      </a>
    </article>
  )
}
