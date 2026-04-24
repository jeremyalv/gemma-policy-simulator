/**
 * EmotionRadar — Recharts RadarChart for emotion profile (5 axes).
 * Colors from --color-data-emotion-* CSS vars (resolved to hex at runtime).
 *
 * CONTRACT: EmotionProfile is { [emotion: string]: number } where values
 * are percentages of the population (not counts).
 */

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Box, Text, Group } from '@mantine/core'
import type { EmotionProfile } from '@/api'

const EMOTION_META: Record<string, { label: string; color: string }> = {
  anger:   { label: 'Anger',   color: '#B91C1C' },
  concern: { label: 'Concern', color: '#B45309' },
  neutral: { label: 'Neutral', color: '#78716C' },
  hope:    { label: 'Hope',    color: '#0369A1' },
  joy:     { label: 'Joy',     color: '#15803D' },
}

const EMOTION_ORDER = ['anger', 'concern', 'neutral', 'hope', 'joy']

interface EmotionRadarProps {
  emotionProfile: EmotionProfile
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { payload: { emotion: string; value: number } }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const { emotion, value } = payload[0].payload
  const meta = EMOTION_META[emotion] ?? { label: emotion, color: 'var(--color-text-secondary)' }
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
      <Text size="sm" fw={600} style={{ color: meta.color }}>{meta.label}</Text>
      <Text size="xs" c="var(--color-text-secondary)">{value.toFixed(1)}% of personas</Text>
    </Box>
  )
}

export function EmotionRadar({ emotionProfile }: EmotionRadarProps) {
  const data = EMOTION_ORDER.map((emotion) => ({
    emotion,
    label: EMOTION_META[emotion]?.label ?? emotion,
    value: emotionProfile[emotion] ?? 0,
  }))

  const ariaLabel = data
    .map((d) => `${d.label}: ${d.value.toFixed(1)}%`)
    .join(', ')

  return (
    <Box>
      <div role="img" aria-label={`Emotion radar chart — ${ariaLabel}`}>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
          <PolarGrid stroke="var(--color-border-subtle)" />
          <PolarAngleAxis
            dataKey="label"
            tick={{
              fontSize: 12,
              fill: 'var(--color-text-secondary)',
              fontFamily: 'IBM Plex Sans, sans-serif',
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
            tickCount={4}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Radar
            dataKey="value"
            stroke="var(--color-accent-primary)"
            fill="var(--color-accent-primary)"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
      </div>

      {/* Legend */}
      <Group justify="center" gap="md" mt={4} wrap="wrap">
        {data.map(({ emotion, value }) => {
          const meta = EMOTION_META[emotion]
          return (
            <Group key={emotion} gap={5}>
              <Box
                style={{
                  width: 10, height: 10,
                  borderRadius: '50%',
                  backgroundColor: meta?.color ?? 'gray',
                  flexShrink: 0,
                }}
              />
              <Text size="xs" c="var(--color-text-secondary)">
                {meta?.label} <span style={{ color: 'var(--color-text-tertiary)' }}>({value.toFixed(1)}%)</span>
              </Text>
            </Group>
          )
        })}
      </Group>
    </Box>
  )
}
