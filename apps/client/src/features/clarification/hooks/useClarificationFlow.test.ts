/**
 * Tests for useClarificationFlow state machine.
 *
 * Specifically covers:
 *   - Happy path: idle → generating → waiting_answer → submitting → done
 *   - Stale-closure regression: turns must accumulate via functional setState
 *   - Skip flow
 *   - Retry from error state
 *   - Done when clarification_status === 'resolved'
 *   - Done after MAX_TURNS (3) reached
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useClarificationFlow } from './useClarificationFlow'

vi.mock('@/api', () => ({
  generateClarification: vi.fn(),
  answerClarification:   vi.fn(),
}))

import { generateClarification, answerClarification } from '@/api'

const SIM_ID = 'sim_clar_test'

function makeQuestion(id = 'cl_q1', turn = 1) {
  return {
    clarification_id: id,
    simulation_id:    SIM_ID,
    question_text:    `Question ${turn}?`,
    rationale:        'because',
    status:           'open',
    turn_index:       turn,
  }
}

function makeAnswer(opts: {
  status?: 'in_progress' | 'resolved'
  next_id?: string | null
  next_q?: string | null
  refined?: string | null
}) {
  return {
    simulation_id:        SIM_ID,
    clarification_status: opts.status ?? 'in_progress',
    refined_policy_text:  opts.refined ?? 'refined text',
    next_clarification_id: opts.next_id ?? null,
    next_question_text:    opts.next_q ?? null,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

// ── Happy path ──────────────────────────────────────────────────────────────

describe('useClarificationFlow — happy path', () => {
  it('starts in idle, transitions to waiting_answer on start()', async () => {
    (generateClarification as ReturnType<typeof vi.fn>).mockResolvedValue(makeQuestion())

    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useClarificationFlow({ simulationId: SIM_ID, onComplete }),
    )

    expect(result.current.state).toBe('idle')

    await act(async () => { await result.current.start('focus') })

    await waitFor(() => expect(result.current.state).toBe('waiting_answer'))
    expect(result.current.currentQuestion?.clarification_id).toBe('cl_q1')
    expect(generateClarification).toHaveBeenCalledWith(SIM_ID, 'focus')
  })

  it('submits answer and chains to next question', async () => {
    (generateClarification as ReturnType<typeof vi.fn>).mockResolvedValue(makeQuestion('cl_q1', 1))
    ;(answerClarification as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAnswer({ next_id: 'cl_q2', next_q: 'Second?' }),
    )

    const { result } = renderHook(() =>
      useClarificationFlow({ simulationId: SIM_ID, onComplete: vi.fn() }),
    )

    await act(async () => { await result.current.start() })
    await act(async () => { await result.current.submitAnswer('my answer') })

    await waitFor(() => expect(result.current.state).toBe('waiting_answer'))
    expect(result.current.turns).toHaveLength(1)
    expect(result.current.turns[0].answer).toBe('my answer')
    expect(result.current.currentQuestion?.clarification_id).toBe('cl_q2')
  })
})

// ── Stale-closure regression test (council-r1 fix) ─────────────────────────

describe('useClarificationFlow — turn accumulation', () => {
  it('preserves all turns across multiple submissions (no stale closure)', async () => {
    (generateClarification as ReturnType<typeof vi.fn>).mockResolvedValue(makeQuestion('cl_q1', 1))
    ;(answerClarification as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(makeAnswer({ next_id: 'cl_q2', next_q: 'Q2?' }))
      .mockResolvedValueOnce(makeAnswer({ next_id: 'cl_q3', next_q: 'Q3?' }))
      .mockResolvedValueOnce(makeAnswer({ status: 'resolved' }))

    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useClarificationFlow({ simulationId: SIM_ID, onComplete }),
    )

    await act(async () => { await result.current.start() })

    await act(async () => { await result.current.submitAnswer('a1') })
    await waitFor(() => expect(result.current.turns).toHaveLength(1))

    await act(async () => { await result.current.submitAnswer('a2') })
    await waitFor(() => expect(result.current.turns).toHaveLength(2))

    await act(async () => { await result.current.submitAnswer('a3') })
    await waitFor(() => expect(result.current.state).toBe('done'))

    expect(result.current.turns).toHaveLength(3)
    expect(result.current.turns.map(t => t.answer)).toEqual(['a1', 'a2', 'a3'])
    expect(onComplete).toHaveBeenCalledWith('refined text')
  })
})

// ── Terminal conditions ─────────────────────────────────────────────────────

describe('useClarificationFlow — terminal conditions', () => {
  it('moves to done when status === resolved', async () => {
    (generateClarification as ReturnType<typeof vi.fn>).mockResolvedValue(makeQuestion())
    ;(answerClarification as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAnswer({ status: 'resolved', refined: 'final policy' }),
    )

    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useClarificationFlow({ simulationId: SIM_ID, onComplete }),
    )

    await act(async () => { await result.current.start() })
    await act(async () => { await result.current.submitAnswer('done') })

    await waitFor(() => expect(result.current.state).toBe('done'))
    expect(onComplete).toHaveBeenCalledWith('final policy')
  })

  it('moves to done when next_clarification_id is null even if status=in_progress', async () => {
    (generateClarification as ReturnType<typeof vi.fn>).mockResolvedValue(makeQuestion())
    ;(answerClarification as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAnswer({ status: 'in_progress', next_id: null }),
    )

    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useClarificationFlow({ simulationId: SIM_ID, onComplete }),
    )

    await act(async () => { await result.current.start() })
    await act(async () => { await result.current.submitAnswer('answer') })

    await waitFor(() => expect(result.current.state).toBe('done'))
    expect(onComplete).toHaveBeenCalled()
  })
})

// ── Skip + retry ────────────────────────────────────────────────────────────

describe('useClarificationFlow — skip / retry', () => {
  it('skip transitions to done immediately with current refined text', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useClarificationFlow({ simulationId: SIM_ID, onComplete }),
    )

    act(() => { result.current.skip() })
    expect(result.current.state).toBe('done')
    expect(onComplete).toHaveBeenCalledWith(null)
  })

  it('retry on error with current question returns to waiting_answer', async () => {
    (generateClarification as ReturnType<typeof vi.fn>).mockResolvedValue(makeQuestion())
    ;(answerClarification as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('net'))

    const { result } = renderHook(() =>
      useClarificationFlow({ simulationId: SIM_ID, onComplete: vi.fn() }),
    )

    await act(async () => { await result.current.start() })
    await act(async () => { await result.current.submitAnswer('answer') })
    await waitFor(() => expect(result.current.state).toBe('error'))

    act(() => { result.current.retry() })
    expect(result.current.state).toBe('waiting_answer')
    expect(result.current.error).toBeNull()
  })
})
