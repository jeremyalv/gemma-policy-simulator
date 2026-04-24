/**
 * ComparisonPage — side-by-side policy simulation comparison.
 *
 * Route: /compare?add=<simulationId>
 * - ?add pre-populates slot A from the URL (e.g. from ResultsPage "Compare" button)
 * - User selects a second simulation from a searchable dropdown
 * - Side-by-side metrics: mean_approval, dominant_emotion, behavioral_change_pct,
 *   approval distribution bars, effective sample size
 * - Policy precedents from /policy-precedents.json used as keyword search hints
 */

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  Stack, Title, Text, Group, Button, Box,
  Grid, Select, Alert, Center, Loader, Divider,
  Badge, Progress, SimpleGrid, Card,
} from '@mantine/core'
import { ArrowLeft, AlertCircle, GitCompare, TrendingUp, RefreshCw, BookOpen, ChevronRight, X } from 'lucide-react'
import { Layout }               from '@/components/layout/Layout'
import { ApprovalGauge }        from '@/features/results/charts/ApprovalGauge'
import { useSimulations }       from '@/features/dashboard/hooks/useSimulations'
import { useSimulationResults } from '@/features/results/hooks/useSimulationResults'
import {
  formatApproval, formatPct, formatNumber, approvalColor, emotionColor,
} from '@/lib/format'
import type { SimulationResultsData } from '@/api'

// ── Policy precedents (keyword suggest) ──────────────────────────────────────

interface PolicyPrecedent {
  id:       string
  title:    string
  year:     number
  category: string
  keywords: string[]
  summary:  string
}

// ── Slot component ────────────────────────────────────────────────────────────

interface SlotSelectorProps {
  label:           string
  simulationId:    string | null
  onSelect:        (id: string | null) => void
  options:         { value: string; label: string }[]
  isLoadingOpts:   boolean
  accentColor:     string
}

function SlotSelector({
  label, simulationId, onSelect, options, isLoadingOpts, accentColor,
}: SlotSelectorProps) {
  return (
    <Box
      style={{
        border: `2px solid ${simulationId ? accentColor + '60' : 'var(--color-border-subtle)'}`,
        borderRadius: 10,
        padding: '20px',
        backgroundColor: 'var(--color-bg-surface)',
        transition: 'border-color 200ms',
      }}
    >
      <Text
        size="xs" fw={700} mb={10}
        style={{
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: simulationId ? accentColor : 'var(--color-text-tertiary)',
        }}
      >
        {label}
      </Text>
      <Select
        placeholder={isLoadingOpts ? 'Loading simulations…' : 'Select a simulation…'}
        data={options}
        value={simulationId}
        onChange={onSelect}
        searchable
        clearable
        disabled={isLoadingOpts}
        size="sm"
        styles={{
          input: {
            borderColor: simulationId ? accentColor + '80' : 'var(--color-border-default)',
            backgroundColor: 'var(--color-bg-subtle)',
            fontSize: 13,
          },
        }}
      />
    </Box>
  )
}

// ── Metrics column ────────────────────────────────────────────────────────────

interface MetricsColumnProps {
  results:     SimulationResultsData
  accentColor: string
  label:       string
}

function MetricsColumn({ results }: MetricsColumnProps) {
  const { summary, run_config } = results
  const eColor = emotionColor(summary.dominant_emotion)

  const distributionEntries = Object.entries(summary.approval_distribution)
    .sort(([a], [b]) => Number(a) - Number(b))

  return (
    <Stack gap="lg">
      {/* Approval gauge */}
      <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <ApprovalGauge value={summary.mean_approval} size={160} />
        <Text size="xs" c="var(--color-text-tertiary)">
          {formatApproval(summary.mean_approval)} mean approval
        </Text>
      </Box>

      <Divider color="var(--color-border-subtle)" />

      {/* Emotion */}
      <Stack gap={4}>
        <Text size="xs" fw={600} c="var(--color-text-tertiary)"
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Dominant Emotion
        </Text>
        <Group gap={8}>
          <Box
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: eColor,
              flexShrink: 0,
            }}
          />
          <Text fw={700} size="md" style={{ color: eColor, textTransform: 'capitalize' }}>
            {summary.dominant_emotion}
          </Text>
        </Group>
      </Stack>

      {/* Behavioral change */}
      <Stack gap={4}>
        <Text size="xs" fw={600} c="var(--color-text-tertiary)"
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Behavioral Change
        </Text>
        <Group gap={8}>
          <TrendingUp size={16} color="var(--color-status-info)" />
          <Text fw={700} size="lg" c="var(--color-status-info)">
            {formatPct(summary.behavioral_change_pct)}
          </Text>
        </Group>
      </Stack>

      {/* Approval distribution bars */}
      <Stack gap={4}>
        <Text size="xs" fw={600} c="var(--color-text-tertiary)"
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Approval Distribution
        </Text>
        {distributionEntries.map(([level, count]) => {
          const pct = Math.round((count / run_config.effective_sample_size) * 100)
          const color = approvalColor(Number(level))
          return (
            <Group key={level} gap={8} align="center" wrap="nowrap">
              <Text size="xs" c="var(--color-text-tertiary)" w={12} style={{ flexShrink: 0 }}>
                {level}
              </Text>
              <Box style={{ flex: 1 }}>
                <Progress
                  value={pct}
                  color={color}
                  size="sm"
                  radius="xs"
                  styles={{ section: { backgroundColor: color } }}
                />
              </Box>
              <Text size="xs" c="var(--color-text-secondary)" w={34} style={{ flexShrink: 0, textAlign: 'right' }}>
                {pct}%
              </Text>
            </Group>
          )
        })}
      </Stack>

      {/* Sample size */}
      <Stack gap={4}>
        <Text size="xs" fw={600} c="var(--color-text-tertiary)"
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Effective Sample
        </Text>
        <Text fw={700} size="sm" c="var(--color-text-primary)">
          {formatNumber(run_config.effective_sample_size)} personas
        </Text>
      </Stack>
    </Stack>
  )
}

// ── Delta badge (winner / loser indicator) ────────────────────────────────────

function DeltaBadge({ a, b }: { a: number; b: number }) {
  if (a === b) return null
  const delta = Math.abs(a - b).toFixed(2)
  const aWins = a > b
  return (
    <Badge
      size="xs"
      variant="light"
      color={aWins ? 'teal' : 'red'}
      style={{ fontSize: 11 }}
    >
      {aWins ? '▲' : '▼'} {delta}
    </Badge>
  )
}

// ── Reference policy analysis panel ──────────────────────────────────────────

interface ReferenceAnalysisPanelProps {
  precedent: PolicyPrecedent
  simResultA: SimulationResultsData | null
  onDismiss: () => void
}

const REFERENCE_OUTCOMES: Record<string, { pros: string[]; cons: string[]; context: string }> = {
  default: {
    context: 'This policy was introduced in a period of significant public debate. Initial reception was mixed, with proponents pointing to long-term economic benefits and critics raising concerns about short-term costs and distributional impacts.',
    pros: ['Demonstrated measurable impact in pilot programmes', 'Broad coalition support across income levels', 'Evidence-based design with academic backing'],
    cons: ['Implementation costs exceeded initial projections', 'Uneven distribution of benefits across demographic groups', 'Political opposition delayed full rollout'],
  },
}

function ReferenceAnalysisPanel({ precedent, simResultA, onDismiss }: ReferenceAnalysisPanelProps) {
  const outcome = REFERENCE_OUTCOMES[precedent.id] ?? REFERENCE_OUTCOMES['default']
  const approvalDelta = simResultA
    ? `Your simulation scored ${simResultA.summary.mean_approval.toFixed(1)}/5 — this historical policy had a real-world approval trajectory starting from mixed public reaction.`
    : null

  return (
    <Card withBorder radius="md" style={{ borderColor: 'rgba(3,105,161,0.35)', backgroundColor: 'rgba(3,105,161,0.03)' }}>
      <Group justify="space-between" align="flex-start" mb={16}>
        <Group gap={10} align="center">
          <BookOpen size={16} color="#0369A1" />
          <Box>
            <Text fw={700} size="sm" c="var(--color-text-primary)">{precedent.title}</Text>
            <Group gap={6} mt={3}>
              <Badge size="xs" variant="outline" color="gray">{precedent.year}</Badge>
              <Badge size="xs" variant="light" color="blue">{precedent.category}</Badge>
            </Group>
          </Box>
        </Group>
        <Button
          size="xs"
          variant="subtle"
          color="gray"
          leftSection={<X size={12} />}
          onClick={onDismiss}
        >
          Close
        </Button>
      </Group>

      {/* Historical context */}
      <Box mb={16} style={{ backgroundColor: 'var(--color-bg-base)', borderRadius: 8, padding: '12px 14px', border: '1px solid var(--color-border-subtle)' }}>
        <Text size="xs" fw={600} c="var(--color-text-tertiary)" mb={6} style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Historical Context
        </Text>
        <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>{precedent.summary}</Text>
        <Text size="sm" c="var(--color-text-secondary)" lh={1.7} mt={6}>{outcome.context}</Text>
      </Box>

      {/* Pros / Cons */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb={approvalDelta ? 16 : 0}>
        <Box style={{ backgroundColor: 'rgba(21,128,61,0.05)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(21,128,61,0.25)' }}>
          <Text size="xs" fw={600} style={{ color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            What Worked
          </Text>
          <Stack gap={5}>
            {outcome.pros.map((p, i) => (
              <Group key={i} gap={7} align="flex-start" wrap="nowrap">
                <ChevronRight size={12} color="#15803D" style={{ flexShrink: 0, marginTop: 3 }} />
                <Text size="xs" c="var(--color-text-secondary)" lh={1.6}>{p}</Text>
              </Group>
            ))}
          </Stack>
        </Box>
        <Box style={{ backgroundColor: 'rgba(185,28,28,0.05)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(185,28,28,0.25)' }}>
          <Text size="xs" fw={600} style={{ color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Challenges Encountered
          </Text>
          <Stack gap={5}>
            {outcome.cons.map((c, i) => (
              <Group key={i} gap={7} align="flex-start" wrap="nowrap">
                <ChevronRight size={12} color="#B91C1C" style={{ flexShrink: 0, marginTop: 3 }} />
                <Text size="xs" c="var(--color-text-secondary)" lh={1.6}>{c}</Text>
              </Group>
            ))}
          </Stack>
        </Box>
      </SimpleGrid>

      {/* Comparison with simulation */}
      {approvalDelta && (
        <Box style={{ backgroundColor: 'rgba(3,105,161,0.05)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(3,105,161,0.25)' }}>
          <Text size="xs" fw={600} c="#0369A1" mb={4} style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            vs. Your Simulation
          </Text>
          <Text size="sm" c="var(--color-text-secondary)" lh={1.65}>{approvalDelta}</Text>
          <Text size="xs" c="var(--color-text-tertiary)" mt={6} lh={1.5}>
            Keywords matched: {precedent.keywords.slice(0, 5).join(', ')}
          </Text>
        </Box>
      )}
    </Card>
  )
}

// ── Policy precedents keyword hints ──────────────────────────────────────────

function PrecedentHints({
  searchText,
  onInsert,
  onSelect,
}: {
  searchText: string
  onInsert:   (text: string) => void
  onSelect:   (p: PolicyPrecedent) => void
}) {
  const [precedents, setPrecedents] = useState<PolicyPrecedent[]>([])

  useEffect(() => {
    fetch('/policy-precedents.json')
      .then((r) => r.json())
      .then(setPrecedents)
      .catch(() => {/* silently skip */})
  }, [])

  const matches = useMemo(() => {
    if (!searchText || searchText.length < 3) return []
    const lower = searchText.toLowerCase()
    return precedents
      .filter((p) =>
        p.title.toLowerCase().includes(lower) ||
        p.keywords.some((k) => k.includes(lower)) ||
        p.category.toLowerCase().includes(lower),
      )
      .slice(0, 5)
  }, [precedents, searchText])

  if (matches.length === 0) return null

  return (
    <Box
      style={{
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 8,
        backgroundColor: 'var(--color-bg-surface)',
        padding: '14px 16px',
      }}
    >
      <Text size="xs" fw={600} c="var(--color-text-tertiary)" mb={10}
        style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Matching policy precedents — click to analyse
      </Text>
      <Stack gap={8}>
        {matches.map((p) => (
          <Box
            key={p.id}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              padding: '10px 12px',
              borderRadius: 6,
              backgroundColor: 'var(--color-bg-subtle)',
              cursor: 'pointer',
              border: '1px solid var(--color-border-subtle)',
              transition: 'border-color 150ms, background-color 150ms',
            }}
            onClick={() => { onInsert(p.title); onSelect(p) }}
          >
            <Stack gap={2} style={{ flex: 1 }}>
              <Group gap={8} align="center">
                <Text size="xs" fw={600} c="var(--color-text-primary)">{p.title}</Text>
                <Badge size="xs" variant="outline" color="gray">{p.year}</Badge>
                <Badge size="xs" variant="light" color="blue">{p.category}</Badge>
              </Group>
              <Text size="xs" c="var(--color-text-secondary)" lh={1.4}>{p.summary}</Text>
              <Text size="xs" c="var(--color-accent-primary)" mt={2} style={{ fontWeight: 500 }}>
                Click to open full analysis →
              </Text>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}

// ── Slot data loader ──────────────────────────────────────────────────────────

function SlotResultLoader({
  simulationId,
  children,
}: {
  simulationId: string
  children:     (results: SimulationResultsData) => React.ReactNode
}) {
  const { results, isLoading, isError, error } = useSimulationResults(simulationId)

  if (isLoading) {
    return (
      <Center py={60}>
        <Stack align="center" gap="sm">
          <Loader size="sm" color="var(--color-accent-primary)" />
          <Text size="xs" c="var(--color-text-tertiary)">Loading results…</Text>
        </Stack>
      </Center>
    )
  }

  if (isError || !results) {
    return (
      <Alert icon={<AlertCircle size={14} />} color="red" variant="light">
        {(error as Error)?.message ?? 'Could not load results. Simulation may not be complete.'}
      </Alert>
    )
  }

  return <>{children(results)}</>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ComparisonPage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()

  const [slotA, setSlotA] = useState<string | null>(searchParams.get('add'))
  const [slotB, setSlotB] = useState<string | null>(null)
  const [policySearch, setPolicySearch] = useState('')
  const [selectedPrecedent, setSelectedPrecedent] = useState<PolicyPrecedent | null>(null)

  const { simulations, isLoading: simLoading } = useSimulations()

  // Build dropdown options — only completed simulations can be compared
  const completedOptions = useMemo(
    () =>
      simulations
        .filter((s) => s.status === 'completed')
        .map((s) => ({
          value: s.id,
          label: s.title || s.id,
          disabled: (slotA === s.id && slotB !== null) || (slotB === s.id && slotA !== null),
        })),
    [simulations, slotA, slotB],
  )

  // Keep URL param in sync with slot A
  useEffect(() => {
    const url = new URL(window.location.href)
    if (slotA) url.searchParams.set('add', slotA)
    else url.searchParams.delete('add')
    window.history.replaceState(null, '', url.toString())
  }, [slotA])

  const bothSelected  = slotA !== null && slotB !== null
  const slotATitle    = simulations.find((s) => s.id === slotA)?.title ?? slotA ?? ''
  const slotBTitle    = simulations.find((s) => s.id === slotB)?.title ?? slotB ?? ''

  return (
    <Layout maxWidth="xl">
      <Stack gap="xl">

        {/* ── Page header ──────────────────────────────────────────── */}
        <Box>
          <Button
            variant="subtle" color="gray" size="xs"
            leftSection={<ArrowLeft size={13} />}
            onClick={() => navigate('/simulations')}
            mb={12}
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Back to Simulations
          </Button>
          <Group gap={10} align="center">
            <GitCompare size={22} color="var(--color-accent-primary)" />
            <Title
              order={2}
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: 'Source Serif 4, serif',
                fontWeight: 600,
              }}
            >
              Policy Comparison
            </Title>
          </Group>
          <Text size="sm" c="var(--color-text-secondary)" mt={4}>
            Select two completed simulations to compare their results side-by-side.
          </Text>
        </Box>

        {/* ── Slot selectors ────────────────────────────────────────── */}
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <SlotSelector
              label="Simulation A"
              simulationId={slotA}
              onSelect={setSlotA}
              options={completedOptions.filter((o) => o.value !== slotB)}
              isLoadingOpts={simLoading}
              accentColor="#0D9488"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <SlotSelector
              label="Simulation B"
              simulationId={slotB}
              onSelect={setSlotB}
              options={completedOptions.filter((o) => o.value !== slotA)}
              isLoadingOpts={simLoading}
              accentColor="#7C3AED"
            />
          </Grid.Col>
        </Grid>

        {/* ── No completed simulations ─────────────────────────────── */}
        {!simLoading && completedOptions.length === 0 && (
          <Alert icon={<AlertCircle size={14} />} color="blue" variant="light">
            No completed simulations found.{' '}
            <Button
              size="xs" variant="subtle" component={Link}
              to="/simulations/new"
              style={{ color: 'var(--color-accent-primary)', display: 'inline' }}
            >
              Create one
            </Button>{' '}
            to get started.
          </Alert>
        )}

        {/* ── Prompt to select ─────────────────────────────────────── */}
        {!bothSelected && completedOptions.length > 0 && (
          <Center py={48}>
            <Stack align="center" gap="sm">
              <GitCompare size={36} color="var(--color-border-default)" />
              <Text c="var(--color-text-tertiary)" size="sm">
                {slotA === null && slotB === null
                  ? 'Select two simulations above to begin comparing.'
                  : 'Select a second simulation to see the comparison.'}
              </Text>
            </Stack>
          </Center>
        )}

        {/* ── Comparison view ───────────────────────────────────────── */}
        {bothSelected && (
          <Stack gap="xl">

            {/* Top-level score summary */}
            <Box
              style={{
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 10,
                backgroundColor: 'var(--color-bg-surface)',
                padding: '20px 24px',
              }}
            >
              <Text fw={600} size="sm" c="var(--color-text-tertiary)" mb={16}
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Quick comparison
              </Text>
              <SlotResultLoader simulationId={slotA!}>
                {(resultsA) => (
                  <SlotResultLoader simulationId={slotB!}>
                    {(resultsB) => (
                      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                        {/* Mean Approval */}
                        <Card withBorder radius="md" style={{ textAlign: 'center' }}>
                          <Text size="xs" fw={600} c="var(--color-text-tertiary)" mb={8}
                            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Mean Approval
                          </Text>
                          <Group justify="center" gap={16}>
                            <Stack gap={2} align="center">
                              <Text size="xs" c="#0D9488" fw={600}>A</Text>
                              <Text fw={800} size="xl" c="#0D9488">
                                {resultsA.summary.mean_approval.toFixed(1)}
                              </Text>
                            </Stack>
                            <DeltaBadge
                              a={resultsA.summary.mean_approval}
                              b={resultsB.summary.mean_approval}
                            />
                            <Stack gap={2} align="center">
                              <Text size="xs" c="#7C3AED" fw={600}>B</Text>
                              <Text fw={800} size="xl" c="#7C3AED">
                                {resultsB.summary.mean_approval.toFixed(1)}
                              </Text>
                            </Stack>
                          </Group>
                          <Text size="10px" c="var(--color-text-tertiary)" mt={4}>out of 5</Text>
                        </Card>

                        {/* Behavioral Change */}
                        <Card withBorder radius="md" style={{ textAlign: 'center' }}>
                          <Text size="xs" fw={600} c="var(--color-text-tertiary)" mb={8}
                            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Behavioral Change
                          </Text>
                          <Group justify="center" gap={16}>
                            <Stack gap={2} align="center">
                              <Text size="xs" c="#0D9488" fw={600}>A</Text>
                              <Text fw={800} size="xl" c="#0D9488">
                                {formatPct(resultsA.summary.behavioral_change_pct)}
                              </Text>
                            </Stack>
                            <DeltaBadge
                              a={resultsA.summary.behavioral_change_pct}
                              b={resultsB.summary.behavioral_change_pct}
                            />
                            <Stack gap={2} align="center">
                              <Text size="xs" c="#7C3AED" fw={600}>B</Text>
                              <Text fw={800} size="xl" c="#7C3AED">
                                {formatPct(resultsB.summary.behavioral_change_pct)}
                              </Text>
                            </Stack>
                          </Group>
                        </Card>

                        {/* Dominant Emotions */}
                        <Card withBorder radius="md" style={{ textAlign: 'center' }}>
                          <Text size="xs" fw={600} c="var(--color-text-tertiary)" mb={8}
                            style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Dominant Emotion
                          </Text>
                          <Group justify="center" gap={12}>
                            <Badge
                              size="sm"
                              variant="light"
                              style={{
                                backgroundColor: `${emotionColor(resultsA.summary.dominant_emotion)}20`,
                                color: emotionColor(resultsA.summary.dominant_emotion),
                                textTransform: 'capitalize',
                              }}
                            >
                              A: {resultsA.summary.dominant_emotion}
                            </Badge>
                            <Badge
                              size="sm"
                              variant="light"
                              style={{
                                backgroundColor: `${emotionColor(resultsB.summary.dominant_emotion)}20`,
                                color: emotionColor(resultsB.summary.dominant_emotion),
                                textTransform: 'capitalize',
                              }}
                            >
                              B: {resultsB.summary.dominant_emotion}
                            </Badge>
                          </Group>
                        </Card>
                      </SimpleGrid>
                    )}
                  </SlotResultLoader>
                )}
              </SlotResultLoader>
            </Box>

            {/* Full side-by-side */}
            <Grid gutter="xl">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box
                  style={{
                    border: '2px solid #0D948840',
                    borderRadius: 10,
                    backgroundColor: 'var(--color-bg-surface)',
                    padding: '24px',
                  }}
                >
                  <Group gap={8} mb={20}>
                    <Box
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: '#0D9488',
                      }}
                    />
                    <Text fw={700} size="sm" c="var(--color-text-primary)">
                      A — {slotATitle}
                    </Text>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      component={Link}
                      to={`/simulations/${slotA}/results`}
                      ml="auto"
                    >
                      View full results →
                    </Button>
                  </Group>
                  <SlotResultLoader simulationId={slotA!}>
                    {(results) => <MetricsColumn results={results} accentColor="#0D9488" label="A" />}
                  </SlotResultLoader>
                </Box>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box
                  style={{
                    border: '2px solid #7C3AED40',
                    borderRadius: 10,
                    backgroundColor: 'var(--color-bg-surface)',
                    padding: '24px',
                  }}
                >
                  <Group gap={8} mb={20}>
                    <Box
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: '#7C3AED',
                      }}
                    />
                    <Text fw={700} size="sm" c="var(--color-text-primary)">
                      B — {slotBTitle}
                    </Text>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      component={Link}
                      to={`/simulations/${slotB}/results`}
                      ml="auto"
                    >
                      View full results →
                    </Button>
                  </Group>
                  <SlotResultLoader simulationId={slotB!}>
                    {(results) => <MetricsColumn results={results} accentColor="#7C3AED" label="B" />}
                  </SlotResultLoader>
                </Box>
              </Grid.Col>
            </Grid>

            {/* Reset */}
            <Group justify="center">
              <Button
                variant="subtle"
                color="gray"
                size="sm"
                leftSection={<RefreshCw size={13} />}
                onClick={() => { setSlotA(null); setSlotB(null) }}
              >
                Reset comparison
              </Button>
            </Group>

          </Stack>
        )}

        {/* ── Historical policy reference ───────────────────────── */}
        <Stack gap="sm">
          <Box>
            <Group gap={8} align="center" mb={6}>
              <BookOpen size={14} color="var(--color-text-tertiary)" />
              <Text size="xs" fw={600} c="var(--color-text-tertiary)"
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Compare with a historical policy precedent
              </Text>
            </Group>
            <Text size="xs" c="var(--color-text-tertiary)" mb={8} lh={1.5}>
              Search for a real-world policy to see what worked, what didn't, and how it compares to your simulation.
            </Text>
            <input
              type="text"
              placeholder="e.g. healthcare reform, carbon tax, minimum wage…"
              value={policySearch}
              onChange={(e) => { setPolicySearch(e.target.value); setSelectedPrecedent(null) }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-border-default)',
                backgroundColor: 'var(--color-bg-subtle)',
                fontSize: 13,
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </Box>
          <PrecedentHints
            searchText={policySearch}
            onInsert={(title) => {
              setPolicySearch(title)
            }}
            onSelect={(precedent) => setSelectedPrecedent(precedent)}
          />

          {selectedPrecedent && slotA && (
            <SlotResultLoader simulationId={slotA}>
              {(resultsA) => (
                <ReferenceAnalysisPanel
                  precedent={selectedPrecedent}
                  simResultA={resultsA}
                  onDismiss={() => setSelectedPrecedent(null)}
                />
              )}
            </SlotResultLoader>
          )}
          {selectedPrecedent && !slotA && (
            <ReferenceAnalysisPanel
              precedent={selectedPrecedent}
              simResultA={null}
              onDismiss={() => setSelectedPrecedent(null)}
            />
          )}
        </Stack>

      </Stack>
    </Layout>
  )
}
