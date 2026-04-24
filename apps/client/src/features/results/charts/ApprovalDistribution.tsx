/**
 * ApprovalDistribution — diverging horizontal bar chart for approval buckets 1–5.
 *
 * CONTRACT: X-axis is count, not percentage. Labels show both count and %.
 * Colors from --color-data-approval-* CSS vars (resolved to hex at runtime).
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer, LabelList,
} from 'recharts'
import { Box, Text } from '@mantine/core'
import type { ApprovalDistribution as ApprovalDistributionType } from '@/api'

// Resolve CSS vars to hex values (needed for Recharts Cell fill)
const APPROVAL_COLORS: Record<string, string> = {
  '1': '#B91C1C',
  '2': '#EA580C',
  '3': '#A8A29E',
  '4': '#65A30D',
  '5': '#15803D',
}

const APPROVAL_LABELS: Record<string, string> = {
  '1': 'Strongly Oppose',
  '2': 'Oppose',
  '3': 'Neutral',
  '4': 'Support',
  '5': 'Strongly Support',
}

interface ApprovalDistributionProps {
  distribution: ApprovalDistributionType
  totalSample: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number; payload: { label: string; pct: string } }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const { value, payload: d } = payload[0]
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
      <Text size="sm" fw={600} c="var(--color-text-primary)">{d.label}</Text>
      <Text size="xs" c="var(--color-text-secondary)">{value} personas ({d.pct})</Text>
    </Box>
  )
}

export function ApprovalDistribution({ distribution, totalSample }: ApprovalDistributionProps) {
  const data = [1, 2, 3, 4, 5].map((level) => {
    const count = distribution[String(level)] ?? 0
    const pct   = totalSample > 0 ? ((count / totalSample) * 100).toFixed(1) : '0.0'
    return {
      level:  String(level),
      label:  APPROVAL_LABELS[level],
      count,
      pct:    `${pct}%`,
      color:  APPROVAL_COLORS[level],
    }
  })

  const ariaLabel = data
    .map((d) => `${d.label}: ${d.count} personas (${d.pct})`)
    .join(', ')

  return (
    <div role="img" aria-label={`Approval distribution — ${ariaLabel}`}>
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 80, bottom: 4, left: 110 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          horizontal={false}
          strokeDasharray="3 3"
          stroke="var(--color-border-subtle)"
        />
        <YAxis
          dataKey="label"
          type="category"
          width={105}
          tick={{ fontSize: 12, fill: 'var(--color-text-secondary)', fontFamily: 'IBM Plex Sans, sans-serif' }}
          axisLine={false}
          tickLine={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)', fontFamily: 'IBM Plex Sans, sans-serif' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-subtle)' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell key={entry.level} fill={entry.color} fillOpacity={0.88} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            style={{ fontSize: 12, fill: 'var(--color-text-secondary)', fontFamily: 'IBM Plex Sans, sans-serif' }}
            formatter={(v: number) => v}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}
