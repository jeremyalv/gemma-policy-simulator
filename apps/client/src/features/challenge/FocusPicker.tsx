/**
 * FocusPicker — Step 1 of the challenge flow.
 * User picks one of 4 focus dimensions before generating the challenge.
 */

import { Box, Stack, Text, Group, Button, UnstyledButton } from '@mantine/core'
import { Target } from 'lucide-react'
import { FOCUS_OPTIONS, type FocusValue } from './hooks/useChallengeFlow'

interface FocusPickerProps {
  selected:        FocusValue | null
  onSelect:        (f: FocusValue) => void
  onStart:         () => void
  isLoading:       boolean
  loopCount:       number
}

export function FocusPicker({
  selected, onSelect, onStart, isLoading, loopCount,
}: FocusPickerProps) {
  return (
    <Stack gap="lg">
      <Box>
        <Group gap={8} mb={4}>
          <Target size={16} color="var(--color-accent-primary)" />
          <Text fw={600} size="sm" c="var(--color-text-primary)">
            {loopCount === 0 ? 'Choose a challenge focus' : `Choose a focus — Round ${loopCount + 1}`}
          </Text>
        </Group>
        <Text size="xs" c="var(--color-text-tertiary)" lh={1.5}>
          Gemma will examine your results through this lens and surface a
          specific weakness or tension for you to respond to.
        </Text>
      </Box>

      {/* Focus chips */}
      <Stack gap={8} role="radiogroup" aria-label="Challenge focus options">
        {FOCUS_OPTIONS.map((opt) => {
          const active = selected === opt.value
          return (
            <UnstyledButton
              key={opt.value}
              role="radio"
              aria-checked={active}
              aria-label={`${opt.label}: ${opt.description}`}
              tabIndex={0}
              onClick={() => onSelect(opt.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(opt.value)
                }
              }}
              style={{
                border: `1.5px solid ${active ? 'var(--color-accent-primary)' : 'var(--color-border-default)'}`,
                borderRadius: 8,
                padding: '10px 14px',
                backgroundColor: active
                  ? 'var(--color-accent-primary-subtle)'
                  : 'var(--color-bg-surface)',
                transition: 'all 150ms',
                cursor: 'pointer',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Stack gap={2}>
                  <Text
                    size="sm"
                    fw={active ? 600 : 500}
                    style={{ color: active ? 'var(--color-accent-primary)' : 'var(--color-text-primary)' }}
                  >
                    {opt.label}
                  </Text>
                  <Text size="xs" c="var(--color-text-tertiary)" lh={1.4}>
                    {opt.description}
                  </Text>
                </Stack>
                {active && (
                  <Box
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      backgroundColor: 'var(--color-accent-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Box style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff' }} />
                  </Box>
                )}
              </Group>
            </UnstyledButton>
          )
        })}
      </Stack>

      <Button
        fullWidth
        disabled={!selected}
        loading={isLoading}
        onClick={onStart}
        style={{
          backgroundColor: selected ? 'var(--color-accent-primary)' : undefined,
          color: selected ? '#fff' : undefined,
        }}
      >
        Generate Challenge
      </Button>
    </Stack>
  )
}
