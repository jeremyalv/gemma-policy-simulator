/**
 * ResultsPage — full results view for a completed simulation.
 *
 * Route: /simulations/:id/results
 * Data: GET /simulations/:id/results (immutable once completed)
 *
 * Tabs: Overview | Demographics | Voices
 * Advanced toggle: shows Choropleth + Sankey in Demographics tab
 */

import { useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Stack, Title, Text, Group, Button, Box,
  Tabs, Alert, Center, Skeleton, SimpleGrid, Affix, Transition,
} from '@mantine/core'
import { AlertCircle, ArrowLeft, GitCompare, Swords } from 'lucide-react'
import { Layout }               from '@/components/layout/Layout'
import { ExecutiveSummary }     from './ExecutiveSummary'
import { ApprovalDistribution } from './charts/ApprovalDistribution'
import { DemographicTabs }      from './charts/DemographicTabs'
import { EmotionRadar }         from './charts/EmotionRadar'
import { USChoropleth }         from './charts/USChoropleth'
import { FlowSankey }           from './charts/FlowSankey'
import { VoicesTab }            from './VoicesTab'
import { ApprovalHeatmap }      from './charts/ApprovalHeatmap'
import { ExportActions }        from './ExportActions'
import { ChallengeDrawer }      from '@/features/challenge/ChallengeDrawer'
import { useSimulationResults } from './hooks/useSimulationResults'
import { buildSankeyData }      from './aggregators'

// ── Section card ─────────────────────────────────────────────────────────────
function SectionCard({
  title, subtitle, children, className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Box
      className={className}
      style={{
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 12,
        backgroundColor: 'var(--color-bg-surface)',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Box mb={subtitle ? 4 : 20} pb={subtitle ? 0 : 16} style={{ borderBottom: subtitle ? 'none' : '1px solid var(--color-border-subtle)' }}>
        <Text
          fw={700}
          style={{
            fontSize: 13,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </Text>
      </Box>
      {subtitle && (
        <Text size="xs" c="var(--color-text-tertiary)" mb={16} mt={4} lh={1.55}>{subtitle}</Text>
      )}
      {children}
    </Box>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function ResultsSkeleton() {
  return (
    <Stack gap="xl">
      <Skeleton height={32} width="50%" radius="sm" />
      <Skeleton height={280} radius="md" />
      <Skeleton height={220} radius="md" />
      <Skeleton height={300} radius="md" />
    </Stack>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { id: simulationId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const simulationTitle = (location.state as { title?: string } | null)?.title
  const [challengeOpen,  setChallengeOpen]  = useState(false)

  const { results, isLoading, isError, error, errorKind } = useSimulationResults(simulationId!)

  const sankeyData = useMemo(() => {
    if (!results) return { nodes: [], links: [] }
    return buildSankeyData(results)
  }, [results])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return <Layout maxWidth="xl"><ResultsSkeleton /></Layout>
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || !results) {
    // Simulation not complete yet (still running, pending, or failed)
    if (errorKind === 'lifecycle_conflict') {
      return (
        <Layout>
          <Center h={400}>
            <Stack align="center" gap="lg" maw={440}>
              <Alert
                icon={<AlertCircle size={16} />}
                color="orange"
                title="Simulation not complete"
                w="100%"
              >
                This simulation has not finished yet, or encountered a failure.
                Check the status page to see the current state and retry if needed.
              </Alert>
              <Button
                leftSection={<ArrowLeft size={14} />}
                onClick={() => navigate(`/simulations/${simulationId}`)}
                style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff' }}
              >
                View Status
              </Button>
            </Stack>
          </Center>
        </Layout>
      )
    }

    // Simulation deleted or never existed
    if (errorKind === 'not_found') {
      return (
        <Layout>
          <Center h={400}>
            <Stack align="center" gap="lg" maw={440}>
              <Alert
                icon={<AlertCircle size={16} />}
                color="gray"
                title="Simulation not found"
                w="100%"
              >
                This simulation no longer exists. It may have been deleted.
              </Alert>
              <Button
                variant="subtle"
                color="gray"
                leftSection={<ArrowLeft size={14} />}
                onClick={() => navigate('/simulations')}
              >
                Back to Simulations
              </Button>
            </Stack>
          </Center>
        </Layout>
      )
    }

    // Generic error (backend down, network, etc.)
    return (
      <Layout>
        <Center h={400}>
          <Alert icon={<AlertCircle size={16} />} color="red" title="Could not load results" maw={440}>
            {(error as Error)?.message ?? 'Simulation may not be complete yet.'}
            <Box mt="sm">
              <Button size="xs" variant="subtle"
                onClick={() => navigate(`/simulations/${simulationId}`)}>
                Check simulation status
              </Button>
            </Box>
          </Alert>
        </Center>
      </Layout>
    )
  }

  const { summary, demographic_breakdown, emotion_profile, run_config, representative_quotes } = results
  const ageLayerCount     = Object.keys(demographic_breakdown.by_age_group).length
  const emotionLayerCount = Math.min(3, Object.keys(emotion_profile).length)

  return (
    <Layout maxWidth="xl">
      {/* ── Challenge Drawer ─────────────────────────────────────────────── */}
      <ChallengeDrawer
        opened={challengeOpen}
        onClose={() => setChallengeOpen(false)}
        simulationId={simulationId!}
        simulationTitle={simulationTitle}
      />

      {/* ── Floating challenge FAB ───────────────────────────────────────── */}
      <Affix position={{ bottom: 28, right: 28 }}>
        <Transition transition="slide-up" mounted>
          {(styles) => (
            <Button
              style={{
                ...styles,
                backgroundColor: 'var(--color-accent-primary)',
                color: '#fff',
                boxShadow: '0 4px 18px rgba(0,0,0,0.22)',
                borderRadius: 28,
                paddingInline: 20,
                height: 44,
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: '-0.01em',
              }}
              leftSection={<Swords size={16} />}
              onClick={() => setChallengeOpen(true)}
            >
              Challenge Results
            </Button>
          )}
        </Transition>
      </Affix>

      <Stack gap="xl">

        {/* ── Page header ──────────────────────────────────────────── */}
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Box>
            <Button
              variant="subtle" color="gray" size="xs"
              leftSection={<ArrowLeft size={13} />}
              onClick={() => navigate('/simulations')} mb={10}
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Back to Simulations
            </Button>
            <Title
              order={2}
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: 'Source Serif 4, serif',
                fontWeight: 600,
              }}
            >
              Simulation Results
            </Title>
            <Text size="sm" c="var(--color-text-secondary)" mt={4}>{simulationTitle ?? simulationId}</Text>
          </Box>

          <Group gap="sm" wrap="wrap">
            <Button
              size="sm" variant="outline"
              leftSection={<GitCompare size={14} />}
              component={Link}
              to={`/compare?add=${simulationId}`}
              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
            >
              Compare
            </Button>
            <ExportActions simulationId={simulationId!} />
          </Group>
        </Group>

        {/* ── Tabbed content ────────────────────────────────────────── */}
        <Tabs
          defaultValue="overview"
          color="var(--color-accent-primary)"
          styles={{
            tab: { fontSize: 14, fontWeight: 500, paddingTop: 10, paddingBottom: 10 },
            panel: { paddingTop: 28 },
            list: { borderBottom: '2px solid var(--color-border-subtle)' },
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="demographics">Demographics</Tabs.Tab>
            <Tabs.Tab value="voices">Voices ({representative_quotes?.length ?? 0})</Tabs.Tab>
          </Tabs.List>

          {/* ── Overview ──────────────────────────────────────────── */}
          <Tabs.Panel value="overview">
            <Stack gap="xl">
              <ExecutiveSummary results={results} />

              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
                <SectionCard title="Approval Distribution">
                  <ApprovalDistribution
                    distribution={summary.approval_distribution}
                    totalSample={run_config.effective_sample_size}
                  />
                </SectionCard>
                <SectionCard title="Emotion Profile">
                  <EmotionRadar emotionProfile={emotion_profile} />
                </SectionCard>
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* ── Demographics ──────────────────────────────────────── */}
          <Tabs.Panel value="demographics">
            <Stack gap="xl">

              {/* Core demographic breakdown */}
              <SectionCard title="Demographic Breakdown">
                <DemographicTabs breakdown={demographic_breakdown} />
              </SectionCard>

              {/* Approval heatmap by age group */}
              <SectionCard title="Approval Distribution by Age Group" subtitle="Estimated % of each age group giving each approval score">
                <ApprovalHeatmap byAgeGroup={demographic_breakdown.by_age_group as Record<string, { mean_approval: number; count: number }>} />
              </SectionCard>

              {/* Choropleth map */}
              <SectionCard title="Approval by State: Map View">
                <USChoropleth byState={demographic_breakdown.by_state as Record<string, number>} />
              </SectionCard>

              {/* Sankey flow */}
              <SectionCard title="Response Flow: Age to Emotion to Approval" subtitle="How age groups flow through emotional response to approval outcomes">
                <FlowSankey
                  data={sankeyData}
                  ageLayers={ageLayerCount}
                  emotionLayers={emotionLayerCount}
                />
              </SectionCard>
            </Stack>
          </Tabs.Panel>

          {/* ── Voices ────────────────────────────────────────────── */}
          <Tabs.Panel value="voices">
            <SectionCard title="Representative Voices">
              {representative_quotes && representative_quotes.length > 0 ? (
                <VoicesTab quotes={representative_quotes} />
              ) : (
                <Text size="sm" c="var(--color-text-tertiary)" style={{ textAlign: 'center', padding: '32px 0' }}>
                  No representative quotes available for this simulation.
                </Text>
              )}
            </SectionCard>
          </Tabs.Panel>
        </Tabs>

      </Stack>
    </Layout>
  )
}
