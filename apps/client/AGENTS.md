# Client Guidance

- Treat `packages/contracts` as the source of API truth.
- Do not hardcode response shapes outside typed adapters.
- Handle async states explicitly: pending, running, completed, failed.
- Keep polling and error-retry behavior deterministic and observable.
- Expose runtime profile selection (`interactive|balanced|thorough|auto`) in run UI.
- Always display effective sample size when server clamps requested values.
- Support optional multi-turn pre-run clarifications and allow explicit skip.
