/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: 'var(--bg-cream)',
        card: 'var(--bg-card)',
      },
      fontFamily: {
        sans: ['var(--font-ibm-loop)', 'sans-serif'],
        mero: ['var(--font-mitr)', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
        'fade-in': 'fade-in 1s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(20, 184, 166, 0.5)',
        'glow-gold': '0 0 20px rgba(245, 158, 11, 0.5)',
      },
    },
  },
  plugins: [],
}