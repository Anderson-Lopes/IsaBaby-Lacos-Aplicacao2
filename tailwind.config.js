/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        primary: '#FFC0CB',
        secondary: '#C8A2C8',
        accent: '#FFFF00',
        ink: '#93E9BE',
        surface: '#111111',
        'surface-hover': '#1C1C1C',
        border: '#383838',
        muted: '#B8B8B8',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Jost', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(255, 192, 203, 0.08)',
        lifted: '0 8px 24px rgba(255, 192, 203, 0.14)',
      },
    },
  },
  plugins: [],
};
