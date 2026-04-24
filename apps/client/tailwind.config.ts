import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Map Tailwind utilities to CSS custom properties
        // so theme switching works without rebuilding
        bg: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          subtle: 'var(--color-bg-subtle)',
          muted: 'var(--color-bg-muted)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          default: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
        },
        accent: {
          primary: 'var(--color-accent-primary)',
          'primary-hover': 'var(--color-accent-primary-hover)',
          'primary-subtle': 'var(--color-accent-primary-subtle)',
          secondary: 'var(--color-accent-secondary)',
          'secondary-subtle': 'var(--color-accent-secondary-subtle)',
        },
        status: {
          success: 'var(--color-status-success)',
          warning: 'var(--color-status-warning)',
          error: 'var(--color-status-error)',
          info: 'var(--color-status-info)',
        },
      },
      fontFamily: {
        serif: ['Source Serif 4', 'Lora', 'Georgia', 'serif'],
        sans: ['IBM Plex Sans', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs:   ['0.75rem',  { lineHeight: '1rem' }],
        sm:   ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem',     { lineHeight: '1.5rem' }],
        lg:   ['1.125rem', { lineHeight: '1.75rem' }],
        xl:   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':['1.563rem', { lineHeight: '2rem' }],
        '3xl':['1.953rem', { lineHeight: '2.25rem' }],
        '4xl':['2.441rem', { lineHeight: '2.75rem' }],
        '5xl':['3.052rem', { lineHeight: '1.2' }],
      },
      maxWidth: {
        prose: '65ch',
        content: '860px',
        dashboard: '1440px',
      },
    },
  },
  plugins: [],
} satisfies Config
