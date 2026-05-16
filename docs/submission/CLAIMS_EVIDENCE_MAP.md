# InfiniPol Claims -> Evidence Map

Use this table to ensure every writeup/video claim is backed by a concrete artifact.

| Claim | Evidence file(s) | Notes |
|---|---|---|
| Real backend path is working (no mock dependency in sign-off) | [docs/frontend/SIGNOFF_EVIDENCE_2026-05-13.md](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/frontend/SIGNOFF_EVIDENCE_2026-05-13.md), [docs/frontend/FE_NO_MOCK_SIGNOFF.md](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/frontend/FE_NO_MOCK_SIGNOFF.md) | Explicit `VITE_USE_MOCKS=false` path and checks |
| Datasets endpoint is live and contract-compliant | [1_datasets.json](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/signoff/artifacts/1_datasets.json) | Contains active + coming_v2 |
| Create/run/status/results/export journey works | [3_create_simulation.json](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/signoff/artifacts/3_create_simulation.json), [5_status_sim_co2tax.json](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/signoff/artifacts/5_status_sim_co2tax.json), [6_results_sim_co2tax.json](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/signoff/artifacts/6_results_sim_co2tax.json), [7_export_sim_co2tax.csv](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/signoff/artifacts/7_export_sim_co2tax.csv) | Show one full path in video; keep others as backup |
| Lifecycle guards are explicit and safe | [10_lifecycle_409.json](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/signoff/artifacts/10_lifecycle_409.json), [11_not_found_404.json](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/signoff/artifacts/11_not_found_404.json) | Use for trust narrative |
| Challenge roundtrip is implemented | [8_challenge_generate.json](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/signoff/artifacts/8_challenge_generate.json), [9_challenge_followup.json](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/signoff/artifacts/9_challenge_followup.json) | Use as "policy refinement loop" proof |
| Run telemetry improves explainability | [5_status_sim_ubitest.json](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/signoff/artifacts/5_status_sim_ubitest.json) | Highlight `run_telemetry` object |
| Technical reliability gates are met | [docs/frontend/SIGNOFF_EVIDENCE_2026-05-13.md](/Users/jeremyalv/Documents/4-Engineering/gemma-policy-simulator/docs/frontend/SIGNOFF_EVIDENCE_2026-05-13.md) | Includes backend/FE test and contract checks |

## Submission consistency checks

Before final submit:

1. Every writeup section cites at least one file above.
2. Video scenes map to one API artifact each.
3. README limitation notes match writeup limitation notes.
4. Live demo link opens in incognito without login.
