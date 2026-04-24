/**
 * ChallengeDisplay — Step 2 of the challenge flow.
 * Shows: Gemma's challenge text bubble + evidence card + user response textarea.
 */

import { useState } from 'react'
import {
  Stack, Box, Text, Group, Button, Textarea,
  Badge, Loader,
} from '@mantine/core'
import { Send } from 'lucide-react'
import { ChatBubble } from '@/features/clarification/ChatBubble'
import { formatApproval } from '@/lib/format'
import type { ChallengeData } from '@/api'

const MAX_RESPONSE = 1000

interface ChallengeDisplayProps {
  challenge:     ChallengeData
  onSubmit:      (response: string) => void
  isSubmitting:  boolean
}

export function ChallengeDisplay({ challenge, onSubmit, isSubmitting }: ChallengeDisplayProps) {
  const [response, setResponse] = useState('')
  const remaining = MAX_RESPONSE - response.length
  const warn = remaining < 100

  function handleSubmit() {
    if (!response.trim() || isSubmitting) return
    onSubmit(response.trim())
  }

  return (
    <Stack gap="lg">
      {/* Gemma challenge bubble */}
      <ChatBubble role="gemma">
        {challenge.challenge_text}
      </ChatBubble>

      {/* Evidence card */}
      <Box
        style={{
          border: '1px solid var(--color-border-default)',
          borderRadius: 8,
          padding: '14px 16px',
          backgroundColor: 'var(--color-bg-subtle)',
        }}
      >
        <Text
          size="xs"
          fw={600}
          c="var(--color-text-tertiary)"
          mb={10}
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Evidence
        </Text>
        <Stack gap={6}>
          <Group gap={8}>
            <Text size="xs" c="var(--color-text-secondary)" fw={500}>Segment</Text>
            <Badge size="sm" variant="light" color="blue" style={{ textTransform: 'none' }}>
              {challenge.evidence.segment}
            </Badge>
          </Group>
          <Group gap={8}>
            <Text size="xs" c="var(--color-text-secondary)" fw={500}>Mean Approval</Text>
            <Text size="xs" fw={700} c="var(--color-status-error)">
              {formatApproval(challenge.evidence.mean_approval)}
            </Text>
          </Group>
          <Box mt={4}>
            <Text size="xs" c="var(--color-text-secondary)" fw={500} mb={4}>Top Concern</Text>
            <Text
              size="xs"
              c="var(--color-text-secondary)"
              lh={1.6}
              style={{ fontStyle: 'italic' }}
            >
              "{challenge.evidence.top_concern}"
            </Text>
          </Box>
        </Stack>
      </Box>

      {/* Response input */}
      <Stack gap={6}>
        <Text size="xs" fw={500} c="var(--color-text-secondary)">
          Your response
        </Text>
        <Textarea
          placeholder="How does your policy address this concern? What provisions protect this segment?"
          value={response}
          onChange={(e) => setResponse(e.currentTarget.value)}
          maxLength={MAX_RESPONSE}
          minRows={4}
          autosize
          disabled={isSubmitting}
          styles={{
            input: {
              backgroundColor: 'var(--color-bg-subtle)',
              borderColor: 'var(--color-border-default)',
              fontSize: 13,
            },
          }}
        />
        <Group justify="space-between">
          <Text size="xs" style={{ color: warn ? 'var(--color-status-warning)' : 'var(--color-text-tertiary)' }}>
            {remaining} characters remaining
          </Text>
          <Button
            size="sm"
            leftSection={isSubmitting ? <Loader size={13} /> : <Send size={13} />}
            disabled={!response.trim() || isSubmitting}
            onClick={handleSubmit}
            style={{
              backgroundColor: response.trim() ? 'var(--color-accent-primary)' : undefined,
              color: response.trim() ? '#fff' : undefined,
            }}
          >
            Submit Response
          </Button>
        </Group>
      </Stack>
    </Stack>
  )
}
