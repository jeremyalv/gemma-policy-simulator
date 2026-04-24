# InfiniPol — Frontend Overview & Backend Requirements

> Last updated: April 2026  
> Stack: React 18 · Vite 6 · TypeScript 5 · Mantine 7 · TanStack Query v5 · Recharts · Zustand · MSW

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Pages & Features](#2-pages--features)
3. [UI Components & Charts](#3-ui-components--charts)
4. [State Management & Data Flow](#4-state-management--data-flow)
5. [Backend API Requirements](#5-backend-api-requirements)
6. [API Envelope Contract](#6-api-envelope-contract)
7. [Error Codes](#7-error-codes)
8. [Special Rules](#8-special-rules)
9. [Static Files Required](#9-static-files-required)
10. [Local Storage Keys](#10-local-storage-keys)
11. [Environment Variables](#11-environment-variables)
12. [Mock Mode (MSW)](#12-mock-mode-msw)
13. [Roadmap & Planned Datasets](#13-roadmap--planned-datasets)

---

## 1. Project Structure

```
apps/client/src/
├── api/
│   ├── client.ts                  # fetch wrapper, envelope unwrap
│   ├── index.ts                   # public barrel export
│   ├── types.gen.ts               # auto-generated from OpenAPI spec
│   └── endpoints/
│       ├── simulations.ts
│       ├── clarifications.ts
│       ├── challenge.ts
│       ├── datasets.ts
│       └── export.ts
├── features/
│   ├── landing/                   # LandingPage
│   ├── dashboard/                 # DashboardPage (simulation list)
│   ├── create/                    # CreatePage (new simulation form)
│   │   └── sections/              # PolicySection, PolicySectorSection, SampleSection, FiltersSection
│   ├── clarification/             # ClarificationPage (AI chatbot)
│   ├── progress/                  # ProgressPage (polling + status)
│   ├── results/                   # ResultsPage + all chart components
│   │   └── charts/
│   ├── comparison/                # ComparisonPage (side-by-side)
│   └── challenge/                 # ChallengeDrawer (AI adversarial)
├── components/
│   └── layout/Layout.tsx
├── lib/
│   ├── envelope.ts                # ApiError, unwrap()
│   ├── format.ts                  # formatNumber, formatPct, approvalColor, emotionColor
│   └── idempotency.ts
└── mocks/
    └── handlers.ts                # MSW handlers (dev only)
```

---

## 2. Pages & Features

### 2.1 Landing Page — `/`

**File:** `src/features/landing/LandingPage.tsx`

**Sections (top → bottom):**
1. **HeroSection** — headline "Limitless Policy Testing," + subtitle with anti-viral hook ("Test before you go viral. Know before you roll out.")
2. **MarqueeTicker** — scrolling policy domain tags
3. **StatsBar** — static stats: personas, policies tested, states covered
4. **AntiViralHookBanner** — amber warning chip: "What if your policy goes viral for the wrong reasons?"
5. **PersonaStream** — animated persona cards streaming across screen
6. **TryItSection** — mini interactive demo
7. **FeaturesSection** — 6-feature grid
8. **UseCasesSection** — 3 use case cards
9. **GlobalVisionSection** — 6-cell grid: US (Live), Indonesia (Coming Q2 2026), EU/India/Brazil/Australia (Planned)
10. **RoadmapSection** — 4-item vertical timeline:
    - Indonesia Dataset — Q2 2026
    - EU Dataset (Germany/France/Netherlands) — Q3 2026
    - Multi-language Policy Input — Q4 2026
    - Global Expansion (20+ countries) — 2027
11. **HowItWorksSection** — 3-step explanation
12. **CtaSection** — final call-to-action

**Backend required:** None (fully static / illustrative data)

---

### 2.2 Dashboard — `/simulations`

**File:** `src/features/dashboard/DashboardPage.tsx`

**Features:**
- List of all past simulations with status badges (pending / running / completed / failed)
- Sort/filter by status
- Pagination (page, limit)
- Delete simulation with confirmation
- Click row → navigate to `/simulations/:id` (progress) or `/simulations/:id/results` (if completed)
- "New Simulation" button → `/simulations/new`

**Backend required:** `GET /simulations`, `DELETE /simulations/:id`

---

### 2.3 Create Simulation — `/simulations/new`

**File:** `src/features/create/CreatePage.tsx`

**Sections:**

| # | Section | File | Notes |
|---|---------|------|-------|
| 1 | **Policy** | `PolicySection.tsx` | Textarea for policy text + "Upload .txt / .md" file button |
| 2 | **Policy Sector** | `PolicySectorSection.tsx` | UI-only, 9 domains × 50+ options, multi-select chips. Field: `sector[]` |
| 3 | **Sample Size** | `SampleSection.tsx` | Slider (50–2000) + optional "Why this sample size?" textarea. Field: `sample_justification` |
| 4 | **Demographic Filters** | `FiltersSection.tsx` | States multi-select, age range, education, occupation |

**Static attribution card** replaces dataset picker — fixed to `nemotron_usa` (NVIDIA Nemotron, 1M personas, US census-aligned).

**Form schema** (`src/features/create/schema.ts`):
```ts
{
  title: string              // sent to API
  policy_text: string        // sent to API
  dataset: 'nemotron_usa'    // sent to API (always this value)
  sample_size: number        // sent to API
  filters: FilterSet         // sent to API
  sector: string[]           // UI-only, NOT sent to API
  sample_justification: string  // UI-only, NOT sent to API
}
```

**Draft persistence:** `localStorage['infinipol:create-draft']` — auto-saved, restored on revisit.

**Flow after submit:**
1. `POST /simulations` → get `simulation.id`
2. `POST /simulations/:id/clarifications/generate` → redirect to `/simulations/:id/clarify`

**Backend required:** `POST /simulations`

---

### 2.4 Clarification Chatbot — `/simulations/:id/clarify`

**File:** `src/features/clarification/ClarificationPage.tsx`

**Features:**
- AI chatbot UI labelled "Quick Policy Chat"
- Progress indicator: "Question X of Y" (max 3 turns)
- Each turn:
  1. AI generates a clarifying question about the policy
  2. User types a free-text response
  3. Response is submitted → AI optionally generates next question or marks complete
- Warm, conversational tone with emojis (👋, 🎯, 🚀)
- "No right or wrong answers here!" hint in textarea
- On completion → "✓ All done — starting simulation" → triggers `POST /simulations/:id/run` → redirects to `/simulations/:id`

**Clarification state machine:**
```
none → open → in_progress → completed
```

**Backend required:**
- `POST /simulations/:id/clarifications/generate`
- `POST /clarifications/:id/answer`
- `GET /simulations/:id/clarifications`

---

### 2.5 Progress / Status — `/simulations/:id`

**File:** `src/features/progress/ProgressPage.tsx`

**Features:**
- Polls `GET /simulations/:id/status` every 2–3 seconds
- Progress bar with `progress_pct`
- Status card: running / completed / failed
- Agent count: `agents_completed / agents_total`
- Estimated seconds remaining
- **RotatingFacts** component: 12 policy trivia facts, rotate every 8 seconds with 400ms fade transition (shown only while running)
- On `status === 'completed'` → "View Results" button → `/simulations/:id/results`
- On `status === 'failed'` → error message + "Back to Simulations" button

**Backend required:** `GET /simulations/:id/status`

---

### 2.6 Results — `/simulations/:id/results`

**File:** `src/features/results/ResultsPage.tsx`

**Three tabs:**

#### Overview Tab
- **ExecutiveSummary** (top)
  - Simulation title
  - "In a Nutshell" — auto-generated prose narrative (score + emotion + behavioral %)
  - Strengths / Watch Out For — two-column highlights panel derived from distribution data
  - Mean Approval gauge card (ApprovalGauge, 1–5 scale)
  - Dominant Emotion card (colour-coded dot + label)
  - Behavioral Change % card
  - Simulation Metadata card (sample size, runtime profile, approval distribution quick-look bars)
- **ApprovalDistribution** — bar chart of approval 1–5 counts
- **EmotionRadar** — radar/spider chart of emotion percentages

#### Demographics Tab
- **DemographicTabs** — 4 inner tabs: Age Group · Marital Status · By State · Occupation
  - Each tab has **SegmentInsights** callout (highest/lowest segment with Δ gap indicator)
  - Horizontal bar charts (mean approval 1–5 scale, sorted descending)
- **ApprovalHeatmap** — CSS grid: age groups × approval levels (1–5)
  - Colour is direction-aware: level 1/2 = red, level 3 = grey, level 4/5 = green
  - Cell values estimated via Gaussian distribution (σ=1.1) around mean_approval
  - Shows mean column (colour-coded green/amber/red)
- **USChoropleth** — US state map coloured by mean approval
- **FlowSankey** — Age Group → Emotion → Approval Level flow diagram

#### Voices Tab
- **VoicesTab** — paginated grid of 9 QuoteCards per page
  - **QuoteWordCloud** — word cloud from all rationale text (top 36 words, 5-tier colours, hover scale)
  - Filter bar (by approval, by emotion)
  - **QuoteCard** (each):
    - Left accent stripe coloured by approval level
    - Rationale in Source Serif 4 italic
    - Avatar chip with name initial
    - Persona details: Name, Age, Occupation, City, State
    - Approval badge: "X / 5" + label (Strongly Oppose → Strongly Support)
    - Emotion badge
    - "Cite this persona" action → modal with copy button (citation format)

**Floating FAB:** "Challenge Results" (bottom-right) → opens ChallengeDrawer

**Header actions:**
- "Compare" button → `/compare?add=:id`
- **ExportActions** — "Export CSV" (triggers `GET /simulations/:id/export`)

**Backend required:** `GET /simulations/:id/results`, `GET /simulations/:id/export`

---

### 2.7 Challenge Drawer — (overlay on Results page)

**File:** `src/features/challenge/ChallengeDrawer.tsx`

**Features:**
- Right-side drawer overlay
- AI generates a challenge question targeting the weakest demographic segment
- Shows: challenge text + evidence block (segment, mean_approval, top_concern)
- User types a counter-argument / policy refinement response
- AI responds with follow-up question + suggested policy refinement text
- Conversation can continue (chained challenges via `next_challenge_id`)

**Backend required:**
- `POST /simulations/:id/challenge`
- `POST /challenges/:id/followup`

---

### 2.8 Comparison — `/compare`

**File:** `src/features/comparison/ComparisonPage.tsx`

**Features:**
- Side-by-side comparison of two simulations (Slot A and Slot B)
- URL param `?add=:id` pre-fills Slot A
- Each slot loads results independently
- Comparison metrics: mean approval delta, behavioral change delta, emotion profile overlay, demographic breakdown comparison
- **PolicyPrecedentSearch** — search bar querying `public/policy-precedents.json` for historical policy examples
- **ReferenceAnalysisPanel** — when a precedent is selected:
  - Historical context prose
  - "What Worked" (green panel, bulleted)
  - "Challenges Encountered" (red panel, bulleted)
  - Optional "vs. Your Simulation" comparison block (if Slot A is loaded)

**Backend required:** `GET /simulations/:id/results` (called twice, for each slot)

---

### 2.9 Guide — `/guide`

Static documentation page. No backend required.

---

### 2.10 About — `/about`

Static about page. No backend required.

---

## 3. UI Components & Charts

### Charts (all in `src/features/results/charts/`)

| Component | Type | Data source | Notes |
|-----------|------|-------------|-------|
| `ApprovalGauge` | Semicircle gauge | `summary.mean_approval` (1–5) | Never displayed as % |
| `ApprovalDistribution` | Vertical bar chart | `summary.approval_distribution` | Keys "1"–"5", values = counts |
| `EmotionRadar` | Radar / spider chart | `emotion_profile` | Keys = emotion names, values = % |
| `DemographicTabs` | Horizontal bar charts | `demographic_breakdown` | 4 tabs; sorted by mean_approval desc |
| `ApprovalHeatmap` | CSS grid heatmap | `demographic_breakdown.by_age_group` | Gaussian-estimated cell values |
| `USChoropleth` | SVG US map | `demographic_breakdown.by_state` | Flat `{ stateCode: number }` |
| `FlowSankey` | Sankey diagram | Derived via `buildSankeyData()` | Aggregated from full results |
| `QuoteCard` | Info card | `representative_quotes[]` | Left accent stripe by approval colour |

### Form Sections (all in `src/features/create/sections/`)

| Component | Purpose |
|-----------|---------|
| `PolicySection` | Textarea + file upload (.txt/.md) |
| `PolicySectorSection` | Domain/topic multi-select chips (UI-only) |
| `SampleSection` | Slider + optional justification textarea (UI-only) |
| `FiltersSection` | State, age, education, occupation filters |

---

## 4. State Management & Data Flow

- **TanStack Query v5** — all server state (simulations list, status polling, results)
- **Zustand** — client-side UI state where needed
- **React Hook Form + Zod** — Create simulation form with schema validation
- **localStorage** — draft form persistence + simulation history
- **React Router v6** — all navigation, lazy-loaded pages with Suspense fallbacks

---

## 5. Backend API Requirements

All endpoints are prefixed: `POST/GET/DELETE /api/v1/...`

---

### 5.1 `POST /simulations` → 201

**Purpose:** Create a simulation draft. Does NOT start inference.

**Request headers:**
```
Content-Type: application/json
Idempotency-Key: <uuid>   ← required, client-generated
```

**Request body:**
```json
{
  "title": "Carbon Tax $50/tonne",
  "policy_text": "A federal carbon tax of $50 per tonne...",
  "dataset": "nemotron_usa",
  "sample_size": 500,
  "filters": {
    "states": ["CA", "TX"],
    "age_range": [18, 65],
    "education_levels": [],
    "occupation_groups": []
  }
}
```

> **Note:** `sector` and `sample_justification` fields are UI-only and are **never** sent to the backend.

**Response (201):**
```json
{
  "data": {
    "id": "sim_abc123",
    "title": "Carbon Tax $50/tonne",
    "policy_text": "...",
    "status": "pending",
    "dataset": "nemotron_usa",
    "sample_size": 500,
    "filters": { ... },
    "created_at": "2026-04-24T10:00:00Z"
  },
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

---

### 5.2 `GET /simulations` → 200

**Purpose:** Paginated list of all simulations.

**Query params:**
```
page=1&limit=20&status=completed&sort=created_at_desc
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "sim_abc123",
      "title": "Carbon Tax $50/tonne",
      "status": "completed",
      "sample_size": 500,
      "mean_approval": 3.2,
      "created_at": "2026-04-24T10:00:00Z",
      "completed_at": "2026-04-24T10:02:15Z"
    }
  ],
  "error": null,
  "meta": {
    "request_id": "req_xyz",
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

> **Note:** `meta` must include `total`, `page`, `limit` for pagination. `mean_approval` may be `null` if not yet completed.

---

### 5.3 `DELETE /simulations/:id` → 200

**Response (200):**
```json
{
  "data": { "id": "sim_abc123", "deleted": true },
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

---

### 5.4 `POST /simulations/:id/run` → 202

**Purpose:** Trigger async inference. Non-blocking — returns immediately.

**Request headers:**
```
Idempotency-Key: <uuid>   ← required
```

**Request body (optional):**
```json
{
  "profile": "balanced",
  "max_duration_seconds": 300,
  "allow_sample_clamp": true,
  "use_refined_prompt": true
}
```

> `use_refined_prompt: true` tells the backend to use the clarification-refined policy text if available.

**Response (202):**
```json
{
  "data": {
    "id": "sim_abc123",
    "status": "running",
    "started_at": "2026-04-24T10:00:00Z",
    "estimated_seconds": 75,
    "runtime_profile": "balanced",
    "effective_sample_size": 480
  },
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

> `effective_sample_size` may differ from requested `sample_size` due to filter constraints.

**Runtime profiles:**

| Profile | Description |
|---------|-------------|
| `fast` | Smaller sample, quick turnaround (< 30s) |
| `balanced` | Default — good accuracy/speed tradeoff |
| `deep` | Full sample, thorough reasoning |

---

### 5.5 `GET /simulations/:id/status` → 200

**Purpose:** Progress polling. Frontend polls every 2–3 seconds while `status === "running"`.

**Response (200):**
```json
{
  "data": {
    "id": "sim_abc123",
    "status": "running",
    "agents_total": 500,
    "agents_completed": 312,
    "progress_pct": 62.4,
    "estimated_seconds_remaining": 28,
    "runtime_profile": "balanced",
    "effective_sample_size": 480
  },
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

**`status` enum values:** `pending` | `running` | `completed` | `failed`

> When `status === "failed"`, include `"error_message": "..."` in the data object.

---

### 5.6 `GET /simulations/:id/results` → 200

**Purpose:** Full results data. Only valid when `status === "completed"`.

**Response (200):**
```json
{
  "data": {
    "id": "sim_abc123",
    "summary": {
      "mean_approval": 3.2,
      "approval_distribution": {
        "1": 80,
        "2": 95,
        "3": 150,
        "4": 110,
        "5": 65
      },
      "dominant_emotion": "concern",
      "behavioral_change_pct": 38.6
    },
    "run_config": {
      "runtime_profile": "balanced",
      "effective_sample_size": 480
    },
    "demographic_breakdown": {
      "by_age_group": {
        "18-34": { "mean_approval": 3.6, "count": 130 },
        "35-54": { "mean_approval": 3.1, "count": 220 },
        "55+":   { "mean_approval": 2.7, "count": 130 }
      },
      "by_marital_status": {
        "never_married":       { "mean_approval": 3.4, "count": 190 },
        "married":             { "mean_approval": 3.0, "count": 210 },
        "divorced_or_widowed": { "mean_approval": 3.1, "count": 80  },
        "separated":           { "mean_approval": 2.9, "count": 30  },
        "domestic_partnership":{ "mean_approval": 3.3, "count": 30  }
      },
      "by_state": {
        "CA": 3.5,
        "TX": 2.8,
        "FL": 3.0,
        "NY": 3.7
      },
      "by_occupation_group": {
        "Healthcare": { "mean_approval": 3.4, "count": 95  },
        "Education":  { "mean_approval": 3.6, "count": 72  },
        "Technology": { "mean_approval": 3.1, "count": 110 },
        "Retail":     { "mean_approval": 2.9, "count": 88  },
        "Finance":    { "mean_approval": 2.6, "count": 60  }
      }
    },
    "emotion_profile": {
      "anger":   18.2,
      "concern": 34.1,
      "neutral": 22.0,
      "hope":    19.4,
      "joy":      6.3
    },
    "representative_quotes": [
      {
        "persona_id": "p_00421",
        "name": "Maria Santos",
        "age": 34,
        "occupation": "Nurse",
        "city": "Houston",
        "state": "TX",
        "approval": 2,
        "emotion": "concern",
        "rationale": "As someone balancing tight monthly expenses, I worry this policy raises household costs before local relief is clear."
      }
    ],
    "raw_responses_url": "/api/v1/simulations/sim_abc123/export"
  },
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

**Field notes:**

| Field | Type | Notes |
|-------|------|-------|
| `summary.mean_approval` | `number` (1.0–5.0) | Always 1 decimal precision |
| `summary.approval_distribution` | `Record<"1"\|"2"\|"3"\|"4"\|"5", number>` | Integer counts, all 5 keys must be present |
| `summary.dominant_emotion` | `string` | One of: `anger`, `concern`, `neutral`, `hope`, `joy`, `trust`, `fear` |
| `summary.behavioral_change_pct` | `number` (0–100) | Percentage as float, e.g. `38.6` |
| `demographic_breakdown.by_state` | `Record<string, number>` | Flat: state code → mean_approval (no `count` field) |
| `demographic_breakdown.by_age_group` | `Record<string, {mean_approval, count}>` | Nested object with count |
| `emotion_profile` | `Record<string, number>` | Values are percentages (sum ≈ 100) |
| `representative_quotes[].approval` | `integer` (1–5) | Never a float |
| `representative_quotes[].rationale` | `string` | Free-text; used for word cloud generation |

---

### 5.7 `POST /simulations/:id/clarifications/generate` → 200

**Purpose:** Generate the next AI clarifying question for the policy.

**Request body:**
```json
{
  "focus": "targeting_and_eligibility"
}
```

**Response (200):**
```json
{
  "data": {
    "clarification_id": "cl_xyz789",
    "simulation_id": "sim_abc123",
    "question_text": "Who specifically benefits from this policy, and how is eligibility determined?",
    "rationale": "Targeting rules materially affect acceptance across demographic segments.",
    "status": "open",
    "turn_index": 1
  },
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

---

### 5.8 `POST /clarifications/:id/answer` → 200

**Purpose:** Submit user's answer to a clarification question.

**Request body:**
```json
{
  "simulation_id": "sim_abc123",
  "user_response": "The policy targets households below 150% of the federal poverty line..."
}
```

**Response (200):**
```json
{
  "data": {
    "simulation_id": "sim_abc123",
    "clarification_status": "in_progress",
    "refined_policy_text": "A federal carbon tax of $50 per tonne of CO2, with monthly rebates for households below 150% of poverty line...",
    "next_clarification_id": "cl_abc456",
    "next_question_text": "Should the rebate amounts vary by regional energy costs?"
  },
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

> When all turns are complete, set `clarification_status: "completed"` and omit `next_clarification_id` / `next_question_text`.

**`clarification_status` enum:** `none` | `open` | `in_progress` | `completed`

---

### 5.9 `GET /simulations/:id/clarifications` → 200

**Purpose:** Get current clarification state (used to resume mid-flow on page refresh).

**Response (200):**
```json
{
  "data": {
    "simulation_id": "sim_abc123",
    "clarification_status": "none",
    "has_open_question": false,
    "latest_refined_policy_text": ""
  },
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

---

### 5.10 `POST /simulations/:id/challenge` → 200

**Purpose:** Generate an adversarial challenge targeting the simulation's weakest demographic.

**Request body:**
```json
{
  "focus": "weakest_segment"
}
```

**Response (200):**
```json
{
  "data": {
    "challenge_id": "ch_def012",
    "challenge_text": "Voters aged 55+ show approval of only 2.7/5 — the lowest of any age group. Their top concern is increased living costs. How does this policy protect fixed-income households?",
    "evidence": {
      "segment": "Age 55+",
      "mean_approval": 2.7,
      "top_concern": "Increased living costs without adequate support mechanisms"
    }
  },
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

---

### 5.11 `POST /challenges/:id/followup` → 200

**Purpose:** Submit a counter-argument; AI responds with follow-up + suggested policy refinement.

**Request body:**
```json
{
  "simulation_id": "sim_abc123",
  "user_response": "We plan to include a fixed-income senior protection clause..."
}
```

**Response (200):**
```json
{
  "data": {
    "followup_text": "That is a meaningful addition. Would a tiered rebate structure better address income disparities across all vulnerable groups?",
    "suggested_policy_refinement": "A federal carbon tax of $50/tonne with tiered monthly rebates: households below 150% poverty line receive full rebate...",
    "next_challenge_id": "ch_ghi345"
  },
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

---

### 5.12 `GET /datasets` → 200

**Purpose:** List available persona datasets.

**Response (200):**
```json
{
  "data": [
    {
      "id": "nemotron_usa",
      "name": "NVIDIA Nemotron Personas USA",
      "description": "1M synthetic personas, census-aligned across 50 US states + territories",
      "size": 1000000,
      "attributes": ["age", "sex", "marital_status", "education_level", "occupation", "state", "city", "zipcode", "cultural_background"],
      "license": "CC BY 4.0"
    },
    {
      "id": "infinipol_indo_v1",
      "name": "InfiniPol Indonesia V1",
      "description": "Handmade synthetic dataset for Indonesia — 34 provinces",
      "status": "coming_v2"
    }
  ],
  "error": null,
  "meta": { "request_id": "req_xyz" }
}
```

---

### 5.13 `GET /simulations/:id/export` → 200 (CSV)

**⚠️ IMPORTANT:** This is the **only** endpoint that does **not** use the JSON envelope.

**Response:** `text/csv` — raw CSV file download.

```
Content-Type: text/csv
Content-Disposition: attachment; filename="infinipol-sim_abc123-results.csv"
```

**CSV columns:**
```
persona_id,name,age,occupation,city,state,approval,emotion,rationale,behavioral_change
```

The frontend triggers this as a browser download using `<a>` click — never calls `.json()` on it.

---

## 6. API Envelope Contract

All JSON endpoints (except CSV export) **must** return this exact shape:

```json
{
  "data": <T>,
  "error": null | { "code": "ERROR_CODE", "message": "Human-readable message" },
  "meta": {
    "request_id": "req_<uuid>"
  }
}
```

**Success:** `data` = payload, `error` = `null`  
**Failure:** `data` = `null`, `error` = `{ code, message }`  

HTTP status codes must match:
- `200` — success
- `201` — created
- `202` — accepted (async job started)
- `400` — validation error → `error.code = "VALIDATION_ERROR"`
- `404` — not found → `error.code = "NOT_FOUND"`
- `409` — conflict (duplicate idempotency) → `error.code = "CONFLICT"`
- `422` — unprocessable → `error.code = "UNPROCESSABLE"`
- `500` — server error → `error.code = "INTERNAL_ERROR"`

---

## 7. Error Codes

The frontend `ApiError` class maps these codes to user-facing messages:

| Code | Meaning |
|------|---------|
| `NETWORK_ERROR` | Fetch failed entirely (no response) |
| `PARSE_ERROR` | Response was not valid JSON |
| `NOT_FOUND` | Simulation/resource doesn't exist |
| `VALIDATION_ERROR` | Request body failed validation |
| `CONFLICT` | Idempotency key already used |
| `INTERNAL_ERROR` | Backend threw an unhandled exception |
| `SIMULATION_NOT_COMPLETE` | Results requested before simulation finished |
| `SIMULATION_FAILED` | Simulation run terminated with error |

---

## 8. Special Rules

### Idempotency
- `POST /simulations` and `POST /simulations/:id/run` **must** respect the `Idempotency-Key` header
- If the same key is submitted twice, return the same response from the first request (do not create duplicates)
- Key format: `UUID v4`

### Approval Display
- `mean_approval` and per-segment approval values are **always 1–5 scale** (not percentages)
- The frontend enforces this contract everywhere — never send approval as a 0–100 value
- `approval` on individual quotes is **integer** 1–5

### Behavioral Change
- `behavioral_change_pct` is a **percentage float** (e.g. `38.6` means 38.6%)
- The frontend formats it with `formatPct()` which appends `%`

### Demographic Breakdown — State vs Others
- `by_state` is a **flat** `{ stateCode: number }` map where the value is `mean_approval`
- All other breakdown categories (`by_age_group`, `by_marital_status`, `by_occupation_group`) are **nested** `{ segment: { mean_approval, count } }`
- This asymmetry is intentional — the frontend handles it explicitly

### Emotion Names
Consistent emotion keys used across `dominant_emotion`, `emotion_profile`, and `representative_quotes[].emotion`:
```
anger | concern | neutral | hope | joy | trust | fear
```

### Clarifications — Max Turns
- Max 3 turns of clarification
- After turn 3, `clarification_status` must be `"completed"` regardless of whether the user has fully refined the policy

---

## 9. Static Files Required

### `public/policy-precedents.json`

Required by the Comparison page (`/compare`) for the **PolicyPrecedentSearch** feature. This is a static JSON file served directly from the `public/` directory — no backend endpoint needed.

**Structure:**
```json
[
  {
    "id": "carbon-tax-canada",
    "title": "Canada Carbon Tax (2019)",
    "domain": "Environment & Climate",
    "summary": "Federal carbon pricing backstop starting at CAD $20/tonne, rising annually.",
    "outcome": "mixed",
    "approval_estimate": 3.1,
    "tags": ["carbon tax", "climate", "federal", "canada"],
    "context": "Introduced under the Greenhouse Gas Pollution Pricing Act...",
    "pros": [
      "Revenue-neutral via rebates returned to households",
      "Clear price signal for industry"
    ],
    "cons": [
      "Significant regional opposition (Alberta, Saskatchewan)",
      "Burden on rural households with limited transit alternatives"
    ]
  }
]
```

**Recommended minimum:** 20–30 policy precedents across 5+ domains.

---

## 10. Local Storage Keys

| Key | Content | Notes |
|-----|---------|-------|
| `infinipol:simulations` | `SimulationListItem[]` | Local history cache, synced with API |
| `infinipol:create-draft` | Partial `CreateSimulationForm` | Auto-saved form draft, includes UI-only fields |

---

## 11. Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `VITE_API_BASE_URL` | No | `""` (same origin) | Set to backend URL in production, e.g. `https://api.infinipol.com` |
| `VITE_USE_MOCKS` | No | `"false"` | Set to `"true"` to enable MSW mock mode |

---

## 12. Mock Mode (MSW)

During development, Mock Service Worker (MSW) intercepts all API calls when `VITE_USE_MOCKS=true`.

**Mock file:** `src/mocks/handlers.ts`  
**Service worker:** `public/mockServiceWorker.js`

The MSW handlers mirror the full API contract. All 13 endpoints are mocked with realistic fixture data. Mock mode is self-contained — no backend needed.

**To run in mock mode:**
```bash
VITE_USE_MOCKS=true npm run dev
```

---

## 13. Roadmap & Planned Datasets

### Dataset Roadmap

| Dataset | Region | Status | Target |
|---------|--------|--------|--------|
| `nemotron_usa` | United States (50 states) | ✅ Live | — |
| `infinipol_indo_v1` | Indonesia (34 provinces) | 🔄 In Progress | Q2 2026 |
| `infinipol_eu_v1` | EU (Germany, France, Netherlands) | 📋 Planned | Q3 2026 |
| `infinipol_india_v1` | India (28 states) | 📋 Planned | 2027 |
| `infinipol_brazil_v1` | Brazil (26 states) | 📋 Planned | 2027 |
| `infinipol_aus_v1` | Australia (8 territories) | 📋 Planned | 2027 |

### Feature Roadmap

| Feature | Status | Target |
|---------|--------|--------|
| Multi-language policy input | 📋 Planned | Q4 2026 |
| Real-time collaboration (shared simulations) | 📋 Planned | 2027 |
| API access for researchers | 📋 Planned | 2027 |
| Custom persona dataset upload | 💡 Concept | TBD |

### Backend Preparation for Indonesia Dataset
When `infinipol_indo_v1` goes live, the following API changes are needed:
- `GET /datasets` — add the dataset with `"status": "active"` (remove `"coming_v2"`)
- `GET /simulations/:id/results` — `demographic_breakdown.by_state` becomes `by_province` for Indonesian simulations; the frontend will need a mapping or the field should be kept as `by_state` with province codes
- `emotion_profile` emotion keys may need to include culturally-relevant additions

---

## Appendix: Type Reference

All types are defined in `src/api/types.gen.ts` (auto-generated from OpenAPI). Key types:

```ts
// Simulation lifecycle
type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed'
type RuntimeProfile   = 'fast' | 'balanced' | 'deep'

// Filter shape (sent with createSimulation)
interface FilterSet {
  states?: string[]
  age_range?: [number, number]
  education_levels?: string[]
  occupation_groups?: string[]
}

// Results summary
interface Summary {
  mean_approval: number                          // 1.0–5.0
  approval_distribution: Record<string, number>  // keys "1"–"5"
  dominant_emotion: string
  behavioral_change_pct: number                  // 0–100
}

// Demographic breakdown
interface DemographicBreakdown {
  by_age_group:        Record<string, { mean_approval: number; count: number }>
  by_marital_status:   Record<string, { mean_approval: number; count: number }>
  by_state:            Record<string, number>   // flat — no count
  by_occupation_group: Record<string, { mean_approval: number; count: number }>
}

// Individual persona quote
interface RepresentativeQuote {
  persona_id: string
  name:       string
  age:        number
  occupation: string
  city:       string
  state:      string
  approval:   number   // integer 1–5
  emotion:    string
  rationale:  string   // free-text; used for word cloud
}
```
