/**
 * FollowupDisplay — Step 3 of the challenge flow.
 * Shows: Gemma followup text + diff-highlighted policy refinement + action buttons.
 */

import { Stack, Box, Text, Group, Button, Divider } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Play, Bookmark } from 'lucide-react'
import { ChatBubble } from '@/features/clarification/ChatBubble'
import { PolicyDiff }  from './PolicyDiff'
import { notifications } from '@mantine/notifications'
import type { ChallengeFollowupData } from '@/api'

interface FollowupDisplayProps {
  followup:         ChallengeFollowupData
  originalPolicy:   string
  simulationId:     string
  simulationTitle?: string
  onChallengeAgain: () => void
  onClose:          () => void
}

export function FollowupDisplay({
  followup, originalPolicy, simulationId,
  simulationTitle, onChallengeAgain, onClose,
}: FollowupDisplayProps) {
  const navigate = useNavigate()

  const hasRefinement = followup.suggested_policy_refinement &&
    followup.suggested_policy_refinement !== originalPolicy

  function handleUseRefinement() {
    navigate('/simulations/new', {
      state: {
        // Pre-fill the Create form with the refined policy
        policy_text: followup.suggested_policy_refinement,
        title: simulationTitle ? `[Revised] ${simulationTitle}` : '',
        from_simulation_id: simulationId,
      },
    })
  }

  function handleSaveAndClose() {
    notifications.show({
      title: 'Refinement noted',
      message: 'The suggested policy refinement has been recorded.',
      color: 'green',
      autoClose: 3000,
    })
    onClose()
  }

  return (
    <Stack gap="lg">
      {/* Gemma followup bubble */}
      <ChatBubble role="gemma">
        {followup.followup_text}
      </ChatBubble>

      {/* Diff panel */}
      {hasRefinement && (
        <Box>
          <Text
            size="xs" fw={600} c="var(--color-text-tertiary)" mb={8}
            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Suggested Policy Refinement
          </Text>
          <Text size="xs" c="var(--color-text-tertiary)" mb={8} lh={1.4}>
            <span style={{ color: '#B91C1C', textDecoration: 'line-through' }}>Red strikethrough</span>
            {' '}= removed · {' '}
            <span style={{ color: '#15803D', fontWeight: 600 }}>Green</span>
            {' '}= added
          </Text>
          <PolicyDiff
            original={originalPolicy}
            revised={followup.suggested_policy_refinement}
          />
        </Box>
      )}

      <Divider color="var(--color-border-subtle)" />

      {/* Actions */}
      <Stack gap={8}>
        {hasRefinement && (
          <Button
            fullWidth
            leftSection={<Play size={14} />}
            onClick={handleUseRefinement}
            style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff' }}
          >
            Use Revision &amp; Re-run
          </Button>
        )}
        <Group grow>
          <Button
            variant="outline"
            leftSection={<RefreshCw size={14} />}
            onClick={onChallengeAgain}
            style={{
              borderColor: 'var(--color-border-default)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Challenge Again
          </Button>
          <Button
            variant="subtle"
            color="gray"
            leftSection={<Bookmark size={14} />}
            onClick={handleSaveAndClose}
          >
            Save &amp; Close
          </Button>
        </Group>
      </Stack>
    </Stack>
  )
}
