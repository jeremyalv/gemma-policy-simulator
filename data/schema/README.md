# Data Schema

This directory defines canonical schema references for synthetic persona datasets used by SIMS.

Current target:
- Nemotron-style persona tables (Parquet/CSV) adapted into canonical fields.

## Nemotron Raw Columns (Current Baseline)
Baseline from dataset viewer for the `train` split:

| Column | Raw type/profile | Notes |
|---|---|---|
| `uuid` | `string` (length 32, 100%) | Stable row identifier. |
| `professional_persona` | `string` (lengths `237-345`, ~59.1%) | Narrative text persona (professional context). |
| `sports_persona` | `string` (lengths `288-360`, ~54.2%) | Narrative text persona (sports context). |
| `arts_persona` | `string` (lengths `215-304`, ~27.4%) | Narrative text persona (arts context). |
| `travel_persona` | `string` (lengths `238-333`, ~53.2%) | Narrative text persona (travel context). |
| `culinary_persona` | `string` (lengths `265-355`, ~65.2%) | Narrative text persona (culinary context). |
| `persona` | `string` (lengths `199-247`, ~44%) | General narrative persona. |
| `cultural_background` | `string` (lengths `385-543`, ~13.8%) | Long-form cultural context. |
| `skills_and_expertise` | `string` (lengths `326-513`, ~9.2%) | Long-form capability narrative. |
| `skills_and_expertise_list` | `string` (lengths `212-317`, ~46.8%) | List-style expertise text. |
| `hobbies_and_interests` | `string` (lengths `438-592`, ~30.3%) | Long-form hobby narrative. |
| `hobbies_and_interests_list` | `string` (lengths `164-245`, ~43.4%) | List-style hobby text. |
| `career_goals_and_ambitions` | `string` (lengths `259-408`, ~5%) | Long-form future goals narrative. |
| `sex` | `string` classes (example dominant class `Female`, ~50.5%) | Structured demographic. |
| `age` | `int64` (example bucket `22-32`, ~14.8%) | Structured demographic. |
| `marital_status` | `string` classes (example `never_married`, ~46.5%) | Structured demographic. |
| `education_level` | `string` classes (example `high_school`, ~21.3%) | Structured demographic. |
| `bachelors_field` | `string` classes (sparse / often empty) | Structured but sparse. |
| `occupation` | `string` classes (example `fast_food_or_counter_worker`, ~0.2%) | Structured demographic. |
| `city` | `string` | Structured location field. |
| `state` | `string` classes (example `WI`, ~1.8%) | Structured location field. |
| `zipcode` | `string` | Structured location field. |
| `country` | `string` classes (example `USA`) | Structured location field. |

## Adapter Implications
- Use `uuid` as canonical `persona_id`.
- Use structured fields (`sex`, `age`, `marital_status`, `education_level`, `occupation`, `city`, `state`, `zipcode`, `country`) for filtering/segmentation.
- Treat text persona columns as prompt context inputs.
- Do not assume explicit numeric income/ethnicity columns in this split; mark these capabilities as dataset-dependent.
