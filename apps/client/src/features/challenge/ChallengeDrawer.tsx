/**
 * ChallengeDrawer — generates AI adversarial questions about the simulation results.
 * Opened from the floating button on ResultsPage.
 *
 * IMPORTANT: This does NOT re-run the simulation with adversarial framing.
 * It generates challenge question text for the user to consider — the approval
 * score shown in results is NOT updated or compared after a challenge round.
 * TODO (Phase 2): trigger a real re-simulation with adversarial context injected
 * and display a differential approval score (original range vs. challenged range).
 *
 * Current flow: FocusPicker → ChallengeDisplay (text generation) → FollowupDisplay
 */

import { Drawer, Stack, Text, Group, Alert, Loader, Box } from '@mantine/core'
import { AlertCircle, Bot } from 'lucide-react'
import { FocusPicker }      from './FocusPicker'
import { ChallengeDisplay } from './ChallengeDisplay'
import { FollowupDisplay }  from './FollowupDisplay'
import { useChallengeFlow } from './hooks/useChallengeFlow'
import type { FocusValue }  from './hooks/useChallengeFlow'

interface ChallengeDrawerProps {
  opened:           boolean
  onClose:          () => void
  simulationId:     string
  simulationTitle?: string
  originalPolicy?:  string
}

export function ChallengeDrawer({
  opened, onClose,
  simulationId, simulationTitle, originalPolicy = '',
}: ChallengeDrawerProps) {
  const flow = useChallengeFlow({ simulationId })

  function handleClose() {
    onClose()
    flow.close()
  }

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      position="right"
      size={480}
      title={
        <Group gap={8}>
          <Box
            style={{
              width: 28, height: 28, borderRadius: '50%',
              backgroundColor: 'var(--color-accent-primary-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Bot size={14} color="var(--color-accent-primary)" />
          </Box>
          <Text fw={600} size="sm" c="var(--color-text-primary)">
            Challenge Results
          </Text>
          {flow.loopCount > 0 && (
            <Text size="xs" c="var(--color-text-tertiary)">
              Round {flow.loopCount + 1}
            </Text>
          )}
        </Group>
      }
      styles={{
        header: {
          borderBottom: '1px solid var(--color-border-subtle)',
          padding: '14px 20px',
          backgroundColor: 'var(--color-bg-surface)',
        },
        body: {
          padding: '20px',
          backgroundColor: 'var(--color-bg-base)',
          overflowY: 'auto',
        },
        overlay: { backdropFilter: 'blur(2px)' },
      }}
    >
      <Stack gap="lg">

        {/* State: picking */}
        {(flow.state === 'idle' || flow.state === 'picking') && (
          <FocusPicker
            selected={flow.selectedFocus}
            onSelect={(f: FocusValue) => flow.selectFocus(f)}
            onStart={flow.startChallenge}
            isLoading={false}
            loopCount={flow.loopCount}
          />
        )}

        {/* State: loading challenge */}
        {flow.state === 'loading_challenge' && (
          <Stack align="center" gap="md" py={40}>
            <Loader size="md" color="var(--color-accent-primary)" />
            <Text size="sm" c="var(--color-text-secondary)">
              Gemma is analysing your results…
            </Text>
          </Stack>
        )}

        {/* State: challenging */}
        {flow.state === 'challenging' && flow.challenge && (
          <ChallengeDisplay
            challenge={flow.challenge}
            onSubmit={flow.submitResponse}
            isSubmitting={false}
          />
        )}

        {/* State: submitting */}
        {flow.state === 'submitting' && flow.challenge && (
          <>
            <ChallengeDisplay
              challenge={flow.challenge}
              onSubmit={flow.submitResponse}
              isSubmitting
            />
            <Stack align="center" gap="sm" py={16}>
              <Loader size="sm" color="var(--color-accent-primary)" />
              <Text size="xs" c="var(--color-text-tertiary)">
                Gemma is reviewing your response…
              </Text>
            </Stack>
          </>
        )}

        {/* State: followup */}
        {flow.state === 'followup' && flow.followup && (
          <FollowupDisplay
            followup={flow.followup}
            originalPolicy={originalPolicy}
            simulationId={simulationId}
            simulationTitle={simulationTitle}
            onChallengeAgain={flow.challengeAgain}
            onClose={handleClose}
          />
        )}

        {/* State: error */}
        {flow.state === 'error' && (
          <Alert
            icon={<AlertCircle size={16} />}
            color="red"
            title="Challenge failed"
          >
            <Stack gap={8}>
              <Text size="sm">
                {flow.error ?? 'Could not generate challenge.'}
              </Text>
              <Group gap={8}>
                <Text
                  size="xs"
                  component="span"
                  style={{
                    cursor: 'pointer',
                    color: 'var(--color-status-error)',
                    textDecoration: 'underline',
                  }}
                  onClick={flow.retry}
                >
                  Retry
                </Text>
                <Text
                  size="xs"
                  component="span"
                  style={{ cursor: 'pointer', color: 'var(--color-text-tertiary)', textDecoration: 'underline' }}
                  onClick={handleClose}
                >
                  Close
                </Text>
              </Group>
            </Stack>
          </Alert>
        )}

      </Stack>
    </Drawer>
  )
}
