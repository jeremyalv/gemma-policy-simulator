/**
 * AboutPage — InfiniPol project info, dataset attribution, and tech stack.
 * Rendered inside the main app Layout (AppHeader + AppFooter).
 */

import { Link } from 'react-router-dom'
import {
  Box, Container, Stack, Text, Group, Badge,
  SimpleGrid, Divider, Anchor, ThemeIcon,
} from '@mantine/core'
import {
  BarChart2, Database, Code2, Scale, Mail,
  ExternalLink, Cpu, Globe,
} from 'lucide-react'
import { Layout } from '@/components/layout/Layout'

// ── Data ──────────────────────────────────────────────────────────────────────

const TECH_STACK = [
  { icon: <Cpu size={16} />, label: 'AI Model', value: 'Google Gemma 3 (via Gemma API)' },
  { icon: <Database size={16} />, label: 'Persona Dataset', value: 'NVIDIA Nemotron-Personas (CC BY 4.0)' },
  { icon: <Code2 size={16} />, label: 'Frontend', value: 'React 18 · Vite 6 · Mantine 7 · TypeScript 5' },
  { icon: <Globe size={16} />, label: 'Charts', value: 'Recharts · react-simple-maps · Recharts Sankey' },
  { icon: <Scale size={16} />, label: 'Backend', value: 'FastAPI · Python 3.12 · Pydantic v2' },
]

const PRINCIPLES = [
  {
    title: 'Synthetic, not real',
    body: 'Every persona in InfiniPol is AI-generated. No real person\'s data is used or inferred. Results reflect a model\'s best estimate of demographic distributions, not actual human opinions.',
  },
  {
    title: 'Transparency by design',
    body: 'Approval scores, emotion profiles, and quotes are derived deterministically from the same prompt and sample. We surface confidence intervals and distribution spreads, not just headline numbers.',
  },
  {
    title: 'Research-grade caveats',
    body: 'InfiniPol is an exploration and ideation tool. Synthetic results are directional signals — always validate with primary research before making real policy decisions.',
  },
  {
    title: 'Privacy-first',
    body: 'No account required. Simulation data lives in your browser\'s localStorage only. Nothing is stored on a remote server beyond the transient API call needed to run each simulation.',
  },
]

// ── Components ────────────────────────────────────────────────────────────────

function PrincipleCard({ title, body }: { title: string; body: string }) {
  return (
    <Box
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 10,
        padding: '20px 24px',
      }}
    >
      <Text fw={700} size="sm" c="var(--color-text-primary)" mb={8}>{title}</Text>
      <Text size="sm" c="var(--color-text-secondary)" lh={1.65}>{body}</Text>
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <Layout>
      <Box py={56} style={{ backgroundColor: 'var(--color-bg-base)', minHeight: '100%' }}>
        <Container size="md">
          <Stack gap={56}>

            {/* Page header */}
            <Stack gap="sm">
              <Badge
                size="md"
                variant="light"
                style={{
                  backgroundColor: 'var(--color-accent-primary-subtle)',
                  color: 'var(--color-accent-primary)',
                  border: '1px solid var(--color-accent-primary)',
                  fontWeight: 600,
                  width: 'fit-content',
                }}
              >
                About
              </Badge>
              <Group gap={10} align="center">
                <BarChart2 size={28} color="var(--color-accent-primary)" strokeWidth={2.5} />
                <Text
                  component="h1"
                  style={{
                    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    letterSpacing: '-0.03em',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'Source Serif 4, serif',
                    margin: 0,
                  }}
                >
                  InfiniPol
                </Text>
              </Group>
              <Text size="md" c="var(--color-text-secondary)" lh={1.7} style={{ maxWidth: 560 }}>
                InfiniPol is an open-source policy simulation platform that lets analysts,
                researchers, and advocates pressure-test policy proposals against a synthetic
                population of 300,000+ US personas — before a single real stakeholder sees them.
              </Text>
            </Stack>

            <Divider style={{ borderColor: 'var(--color-border-subtle)' }} />

            {/* Mission */}
            <Stack gap="md">
              <Text
                fw={700}
                style={{
                  fontSize: '1.2rem',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Source Serif 4, serif',
                }}
              >
                Why InfiniPol?
              </Text>
              <Text size="sm" c="var(--color-text-secondary)" lh={1.75}>
                Good policy often fails not because the idea is wrong, but because its communication,
                framing, or targeting missed the mark. Focus groups are expensive and slow.
                Real polling requires months of lead time. InfiniPol provides a fast, repeatable
                sandbox for testing how different demographic groups are likely to react — surfacing
                blind spots early, when changes are still cheap.
              </Text>
              <Text size="sm" c="var(--color-text-secondary)" lh={1.75}>
                The name comes from <em>infinite</em> + <em>policy</em>: the platform is designed
                to be run iteratively, with no artificial limit on how many simulations or variants
                you explore before settling on a final proposal.
              </Text>
            </Stack>

            <Divider style={{ borderColor: 'var(--color-border-subtle)' }} />

            {/* Design principles */}
            <Stack gap={0}>
              <Text
                fw={700}
                mb={24}
                style={{
                  fontSize: '1.2rem',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Source Serif 4, serif',
                }}
              >
                Design principles
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {PRINCIPLES.map((p) => (
                  <PrincipleCard key={p.title} title={p.title} body={p.body} />
                ))}
              </SimpleGrid>
            </Stack>

            <Divider style={{ borderColor: 'var(--color-border-subtle)' }} />

            {/* Tech stack */}
            <Stack gap={0}>
              <Text
                fw={700}
                mb={20}
                style={{
                  fontSize: '1.2rem',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Source Serif 4, serif',
                }}
              >
                Technology
              </Text>
              <Stack gap={12}>
                {TECH_STACK.map(({ icon, label, value }) => (
                  <Group key={label} gap={12} align="center">
                    <ThemeIcon
                      size={32}
                      radius={8}
                      style={{
                        backgroundColor: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border-subtle)',
                        color: 'var(--color-text-tertiary)',
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </ThemeIcon>
                    <Box>
                      <Text size="xs" c="var(--color-text-tertiary)" fw={600} style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {label}
                      </Text>
                      <Text size="sm" c="var(--color-text-secondary)">{value}</Text>
                    </Box>
                  </Group>
                ))}
              </Stack>
            </Stack>

            <Divider style={{ borderColor: 'var(--color-border-subtle)' }} />

            {/* Dataset attribution */}
            <Stack gap="md">
              <Text
                fw={700}
                style={{
                  fontSize: '1.2rem',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Source Serif 4, serif',
                }}
              >
                Dataset attribution
              </Text>
              <Box
                style={{
                  backgroundColor: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 10,
                  padding: '20px 24px',
                }}
              >
                <Group gap={8} mb={10} align="center">
                  <Database size={16} color="var(--color-text-tertiary)" />
                  <Text size="sm" fw={700} c="var(--color-text-primary)">NVIDIA Nemotron-Personas</Text>
                  <Anchor
                    href="https://huggingface.co/datasets/nvidia/Nemotron-Personas"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-tertiary)' }}
                  >
                    <ExternalLink size={13} />
                  </Anchor>
                </Group>
                <Text size="sm" c="var(--color-text-secondary)" lh={1.65}>
                  InfiniPol uses the NVIDIA Nemotron-Personas dataset, a collection of 300,000+
                  AI-generated synthetic US residents with diverse demographic attributes, belief
                  systems, and occupational backgrounds. The dataset is licensed under{' '}
                  <Anchor
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    CC BY 4.0
                  </Anchor>
                  . All personas are synthetic and do not represent real individuals.
                </Text>
              </Box>
            </Stack>

            <Divider style={{ borderColor: 'var(--color-border-subtle)' }} />

            {/* Contact / links */}
            <Stack gap="sm">
              <Text
                fw={700}
                style={{
                  fontSize: '1.2rem',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'Source Serif 4, serif',
                }}
              >
                Links
              </Text>
              <Group gap="xl" wrap="wrap">
                <Anchor
                  component={Link}
                  to="/guide"
                  size="sm"
                  style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Code2 size={14} /> User Guide
                </Anchor>
                <Anchor
                  component={Link}
                  to="/simulations/new"
                  size="sm"
                  style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <BarChart2 size={14} /> Run a Simulation
                </Anchor>
                <Anchor
                  href="mailto:support@infinipol.example"
                  size="sm"
                  style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Mail size={14} /> Contact
                </Anchor>
              </Group>
            </Stack>

          </Stack>
        </Container>
      </Box>
    </Layout>
  )
}
