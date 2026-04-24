/**
 * FilterBar — client-side search + status filter for the simulation list.
 */

import { Group, TextInput, Select } from '@mantine/core'
import { Search } from 'lucide-react'
import type { SimulationStatus } from '@/api'

export interface FilterState {
  search: string
  status: SimulationStatus | 'all'
}

interface FilterBarProps {
  value: FilterState
  onChange: (next: FilterState) => void
}

const STATUS_OPTIONS = [
  { value: 'all',       label: 'All statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'running',   label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed',    label: 'Failed' },
]

export function FilterBar({ value, onChange }: FilterBarProps) {
  return (
    <Group gap="sm" wrap="nowrap">
      <TextInput
        placeholder="Search simulations…"
        leftSection={<Search size={14} />}
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.currentTarget.value })}
        style={{ flex: 1 }}
        styles={{
          input: {
            backgroundColor: 'var(--color-bg-subtle)',
            borderColor: 'var(--color-border-default)',
          },
        }}
      />
      <Select
        data={STATUS_OPTIONS}
        value={value.status}
        onChange={(v) => onChange({ ...value, status: (v ?? 'all') as FilterState['status'] })}
        w={160}
        styles={{
          input: {
            backgroundColor: 'var(--color-bg-subtle)',
            borderColor: 'var(--color-border-default)',
          },
        }}
      />
    </Group>
  )
}
