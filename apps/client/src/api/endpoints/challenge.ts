/**
 * Challenge API endpoints
 *
 * Post-run challenge loop — Gemma challenges weak outcomes and
 * suggests policy refinements.
 * Contract ref: packages/contracts/openapi/v1.json — "challenge" tag
 *
 * In MVP sign-off mode (`VITE_USE_MOCKS=false`), these calls must hit
 * real backend endpoints with no fallback substitution.
 */

import { api } from '@/api/client'
import type { components } from '@/api/types.gen'

// ── Type aliases ─────────────────────────────────────────────────────────────
export type ChallengeData         = components['schemas']['ChallengeData']
export type ChallengeFollowupData = components['schemas']['ChallengeFollowupData']

// ── Endpoint functions ───────────────────────────────────────────────────────

/**
 * POST /simulations/{id}/challenge → 200
 * Generate a challenge targeting weak outcomes in completed simulation.
 */
export async function generateChallenge(
  simulationId: string,
  focus: string,
): Promise<ChallengeData> {
  return api.post<ChallengeData>(
    `/simulations/${simulationId}/challenge`,
    { focus },
  )
}

/**
 * POST /challenges/{challenge_id}/followup → 200
 * Submit response to challenge, get followup + suggested policy refinement.
 */
export async function submitChallengeFollowup(
  challengeId: string,
  simulationId: string,
  userResponse: string,
): Promise<ChallengeFollowupData> {
  return api.post<ChallengeFollowupData>(
    `/challenges/${challengeId}/followup`,
    { simulation_id: simulationId, user_response: userResponse },
  )
}
