import { describe, expect, it } from 'vitest'
import { challengeErrorMessage } from './challengeErrors'

describe('challengeErrorMessage', () => {
  it('uses backend error message when available', () => {
    expect(challengeErrorMessage(new Error('backend unavailable'), 'fallback')).toBe('backend unavailable')
  })

  it('falls back for non-error throws', () => {
    expect(challengeErrorMessage('oops', 'fallback')).toBe('fallback')
  })
})
