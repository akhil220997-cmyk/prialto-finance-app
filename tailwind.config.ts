import type { Config } from 'tailwindcss';

// Prialto brand palette — black + orange, the app's sole theme.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff4ea',
          100: '#ffe4c7',
          200: '#ffc78a',
          300: '#ffa64d',
          400: '#fb8b28',
          500: '#f97316',
          600: '#dd5c0a',
          700: '#b7480a',
          800: '#92390f',
          900: '#782f10',
        },
        ink: {
          950: '#0a0908',
          900: '#121009',
          800: '#17140f',
          700: '#1f1b15',
        },
      },
    },
  },
  plugins: [],
};

export default config;
