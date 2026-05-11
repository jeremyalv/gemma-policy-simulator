/**
 * MSW (Mock Service Worker) handlers
 * Mirrors the V1 API contract exactly.
 * Enable via VITE_USE_MOCKS=true or automatically in dev mode.
 */

import { http, HttpResponse } from 'msw'

const BASE = '/api/v1'

// ── Fixture helpers ──────────────────────────────────────────────────────────
function envelope<T>(data: T, meta: Record<string, unknown> = {}) {
  return { data, error: null, meta: { request_id: `req_mock_${Date.now()}`, ...meta } }
}

function errorEnvelope(code: string, message: string) {
  return { data: null, error: { code, message }, meta: { request_id: `req_mock_${Date.now()}` } }
}

function mockSimulation(overrides: Record<string, unknown> = {}) {
  return {
    id: `sim_${Math.random().toString(36).slice(2, 9)}`,
    title: 'Carbon Tax $50/tonne',
    policy_text: 'A federal carbon tax of $50 per tonne of CO2...',
    status: 'pending',
    dataset: 'nemotron_usa',
    sample_size: 500,
    filters: { states: ['CA', 'TX'], age_range: [18, 65] },
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ── Status simulation helpers ─────────────────────────────────────────────────
// Tracks when each simulation first appeared in the status poll (or was run).
// Used to compute monotonically increasing progress for running simulations.
const simStartTimes = new Map<string, number>()

// Demo sim IDs with fixed terminal statuses (aligned with GET /simulations mock).
//  pending:   1, 7   -- never run
//  running:   2, 8   -- time-based progression via simStartTimes
//  failed:    4, 10  -- terminal failure
//  completed: 3, 5, 6, 9, 11, 12
const DEMO_TERMINAL: Record<string, 'completed' | 'failed' | 'pending'> = {
  sim_demo1:  'pending',   sim_demo7:  'pending',
  sim_demo4:  'failed',    sim_demo10: 'failed',
  sim_demo3:  'completed', sim_demo5:  'completed', sim_demo6:  'completed',
  sim_demo9:  'completed', sim_demo11: 'completed', sim_demo12: 'completed',
}

/** Demo simulations complete in 30 seconds from first status poll or POST /run. */
const DEMO_DURATION_MS = 30_000

/** Default run_telemetry for healthy / in-progress simulations. */
const TELEMETRY_OK = {
  retry_count: 0,
  invalid_output_count: 0,
  failure_code: null,
  failure_message: null,
  failed_persona_id: null,
}

/** run_telemetry shape for simulations that failed during inference. */
const TELEMETRY_FAILED = {
  retry_count: 3,
  invalid_output_count: 2,
  failure_code: 'INFERENCE_TIMEOUT',
  failure_message: 'Ollama inference timed out after 3 retries for persona p_00312.',
  failed_persona_id: 'p_00312',
}

interface MockTelemetry {
  retry_count: number
  invalid_output_count: number
  failure_code: string | null
  failure_message: string | null
  failed_persona_id: string | null
}

function makeStatusPayload(
  id: string,
  status: string,
  pct: number,
  etaSeconds: number,
  telemetry: MockTelemetry = TELEMETRY_OK,
) {
  return {
    id,
    status,
    agents_total: 500,
    agents_completed: Math.floor(pct * 5),
    progress_pct: pct,
    estimated_seconds_remaining: etaSeconds,
    runtime_profile: 'balanced',
    effective_sample_size: pct === 0 ? 0 : 480,
    run_telemetry: telemetry,
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────
export const handlers = [

  // POST /simulations → 201
  http.post(`${BASE}/simulations`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    const sim = mockSimulation({ title: body.title, policy_text: body.policy_text })
    return HttpResponse.json(envelope(sim), { status: 201 })
  }),

  // GET /simulations → 200
  http.get(`${BASE}/simulations`, () => {
    const statuses = ['pending', 'running', 'completed', 'failed', 'completed', 'completed']
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: `sim_demo${i + 1}`,
      title: [
        'Carbon Tax $50/tonne', 'Universal Healthcare Expansion',
        'Minimum Wage $20/hr', 'Student Loan Forgiveness',
        'Green New Deal (Lite)', 'Housing Affordability Act',
        'Child Tax Credit Extension', 'Clean Water Infrastructure',
        'Police Reform Package', 'Education Funding Reform',
        'Medicare for All', 'Renewable Energy Mandate',
      ][i],
      status: statuses[i % statuses.length],
      sample_size: [200, 500, 1000, 300, 750][i % 5],
      mean_approval: i % 6 === 3 ? null : parseFloat((2.1 + Math.random() * 2.5).toFixed(1)),
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      completed_at: i % 6 === 0 ? null : new Date(Date.now() - i * 82000000).toISOString(),
    }))
    return HttpResponse.json(envelope(items, { total: 12, page: 1, limit: 20 }))
  }),

  // DELETE /simulations/:id → 200
  http.delete(`${BASE}/simulations/:id`, ({ params }) => {
    return HttpResponse.json(envelope({ id: params.id, deleted: true }))
  }),

  // POST /simulations/:id/run → 202
  // Records start time so the status handler can compute time-based progress.
  http.post(`${BASE}/simulations/:id/run`, ({ params }) => {
    const id = params.id as string
    simStartTimes.set(id, Date.now())
    return HttpResponse.json(
      envelope({
        id,
        status: 'running',
        started_at: new Date().toISOString(),
        estimated_seconds: Math.ceil(DEMO_DURATION_MS / 1000),
        runtime_profile: 'balanced',
        effective_sample_size: 480,
      }),
      { status: 202 },
    )
  }),

  // GET /simulations/:id/status → 200
  // Demo terminal states are fixed. Running sims use time-based progression.
  http.get(`${BASE}/simulations/:id/status`, ({ params }) => {
    const id = params.id as string

    // Fixed terminal states for demo sims
    const terminal = DEMO_TERMINAL[id]
    if (terminal === 'completed') {
      return HttpResponse.json(envelope(makeStatusPayload(id, 'completed', 100, 0)))
    }
    if (terminal === 'failed') {
      return HttpResponse.json(envelope(makeStatusPayload(id, 'failed', 17, 0, TELEMETRY_FAILED)))
    }
    if (terminal === 'pending') {
      return HttpResponse.json(envelope({
        id, status: 'pending',
        agents_total: 0, agents_completed: 0,
        progress_pct: 0,
        estimated_seconds_remaining: 0,
        runtime_profile: 'balanced',
        effective_sample_size: 0,
      }))
    }

    // Running sims (sim_demo2, sim_demo8) and user-created sims: time-based progression.
    // First poll records the start time; subsequent polls compute elapsed fraction.
    if (!simStartTimes.has(id)) simStartTimes.set(id, Date.now())
    const elapsed = Date.now() - simStartTimes.get(id)!
    const pct     = Math.min(100, Math.floor((elapsed / DEMO_DURATION_MS) * 100))
    const done    = pct >= 100
    const etaSecs = done ? 0 : Math.ceil((DEMO_DURATION_MS - elapsed) / 1000)

    return HttpResponse.json(envelope(makeStatusPayload(
      id,
      done ? 'completed' : 'running',
      pct,
      etaSecs,
    )))
  }),

  // GET /simulations/:id/results → 200 (or 409 for non-completed sims)
  http.get(`${BASE}/simulations/:id/results`, ({ params }) => {
    const id = params.id as string

    // Lifecycle gate: pending sims have never been run
    const terminal = DEMO_TERMINAL[id]
    if (terminal === 'pending') {
      return HttpResponse.json(
        errorEnvelope('SIMULATION_NOT_COMPLETE', 'Simulation has not been run yet.'),
        { status: 409 },
      )
    }
    if (terminal === 'failed') {
      return HttpResponse.json(
        errorEnvelope('SIMULATION_FAILED', 'Simulation failed. Retry or create a new simulation.'),
        { status: 409 },
      )
    }

    // Check if a running demo sim or user-created sim is still in progress
    if (!terminal) {
      const startTime = simStartTimes.get(id)
      if (startTime && (Date.now() - startTime) < DEMO_DURATION_MS) {
        return HttpResponse.json(
          errorEnvelope('SIMULATION_NOT_COMPLETE', 'Simulation is still running.'),
          { status: 409 },
        )
      }
      // sim_demo2/8 with no recorded start = never run = treat as not complete
      if (/^sim_demo(2|8)$/.test(id) && !startTime) {
        return HttpResponse.json(
          errorEnvelope('SIMULATION_NOT_COMPLETE', 'Simulation is still running.'),
          { status: 409 },
        )
      }
    }

    return HttpResponse.json(envelope({
      id,
      summary: {
        mean_approval: 3.2,
        approval_distribution: { '1': 80, '2': 95, '3': 150, '4': 110, '5': 65 },
        dominant_emotion: 'concern',
        behavioral_change_pct: 38.6,
      },
      run_config: { runtime_profile: 'balanced', effective_sample_size: 480 },
      demographic_breakdown: {
        by_age_group: {
          '18-34': { mean_approval: 3.6, count: 130 },
          '35-54': { mean_approval: 3.1, count: 220 },
          '55+':   { mean_approval: 2.7, count: 130 },
        },
        by_marital_status: {
          'never_married':       { mean_approval: 3.4, count: 190 },
          'married':             { mean_approval: 3.0, count: 210 },
          'divorced_or_widowed': { mean_approval: 3.1, count: 80 },
        },
        by_state: { CA: 3.5, TX: 2.8, FL: 3.0, NY: 3.7, WA: 3.6 },
        by_occupation_group: {
          'Healthcare': { mean_approval: 3.4, count: 95 },
          'Education':  { mean_approval: 3.6, count: 72 },
          'Technology': { mean_approval: 3.1, count: 110 },
          'Retail':     { mean_approval: 2.9, count: 88 },
          'Finance':    { mean_approval: 2.6, count: 60 },
        },
      },
      emotion_profile: {
        anger: 18.2, concern: 34.1, neutral: 22.0, hope: 19.4, joy: 6.3,
      },
      representative_quotes: [
        {
          persona_id: 'p_00421',
          name: 'Maria Santos',
          age: 34, occupation: 'Nurse', city: 'Houston', state: 'TX',
          approval: 2, emotion: 'concern',
          rationale: 'As someone balancing tight monthly expenses, I worry this policy raises household costs before local relief is clear.',
        },
        {
          persona_id: 'p_00892',
          name: 'James Whitfield',
          age: 52, occupation: 'Engineer', city: 'San Francisco', state: 'CA',
          approval: 4, emotion: 'hope',
          rationale: 'Long overdue. If structured correctly with clear reinvestment into clean energy, this can accelerate the transition we need.',
        },
        {
          persona_id: 'p_01203',
          name: 'Linda Chen',
          age: 68, occupation: 'Retired Teacher', city: 'Phoenix', state: 'AZ',
          approval: 2, emotion: 'anger',
          rationale: 'On a fixed income, any increase in energy costs is devastating. Who protects seniors from these policies?',
        },
        {
          persona_id: 'p_00571',
          name: 'Marcus Johnson',
          age: 29, occupation: 'Software Developer', city: 'Seattle', state: 'WA',
          approval: 4, emotion: 'hope',
          rationale: 'This is the kind of systemic change that aligns incentives with climate goals. I support it.',
        },
        {
          persona_id: 'p_00934',
          name: 'Patricia Gomez',
          age: 41, occupation: 'Small Business Owner', city: 'Miami', state: 'FL',
          approval: 3, emotion: 'neutral',
          rationale: 'Mixed feelings. Good for the planet long-term but the impact on my delivery costs in the short-term is a real concern.',
        },
      ],
      raw_responses_url: `/api/v1/simulations/${id}/export`,
    }))
  }),

  // POST /simulations/:id/clarifications/generate → 200
  http.post(`${BASE}/simulations/:id/clarifications/generate`, async ({ params, request }) => {
    const body = await request.json() as { focus: string }
    return HttpResponse.json(envelope({
      clarification_id: `cl_${Math.random().toString(36).slice(2, 7)}`,
      simulation_id: params.id,
      question_text: `Who specifically benefits from this policy, and how is eligibility determined? (focus: ${body.focus})`,
      rationale: 'Targeting rules materially affect acceptance across demographic segments.',
      status: 'open',
      turn_index: 1,
    }))
  }),

  // POST /clarifications/:id/answer → 200
  http.post(`${BASE}/clarifications/:clarification_id/answer`, async () => {
    return HttpResponse.json(envelope({
      simulation_id: 'sim_mock',
      clarification_status: 'in_progress',
      refined_policy_text: 'A federal carbon tax of $50 per tonne of CO2, with monthly rebates for households below 150% of poverty line...',
      next_clarification_id: `cl_${Math.random().toString(36).slice(2, 7)}`,
      next_question_text: 'Should the rebate amounts vary by regional energy costs?',
    }))
  }),

  // GET /simulations/:id/clarifications → 200
  http.get(`${BASE}/simulations/:id/clarifications`, ({ params }) => {
    return HttpResponse.json(envelope({
      simulation_id: params.id,
      clarification_status: 'none',
      has_open_question: false,
      latest_refined_policy_text: '',
    }))
  }),

  // POST /simulations/:id/challenge → 200
  http.post(`${BASE}/simulations/:id/challenge`, async ({ request }) => {
    const body = await request.json() as { focus?: string }
    const focus = body.focus ?? 'weak_segment'

    const CHALLENGE_BY_FOCUS: Record<string, {
      challenge_text: string
      evidence: { segment: string; mean_approval: number; top_concern: string }
    }> = {
      weak_segment: {
        challenge_text: 'Voters aged 55+ give this policy the lowest approval of any age group at 2.7/5. Their primary concern is the impact on fixed-income households. How does this policy protect people who cannot absorb rising costs?',
        evidence: {
          segment: 'Age 55+',
          mean_approval: 2.7,
          top_concern: 'Rising costs on fixed incomes with no offset mechanism',
        },
      },
      behavioral_change: {
        challenge_text: 'The simulation predicts a 34% behavioral shift toward sustainable choices. But in lower-income households, behavioral change is often constrained by affordability, not preference. What makes this prediction realistic for households earning under $40k/year?',
        evidence: {
          segment: 'Income under $40k',
          mean_approval: 3.1,
          top_concern: 'Predicted behavioral change assumes financial flexibility that many households do not have',
        },
      },
      emotion_bias: {
        challenge_text: 'Concern is the dominant emotion at 41% across all personas, outweighing hope (22%) and joy (8%). This level of concern in a majority suggests the policy framing is activating risk-aversion rather than opportunity. Why is the policy communicated in a way that generates more worry than optimism?',
        evidence: {
          segment: 'All demographics',
          mean_approval: 3.3,
          top_concern: 'Policy framing emphasizes cost and restriction over long-term benefit',
        },
      },
      demographic_gap: {
        challenge_text: 'There is a 1.8-point approval gap between urban voters (3.9/5) and rural voters (2.1/5). Rural communities see this policy as designed for city dwellers and indifferent to their economic realities. How does this policy address the needs of non-urban populations specifically?',
        evidence: {
          segment: 'Rural vs. Urban',
          mean_approval: 2.1,
          top_concern: 'Policy benefits concentrate in urban areas while rural communities bear disproportionate costs',
        },
      },
    }

    const variant = CHALLENGE_BY_FOCUS[focus] ?? CHALLENGE_BY_FOCUS.weak_segment

    return HttpResponse.json(envelope({
      challenge_id: `ch_${Math.random().toString(36).slice(2, 7)}`,
      ...variant,
    }))
  }),

  // POST /challenges/:id/followup → 200
  http.post(`${BASE}/challenges/:challenge_id/followup`, async ({ request }) => {
    const body = await request.json() as { user_response?: string }
    const response = (body.user_response ?? '').toLowerCase()

    const isDetailed   = response.length > 80
    const mentionsData = response.includes('data') || response.includes('evidence') || response.includes('study')
    const mentionsCost = response.includes('cost') || response.includes('rebate') || response.includes('subsid')

    const followup_text = mentionsData
      ? 'That evidence-based framing is helpful. But does the data apply specifically to the demographic segments showing the lowest approval, or is it drawn from a broader population that may not represent their situation?'
      : mentionsCost
      ? 'The cost mitigation mechanism you describe would address part of the concern. But implementation timeline matters: if relief arrives 18 months after the policy takes effect, how do affected households manage in the interim?'
      : isDetailed
      ? 'That is a substantive response. The key question remaining is whether the communities most skeptical of this policy would view those provisions as sufficient, or as peripheral to their core concerns.'
      : 'That addresses part of the concern. Could you be more specific about which provisions directly protect the segments with the lowest approval, and how they would experience that protection in practice?'

    return HttpResponse.json(envelope({
      followup_text,
      suggested_policy_refinement: 'Consider adding a dedicated support mechanism for the most skeptical demographic segment, with an explicit timeline, eligibility criteria, and a communications strategy that addresses their stated top concern directly.',
      next_challenge_id: `ch_${Math.random().toString(36).slice(2, 7)}`,
    }))
  }),

  // GET /simulations/:id/export → CSV (NOT JSON envelope)
  // Returns lifecycle error as JSON for non-completed sims.
  http.get(`${BASE}/simulations/:id/export`, ({ params }) => {
    const id = params.id as string

    // Lifecycle gate: match results handler rules
    const terminal = DEMO_TERMINAL[id]
    if (terminal === 'pending') {
      return HttpResponse.json(
        errorEnvelope('SIMULATION_NOT_COMPLETE', 'Simulation has not been run yet.'),
        { status: 409 },
      )
    }
    if (terminal === 'failed') {
      return HttpResponse.json(
        errorEnvelope('SIMULATION_FAILED', 'Simulation failed. No export available.'),
        { status: 409 },
      )
    }

    const csv = [
      'persona_id,age_group,region,income_bracket,education,approval_score,emotion,quote',
      `p001,25-34,Northeast,middle,bachelor,4,hope,"Generally positive about this policy direction."`,
      `p002,55-64,South,low,high_school,2,concern,"Worried about the cost impact on fixed incomes."`,
      `p003,35-44,West,high,graduate,5,joy,"Long overdue and well-designed."`,
      `p004,18-24,Midwest,low,some_college,3,neutral,"Need more details before forming an opinion."`,
      `p005,45-54,South,middle,bachelor,2,anger,"This will hurt the people it claims to help."`,
      `# Export for simulation ${id}`,
      `# Generated at ${new Date().toISOString()}`,
      `# This is mock data from MSW. A real export would contain all sampled personas.`,
    ].join('\n')

    return new HttpResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="infinipol-${id}-results.csv"`,
      },
    })
  }),

  // GET /datasets → 200
  http.get(`${BASE}/datasets`, () => {
    return HttpResponse.json(envelope([
      {
        id: 'nemotron_usa',
        name: 'NVIDIA Nemotron Personas USA',
        description: '1M synthetic personas, census-aligned across 50 US states + territories',
        size: 1000000,
        attributes: ['age', 'sex', 'marital_status', 'education_level', 'occupation', 'state', 'city', 'zipcode', 'cultural_background'],
        license: 'CC BY 4.0',
      },
      {
        id: 'infinipol_indo_v1',
        name: 'InfiniPol Indonesia V1',
        description: 'Handmade synthetic dataset for Indonesia, 34 provinces',
        status: 'coming_v2',
      },
    ]))
  }),
]
