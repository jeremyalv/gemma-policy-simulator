/**
 * ThemeSwitcher — DEV-ONLY floating widget to preview institution themes.
 * Rendered only when import.meta.env.DEV === true.
 *
 * Writes `data-theme` directly to <html> so CSS vars update instantly.
 * Does NOT persist to institution-config.json.
 */

import { useState } from 'react'
import { Box, Group, Text, Tooltip, ActionIcon } from '@mantine/core'
import { Palette, X } from 'lucide-react'
import type { ThemeName } from '@/theme/themes'

const THEMES: { name: ThemeName; label: string; swatch: string }[] = [
  { name: 'global-default',    label: 'Global Default',    swatch: '#1B4332' },
  { name: 'gov-formal',        label: 'Gov Formal',        swatch: '#004488' },
  { name: 'think-tank-modern', label: 'Think Tank Modern', swatch: '#4F46E5' },
  { name: 'academic-warm',     label: 'Academic Warm',     swatch: '#B02010' },
]

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<ThemeName>('global-default')

  function applyTheme(name: ThemeName) {
    document.documentElement.setAttribute('data-theme', name)
    setActive(name)
  }

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      {open && (
        <Box
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 10,
            padding: '10px 12px',
            boxShadow: 'var(--shadow-md)',
            minWidth: 180,
          }}
        >
          <Group justify="space-between" mb={8}>
            <Text size="xs" fw={600} c="var(--color-text-tertiary)" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dev: Themes
            </Text>
            <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setOpen(false)}>
              <X size={11} />
            </ActionIcon>
          </Group>

          {THEMES.map(({ name, label, swatch }) => (
            <Group
              key={name}
              gap={8}
              py={5}
              px={6}
              style={{
                borderRadius: 6,
                cursor: 'pointer',
                backgroundColor: active === name ? 'var(--color-bg-subtle)' : 'transparent',
              }}
              onClick={() => applyTheme(name)}
            >
              <Box
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: swatch,
                  flexShrink: 0,
                  outline: active === name ? `2px solid ${swatch}` : 'none',
                  outlineOffset: 1,
                }}
              />
              <Text size="xs" c="var(--color-text-secondary)" fw={active === name ? 600 : 400}>
                {label}
              </Text>
            </Group>
          ))}
        </Box>
      )}

      <Tooltip label="Switch theme (dev)" position="right">
        <ActionIcon
          onClick={() => setOpen((o) => !o)}
          size="lg"
          radius="xl"
          style={{
            backgroundColor: 'var(--color-accent-primary)',
            color: '#fff',
            boxShadow: 'var(--shadow-md)',
          }}
          aria-label="Theme switcher"
        >
          <Palette size={16} />
        </ActionIcon>
      </Tooltip>
    </Box>
  )
}
