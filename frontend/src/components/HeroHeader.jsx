import { useState } from 'react'
import { Zap, LogOut, User, Mail, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import HistoryPanel from './HistoryPanel'

export default function HeroHeader() {
  const { currentUser, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  return (
    <header className="relative text-center mb-12">
      {/* Auth Bar */}
      <div className="absolute top-0 right-0 flex items-center gap-4">
        {currentUser ? (
          <div className="flex items-center gap-3">
            <div className="relative z-50">
              <button
                onClick={() => {
                  setShowHistory((value) => !value)
                  setMenuOpen(false)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Search history"
              >
                <History className="w-4 h-4" />
                History
              </button>

              {showHistory && (
                <HistoryPanel onClose={() => setShowHistory(false)} />
              )}
            </div>

            <div className="relative z-50">
              <button 
                onClick={() => {
                  setMenuOpen(!menuOpen)
                  setShowHistory(false)
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-accent-light flex items-center justify-center text-white font-bold text-base shadow-lg hover:shadow-accent/20 hover:scale-105 transition-all outline-none border border-white/10"
                aria-label="User menu"
              >
                {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : <User size={18} />}
              </button>

              {menuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setMenuOpen(false)} 
                  />
                  <div className="absolute right-0 mt-3 w-56 bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-down origin-top-right">
                    <div className="p-4 border-b border-white/5 bg-white/5 text-left">
                      <p className="text-xs text-text-muted mb-1 font-medium">Signed in as</p>
                      <p className="text-sm font-medium text-white truncate flex items-center gap-2">
                        <Mail size={12} className="opacity-60 flex-shrink-0" /> 
                        <span className="truncate">{currentUser.email}</span>
                      </p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          logout()
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-medium"
                      >
                        <LogOut size={14} />
                        Log Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-text-muted hover:text-white transition-colors">
              Log In
            </Link>
            <Link to="/signup" className="text-sm px-4 py-1.5 rounded-full bg-accent hover:bg-accent-light text-white transition-colors">
              Sign Up
            </Link>
          </div>
        )}
      </div>

      {/* Logo mark */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
        bg-accent/10 border border-accent/30 mb-6 mx-auto mt-8 sm:mt-0">
        <Zap size={26} className="text-accent" fill="currentColor" />
      </div>

      {/* Title */}
      <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-text-primary glow-text mb-3 tracking-tight">
        SmartBuy <span className="text-accent">AI</span>
      </h1>

      {/* Tagline */}
      <p className="text-text-secondary text-base sm:text-lg max-w-lg mx-auto font-body font-light">
        Live product comparison powered by{' '}
        <span className="text-accent-glow">Google Shopping search</span> &{' '}
        <span className="text-gold">AI decision-making</span>
      </p>

      {/* Pipeline pills */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {['Query Parser', 'Google Shopping', 'Fallback Catalog', 'Matcher', 'AI Decision Engine'].map((step) => (
          <span
            key={step}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full
              bg-void border border-border text-text-muted font-mono"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />
            {step}
          </span>
        ))}
      </div>
    </header>
  )
}
