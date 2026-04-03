/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          obsidian: '#050505',  // almost black
          dark: '#0a0a0b',      // app background
          card: '#121214',      // card background
          border: 'rgba(255, 255, 255, 0.05)',
          borderHover: 'rgba(255, 255, 255, 0.1)',
          muted: '#8b8b93',      
          primary: 'var(--brand-primary, #2dd4bf)',
          primaryGlow: 'rgba(var(--brand-primary-rgb, 45, 212, 191), 0.5)',
          secondary: '#818cf8', // indigo-400
          accent: '#10b981',    // emerald-500
          danger: '#f43f5e',    // rose-500
          warning: '#fbbf24',   // amber-400
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 10px var(--brand-primary)' },
          '100%': { boxShadow: '0 0 20px var(--brand-primary)' },
        }
      }
    },
  },
  plugins: [],
}
