/**
 * SimulationRow — one row in the simulations table.
 * Fields: title, status, sample_size, mean_approval, created_at, actions.
 */

import { Table, Text, Group, ActionIcon, Tooltip, Menu } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { Play, Eye, Trash2, MoreHorizontal, GitCompare } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ApprovalDisplay } from '@/components/ui/ApprovalDisplay'
import { openConfirmModal } from '@/components/ui/ConfirmModal'
import { formatRelative, formatNumber } from '@/lib/format'
import type { SimulationListItem } from '@/api'

interface SimulationRowProps {
  simulation: SimulationListItem
  onDelete: (id: string) => void
  onRun: (id: string) => void
  isDeleting: boolean
  isRunning: boolean
}

export function SimulationRow({
  simulation,
  onDelete,
  onRun,
  isDeleting,
  isRunning,
}: SimulationRowProps) {
  const navigate = useNavigate()
  const { id, title, status, sample_size, mean_approval, created_at } = simulation

  const canRun     = status === 'pending' || status === 'failed'
  const canResults = status === 'completed'
  const canView    = status === 'running'

  function handleDelete() {
    openConfirmModal({
      title: 'Delete simulation',
      message: `"${title}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => onDelete(id),
    })
  }

  return (
    <Table.Tr
      style={{
        cursor: 'default',
        transition: 'background 120ms',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.backgroundColor =
          'var(--color-bg-subtle)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.backgroundColor = ''
      }}
    >
      {/* Title */}
      <Table.Td>
        <Text
          size="sm"
          fw={500}
          c="var(--color-text-primary)"
          style={{
            cursor: canResults ? 'pointer' : 'default',
            maxWidth: 320,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          onClick={() => {
            if (canResults) navigate(`/simulations/${id}/results`)
            else if (canView) navigate(`/simulations/${id}`)
          }}
          title={title}
        >
          {title}
        </Text>
      </Table.Td>

      {/* Status */}
      <Table.Td>
        <StatusBadge status={status} />
      </Table.Td>

      {/* Sample size */}
      <Table.Td>
        <Text size="sm" c="var(--color-text-secondary)">
          {formatNumber(sample_size ?? 0)}
        </Text>
      </Table.Td>

      {/* Mean approval */}
      <Table.Td>
        <ApprovalDisplay value={mean_approval} dot size="sm" />
      </Table.Td>

      {/* Created */}
      <Table.Td>
        <Text size="xs" c="var(--color-text-tertiary)">
          {formatRelative(created_at)}
        </Text>
      </Table.Td>

      {/* Actions */}
      <Table.Td>
        <Group gap={4} justify="flex-end" wrap="nowrap">
          {canRun && (
            <Tooltip label="Run simulation" position="top">
              <ActionIcon
                variant="subtle"
                size="sm"
                loading={isRunning}
                disabled={isRunning || isDeleting}
                onClick={() => onRun(id)}
                style={{ color: 'var(--color-accent-primary)' }}
                aria-label="Run"
              >
                <Play size={14} />
              </ActionIcon>
            </Tooltip>
          )}

          {canResults && (
            <Tooltip label="View results" position="top">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => navigate(`/simulations/${id}/results`)}
                style={{ color: 'var(--color-status-success)' }}
                aria-label="Results"
              >
                <Eye size={14} />
              </ActionIcon>
            </Tooltip>
          )}

          {canView && (
            <Tooltip label="View progress" position="top">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => navigate(`/simulations/${id}`)}
                style={{ color: 'var(--color-status-info)' }}
                aria-label="Progress"
              >
                <Eye size={14} />
              </ActionIcon>
            </Tooltip>
          )}

          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" size="sm" color="gray" aria-label="More">
                <MoreHorizontal size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {canResults && (
                <Menu.Item
                  leftSection={<GitCompare size={14} />}
                  onClick={() => navigate(`/compare?add=${id}`)}
                >
                  Add to comparison
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={<Trash2 size={14} />}
                color="red"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Table.Td>
    </Table.Tr>
  )
}
