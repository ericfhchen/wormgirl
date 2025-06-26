/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: 'var(--dark)',
        light: 'var(--light)',
        muted: 'var(--muted)',
        // Legacy aliases for gradual migration if needed
        background: 'var(--dark)',
        foreground: 'var(--light)',
        primary: {
          DEFAULT: 'var(--dark)',
          foreground: 'var(--light)',
        },
        secondary: {
          DEFAULT: 'var(--dark)',
          foreground: 'var(--light)',
        },
        accent: {
          DEFAULT: 'var(--dark)',
          foreground: 'var(--light)',
        },
        border: 'var(--light)',
        video: {
          overlay: 'rgba(0, 0, 0, 0.7)',
          idle: 'rgba(0, 0, 0, 0.5)',
        }
      },
      fontFamily: {
        sans: ['Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['Times Now', 'Times New Roman', 'serif'],
      },
      spacing: {
        'sidebar': '200px',
        'video-controls': '60px',
      },
      aspectRatio: {
        'video': '16 / 9',
        'video-portrait': '9 / 16',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { 
            transform: 'translateX(100%)',
            opacity: '0'
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1'
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 