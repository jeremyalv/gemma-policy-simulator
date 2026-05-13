/**
 * ProgressPage — live simulation polling view.
 *
 * Route: /simulations/:id
 * Polls GET /simulations/:id/status every 2.5s.
 * Auto-redirects to /simulations/:id/results on completion.
 *
 * States handled:
 *   loading   → spinner
 *   running   → progress bar + milestones + ETA + metadata
 *   completed → success banner (briefly, then auto-redirect)
 *   failed    → error state + retry button
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Stack, Title, Text, Progress, Group,
  Button, Alert, Center, Loader, Badge,
  Card,
} from '@mantine/core'
import {
  CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Lightbulb, Plus, ArrowLeft, RotateCcw,
} from 'lucide-react'
import { runSimulation, ApiError } from '@/api'
import { isBackendDownError, BACKEND_DOWN_MESSAGE } from '@/lib/api-errors'
import { generateIdempotencyKey } from '@/lib/idempotency'
import { formatNumber, formatDuration, formatPct } from '@/lib/format'
import { notifications } from '@mantine/notifications'
import { Layout } from '@/components/layout/Layout'
import { MilestoneSteps } from './MilestoneSteps'
import { useStatusPolling } from './hooks/useStatusPolling'

// ── Rotating fun facts ────────────────────────────────────────────────────────

const POLICY_FACTS = [
  'The RAND Corporation pioneered the use of large-scale simulations to test US military policy in the 1950s. InfiniPol adapts that methodology for public policy.',
  'The average major piece of US legislation takes 7.5 years from first draft to final passage. Most failures happen in the first public reaction phase.',
  'Focus groups typically have 8–12 participants. InfiniPol simulates thousands at once, sampling across every demographic dimension simultaneously.',
  'New Zealand\'s "regulatory impact statements" require each policy to forecast public reaction before introduction. InfiniPol automates a version of this process.',
  'The UK\'s Behavioural Insights Team (the "Nudge Unit") has shown that how a policy is worded can change acceptance by over 30 percentage points.',
  'Approval ratings of policy proposals tend to be 12–18% higher before implementation than 6 months after. Simulation helps find the post-reality gap early.',
  'Denmark has tested social policy proposals with citizen panels since the 1980s. InfiniPol gives every policy team that capability at scale.',
  'In Kahneman\'s research, the same policy reframed in loss vs. gain terms shifted approval from 42% to 71%. Framing is everything.',
  'The first US census was conducted in 1790. It took months. InfiniPol queries a 300K synthetic census equivalent in under 2 minutes.',
  'Synthetic persona research is used by major tech companies to test product decisions. InfiniPol brings the same tooling to public policy.',
  '"Garbage in, garbage out": the quality of your policy description directly determines the accuracy of simulation results. Be specific.',
  'The Overton Window describes the range of policies the public will currently accept. Simulations can help map where any given proposal sits in that window.',
]

function RotatingFacts() {
  const [idx, setIdx] = useState(0)
  const [fading, setFading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setIdx(i => (i + 1) % POLICY_FACTS.length)
        setFading(false)
      }, 400)
    }, 8000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <Box
      style={{
        backgroundColor: 'var(--color-bg-subtle)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 10,
        padding: '14px 16px',
        minHeight: 76,
      }}
    >
      <Group gap={8} align="flex-start">
        <Box style={{ flexShrink: 0, marginTop: 1 }}>
          <Lightbulb size={14} color="var(--color-accent-primary)" />
        </Box>
        <Box style={{ flex: 1 }}>
          <Text
            size="xs"
            fw={600}
            c="var(--color-accent-primary)"
            mb={4}
            style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Did you know?
          </Text>
          <Text
            size="sm"
            c="var(--color-text-secondary)"
            lh={1.65}
            style={{
              opacity: fading ? 0 : 1,
              transition: 'opacity 400ms ease',
            }}
          >
            {POLICY_FACTS[idx]}
          </Text>
        </Box>
      </Group>
    </Box>
  )
}

// ── ETA countdown ──────────────────────────────────────────────────────────────
function EtaCountdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) return
    const timer = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [remaining])

  if (remaining <= 0) return null
  return (
    <Text size="xs" c="var(--color-text-tertiary)">
      Estimated time remaining: <b>{formatDuration(remaining)}</b>
    </Text>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { id: simulationId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const simulationTitle = (location.state as { title?: string } | null)?.title
  const [isRetrying, setIsRetrying] = useState(false)

  const { statusData, isLoading, isError, errorKind, refetch } = useStatusPolling({
    simulationId: simulationId!,
    autoRedirect: true,
  })

  // ── Retry (re-run failed simulation) ──────────────────────────────────────
  async function handleRetry() {
    if (!simulationId) return
    setIsRetrying(true)
    try {
      await runSimulation(simulationId, {}, generateIdempotencyKey())
      // Polling will pick up the new 'running' status automatically
    } catch (err) {
      const is409 = err instanceof ApiError && err.httpStatus === 409
      notifications.show({
        title:   is409 ? 'Cannot retry' : 'Retry failed',
        message: is409
          ? 'This simulation is already running or has completed.'
          : isBackendDownError(err)
          ? BACKEND_DOWN_MESSAGE
          : 'Could not restart simulation. Please try again.',
        color: is409 ? 'orange' : 'red',
      })
    } finally {
      setIsRetrying(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Layout>
        <Center h={400}>
          <Stack align="center" gap="md">
            <Loader size="lg" color="var(--color-accent-primary)" />
            <Text size="sm" c="var(--color-text-secondary)">
              Connecting to simulation…
            </Text>
          </Stack>
        </Center>
      </Layout>
    )
  }

  // ── Error fetching status ─────────────────────────────────────────────────
  if (isError) {
    const isNotFound = errorKind === 'not_found'
    // Transient errors (parse failure, network hiccup) get a friendly
    // auto-retry message; genuine not-found gets the definitive message.
    const isTransient = !isNotFound
    return (
      <Layout>
        <Center h={400}>
          <Stack gap="lg" align="center" maw={440}>
            <Alert
              icon={<AlertCircle size={16} />}
              color={isNotFound ? 'gray' : 'orange'}
              title={
                isNotFound
                  ? 'Simulation not found'
                  : 'Could not connect to simulation'
              }
              w="100%"
            >
              {isNotFound
                ? 'This simulation does not exist or has been deleted.'
                : 'There was a connection issue loading the simulation status. This can happen during page load. Click "Try Again" or wait, the page will auto-retry.'}
            </Alert>
            <Group gap="sm">
              {isTransient && (
                <Button
                  variant="filled"
                  size="sm"
                  leftSection={<RotateCcw size={14} />}
                  onClick={() => refetch()}
                  style={{
                    backgroundColor: 'var(--color-accent-primary)',
                    color: '#fff',
                  }}
                >
                  Try Again
                </Button>
              )}
              <Button
                variant="subtle"
                color="gray"
                size="sm"
                leftSection={<ArrowLeft size={14} />}
                onClick={() => navigate('/simulations')}
              >
                Back to Simulations
              </Button>
            </Group>
          </Stack>
        </Center>
      </Layout>
    )
  }

  const d           = statusData
  const status      = d?.status ?? 'running'
  const pctRaw      = d?.progress_pct ?? 0
  const pct         = Number(pctRaw.toFixed(1))
  const isFailed    = status === 'failed'
  const isCompleted = status === 'completed'
  const telemetry   = d?.run_telemetry ?? null

  return (
    <Layout maxWidth="sm">
      <Stack gap="xl">

        {/* ── Page header ────────────────────────────────────────── */}
        <Box style={{ textAlign: 'center' }}>
          <Title
            order={2}
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: 'Source Serif 4, serif',
              fontWeight: 600,
            }}
          >
            {isFailed ? 'Simulation Failed' : isCompleted ? 'Simulation Complete' : 'Simulation Running'}
          </Title>
          <Text size="sm" c="var(--color-text-secondary)" mt={4}>
            {simulationTitle ?? simulationId}
          </Text>
        </Box>

        {/* ── Status card ───────────────────────────────────────── */}
        <Card
          withBorder
          radius="md"
          style={{
            borderColor: isFailed
              ? 'var(--color-status-error)'
              : isCompleted
              ? 'var(--color-status-success)'
              : 'var(--color-border-subtle)',
          }}
        >
          <Stack gap="lg">

            {/* ── Completed ─────────────────────────────────────── */}
            {isCompleted && (
              <Group gap="sm" justify="center">
                <CheckCircle2 size={28} color="var(--color-status-success)" />
                <Text fw={600} c="var(--color-status-success)">
                  All {formatNumber(d?.agents_total ?? 0)} personas simulated
                </Text>
              </Group>
            )}

            {/* ── Failed ────────────────────────────────────────── */}
            {isFailed && (
              <Alert
                icon={<AlertCircle size={16} />}
                color="red"
                title="Simulation failed"
                style={{ borderColor: 'var(--color-status-error)' }}
              >
                {telemetry?.failure_message
                  ? telemetry.failure_message
                  : 'The simulation encountered an error. This may be due to a backend issue or resource timeout. You can retry below.'}
              </Alert>
            )}

            {/* ── Run telemetry (failure details) ───────────────── */}
            {isFailed && telemetry && (telemetry.failure_code || telemetry.retry_count > 0) && (
              <Box
                style={{
                  backgroundColor: 'var(--color-bg-subtle)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  borderLeft: '3px solid var(--color-status-error)',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '3px 14px',
                  alignItems: 'start',
                }}
              >
                <Text size="xs" c="var(--color-text-tertiary)" fw={600} style={{ gridColumn: '1 / -1', marginBottom: 4 }}>Failure details</Text>
                {telemetry.failure_code && (
                  <>
                    <Text size="xs" c="var(--color-text-tertiary)">Code</Text>
                    <Text size="xs" fw={500} c="var(--color-text-secondary)" style={{ fontFamily: 'monospace' }}>{telemetry.failure_code}</Text>
                  </>
                )}
                {telemetry.failed_persona_id && (
                  <>
                    <Text size="xs" c="var(--color-text-tertiary)">Persona</Text>
                    <Text size="xs" fw={500} c="var(--color-text-secondary)" style={{ fontFamily: 'monospace' }}>{telemetry.failed_persona_id}</Text>
                  </>
                )}
                <Text size="xs" c="var(--color-text-tertiary)">Retries</Text>
                <Text size="xs" fw={500} c="var(--color-text-secondary)">{telemetry.retry_count}</Text>
                <Text size="xs" c="var(--color-text-tertiary)">Invalid outputs</Text>
                <Text size="xs" fw={500} c="var(--color-text-secondary)">{telemetry.invalid_output_count}</Text>
              </Box>
            )}

            {/* ── Progress bar ──────────────────────────────────── */}
            {!isCompleted && (
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text size="xs" fw={600} c="var(--color-text-secondary)">
                    {formatNumber(d?.agents_completed ?? 0)} / {formatNumber(d?.agents_total ?? 0)} personas
                  </Text>
                  <Badge
                    size="sm"
                    variant="light"
                    style={{
                      backgroundColor: isFailed
                        ? 'var(--color-status-error)18'
                        : 'var(--color-accent-primary-subtle)',
                      color: isFailed
                        ? 'var(--color-status-error)'
                        : 'var(--color-accent-primary)',
                      border: 'none',
                    }}
                  >
                    {formatPct(pct, 1)}
                  </Badge>
                </Group>
                <Progress
                  value={pct}
                  size="md"
                  radius="xl"
                  color={isFailed ? 'red' : 'var(--color-accent-primary)'}
                  animated={!isFailed}
                />
                {!isFailed && d && d.estimated_seconds_remaining > 0 && (
                  <EtaCountdown seconds={d.estimated_seconds_remaining} />
                )}
              </Stack>
            )}

            {/* ── Milestones ────────────────────────────────────── */}
            <MilestoneSteps progressPct={pct} isFailed={isFailed} />

            {/* ── Fun facts while waiting ───────────────────────── */}
            {!isFailed && !isCompleted && <RotatingFacts />}

            {/* ── Metadata ──────────────────────────────────────── */}
            {d && (
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
                <Text size="xs" c="var(--color-text-tertiary)">Runtime profile</Text>
                <Text size="xs" fw={500} c="var(--color-text-secondary)" style={{ textTransform: 'capitalize' }}>
                  {d.runtime_profile}
                </Text>
                <Text size="xs" c="var(--color-text-tertiary)">Effective sample</Text>
                <Text size="xs" fw={500} c="var(--color-text-secondary)">
                  {formatNumber(d.effective_sample_size)}
                </Text>
              </Box>
            )}

            {/* ── Actions ───────────────────────────────────────── */}
            <Group justify="center" gap="sm">
              {isFailed && (
                <>
                  <Button
                    leftSection={<RefreshCw size={14} />}
                    loading={isRetrying}
                    disabled={isRetrying}
                    onClick={handleRetry}
                    style={{
                      backgroundColor: 'var(--color-accent-primary)',
                      color: '#fff',
                    }}
                  >
                    Retry Simulation
                  </Button>
                  <Button
                    variant="outline"
                    leftSection={<Plus size={14} />}
                    disabled={isRetrying}
                    onClick={() => navigate('/simulations/new')}
                    style={{
                      borderColor: 'var(--color-border-default)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Create New
                  </Button>
                </>
              )}
              {isCompleted && (
                <Button
                  leftSection={<ArrowRight size={14} />}
                  onClick={() => navigate(`/simulations/${simulationId}/results`)}
                  style={{
                    backgroundColor: 'var(--color-status-success)',
                    color: '#fff',
                  }}
                >
                  View Results
                </Button>
              )}
            </Group>

          </Stack>
        </Card>

      </Stack>
    </Layout>
  )
}
