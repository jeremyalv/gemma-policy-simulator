/**
 * Clarifications API endpoints
 *
 * Pre-run clarification loop with Gemma.
 * Contract ref: docs/contracts/frontend-backend-v1.md — "Pre-Run Clarification Loop"
 *
 * KEY RULES (from contract):
 * - Clarification is OPTIONAL and non-blocking for /run
 * - Max 3 turns (turn_index 1–3)
 * - Transcript is EPHEMERAL — only refined_policy_text persisted by backend
 * - Q&A history must be maintained in frontend state
 * - Clarification only works on status = "pending" simulations
 */

import { api } from '@/api/client'
import type { components } from '@/api/types.gen'

// ── Type aliases ─────────────────────────────────────────────────────────────
export type ClarificationStatus       = components['schemas']['ClarificationStatus']
export type ClarificationQuestionState = components['schemas']['ClarificationQuestionState']
export type ClarificationQuestionData = components['schemas']['ClarificationQuestionData']
export type ClarificationAnswerData   = components['schemas']['ClarificationAnswerData']
export type ClarificationStateData    = components['schemas']['ClarificationStateData']

// ── Endpoint functions ───────────────────────────────────────────────────────

/**
 * POST /simulations/{id}/clarifications/generate → 200
 * Generate the next clarification question for a pending simulation.
 */
export async function generateClarification(
  simulationId: string,
  focus: string,
): Promise<ClarificationQuestionData> {
  return api.post<ClarificationQuestionData>(
    `/simulations/${simulationId}/clarifications/generate`,
    { focus },
  )
}

/**
 * POST /clarifications/{clarification_id}/answer → 200
 * Submit answer, receive updated refined_policy_text + optional next question.
 */
export async function answerClarification(
  clarificationId: string,
  simulationId: string,
  userResponse: string,
): Promise<ClarificationAnswerData> {
  return api.post<ClarificationAnswerData>(
    `/clarifications/${clarificationId}/answer`,
    { simulation_id: simulationId, user_response: userResponse },
  )
}

/**
 * GET /simulations/{id}/clarifications → 200
 * Fetch current clarification state (ephemeral).
 * Note: does NOT return Q&A transcript — only latest_refined_policy_text.
 */
export async function getClarificationState(
  simulationId: string,
): Promise<ClarificationStateData> {
  return api.get<ClarificationStateData>(`/simulations/${simulationId}/clarifications`)
}
