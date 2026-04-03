import { useEffect, useRef } from 'react'
import { useHistory } from '../hooks/useHistory'

export default function HistoryPanel({ onClose }) {
  const { history, loading, fetchHistory } = useHistory()
  const panelRef = useRef(null)

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function formatDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 w-80 z-50 rounded-xl border border-white/10 bg-[#0f0f0f] shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-medium text-white">Search history</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
        >
          x
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            Loading...
          </div>
        )}

        {!loading && history.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No searches yet
          </div>
        )}

        {!loading && history.map((item, i) => (
          <div
            key={`${item.query}-${item.timestamp || i}`}
            className="flex items-center justify-between px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <svg
                className="w-4 h-4 text-gray-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 7v5l3 3" />
              </svg>
              <span className="text-sm text-gray-200 truncate">
                {item.query}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {item.count > 1 && (
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                  x{item.count}
                </span>
              )}
              <span className="text-xs text-gray-600">
                {formatDate(item.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
