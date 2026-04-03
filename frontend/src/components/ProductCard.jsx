import { useState } from 'react'
import { ExternalLink, ImageIcon, Star, Truck, Package, ShieldCheck } from 'lucide-react'

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

export default function ProductCard({ product, rank, isBest, style }) {
  const [imageMissing, setImageMissing] = useState(false)
  const {
    title, price, currency, rating, source, url,
    delivery, reviews_count, in_stock, relevance_score, thumbnail, snippet
  } = product
  const showImage = Boolean(thumbnail) && !imageMissing

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
        <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-void border border-border
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
        <span className="flex items-center gap-1.5">
          <Truck size={12} className="text-accent" />
          {delivery}
        </span>
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
