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
      fontWeight: {
        'semibold': '600',
        'extrabold': '900',
        'black': '900',
        // Custom weights that match your font files
        'times-semibold': '600',
        'times-extrabold': '900',
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
        'slide-in-right': 'slideInRight 0.4s ease-in-out',
        'slide-in-left': 'slideInLeft 0.4s ease-in-out',
        'slide-out-right': 'slideOutRight 0.4s ease-in-out',
        'content-fade-in': 'contentFadeIn 0.4s ease-in-out 0.4s both',
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
            opacity: '1'
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1'
          },
        },
        slideInLeft: {
          '0%': { 
            transform: 'translateX(-100%)',
            opacity: '1'
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1'
          },
        },
        slideOutRight: {
          '0%': { 
            transform: 'translateX(0)',
            opacity: '1'
          },
          '99%': { 
            transform: 'translateX(100%)',
            opacity: '1'
          },
          '100%': { 
            transform: 'translateX(100%)',
            opacity: '0'
          },
        },
        contentFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      fontSize: {
        // Override or extend default sizes
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.5rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
        
        // Add custom sizes
        'intro': ['1.375rem', { lineHeight: '2rem' }], // Custom size for intro quotes
        'footnote': ['0.8rem', { lineHeight: '1.2rem' }], // Custom size for footnotes
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 