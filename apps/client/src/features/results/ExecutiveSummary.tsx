/**
 * ExecutiveSummary — top section of Results page.
 * Shows: ApprovalGauge, behavioral change %, dominant emotion, sample metadata.
 *
 * CONTRACT: mean_approval shown as "X.X / 5". Never as percentage.
 */

import { Box, Group, Stack, Text, SimpleGrid, Card } from '@mantine/core'
import { TrendingUp, Users, Zap, ThumbsUp, ThumbsDown, AlertTriangle, Sparkles } from 'lucide-react'
import { ApprovalGauge } from './charts/ApprovalGauge'
import { formatNumber, emotionColor, formatPct } from '@/lib/format'
import type { SimulationResultsData } from '@/api'

// Map approval score to a prose label
function approvalNarrative(score: number): string {
  if (score < 2)   return 'Strong opposition: most respondents oppose this policy.'
  if (score < 2.8) return 'Moderate opposition: a majority lean against this policy.'
  if (score < 3.2) return 'Mixed reception: public opinion is divided.'
  if (score < 3.8) return 'Moderate support: a majority lean in favour.'
  return 'Strong support: most respondents approve of this policy.'
}

// Generate "In a Nutshell" narrative from results data
function generateNutshell(results: SimulationResultsData): string {
  const { summary } = results
  const score = summary.mean_approval
  const emotion = summary.dominant_emotion
  const behaviorPct = formatPct(summary.behavioral_change_pct)
  const narrative = approvalNarrative(score)

  return `${narrative} The mean approval score of ${score.toFixed(1)}/5 suggests ` +
    `${score >= 3.5 ? 'a generally receptive public, though key segments may still push back' : score >= 3 ? 'a divided public with significant concerns to address' : 'substantial resistance that would require major policy rethinking'}. ` +
    `The dominant emotional response is ${emotion}, and ${behaviorPct} of personas indicated they would change their behaviour as a result of this policy. ` +
    `${score >= 4 ? 'This is a strong foundation; focus on the demographic gaps and dissenting voices before rollout.' : score >= 3.2 ? 'Work on messaging and the segments showing concern before moving forward.' : 'Consider significant rethinking or targeted pilot programmes before broader rollout.'}`
}

// Derive strengths & concerns from approval distribution
function deriveHighlights(results: SimulationResultsData): { strengths: string[]; concerns: string[] } {
  const { summary } = results
  const dist = summary.approval_distribution
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1

  const support4 = ((dist['4'] ?? 0) + (dist['5'] ?? 0)) / total
  const oppose   = ((dist['1'] ?? 0) + (dist['2'] ?? 0)) / total
  const neutral  = (dist['3'] ?? 0) / total

  const strengths: string[] = []
  const concerns: string[]  = []

  if (support4 >= 0.55)  strengths.push(`Strong majority support: ${Math.round(support4 * 100)}% rated 4 or 5`)
  if (support4 >= 0.4 && support4 < 0.55) strengths.push(`Solid plurality support: ${Math.round(support4 * 100)}% rated 4 or 5`)
  if (summary.dominant_emotion === 'hope' || summary.dominant_emotion === 'joy') strengths.push(`Positive dominant emotion: "${summary.dominant_emotion}" signals genuine enthusiasm`)
  if (summary.dominant_emotion === 'trust') strengths.push(`High-trust response: personas view this policy as credible and fair`)
  if (summary.behavioral_change_pct > 0.35) strengths.push(`High behavioural intent: ${formatPct(summary.behavioral_change_pct)} say they'd change behaviour`)

  if (oppose >= 0.35)   concerns.push(`Significant opposition bloc: ${Math.round(oppose * 100)}% rated 1 or 2`)
  if (neutral >= 0.35)  concerns.push(`Large undecided segment: ${Math.round(neutral * 100)}% gave a neutral rating, room to persuade or lose`)
  if (summary.dominant_emotion === 'anger')   concerns.push(`Anger is the dominant emotion; policy framing may need revisiting`)
  if (summary.dominant_emotion === 'concern') concerns.push(`Concern is dominant; specific risk factors should be addressed explicitly`)
  if (summary.behavioral_change_pct < 0.1)  concerns.push(`Low behavioural intent: the policy may not motivate real-world change`)

  if (strengths.length === 0) strengths.push('Results are within acceptable range; check demographic breakdowns for targeted messaging')
  if (concerns.length === 0)  concerns.push('No major red flags, but review persona voices for nuanced pushback')

  return { strengths, concerns }
}

interface ExecutiveSummaryProps {
  results: SimulationResultsData
  simulationTitle?: string
}

export function ExecutiveSummary({ results, simulationTitle }: ExecutiveSummaryProps) {
  const { summary, run_config } = results
  const emotion = summary.dominant_emotion
  const nutshell = generateNutshell(results)
  const { strengths, concerns } = deriveHighlights(results)

  return (
    <Stack gap="xl">
      {/* Title */}
      {simulationTitle && (
        <Box>
          <Text
            size="xl"
            fw={700}
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: 'Source Serif 4, serif',
              lineHeight: 1.3,
            }}
          >
            {simulationTitle}
          </Text>
        </Box>
      )}

      {/* ── In a Nutshell card ─────────────────────────────────── */}
      <Box style={{
        border: '1px solid var(--color-border-subtle)',
        borderLeft: '4px solid var(--color-accent-primary)',
        borderRadius: 10,
        backgroundColor: 'var(--color-bg-surface)',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <Group gap={8} mb={10} align="center">
          <Sparkles size={14} color="var(--color-accent-primary)" />
          <Text size="xs" fw={700} c="var(--color-accent-primary)" style={{ textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            In a Nutshell
          </Text>
        </Group>
        <Text size="sm" c="var(--color-text-secondary)" lh={1.8}>
          {nutshell}
        </Text>
      </Box>

      {/* ── Highlights panel ──────────────────────────────────────── */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card withBorder radius="md" style={{ borderColor: 'rgba(21,128,61,0.3)', backgroundColor: 'rgba(21,128,61,0.03)' }}>
          <Group gap={8} mb={10} align="center">
            <ThumbsUp size={14} color="#15803D" />
            <Text size="xs" fw={700} style={{ color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Strengths
            </Text>
          </Group>
          <Stack gap={6}>
            {strengths.map((s, i) => (
              <Group key={i} gap={8} align="flex-start" wrap="nowrap">
                <Box style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#15803D', flexShrink: 0, marginTop: 7 }} />
                <Text size="xs" c="var(--color-text-secondary)" lh={1.6}>{s}</Text>
              </Group>
            ))}
          </Stack>
        </Card>
        <Card withBorder radius="md" style={{ borderColor: 'rgba(185,28,28,0.3)', backgroundColor: 'rgba(185,28,28,0.03)' }}>
          <Group gap={8} mb={10} align="center">
            {summary.mean_approval < 3 ? <ThumbsDown size={14} color="#B91C1C" /> : <AlertTriangle size={14} color="#EA580C" />}
            <Text size="xs" fw={700} style={{ color: summary.mean_approval < 3 ? '#B91C1C' : '#EA580C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Watch Out For
            </Text>
          </Group>
          <Stack gap={6}>
            {concerns.map((c, i) => (
              <Group key={i} gap={8} align="flex-start" wrap="nowrap">
                <Box style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: summary.mean_approval < 3 ? '#B91C1C' : '#EA580C', flexShrink: 0, marginTop: 7 }} />
                <Text size="xs" c="var(--color-text-secondary)" lh={1.6}>{c}</Text>
              </Group>
            ))}
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Metric cards grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">

        {/* ── Mean Approval gauge card ─────────────────────────── */}
        <Card withBorder radius="md" style={{ gridColumn: 'span 1' }}>
          <Stack gap="xs" align="center">
            <Text size="xs" fw={600} c="var(--color-text-tertiary)"
              style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Mean Approval
            </Text>
            <ApprovalGauge value={summary.mean_approval} size={180} />
            <Text size="xs" c="var(--color-text-secondary)" style={{ textAlign: 'center' }} lh={1.5}>
              {approvalNarrative(summary.mean_approval)}
            </Text>
          </Stack>
        </Card>

        {/* ── Right-side metrics ───────────────────────────────── */}
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 12, gridColumn: 'span 1' }}>

          {/* Dominant emotion */}
          <Card withBorder radius="md" style={{ flex: 1 }}>
            <Stack gap={6}>
              <Text size="xs" fw={600} c="var(--color-text-tertiary)"
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Dominant Emotion
              </Text>
              <Group gap={8} align="center">
                <Box
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: emotionColor(emotion),
                    flexShrink: 0,
                  }}
                />
                <Text
                  fw={700}
                  size="lg"
                  style={{
                    color: emotionColor(emotion),
                    textTransform: 'capitalize',
                  }}
                >
                  {emotion}
                </Text>
              </Group>
              <Text size="xs" c="var(--color-text-tertiary)">
                Most common emotional response across all personas
              </Text>
            </Stack>
          </Card>

          {/* Behavioral change */}
          <Card withBorder radius="md" style={{ flex: 1 }}>
            <Stack gap={6}>
              <Text size="xs" fw={600} c="var(--color-text-tertiary)"
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Behavioral Change
              </Text>
              <Group gap={6} align="center">
                <TrendingUp size={18} color="var(--color-status-info)" />
                <Text fw={700} size="xl" c="var(--color-status-info)">
                  {formatPct(summary.behavioral_change_pct)}
                </Text>
              </Group>
              <Text size="xs" c="var(--color-text-tertiary)">
                Personas who indicated they would change behaviour
              </Text>
            </Stack>
          </Card>

        </Box>

        {/* ── Run metadata card ────────────────────────────────── */}
        <Card withBorder radius="md" style={{ gridColumn: 'span 2' }}>
          <Stack gap="md">
            <Text size="xs" fw={600} c="var(--color-text-tertiary)"
              style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Simulation Metadata
            </Text>
            <SimpleGrid cols={2} spacing="sm">
              <Stack gap={2}>
                <Group gap={6}>
                  <Users size={13} color="var(--color-text-tertiary)" />
                  <Text size="xs" c="var(--color-text-tertiary)">Effective sample</Text>
                </Group>
                <Text size="sm" fw={600} c="var(--color-text-primary)">
                  {formatNumber(run_config.effective_sample_size)} personas
                </Text>
              </Stack>
              <Stack gap={2}>
                <Group gap={6}>
                  <Zap size={13} color="var(--color-text-tertiary)" />
                  <Text size="xs" c="var(--color-text-tertiary)">Runtime profile</Text>
                </Group>
                <Text size="sm" fw={600} c="var(--color-text-primary)" style={{ textTransform: 'capitalize' }}>
                  {run_config.runtime_profile}
                </Text>
              </Stack>

              {/* Approval distribution quick-look */}
              {Object.entries(summary.approval_distribution)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([level, count]) => (
                  <Stack key={level} gap={2}>
                    <Text size="xs" c="var(--color-text-tertiary)">Approval {level}</Text>
                    <Group gap={6}>
                      <Box
                        style={{
                          height: 4,
                          width: Math.round((count / run_config.effective_sample_size) * 80),
                          backgroundColor: `var(--color-data-approval-${level})`,
                          borderRadius: 2,
                          minWidth: 4,
                        }}
                      />
                      <Text size="xs" fw={500} c="var(--color-text-secondary)">
                        {count}
                      </Text>
                    </Group>
                  </Stack>
                ))}
            </SimpleGrid>
          </Stack>
        </Card>

      </SimpleGrid>
    </Stack>
  )
}
