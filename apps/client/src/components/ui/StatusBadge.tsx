/**
 * StatusBadge — displays simulation status with appropriate color.
 * Statuses: pending | running | completed | failed
 */

import { Badge, type BadgeProps } from '@mantine/core'
import { Loader2 } from 'lucide-react'
import type { SimulationStatus } from '@/api'

interface StatusBadgeProps extends Omit<BadgeProps, 'color' | 'children'> {
  status: SimulationStatus
}

const STATUS_META: Record<SimulationStatus, { label: string; color: string; spinning?: boolean }> = {
  pending:   { label: 'Pending',   color: 'var(--color-status-warning)' },
  running:   { label: 'Running',   color: 'var(--color-status-info)', spinning: true },
  completed: { label: 'Completed', color: 'var(--color-status-success)' },
  failed:    { label: 'Failed',    color: 'var(--color-status-error)' },
}

export function StatusBadge({ status, ...rest }: StatusBadgeProps) {
  const meta = STATUS_META[status] ?? { label: status, color: 'var(--color-text-tertiary)' }

  return (
    <Badge
      size="sm"
      variant="light"
      style={{
        backgroundColor: `${meta.color}18`,
        color: meta.color,
        border: `1px solid ${meta.color}30`,
        gap: 4,
        fontWeight: 500,
        textTransform: 'none',
        letterSpacing: 0,
      }}
      leftSection={
        meta.spinning ? (
          <Loader2
            size={10}
            style={{ animation: 'spin 1s linear infinite' }}
          />
        ) : undefined
      }
      {...rest}
    >
      {meta.label}
    </Badge>
  )
}
