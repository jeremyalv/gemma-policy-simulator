/**
 * ChallengePage — standalone route for the challenge flow.
 * Route: /simulations/:id/results/challenge
 *
 * Full-page version of ChallengeDrawer (no drawer chrome).
 * Useful when navigating directly or in narrow contexts.
 */

import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Box, Stack, Title, Text, Button,
  Alert, Loader, Center,
} from '@mantine/core'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Layout }           from '@/components/layout/Layout'
import { FocusPicker }      from './FocusPicker'
import { ChallengeDisplay } from './ChallengeDisplay'
import { FollowupDisplay }  from './FollowupDisplay'
import { useChallengeFlow } from './hooks/useChallengeFlow'
import type { FocusValue }  from './hooks/useChallengeFlow'
import { useSimulationResults } from '@/features/results/hooks/useSimulationResults'

export default function ChallengePage() {
  const { id: simulationId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const flow = useChallengeFlow({ simulationId: simulationId! })
  const { results } = useSimulationResults(simulationId!)

  const originalPolicy = '' // would come from simulation draft in a full implementation

  // Auto-open picker on mount
  if (flow.state === 'idle') flow.open()

  return (
    <Layout maxWidth="sm">
      <Stack gap="xl">

        {/* Header */}
        <Box>
          <Button
            variant="subtle" color="gray" size="xs"
            leftSection={<ArrowLeft size={13} />}
            component={Link}
            to={`/simulations/${simulationId}/results`}
            mb={12}
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Back to Results
          </Button>
          <Title order={2} style={{
            color: 'var(--color-text-primary)',
            fontFamily: 'Source Serif 4, serif', fontWeight: 600,
          }}>
            Challenge Results
          </Title>
          <Text size="sm" c="var(--color-text-secondary)" mt={4}>
            {flow.loopCount > 0
              ? `Round ${flow.loopCount + 1} — challenge your policy assumptions again`
              : 'Let Gemma surface a weakness in your simulation results'}
          </Text>
        </Box>

        {/* Mock fallback banner */}
        {flow.isMockFallback && (
          <Alert icon={<AlertCircle size={14} />} color="yellow" variant="light">
            Backend challenge endpoint is in development — showing mock response.
          </Alert>
        )}

        {/* Content area */}
        <Box
          style={{
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 10,
            backgroundColor: 'var(--color-bg-surface)',
            padding: '24px',
          }}
        >
          {/* Picking */}
          {(flow.state === 'picking') && (
            <FocusPicker
              selected={flow.selectedFocus}
              onSelect={(f: FocusValue) => flow.selectFocus(f)}
              onStart={flow.startChallenge}
              isLoading={false}
              loopCount={flow.loopCount}
            />
          )}

          {/* Loading challenge */}
          {flow.state === 'loading_challenge' && (
            <Center py={60}>
              <Stack align="center" gap="md">
                <Loader size="lg" color="var(--color-accent-primary)" />
                <Text size="sm" c="var(--color-text-secondary)">
                  Gemma is analysing your results…
                </Text>
              </Stack>
            </Center>
          )}

          {/* Challenge */}
          {(flow.state === 'challenging' || flow.state === 'submitting') && flow.challenge && (
            <ChallengeDisplay
              challenge={flow.challenge}
              onSubmit={flow.submitResponse}
              isSubmitting={flow.state === 'submitting'}
            />
          )}

          {/* Followup */}
          {flow.state === 'followup' && flow.followup && (
            <FollowupDisplay
              followup={flow.followup}
              originalPolicy={originalPolicy}
              simulationId={simulationId!}
              simulationTitle={results?.id}
              onChallengeAgain={flow.challengeAgain}
              onClose={() => navigate(`/simulations/${simulationId}/results`)}
            />
          )}

          {/* Error */}
          {flow.state === 'error' && (
            <Alert icon={<AlertCircle size={16} />} color="red" title="Challenge failed">
              <Stack gap="sm">
                <Text size="sm">{flow.error ?? 'Could not generate challenge.'}</Text>
                <Button size="xs" variant="subtle" color="red" onClick={flow.retry}>
                  Retry
                </Button>
              </Stack>
            </Alert>
          )}
        </Box>

      </Stack>
    </Layout>
  )
}
