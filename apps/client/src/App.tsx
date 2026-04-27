/**
 * InfiniPol App — Route definitions
 *
 * Routes:
 *   /                              → Landing page (home)
 *   /simulations                   → Dashboard (simulation list)
 *   /simulations/new               → Create simulation form
 *   /simulations/:id               → Progress / status view
 *   /simulations/:id/results       → Results page
 *   /simulations/:id/results/challenge  → Challenge sub-view
 *   /compare                       → Policy comparison
 *   /guide                         → User guide
 *   /about                         → About page
 *   /methodology                   → Methodology disclosure
 *   *                              → 404 → redirect to /
 */

import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LandingPage        = lazy(() => import('@/features/landing/LandingPage'))
const DashboardPage      = lazy(() => import('@/features/dashboard/DashboardPage'))
const CreatePage         = lazy(() => import('@/features/create/CreatePage'))
const ClarificationPage  = lazy(() => import('@/features/clarification/ClarificationPage'))
const ProgressPage       = lazy(() => import('@/features/progress/ProgressPage'))
const ResultsPage        = lazy(() => import('@/features/results/ResultsPage'))
const ChallengePage      = lazy(() => import('@/features/challenge/ChallengePage'))
const ComparisonPage     = lazy(() => import('@/features/comparison/ComparisonPage'))
const GuidePage          = lazy(() => import('@/features/guide/GuidePage'))
const AboutPage          = lazy(() => import('@/features/about/AboutPage'))
const MethodologyPage    = lazy(() => import('@/features/methodology/MethodologyPage'))

// ── Dev-only ThemeSwitcher (tree-shaken in production) ────────────────────────
const ThemeSwitcher = import.meta.env.DEV
  ? lazy(() =>
      import('@/components/dev/ThemeSwitcher').then((m) => ({ default: m.ThemeSwitcher })),
    )
  : null

// ── Fallback loader ───────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <Center h="100vh">
      <Loader size="lg" color="var(--color-accent-primary)" />
    </Center>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                                  element={<ErrorBoundary inline><LandingPage /></ErrorBoundary>} />
          <Route path="/simulations"                       element={<ErrorBoundary inline><DashboardPage /></ErrorBoundary>} />
          <Route path="/simulations/new"                   element={<ErrorBoundary inline><CreatePage /></ErrorBoundary>} />
          <Route path="/simulations/:id/clarify"           element={<ErrorBoundary inline><ClarificationPage /></ErrorBoundary>} />
          <Route path="/simulations/:id"                   element={<ErrorBoundary inline><ProgressPage /></ErrorBoundary>} />
          <Route path="/simulations/:id/results"           element={<ErrorBoundary inline><ResultsPage /></ErrorBoundary>} />
          <Route path="/simulations/:id/results/challenge" element={<ErrorBoundary inline><ChallengePage /></ErrorBoundary>} />
          <Route path="/compare"                           element={<ErrorBoundary inline><ComparisonPage /></ErrorBoundary>} />
          <Route path="/guide"                             element={<ErrorBoundary inline><GuidePage /></ErrorBoundary>} />
          <Route path="/about"                             element={<ErrorBoundary inline><AboutPage /></ErrorBoundary>} />
          <Route path="/methodology"                       element={<ErrorBoundary inline><MethodologyPage /></ErrorBoundary>} />
          <Route path="*"                                  element={<Navigate to="/" replace />} />
        </Routes>

        {/* Dev-only: floating theme switcher */}
        {ThemeSwitcher && <ThemeSwitcher />}
      </Suspense>
    </ErrorBoundary>
  )
}
