/**
 * MilestoneSteps — shows 5 progress milestones mapped from progress_pct.
 *
 * Milestones:
 *  0–10%   → Initialising personas
 * 10–35%   → Generating responses
 * 35–70%   → Aggregating sentiment
 * 70–90%   → Computing demographics
 * 90–100%  → Finalising results
 */

import { Box, Text, Group } from '@mantine/core'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface Milestone {
  label: string
  threshold: number  // milestone is 'active' when pct >= threshold
}

const MILESTONES: Milestone[] = [
  { label: 'Initialising personas',    threshold: 0  },
  { label: 'Generating responses',     threshold: 10 },
  { label: 'Aggregating sentiment',    threshold: 35 },
  { label: 'Computing demographics',   threshold: 70 },
  { label: 'Finalising results',       threshold: 90 },
]

interface MilestoneStepsProps {
  progressPct: number
  isFailed?: boolean
}

export function MilestoneSteps({ progressPct, isFailed }: MilestoneStepsProps) {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {MILESTONES.map((m, i) => {
        const isComplete = progressPct > (MILESTONES[i + 1]?.threshold ?? 100)
        const isActive   = !isFailed && progressPct >= m.threshold && !isComplete

        return (
          <Group key={m.label} gap={10} align="center">
            {/* Icon */}
            <Box style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
              {isFailed && progressPct >= m.threshold ? (
                <Circle size={16} color="var(--color-status-error)" />
              ) : isComplete ? (
                <CheckCircle2 size={16} color="var(--color-status-success)" />
              ) : isActive ? (
                <Loader2
                  size={16}
                  color="var(--color-accent-primary)"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              ) : (
                <Circle
                  size={16}
                  color="var(--color-border-default)"
                />
              )}
            </Box>

            {/* Label */}
            <Text
              size="sm"
              fw={isActive ? 600 : 400}
              style={{
                color: isComplete
                  ? 'var(--color-status-success)'
                  : isActive
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-tertiary)',
                transition: 'color 300ms',
              }}
            >
              {m.label}
            </Text>
          </Group>
        )
      })}
    </Box>
  )
}
