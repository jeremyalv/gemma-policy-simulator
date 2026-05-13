import { describe, expect, it } from 'vitest'
import { isMockModeEnabled } from './mockMode'

describe('isMockModeEnabled', () => {
  it('enables mocks only for explicit true', () => {
    expect(isMockModeEnabled('true')).toBe(true)
  })

  it('disables mocks for false/unset/other values', () => {
    expect(isMockModeEnabled('false')).toBe(false)
    expect(isMockModeEnabled(undefined)).toBe(false)
    expect(isMockModeEnabled('1')).toBe(false)
  })
})
