/**
 * FlowSankey — Recharts Sankey diagram showing the flow:
 *   Age Group → Dominant Emotion → Approval Tier
 *
 * Uses pre-aggregated data from aggregators.ts.
 * Gracefully renders nothing if data is insufficient.
 */

import { Sankey, Tooltip, ResponsiveContainer, Rectangle, Layer } from 'recharts'
import { Box, Text, Alert } from '@mantine/core'
import { Info } from 'lucide-react'
import type { SankeyData } from '../aggregators'

// Colour palette for the three layers
const LAYER_COLORS = [
  // Age groups — teal family
  ['#0F766E', '#0D9488', '#14B8A6', '#2DD4BF'],
  // Emotions — emotion palette
  ['#B91C1C', '#B45309', '#78716C'],
  // Approval tiers — approval palette
  ['#EA580C', '#A8A29E', '#15803D'],
]

function getNodeColor(index: number, _nodeCount: number, ageLayers: number, emotionLayers: number): string {
  if (index < ageLayers) return LAYER_COLORS[0][index % LAYER_COLORS[0].length]
  if (index < ageLayers + emotionLayers) return LAYER_COLORS[1][(index - ageLayers) % LAYER_COLORS[1].length]
  return LAYER_COLORS[2][(index - ageLayers - emotionLayers) % LAYER_COLORS[2].length]
}

interface CustomNodeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  index?: number
  payload?: { name: string; value: number }
  containerWidth?: number
  ageLayers: number
  emotionLayers: number
  totalNodes: number
}

function CustomNode({
  x = 0, y = 0, width = 10, height = 0,
  index = 0, payload,
  ageLayers, emotionLayers, totalNodes,
}: CustomNodeProps) {
  const color = getNodeColor(index, totalNodes, ageLayers, emotionLayers)
  const isRight = index >= ageLayers + emotionLayers
  const labelX  = isRight ? x + width + 6 : x - 6
  const anchor  = isRight ? 'start' : 'end'

  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x} y={y} width={width} height={height}
        fill={color}
        fillOpacity={0.85}
        radius={3}
      />
      <text
        textAnchor={anchor}
        x={labelX}
        y={y + height / 2 + 4}
        fontSize={11}
        fill="var(--color-text-secondary)"
        fontFamily="IBM Plex Sans, sans-serif"
      >
        {payload?.name}
      </text>
      <text
        textAnchor={anchor}
        x={labelX}
        y={y + height / 2 + 16}
        fontSize={10}
        fill="var(--color-text-tertiary)"
        fontFamily="IBM Plex Sans, sans-serif"
      >
        {payload?.value}
      </text>
    </Layer>
  )
}

interface FlowSankeyProps {
  data: SankeyData
  ageLayers: number
  emotionLayers: number
}

export function FlowSankey({ data, ageLayers, emotionLayers }: FlowSankeyProps) {
  if (!data.nodes.length || !data.links.length) {
    return (
      <Alert icon={<Info size={14} />} color="gray" variant="light">
        Insufficient data to render flow diagram. This appears when fewer than
        2 demographic segments have overlapping emotion and approval data.
      </Alert>
    )
  }

  return (
    <Box>
      <Text size="xs" c="var(--color-text-tertiary)" mb={12}>
        Flow: Age Group → Dominant Emotion → Approval Tier (persona counts)
      </Text>
      <ResponsiveContainer width="100%" height={320}>
        <Sankey
          data={data}
          nodeWidth={10}
          nodePadding={16}
          margin={{ top: 8, right: 120, bottom: 8, left: 120 }}
          node={(props: unknown) => (
            <CustomNode
              {...(props as CustomNodeProps)}
              ageLayers={ageLayers}
              emotionLayers={emotionLayers}
              totalNodes={data.nodes.length}
            />
          )}
          link={{ stroke: '#94A3B8', strokeOpacity: 0.3 }}
        >
          <Tooltip
            formatter={(value: number) => [`${value} personas`, '']}
            contentStyle={{
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'IBM Plex Sans, sans-serif',
            }}
          />
        </Sankey>
      </ResponsiveContainer>
    </Box>
  )
}
