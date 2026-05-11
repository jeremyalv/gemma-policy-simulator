# Frontend <-> Backend API Contract (V1)

## V1 Freeze (Approved)
- Status: `Approved`
- Date: `2026-04-18`
- Scope reference: `Issue #20` (`[HITL] Freeze V1 API contract, Nemotron capability matrix, and clarification behavior`)

### Frozen Nemotron Capability Matrix (`dataset=nemotron_usa`)
Filter keys:

| Key | Status |
|---|---|
| `states` | supported |
| `age_range` | supported |
| `sex` | supported |
| `marital_status` | supported |
| `education_level` | supported |
| `occupation` | supported |
| `income_brackets` | unsupported |
| `household_income` | unsupported |
| `ethnicity` | unsupported |

Segmentation keys:

| Key | Status |
|---|---|
| `by_age_group` | supported |
| `by_marital_status` | supported |
| `by_state` | supported |
| `by_occupation_group` | supported |
| `by_income_bracket` | unsupported |
| `by_ethnicity` | unsupported |

### Normative Contract Rules (Frozen for V1)
- `POST /simulations` must reject any request containing one or more unsupported filter keys.
- Rejected filter requests must return `400` with `error.code=UNSUPPORTED_FILTER`.
- Filter rejection is strict: no partial acceptance and no silent key dropping.
- Clarification loop is optional and non-blocking for `/simulations/{id}/run`.
- Clarifications are multi-turn (`turn_index` increases until resolved or user skips).
- Clarification transcript is ephemeral and must not be persisted in simulation history.
- Only final `refined_policy_text` may be persisted.
- `POST /simulations/{id}/run` with `use_refined_prompt=true` must use `refined_policy_text` when available; otherwise it must use base `policy_text`.

### Contract Validation Scenarios
1. Supported filter set request is accepted.
2. Unsupported-only filter request returns `400` + `UNSUPPORTED_FILTER`.
3. Mixed supported + unsupported filters returns `400` + `UNSUPPORTED_FILTER`.
4. User can call `/run` without any clarification turns.
5. Multi-turn clarification flow can continue across turns.
6. Only `refined_policy_text` is retained in simulation history; no clarification transcript persistence.

## Base URL
`http://localhost:8000/api/v1`

## Response Envelope
All successful and failed responses use:

```json
{
  "data": {},
  "error": null,
  "meta": {}
}
```

Error responses use standard HTTP status codes and set `data` to `null`:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "sample_size must be between 20 and 2000"
  },
  "meta": {
    "request_id": "req_123"
  }
}
```

## Simulation Lifecycle
`pending -> running -> completed | failed`

## Simulations

### POST `/simulations`
Create a new simulation draft (does not run inference).

Request:
```json
{
  "title": "Carbon tax $50/tonne",
  "policy_text": "A federal carbon tax of $50 per tonne of CO2...",
  "dataset": "nemotron_usa",
  "sample_size": 500,
  "filters": {
    "states": ["CA", "TX", "FL"],
    "sex": ["Female"],
    "age_range": [18, 65],
    "education_level": ["high_school", "bachelors"]
  }
}
```

Filter behavior:
- Filters are dataset-capability-aware and follow the frozen matrix in `V1 Freeze (Approved)`.
- Unsupported filter handling follows `Normative Contract Rules (Frozen for V1)`.

Response `201`:
```json
{
  "data": {
    "id": "sim_abc123",
    "title": "Carbon tax $50/tonne",
    "policy_text": "A federal carbon tax of $50 per tonne of CO2...",
    "status": "pending",
    "dataset": "nemotron_usa",
    "sample_size": 500,
    "filters": {
      "states": ["CA", "TX", "FL"],
      "sex": ["Female"],
      "age_range": [18, 65],
      "education_level": ["high_school", "bachelors"]
    },
    "created_at": "2026-04-18T10:00:00Z"
  },
  "error": null,
  "meta": {
    "request_id": "req_001"
  }
}
```

### POST `/simulations/{id}/run`
Trigger asynchronous inference for a simulation.
Runs with refined prompt text when available and `use_refined_prompt=true`.

Request (optional):
```json
{
  "profile": "balanced",
  "max_duration_seconds": 180,
  "allow_sample_clamp": true,
  "use_refined_prompt": true
}
```

Response `202`:
```json
{
  "data": {
    "id": "sim_abc123",
    "status": "running",
    "started_at": "2026-04-18T10:01:00Z",
    "estimated_seconds": 75,
    "runtime_profile": "balanced",
    "effective_sample_size": 180
  },
  "error": null,
  "meta": {
    "request_id": "req_002",
    "device_profile": "m1_pro_16gb"
  }
}
```

### GET `/simulations/{id}/status`
Poll run progress.

Response `200`:
```json
{
  "data": {
    "id": "sim_abc123",
    "status": "running",
    "agents_total": 500,
    "agents_completed": 212,
    "progress_pct": 42.4,
    "estimated_seconds_remaining": 44,
    "runtime_profile": "balanced",
    "effective_sample_size": 180,
    "run_telemetry": {
      "retry_count": 3,
      "invalid_output_count": 1,
      "failure_code": null,
      "failure_message": null,
      "failed_persona_id": null
    }
  },
  "error": null,
  "meta": {
    "request_id": "req_003",
    "device_profile": "m1_pro_16gb"
  }
}
```

### GET `/simulations/{id}/results`
Fetch full aggregated results once status is `completed`.

Response `200`:
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
      "effective_sample_size": 180
    },
    "demographic_breakdown": {
      "by_age_group": {
        "18-34": { "mean_approval": 3.6, "count": 130 },
        "35-54": { "mean_approval": 3.1, "count": 220 },
        "55+": { "mean_approval": 2.7, "count": 150 }
      },
      "by_marital_status": {
        "never_married": { "mean_approval": 3.0, "count": 190 },
        "married": { "mean_approval": 3.4, "count": 210 },
        "divorced_or_widowed": { "mean_approval": 3.1, "count": 100 }
      },
      "by_state": {
        "CA": 3.5,
        "TX": 2.8,
        "FL": 3.0
      },
      "by_occupation_group": {}
    },
    "emotion_profile": {
      "anger": 18.2,
      "concern": 34.1,
      "neutral": 22.0,
      "hope": 19.4,
      "joy": 6.3
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
        "rationale": "As someone balancing tight monthly expenses, I worry this policy raises household costs before local relief is clear..."
      }
    ],
    "raw_responses_url": "/api/v1/simulations/sim_abc123/export"
  },
  "error": null,
  "meta": {
    "request_id": "req_004"
  }
}
```

Error responses:
- `404 NOT_FOUND` when the simulation id does not exist.
- `409 SIMULATION_NOT_COMPLETE` when status is `pending` or `running`.
- `409 SIMULATION_FAILED` when status is `failed`.

### GET `/simulations`
List all simulations (history view).

Query params:
`?page=1&limit=20&status=completed&sort=created_at:desc`

Response `200`:
```json
{
  "data": [
    {
      "id": "sim_abc123",
      "title": "Carbon tax $50/tonne",
      "status": "completed",
      "sample_size": 500,
      "mean_approval": 3.2,
      "created_at": "2026-04-18T10:00:00Z",
      "completed_at": "2026-04-18T10:02:18Z"
    }
  ],
  "error": null,
  "meta": {
    "total": 14,
    "page": 1,
    "limit": 20,
    "request_id": "req_005"
  }
}
```

### DELETE `/simulations/{id}`
Delete a simulation and its artifacts.

Response `200`:
```json
{
  "data": {
    "id": "sim_abc123",
    "deleted": true
  },
  "error": null,
  "meta": {
    "request_id": "req_006"
  }
}
```

## Pre-Run Clarification Loop (Optional)

Normative behavior is defined in `V1 Freeze (Approved) -> Normative Contract Rules (Frozen for V1)`.

### POST `/simulations/{id}/clarifications/generate`
Generate the next clarification question to improve prompt quality before inference.

Request:
```json
{
  "focus": "policy_scope"
}
```

Response `200`:
```json
{
  "data": {
    "clarification_id": "cl_001",
    "simulation_id": "sim_abc123",
    "question_text": "Who specifically receives the carbon tax rebate, and how is eligibility determined?",
    "rationale": "Targeting rules materially affect acceptance across demographic segments.",
    "status": "open",
    "turn_index": 1
  },
  "error": null,
  "meta": {
    "request_id": "req_007"
  }
}
```

### POST `/clarifications/{clarification_id}/answer`
Submit user answer and receive updated refined prompt plus optional next question.

Request:
```json
{
  "simulation_id": "sim_abc123",
  "user_response": "Rebates apply to households under 150% of poverty line, paid monthly."
}
```

Response `200`:
```json
{
  "data": {
    "simulation_id": "sim_abc123",
    "clarification_status": "in_progress",
    "refined_policy_text": "A federal carbon tax of $50 per tonne of CO2 with monthly rebates for households below 150% of poverty line...",
    "next_clarification_id": "cl_002",
    "next_question_text": "Should rebate amounts vary by regional energy costs?"
  },
  "error": null,
  "meta": {
    "request_id": "req_008"
  }
}
```

### GET `/simulations/{id}/clarifications`
Fetch current clarification state for the draft simulation.

Response `200`:
```json
{
  "data": {
    "simulation_id": "sim_abc123",
    "clarification_status": "in_progress",
    "has_open_question": true,
    "latest_refined_policy_text": "A federal carbon tax of $50 per tonne of CO2 with monthly rebates..."
  },
  "error": null,
  "meta": {
    "request_id": "req_010"
  }
}
```

## Datasets

### GET `/datasets`
List available synthetic datasets.

Response `200`:
```json
{
  "data": [
    {
      "id": "nemotron_usa",
      "name": "NVIDIA Nemotron USA",
      "description": "6M synthetic personas, census-aligned",
      "size": 6000000,
      "attributes": [
        "age",
        "gender",
        "occupation",
        "income",
        "ethnicity",
        "zcta",
        "city",
        "state"
      ],
      "license": "CC BY 4.0"
    },
    {
      "id": "sims_indo_v1",
      "name": "SIMS Indonesia V1",
      "description": "Handmade synthetic dataset for Indonesia",
      "status": "coming_v2"
    }
  ],
  "error": null,
  "meta": {
    "request_id": "req_009"
  }
}
```

## Export

### GET `/simulations/{id}/export`
Download raw per-agent responses as CSV.

Response: `200` with `Content-Type: text/csv` stream.

## Planned V2 Endpoints
- `POST /simulations/compare`
- `GET /simulations/{id}/recommendations`

## Status Codes
- `200` success
- `201` created
- `202` accepted (async run started)
- `400` bad request / validation error
- `404` resource not found
- `409` conflict (for example simulation already running)
- `500` internal or inference runtime failure

## Validation and Idempotency
- `sample_size` must be `20-2000` for V1 stability.
- `age_range` must satisfy `min <= max`.
- `dataset` must exist in `GET /datasets`.
- `POST /simulations` supports optional `Idempotency-Key` header.
- `POST /simulations/{id}/run` supports optional `Idempotency-Key` header.
- Server may reduce requested `sample_size` based on device capability if `allow_sample_clamp=true`.
- If clamped, server returns `effective_sample_size` in run/status/results payloads.

## System Design Notes
- Async run pattern: `POST /run` returns `202`; frontend polls `/status` every 2-3 seconds.
- Create/run separation: supports draft/review workflows before expensive inference.
- Clarification loop is optional and multi-turn: user may skip and run directly.
- Clarification Q/A is ephemeral; only final refined prompt text is persisted.
- Runtime profiles (`interactive|balanced|thorough|auto`) enable M1/lower-spec friendly execution.

## Client/Server Integration Notes
- Frontend consumes shared types from `packages/contracts`.
- Backend owns endpoint behavior and validation; frontend owns UX states and retries.
- Any response-shape change requires synchronized updates to contract docs and shared types.
