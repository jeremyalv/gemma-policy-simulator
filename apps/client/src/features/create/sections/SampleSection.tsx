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

// TODO: replace with real telemetry once the backend reports actual inference timing.
// These values are rough estimates and have not been benchmarked against production.
function runtimeEstimate(n: number): string {
  if (n <= 100)  return '~15 s (estimate)'
  if (n <= 300)  return '~30 s (estimate)'
  if (n <= 500)  return '~1 min (estimate)'
  if (n <= 1000) return '~2 min (estimate)'
  return '~4 min (estimate)'
}

// NOTE: These labels describe AI inference volume, NOT statistical validity.
// LLM-generated personas are not equivalent to survey respondents.
// More personas reduce output variance; they do not increase statistical accuracy
// in the traditional (sampling theory) sense.
function accuracyLabel(n: number): string {
  if (n < 100)  return 'Exploratory — high variance, indicative only'
  if (n < 300)  return 'Preliminary — suitable for internal review'
  if (n < 700)  return 'Moderate — suitable for structured analysis'
  if (n < 1500) return 'Robust — lower variance across demographic segments'
  return 'High volume — diminishing returns beyond this range'
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
        <Text size="xs" c="var(--color-text-tertiary)">Output variance</Text>
        <Text size="xs" fw={500} c="var(--color-text-secondary)">{accuracyLabel(value)}</Text>
        <Text size="xs" c="var(--color-text-tertiary)">Estimated runtime</Text>
        <Text size="xs" fw={500} c="var(--color-text-secondary)">{runtimeEstimate(value)}</Text>
      </Box>

      {form.errors.sample_size && (
        <Text size="xs" c="var(--color-status-error)">{form.errors.sample_size}</Text>
      )}

      {/* Disclaimer */}
      <Text size="xs" c="var(--color-text-tertiary)" lh={1.5} style={{ fontStyle: 'italic' }}>
        Sample size affects AI output variance, not statistical validity in the traditional sense.
        This tool produces AI-generated analysis — not survey data. A larger sample reduces
        variance between runs; it does not make results more representative of real public opinion.
      </Text>

      {/* Justification */}
      <Box>
        <Text fw={600} size="sm" c="var(--color-text-primary)" mb={2}>
          Notes on sample choice <Text component="span" size="xs" c="var(--color-text-tertiary)" fw={400}>(Optional — for your records only)</Text>
        </Text>
        <Text size="xs" c="var(--color-text-tertiary)" mb={6} lh={1.5}>
          Briefly note your reasoning — e.g. "500 for a quick internal draft" or "1000 before a stakeholder presentation."
          This is saved with your simulation record and does not affect simulation output.
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
