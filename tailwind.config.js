/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          50: '#f0f7f0',
          100: '#d4e8d4',
          200: '#a8d1a8',
          300: '#6db56d',
          400: '#3d8e3d',
          500: '#1e6b2e',
          600: '#185a25',
          700: '#14491f',
          800: '#0f3718',
          900: '#0a2611',
          950: '#061a0b',
        },
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#d4a017',
          600: '#b8860b',
          700: '#92700c',
          800: '#6b5310',
          900: '#4a3a0e',
        },
        card: {
          red: '#c0392b',
          black: '#2c3e50',
          white: '#fdfcfa',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.12)',
        'felt': 'inset 0 2px 12px rgba(0,0,0,0.3)',
        'glow': '0 0 20px rgba(212, 160, 23, 0.3)',
      },
    },
  },
  plugins: [],
}
