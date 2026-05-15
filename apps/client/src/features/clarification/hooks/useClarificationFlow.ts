/**
 * useClarificationFlow — state machine for the pre-run clarification loop.
 *
 * Contract rules (enforced here):
 *  - Max 3 turns (turn_index 1–3)
 *  - Transcript is EPHEMERAL — frontend keeps Q&A history in local state
 *  - Only refined_policy_text is persisted by backend
 *  - Flow terminates when clarification_status === 'resolved' OR turn_index === 3
 *  - Clarification only works on status === 'pending' simulations
 *
 * States:
 *   idle → generating → waiting_answer → submitting → (back to generating | done)
 *   idle → done (if status already resolved)
 *   any  → error (recoverable via retry)
 */

import { useState, useCallback } from 'react'
import { generateClarification, answerClarification } from '@/api'
import type {
  ClarificationQuestionData,
  ClarificationAnswerData,
} from '@/api'

const MAX_TURNS = 3

export type ClarificationFlowState =
  | 'idle'
  | 'generating'
  | 'waiting_answer'
  | 'submitting'
  | 'done'
  | 'error'

export interface QATurn {
  question: ClarificationQuestionData
  answer?: string
  refinedPolicyText?: string
}

interface UseClarificationFlowOptions {
  simulationId: string
  /** Called after all turns complete or status resolved — ready to run */
  onComplete: (refinedPolicyText: string | null) => void
}

interface UseClarificationFlowReturn {
  state: ClarificationFlowState
  turns: QATurn[]
  currentQuestion: ClarificationQuestionData | null
  currentTurn: number  // 1-based
  refinedPolicyText: string | null
  error: string | null
  /** Begin the flow — generate first question */
  start: (focus?: string) => Promise<void>
  /** Submit answer to current question */
  submitAnswer: (answer: string) => Promise<void>
  /** Skip remaining turns and proceed to run */
  skip: () => void
  /** Retry after error */
  retry: () => void
}

export function useClarificationFlow({
  simulationId,
  onComplete,
}: UseClarificationFlowOptions): UseClarificationFlowReturn {
  const [state, setState] = useState<ClarificationFlowState>('idle')
  const [turns, setTurns] = useState<QATurn[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<ClarificationQuestionData | null>(null)
  const [refinedPolicyText, setRefinedPolicyText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastFocus, setLastFocus] = useState<string>('')

  const currentTurn = turns.length + (currentQuestion ? 1 : 0)

  // ── Generate next question ────────────────────────────────────────────────
  const generateNext = useCallback(
    async (focus: string) => {
      setState('generating')
      setError(null)
      try {
        const q = await generateClarification(simulationId, focus)
        setCurrentQuestion(q)
        setState('waiting_answer')
      } catch (err) {
        setError((err as Error).message ?? 'Failed to generate clarification question.')
        setState('error')
      }
    },
    [simulationId],
  )

  // ── Start flow ────────────────────────────────────────────────────────────
  const start = useCallback(
    async (focus = 'policy impact and eligibility') => {
      setLastFocus(focus)
      setTurns([])
      setCurrentQuestion(null)
      setRefinedPolicyText(null)
      await generateNext(focus)
    },
    [generateNext],
  )

  // ── Submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!currentQuestion) return
      setState('submitting')
      setError(null)

      try {
        const result: ClarificationAnswerData = await answerClarification(
          currentQuestion.clarification_id,
          simulationId,
          answer,
        )

        // Archive this turn.
        // Use functional update to avoid stale closure if the component
        // somehow fires submitAnswer twice before React commits the state.
        const completedTurn: QATurn = {
          question: currentQuestion,
          answer,
          refinedPolicyText: result.refined_policy_text,
        }
        setTurns(prev => [...prev, completedTurn])
        setRefinedPolicyText(result.refined_policy_text)
        setCurrentQuestion(null)

        // turns is stale here (React batches state), so compute the new
        // length from the known-at-call-time value + 1.
        const newTurnCount = turns.length + 1

        // Decide next step
        const isDone =
          result.clarification_status === 'resolved' ||
          newTurnCount >= MAX_TURNS ||
          !result.next_clarification_id

        if (isDone) {
          setState('done')
          onComplete(result.refined_policy_text)
        } else {
          // Chain to next question — synthesize question from answer data
          const nextQ: ClarificationQuestionData = {
            clarification_id: result.next_clarification_id!,
            simulation_id: simulationId,
            question_text: result.next_question_text ?? '',
            rationale: '',
            status: 'open',
            turn_index: newTurnCount + 1,
          }
          setCurrentQuestion(nextQ)
          setState('waiting_answer')
        }
      } catch (err) {
        setError((err as Error).message ?? 'Failed to submit answer.')
        setState('error')
      }
    },
    [currentQuestion, simulationId, turns, onComplete],
  )

  // ── Skip ──────────────────────────────────────────────────────────────────
  const skip = useCallback(() => {
    setState('done')
    onComplete(refinedPolicyText)
  }, [refinedPolicyText, onComplete])

  // ── Retry ─────────────────────────────────────────────────────────────────
  const retry = useCallback(() => {
    if (currentQuestion) {
      setState('waiting_answer')
      setError(null)
    } else {
      generateNext(lastFocus)
    }
  }, [currentQuestion, lastFocus, generateNext])

  return {
    state,
    turns,
    currentQuestion,
    currentTurn: Math.max(1, currentTurn),
    refinedPolicyText,
    error,
    start,
    submitAnswer,
    skip,
    retry,
  }
}
