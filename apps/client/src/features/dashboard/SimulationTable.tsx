/**
 * SimulationTable — the full table with header, rows, and loading skeleton.
 */

import { Table, Skeleton, Box, Stack } from '@mantine/core'
import { SimulationRow } from './SimulationRow'
import type { SimulationListItem } from '@/api'

interface SimulationTableProps {
  simulations: SimulationListItem[]
  isLoading: boolean
  deletingId: string | null
  runningId: string | null
  onDelete: (id: string) => void
  onRun: (id: string) => void
}

const COL_WIDTHS = {
  title:    'auto',
  status:   120,
  sample:   90,
  approval: 130,
  created:  110,
  actions:  100,
}

function TableSkeleton() {
  return (
    <Stack gap={0}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Box
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: `auto 120px 90px 130px 110px 100px`,
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border-subtle)',
            gap: 16,
          }}
        >
          <Skeleton height={14} width="60%" radius="sm" />
          <Skeleton height={20} width={70} radius="xl" />
          <Skeleton height={14} width={40} radius="sm" />
          <Skeleton height={14} width={60} radius="sm" />
          <Skeleton height={12} width={55} radius="sm" />
          <Skeleton height={24} width={80} radius="sm" style={{ marginLeft: 'auto' }} />
        </Box>
      ))}
    </Stack>
  )
}

export function SimulationTable({
  simulations,
  isLoading,
  deletingId,
  runningId,
  onDelete,
  onRun,
}: SimulationTableProps) {
  if (isLoading) {
    return (
      <Box
        style={{
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: 'var(--color-bg-surface)',
        }}
      >
        <TableSkeleton />
      </Box>
    )
  }

  return (
    <Box
      style={{
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg-surface)',
      }}
    >
      <Table
        striped={false}
        highlightOnHover={false}
        withColumnBorders={false}
        style={{ tableLayout: 'fixed' }}
      >
        <Table.Thead
          style={{
            backgroundColor: 'var(--color-bg-subtle)',
            borderBottom: '1px solid var(--color-border-default)',
          }}
        >
          <Table.Tr>
            <Table.Th style={{ width: COL_WIDTHS.title, fontWeight: 500, fontSize: 12, color: 'var(--color-text-tertiary)', paddingLeft: 16 }}>
              Policy
            </Table.Th>
            <Table.Th style={{ width: COL_WIDTHS.status, fontWeight: 500, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Status
            </Table.Th>
            <Table.Th style={{ width: COL_WIDTHS.sample, fontWeight: 500, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Sample
            </Table.Th>
            <Table.Th style={{ width: COL_WIDTHS.approval, fontWeight: 500, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Mean Approval
            </Table.Th>
            <Table.Th style={{ width: COL_WIDTHS.created, fontWeight: 500, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              Created
            </Table.Th>
            <Table.Th style={{ width: COL_WIDTHS.actions, fontWeight: 500, fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'right', paddingRight: 16 }}>
              Actions
            </Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {simulations.map((sim) => (
            <SimulationRow
              key={sim.id}
              simulation={sim}
              onDelete={onDelete}
              onRun={onRun}
              isDeleting={deletingId === sim.id}
              isRunning={runningId === sim.id}
            />
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  )
}
