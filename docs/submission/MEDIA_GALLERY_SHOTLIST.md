# Media Gallery Shot List

Minimum assets for submission packaging:

1. Cover image (required by Kaggle writeup submission).
2. Architecture diagram (local-first FE + BE + Ollama + local dataset + artifacts).
3. Run status screenshot (show progress + run telemetry presence).
4. Results screenshot (summary + distribution + demographic breakdown).
5. Challenge flow screenshot (challenge generated + followup/refinement response).

## Capture guidance

- Use real backend mode (`VITE_USE_MOCKS=false`).
- Prefer completed known-good simulations to avoid waiting during recording.
- Keep browser zoom consistent across screenshots.
- Avoid redacting critical fields needed for proof (status code, simulation id, export action).

## Suggested filenames

- `cover_infinipol.png`
- `arch_local_first.png`
- `ui_run_status.png`
- `ui_results_breakdown.png`
- `ui_challenge_roundtrip.png`
