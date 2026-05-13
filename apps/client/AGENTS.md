# Client Guidance — InfiniPol Frontend

## Stack
React 18 · Vite 6 · TypeScript 5 · Mantine 7 · TanStack Query v5 · Recharts · react-simple-maps · Zustand · react-router-dom v6

## Key Architecture Notes
- **Brand:** InfiniPol (Infinite Policy Testing). All user-visible strings must say "InfiniPol", not "SIMS".
- **Routes:** `/` = LandingPage, `/simulations` = Dashboard, `/simulations/new` = Create, `/guide` = GuidePage, `/about` = AboutPage.
- **Back-navigation:** all "Back to Simulations" buttons navigate to `/simulations`, not `/`.
- **Contract source:** `packages/contracts/openapi/v1.json` → auto-generated `src/api/types.gen.ts`.
- **API barrel:** import types from `@/api` (re-exports from `src/api/index.ts`), not from `types.gen.ts` directly.
- **Theming:** multi-tenant via CSS custom properties + `public/institution-config.json`. Default: `global-default` (teal/gold). Alternatives: `gov-formal`, `think-tank-modern`, `academic-warm`.
- **Mock mode:** MSW worker at `public/mockServiceWorker.js`. Enabled only when `VITE_USE_MOCKS=true`.
- **localStorage:** simulation history at `infinipol:simulations`, draft form at `infinipol:create-draft`.

## Completed Features
- ✅ LandingPage (`/`) — interactive hero with live simulation mock, animated counters, marquee, scroll-reveal cards
- ✅ DashboardPage (`/simulations`) — simulation history table with status, approval score, actions
- ✅ CreatePage (`/simulations/new`) — policy form with filters, sample slider, dataset selector, draft persistence
- ✅ ClarificationPage (`/simulations/:id/clarify`) — multi-turn Gemma Q&A before run
- ✅ ProgressPage (`/simulations/:id`) — live polling progress bar, milestone steps
- ✅ ResultsPage (`/simulations/:id/results`) — tabs: Overview, Demographics, Voices, Challenge
- ✅ ChallengePage (`/simulations/:id/results/challenge`) — AI challenge mode with focus picker
- ✅ ComparisonPage (`/compare`) — side-by-side dual simulation comparison
- ✅ GuidePage (`/guide`) — 7-step workflow guide + 6 FAQs
- ✅ AboutPage (`/about`) — mission, tech stack, dataset attribution

## TypeScript Notes (tsc -b, noUnusedLocals/Parameters)
- Use `tsc -b` (not `tsc --noEmit`) — root `tsconfig.json` has `"files": []`, so only `tsc -b` invokes `tsconfig.app.json` with strict checks.
- `diff-match-patch` uses `export = diff_match_patch` — import as `import diff_match_patch from 'diff-match-patch'`.
- `react-simple-maps` has no types — shim at `src/types/react-simple-maps.d.ts`.
- `tsconfig.node.json` requires `skipLibCheck: true` (d3-array / vite `.d.ts` errors).
- TanStack Query v5: `mutate()` does not accept `context` — use variables pattern.
- Mantine 7 Progress: `styles.bar` → `styles.section`. Slider: `markFilled` is invalid.
- Recharts `ResponsiveContainer` does not accept `role`/`aria-label` — wrap in `<div role="img">`.

## Rules
- Treat `packages/contracts` as the source of API truth.
- Do not hardcode response shapes outside typed adapters.
- Handle async states explicitly: pending, running, completed, failed.
- Keep polling and error-retry behavior deterministic and observable.
- Expose runtime profile selection (`interactive|balanced|thorough|auto`) in run UI.
- Always display effective sample size when server clamps requested values.
- Support optional multi-turn pre-run clarifications and allow explicit skip.
