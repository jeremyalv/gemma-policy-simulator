# InfiniPol: Local-First Policy Testing for High-Stakes Decisions

## Subtitle
Using Gemma 4 to help policy teams pressure-test draft ideas with transparent telemetry and auditable outputs.

Policy teams don’t usually get the luxury of perfect information, perfect timing, and perfect connectivity. Decisions still have to happen. Budgets still move. Deadlines still land on Friday.

That tension is the starting point for InfiniPol.

We built InfiniPol as a local-first policy simulation workflow for teams that need to make better draft decisions before rollout, especially in low-connectivity and resource-constrained environments. It is not a replacement for public consultation or formal impact studies. It is a practical pre-flight check: run the draft, inspect the outcomes, look for weak segments, export evidence, iterate.

## Why this problem is real (not theoretical)

There is now plenty of public evidence that policymaking operates in messy conditions:

- OECD describes public policy environments as complex, uncertain, and fragmented, and notes that governments are under pressure to demonstrate outcomes from decisions and spending [1][2].
- WHO explicitly describes emergency policy decision-making as happening under incomplete information and significant pressure, with difficult trade-offs [3].
- In Indonesia specifically, World Bank reporting highlights persistent connectivity gaps and urban-rural digital divides, plus data fragmentation challenges in public-sector digital transformation [4][5].

So yes, this is global. And yes, countries like Indonesia feel it acutely.

## What InfiniPol does in practice

The workflow is intentionally straightforward:

1. Create a simulation from policy text (`POST /api/v1/simulations`).
2. Start a run (`POST /api/v1/simulations/{id}/run`).
3. Poll lifecycle + run-quality telemetry (`GET /api/v1/simulations/{id}/status`).
4. Read aggregated results (`GET /api/v1/simulations/{id}/results`).
5. Export persona-level outputs (`GET /api/v1/simulations/{id}/export`).
6. Run challenge/follow-up loop for refinement:
   - `POST /api/v1/simulations/{id}/challenge`
   - `POST /api/v1/challenges/{challenge_id}/followup`

In sign-off mode, we force real backend integration (`VITE_USE_MOCKS=false`). No mock fallback hidden behind “demo mode”.

## Usability for non-technical teams

Most policy teams are not software teams, so we designed two operational modes:

### A) Quickstart mode (for first-time trial)

Goal: get to a working end-to-end run fast, with minimal setup friction.

1. Install prerequisites once: Ollama, Python, Node.js.
2. Run one command from repo root: `make quickstart`.
3. Open the frontend URL shown in terminal.
4. Create a simulation, click run, wait for completion, then open results/export.

What quickstart is for:
- onboarding, demos, and usability trials.

What quickstart is not for:
- representativeness benchmarking or country-level inference claims.

### B) Normal mode (for repeat usage and deeper testing)

Goal: run with explicit local configuration and your chosen runtime settings.

1. Start services: `make up` (or start Ollama/backend/frontend manually).
2. Confirm backend readiness endpoint responds (`/api/v1/datasets`).
3. Create simulation drafts from policy text.
4. Run simulations and monitor lifecycle status.
5. Inspect distribution and segment outputs in results.
6. Export CSV for review meetings or policy memo attachments.
7. Use challenge/follow-up loop to test revised policy wording.

This split keeps first use simple while still supporting more rigorous internal iteration for policy analysts.

## Architecture decisions that matter

InfiniPol is structured as a contract-first monorepo:

- Frontend: `apps/client`
- Backend: `apps/server`
- Shared contract source: `packages/contracts`

Runtime path:

- Gemma 4 via local Ollama.
- Dataset-backed persona sampling from local files.
- Async run worker for non-blocking lifecycle.
- Raw outputs and telemetry persisted locally (SQLite + artifacts).

What this buys us:

- local operation by default,
- deterministic replay behavior (seeded),
- explicit lifecycle semantics (no silent “mystery states”).

## Safety and Trust layer (core, not decoration)

This project is submitted under Safety & Trust because trust is engineered into the workflow:

1. **Lifecycle guards**
- `/results` and `/export` are completion-gated.
- Not found and not-complete states are explicit (`404`, `409`).

2. **Run-quality telemetry**
- retry and invalid-output counters,
- attempted/success/failed counts and success rate,
- partial-run visibility,
- stable failure fields for diagnosis.

3. **Auditability**
- persisted raw outputs,
- deterministic run metadata,
- export path for external review.

4. **Contract discipline**
- envelope pattern `{ data, error, meta }`,
- FE/BE synced through shared contracts (not hand-written drift).

In short: InfiniPol shows its work.

## What we have already proven

We validated this system as a real FE+BE integration, not a slide demo.

Evidence pack:
- `docs/signoff/artifacts/*`
- `docs/frontend/SIGNOFF_EVIDENCE_2026-05-13.md`

Concrete checks include:

- `GET /datasets` returns active + coming_v2 entries.
- Completed simulations expose run telemetry via `/status`.
- `/results` and `/export` are live for completed runs.
- Challenge roundtrip endpoints return structured outputs.
- Lifecycle and not-found guards behave as expected (`409`, `404`).

Reliability gates in sign-off:

- Backend tests: 132/132 pass.
- Frontend tests: 43/43 pass.
- Contract checks pass.

## Global positioning, with honest boundaries

InfiniPol is positioned for policy teams globally in low-connectivity or high-friction operating environments.

At the same time, we are explicit about scope:

- Current persona dataset is **Nemotron USA**.
- Therefore, current outputs are best treated as a structured simulation workflow and stress-test tool, not as a calibrated country-specific sentiment predictor for Indonesia (or any other non-US context) yet.

That distinction matters for credibility, and we keep it front-and-center in our demo and documentation.

## Practical use case

A team compares two policy variants before funding rollout:

- Variant A is administratively simple but socially contentious.
- Variant B is more targeted but operationally heavier.

With InfiniPol, the team can quickly inspect:

- approval distribution (not just a mean),
- demographic weak segments,
- rationale and emotion profile,
- challenge follow-up suggestions for draft revision.

This makes “idea bulletproofing” less hand-wavy. Not perfect, but much better than flying blind.

## Limitations

Three important caveats:

1. Model outputs can still concentrate under some prompt/policy combinations.
2. Synthetic personas are a proxy and should not be mistaken for real electorate measurement.
3. Quickstart mode is for low-friction trials, not representativeness benchmarking.

We treat these as first-order constraints, not fine print.

## Next steps

1. Improve dispersion calibration while preserving API stability.
2. Increase challenge quality and quote representativeness.
3. Add country-localized persona datasets so “global positioning” can become country-grounded simulation, including Indonesia-specific policy contexts.

## Closing

InfiniPol is not trying to be an oracle. It is trying to be useful under real constraints.

When teams have to move quickly, with patchy internet, incomplete signals, and real downside risk, they still need a process they can trust. Local-first execution, explicit telemetry, and auditable outputs are our answer to that problem.

---

## References

[1] OECD. *Building Capacity for Evidence-Informed Policy-Making* (full report).  
https://www.oecd.org/en/publications/building-capacity-for-evidence-informed-policy-making_86331250-en/full-report.html

[2] OECD. *Public policymaking* topic page.  
https://www.oecd.org/en/topics/policy-issues/public-policymaking.html

[3] WHO. *Guidance to support government decision-making on public health and social measures* (Oct 6, 2025).  
https://www.who.int/news/item/06-10-2025-who-publishes-first-of-its-kind-guidance-to-support-government-decision-making-on-public-health-and-social-measures

[4] World Bank. *Ensuring a More Inclusive Future for Indonesia through Digital Technologies* (Jul 28, 2021).  
https://www.worldbank.org/en/news/press-release/2021/07/28/ensuring-a-more-inclusive-future-for-indonesia-through-digital-technologies

[5] World Bank Blog. *How to bridge the gap in Indonesia's inequality in internet access* (May 13, 2022).  
https://blogs.worldbank.org/en/eastasiapacific/how-bridge-gap-indonesias-inequality-internet-access
