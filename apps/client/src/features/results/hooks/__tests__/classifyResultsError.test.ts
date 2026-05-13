/**
 * Tests for classifyResultsError — the error classification helper
 * used to drive lifecycle error UX on ResultsPage.
 *
 * Covers all four error kinds:
 *   simulation_failed   — 409 with SIMULATION_FAILED code
 *   lifecycle_conflict  — 409 with any other code (e.g. SIMULATION_NOT_COMPLETE)
 *   not_found           — 404
 *   other               — anything else (network, 500, plain Error, unknown)
 */

import { describe, it, expect } from 'vitest'
import { classifyResultsError } from '../useSimulationResults'
import { ApiError } from '@/lib/envelope'

// ── helpers ──────────────────────────────────────────────────────────────────

function apiError(code: string, httpStatus: number) {
  return new ApiError(code, 'test message', httpStatus)
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('classifyResultsError', () => {
  // ── simulation_failed ────────────────────────────────────────────────────
  it('returns simulation_failed for 409 with SIMULATION_FAILED code', () => {
    expect(classifyResultsError(apiError('SIMULATION_FAILED', 409))).toBe('simulation_failed')
  })

  // ── lifecycle_conflict ───────────────────────────────────────────────────
  it('returns lifecycle_conflict for 409 with SIMULATION_NOT_COMPLETE code', () => {
    expect(classifyResultsError(apiError('SIMULATION_NOT_COMPLETE', 409))).toBe('lifecycle_conflict')
  })

  it('returns lifecycle_conflict for generic 409 (unknown code)', () => {
    expect(classifyResultsError(apiError('LIFECYCLE_CONFLICT', 409))).toBe('lifecycle_conflict')
  })

  // ── not_found ────────────────────────────────────────────────────────────
  it('returns not_found for 404', () => {
    expect(classifyResultsError(apiError('NOT_FOUND', 404))).toBe('not_found')
  })

  // ── other ────────────────────────────────────────────────────────────────
  it('returns other for 500 ApiError', () => {
    expect(classifyResultsError(apiError('INTERNAL_ERROR', 500))).toBe('other')
  })

  it('returns other for plain Error', () => {
    expect(classifyResultsError(new Error('network failure'))).toBe('other')
  })

  it('returns other for null', () => {
    expect(classifyResultsError(null)).toBe('other')
  })

  it('returns other for undefined', () => {
    expect(classifyResultsError(undefined)).toBe('other')
  })

  it('returns other for a plain object', () => {
    expect(classifyResultsError({ message: 'oops' })).toBe('other')
  })
})
