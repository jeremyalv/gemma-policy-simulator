# InfiniPol Video Script (3 minutes max)

## 0:00 - 0:25 Problem and stakes

Narration:
"Policy teams often need to decide quickly with weak field feedback, unreliable internet, and sensitive local context. If a draft is wrong, harm happens after rollout. We built InfiniPol to make policy testing local, structured, and explainable before that risk becomes real."

On screen:
- Title card: "InfiniPol — Trustworthy Local Policy Testing"
- One sentence problem statement
- Safety & Trust track tag

## 0:25 - 1:35 Live product flow (real backend, no mocks)

Narration:
"Here is the real end-to-end flow: create a simulation, run local inference with Gemma, monitor status telemetry, inspect results, and export auditable CSV."

On screen:
1. Create simulation form
2. Run trigger
3. Status page with run telemetry
4. Results page with summary + demographic breakdown
5. Export action and CSV file preview

Proof overlays:
- `VITE_USE_MOCKS=false`
- API response snippets (`/status`, `/results`, `/export`)

## 1:35 - 2:20 Trust layer

Narration:
"InfiniPol enforces lifecycle guards and reports run-quality telemetry. Teams can see retries, partial-success behavior, and failure semantics, instead of opaque model behavior."

On screen:
- `run_telemetry` block from a status payload
- 409 lifecycle error example
- Not-found handling example
- Link to sign-off artifact folder

## 2:20 - 2:45 Utility example (controversial policy)

Narration:
"For controversial policies, teams can compare drafts and inspect where opposition concentrates by segment, then iterate before deployment."

On screen:
- One controversial policy result snapshot
- Distribution chart + one demographic weak segment
- Challenge/follow-up roundtrip response

## 2:45 - 3:00 Closing

Narration:
"InfiniPol gives low-connectivity policy teams a local-first, auditable way to reduce blind policy iteration risk. The full code, demo, and evidence artifacts are public."

On screen:
- Repo URL
- Live demo URL
- Kaggle writeup title

## Production notes

- Keep every shot real product UI + real API output.
- Avoid conceptual slides for more than 5 seconds.
- Use one fixed model/runtime profile for submission week.
