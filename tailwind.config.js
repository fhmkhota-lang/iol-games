/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        iol: {
          red: '#E8141C',
          dark: '#1A1A1A',
          gray: '#2D2D2D',
          light: '#F5F5F5',
        },
      },
    },
  },
  plugins: [],
}

