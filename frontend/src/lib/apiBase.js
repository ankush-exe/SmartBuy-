const rawApiBase =
  typeof import.meta.env.VITE_API_URL === 'string'
    ? import.meta.env.VITE_API_URL.trim()
    : ''

const normalizedApiBase = rawApiBase.replace(/\/$/, '')
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// In local development, let Vite proxy /api requests to the backend.
export const API_BASE = isLocalhost ? '' : (normalizedApiBase || 'http://localhost:8000')
