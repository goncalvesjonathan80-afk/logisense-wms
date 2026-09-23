/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#36a6f6',
          500: '#0c87eb',
          600: '#006ac9',
          700: '#0155a3',
          800: '#064886',
          900: '#0a3c6f',
          950: '#07264a',
        },
        slate: {
          850: '#151e2e',
          900: '#0f172a',
          950: '#090d16',
        },
      },
    },
  },
  plugins: [],
};
