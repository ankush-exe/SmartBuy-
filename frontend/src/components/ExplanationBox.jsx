import { Brain, Cpu, Database, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

const SOURCE_META = {
  'claude-ai': {
    icon: Brain,
    label: 'Claude AI',
    color: 'text-accent',
    badge: 'bg-accent/10 border-accent/30 text-accent',
  },
  'rule-based': {
    icon: Cpu,
    label: 'Rule-Based Engine',
    color: 'text-emerald-400',
    badge: 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400',
  },
  'fallback': {
    icon: Database,
    label: 'Mock Catalog',
    color: 'text-amber-400',
    badge: 'bg-amber-400/10 border-amber-400/30 text-amber-400',
  },
  'mock': {
    icon: Database,
    label: 'Mock Catalog',
    color: 'text-amber-400',
    badge: 'bg-amber-400/10 border-amber-400/30 text-amber-400',
  },
  'google-shopping': {
    icon: Database,
    label: 'Google Shopping',
    color: 'text-emerald-400',
    badge: 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400',
  },
}

export default function ExplanationBox({
  explanation,
  decisionSource,
  dataSource,
  currency,
  exchangeRate,
  tookMs,
}) {
  const [expanded, setExpanded] = useState(true)
  const meta = SOURCE_META[decisionSource] || SOURCE_META['rule-based']
  const Icon = meta.icon
  const normalizedDataSource = dataSource === 'fallback' ? 'mock' : dataSource
  const dataSourceLabel = SOURCE_META[normalizedDataSource]?.label || normalizedDataSource
  const fxRateLabel = Number.isFinite(Number(exchangeRate))
    ? `₹${Number(exchangeRate).toFixed(2)} / $1`
    : 'Unavailable'

  // Parse **bold** markdown
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="text-text-primary font-semibold">{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden animate-fade-up">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-void/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon size={16} className={meta.color} />
          </div>
          <div className="text-left">
            <p className="text-sm font-display font-semibold text-text-primary">AI Reasoning</p>
            <p className="text-xs text-text-muted">Why this product was selected</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full border font-mono ${meta.badge}`}>
            {meta.label}
          </span>
          {expanded ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-6 pb-5 border-t border-border/50">
          <p className="mt-4 text-text-secondary text-sm leading-relaxed font-body">
            {renderText(explanation)}
          </p>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-border/50">
            <Stat label="Data Source" value={dataSourceLabel} />
            <Stat label="Decision Engine" value={decisionSource} />
            <Stat label="Currency" value={currency || 'INR'} />
            {normalizedDataSource === 'mock' && <Stat label="FX Rate" value={fxRateLabel} />}
            <Stat label="Response Time" value={`${tookMs}ms`} highlight />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-medium ${highlight ? 'text-gold' : 'text-text-secondary'}`}>
        {value}
      </p>
    </div>
  )
}
