/**
 * Dashboard — simulation list with filter, pagination, run, delete.
 * Data: GET /simulations (MSW mock: 12 items, varied statuses)
 */

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Group, Title, Button, Text, Box,
  Pagination, Alert, Stack,
} from '@mantine/core'
import { Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { FilterBar, type FilterState } from './FilterBar'
import { SimulationTable } from './SimulationTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSimulations } from './hooks/useSimulations'
import { useDeleteSimulation } from './hooks/useDeleteSimulation'
import { useRunSimulation } from './hooks/useRunSimulation'
import type { SimulationListItem } from '@/api'

const PAGE_SIZE = 10

function applyFilters(
  items: SimulationListItem[],
  { search, status }: FilterState,
): SimulationListItem[] {
  return items.filter((s) => {
    const matchSearch =
      !search || s.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      status === 'all' || s.status === status
    return matchSearch && matchStatus
  })
}

function applySort(items: SimulationListItem[], sort: string): SimulationListItem[] {
  const asc   = !sort.startsWith('-')
  const field = sort.replace(/^-/, '')
  return [...items].sort((a, b) => {
    let va: string | number
    let vb: string | number
    if (field === 'created_at') {
      va = a.created_at
      vb = b.created_at
    } else if (field === 'mean_approval') {
      va = a.mean_approval ?? -1
      vb = b.mean_approval ?? -1
    } else {
      return 0
    }
    if (va < vb) return asc ? -1 : 1
    if (va > vb) return asc ? 1 : -1
    return 0
  })
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { simulations, isLoading, isError, error, refetch } = useSimulations()

  const deleteMutation = useDeleteSimulation()
  const runMutation    = useRunSimulation()

  const [filter, setFilter] = useState<FilterState>({ search: '', status: 'all', sort: '-created_at' })
  const [page, setPage] = useState(1)

  // Track which row is in a loading state for button feedback
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [runningId,  setRunningId]  = useState<string | null>(null)

  const filtered   = useMemo(() => applyFilters(simulations, filter), [simulations, filter])
  const sorted     = useMemo(() => applySort(filtered, filter.sort), [filtered, filter.sort])
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Clamp current page when totalPages shrinks (e.g. after deleting the last
  // item on the current page, or when filters narrow the result set).
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  // Reset to page 1 when filter changes
  function handleFilterChange(next: FilterState) {
    setFilter(next)
    setPage(1)
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    deleteMutation.mutate(id, {
      onSettled: () => setDeletingId(null),
    })
  }

  function handleRun(id: string) {
    const title = simulations.find((s) => s.id === id)?.title
    setRunningId(id)
    runMutation.mutate({ id, title }, {
      onSettled: () => setRunningId(null),
    })
  }

  return (
    <Layout>
      <Stack gap="xl">

        {/* ── Page header ──────────────────────────────────────── */}
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title
              order={2}
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: 'Source Serif 4, serif',
                fontWeight: 600,
              }}
            >
              Simulations
            </Title>
            <Text size="sm" c="var(--color-text-secondary)" mt={4}>
              {isLoading
                ? 'Loading…'
                : `${sorted.length} simulation${sorted.length !== 1 ? 's' : ''}${
                    filter.search || filter.status !== 'all' ? ' matching filters' : ''
                  }`}
            </Text>
          </Box>

          <Group gap="sm">
            <Button
              variant="subtle"
              size="sm"
              color="gray"
              leftSection={<RefreshCw size={14} />}
              onClick={() => refetch()}
              loading={isLoading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftSection={<Plus size={15} />}
              style={{
                backgroundColor: 'var(--color-accent-primary)',
                color: '#fff',
              }}
              onClick={() => navigate('/simulations/new')}
            >
              New Simulation
            </Button>
          </Group>
        </Group>

        {/* ── Error alert ──────────────────────────────────────── */}
        {isError && (
          <Alert
            icon={<AlertCircle size={16} />}
            color="orange"
            title="Could not reach the backend"
            style={{ borderColor: 'var(--color-status-warning)' }}
          >
            <Stack gap={8}>
              <Text size="sm">
                {(error as Error)?.message?.includes('non-JSON') || (error as Error)?.message?.includes('backend')
                  ? 'The API server is not responding. Make sure the backend is running on the expected port.'
                  : ((error as Error)?.message ?? 'Unknown error. Please refresh.')}
              </Text>
              <Button
                size="xs"
                variant="outline"
                color="orange"
                leftSection={<RefreshCw size={12} />}
                onClick={() => refetch()}
                style={{ width: 'fit-content' }}
              >
                Try again
              </Button>
            </Stack>
          </Alert>
        )}

        {/* ── Filter bar ───────────────────────────────────────── */}
        <FilterBar value={filter} onChange={handleFilterChange} />

        {/* ── Table or empty state ─────────────────────────────── */}
        {!isError && !isLoading && sorted.length === 0 ? (
          simulations.length === 0 ? (
            <EmptyState
              title="No simulations yet"
              description="Create your first simulation to see how the public would respond to a policy proposal."
              action={{
                label: 'New Simulation',
                onClick: () => navigate('/simulations/new'),
              }}
            />
          ) : (
            <EmptyState
              title="No simulations match your filters"
              description="Try adjusting your search or status filter."
              action={{
                label: 'Clear filters',
                onClick: () => handleFilterChange({ search: '', status: 'all', sort: '-created_at' }),
              }}
            />
          )
        ) : (
          <SimulationTable
            simulations={paginated}
            isLoading={isLoading}
            deletingId={deletingId}
            runningId={runningId}
            onDelete={handleDelete}
            onRun={handleRun}
          />
        )}

        {/* ── Pagination ───────────────────────────────────────── */}
        {!isLoading && totalPages > 1 && (
          <Group justify="center">
            <Pagination
              total={totalPages}
              value={page}
              onChange={setPage}
              size="sm"
              color="var(--color-accent-primary)"
            />
          </Group>
        )}

      </Stack>
    </Layout>
  )
}
