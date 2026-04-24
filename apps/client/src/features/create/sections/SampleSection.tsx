/**
 * SampleSection — sample size with synced slider + number input.
 * Range: 20–2000 (contract: integer only).
 * Section 3 of the Create Simulation form.
 */

import { Stack, Slider, NumberInput, Group, Text, Box, Textarea } from '@mantine/core'
import type { UseFormReturnType } from '@mantine/form'
import type { CreateSimulationFormValues } from '../schema'
import { SAMPLE_MIN, SAMPLE_MAX } from '../constants'

interface SampleSectionProps {
  form: UseFormReturnType<CreateSimulationFormValues>
}

// Marks at useful milestones
const SLIDER_MARKS = [
  { value: SAMPLE_MIN,  label: `${SAMPLE_MIN}` },
  { value: 200,  label: '200' },
  { value: 500,  label: '500' },
  { value: 1000, label: '1k' },
  { value: 2000, label: '2k' },
]

function runtimeEstimate(n: number): string {
  if (n <= 100)  return '~15 seconds'
  if (n <= 300)  return '~30 seconds'
  if (n <= 500)  return '~1 minute'
  if (n <= 1000) return '~2 minutes'
  return '~4 minutes'
}

function accuracyLabel(n: number): string {
  if (n < 100)  return 'Low — suitable for quick exploration'
  if (n < 300)  return 'Moderate — suitable for prototyping'
  if (n < 700)  return 'Good — suitable for analysis'
  if (n < 1500) return 'High — suitable for reporting'
  return 'Very high — publication-quality'
}

export function SampleSection({ form }: SampleSectionProps) {
  const value = form.values.sample_size

  function handleChange(v: number) {
    const clamped = Math.max(SAMPLE_MIN, Math.min(SAMPLE_MAX, Math.round(v)))
    form.setFieldValue('sample_size', clamped)
  }

  return (
    <Stack gap="md">
      <Group align="flex-start" justify="space-between" wrap="nowrap">
        {/* Slider */}
        <Box style={{ flex: 1, paddingRight: 24 }}>
          <Slider
            min={SAMPLE_MIN}
            max={SAMPLE_MAX}
            step={10}
            value={value}
            onChange={handleChange}
            marks={SLIDER_MARKS}
            label={(v) => v.toLocaleString()}
            styles={{
              root: { paddingBottom: 20 },
              track: { backgroundColor: 'var(--color-border-default)' },
              bar:   { backgroundColor: 'var(--color-accent-primary)' },
              thumb: {
                borderColor: 'var(--color-accent-primary)',
                backgroundColor: '#fff',
              },
              mark: { backgroundColor: 'var(--color-border-default)' },
              markLabel: { fontSize: 11, color: 'var(--color-text-tertiary)' },
            }}
          />
        </Box>

        {/* Number input */}
        <NumberInput
          w={110}
          min={SAMPLE_MIN}
          max={SAMPLE_MAX}
          step={50}
          value={value}
          onChange={(v) => typeof v === 'number' && handleChange(v)}
          styles={{
            input: {
              backgroundColor: 'var(--color-bg-subtle)',
              borderColor: form.errors.sample_size
                ? 'var(--color-status-error)'
                : 'var(--color-border-default)',
              textAlign: 'center',
              fontWeight: 600,
            },
          }}
        />
      </Group>

      {/* Hints */}
      <Box
        style={{
          backgroundColor: 'var(--color-bg-subtle)',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 16px',
        }}
      >
        <Text size="xs" c="var(--color-text-tertiary)">Statistical accuracy</Text>
        <Text size="xs" fw={500} c="var(--color-text-secondary)">{accuracyLabel(value)}</Text>
        <Text size="xs" c="var(--color-text-tertiary)">Estimated runtime</Text>
        <Text size="xs" fw={500} c="var(--color-text-secondary)">{runtimeEstimate(value)}</Text>
      </Box>

      {form.errors.sample_size && (
        <Text size="xs" c="var(--color-status-error)">{form.errors.sample_size}</Text>
      )}

      {/* Justification */}
      <Box>
        <Text fw={600} size="sm" c="var(--color-text-primary)" mb={2}>
          Why this sample size? <Text component="span" size="xs" c="var(--color-text-tertiary)" fw={400}>(Optional)</Text>
        </Text>
        <Text size="xs" c="var(--color-text-tertiary)" mb={6} lh={1.5}>
          Briefly explain your choice — e.g. "500 for exploratory analysis before presenting to stakeholders" or "2000 for publication-quality statistical confidence."
        </Text>
        <Textarea
          placeholder="e.g. We need 95% confidence intervals for a report to the senate committee, so 1000+ personas is preferred…"
          minRows={2}
          maxRows={4}
          autosize
          maxLength={500}
          value={form.values.sample_justification ?? ''}
          onChange={(e) => form.setFieldValue('sample_justification', e.currentTarget.value)}
          styles={{
            input: {
              backgroundColor: 'var(--color-bg-subtle)',
              borderColor: 'var(--color-border-default)',
              fontFamily: 'IBM Plex Sans, sans-serif',
              fontSize: 13,
              lineHeight: 1.6,
            },
          }}
        />
        {(form.values.sample_justification ?? '').length > 0 && (
          <Text size="xs" c="var(--color-text-tertiary)" mt={4} style={{ textAlign: 'right' }}>
            {500 - (form.values.sample_justification ?? '').length} chars remaining
          </Text>
        )}
        {form.errors.sample_justification && (
          <Text size="xs" c="var(--color-status-error)" mt={4}>{form.errors.sample_justification}</Text>
        )}
      </Box>
    </Stack>
  )
}
