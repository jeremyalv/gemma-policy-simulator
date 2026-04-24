/**
 * ApprovalHeatmap — 2D CSS grid heatmap: age groups × approval levels (1–5).
 * Colour is approval-direction-aware: high % at level 1/2 = red, level 4/5 = green.
 * Distribution per row is *estimated* via a Gaussian around mean_approval.
 */

import { Fragment } from 'react'
import { Box, Text, Tooltip, Group, Stack } from '@mantine/core'

// ── Estimation ────────────────────────────────────────────────────────────────

function estimateApprovalDist(mean: number): Record<number, number> {
  const sigma = 1.1
  const raw: Record<number, number> = {}
  let total = 0
  for (let level = 1; level <= 5; level++) {
    const w = Math.exp(-0.5 * Math.pow((level - mean) / sigma, 2))
    raw[level] = w
    total += w
  }
  const result: Record<number, number> = {}
  for (let level = 1; level <= 5; level++) {
    result[level] = Math.round((raw[level] / total) * 100)
  }
  return result
}

// ── Colour helpers ────────────────────────────────────────────────────────────
// Each approval level has its own palette: pct 0→low intensity, pct 50→full sat.

const LEVEL_PALETTES: Record<number, (pct: number) => { bg: string; text: string }> = {
  1: (p) => {
    if (p === 0)  return { bg: '#FFF1F2', text: '#9F1239' }
    if (p < 10)   return { bg: '#FEE2E2', text: '#991B1B' }
    if (p < 25)   return { bg: '#FECACA', text: '#991B1B' }
    if (p < 40)   return { bg: '#F87171', text: '#fff' }
    return          { bg: '#B91C1C', text: '#fff' }
  },
  2: (p) => {
    if (p === 0)  return { bg: '#FFF7ED', text: '#9A3412' }
    if (p < 10)   return { bg: '#FFEDD5', text: '#9A3412' }
    if (p < 25)   return { bg: '#FED7AA', text: '#7C2D12' }
    if (p < 40)   return { bg: '#FB923C', text: '#fff' }
    return          { bg: '#EA580C', text: '#fff' }
  },
  3: (p) => {
    if (p === 0)  return { bg: '#F9FAFB', text: '#6B7280' }
    if (p < 10)   return { bg: '#F3F4F6', text: '#374151' }
    if (p < 25)   return { bg: '#E5E7EB', text: '#374151' }
    if (p < 40)   return { bg: '#9CA3AF', text: '#fff' }
    return          { bg: '#6B7280', text: '#fff' }
  },
  4: (p) => {
    if (p === 0)  return { bg: '#F7FEE7', text: '#3F6212' }
    if (p < 10)   return { bg: '#ECFCCB', text: '#3F6212' }
    if (p < 25)   return { bg: '#BBF7D0', text: '#166534' }
    if (p < 40)   return { bg: '#4ADE80', text: '#14532D' }
    return          { bg: '#16A34A', text: '#fff' }
  },
  5: (p) => {
    if (p === 0)  return { bg: '#F0FDF4', text: '#166534' }
    if (p < 10)   return { bg: '#DCFCE7', text: '#166534' }
    if (p < 25)   return { bg: '#86EFAC', text: '#14532D' }
    if (p < 40)   return { bg: '#22C55E', text: '#fff' }
    return          { bg: '#15803D', text: '#fff' }
  },
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Strongly Oppose',
  2: 'Oppose',
  3: 'Neutral',
  4: 'Support',
  5: 'Strongly Support',
}
const LEVEL_SHORT: Record<number, string> = {
  1: 'S.Oppose', 2: 'Oppose', 3: 'Neutral', 4: 'Support', 5: 'S.Support',
}
const LEVEL_BADGE: Record<number, { bg: string; color: string }> = {
  1: { bg: '#FEE2E2', color: '#991B1B' },
  2: { bg: '#FFEDD5', color: '#9A3412' },
  3: { bg: '#F3F4F6', color: '#374151' },
  4: { bg: '#ECFCCB', color: '#3F6212' },
  5: { bg: '#DCFCE7', color: '#166534' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ApprovalHeatmapProps {
  byAgeGroup: Record<string, { mean_approval: number; count: number }>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ApprovalHeatmap({ byAgeGroup }: ApprovalHeatmapProps) {
  const ageGroups = Object.keys(byAgeGroup).sort()

  if (ageGroups.length === 0) {
    return (
      <Text size="sm" c="var(--color-text-tertiary)" ta="center" py="md">
        No age group data available.
      </Text>
    )
  }

  const rows = ageGroups.map((group) => {
    const { mean_approval, count } = byAgeGroup[group]
    return { group, count, mean: mean_approval, dist: estimateApprovalDist(mean_approval) }
  })

  const LEVELS = [1, 2, 3, 4, 5] as const

  return (
    <Box>
      {/* ── Legend ── */}
      <Group gap={6} mb={14} wrap="wrap">
        {LEVELS.map((level) => {
          const badge = LEVEL_BADGE[level]
          return (
            <Group key={level} gap={5} align="center">
              <Box style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: badge.color }} />
              <Text size="xs" c="var(--color-text-tertiary)">{LEVEL_LABELS[level]}</Text>
            </Group>
          )
        })}
      </Group>

      {/* ── Grid ── */}
      <Box style={{ overflowX: 'auto' }}>
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: '140px repeat(5, 1fr) 80px',
            gap: 3,
            minWidth: 480,
          }}
        >
          {/* Header */}
          <Box />
          {LEVELS.map((level) => {
            const badge = LEVEL_BADGE[level]
            return (
              <Box key={level} style={{ backgroundColor: badge.bg, color: badge.color, borderRadius: 5, padding: '5px 0', textAlign: 'center', fontWeight: 700, fontSize: 10, letterSpacing: '0.03em' }}>
                {LEVEL_SHORT[level]}
              </Box>
            )
          })}
          <Box style={{ textAlign: 'center' }}>
            <Text size="xs" fw={600} c="var(--color-text-tertiary)" style={{ fontSize: 10, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Mean</Text>
          </Box>

          {/* Data rows */}
          {rows.map(({ group, count, mean, dist }) => (
            <Fragment key={group}>
              {/* Label */}
              <Box style={{ display: 'flex', alignItems: 'center', paddingRight: 10, paddingTop: 2, paddingBottom: 2 }}>
                <Stack gap={1}>
                  <Text size="xs" fw={600} c="var(--color-text-primary)" style={{ lineHeight: 1.2 }}>{group}</Text>
                  <Text style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>n={count.toLocaleString()}</Text>
                </Stack>
              </Box>

              {/* Cells */}
              {LEVELS.map((level) => {
                const pct = dist[level] ?? 0
                const { bg, text } = LEVEL_PALETTES[level](pct)
                return (
                  <Tooltip
                    key={level}
                    label={`${group} — ${LEVEL_LABELS[level]}: ~${pct}% of ${count} personas`}
                    withArrow position="top"
                    styles={{ tooltip: { fontSize: 12 } }}
                  >
                    <Box
                      style={{
                        backgroundColor: bg,
                        borderRadius: 4,
                        padding: '10px 4px',
                        textAlign: 'center',
                        cursor: 'default',
                        transition: 'filter 120ms',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = '' }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: pct >= 25 ? 700 : 400, color: text, lineHeight: 1 }}>
                        {pct}%
                      </Text>
                    </Box>
                  </Tooltip>
                )
              })}

              {/* Mean column */}
              <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px' }}>
                <Text size="xs" fw={700} style={{ color: mean >= 3.5 ? '#15803D' : mean >= 2.5 ? '#B45309' : '#B91C1C' }}>
                  {mean.toFixed(1)}
                </Text>
              </Box>
            </Fragment>
          ))}
        </Box>
      </Box>

      {/* Footer */}
      <Text size="xs" c="var(--color-text-disabled)" mt={10} lh={1.5}>
        * Distribution is estimated from mean approval per group using a Gaussian spread (σ=1.1). Individual cell counts are approximate.
      </Text>
    </Box>
  )
}
