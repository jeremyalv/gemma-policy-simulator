/**
 * RunQualityBanner — warns users when a completed simulation produced
 * partial-quality results (run_telemetry.is_partial === true).
 *
 * Shown at the top of ResultsPage when the backend signals that some
 * persona runs failed or were retried, so success_rate < 100%.
 * The results are still valid but may underrepresent some groups.
 *
 * Hidden when:
 *   - is_partial is false (full-quality run)
 *   - telemetry is not available (pre-issue-44 backend, or status not loaded)
 */

import { useState } from 'react'
import { Alert, Text, Group, Button, Box } from '@mantine/core'
import { AlertTriangle, X } from 'lucide-react'
import type { components } from '@/api/types.gen'

export type RunTelemetry = components['schemas']['RunTelemetry']

interface RunQualityBannerProps {
  telemetry: RunTelemetry
}

export function RunQualityBanner({ telemetry }: RunQualityBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  // Only show when backend signals partial quality
  if (!telemetry.is_partial || dismissed) return null

  const successPct    = Math.round(telemetry.success_rate * 100)
  const failedCount   = telemetry.failed_count
  const retryCount    = telemetry.retry_count

  return (
    <Alert
      data-testid="run-quality-banner"
      icon={<AlertTriangle size={16} />}
      color="yellow"
      radius="md"
      style={{
        borderColor: 'var(--color-status-warning, #f59e0b)',
        backgroundColor: 'rgba(245, 158, 11, 0.06)',
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Box style={{ flex: 1 }}>
          <Text fw={600} size="sm" mb={4} style={{ color: 'var(--color-text-primary)' }}>
            Partial-quality results
          </Text>
          <Text size="sm" c="var(--color-text-secondary)" lh={1.55}>
            {successPct}% of persona runs completed successfully
            {failedCount > 0 && ` (${failedCount} failed`}
            {retryCount > 0  && `, ${retryCount} retried`}
            {failedCount > 0 && ')'}
            . The aggregate statistics are based on completed runs only and
            may underrepresent some demographic groups.
          </Text>
        </Box>
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          aria-label="Dismiss quality warning"
          onClick={() => setDismissed(true)}
          style={{ flexShrink: 0, minWidth: 28, minHeight: 28, padding: '5px 7px' }}
        >
          <X size={14} />
        </Button>
      </Group>
    </Alert>
  )
}
