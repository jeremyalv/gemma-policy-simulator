/**
 * MethodologyPage — transparent disclosure of how InfiniPol works,
 * what it does, and what it explicitly does not do.
 *
 * Route: /methodology
 * This page is the single most important trust-building asset for
 * professional users (policy researchers, government analysts, academics).
 * Its absence signals intellectual dishonesty. Keep it current.
 */

import { Box, Container, Title, Text, Stack, Divider, Anchor, Group, Badge } from '@mantine/core'
import { Link } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react'

// ── Version / last-updated metadata ──────────────────────────────────────────

const METHODOLOGY_VERSION = '1.0'
const LAST_UPDATED = 'April 2026'
const SCOPE = 'US English-language policy (Phase 1)'

// ── Section helper ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Stack gap="md">
      <Text
        fw={700}
        style={{
          fontSize: '1.1rem',
          color: 'var(--color-text-primary)',
          fontFamily: 'Source Serif 4, serif',
        }}
      >
        {title}
      </Text>
      {children}
    </Stack>
  )
}

function Bullet({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode
  color: string
  children: React.ReactNode
}) {
  return (
    <Group align="flex-start" gap="sm" wrap="nowrap">
      <Box style={{ color, flexShrink: 0, marginTop: 2 }}>{icon}</Box>
      <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
        {children}
      </Text>
    </Group>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MethodologyPage() {
  return (
    <Layout>
      <Container size="md" py="xl">
        <Stack gap={48}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <Stack gap="sm">
            <Group gap="sm" align="center">
              <Title
                order={2}
                style={{
                  fontFamily: 'Source Serif 4, serif',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                How InfiniPol Works
              </Title>
              <Badge
                size="sm"
                variant="light"
                style={{
                  backgroundColor: 'var(--color-accent-primary-subtle)',
                  color: 'var(--color-accent-primary)',
                  fontWeight: 600,
                }}
              >
                v{METHODOLOGY_VERSION}
              </Badge>
            </Group>
            <Text size="sm" c="var(--color-text-tertiary)">
              Last updated: {LAST_UPDATED} · Current scope: {SCOPE}
            </Text>
            <Text size="sm" c="var(--color-text-secondary)" lh={1.7} style={{ maxWidth: '60ch' }}>
              This page explains exactly what InfiniPol does under the hood, what it is designed
              to help with, and (equally important) what it cannot do and should never be
              used for. We update this document whenever the methodology changes.
            </Text>
          </Stack>

          <Divider />

          {/* ── What it is ──────────────────────────────────────────────── */}
          <Section title="What InfiniPol is">
            <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
              InfiniPol is an <strong>AI-assisted policy reaction analysis tool</strong>. When you
              submit a policy proposal, it generates a set of synthetic personas (fictional
              individuals with defined demographic attributes) and uses a large language model
              (LLM) to simulate how each persona might react to the policy text.
            </Text>
            <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
              The output is a structured breakdown of simulated reactions: approval scores by
              demographic segment, inferred emotional tone, representative quotes, and a
              geographic distribution. These are designed to help you identify potential friction
              points, demographic fault lines, and framing risks <em>before</em> a policy goes
              public.
            </Text>
            <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
              Think of it as a fast, low-cost <strong>thinking aid</strong> for early-stage policy
              development, not a substitute for real fieldwork.
            </Text>
          </Section>

          <Divider />

          {/* ── What it is not ──────────────────────────────────────────── */}
          <Section title="What InfiniPol is not">
            <Stack gap="sm">
              <Bullet icon={<AlertTriangle size={15} />} color="var(--color-status-warning)">
                <strong>Not a survey or polling tool.</strong> InfiliPol does not collect responses
                from real people. All personas and reactions are AI-generated. Results cannot be
                cited as public opinion data.
              </Bullet>
              <Bullet icon={<AlertTriangle size={15} />} color="var(--color-status-warning)">
                <strong>Not a statistically valid sample.</strong> The "sample size" setting
                controls how many AI inference passes are run. It affects output variance,
                not representational accuracy. A run of n=2,000 AI personas is not equivalent
                to a survey of n=2,000 real respondents.
              </Bullet>
              <Bullet icon={<AlertTriangle size={15} />} color="var(--color-status-warning)">
                <strong>Not a predictor of electoral outcomes.</strong> Approval scores from
                InfiniPol are not vote share predictions and should never be used as such.
              </Bullet>
              <Bullet icon={<AlertTriangle size={15} />} color="var(--color-status-warning)">
                <strong>Not calibrated against ground truth.</strong> In Phase 1 (current), we
                have not yet validated InfiniPol output against real historical polling data.
                We do not know how often the simulated approval ranges contain real-world
                polling values. Validation is a Phase 2 priority.
              </Bullet>
              <Bullet icon={<AlertTriangle size={15} />} color="var(--color-status-warning)">
                <strong>Not free of model bias.</strong> The underlying language model was
                trained predominantly on English-language internet text, skewing toward younger,
                educated, and politically-engaged populations. Reactions from lower-income,
                rural, elderly, and politically disengaged demographics may be less reliably
                modeled.
              </Bullet>
            </Stack>
          </Section>

          <Divider />

          {/* ── How personas are generated ───────────────────────────────── */}
          <Section title="How personas are generated (Phase 1)">
            <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
              In the current phase, personas are generated by the language model at inference time.
              The model is prompted to produce individuals with varied demographic attributes
              (age group, region, income bracket, education level, political lean) and to react
              to the submitted policy from within that persona.
            </Text>
            <Box
              style={{
                borderLeft: '3px solid var(--color-status-warning)',
                paddingLeft: 12,
                backgroundColor: 'var(--color-bg-subtle)',
                borderRadius: '0 6px 6px 0',
                padding: '10px 14px',
              }}
            >
              <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
                <strong>Current limitation:</strong> Demographic distributions are not weighted
                against real census data. The model decides what "representative" looks like,
                which may not match the actual population composition of your target region.
                Census-weighted sampling is planned for Phase 2.
              </Text>
            </Box>
          </Section>

          <Divider />

          {/* ── Approval score ───────────────────────────────────────────── */}
          <Section title="How approval scores are calculated">
            <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
              Each persona rates the policy on a 1–5 scale (1 = strongly oppose, 5 = strongly
              support). The overall approval score is the mean of these ratings across all
              generated personas, expressed as a percentage where 3.0 = 50%.
            </Text>
            <Box
              style={{
                borderLeft: '3px solid var(--color-status-warning)',
                paddingLeft: 12,
                backgroundColor: 'var(--color-bg-subtle)',
                borderRadius: '0 6px 6px 0',
                padding: '10px 14px',
              }}
            >
              <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
                <strong>Current limitation:</strong> Each simulation produces a single point
                estimate. LLMs are stochastic, so running the same simulation twice will produce
                slightly different scores. In Phase 2, each simulation will run multiple
                inference passes and return a score range (e.g. 58–64%) instead of a single
                number, making uncertainty explicit.
              </Text>
            </Box>
            <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
              The <strong>Estimated Approval Distribution heatmap</strong> shows approximate
              per-demographic breakdowns. These are derived from each segment's mean approval
              using a Gaussian distribution (σ=1.1). They are estimates, not directly observed
              per-persona counts.
            </Text>
          </Section>

          <Divider />

          {/* ── Data sources ─────────────────────────────────────────────── */}
          <Section title="Data sources (Phase 1 vs. Phase 2)">
            <Stack gap="xs">
              <Text size="sm" fw={600} c="var(--color-text-primary)">Phase 1: Current</Text>
              <Bullet icon={<Info size={15} />} color="var(--color-status-info)">
                Persona reactions are generated entirely from the language model's training
                priors. No external news, polling, or demographic datasets are injected at
                inference time.
              </Bullet>
              <Bullet icon={<Info size={15} />} color="var(--color-status-info)">
                The model's knowledge has a training cutoff date. It is not aware of very recent
                events unless you include them in the policy text.
              </Bullet>
            </Stack>
            <Stack gap="xs">
              <Text size="sm" fw={600} c="var(--color-text-primary)">Phase 2: Planned</Text>
              <Bullet icon={<RefreshCw size={15} />} color="var(--color-text-tertiary)">
                Real-time news context injection (GDELT / NewsAPI): top recent articles
                relevant to the policy topic will be retrieved and injected into every
                simulation prompt, anchoring reactions to current events.
              </Bullet>
              <Bullet icon={<RefreshCw size={15} />} color="var(--color-text-tertiary)">
                Polling data grounding: relevant published survey results (Pew Research,
                Gallup, YouGov US) will be retrieved and surfaced alongside simulation output,
                so you can compare AI-generated reactions with real polling benchmarks.
              </Bullet>
              <Bullet icon={<RefreshCw size={15} />} color="var(--color-text-tertiary)">
                Census-weighted persona sampling: US Census Bureau demographic distributions
                will be used to generate personas in accurate population proportions.
              </Bullet>
            </Stack>
          </Section>

          <Divider />

          {/* ── What the sector tags do ──────────────────────────────────── */}
          <Section title="Policy sector tags">
            <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
              The sector tags (Healthcare, Climate, Economy, etc.) selected during simulation
              creation are saved with your simulation record for your own reference and
              organization. In Phase 1 they <strong>do not affect model output</strong>;
              the model does not receive sector context separately from the policy text itself.
              In Phase 2, sector tags will be used to bias context retrieval toward the most
              relevant news and polling sources.
            </Text>
          </Section>

          <Divider />

          {/* ── Recommended use cases ────────────────────────────────────── */}
          <Section title="Recommended uses">
            <Stack gap="sm">
              <Bullet icon={<CheckCircle size={15} />} color="var(--color-status-success)">
                Early-stage policy exploration: understanding potential friction points before
                commissioning survey fieldwork.
              </Bullet>
              <Bullet icon={<CheckCircle size={15} />} color="var(--color-status-success)">
                Internal briefing preparation: generating a structured first-pass reaction
                analysis to share with stakeholders before publication.
              </Bullet>
              <Bullet icon={<CheckCircle size={15} />} color="var(--color-status-success)">
                Framing stress-testing: comparing how different phrasings of the same policy
                shift simulated demographic reactions.
              </Bullet>
              <Bullet icon={<CheckCircle size={15} />} color="var(--color-status-success)">
                Teaching and training: political science or public policy courses exploring
                how demographic factors shape policy reception.
              </Bullet>
            </Stack>
          </Section>

          <Divider />

          {/* ── Version history ──────────────────────────────────────────── */}
          <Section title="Version history">
            <Stack gap={4}>
              <Group gap="sm">
                <Badge size="xs" variant="filled" style={{ backgroundColor: 'var(--color-accent-primary)' }}>
                  v1.0
                </Badge>
                <Text size="xs" c="var(--color-text-tertiary)">{LAST_UPDATED}</Text>
              </Group>
              <Text size="sm" c="var(--color-text-secondary)" lh={1.7}>
                Initial release. US English-language policy support. LLM-only persona generation,
                no external context injection, single-pass inference per simulation.
              </Text>
            </Stack>
          </Section>

          <Divider />

          {/* ── Footer nav ───────────────────────────────────────────────── */}
          <Group gap="lg">
            <Anchor
              component={Link}
              to="/"
              size="sm"
              style={{ color: 'var(--color-accent-primary)' }}
            >
              ← Back to home
            </Anchor>
            <Anchor
              component={Link}
              to="/simulations"
              size="sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Go to Simulations
            </Anchor>
            <Anchor
              component={Link}
              to="/guide"
              size="sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              User guide
            </Anchor>
          </Group>

        </Stack>
      </Container>
    </Layout>
  )
}
