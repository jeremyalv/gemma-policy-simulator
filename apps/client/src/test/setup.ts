/**
 * Vitest global test setup.
 * Extends expect with @testing-library/jest-dom matchers.
 */

import '@testing-library/jest-dom'

// jsdom doesn't implement window.matchMedia — polyfill it so Mantine's
// color-scheme detection doesn't throw during component tests.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches:             false,
    media:               query,
    onchange:            null,
    addListener:         () => {},
    removeListener:      () => {},
    addEventListener:    () => {},
    removeEventListener: () => {},
    dispatchEvent:       () => false,
  }),
})
