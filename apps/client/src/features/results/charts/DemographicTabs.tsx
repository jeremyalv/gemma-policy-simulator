/**
 * DemographicTabs — 4-tab breakdown: Age · Marital · State · Occupation
 *
 * CONTRACT TYPE NOTES (from OpenAPI schema):
 *  - by_age_group, by_marital_status, by_occupation_group:
 *      { [segment: string]: { mean_approval: number; count: number } }
 *  - by_state:
 *      { [stateCode: string]: number }   ← flat mean_approval, no count
 *
 * All bars show mean_approval (1–5 scale). Never as percentage.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer, LabelList,
} from 'recharts'
import { Tabs, Box, Text, Group, SimpleGrid } from '@mantine/core'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { approvalColor, formatApproval } from '@/lib/format'
import type { DemographicBreakdown } from '@/api'

// ── Shared tooltip ────────────────────────────────────────────────────────────
interface TooltipProps {
  active?: boolean
  payload?: { payload: { segment: string; approval: number; count?: number } }[]
}

function DemoTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const { segment, approval, count } = payload[0].payload
  return (
    <Box
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-default)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <Text size="sm" fw={600} c="var(--color-text-primary)">{segment}</Text>
      <Text size="xs" c="var(--color-text-secondary)">
        Mean approval: <b>{formatApproval(approval)}</b>
      </Text>
      {count != null && (
        <Text size="xs" c="var(--color-text-tertiary)">{count} personas</Text>
      )}
    </Box>
  )
}

// ── Generic horizontal approval bar chart ─────────────────────────────────────
interface ApprovalBarProps {
  data: { segment: string; approval: number; count?: number }[]
  height?: number
}

function ApprovalBarChart({ data, height = 220 }: ApprovalBarProps) {
  const sorted = [...data].sort((a, b) => b.approval - a.approval)

  return (
    <ResponsiveContainer width="100%" height={Math.max(height, sorted.length * 38)}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 80, bottom: 4, left: 130 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          horizontal={false}
          strokeDasharray="3 3"
          stroke="var(--color-border-subtle)"
        />
        <YAxis
          dataKey="segment"
          type="category"
          width={125}
          tick={{ fontSize: 12, fill: 'var(--color-text-secondary)', fontFamily: 'IBM Plex Sans, sans-serif' }}
          axisLine={false}
          tickLine={false}
        />
        <XAxis
          type="number"
          domain={[1, 5]}
          tickCount={5}
          tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)', fontFamily: 'IBM Plex Sans, sans-serif' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}`}
        />
        <Tooltip content={<DemoTooltip />} cursor={{ fill: 'var(--color-bg-subtle)' }} />
        <Bar dataKey="approval" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {sorted.map((entry) => (
            <Cell key={entry.segment} fill={approvalColor(entry.approval)} fillOpacity={0.85} />
          ))}
          <LabelList
            dataKey="approval"
            position="right"
            style={{ fontSize: 12, fill: 'var(--color-text-secondary)', fontFamily: 'IBM Plex Sans, sans-serif' }}
            formatter={(v: number) => v.toFixed(1)}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Insight callout — best / worst segment ────────────────────────────────────
function SegmentInsights({ data }: { data: { segment: string; approval: number; count?: number }[] }) {
  if (data.length < 2) return null
  const sorted = [...data].sort((a, b) => b.approval - a.approval)
  const top    = sorted[0]
  const bottom = sorted[sorted.length - 1]
  const delta  = top.approval - bottom.approval

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" mb={16}>
      <Group gap={8} align="flex-start" style={{ backgroundColor: 'rgba(21,128,61,0.06)', border: '1px solid rgba(21,128,61,0.2)', borderRadius: 8, padding: '10px 14px' }}>
        <TrendingUp size={14} color="#15803D" style={{ flexShrink: 0, marginTop: 2 }} />
        <Box>
          <Text size="xs" fw={600} style={{ color: '#15803D' }}>Highest approval</Text>
          <Text size="xs" c="var(--color-text-secondary)" mt={1}><b>{top.segment}</b> — {formatApproval(top.approval)}/5</Text>
        </Box>
      </Group>
      <Group gap={8} align="flex-start" style={{ backgroundColor: 'rgba(185,28,28,0.05)', border: '1px solid rgba(185,28,28,0.18)', borderRadius: 8, padding: '10px 14px' }}>
        <TrendingDown size={14} color="#B91C1C" style={{ flexShrink: 0, marginTop: 2 }} />
        <Box>
          <Text size="xs" fw={600} style={{ color: '#B91C1C' }}>Lowest approval</Text>
          <Text size="xs" c="var(--color-text-secondary)" mt={1}><b>{bottom.segment}</b> — {formatApproval(bottom.approval)}/5
            {delta > 0.4 && <span style={{ color: '#B45309', marginLeft: 4 }}>(Δ {delta.toFixed(1)} gap)</span>}
          </Text>
        </Box>
      </Group>
    </SimpleGrid>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface DemographicTabsProps {
  breakdown: DemographicBreakdown
}

export function DemographicTabs({ breakdown }: DemographicTabsProps) {
  // Age group
  const ageData = Object.entries(breakdown.by_age_group).map(([seg, v]) => ({
    segment: seg,
    approval: (v as { mean_approval: number }).mean_approval,
    count:    (v as { count: number }).count,
  }))

  // Marital status — prettify labels
  const maritalLabels: Record<string, string> = {
    never_married:        'Never Married',
    married:              'Married',
    divorced_or_widowed:  'Divorced / Widowed',
    separated:            'Separated',
    domestic_partnership: 'Domestic Partner',
  }
  const maritalData = Object.entries(breakdown.by_marital_status).map(([seg, v]) => ({
    segment: maritalLabels[seg] ?? seg,
    approval: (v as { mean_approval: number }).mean_approval,
    count:    (v as { count: number }).count,
  }))

  // State — by_state is flat { stateCode: number }
  const stateData = Object.entries(breakdown.by_state)
    .map(([code, approval]) => ({
      segment:  code,
      approval: approval as number,
    }))

  // Occupation
  const occupationData = Object.entries(breakdown.by_occupation_group).map(([seg, v]) => ({
    segment:  seg,
    approval: (v as { mean_approval: number }).mean_approval,
    count:    (v as { count: number }).count,
  }))

  return (
    <Tabs
      defaultValue="age"
      color="var(--color-accent-primary)"
      styles={{
        tab: { fontSize: 13, fontWeight: 500 },
        panel: { paddingTop: 20 },
      }}
    >
      <Tabs.List>
        <Tabs.Tab value="age">Age Group</Tabs.Tab>
        <Tabs.Tab value="marital">Marital Status</Tabs.Tab>
        <Tabs.Tab value="state">By State</Tabs.Tab>
        <Tabs.Tab value="occupation">Occupation</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="age">
        <SegmentInsights data={ageData} />
        <ApprovalBarChart data={ageData} />
      </Tabs.Panel>

      <Tabs.Panel value="marital">
        <SegmentInsights data={maritalData} />
        <ApprovalBarChart data={maritalData} />
      </Tabs.Panel>

      <Tabs.Panel value="state">
        <SegmentInsights data={stateData} />
        <Text size="xs" c="var(--color-text-tertiary)" mb={12}>
          Mean approval (1–5) by state, sorted highest to lowest. Full list in the map view below.
        </Text>
        <ApprovalBarChart data={stateData} height={Math.max(220, stateData.length * 28)} />
      </Tabs.Panel>

      <Tabs.Panel value="occupation">
        <SegmentInsights data={occupationData} />
        <ApprovalBarChart data={occupationData} height={Math.max(220, occupationData.length * 38)} />
      </Tabs.Panel>
    </Tabs>
  )
}
