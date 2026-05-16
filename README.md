# InfiniPol

InfiniPol is a local-first policy simulation system that helps policy teams test draft policies against synthetic personas before real-world rollout. It is designed for low-connectivity and privacy-sensitive environments where cloud-dependent tooling is risky.

## Why this matters

Policy teams often need to make high-impact decisions with limited field feedback, unstable internet, and sensitive local context. InfiniPol provides an explainable simulation loop with run telemetry and exportable artifacts so teams can trace why a draft looks risky before deployment.

## What you can do

- Create a simulation draft from a policy text.
- Run persona-based inference locally with Gemma via Ollama.
- Monitor lifecycle + run-quality telemetry.
- Inspect aggregated results and demographic breakdowns.
- Export raw responses to CSV for audit and review.
- Run challenge/follow-up roundtrips for policy stress testing.

## Quick Try (10 minutes)

Prerequisites:
- Ollama installed
- Python 3.11+
- Node.js 20+

From repository root:

```bash
make quickstart
```

This starts Ollama + backend + frontend and runs an API smoke check.

Stop services:

```bash
make down
```

## Full setup docs

- Backend setup: [apps/server/README.md](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/apps/server/README.md)
- Frontend setup: [apps/client/README.md](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/apps/client/README.md)
- Sign-off evidence: [docs/frontend/SIGNOFF_EVIDENCE_2026-05-13.md](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/frontend/SIGNOFF_EVIDENCE_2026-05-13.md)
- Submission assets: [docs/submission/](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/submission)

## Known limitations (current MVP)

- Output calibration still needs improvement for better opinion dispersion on some controversial policies.
- Results quality depends on local model/runtime settings and dataset coverage.
- Quickstart dataset is for demo UX, not representativeness benchmarking.
- This is a pre-rollout decision-support tool, not a substitute for real public consultation.
