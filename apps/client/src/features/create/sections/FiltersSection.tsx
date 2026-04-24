/**
 * FiltersSection — collapsible accordion with all demographic filters.
 * Section 4 of the Create Simulation form.
 *
 * Supported filter dimensions (Nemotron-USA):
 *   states, age_range, sex, marital_status, education_level, occupation
 *
 * NOT included (contract: unsupported, would trigger 400 UNSUPPORTED_FILTER):
 *   income_brackets, household_income, ethnicity
 */

import {
  Stack, Box, Text, Group, Badge, Checkbox,
  MultiSelect, RangeSlider, Accordion,
  ActionIcon, Tooltip,
} from '@mantine/core'
import { RotateCcw, Info } from 'lucide-react'
import type { UseFormReturnType } from '@mantine/form'
import type { CreateSimulationFormValues } from '../schema'
import {
  US_STATES, SEX_OPTIONS, MARITAL_STATUS_OPTIONS,
  EDUCATION_LEVEL_OPTIONS, OCCUPATION_OPTIONS,
  AGE_MIN, AGE_MAX,
} from '../constants'

interface FiltersSectionProps {
  form: UseFormReturnType<CreateSimulationFormValues>
}

// ── Accordion panel header ────────────────────────────────────────────────────
function PanelHeader({
  label,
  activeCount,
  onReset,
}: {
  label: string
  activeCount: number
  onReset: () => void
}) {
  return (
    <Group justify="space-between" wrap="nowrap" style={{ flex: 1 }}>
      <Group gap={8}>
        <Text size="sm" fw={500} c="var(--color-text-primary)">{label}</Text>
        {activeCount > 0 && (
          <Badge
            size="xs"
            style={{
              backgroundColor: 'var(--color-accent-primary-subtle)',
              color: 'var(--color-accent-primary)',
              border: '1px solid var(--color-accent-primary)',
            }}
          >
            {activeCount} selected
          </Badge>
        )}
      </Group>
      {activeCount > 0 && (
        <Tooltip label="Clear filter" position="top">
          <ActionIcon
            size="xs"
            variant="subtle"
            color="gray"
            onClick={(e) => { e.stopPropagation(); onReset() }}
          >
            <RotateCcw size={11} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  )
}

// ── Checkbox group ────────────────────────────────────────────────────────────
function CheckboxGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  return (
    <Stack gap={6} pt={4}>
      {options.map((opt) => (
        <Checkbox
          key={opt.value}
          label={opt.label}
          size="sm"
          checked={value.includes(opt.value)}
          onChange={(e) => {
            if (e.currentTarget.checked) {
              onChange([...value, opt.value])
            } else {
              onChange(value.filter((v) => v !== opt.value))
            }
          }}
          styles={{
            label: { fontSize: 13, color: 'var(--color-text-secondary)' },
            input: { borderColor: 'var(--color-border-default)' },
          }}
        />
      ))}
    </Stack>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function FiltersSection({ form }: FiltersSectionProps) {
  const filters = form.values.filters ?? {}

  function setFilter<K extends keyof typeof filters>(key: K, val: (typeof filters)[K]) {
    form.setFieldValue(`filters.${key}` as never, val as never)
  }

  function clearFilter(key: keyof typeof filters) {
    form.setFieldValue(`filters.${key}` as never, undefined as never)
  }

  const states       = filters.states       ?? []
  const ageRange     = (filters.age_range   as [number, number] | undefined) ?? [AGE_MIN, AGE_MAX]
  const sex          = filters.sex          ?? []
  const marital      = filters.marital_status ?? []
  const education    = filters.education_level ?? []
  const occupation   = filters.occupation   ?? []

  const ageActive = ageRange[0] !== AGE_MIN || ageRange[1] !== AGE_MAX

  // Count active filters for the top-level summary
  const totalActive =
    states.length +
    (ageActive ? 1 : 0) +
    sex.length +
    marital.length +
    education.length +
    occupation.length

  return (
    <Stack gap="sm">
      {/* Header with total active filters */}
      <Group gap={8} align="center">
        <Text size="xs" c="var(--color-text-tertiary)" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Info size={12} />
          Leave all blank to include all demographics (recommended for broad analysis)
        </Text>
        {totalActive > 0 && (
          <Badge size="xs" color="blue" variant="light">
            {totalActive} filter{totalActive !== 1 ? 's' : ''} active
          </Badge>
        )}
      </Group>

      <Accordion
        multiple
        variant="separated"
        styles={{
          item: {
            borderRadius: 8,
            border: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-bg-surface)',
          },
          control: {
            padding: '10px 14px',
          },
          content: {
            padding: '0 14px 14px',
          },
          chevron: { display: 'none' },
        }}
      >

        {/* ── States ─────────────────────────────────────────────────── */}
        <Accordion.Item value="states">
          <Accordion.Control>
            <PanelHeader
              label="States"
              activeCount={states.length}
              onReset={() => clearFilter('states')}
            />
          </Accordion.Control>
          <Accordion.Panel>
            <MultiSelect
              data={US_STATES}
              value={states}
              onChange={(v) => setFilter('states', v)}
              placeholder="Search and select states…"
              searchable
              clearable
              maxDropdownHeight={240}
              styles={{
                input: {
                  backgroundColor: 'var(--color-bg-subtle)',
                  borderColor: 'var(--color-border-default)',
                },
              }}
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* ── Age range ──────────────────────────────────────────────── */}
        <Accordion.Item value="age_range">
          <Accordion.Control>
            <PanelHeader
              label={`Age Range${ageActive ? ` (${ageRange[0]}–${ageRange[1]})` : ''}`}
              activeCount={ageActive ? 1 : 0}
              onReset={() => clearFilter('age_range')}
            />
          </Accordion.Control>
          <Accordion.Panel>
            <Box px={8} pt={8} pb={4}>
              <RangeSlider
                min={AGE_MIN}
                max={AGE_MAX}
                step={1}
                value={ageRange}
                onChange={(v) => setFilter('age_range', v)}
                label={(v) => `${v} yrs`}
                marks={[
                  { value: 18,  label: '18' },
                  { value: 35,  label: '35' },
                  { value: 55,  label: '55' },
                  { value: 65,  label: '65' },
                  { value: 100, label: '100' },
                ]}
                styles={{
                  root: { paddingBottom: 24 },
                  bar:  { backgroundColor: 'var(--color-accent-primary)' },
                  thumb: {
                    borderColor: 'var(--color-accent-primary)',
                    backgroundColor: '#fff',
                  },
                  markLabel: { fontSize: 11, color: 'var(--color-text-tertiary)' },
                }}
              />
            </Box>
          </Accordion.Panel>
        </Accordion.Item>

        {/* ── Sex ────────────────────────────────────────────────────── */}
        <Accordion.Item value="sex">
          <Accordion.Control>
            <PanelHeader
              label="Sex"
              activeCount={sex.length}
              onReset={() => clearFilter('sex')}
            />
          </Accordion.Control>
          <Accordion.Panel>
            <CheckboxGroup
              options={SEX_OPTIONS}
              value={sex}
              onChange={(v) => setFilter('sex', v)}
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* ── Marital status ──────────────────────────────────────────── */}
        <Accordion.Item value="marital_status">
          <Accordion.Control>
            <PanelHeader
              label="Marital Status"
              activeCount={marital.length}
              onReset={() => clearFilter('marital_status')}
            />
          </Accordion.Control>
          <Accordion.Panel>
            <CheckboxGroup
              options={MARITAL_STATUS_OPTIONS}
              value={marital}
              onChange={(v) => setFilter('marital_status', v)}
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* ── Education level ─────────────────────────────────────────── */}
        <Accordion.Item value="education_level">
          <Accordion.Control>
            <PanelHeader
              label="Education Level"
              activeCount={education.length}
              onReset={() => clearFilter('education_level')}
            />
          </Accordion.Control>
          <Accordion.Panel>
            <CheckboxGroup
              options={EDUCATION_LEVEL_OPTIONS}
              value={education}
              onChange={(v) => setFilter('education_level', v)}
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* ── Occupation ──────────────────────────────────────────────── */}
        <Accordion.Item value="occupation">
          <Accordion.Control>
            <PanelHeader
              label="Occupation"
              activeCount={occupation.length}
              onReset={() => clearFilter('occupation')}
            />
          </Accordion.Control>
          <Accordion.Panel>
            <MultiSelect
              data={OCCUPATION_OPTIONS}
              value={occupation}
              onChange={(v) => setFilter('occupation', v)}
              placeholder="Search and select occupations…"
              searchable
              clearable
              maxDropdownHeight={240}
              styles={{
                input: {
                  backgroundColor: 'var(--color-bg-subtle)',
                  borderColor: 'var(--color-border-default)',
                },
              }}
            />
          </Accordion.Panel>
        </Accordion.Item>

      </Accordion>
    </Stack>
  )
}
