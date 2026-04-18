# Data Contracts

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
- `sample_size` (integer)
- `filters` (object, optional)

`filters` optional keys:
- `states` (array[string])
- `income_brackets` (array[string], dataset-dependent; unsupported on current Nemotron split)
- `age_range` (array[integer, integer])

## Run Simulation Request Schema
- `profile` (string, optional): `interactive|balanced|thorough|auto`
- `max_duration_seconds` (integer, optional)
- `allow_sample_clamp` (boolean, optional, default `true`)

## Run/Status Metadata Schema
- `effective_sample_size` (integer)
- `device_profile` (string, example: `m1_pro_16gb`, `low_spec_laptop`)
- `runtime_profile` (string, one of run profiles)
- `batch_size` (integer, optional)

## Agent Response Schema (V1)
Each simulated agent must return valid JSON:
- `approval` (integer: 1-5)
- `emotion` (string)
- `rationale` (string, 2-3 sentences)
- `behavior_change` (boolean, optional)

## Challenge Loop Schema
Challenge response:
- `challenge_id` (string)
- `challenge_text` (string)
- `evidence` (object)

Follow-up response:
- `followup_text` (string)
- `suggested_policy_refinement` (string)
- `next_challenge_id` (string)

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
