/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Tokens resolve to CSS variables (RGB channels) so the whole palette
        // swaps via the `data-theme` attribute. Light/dark values live in
        // src/styles/globals.css. The `<alpha-value>` form keeps `/opacity`
        // modifiers (e.g. bg-dune-accent/10) working.
        dune: {
          'bg-primary': 'rgb(var(--dune-bg-primary) / <alpha-value>)',
          'bg-secondary': 'rgb(var(--dune-bg-secondary) / <alpha-value>)',
          'bg-tertiary': 'rgb(var(--dune-bg-tertiary) / <alpha-value>)',

          'text-primary': 'rgb(var(--dune-text-primary) / <alpha-value>)',
          'text-secondary': 'rgb(var(--dune-text-secondary) / <alpha-value>)',
          'text-muted': 'rgb(var(--dune-text-muted) / <alpha-value>)',

          'border-primary': 'rgb(var(--dune-border-primary) / <alpha-value>)',
          'border-subtle': 'rgb(var(--dune-border-subtle) / <alpha-value>)',

          accent: 'rgb(var(--dune-accent) / <alpha-value>)',
          'accent-muted': 'rgb(var(--dune-accent-muted) / <alpha-value>)',

          success: 'rgb(var(--dune-success) / <alpha-value>)',
          warning: 'rgb(var(--dune-warning) / <alpha-value>)',
          danger: 'rgb(var(--dune-danger) / <alpha-value>)',
          red: 'rgb(var(--dune-red) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['Bebas Neue', 'Anton', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      letterSpacing: {
        widest: '0.2em',
        extreme: '0.3em',
      },
      borderRadius: {
        // Brutal minimalism: nothing rounder than 4px
        DEFAULT: '2px',
        sm: '2px',
        md: '4px',
      },
    },
  },
  plugins: [],
};
