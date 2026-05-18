# Council Bug Tracker

Comprehensive log of issues raised by the 6 council rounds (R1–R6), grouped by status.

**Legend**
- 🔴 CRITICAL — production-breaking, data loss, security exposure
- 🟠 HIGH — correctness, UX-breaking, security hardening
- 🟡 MEDIUM — quality, maintainability, secondary UX
- ⚪ LOW — cosmetic, dead code, micro-perf

**Last updated:** 2026-05-18 · **HEAD:** `616608c`

---

## ✅ Fixed Issues

### Round 1 (commit `2281655`) — Backend + Frontend + Contract + Journey

| ID | Sev | Area | Issue | Fix |
|---|---|---|---|---|
| R1-FE-FLOW-01 | 🔴 | Progress | Retry button stuck — polling never restarts after failed→running | `refetch()` after retry success in `ProgressPage.handleRetry` |
| R1-BE-1/2 | 🔴 | Worker | Artifact write + DB transition not atomic → sim permanently `running` | Outer except in `execute_simulation_run` now handles DB-failure-after-artifact-write |
| R1-FE-BUG-09 | 🟠 | Clarification | `useClarificationFlow` stale `turns` closure → double-submit loses prior turns | Functional `setTurns(prev => [...prev, t])` + `turns.length + 1` for `isDone` |
| R1-FE-RACE-01/02 | 🟠 | Challenge | `startChallenge` / `submitResponse` no in-flight guard → double-submit corrupts state | State-check guards (`state === 'picking'` / `state === 'challenging'`) |
| R1-D-J2-B2 | 🟠 | Clarify | `ClarificationPage` read `window.history.state?.usr` (non-public API) | Replaced with `useLocation()` |
| R1-D-J2-B3 | 🟠 | Clarify | `triggerRun` navigate missing `title` → ProgressPage shows raw sim ID | Pass `{ state: { title: policyTitle } }` to `navigate` |
| R1-BE-BUG-4 | 🟠 | Service | Dead code: double turn-limit check in `answer_clarification_question` | Inner block removed |
| R1-BE-BUG-10 | 🟠 | Service | `DatasetLoadError` (all variants) returned 409 instead of 500 for non-filter errors | Split: "insufficient personas" → 409, other → 500 `DATASET_ERROR` |
| R1-C-FINDING-4 | 🟠 | Contract | FE `envelope.ts` defined `INFERENCE_ERROR` but BE emits `MODEL_RUNTIME_ERROR` | `ApiErrorCode` union renamed |

### Round 2 (commit `dfab499`) — Security + Perf + A11y

| ID | Sev | Area | Issue | Fix |
|---|---|---|---|---|
| R2-A-2 | 🟠 | Security | Path traversal via `simulation_id` URL param → arbitrary file delete via `unlink()` | Strict regex `^sim_[A-Za-z0-9_-]{1,32}$` validates all ID path params |
| R2-A-3 | 🟠 | Security | CRLF / header injection in `Content-Disposition` from unvalidated `simulation_id` | Filename sanitised to `[A-Za-z0-9_-]{0,32}` defense-in-depth |
| R2-A-4 | 🟠 | Security | CSV formula injection — `=` / `+` / `-` / `@` / `\t` / `\r` in `rationale` / `emotion` executed in Excel | `_csv_safe()` prefixes dangerous cells with `'` |
| R2-C-1 | 🟠 | Perf | Full ~1M-row Nemotron dataset re-parsed per `/run` (twice) → ~500MB resident | `_DATASET_CACHE` keyed by `(path, mtime_ns)` in `nemotron_usa.py` |
| R2-C-5 | 🟡 | Perf | Frontend polled every 2.5s even when tab hidden | `visibilitychange` listener pauses `refetchInterval` |
| R2-C-8 | 🟡 | Perf | `EtaCountdown` interval re-created every second due to `[remaining]` dep | Empty deps + functional updater |
| R2-D-H4 | 🟠 | A11y | ClarificationPage chat container not announced to SR on new bubbles | `role="log"` + `aria-live="polite"` + `aria-atomic="false"` |
| R2-D-H5 | 🟠 | A11y | ProgressPage progress region had no `aria-live`, Progress bar missing `aria-value*` | Region with `aria-live` + full `aria-valuemin/max/now/text` set |
| R2-D-L2 | 🟡 | A11y | Typing dots animation ignored `prefers-reduced-motion` | `@media (prefers-reduced-motion: reduce) { animation: none }` |
| R2-D-M10 | 🟡 | A11y | AppHeader nav active state was color-only | `aria-current="page"` on active link |

### Round 3 (commit `6ea21c9`) — WAL + Headings + Tests

| ID | Sev | Area | Issue | Fix |
|---|---|---|---|---|
| R2-C-2 | 🟠 | Perf | N+1 SQLite progress writes — fresh connect/commit per persona | WAL journal mode + 30s busy_timeout + `synchronous=NORMAL` |
| R2-D-M1 | 🟡 | A11y | Section "titles" were `<Text fw=600>`, not headings (no SR navigation) | `<Title order={3}>` for `FormSection` + `SectionCard` |
| R2-B-Ollama | 🟠 | Coverage | Entire `_call_ollama` HTTP error branch tree untested | 7-test unit suite covering HTTP 5xx, URLError, TimeoutError, malformed JSON, generic Exception, happy path |
| R2-B-Hooks | 🟠 | Coverage | `useChallengeFlow` state machine had no tests | 8-test suite covering happy path + double-submit guards + error paths |

### Round 4 (commit `aae640a`) — A11y Kbd + More Tests

| ID | Sev | Area | Issue | Fix |
|---|---|---|---|---|
| R2-D-H1 | 🟠 | A11y | DatasetSection cards click-only (no keyboard) | `role="radio"` + `tabIndex` + Enter/Space `onKeyDown` |
| R2-D-M8 | 🟠 | A11y | ChallengeDrawer Retry/Close were `<Text component=span onClick>` — kbd-inaccessible | Replaced with real `<Button>` elements |
| R2-D-H2 | 🟡 | A11y | Sector chips lacked `aria-pressed` toggle state | Added `aria-pressed` + `aria-label` |
| R2-D-L1 | 🟡 | A11y | Decorative icons (Lightbulb, Avatar Bot/User, Database, emoji) announced as noise | `aria-hidden="true"` batch applied |
| R2-D-L3 | 🟡 | A11y | RotatingFacts auto-rotated ignoring `prefers-reduced-motion` | `matchMedia('(prefers-reduced-motion: reduce)')` guard |
| R1-FE-RACE-03 | 🟡 | Race | RotatingFacts inner `setTimeout` not cleared on unmount → state update on unmounted component | `fadeTimerRef` + `clearTimeout` in cleanup |
| R2-B-Clar | 🟢 | Coverage | `useClarificationFlow` not tested | 7-test suite covering turn-accumulation stale-closure regression + terminal conditions + skip/retry |
| R2-B-Client | 🟢 | Coverage | `apiFetch` / `apiFetchWithMeta` (transport + envelope) untested | 9-test suite covering NETWORK_ERROR, PARSE_ERROR, error envelope, Idempotency-Key, CSV branch |

### Round 7 (current session) — perf + a11y + dead code

| ID | Sev | Area | Issue | Fix |
|---|---|---|---|---|
| R2-C-3 | 🟠 | Perf | Results/Export re-parsed full artifact JSON on every poll | `_load_artifact_raw_outputs()` cache keyed by `(sim_id, mtime_ns)` in `service.py` |
| R2-C-6 | 🟠 | Perf | CSV export materialised all rows in memory; OOM risk on 100k+ runs | `export_simulation_csv` now a generator; `app.py` uses `StreamingResponse` |
| R2-D-H3 | 🟠 | A11y | `PolicyDiff` used color alone for added/removed (WCAG 1.4.1) | `<del>`/`<ins>` semantic elements; underline added to insertions as non-color cue |
| R2-D-H6 | 🟠 | A11y | RunQualityBanner dismiss button ~22×22px (below WCAG 2.5.5 AA 24×24) | `minWidth/minHeight: 28`, adjusted padding |
| R2-D-H8 | 🟠 | A11y | PolicySection upload trigger had no `aria-controls` linking to file input | Added `id="policy-file-upload"` on input; `aria-controls` on Button |
| R1-FE-DEAD | ⚪ | Cleanup | `downloadSimulationCsv` + `getExportUrl` exported but never imported | Deleted from `export.ts` + `api/index.ts` |
| R1-FE-DEAD-02 | ⚪ | Cleanup | `apiFetch` CSV branch is dead code (export.ts uses raw fetch) | Removed branch + 2 corresponding tests from `client.test.ts` |

### Round 5/6 partial (commit `90afee5`) — kept only typo + logo, redesign reverted

| ID | Sev | Area | Issue | Fix |
|---|---|---|---|---|
| TYPO-1 | ⚪ | Content | 5× misspelling "InfiliPol" → "InfiniPol" across LandingPage, MethodologyPage, PRODUCT_HONEST_PLAN.md | Direct text edits |
| LOGO-1 | 🟡 | Brand | LandingHeader used `BarChart2` lucide icon — didn't match the actual InfiniPol mark | `<img src="/logos/infinipol-logo.svg">` |

### Existing UI fixes (commit `cdd9b04`, pre-council)

| ID | Sev | Area | Issue | Fix |
|---|---|---|---|---|
| UI-1 | 🟡 | UI | "Thorough" runtime-profile label text invisible on green background | `&[data-active]: { color: '#fff' }` on `SegmentedControl.label` |
| UI-2 | 🟡 | UX | `/clarify` had no loading bubble while AI was responding | `ChatBubble isLoading` now shows triple-dot bouncing typing indicator |

---

## ⏳ Open Issues (not yet fixed)

### 🔴 CRITICAL

| ID | Area | Issue | Why deferred |
|---|---|---|---|
| R2-A-1 | Security | **No authentication on any endpoint** — every `POST`/`DELETE` is unscoped, anyone reachable can create/run/delete any simulation | Needs architecture decision: session vs JWT vs API key. Dev-only acceptable for now; flag before exposing beyond localhost |

### 🟠 HIGH

| ID | Area | Issue | Why deferred |
|---|---|---|---|
| R2-A-5 | Security | **IDOR via 32-bit guessable IDs** + unauthenticated `GET /simulations` list | Coupled to auth decision; mitigated once auth lands |
| R2-A-Prompt | Security | Prompt injection by design — `policy_text` / `user_response` flow verbatim into Ollama prompt | Cannot fully mitigate at LLM layer; downstream CSV-safe + output schema validation already in place |
| R2-A-Thread | Security | Unbounded daemon-thread fan-out per `/run` → trivial DoS without rate limit | Needs worker pool or queue; bigger refactor |
| R2-B-FE | Coverage | Most feature flows still have no tests (Dashboard, Comparison, CreatePage form, ResultsPage charts) | Each is its own suite of effort |
| R2-B-E2E | Coverage | No end-to-end integration test (create → clarify → run → results → export → challenge) | Needs Playwright/Cypress harness setup |
| R2-D-H3 | A11y | `PolicyDiff` may rely on color alone for added/removed (not verified) | ✅ Fixed R7 |
| R2-D-H6 | A11y | RunQualityBanner dismiss button ~22×22px (below WCAG 2.5.5 AA 24×24) | ✅ Fixed R7 |
| R2-D-H7 | A11y | Challenge FAB on ResultsPage lacks `aria-haspopup="dialog"` + `aria-expanded`; FocusPicker tabIndex doesn't follow roving pattern | Multi-step refactor |
| R2-D-H8 | A11y | PolicySection upload trigger has no `aria-controls` linking to file input | ✅ Fixed R7 |
| R1-BE-6 | Race | Worker thread spawned before SQLite commit visible (no WAL when first written) | Partially mitigated by R3 WAL mode; full fix needs pass-by-value of sim row |
| R1-BE-5 | Data | Clarification question text + rationale not persisted — irretrievable if client loses response | Schema change needed |
| R1-BE-3 | Code smell | `body` variable shadowed in HTTPError handler (both `simulation_runner.py:225` + `clarification_generator.py:108`) | Cosmetic; not crash |

### 🟡 MEDIUM

| ID | Area | Issue | Status |
|---|---|---|---|
| R2-A-CORS | Security | CORS `allow_credentials=True` + `allow_methods=["*"]` + `allow_headers=["*"]` overly permissive | Default origins localhost-only is OK for dev; tighten for prod |
| R2-A-Body | DOS | No request body size limit on FastAPI endpoints — unbounded JSON body | Add middleware limit |
| R2-A-DataPath | Info disclosure | `DatasetLoadError` messages include filesystem paths, surfaced to clients via API | Strip path in user-facing messages |
| R2-B-Migration | Coverage | `storage.ensure_schema` ALTER TABLE migration paths untested | Add legacy-DB fixture tests |
| R2-B-MockHeavy | Coverage | Worker integration tests monkeypatch `sample_personas` + `generate_policy_response_with_ollama` — real HTTP layer dark | Partially addressed by `test_call_ollama_errors.py`; full E2E still missing |
| R2-B-Unicode | Coverage | No tests for non-ASCII / long-string / emoji in `policy_text`, `user_response`, CSV export | Add boundary tests |
| R2-C-Dashboard | Perf | Dashboard list capped at 50 — server-side pagination ignored by client | Wire client to use envelope.meta.total |
| R2-D-M2 | A11y | Disabled "Upload" / "Back to Simulations" subtle buttons may fall below 4.5:1 contrast | Contrast audit needed |
| R2-D-M4 | A11y | Tooltip-only descriptions on runtime profile not in a11y tree for kbd-only / touch | Add `aria-describedby` linking |
| R2-D-M5 | A11y | Sample slider / Age Range slider lack `aria-label` binding | Add labels |
| R2-D-M6 | A11y | "Clear all" badge button + chip dismiss × are ~18px tall | Touch target fix |
| R2-D-M7 | A11y | Mantine notifications role unclear for SR — verify Notifications provider config | Configure provider |
| R2-D-M9 | A11y | NumberInput next to slider has no label/aria | Add hidden label |
| R1-FE-BUG-03 | UX | `EtaCountdown` race — `setRemaining` updates can race with parent polling | Now `[]` deps; minor cosmetic risk only |
| R1-FE-BUG-06 | Bug | `useRunTelemetry` `staleTime: Infinity` may serve stale telemetry from a prior failed run if retried | Needs cache invalidation on retry |
| R1-FE-BUG-08 | UX | `challengeErrorMessage` drops `code` / `httpStatus` — retryable vs terminal errors indistinguishable | Refactor to keep `ApiError` instance |
| R1-FE-FLOW-05 | UX | No "back to picking" escape from challenge `error` state after followup fails | Add reset button |
| R1-FE-FLOW-06 | UX | `/simulations/:id/clarify` accessible for completed sims → 409 LIFECYCLE_CONFLICT loop | Add lifecycle redirect |
| R2-D-UX | UX | RunQualityBanner dismissed state not persisted — reappears on reload | `localStorage` keyed by sim id |
| R1-FE-DEAD | Cleanup | `downloadSimulationCsv` + `getExportUrl` exported but never imported | ✅ Fixed R7 |
| LANDING-1 | UI | Landing page sections still look "AI-templated" per user feedback (R5/R6 attempt reverted) | Needs different design direction |

### ⚪ LOW

| ID | Area | Issue |
|---|---|---|
| R1-BE-7 | Logic | Exception-handler `success_count` fallback uses `len(outputs)` same as `attempted_count` — false 100% success rate in failure path |
| R1-BE-8 | Race | `delete_simulation` unlinks artifact before checking DB existence |
| R1-BE-9 | Naming | `mean_approval` field in `demographic_disparity` challenge evidence is actually minimum-state approval |
| R1-BE-11 | Compat | `socket.timeout` not caught separately on Python < 3.11 |
| R1-BE-12 | Race | DB write failure on clarification state update allows > MAX_CLARIFICATION_TURNS rounds |
| R1-BE-13 | Defense | `storage.update_clarification_state` silent no-op on missing simulation_id |
| R1-BE-14 | UX | `load_dataset` exception message drops root cause from user-facing API error |
| R1-BE-15 | UX | Idempotency-key logic falls to wrong error message when persisted key is None |
| R1-C-F5 | Contract | `raw_responses_url` typed as plain `string` but actually a relative path |
| R1-C-F6 | Contract | TS types mark `allow_sample_clamp` / `use_refined_prompt` non-optional; spec says optional |
| R1-C-F7 | Contract | Spec uses `{id}` for simulation paths but `app.py` uses `{simulation_id}` |
| R1-C-F10/11 | Contract | Python `EmotionProfile` / `ApprovalDistribution` typed as `dict[str, Any]`, spec says `number` / `integer` |
| R1-C-F12 | Contract | `sort` param spec is free-form string but BE only accepts 2 values |
| R1-C-F13 | Arch | `export.ts` duplicates `API_BASE` construction; bypasses shared client |
| R2-D-L4 | A11y | Verify Mantine `Transition` slide-up respects reduced-motion globally |
| R2-D-L5 | A11y | Title back-buttons use `size="xs"` (≈24px) — below 44×44 touch target |
| R2-D-L6 | A11y | Emoji informational badges read verbatim by SR — wrap `aria-hidden` when redundant |
| R2-D-L7 | A11y | Form errors not associated to inputs via `aria-describedby` / `aria-invalid` |
| R2-D-L8 | A11y | ChallengeDisplay char counter not announced — `aria-live` for warn state |
| R1-FE-DEAD-02 | Cleanup | `apiFetch` CSV branch is dead code (export.ts uses raw fetch) | ✅ Fixed R7 |
| R1-FE-DEAD-03 | Cleanup | `ThemeSwitcher` null-branch in production is unusual pattern |

---

## Round-by-round commit map

| Round | Commit | What it shipped |
|---|---|---|
| R1 | `2281655` | 8 critical/high fixes (retry stuck, stale closure, race, atomicity, dataset errors) |
| R2 | `dfab499` | Security regex + CSV-safe + dataset cache + chat aria-live + progress aria-live + reduced-motion + 6 new BE tests |
| R3 | `6ea21c9` | SQLite WAL + semantic headings + `_call_ollama` tests + `useChallengeFlow` tests |
| R4 | `aae640a` | Dataset card kbd nav + Challenge drawer real buttons + `aria-pressed` + decorative `aria-hidden` + RotatingFacts reduced-motion + `useClarificationFlow` tests + `client.ts` tests |
| R5/R6 (reverted) | `cfa2289` → `90afee5` | Landing page redesign **reverted** by user request; **kept**: typo fix (InfiliPol→InfiniPol) + LandingHeader logo |

---

## Gates (current HEAD `90afee5`)

- **Backend pytest**: 132 / 132 ✅ (+16 new since baseline)
- **Frontend vitest**: 41 / 41 ✅ (+22 new since baseline; 2 dead-code tests removed)
- **TypeScript build**: 0 errors ✅

---

## Triage priority for next round

Most impactful open work, ranked:

1. **R2-A-1 Auth** — single biggest production blocker; everything else stacks on this decision
2. **R2-B-E2E** — without an end-to-end test, regressions in cross-feature flows are invisible
3. **R2-C-3 / R2-C-6** — artifact streaming + caching unlocks 10k+ persona runs
4. **R1-BE-5** — persist clarification question text (currently lost on response loss)
5. **R2-D-H3 / H6 / H7** — remaining HIGH a11y gaps
6. **LANDING-1** — landing page UI direction; user wants non-AI but not too plain; needs new design exploration with user feedback loop
