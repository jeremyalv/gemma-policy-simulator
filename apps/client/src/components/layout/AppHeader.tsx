/**
 * App header — logo left, nav centre, settings right.
 * Reads institution name/logo from InstitutionContext.
 */

import { Link, useLocation } from 'react-router-dom'
import { Group, Text, Anchor, Box, ActionIcon, Tooltip } from '@mantine/core'
import { Settings, BarChart2 } from 'lucide-react'
import { useInstitution } from '@/theme/ThemeProvider'

const NAV_LINKS = [
  { label: 'Simulations',   to: '/simulations' },
  { label: 'New Simulation', to: '/simulations/new' },
  { label: 'Compare',       to: '/compare' },
  { label: 'Guide',         to: '/guide' },
  { label: 'Methodology',   to: '/methodology' },
  { label: 'About',         to: '/about' },
]

export function AppHeader() {
  const { name, logo_url } = useInstitution() as { name: string; logo_url: string }
  const { pathname } = useLocation()

  return (
    <Box
      component="header"
      style={{
        height: 56,
        borderBottom: '1px solid var(--color-border-subtle)',
        backgroundColor: 'var(--color-bg-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Group
        h="100%"
        px="xl"
        justify="space-between"
        wrap="nowrap"
      >
        {/* ── Logo + name ─────────────────────────────────────── */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          {logo_url ? (
            <img
              src={logo_url}
              alt={name}
              height={28}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <BarChart2 size={22} color="var(--color-accent-primary)" strokeWidth={2.5} />
          )}
          <Text
            fw={700}
            size="sm"
            style={{
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
              fontFamily: 'IBM Plex Sans, sans-serif',
            }}
          >
            {name || 'InfiniPol'}
          </Text>
        </Link>

        {/* ── Nav links ────────────────────────────────────────── */}
        <Group gap="xs">
          {NAV_LINKS.map(({ label, to }) => {
            const active = pathname === to || (to !== '/simulations' && pathname.startsWith(to))

            return (
              <Anchor
                key={to}
                component={Link}
                to={to}
                size="sm"
                style={{
                  color: active
                    ? 'var(--color-accent-primary)'
                    : 'var(--color-text-secondary)',
                  fontWeight: active ? 600 : 400,
                  textDecoration: 'none',
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: active
                    ? 'var(--color-accent-primary-subtle)'
                    : 'transparent',
                  transition: 'background 150ms',
                }}
              >
                {label}
              </Anchor>
            )
          })}
        </Group>

        {/* ── Settings icon ────────────────────────────────────── */}
        <Tooltip label="Settings" position="bottom">
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="Settings"
            component={Link}
            to="/settings"
          >
            <Settings size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  )
}
