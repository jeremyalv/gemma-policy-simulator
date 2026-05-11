# Data Contracts

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

## API Envelope (V1)
All JSON responses follow:
- `data`: object, array, or `null`
- `error`: `null` or `{ code, message }`
- `meta`: object for pagination, request id, timing, etc.

## Simulation Status Enum
Allowed values:
- `pending`
- `running`
- `completed`
- `failed`

## Canonical Persona Schema (V1)
Required fields:
- `persona_id` (string)
- `full_name` (string)
- `age` (integer)
- `gender` (string)
- `occupation` (string)
- `household_income` (number)
- `education` (string)
- `ethnicity` (string)
- `city` (string)
- `state` (string)
- `zcta` (string)

Optional fields:
- `key_concerns` (array[string])
- `household_size` (integer)
- `commute_mode` (string)

## Create Simulation Request Schema
- `title` (string)
- `policy_text` (string)
- `dataset` (string)
- `sample_size` (integer, `20-2000`)
- `filters` (object, optional)

`filters` optional keys:
- Keys and support status are frozen in `V1 Freeze (Approved)`.

## Run Simulation Request Schema
- `profile` (string, optional): `interactive|balanced|thorough|auto`
- `max_duration_seconds` (integer, optional)
- `allow_sample_clamp` (boolean, optional, default `true`)
- `use_refined_prompt` (boolean, optional, default `true`)

## Run/Status Metadata Schema
- `effective_sample_size` (integer)
- `device_profile` (string, example: `m1_pro_16gb`, `low_spec_laptop`)
- `runtime_profile` (string, one of run profiles)
- `batch_size` (integer, optional)
- `run_telemetry` (object, required in `GET /simulations/{id}/status`) with:
  - `retry_count` (integer)
  - `invalid_output_count` (integer)
  - `failure_code` (string, nullable)
  - `failure_message` (string, nullable)
  - `failed_persona_id` (string, nullable)

## Agent Response Schema (V1)
Each simulated agent must return valid JSON:
- `approval` (integer: 1-5)
- `emotion` (string)
- `rationale` (string, 2-3 sentences)
- `behavior_change` (boolean, optional)

## Clarification Loop Schema
Clarification question response:
- `clarification_id` (string)
- `simulation_id` (string)
- `question_text` (string)
- `rationale` (string)
- `status` (enum: `open|resolved`)
- `turn_index` (integer)

Clarification answer response:
- `simulation_id` (string)
- `clarification_status` (enum: `none|in_progress|resolved`)
- `refined_policy_text` (string)
- `next_clarification_id` (string, nullable)
- `next_question_text` (string, nullable)

Rules:
- Behavior is frozen in `V1 Freeze (Approved) -> Normative Contract Rules (Frozen for V1)`.

## Simulation Metadata Schema
- `simulation_id` (string)
- `created_at` (ISO timestamp)
- `started_at` (ISO timestamp, optional)
- `completed_at` (ISO timestamp, optional)
- `policy_text` (string)
- `sample_size` (integer)
- `dataset_version` (string)
- `model_name` (string)
- `prompt_template_version` (string)
- `sampling_seed` (integer, optional)
- `runtime_profile` (string, optional)
- `effective_sample_size` (integer, optional)
- `refined_policy_text` (string, optional)

## Nemotron Baseline Mapping (Current Split)
Raw-to-canonical mapping for the currently observed Nemotron columns:

| Canonical field | Raw source | Mapping note |
|---|---|---|
| `persona_id` | `uuid` | Direct map. |
| `age` | `age` | Direct map. |
| `gender` | `sex` | Normalize enum values. |
| `occupation` | `occupation` | Direct map. |
| `education` | `education_level` | Direct map. |
| `city` | `city` | Direct map. |
| `state` | `state` | Direct map. |
| `zcta` | `zipcode` | Direct map/rename. |
| `full_name` | `persona` and persona text fields | Parse if present; fallback to deterministic synthetic label when absent. |
| `household_income` | dataset-dependent | Not explicitly available in current split; treat as nullable/unsupported filter. |
| `ethnicity` | dataset-dependent | Not explicitly available in current split; treat as nullable/unsupported filter. |

Prompt-context enrichment fields (raw text columns):
- `professional_persona`
- `sports_persona`
- `arts_persona`
- `travel_persona`
- `culinary_persona`
- `persona`
- `cultural_background`
- `skills_and_expertise`
- `skills_and_expertise_list`
- `hobbies_and_interests`
- `hobbies_and_interests_list`
- `career_goals_and_ambitions`
