/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        obsidian: '#0a0a0f',
        void: '#13131a',
        surface: '#1c1c26',
        border: '#2a2a38',
        accent: '#7c6fef',
        'accent-glow': '#9d93f5',
        gold: '#f5c842',
        'gold-dim': '#c9a52e',
        text: {
          primary: '#f0eeff',
          secondary: '#8b8aaa',
          muted: '#4a4a68',
        }
      },
      boxShadow: {
        'glow-accent': '0 0 30px rgba(124, 111, 239, 0.25)',
        'glow-gold': '0 0 20px rgba(245, 200, 66, 0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease both',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        }
      }
    }
  },
  plugins: []
}
