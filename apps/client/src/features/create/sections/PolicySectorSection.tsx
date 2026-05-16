/**
 * PolicySectorSection — multi-select policy domain/sector picker.
 * 9 domains, 50+ sub-options. Values stored in form.sector[].
 *
 * IMPORTANT: sector[] is NOT sent to the API and does NOT affect model output.
 * It is saved as metadata for the user's own reference and simulation organization.
 * TODO: wire sector tags to backend context retrieval so they actually influence
 * which news/polling sources are prioritized during inference.
 */

import { useState } from 'react'
import { Stack, Text, Box, Group, Badge, Collapse, UnstyledButton } from '@mantine/core'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { UseFormReturnType } from '@mantine/form'
import type { CreateSimulationFormValues } from '../schema'

interface PolicySectorSectionProps {
  form: UseFormReturnType<CreateSimulationFormValues>
}

interface SectorDomain {
  id: string
  label: string
  color: string
  emoji: string
  guidance: string
  options: string[]
}

const DOMAINS: SectorDomain[] = [
  {
    id: 'education',
    label: 'Education',
    color: '#0369A1',
    emoji: '📚',
    guidance: 'Select if your policy affects schools, universities, student financing, or training programmes.',
    options: [
      'K–12 Curriculum', 'Higher Education Funding', 'Student Loan Relief',
      'School Choice & Vouchers', 'Teacher Pay & Standards',
      'Early Childhood Education', 'Vocational Training', 'Digital Literacy',
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    color: '#0D9488',
    emoji: '🏥',
    guidance: 'Select if your policy affects health insurance, hospital access, prescription drugs, or public health.',
    options: [
      'Public Health Insurance', 'Prescription Drug Pricing', 'Mental Health Access',
      'Hospital & Emergency Services', 'Preventive Care', 'Reproductive Health',
      'Elderly & Long-term Care', 'Dental & Vision Coverage',
    ],
  },
  {
    id: 'climate',
    label: 'Environment & Climate',
    color: '#15803D',
    emoji: '🌿',
    guidance: 'Select if your policy affects emissions, energy sources, land use, or environmental protection.',
    options: [
      'Carbon Tax / Cap-and-Trade', 'Renewable Energy Incentives',
      'Fossil Fuel Regulation', 'Land & Water Conservation',
      'Electric Vehicle Policy', 'Plastic & Waste Reduction',
      'Climate Adaptation Infrastructure', 'Industrial Emissions Standards',
    ],
  },
  {
    id: 'housing',
    label: 'Housing & Urban',
    color: '#B45309',
    emoji: '🏘️',
    guidance: 'Select if your policy affects housing supply, rent, homelessness, or urban development.',
    options: [
      'Affordable Housing Construction', 'Rent Control & Stabilisation',
      'Zoning & Land Use Reform', 'Homelessness Support',
      'Homeownership Assistance', 'Public Housing Management',
      'Urban Renewal & Gentrification', 'Short-term Rental Regulation',
    ],
  },
  {
    id: 'economy',
    label: 'Economy & Labor',
    color: '#7C3AED',
    emoji: '💼',
    guidance: 'Select if your policy affects wages, employment, taxation, or economic welfare programmes.',
    options: [
      'Minimum Wage', 'Universal Basic Income', 'Unemployment Benefits',
      'Corporate Tax Policy', 'Trade & Tariffs', 'Small Business Support',
      'Gig Economy Regulation', 'Union Rights & Collective Bargaining',
      'Wealth Inequality', 'Childcare Subsidies',
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure & Transport',
    color: '#0369A1',
    emoji: '🚆',
    guidance: 'Select if your policy affects roads, rail, broadband, energy grids, or public transit.',
    options: [
      'High-speed Rail', 'Public Transit Funding', 'Highway & Road Maintenance',
      'Rural Broadband Access', 'Airport Infrastructure',
      'Smart City Technology', 'Water & Sewage Systems', 'Energy Grid Modernisation',
    ],
  },
  {
    id: 'safety',
    label: 'Public Safety & Justice',
    color: '#B91C1C',
    emoji: '⚖️',
    guidance: 'Select if your policy affects policing, criminal justice, firearms, or national security.',
    options: [
      'Criminal Justice Reform', 'Police Funding & Oversight',
      'Gun Policy & Firearms Regulation', 'Drug Decriminalisation',
      'Prison Reform & Rehabilitation', 'Domestic Violence Policy',
      'Cybersecurity & Digital Crime', 'Border Security',
    ],
  },
  {
    id: 'social',
    label: 'Social Policy',
    color: '#0D9488',
    emoji: '🤝',
    guidance: 'Select if your policy affects families, immigration, civil rights, or social welfare.',
    options: [
      'Immigration Reform', 'Family Leave & Parental Benefits',
      'Anti-discrimination Law', 'Elder Care Policy',
      'Disability Support', 'Child Welfare', 'Food Assistance (SNAP)',
      'Refugee & Asylum Policy', 'Veterans Benefits',
    ],
  },
  {
    id: 'digital',
    label: 'Digital & Technology',
    color: '#6D28D9',
    emoji: '💻',
    guidance: 'Select if your policy affects data privacy, AI, social media, digital markets, or tech regulation.',
    options: [
      'Data Privacy & GDPR-style Rules', 'AI Regulation & Safety',
      'Social Media Accountability', 'Antitrust / Big Tech',
      'Digital Currency & Fintech', 'Open Internet / Net Neutrality',
      'E-government & Digital IDs', 'Cybersecurity Standards',
    ],
  },
]

export function PolicySectorSection({ form }: PolicySectorSectionProps) {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())

  const selected: string[] = form.values.sector ?? []

  function toggle(opt: string) {
    const next = selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt]
    form.setFieldValue('sector', next)
  }

  function toggleDomain(id: string) {
    setExpandedDomains((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Stack gap="sm">
      <Text size="xs" c="var(--color-text-tertiary)" lh={1.5}>
        Tag the policy domain(s) for your own reference and for organizing simulations.
        These tags are saved with your simulation record — they do not currently affect model output or persona weighting.
        Select as many as apply.
      </Text>

      {selected.length > 0 && (
        <Group gap={6} wrap="wrap">
          {selected.map((s) => (
            <Badge
              key={s}
              size="sm"
              variant="light"
              component="button"
              onClick={() => toggle(s)}
              style={{
                cursor: 'pointer',
                backgroundColor: 'var(--color-accent-primary-subtle)',
                color: 'var(--color-accent-primary)',
                border: '1px solid rgba(27,67,50,0.3)',
                fontWeight: 500,
              }}
            >
              {s} ×
            </Badge>
          ))}
          <Badge
            size="sm"
            variant="subtle"
            component="button"
            onClick={() => form.setFieldValue('sector', [])}
            style={{ cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
          >
            Clear all
          </Badge>
        </Group>
      )}

      <Stack gap={6}>
        {DOMAINS.map((domain) => {
          const isOpen = expandedDomains.has(domain.id)
          const domainSelected = domain.options.filter((o) => selected.includes(o))
          return (
            <Box
              key={domain.id}
              style={{
                border: `1px solid ${domainSelected.length > 0 ? domain.color + '60' : 'var(--color-border-subtle)'}`,
                borderRadius: 8,
                overflow: 'hidden',
                transition: 'border-color 180ms',
              }}
            >
              <UnstyledButton
                onClick={() => toggleDomain(domain.id)}
                style={{ width: '100%' }}
              >
                <Box
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    backgroundColor: domainSelected.length > 0
                      ? `${domain.color}08`
                      : 'var(--color-bg-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <Group gap={10} align="center">
                    <Text style={{ fontSize: 16 }} aria-hidden="true">{domain.emoji}</Text>
                    <Text size="sm" fw={600} c="var(--color-text-primary)">{domain.label}</Text>
                    {domainSelected.length > 0 && (
                      <Badge size="xs" style={{ backgroundColor: `${domain.color}20`, color: domain.color, border: `1px solid ${domain.color}40` }}>
                        {domainSelected.length} selected
                      </Badge>
                    )}
                  </Group>
                  {isOpen
                    ? <ChevronUp size={14} color="var(--color-text-tertiary)" />
                    : <ChevronDown size={14} color="var(--color-text-tertiary)" />
                  }
                </Box>
              </UnstyledButton>

              <Collapse in={isOpen}>
                <Box style={{ padding: '12px 14px', borderTop: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-base)' }}>
                  <Text size="xs" c="var(--color-text-tertiary)" mb={10} lh={1.5} style={{ fontStyle: 'italic' }}>
                    {domain.guidance}
                  </Text>
                  <Group gap={6} wrap="wrap">
                    {domain.options.map((opt) => {
                      const active = selected.includes(opt)
                      return (
                        <Box
                          key={opt}
                          component="button"
                          type="button"
                          onClick={() => toggle(opt)}
                          aria-pressed={active}
                          aria-label={`${opt} sector${active ? ', selected' : ''}`}
                          style={{
                            fontSize: 12,
                            fontWeight: active ? 600 : 400,
                            padding: '4px 10px',
                            borderRadius: 20,
                            border: `1px solid ${active ? domain.color : 'var(--color-border-default)'}`,
                            backgroundColor: active ? `${domain.color}15` : 'var(--color-bg-surface)',
                            color: active ? domain.color : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 140ms',
                          }}
                        >
                          {opt}
                        </Box>
                      )
                    })}
                  </Group>
                </Box>
              </Collapse>
            </Box>
          )
        })}
      </Stack>
    </Stack>
  )
}
