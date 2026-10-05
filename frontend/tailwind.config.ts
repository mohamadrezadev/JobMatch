import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      brand: { 50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 500: '#4569F5', 600: '#3554D1', 700: '#263CA3', glow: '#5B7BFF' },
      dark: { bg: '#0B111E', surface: '#151F32', card: '#1A2740', border: '#23324B' },
      light: { bg: '#F8F7F3', surface: '#FFFFFF', card: '#FCFCFB', border: '#E2E8F0' },
    },
    fontFamily: { sans: ['Vazirmatn', 'sans-serif'] },
    animation: { 'pulse-glow': 'pulseGlow 3s infinite ease-in-out', float: 'float 4s infinite ease-in-out', 'slide-in': 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 'fade-in': 'fadeIn 0.25s ease-out' },
    keyframes: {
      pulseGlow: { '0%, 100%': { opacity: '0.4', transform: 'scale(1)' }, '50%': { opacity: '0.8', transform: 'scale(1.05)' } },
      float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-6px)' } },
      slideIn: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
    },
  } },
  plugins: [],
};
export default config;
