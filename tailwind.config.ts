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
        'row-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'kpi-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'bar-in': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        'dot-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.75)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s cubic-bezier(0,0,0.2,1) both',
        'slide-in': 'slide-in 0.35s cubic-bezier(0,0,0.2,1) both',
        'row-in': 'row-in 0.3s cubic-bezier(0,0,0.2,1) both',
        'kpi-in': 'kpi-in 0.4s cubic-bezier(0,0,0.2,1) both',
        'bar-in': 'bar-in 0.7s cubic-bezier(0,0,0.2,1) both',
        'dot-pulse': 'dot-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
