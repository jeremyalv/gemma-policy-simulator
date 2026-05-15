/**
 * Tests for useChallengeFlow state machine.
 *
 * Covers the double-submit guards added in the council-r1 fix:
 *   - startChallenge ignored when state !== 'picking'
 *   - submitResponse ignored when state !== 'challenging'
 *
 * And the basic happy-path transitions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChallengeFlow } from './useChallengeFlow'

// ── Mock the API endpoints used by the hook ─────────────────────────────────

vi.mock('@/api', () => ({
  generateChallenge:        vi.fn(),
  submitChallengeFollowup:  vi.fn(),
}))

import { generateChallenge, submitChallengeFollowup } from '@/api'

const SIM_ID = 'sim_test1234'

beforeEach(() => {
  vi.resetAllMocks()
})

// ── Happy path ──────────────────────────────────────────────────────────────

describe('useChallengeFlow — happy path', () => {
  it('transitions idle → picking → challenging on startChallenge', async () => {
    (generateChallenge as ReturnType<typeof vi.fn>).mockResolvedValue({
      challenge_id: 'ch_a1',
      challenge_text: 'Why?',
      focus: 'weak_segment',
      evidence: {},
    })

    const { result } = renderHook(() => useChallengeFlow({ simulationId: SIM_ID }))

    expect(result.current.state).toBe('idle')

    act(() => { result.current.open() })
    expect(result.current.state).toBe('picking')

    act(() => { result.current.selectFocus('weak_segment') })

    await act(async () => { await result.current.startChallenge() })

    await waitFor(() => expect(result.current.state).toBe('challenging'))
    expect(result.current.challenge?.challenge_id).toBe('ch_a1')
    expect(generateChallenge).toHaveBeenCalledTimes(1)
  })

  it('transitions challenging → followup on submitResponse', async () => {
    (generateChallenge as ReturnType<typeof vi.fn>).mockResolvedValue({
      challenge_id: 'ch_a1', challenge_text: '?', focus: 'weak_segment', evidence: {},
    })
    ;(submitChallengeFollowup as ReturnType<typeof vi.fn>).mockResolvedValue({
      followup_text: 'thanks', suggested_policy_refinement: '...', evidence: {},
      next_challenge_id: 'ch_a2',
    })

    const { result } = renderHook(() => useChallengeFlow({ simulationId: SIM_ID }))
    act(() => { result.current.open(); result.current.selectFocus('weak_segment') })
    await act(async () => { await result.current.startChallenge() })

    await act(async () => { await result.current.submitResponse('my response') })
    await waitFor(() => expect(result.current.state).toBe('followup'))
    expect(result.current.followup?.next_challenge_id).toBe('ch_a2')
  })
})

// ── Double-submit guards ────────────────────────────────────────────────────

describe('useChallengeFlow — double-submit guards', () => {
  it('startChallenge no-ops when state !== picking', async () => {
    (generateChallenge as ReturnType<typeof vi.fn>).mockResolvedValue({
      challenge_id: 'ch_a1', challenge_text: '?', focus: 'weak_segment', evidence: {},
    })

    const { result } = renderHook(() => useChallengeFlow({ simulationId: SIM_ID }))
    act(() => { result.current.open(); result.current.selectFocus('weak_segment') })

    // First call → fires
    await act(async () => { await result.current.startChallenge() })
    await waitFor(() => expect(result.current.state).toBe('challenging'))

    // Second call while state=challenging → ignored, no extra API hit
    await act(async () => { await result.current.startChallenge() })
    expect(generateChallenge).toHaveBeenCalledTimes(1)
  })

  it('submitResponse no-ops when state !== challenging', async () => {
    (generateChallenge as ReturnType<typeof vi.fn>).mockResolvedValue({
      challenge_id: 'ch_a1', challenge_text: '?', focus: 'weak_segment', evidence: {},
    })
    ;(submitChallengeFollowup as ReturnType<typeof vi.fn>).mockResolvedValue({
      followup_text: 'thanks', suggested_policy_refinement: '...', evidence: {},
      next_challenge_id: 'ch_a2',
    })

    const { result } = renderHook(() => useChallengeFlow({ simulationId: SIM_ID }))
    act(() => { result.current.open(); result.current.selectFocus('weak_segment') })
    await act(async () => { await result.current.startChallenge() })

    // First submitResponse → followup state
    await act(async () => { await result.current.submitResponse('first') })
    await waitFor(() => expect(result.current.state).toBe('followup'))

    // Second submitResponse from followup state → ignored
    await act(async () => { await result.current.submitResponse('second') })
    expect(submitChallengeFollowup).toHaveBeenCalledTimes(1)
  })

  it('selectFocus is required before startChallenge fires', async () => {
    const { result } = renderHook(() => useChallengeFlow({ simulationId: SIM_ID }))
    act(() => { result.current.open() })

    // No focus selected — startChallenge should no-op
    await act(async () => { await result.current.startChallenge() })
    expect(generateChallenge).not.toHaveBeenCalled()
    expect(result.current.state).toBe('picking')
  })
})

// ── Error paths ─────────────────────────────────────────────────────────────

describe('useChallengeFlow — error handling', () => {
  it('transitions to error state when generateChallenge throws', async () => {
    (generateChallenge as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useChallengeFlow({ simulationId: SIM_ID }))
    act(() => { result.current.open(); result.current.selectFocus('weak_segment') })
    await act(async () => { await result.current.startChallenge() })

    await waitFor(() => expect(result.current.state).toBe('error'))
    expect(result.current.error).toContain('boom')
  })

  it('retry returns to picking when no challenge yet', async () => {
    (generateChallenge as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useChallengeFlow({ simulationId: SIM_ID }))
    act(() => { result.current.open(); result.current.selectFocus('weak_segment') })
    await act(async () => { await result.current.startChallenge() })
    await waitFor(() => expect(result.current.state).toBe('error'))

    act(() => { result.current.retry() })
    expect(result.current.state).toBe('picking')
    expect(result.current.error).toBeNull()
  })

  it('challengeAgain resets challenge/followup and goes back to picking', async () => {
    (generateChallenge as ReturnType<typeof vi.fn>).mockResolvedValue({
      challenge_id: 'ch_a1', challenge_text: '?', focus: 'weak_segment', evidence: {},
    })

    const { result } = renderHook(() => useChallengeFlow({ simulationId: SIM_ID }))
    act(() => { result.current.open(); result.current.selectFocus('weak_segment') })
    await act(async () => { await result.current.startChallenge() })
    await waitFor(() => expect(result.current.state).toBe('challenging'))

    act(() => { result.current.challengeAgain() })
    expect(result.current.state).toBe('picking')
    expect(result.current.challenge).toBeNull()
    expect(result.current.selectedFocus).toBeNull()
    expect(result.current.loopCount).toBe(1)
  })
})
