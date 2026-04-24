/**
 * MSW browser worker setup
 * Import and call `startMockWorker()` in main.tsx when mocks are enabled.
 *
 * Mocks are active when:
 *   - VITE_USE_MOCKS=true  (explicit opt-in)
 *   - or VITE_USE_MOCKS is unset and mode === 'development'
 */

import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export async function startMockWorker(): Promise<void> {
  await worker.start({
    // Only warn on unhandled requests — don't throw, so real API calls still work
    onUnhandledRequest: 'warn',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
  console.info('[MSW] Mock Service Worker started — all V1 API calls intercepted.')
}
