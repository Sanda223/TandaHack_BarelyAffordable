/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
    './services/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#006C72',
        accent: '#00C0A3',
        background: '#F8FAFC',
        'text-primary': '#1B2E35',
        'text-secondary': '#6B7B81',
        'card-bg': '#ffffff',
        'light-gray': '#f5f8fa',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        subtle: '0 4px 30px rgba(0, 0, 0, 0.05)',
        'subtle-hover': '0 8px 40px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
