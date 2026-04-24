/**
 * CreatePage — full Create Simulation form.
 *
 * Layout: two-column on desktop (form left, persona count panel right).
 * Sections: Policy → Dataset → Sample Size → Demographic Filters
 * Submit options: "Run directly" or "Clarify first"
 *
 * Contract compliance:
 *  - Sends Idempotency-Key header on every submit (via useCreateSimulation)
 *  - Never sends income_brackets / household_income / ethnicity
 *  - sample_size is integer 20–2000
 *  - age_range is [min, max] tuple
 */

import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Box, Grid, Stack, Title, Text, Group, Button,
  Divider, Alert, Badge,
} from '@mantine/core'
import { Database } from 'lucide-react'
import { useForm, zodResolver } from '@mantine/form'
import { ArrowLeft, Play, MessageSquare, GitBranch, History, X } from 'lucide-react'
import { Layout } from '@/components/layout/Layout'
import { PolicySection }       from './sections/PolicySection'
import { PolicySectorSection } from './sections/PolicySectorSection'
import { SampleSection }       from './sections/SampleSection'
import { FiltersSection }      from './sections/FiltersSection'
import { PersonaCountPanel }   from './PersonaCountPanel'
import { useCreateSimulation } from './hooks/useCreateSimulation'
import { useDraftPersistence } from './hooks/useDraftPersistence'
import { CreateSimulationSchema, CREATE_FORM_DEFAULTS } from './schema'
import type { CreateSimulationFormValues } from './schema'
import { formatRelative } from '@/lib/format'

// ── Router state type (from FollowupDisplay "Use Revision & Re-run") ──────────
interface RefinementRouterState {
  policy_text?:        string
  title?:              string
  from_simulation_id?: string
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Box>
      <Text
        fw={600}
        size="sm"
        c="var(--color-text-primary)"
        mb={subtitle ? 2 : 12}
        style={{ letterSpacing: '-0.01em' }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text size="xs" c="var(--color-text-tertiary)" mb={12} lh={1.5}>
          {subtitle}
        </Text>
      )}
      {children}
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { submit, isPending } = useCreateSimulation()
  const { hasDraft, draftSavedAt, saveDraft, loadDraft, clearDraft } = useDraftPersistence()

  // Read pre-fill values from FollowupDisplay "Use Revision & Re-run"
  const routerState = (location.state ?? {}) as RefinementRouterState
  const isRefinement = Boolean(routerState.from_simulation_id)

  // If coming from refinement, router state takes priority over draft
  const initialValues: CreateSimulationFormValues = {
    ...CREATE_FORM_DEFAULTS,
    ...(routerState.title       ? { title:       routerState.title }       : {}),
    ...(routerState.policy_text ? { policy_text: routerState.policy_text } : {}),
  }

  const form = useForm<CreateSimulationFormValues>({
    validate: zodResolver(CreateSimulationSchema),
    initialValues,
    validateInputOnChange: ['title', 'policy_text', 'sample_size'],
  })

  // Draft restore banner — visible on mount if draft exists and not a refinement
  const [showDraftBanner, setShowDraftBanner] = useState(() => hasDraft && !isRefinement)

  // Auto-save draft on form change (skip when pre-filled from refinement)
  useEffect(() => {
    if (isRefinement) return
    saveDraft(form.values)
  }, [form.values, isRefinement, saveDraft])

  function handleRestoreDraft() {
    const saved = loadDraft()
    if (saved) form.setValues(saved)
    // Keep draft so we continue auto-saving, just hide the restore prompt
    setShowDraftBanner(false)
  }

  function handleDismissDraft() {
    clearDraft()
    setShowDraftBanner(false)
  }

  function handleSubmit(withClarification: boolean) {
    const result = form.validate()
    if (result.hasErrors) return
    clearDraft()
    submit(form.values, { withClarification })
  }

  return (
    <Layout maxWidth="xl">
      <Stack gap="xl">

        {/* ── Page header ────────────────────────────────────────── */}
        <Box>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<ArrowLeft size={13} />}
            onClick={() => navigate('/simulations')}
            mb={12}
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
            New Simulation
          </Title>
          <Text size="sm" c="var(--color-text-secondary)" mt={4}>
            Describe your policy and configure the simulation parameters.
          </Text>
        </Box>

        {/* ── Refinement origin banner ────────────────────────────── */}
        {isRefinement && (
          <Alert
            icon={<GitBranch size={15} />}
            color="teal"
            variant="light"
            title="Policy refinement pre-loaded"
            styles={{ root: { fontSize: 13 } }}
          >
            This simulation is based on a Gemma-suggested refinement of simulation{' '}
            <strong>{routerState.from_simulation_id}</strong>.
            {' '}The revised policy text and title have been pre-filled below — review before running.
          </Alert>
        )}

        {/* ── Saved draft banner ──────────────────────────────────── */}
        {showDraftBanner && (
          <Alert
            icon={<History size={15} />}
            color="blue"
            variant="light"
            styles={{ root: { fontSize: 13 } }}
          >
            <Group justify="space-between" align="center" wrap="nowrap">
              <Text size="sm">
                You have an unsaved draft from{' '}
                <strong>{formatRelative(draftSavedAt)}</strong>.
              </Text>
              <Group gap={8} wrap="nowrap">
                <Button
                  size="xs"
                  variant="filled"
                  color="blue"
                  onClick={handleRestoreDraft}
                >
                  Restore
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  leftSection={<X size={11} />}
                  onClick={handleDismissDraft}
                >
                  Discard
                </Button>
              </Group>
            </Group>
          </Alert>
        )}

        {/* ── Two-column layout ───────────────────────────────────── */}
        <Grid gutter="xl">

          {/* ── Left: form ──────────────────────────────────────── */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap={0}>

              {/* Section 1: Policy */}
              <Box
                style={{
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px 10px 0 0',
                  padding: '24px',
                  backgroundColor: 'var(--color-bg-surface)',
                }}
              >
                <FormSection
                  title="1. Policy"
                  subtitle="Give your simulation a short title and describe the policy in detail."
                >
                  <PolicySection form={form} />
                </FormSection>
              </Box>

              <Divider color="var(--color-border-subtle)" />

              {/* Section 2: Policy sector */}
              <Box
                style={{
                  border: '1px solid var(--color-border-subtle)',
                  borderLeft: '1px solid var(--color-border-subtle)',
                  borderRight: '1px solid var(--color-border-subtle)',
                  padding: '24px',
                  backgroundColor: 'var(--color-bg-surface)',
                }}
              >
                <FormSection
                  title="2. Policy Sector (Optional)"
                  subtitle="Which domain(s) does your policy belong to? Helps contextualise results and focus the simulation."
                >
                  <PolicySectorSection form={form} />
                </FormSection>
              </Box>

              <Divider color="var(--color-border-subtle)" />

              {/* Section 3: Sample size */}
              <Box
                style={{
                  border: '1px solid var(--color-border-subtle)',
                  borderLeft: '1px solid var(--color-border-subtle)',
                  borderRight: '1px solid var(--color-border-subtle)',
                  padding: '24px',
                  backgroundColor: 'var(--color-bg-surface)',
                }}
              >
                <FormSection
                  title="3. Sample Size"
                  subtitle="How many synthetic personas should respond to this policy?"
                >
                  <SampleSection form={form} />
                </FormSection>
              </Box>

              <Divider color="var(--color-border-subtle)" />

              {/* Section 4: Demographic filters */}
              <Box
                style={{
                  border: '1px solid var(--color-border-subtle)',
                  borderLeft: '1px solid var(--color-border-subtle)',
                  borderRight: '1px solid var(--color-border-subtle)',
                  padding: '24px',
                  backgroundColor: 'var(--color-bg-surface)',
                }}
              >
                <FormSection
                  title="4. Demographic Filters (Optional)"
                  subtitle="Narrow the simulation to a specific population segment. Leave all blank for a nationally representative sample."
                >
                  <FiltersSection form={form} />
                </FormSection>
              </Box>

              {/* Dataset attribution card */}
              <Box
                style={{
                  border: '1px solid var(--color-border-subtle)',
                  borderLeft: '1px solid var(--color-border-subtle)',
                  borderRight: '1px solid var(--color-border-subtle)',
                  borderRadius: '0 0 10px 10px',
                  padding: '16px 24px',
                  backgroundColor: 'var(--color-bg-subtle)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <Database size={16} color="var(--color-text-tertiary)" style={{ marginTop: 2, flexShrink: 0 }} />
                <Box>
                  <Group gap={8} align="center" mb={2}>
                    <Text size="xs" fw={600} c="var(--color-text-secondary)">Dataset</Text>
                    <Badge size="xs" variant="outline" color="gray">NVIDIA Nemotron-Personas</Badge>
                  </Group>
                  <Text size="xs" c="var(--color-text-tertiary)" lh={1.5}>
                    Simulations run against 300,000+ demographically stratified synthetic US personas.
                    Dataset licensed under CC BY 4.0. Results are AI-generated — always validate with primary research.
                  </Text>
                </Box>
              </Box>

              {/* ── Submit actions ─────────────────────────────────── */}
              <Box
                mt="xl"
                style={{
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 10,
                  padding: '20px 24px',
                  backgroundColor: 'var(--color-bg-surface)',
                }}
              >
                <Stack gap="md">
                  <Box>
                    <Text fw={600} size="sm" c="var(--color-text-primary)">
                      Ready to simulate?
                    </Text>
                    <Text size="xs" c="var(--color-text-tertiary)" mt={2} lh={1.5}>
                      Run directly for speed, or clarify first for better accuracy
                      (up to 3 clarifying questions from Gemma).
                    </Text>
                  </Box>

                  <Group gap="sm" wrap="wrap">
                    <Button
                      leftSection={<Play size={15} />}
                      loading={isPending}
                      onClick={() => handleSubmit(false)}
                      style={{
                        backgroundColor: 'var(--color-accent-primary)',
                        color: '#fff',
                        flex: 1,
                        minWidth: 160,
                      }}
                    >
                      Run Directly
                    </Button>
                    <Button
                      variant="outline"
                      leftSection={<MessageSquare size={15} />}
                      loading={isPending}
                      onClick={() => handleSubmit(true)}
                      style={{
                        borderColor: 'var(--color-accent-primary)',
                        color: 'var(--color-accent-primary)',
                        flex: 1,
                        minWidth: 160,
                      }}
                    >
                      Clarify First
                    </Button>
                  </Group>

                  {Object.keys(form.errors).length > 0 && (
                    <Text size="xs" c="var(--color-status-error)">
                      Please fix the errors above before submitting.
                    </Text>
                  )}
                </Stack>
              </Box>

            </Stack>
          </Grid.Col>

          {/* ── Right: persona count panel ──────────────────────── */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <PersonaCountPanel values={form.values} />
          </Grid.Col>

        </Grid>
      </Stack>
    </Layout>
  )
}
