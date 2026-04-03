export default function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Agent steps */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs text-text-muted font-mono uppercase tracking-wider mb-4">Agent Pipeline Running</p>
        <div className="space-y-3">
          {[
            { label: 'Parsing query', done: true },
            { label: 'Searching Google Shopping', done: true },
            { label: 'Preparing fallback catalog', done: true },
            { label: 'Matching relevant products', active: true },
            { label: 'Normalizing product data', done: false },
            { label: 'AI decision engine', done: false },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                step.done
                  ? 'border-emerald-400 bg-emerald-400/10'
                  : step.active
                  ? 'border-accent animate-pulse'
                  : 'border-border'
              }`}>
                {step.done && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {step.active && <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
              </div>
              <span className={`text-sm ${
                step.done ? 'text-text-secondary line-through' :
                step.active ? 'text-accent' : 'text-text-muted'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Card skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-5 space-y-3">
            <div className="shimmer-bg h-3 w-20 rounded" />
            <div className="shimmer-bg h-5 w-full rounded" />
            <div className="shimmer-bg h-5 w-3/4 rounded" />
            <div className="shimmer-bg h-8 w-24 rounded mt-2" />
            <div className="shimmer-bg h-3 w-32 rounded" />
            <div className="shimmer-bg h-3 w-40 rounded" />
            <div className="shimmer-bg h-10 w-full rounded-xl mt-4" />
          </div>
        ))}
      </div>

      {/* Explanation skeleton */}
      <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
        <div className="shimmer-bg h-4 w-32 rounded" />
        <div className="shimmer-bg h-3 w-full rounded" />
        <div className="shimmer-bg h-3 w-5/6 rounded" />
        <div className="shimmer-bg h-3 w-4/6 rounded" />
      </div>
    </div>
  )
}
