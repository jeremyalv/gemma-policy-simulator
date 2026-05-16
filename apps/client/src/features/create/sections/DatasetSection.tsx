/**
 * DatasetSection — dataset selector.
 * Fetches GET /datasets; disables datasets with status !== 'active' / undefined.
 * Section 2 of the Create Simulation form.
 */

import { Stack, Radio, Group, Text, Box, Badge, Skeleton } from '@mantine/core'
import { Database } from 'lucide-react'
import { useDatasets } from '../hooks/useDatasets'
import type { UseFormReturnType } from '@mantine/form'
import type { CreateSimulationFormValues } from '../schema'
import { formatNumber } from '@/lib/format'

interface DatasetSectionProps {
  form: UseFormReturnType<CreateSimulationFormValues>
}

export function DatasetSection({ form }: DatasetSectionProps) {
  const { datasets, isLoading } = useDatasets()

  if (isLoading) {
    return (
      <Stack gap="sm">
        <Skeleton height={72} radius="md" />
        <Skeleton height={72} radius="md" />
      </Stack>
    )
  }

  function selectDataset(id: string, active: boolean) {
    if (active) form.setFieldValue('dataset', id)
  }

  return (
    <Stack gap="sm" role="radiogroup" aria-label="Dataset selection">
      {datasets.map((ds) => {
        const isActive  = !ds.status || ds.status === 'active'
        const isComingSoon = ds.status === 'coming_v2'
        const isSelected   = form.values.dataset === ds.id

        return (
          <Box
            key={ds.id}
            role="radio"
            tabIndex={isActive ? 0 : -1}
            aria-checked={isSelected}
            aria-disabled={!isActive}
            aria-label={`${ds.name}${isComingSoon ? ' (coming soon)' : ''}`}
            onClick={() => selectDataset(ds.id, isActive)}
            onKeyDown={(e) => {
              if (!isActive) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                selectDataset(ds.id, true)
              }
            }}
            style={{
              border: `1.5px solid ${
                isSelected
                  ? 'var(--color-accent-primary)'
                  : 'var(--color-border-default)'
              }`,
              borderRadius: 8,
              padding: '12px 16px',
              backgroundColor: isSelected
                ? 'var(--color-accent-primary-subtle)'
                : 'var(--color-bg-surface)',
              cursor: isActive ? 'pointer' : 'not-allowed',
              opacity: isActive ? 1 : 0.55,
              transition: 'border-color 150ms, background 150ms',
              outline: 'none',
            }}
          >
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Group gap="sm" align="flex-start" wrap="nowrap">
                <Radio
                  value={ds.id}
                  checked={isSelected}
                  disabled={!isActive}
                  onChange={() => form.setFieldValue('dataset', ds.id)}
                  aria-hidden="true"
                  tabIndex={-1}
                  style={{ marginTop: 2 }}
                  styles={{
                    radio: {
                      borderColor: isSelected
                        ? 'var(--color-accent-primary)'
                        : 'var(--color-border-default)',
                      backgroundColor: isSelected
                        ? 'var(--color-accent-primary)'
                        : undefined,
                    },
                  }}
                />
                <Stack gap={2}>
                  <Group gap={8}>
                    <Database size={13} color="var(--color-text-tertiary)" aria-hidden="true" />
                    <Text size="sm" fw={600} c="var(--color-text-primary)">
                      {ds.name}
                    </Text>
                    {isComingSoon && (
                      <Badge size="xs" variant="light" color="orange" style={{ textTransform: 'none' }}>
                        Coming Soon
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="var(--color-text-secondary)" lh={1.5}>
                    {ds.description}
                  </Text>
                  {ds.size && (
                    <Text size="xs" c="var(--color-text-tertiary)" mt={2}>
                      {formatNumber(ds.size)} personas
                      {ds.license ? ` · ${ds.license}` : ''}
                    </Text>
                  )}
                </Stack>
              </Group>
            </Group>
          </Box>
        )
      })}

      {form.errors.dataset && (
        <Text size="xs" c="var(--color-status-error)">{form.errors.dataset}</Text>
      )}
    </Stack>
  )
}
