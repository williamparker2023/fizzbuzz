/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}', './app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        darkbg: '#0f172a',
        darkcard: '#1e293b',
        darkborder: '#334155',
        darktext: '#e2e8f0',
        darkmuted: '#94a3b8',
        darkaccent: '#6366f1',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideFade: {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
        slideFade: 'slideFade 0.5s ease-out',
      },
    },
  },
  plugins: [],
}
