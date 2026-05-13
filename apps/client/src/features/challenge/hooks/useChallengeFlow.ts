/**
 * useChallengeFlow — state machine for the post-run challenge loop.
 *
 * States:
 *   idle → picking → loading_challenge → challenging →
 *   submitting → followup → (picking again | done)
 *
 * Contract endpoints used:
 *   POST /simulations/:id/challenge          → ChallengeData
 *   POST /challenges/:challenge_id/followup  → ChallengeFollowupData
 *
 */

import { useState, useCallback } from 'react'
import { generateChallenge, submitChallengeFollowup } from '@/api'
import type { ChallengeData, ChallengeFollowupData } from '@/api'
import { challengeErrorMessage } from './challengeErrors'

export type ChallengeFlowState =
  | 'idle'
  | 'picking'
  | 'loading_challenge'
  | 'challenging'
  | 'submitting'
  | 'followup'
  | 'done'
  | 'error'

export const FOCUS_OPTIONS = [
  {
    value:       'weak_segment',
    label:       'Weak Segment',
    description: 'Challenge the lowest-approval demographic group.',
  },
  {
    value:       'behavioral_change',
    label:       'Behavioral Change',
    description: 'Probe whether predicted behaviour changes are realistic.',
  },
  {
    value:       'emotion_bias',
    label:       'Emotion Bias',
    description: 'Question why a particular emotion dominates the response.',
  },
  {
    value:       'demographic_gap',
    label:       'Demographic Gap',
    description: 'Explore the largest approval gap between demographic groups.',
  },
] as const

export type FocusValue = typeof FOCUS_OPTIONS[number]['value']

interface UseChallengeFlowOptions {
  simulationId: string
}

interface UseChallengeFlowReturn {
  state:           ChallengeFlowState
  loopCount:       number
  selectedFocus:   FocusValue | null
  challenge:       ChallengeData | null
  followup:        ChallengeFollowupData | null
  error:           string | null
  // Actions
  open:            () => void
  close:           () => void
  selectFocus:     (focus: FocusValue) => void
  startChallenge:  () => Promise<void>
  submitResponse:  (response: string) => Promise<void>
  challengeAgain:  () => void
  retry:           () => void
}

export function useChallengeFlow({ simulationId }: UseChallengeFlowOptions): UseChallengeFlowReturn {
  const [state,          setState]         = useState<ChallengeFlowState>('idle')
  const [loopCount,      setLoopCount]     = useState(0)
  const [selectedFocus,  setSelectedFocus] = useState<FocusValue | null>(null)
  const [challenge,      setChallenge]     = useState<ChallengeData | null>(null)
  const [followup,       setFollowup]      = useState<ChallengeFollowupData | null>(null)
  const [error,          setError]         = useState<string | null>(null)

  // ── Open / close ──────────────────────────────────────────────────────────
  const open  = useCallback(() => {
    setState('picking')
    setError(null)
  }, [])
  const close = useCallback(() => { setState('idle') }, [])

  // ── Select focus ──────────────────────────────────────────────────────────
  const selectFocus = useCallback((focus: FocusValue) => {
    setSelectedFocus(focus)
  }, [])

  // ── Start challenge ───────────────────────────────────────────────────────
  const startChallenge = useCallback(async () => {
    if (!selectedFocus) return
    setState('loading_challenge')
    setError(null)

    try {
      const data = await generateChallenge(simulationId, selectedFocus)
      setChallenge(data)
      setState('challenging')
    } catch (err) {
      setError(challengeErrorMessage(err, 'Failed to generate challenge.'))
      setState('error')
    }
  }, [simulationId, selectedFocus])

  // ── Submit response ───────────────────────────────────────────────────────
  const submitResponse = useCallback(async (response: string) => {
    if (!challenge) return
    setState('submitting')
    setError(null)

    try {
      const data = await submitChallengeFollowup(
        challenge.challenge_id,
        simulationId,
        response,
      )
      setFollowup(data)
      setState('followup')
    } catch (err) {
      setError(challengeErrorMessage(err, 'Failed to submit response.'))
      setState('error')
    }
  }, [challenge, simulationId])

  // ── Challenge again ───────────────────────────────────────────────────────
  const challengeAgain = useCallback(() => {
    setLoopCount((n) => n + 1)
    setChallenge(null)
    setFollowup(null)
    setSelectedFocus(null)
    setError(null)
    setState('picking')
  }, [])

  // ── Retry ─────────────────────────────────────────────────────────────────
  const retry = useCallback(() => {
    setError(null)
    if (challenge) setState('challenging')
    else setState('picking')
  }, [challenge])

  return {
    state, loopCount, selectedFocus, challenge, followup,
    error,
    open, close, selectFocus, startChallenge, submitResponse, challengeAgain, retry,
  }
}
