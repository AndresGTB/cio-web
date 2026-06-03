import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          black: '#0A1A28',
          'alice-blue': '#E4EDF2',
          'blue-gray': '#334155',
          blue: '#0002FB',
          aquamarine: '#20E0B2',
          yellow: '#F1A828',
          'dark-blue': '#212830',
          'steel-blue': '#546478',
        },
        semantic: {
          error: '#E5031F',
          success: '#0FCD0F',
          warning: '#FFA800',
          info: '#000ACE',
        },
      },
      borderRadius: {
        pill: '100px',
      },
      transitionTimingFunction: {
        'ease-out-cio': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      transitionDuration: {
        '400': '400ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-in': 'slide-in 0.4s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config
