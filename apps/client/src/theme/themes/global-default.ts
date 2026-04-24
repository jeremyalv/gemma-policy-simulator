import type { MantineThemeOverride } from '@mantine/core'

export const globalDefaultTheme: MantineThemeOverride = {
  primaryColor: 'sims-green',
  colors: {
    'sims-green': [
      '#E8F0EB', // 0 - subtle bg
      '#C8DDD0', // 1
      '#A3C4AE', // 2
      '#7CAB8C', // 3
      '#578F6D', // 4
      '#3A7352', // 5
      '#2D5F4A', // 6 - hover
      '#1B4332', // 7 - PRIMARY
      '#143626', // 8
      '#0E291C', // 9
    ],
    'sims-gold': [
      '#FDF6E3', // 0 - subtle bg
      '#F8E9B8', // 1
      '#F0D37A', // 2
      '#E8C04A', // 3
      '#DEAD27', // 4
      '#C8A951', // 5 - SECONDARY
      '#A88A3A', // 6
      '#8A6E28', // 7
      '#6B5218', // 8
      '#4D3A0A', // 9
    ],
  },
  fontFamily: 'IBM Plex Sans, -apple-system, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, ui-monospace, monospace',
  headings: {
    fontFamily: 'Source Serif 4, Lora, Georgia, serif',
    fontWeight: '600',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontFamily: 'IBM Plex Sans, sans-serif',
          fontWeight: 500,
        },
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        withBorder: true,
      },
      styles: {
        root: {
          backgroundColor: 'var(--color-bg-surface)',
          borderColor: 'var(--color-border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        },
      },
    },
    Input: {
      styles: {
        input: {
          backgroundColor: 'var(--color-bg-subtle)',
          borderColor: 'var(--color-border-default)',
          fontFamily: 'IBM Plex Sans, sans-serif',
          '&:focus': {
            borderColor: 'var(--color-accent-primary)',
          },
        },
      },
    },
    Textarea: {
      styles: {
        input: {
          backgroundColor: 'var(--color-bg-subtle)',
          borderColor: 'var(--color-border-default)',
          fontFamily: 'IBM Plex Sans, sans-serif',
          '&:focus': {
            borderColor: 'var(--color-accent-primary)',
          },
        },
      },
    },
  },
}
