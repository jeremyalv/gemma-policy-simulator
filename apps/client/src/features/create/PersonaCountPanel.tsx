/**
 * PersonaCountPanel — right-sidebar estimate of matching personas.
 *
 * V1: mock calculation based on sample_size and active filter count.
 * Will be replaced with real API call in a future version.
 */

import { Stack, Text, Box, RingProgress, Group, Divider } from '@mantine/core'
import { Users, Filter } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import type { CreateSimulationFormValues } from './schema'
import { AGE_MIN, AGE_MAX } from './constants'

const NEMOTRON_TOTAL = 1_000_000

interface PersonaCountPanelProps {
  values: CreateSimulationFormValues
}

/** Rough multiplier estimate based on active filters (heuristic, not real query). */
function estimateMatchRatio(filters: CreateSimulationFormValues['filters']): number {
  if (!filters) return 1
  let ratio = 1

  const states = filters.states ?? []
  if (states.length > 0) {
    // Average state has ~2% of population; multiple states add up
    ratio *= Math.min(1, states.length * 0.02 + 0.05)
  }

  const ageRange = filters.age_range as [number, number] | undefined
  if (ageRange) {
    const span = (ageRange[1] - ageRange[0]) / (AGE_MAX - AGE_MIN)
    ratio *= Math.max(0.05, span)
  }

  const sex = filters.sex ?? []
  if (sex.length > 0 && sex.length < 3) {
    ratio *= sex.length / 3
  }

  const marital = filters.marital_status ?? []
  if (marital.length > 0 && marital.length < 5) {
    ratio *= marital.length / 5
  }

  const edu = filters.education_level ?? []
  if (edu.length > 0 && edu.length < 6) {
    ratio *= edu.length / 6
  }

  const occ = filters.occupation ?? []
  if (occ.length > 0) {
    ratio *= Math.min(1, occ.length / 40)
  }

  return Math.max(0.001, Math.min(1, ratio))
}

function countActiveFilters(filters: CreateSimulationFormValues['filters']): number {
  if (!filters) return 0
  let n = 0
  if ((filters.states ?? []).length > 0) n++
  const ar = filters.age_range as [number, number] | undefined
  if (ar && (ar[0] !== AGE_MIN || ar[1] !== AGE_MAX)) n++
  if ((filters.sex ?? []).length > 0) n++
  if ((filters.marital_status ?? []).length > 0) n++
  if ((filters.education_level ?? []).length > 0) n++
  if ((filters.occupation ?? []).length > 0) n++
  return n
}

export function PersonaCountPanel({ values }: PersonaCountPanelProps) {
  const ratio     = estimateMatchRatio(values.filters)
  const poolSize  = Math.round(NEMOTRON_TOTAL * ratio)
  const sampleOk  = values.sample_size <= poolSize
  const pct       = Math.round(ratio * 100)

  const activeFilters = countActiveFilters(values.filters)

  const ringColor = sampleOk
    ? 'var(--color-status-success)'
    : 'var(--color-status-warning)'

  return (
    <Box
      style={{
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 10,
        padding: '20px 18px',
        backgroundColor: 'var(--color-bg-surface)',
        position: 'sticky',
        top: 76,
      }}
    >
      <Stack gap="lg">
        {/* Header */}
        <Box>
          <Text fw={600} size="sm" c="var(--color-text-primary)">
            Persona Pool
          </Text>
          <Text size="xs" c="var(--color-text-tertiary)" mt={2}>
            Estimated matching personas in dataset
          </Text>
        </Box>

        {/* Ring + number */}
        <Box style={{ display: 'flex', justifyContent: 'center' }}>
          <RingProgress
            size={120}
            thickness={10}
            roundCaps
            sections={[{ value: Math.max(1, pct), color: ringColor }]}
            label={
              <Stack gap={0} align="center">
                <Text fw={700} size="lg" c="var(--color-text-primary)" lh={1}>
                  {pct < 1 ? '<1' : pct}%
                </Text>
                <Text size="10px" c="var(--color-text-tertiary)">of dataset</Text>
              </Stack>
            }
          />
        </Box>

        {/* Stats */}
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="xs" c="var(--color-text-tertiary)">
              <Group gap={4} component="span">
                <Users size={11} />
                Matching pool
              </Group>
            </Text>
            <Text size="xs" fw={600} c="var(--color-text-primary)">
              ~{formatNumber(poolSize)}
            </Text>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="var(--color-text-tertiary)">Requested sample</Text>
            <Text
              size="xs"
              fw={600}
              c={sampleOk ? 'var(--color-text-primary)' : 'var(--color-status-warning)'}
            >
              {formatNumber(values.sample_size)}
            </Text>
          </Group>

          {!sampleOk && (
            <Box
              style={{
                backgroundColor: 'var(--color-accent-secondary-subtle)',
                borderRadius: 6,
                padding: '6px 10px',
              }}
            >
              <Text size="xs" c="var(--color-status-warning)" lh={1.5}>
                Sample exceeds estimated pool. The system will clamp to the
                available number of matching personas.
              </Text>
            </Box>
          )}
        </Stack>

        <Divider color="var(--color-border-subtle)" />

        {/* Filter summary */}
        <Stack gap={4}>
          <Group gap={4}>
            <Filter size={12} color="var(--color-text-tertiary)" />
            <Text size="xs" c="var(--color-text-tertiary)">
              {activeFilters === 0
                ? 'No filters — full dataset'
                : `${activeFilters} filter dimension${activeFilters !== 1 ? 's' : ''} active`}
            </Text>
          </Group>
          <Text size="xs" c="var(--color-text-tertiary)" lh={1.5}>
            Dataset: NVIDIA Nemotron-Personas USA
            <br />
            Total: {formatNumber(NEMOTRON_TOTAL)} personas
          </Text>
        </Stack>
      </Stack>
    </Box>
  )
}
