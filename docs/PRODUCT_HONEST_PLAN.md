# InfiliPol — Honest Product Plan v2
**Scope: US Policy (primary) + Global English-language policies (secondary)**
**Last updated: 2026-04-27**

---

## 0. The One-Line Reframe

> **What it is now:** An LLM that roleplays as voters, wrapped in a dashboard.
> **What it needs to be:** A retrieval-augmented analysis tool that grounds AI-generated reactions in real polling context, census demographics, and recent news — then communicates uncertainty honestly.

These are not the same product. The gap between them is fixable, but requires honest decisions about what to claim, what to build, and what order to do it in.

---

## 1. The Core Problem: LLM Roleplay vs. Grounded Opinion Analysis

### What happens today

1. User submits a policy text.
2. Backend asks Gemma: "pretend you are a 35-year-old urban Hispanic woman in Texas. How do you react to this policy?"
3. Gemma replies in character, drawing on its training data priors.
4. The system aggregates these character responses and presents them as approval scores and demographic breakdowns.

The output reflects **what Gemma's training data implies people like that tend to say**, not what they would actually say. The model's training corpus is predominantly English-language internet text, skewing toward younger, educated, politically-engaged, and US/UK demographics. Every persona is filtered through this lens, regardless of the label on the persona card.

There is also no variance testing. Each simulation produces a single point estimate. Run it twice and you get different numbers. The user never sees this.

### The fix: Retrieval-Augmented Grounding

The goal is not to replace LLM inference — it's to **anchor** it. Before generating any persona response, the backend should:

1. **Fetch real-world context** (news, recent polling, relevant survey data)
2. **Inject it into the system prompt** so persona reactions are grounded in documented reality, not just model priors
3. **Run inference N times** (not once) and return a distribution, not a point estimate
4. **Weight personas** according to real census demographic distributions, not whatever the model feels is "representative"

This does not make the output a substitute for actual polling. It makes the output a documented, reproducible, clearly-disclosed *AI analysis of likely reactions given available context*. That framing is honest. The current framing is not.

---

## 2. Real-World Context APIs (What to Integrate)

### 2a. News & Current Events (for recency)

| API | Cost | What it gives you | Priority |
|---|---|---|---|
| **GDELT Project** | Free | Real-time global news event graph, sentiment, tone scores, article links. REST + BigQuery. Excellent for US domestic + international. | ⭐ High |
| **NewsAPI.org** | Free tier (100 req/day dev) / $449/mo production | Structured news search by keyword, date range, source. Returns titles, descriptions, URLs. Easy to parse. | ⭐ High |
| **Bing News Search API** | $7/1000 queries (Azure) | High-quality deduplication, entity recognition. More expensive but cleaner results. | Medium |
| **AP News RSS** | Free | Wire-level factual news. No sentiment, no commentary. Good as ground truth anchor. | Low |

**Implementation approach:**
- On simulation submit, extract 3–5 key terms from the policy text (via a lightweight LLM call or keyword extraction)
- Query GDELT or NewsAPI for articles from the last 90 days matching those terms
- Include the top 5 article summaries (title + first 2 paragraphs) in the system prompt context block
- Label them clearly: `[RECENT NEWS CONTEXT - for grounding only]`

This is the single highest-ROI technical change available. It costs ~$0.001 per simulation in API calls and eliminates the "Gemma doesn't know what happened after training cutoff" problem entirely.

### 2b. Polling Data (for opinion grounding)

These are not live APIs — they are datasets you download, process, and embed into a retrieval system (vector store or simple keyword index):

| Source | What it gives you |
|---|---|
| **Pew Research Center** | Topic-level approval breakdowns by age, education, party, race. Downloadable datasets. ~200 studies/year. |
| **Gallup** | Long-running time series on major policy topics. Public data portal. |
| **YouGov US** | Crosstab-level data on hundreds of policy questions. Public results browser. |
| **FiveThirtyEight / ABC Polling** | Aggregated poll averages, raw data exports for major policy topics. |
| **AP-NORC Center** | High-quality surveys on domestic US policy. Often cited in journalism. |

**Implementation approach:**
- Build a polling context retriever: a vector store (or simple BM25 index) of polling question/result pairs
- Query: "Do you support raising the federal minimum wage to $15/hour?" → result: "54% support, 42% oppose (Pew 2024, n=3,512, MOE ±2.3%)"
- Inject the 3 most relevant polling results into the system prompt as `[REAL POLLING CONTEXT]`
- This becomes the empirical anchor the model reasons from, not free-form imagination

**This is the feature that separates the product from a toy.** A user can see "my simulation says 61% support, and the closest real poll we found says 54% support — here's the source." That is defensible. That has value.

### 2c. Demographic Weighting (for accurate persona sampling)

| Source | What it gives you |
|---|---|
| **US Census Bureau API** | Population distributions by age, race, income, education, region. Free, machine-readable. |
| **American Community Survey (ACS)** | Detailed demographic profiles at state/county level. 1-year and 5-year estimates. |
| **Current Population Survey (CPS)** | Employment, earnings, family composition. Useful for economic policy. |

**Implementation approach:**
- Replace the current "generate whatever personas feel representative" approach with stratified sampling
- Before simulation, query Census API for target region demographic breakdown
- Generate personas in exact proportion: if Census says 12% of US adults are Black men aged 25–44, then 12% of your 500 personas should be that demographic
- This is a backend change. The frontend already has region and sample size fields — they should actually drive this

---

## 3. Misleading Elements: Exact Fixes Required

### 3a. `PolicySectorSection.tsx` — UI says it "guides the simulation focus"

**Current state:**
```
// The sector field is NOT sent to the API; it is UI-only context.
```
But the user-facing copy says:
> "This helps contextualise results and guides the simulation focus."

This is false. It guides nothing. It is stored locally and discarded.

**Fix options (pick one):**
- **Option A (correct):** Send `sector[]` to the backend. Use it to bias context retrieval — e.g., if sector is "Healthcare", prioritize Pew healthcare polls and GDELT health policy news.
- **Option B (honest):** Remove the field entirely, or relabel it as "For your notes — does not affect simulation output" with a `📝` prefix.

Do not keep a field that says it affects results when it doesn't. Option A is the right long-term answer.

### 3b. `SampleSection.tsx` — `accuracyLabel()` is lying

**Current function:**
```ts
function accuracyLabel(n: number): string {
  if (n < 100)  return 'Low — suitable for quick exploration'
  if (n < 300)  return 'Moderate — suitable for prototyping'
  if (n < 700)  return 'Good — suitable for analysis'
  if (n < 1500) return 'High — suitable for reporting'
  return 'Very high — publication-quality'
}
```

2000 LLM roleplay instances are not "publication-quality." They are not statistically valid survey responses. A real survey of n=400 with proper sampling methodology is more reliable than n=2000 LLM personas.

**Also lying:**
```ts
function runtimeEstimate(n: number): string {
  if (n <= 100)  return '~15 seconds'
  ...
}
```
These numbers are hardcoded and fictional. They have never been validated against real backend inference times.

**Fix — `accuracyLabel`:**
```ts
function accuracyLabel(n: number): string {
  if (n < 100)  return 'Exploratory — high variance, indicative only'
  if (n < 300)  return 'Preliminary — suitable for internal review'
  if (n < 700)  return 'Moderate — suitable for structured analysis'
  if (n < 1500) return 'Robust — lower variance across demographic segments'
  return 'High volume — diminishing returns beyond this range'
}
```

And add a disclaimer below the accuracy row:
> "Sample size affects AI output variance, not statistical validity in the traditional sense. This tool produces AI-generated analysis, not survey data."

**Fix — `runtimeEstimate`:** Remove until the backend actually benchmarks and reports real inference timing. Show "Estimated runtime: depends on model load" or wire up a real progress event stream.

### 3c. `SampleSection.tsx` — `sample_justification` field

The "Why this sample size?" Textarea is a `sample_justification` field. It is never sent to the API. The user types a justification for a choice that has no methodological consequence.

**Fix:** Remove the field, or make it a local-only note that gets included in the PDF export only. Add a clear label: `"This note is for your records only — it does not affect the simulation."`

### 3d. `ApprovalHeatmap.tsx` — Gaussian estimate presented as data

**Current tooltip:**
```
`${group} — ${LEVEL_LABELS[level]}: ~${pct}% of ${count} personas`
```

This says "`~47% of 500 personas`" as if 47% of personas were observed to hold that view. In reality, the percentage was calculated from a single `mean_approval` value using a fixed Gaussian curve. No individual persona was ever assigned a level-5 score. The `~` does not adequately communicate this.

**Fix — tooltip:**
```
`${group}: estimated ~${pct}% at "${LEVEL_LABELS[level]}" level (derived from mean ${mean.toFixed(1)})`
```

**Fix — footer (currently):**
> "* Distribution is estimated from mean approval per group using a Gaussian spread (σ=1.1). Individual cell counts are approximate."

This is technically honest but buried. Move it to a `ℹ️` icon tooltip on the section header, and change the section title from "Approval Heatmap" to **"Estimated Approval Distribution"**.

**Long-term fix:** If the backend actually returns per-persona scores (which it should, for any credible product), compute the real distribution. The Gaussian estimation should be a placeholder only, clearly labeled as such, until real per-persona data is available.

### 3e. Challenge Drawer — Rename and reframe

The current "Challenge Results" drawer generates a single adversarial question text. It does not re-run the simulation. It does not compare approval before and after. It is a text generator, not an adversarial test.

**Short-term fix:** Rename to **"Devil's Advocate"** or **"Stress Test Questions"**. Update copy to say:
> "These are AI-generated questions a skeptic might raise about your policy. They are prompts for your own thinking — not a re-simulation."

**Long-term fix (see Section 5):** Build actual re-simulation with adversarial framing and produce a differential approval score.

---

## 4. Landing Page: Honest but Still Convincing

The current landing page makes several claims that will actively repel the target audience (policy researchers, analysts, government staff) who will immediately recognize them as unsupported.

### 4a. Remove these claims entirely

| Current claim | Why it must go |
|---|---|
| "10K+ policies per year" | No methodology. Not even plausible given current infra. |
| "95% faster" | Faster than what? No control condition exists. |
| "$50K+ saved" | What cost model? What baseline? This will get laughed at in any procurement context. |
| "30+ countries" | You support the US. Indonesia at Q2 2026 is aspirational fiction. |

**Replace with:** Honest capability framing. Numbers you can defend:

```
"Simulate 500 AI-generated persona reactions in under 2 minutes"
"Breakdowns across 12 demographic segments"
"Export-ready analysis in PDF or CSV"
"Used for US federal, state, and municipal policy analysis"
```

These are verifiable. They don't overclaim. Sophisticated users trust specificity over magnitude.

### 4b. Change the core value proposition language

**Currently:** "Simulate how the public responds to your policy proposal"
**Problem:** Implies statistical validity it doesn't have.

**Better:** "AI-assisted policy reaction analysis — understand likely pushback, demographic fault lines, and framing risks before you publish."

This is honest. It positions the tool as a *thinking aid*, not a *polling replacement*. That framing is:
- Accurate
- Still valuable to the target audience
- Not falsifiable in ways that create liability

### 4c. Add a "Methodology" page (linked from footer + landing page)

One dedicated page, ~500 words, covering:
- What the model does (LLM persona generation + news/polling context injection)
- What it does NOT do (replace surveys, predict actual electoral outcomes, produce statistically valid estimates)
- How demographic weighting works (once implemented)
- Data sources used (GDELT, Pew, Census — once implemented)
- Known limitations (model bias, recency limits, no calibration against ground truth)
- Version history of methodology changes

This page is the single most powerful trust-builder for sophisticated users. Its absence is a red flag. Its presence signals intellectual honesty.

### 4d. The Impact Metrics section — replace with honest framing

Instead of fabricated KPIs, show:
- **What types of analysis it accelerates** (not "95% faster" — just describe the workflow)
- **Example policy domains** it's been used for (with real or illustrative examples)
- **What a typical output looks like** (screenshot or embedded demo)

### 4e. Use Case cards — keep but reframe

The Potential Applications cards (Government, Academic, NGO, Corporate) are fine as a framing device. Just remove any language implying the tool produces research-grade output. Use:
- "Rapid first-pass analysis before commissioning survey fieldwork"
- "Internal stakeholder briefing aid"
- "Policy communication stress-test"
- "Teaching tool for political science / public policy courses"

These are honest use cases where the tool genuinely adds value even in its current state.

---

## 5. UX Flow: What It Should Actually Be

### Current flow (broken in key ways)

```
Create policy → [optional] Clarification chat → Run → Results
```

Problems:
- "Clarification chat" is meant to refine the policy text, but users don't know that's what's happening
- Results appear with no indication of what grounding was used
- No uncertainty is communicated at any step
- Challenge is an afterthought disconnected from re-simulation

### Proposed flow

```
1. Write Policy
   └── Sector tags → actually sent to backend for context retrieval
   └── Region selector → drives demographic weighting
   └── Sample size → honest framing as "inference volume"

2. Context Preview (new step)
   └── "Here's the news context we found for this policy" (top 3 articles, titles + dates)
   └── "Here's the most relevant polling data we found" (1-2 real poll results with source + date)
   └── User can add/remove context sources, or skip
   └── This step makes the grounding transparent before inference

3. Clarification (optional, reframed)
   └── Renamed: "Refine your policy framing"
   └── Max 2 questions (not 3 — 3 feels like a test)
   └── Skip always clearly visible
   └── Purpose explained upfront: "helps the AI understand edge cases in your policy text"

4. Run
   └── Backend runs N=25 inference passes (not 1)
   └── Progress shows: "Running pass 14 of 25…"
   └── Aggregates results across all passes

5. Results
   └── Approval score shown as RANGE, not point: "58–64% approval (95% simulation interval)"
   └── Context sources cited: "Analysis grounded in: [3 news articles] + [2 Pew polls]"
   └── Every chart has an ℹ️ icon explaining what it measures and how
   └── "What this means" plain-language interpretation above charts
   └── "What this does NOT mean" disclaimer (not a survey, not a prediction)

6. Challenge (redesigned)
   └── Renamed: "Re-run with adversarial framing"
   └── User picks a challenge angle (opposition party framing, economic cost angle, civil liberties angle)
   └── Backend runs another N=25 passes with the adversarial context injected
   └── Results show: original score range vs. challenged score range
   └── Delta is the actual value: "This framing reduces support by 8–14 points among 45–60 age group"
```

---

## 6. Critical Features: Priority Order

### Tier 1 — Fix before any external demo

| Feature | What to build | Why it's blocking |
|---|---|---|
| **Uncertainty ranges** | Run inference 25x, report min/max/median instead of single score | Single point estimate is the biggest credibility killer |
| **Context transparency** | Show users what news + polling was injected before inference | Without this, users can't evaluate output quality |
| **Honest labels on all charts** | "Estimated" prefix on heatmap, methodology tooltip on every chart | Current labeling implies measurement that doesn't exist |
| **Remove/fix fake fields** | Wire `sector` to backend context retrieval, or remove it. Add "for your notes only" to `sample_justification` | Active deception of users |
| **Methodology page** | One page, 500 words, honest about what the tool does and doesn't do | Expected by any professional user; absence is a red flag |

### Tier 2 — Build within 2 months

| Feature | What to build |
|---|---|
| **News context injection** | GDELT or NewsAPI integration in backend; inject top-5 recent articles into system prompt |
| **Polling data retrieval** | Embed Pew/Gallup/YouGov public datasets; retrieve top-2 relevant polls per simulation |
| **Census-weighted persona sampling** | Query US Census API for target region; generate personas in correct demographic proportion |
| **Real re-simulation challenge** | Challenge drawer triggers a full N=25 re-run with adversarial framing, shows delta scores |
| **Context preview step** | New UI step between form and clarification showing retrieved context before inference |

### Tier 3 — Build after Tier 2 is validated

| Feature | What to build |
|---|---|
| **Backtesting module** | Run historical policies through the system, compare output to known polling outcomes |
| **Confidence calibration** | Track how often model confidence ranges contain real polling values over time |
| **Simulation comparison** | Compare two different policy phrasings side-by-side (infrastructure exists, needs UI polish) |
| **PDF export with methodology** | Every export includes context sources, uncertainty ranges, methodology disclaimer |
| **API access** | Allow institutional users to submit simulations programmatically |

---

## 7. Roadmap: What's Actually Achievable

The current roadmap (Indonesia Q2 2026, Europe Q4 2026) is aspirational to the point of being misleading. Here is a roadmap grounded in what the infrastructure actually requires.

### Phase 1: US — Get It Right (Now → Q3 2026)

**What ships:**
- Uncertainty ranges on all scores
- News context injection via GDELT + NewsAPI (US English sources)
- Polling data retrieval from Pew, Gallup, YouGov US
- Census-weighted demographic persona sampling (US national + state level)
- Methodology disclosure page
- Honest landing page copy
- Context preview step in UX flow

**Why US first:**
The US has the deepest publicly available polling ecosystem in the world. Pew, Gallup, YouGov, AP-NORC, and FiveThirtyEight collectively cover hundreds of policy topics with crosstab-level demographic breakdowns. This is the only market where you can meaningfully validate AI output against real polling benchmarks without a significant data acquisition investment.

**Definition of "done":** Run the system on 10 historical US policy proposals. Compare simulation approval ranges against actual polling numbers from the same time period. Publish the results — including where the model was wrong — on the methodology page. If the ranges contain the real polling number more than 60% of the time, you have a calibrated tool. If not, you know what to fix.

### Phase 2: English-Speaking Commonwealth (Q4 2026 → Q1 2027)

**What ships:**
- UK, Canada, Australia support
- News context injection from UK/CA/AU sources (BBC, The Guardian, ABC AU, Globe and Mail)
- Demographic weighting using ONS (UK), Statistics Canada, ABS (Australia)
- Polling data from YouGov UK, Ipsos MORI, Angus Reid (Canada), Essential Poll (Australia)

**Why these markets:**
- English language — no translation layer needed in the LLM prompt
- Strong public polling ecosystems comparable to the US
- Familiar Westminster-style policy frameworks
- Similar internet demographic distributions in model training data, so baseline model priors are less distorted

**What you do NOT need to build:**
- Separate model fine-tuning
- New persona template libraries
- Translation infrastructure

### Phase 3: Continental Europe — English-First (Q2 2027)

**What ships:**
- EU policy analysis in English (targeting policy staff who already work in English)
- Eurobarometer dataset integration (hundreds of cross-EU surveys, publicly available)
- Demographic data from Eurostat
- News context from EU-focused English sources (Politico Europe, EUobserver, Reuters EU)

**What this is NOT:**
- French-language simulation
- German-language simulation
- Per-country fine-tuned models

EU institutions and think tanks operate extensively in English. The immediate customer for EU policy analysis in English is Brussels-based policy staff, not French citizens. German and French language support is Phase 4 and requires prompt engineering + retrieval infrastructure investment that is not trivial.

### Phase 4: India — English Tier (Q3 2027)

**What ships:**
- India policy analysis in English
- Demographic weighting from Census of India 2011 (and 2024 when released)
- News context from The Hindu, Times of India, Indian Express, Mint (all major English-language sources)
- Polling data from CSDS-Lokniti, IANS, India Today-Axis surveys (limited public availability)

**Why India before Indonesia:**
India has a massive English-language public discourse ecosystem. The Times of India is one of the highest-circulation English newspapers in the world. A significant fraction of Indian policy debate happens in English, particularly at the national level. This means the LLM's training data has genuine India-specific policy content in English.

Indonesia is a Bahasa Indonesia-primary market. Meaningful simulation in Indonesian requires model capability and retrieval infrastructure that does not exist at acceptable quality in any current open-weight model.

### Phase 5: Southeast Asia + Latin America (2028)

**Pre-conditions before this phase starts:**
- Validated performance on at least 2 non-US markets (Phase 2/3 results)
- Partnership with at least one local polling or research organization per target market
- Translation + prompt infrastructure built and tested
- Confirmed that base model has adequate multilingual capability for target language (benchmark, don't assume)

**Possible markets:**
- Indonesia (Bahasa Indonesia) — requires Kompas, Tempo, SMRC/Indikator polling data integration
- Brazil (Portuguese) — has decent public polling ecosystem (Datafolha, IPEC), Folha de S.Paulo for news
- Mexico (Spanish) — El Universal, La Jornada, Consulta Mitofsky polling

**What does NOT ship in Phase 5 without explicit research investment:**
- Accurate persona demographic weighting for rural populations in any of these markets
- Regional/provincial breakdowns within Indonesia or Brazil
- Any market where the model has demonstrably poor language quality

---

## 8. Code Comments That Need to Be Fixed

These are specific comments in the codebase that are either misleading or actively wrong.

### `apps/client/src/features/create/sections/PolicySectorSection.tsx`

**Line 2–4 (comment block):**
```ts
/**
 * PolicySectorSection — multi-select policy domain/sector picker.
 * 9 domains, 50+ sub-options. Purely UI — values stored in form.sector[].
 * The sector field is NOT sent to the API; it is UI-only context.
 */
```

**Line 168 (user-facing copy):**
```ts
'This helps contextualise results and guides the simulation focus.'
```

This copy is false given the comment above it. Fix:
- If keeping the field as UI-only: change copy to `"Tag the policy domain for your own reference. This does not affect simulation output."`
- If wiring it to the backend (recommended): update the comment and wire it through

### `apps/client/src/features/create/sections/SampleSection.tsx`

**`accuracyLabel()` function:**
- Replace "publication-quality" label at n≥2000. LLM inference volume is not a substitute for statistical sampling. Use honest language about variance reduction, not about statistical validity.

**`runtimeEstimate()` function:**
- Hardcoded, never validated against real backend performance.
- Either remove, or add `// TODO: replace with real telemetry once backend reports timing`
- Do not show users fictional runtime estimates as if they are measured

**`sample_justification` field description:**
```ts
'Briefly explain your choice — e.g. "500 for exploratory analysis before presenting to stakeholders"'
```
This implies the justification is used somewhere. Add: `"(Saved with your simulation record only — does not affect output)"`

### `apps/client/src/features/results/charts/ApprovalHeatmap.tsx`

**Line 1–5 (comment block):**
```ts
/**
 * ApprovalHeatmap — 2D CSS grid heatmap: age groups × approval levels (1–5).
 * Colour is approval-direction-aware: high % at level 1/2 = red, level 4/5 = green.
 * Distribution per row is *estimated* via a Gaussian around mean_approval.
 */
```

The word "estimated" is correct but buried. The component title should be `Estimated Approval Distribution`, not `Approval Heatmap`. The tooltip text says `~${pct}% of ${count} personas` which implies observation rather than estimation.

**Fix the tooltip label:**
```ts
// Before:
label={`${group} — ${LEVEL_LABELS[level]}: ~${pct}% of ${count} personas`}

// After:
label={`${group}: estimated ~${pct}% at "${LEVEL_LABELS[level]}" (Gaussian estimate from mean ${mean.toFixed(1)} — not observed per-persona data)`}
```

**Footer copy is technically accurate but undersells the limitation.** Elevate it by moving it to a visible `ℹ️` callout above the grid, not a footnote below it.

### `apps/client/src/features/challenge/ChallengeDrawer.tsx`

**Line 1–5 (comment block):**
```ts
/**
 * ChallengeDrawer — side drawer that hosts the full challenge loop.
 * Opened from the floating button on ResultsPage.
 *
 * Contains: FocusPicker → ChallengeDisplay → FollowupDisplay
 * Graceful fallback banner when backend returns 500/501.
 */
```

The drawer is described as a "challenge loop" but it does not re-run the simulation. It generates challenge question text only. Update comment:
```ts
/**
 * ChallengeDrawer — generates AI adversarial questions about the simulation results.
 * NOTE: This does NOT re-run the simulation with adversarial framing.
 * It generates text prompts for the user to consider. A future version (Phase 3)
 * will trigger a real re-simulation and produce differential approval scores.
 *
 * Current flow: FocusPicker → generate challenge text → FollowupDisplay
 */
```

### `apps/client/src/api/index.ts` (or wherever `listSimulations` lives)

The `listSimulations` function uses raw `fetch()` instead of `apiFetch`. Add a comment:
```ts
// NOTE: Uses raw fetch() (not apiFetch) to access envelope.meta.total for pagination.
// Consequence: bypasses all apiFetch middleware — auth headers, error normalization,
// request logging. If apiFetch gains middleware, this function is invisible to it.
// TODO: refactor apiFetch to return { data, meta } instead of unwrapping, then
// migrate listSimulations to use apiFetch like every other endpoint.
```

---

## 9. What Not to Build (Yet)

| Tempting feature | Why not yet |
|---|---|
| Fine-tuned regional models | You don't have validation data. Fine-tuning on bad signal produces confident bad output. |
| Real-time social media sentiment | Twitter/X API costs are prohibitive. Reddit API rate limits are severe. Signal-to-noise ratio in social media is low for policy analysis. Build after polling retrieval is solid. |
| Electoral outcome prediction | This is a legally and ethically different product. Don't conflate it with reaction analysis. |
| "AI vs real poll" comparison UI | Don't build this until you have backtesting validation showing the system is actually calibrated. Building the comparison feature before you know the answer is the wrong order. |
| Multilingual simulation (non-English) | Without validation data in the target language, multilingual support is marketing, not product. |

---

## 10. Summary: The Honest Version of This Product

InfiliPol has a genuinely useful core idea: use AI to rapidly prototype public reaction to policy proposals, surface demographic fault lines, and identify framing risks — faster than commissioning survey fieldwork.

That is a real workflow gap. Policy teams, think tanks, and academic researchers do spend significant time and money on exactly this kind of pre-publication reaction testing. An AI tool that makes it faster and cheaper has clear market fit.

But the version that gets adopted by serious users is one that:
- **Grounds outputs in real context** (news, polling, census data) rather than free-form LLM imagination
- **Communicates uncertainty explicitly** rather than presenting point estimates as measurements
- **Positions itself as a thinking aid**, not a polling replacement
- **Validates its calibration** against historical ground truth and publishes the results
- **Expands to new markets only when it can do so honestly** — with appropriate grounding data and validated methodology for each market

The shortcut version — claiming 30 countries, showing fake accuracy labels, generating one-sentence "challenges" — will not get adopted by anyone who matters. It will get adopted briefly by people who don't know what they're looking at, and then dropped.

The honest version is harder to build and harder to market. It is also the only version that survives contact with the actual target user.

---

*This document should be revisited after Tier 1 fixes are shipped and before Phase 2 market expansion begins.*
