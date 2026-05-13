/**
 * Zod schema for the Create Simulation form.
 * Mirrors OpenAPI CreateSimulationRequest exactly.
 *
 * Contract guardrails enforced here:
 * - sample_size: integer 20–2000
 * - age_range: [min, max] tuple, both 18–100, min <= max
 * - Forbidden keys (income_brackets, household_income, ethnicity) are
 *   absent from the FilterSet type — they cannot be submitted.
 */

import { z } from 'zod'
import {
  SAMPLE_MIN, SAMPLE_MAX, AGE_MIN, AGE_MAX,
  US_STATES, SEX_OPTIONS, MARITAL_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS, OCCUPATION_OPTIONS,
} from './constants'

const stateValues    = US_STATES.map((s) => s.value)
const sexValues      = SEX_OPTIONS.map((s) => s.value)
const maritalValues  = MARITAL_STATUS_OPTIONS.map((s) => s.value)
const educationValues = EDUCATION_LEVEL_OPTIONS.map((s) => s.value)
const occupationValues = OCCUPATION_OPTIONS.map((s) => s.value)

// ── FilterSet ─────────────────────────────────────────────────────────────────
export const FilterSetSchema = z.object({
  states: z
    .array(z.enum(stateValues as [string, ...string[]]))
    .optional(),

  age_range: z
    .tuple([z.number().int().min(AGE_MIN).max(AGE_MAX), z.number().int().min(AGE_MIN).max(AGE_MAX)])
    .refine(([min, max]) => min <= max, { message: 'Min age must be ≤ max age' })
    .optional(),

  sex: z
    .array(z.enum(sexValues as [string, ...string[]]))
    .optional(),

  marital_status: z
    .array(z.enum(maritalValues as [string, ...string[]]))
    .optional(),

  education_level: z
    .array(z.enum(educationValues as [string, ...string[]]))
    .optional(),

  occupation: z
    .array(z.enum(occupationValues as [string, ...string[]]))
    .optional(),
})

// ── Full form schema ──────────────────────────────────────────────────────────
export const CreateSimulationSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title must be 120 characters or less'),

  policy_text: z
    .string()
    .min(20, 'Policy description must be at least 20 characters')
    .max(4000, 'Policy description must be 4000 characters or less'),

  dataset: z
    .string()
    .min(1, 'Please select a dataset'),

  sample_size: z
    .number({ invalid_type_error: 'Sample size must be a number' })
    .int('Sample size must be a whole number')
    .min(SAMPLE_MIN, `Minimum sample size is ${SAMPLE_MIN}`)
    .max(SAMPLE_MAX, `Maximum sample size is ${SAMPLE_MAX}`),

  filters: FilterSetSchema.optional(),

  // Runtime profile — passed to POST /run (not POST /simulations)
  runtime_profile: z.enum(['interactive', 'balanced', 'thorough', 'auto']).default('auto'),

  // UI-only fields — not sent to the API
  sector: z.array(z.string()).optional(),
  sample_justification: z.string().max(500, 'Justification must be 500 characters or less').optional(),
})

export type CreateSimulationFormValues = z.infer<typeof CreateSimulationSchema>
export type FilterSetValues = z.infer<typeof FilterSetSchema>

// ── Default form values ───────────────────────────────────────────────────────
export const CREATE_FORM_DEFAULTS: CreateSimulationFormValues = {
  title: '',
  policy_text: '',
  dataset: 'nemotron_usa',
  sample_size: 500,
  runtime_profile: 'auto',
  filters: {},
  sector: [],
  sample_justification: '',
}
