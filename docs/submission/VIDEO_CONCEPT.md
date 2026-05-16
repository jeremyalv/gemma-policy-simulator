# Video Concept: "From Blind Drafting to Traceable Decisions"

## Core creative direction

Tone: pragmatic, high-stakes, no hype.  
Style: screen-first product demo with minimal narration overlays.  
Promise to viewer: "You can verify every claim in this video from public artifacts."

## Story arc

1. Pain: policy teams must decide quickly with weak feedback and unstable internet.
2. Shift: InfiniPol gives a local-first simulation loop before rollout.
3. Proof: real FE+BE path, no mocks, telemetry visible, exportable evidence.
4. Outcome: better traceability and lower blind-iteration risk.

## Hero scene concept (the "wow" moment)

Show a full run from draft to results while briefly toggling offline constraints narrative:
- create simulation,
- run starts and status progresses,
- telemetry appears,
- results and CSV export complete,
- challenge follow-up returns refinement text.

On-screen lower-third: "Real backend mode (`VITE_USE_MOCKS=false`), local Ollama runtime."

## Visual grammar

- Keep camera static and crisp; no cinematic transitions needed.
- Use zoom boxes only to highlight payload fields (`run_telemetry`, 409 code, CSV header).
- Always pair UI action with API proof snippet in split view.
- Avoid abstract slides except opening and closing cards.

## Segment plan (3 minutes)

## 0:00-0:20 The problem
- One slide: "Fast decisions, weak feedback, unstable internet."
- One line: "Blind policy iteration creates avoidable rollout risk."

## 0:20-1:20 End-to-end run
- Screen capture: create -> run -> status -> results -> export.
- Overlay 3 proof tags:
  - "non-blocking run lifecycle"
  - "run-quality telemetry"
  - "auditable CSV output"

## 1:20-2:00 Trust layer
- Show lifecycle guard response (`409 SIMULATION_NOT_COMPLETE`).
- Show not-found safety response (`404 NOT_FOUND`).
- Show challenge and follow-up response JSON.

## 2:00-2:35 Real utility
- Compare one controversial policy snapshot.
- Highlight demographic weak segment and representative quote.
- Explain how this guides policy revision before rollout.

## 2:35-3:00 Close
- "Local-first. Explainable. Auditable."
- Show repo URL + demo URL + writeup link.

## Recording checklist

1. Run with fixed known-good config for submission week.
2. Preload one completed simulation to avoid dead time.
3. Keep terminal window ready for one API curl/jq proof shot.
4. Record 1080p, 30fps, clear UI zoom.
5. Keep final runtime <= 2:55.

## Suggested voiceover posture

- Confident, specific, non-promotional.
- Use concrete nouns ("status telemetry", "lifecycle guard", "artifact") over adjectives.
- Mention one limitation explicitly to increase credibility.
