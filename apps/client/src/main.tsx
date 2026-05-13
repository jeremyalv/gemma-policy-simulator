/**
 * SIMS — React entry point
 *
 * Boot order:
 *   1. Start MSW mock worker (dev/mock mode only)
 *   2. Mount React tree: ThemeProvider → QueryClientProvider → RouterProvider → App
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { isMockModeEnabled } from '@/lib/mockMode'
import App from './App'

// ── Fonts (fontsource — Vite resolves these as proper assets, no /fonts/ path needed)
import '@fontsource-variable/source-serif-4'
import '@fontsource-variable/ibm-plex-sans'
import '@fontsource-variable/jetbrains-mono'

// ── Mantine CSS — must come before globals so our CSS vars override Mantine defaults
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

import '@/styles/globals.css'

// ── TanStack Query client ─────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale after 30s — most SIMS data changes via explicit user action
      staleTime: 30_000,
      // Retry once on failure; don't hammer backend on hard 4xx
      retry: (failureCount, error: unknown) => {
        if (error && typeof error === 'object' && 'httpStatus' in error) {
          const status = (error as { httpStatus: number }).httpStatus
          // Never retry client errors
          if (status >= 400 && status < 500) return false
        }
        return failureCount < 1
      },
      // Show stale data while revalidating
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

// ── Mock Service Worker ───────────────────────────────────────────────────────
//
// Mocks are DISABLED by default.
// This keeps MVP sign-off paths bound to real backend behavior.
//
// To enable mocks locally, set VITE_USE_MOCKS=true:
//   VITE_USE_MOCKS=true vite dev
//
const useMocks = isMockModeEnabled(import.meta.env.VITE_USE_MOCKS)

async function prepare(): Promise<void> {
  if (useMocks) {
    const { startMockWorker } = await import('@/mocks/browser')
    await startMockWorker()
    console.info('[InfiniPol] startup mode: mocks enabled (VITE_USE_MOCKS=true)')
    return
  }
  console.info('[InfiniPol] startup mode: real backend (mocks disabled)')
}

// ── Mount ─────────────────────────────────────────────────────────────────────

prepare().then(() => {
  const root = document.getElementById('root')
  if (!root) throw new Error('[SIMS] #root element not found in index.html')

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
          {import.meta.env.DEV && (
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
          )}
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>,
  )
})
