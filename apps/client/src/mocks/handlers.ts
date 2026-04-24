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
  http.post(`${BASE}/simulations/:id/run`, ({ params }) => {
    return HttpResponse.json(
      envelope({
        id: params.id,
        status: 'running',
        started_at: new Date().toISOString(),
        estimated_seconds: 75,
        runtime_profile: 'balanced',
        effective_sample_size: 480,
      }),
      { status: 202 },
    )
  }),

  // GET /simulations/:id/status → 200 (simulates progression)
  http.get(`${BASE}/simulations/:id/status`, ({ params }) => {
    // Simulate progress based on time (for demo purposes)
    const pct = Math.min(100, Math.floor(Math.random() * 100))
    const isComplete = pct >= 95
    return HttpResponse.json(envelope({
      id: params.id,
      status: isComplete ? 'completed' : 'running',
      agents_total: 500,
      agents_completed: Math.floor(pct * 5),
      progress_pct: pct,
      estimated_seconds_remaining: isComplete ? 0 : Math.floor((100 - pct) * 0.75),
      runtime_profile: 'balanced',
      effective_sample_size: 480,
    }))
  }),

  // GET /simulations/:id/results → 200
  http.get(`${BASE}/simulations/:id/results`, ({ params }) => {
    return HttpResponse.json(envelope({
      id: params.id,
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
      raw_responses_url: `/api/v1/simulations/${params.id}/export`,
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
  http.post(`${BASE}/simulations/:id/challenge`, () => {
    return HttpResponse.json(envelope({
      challenge_id: `ch_${Math.random().toString(36).slice(2, 7)}`,
      challenge_text: 'Voters aged 55+ show approval of only 2.7/5 — the lowest of any age group. Their top concern is increased living costs. How does this policy protect fixed-income households?',
      evidence: {
        segment: 'Age 55+',
        mean_approval: 2.7,
        top_concern: 'Increased living costs without adequate support mechanisms',
      },
    }))
  }),

  // POST /challenges/:id/followup → 200
  http.post(`${BASE}/challenges/:challenge_id/followup`, () => {
    return HttpResponse.json(envelope({
      followup_text: 'That is a meaningful addition. Would a tiered rebate structure better address income disparities across all vulnerable groups, not just seniors?',
      suggested_policy_refinement: 'A federal carbon tax of $50/tonne with tiered monthly rebates: households below 150% poverty line receive full rebate, 150–200% receive partial rebate, with special protections for fixed-income seniors via Social Security adjustment.',
      next_challenge_id: `ch_${Math.random().toString(36).slice(2, 7)}`,
    }))
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
        description: 'Handmade synthetic dataset for Indonesia — 34 provinces',
        status: 'coming_v2',
      },
    ]))
  }),
]
