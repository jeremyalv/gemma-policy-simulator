/**
 * PolicySection — title + policy_text textarea with char counter.
 * Section 1 of the Create Simulation form.
 * Supports document upload (.txt, .md) to populate policy_text.
 */

import { useRef } from 'react'
import { Stack, TextInput, Textarea, Text, Box, Group, Button } from '@mantine/core'
import { Upload } from 'lucide-react'
import { notifications } from '@mantine/notifications'
import type { UseFormReturnType } from '@mantine/form'
import type { CreateSimulationFormValues } from '../schema'

const TITLE_MAX    = 120
const POLICY_MAX   = 4000
const POLICY_ROWS  = 8

interface PolicySectionProps {
  form: UseFormReturnType<CreateSimulationFormValues>
}

function CharCounter({ value, max }: { value: string; max: number }) {
  const remaining = max - value.length
  const warn = remaining < max * 0.1
  return (
    <Text
      size="xs"
      style={{ color: warn ? 'var(--color-status-warning)' : 'var(--color-text-tertiary)' }}
    >
      {remaining} characters remaining
    </Text>
  )
}

export function PolicySection({ form }: PolicySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200_000) {
      notifications.show({ title: 'File too large', message: 'Please upload a file under 200 KB.', color: 'red' })
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = (ev.target?.result as string ?? '').slice(0, POLICY_MAX)
      form.setFieldValue('policy_text', text)
      notifications.show({ title: 'Document loaded', message: `${file.name} imported successfully.`, color: 'teal', autoClose: 2500 })
    }
    reader.readAsText(file)
    // Reset so same file can be re-uploaded
    e.target.value = ''
  }

  return (
    <Stack gap="md">
      <Box>
        <Text fw={600} size="sm" c="var(--color-text-primary)" mb={4}>
          Policy title
        </Text>
        <TextInput
          placeholder='e.g. "Carbon Tax $50/tonne" or "Universal Basic Income Pilot"'
          maxLength={TITLE_MAX}
          {...form.getInputProps('title')}
          rightSection={
            <CharCounter value={form.values.title} max={TITLE_MAX} />
          }
          rightSectionWidth={160}
          styles={{
            input: {
              backgroundColor: 'var(--color-bg-subtle)',
              borderColor: form.errors.title
                ? 'var(--color-status-error)'
                : 'var(--color-border-default)',
            },
          }}
        />
        {form.errors.title && (
          <Text size="xs" c="var(--color-status-error)" mt={4}>
            {form.errors.title}
          </Text>
        )}
      </Box>

      <Box>
        <Group justify="space-between" align="flex-end" mb={4}>
          <Text fw={600} size="sm" c="var(--color-text-primary)">
            Policy description
          </Text>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<Upload size={11} />}
            onClick={() => fileInputRef.current?.click()}
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Upload .txt / .md
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </Group>
        <Text size="xs" c="var(--color-text-tertiary)" mb={8} lh={1.5}>
          Describe the policy in plain language. Include key mechanisms, eligibility criteria,
          and expected costs or benefits. The more specific, the more accurate the simulation.
          You can also upload a .txt or .md document.
        </Text>
        <Textarea
          placeholder="A federal carbon tax of $50 per tonne of CO₂ emissions, applied at the point of extraction or import. Revenue will be redistributed as monthly dividends to all US households..."
          maxLength={POLICY_MAX}
          minRows={POLICY_ROWS}
          autosize
          {...form.getInputProps('policy_text')}
          styles={{
            input: {
              backgroundColor: 'var(--color-bg-subtle)',
              borderColor: form.errors.policy_text
                ? 'var(--color-status-error)'
                : 'var(--color-border-default)',
              fontFamily: 'IBM Plex Sans, sans-serif',
              fontSize: 14,
              lineHeight: 1.65,
            },
          }}
        />
        <Box style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          {form.errors.policy_text ? (
            <Text size="xs" c="var(--color-status-error)">{form.errors.policy_text}</Text>
          ) : (
            <span />
          )}
          <CharCounter value={form.values.policy_text} max={POLICY_MAX} />
        </Box>
      </Box>
    </Stack>
  )
}
