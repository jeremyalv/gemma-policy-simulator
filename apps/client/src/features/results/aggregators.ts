/**
 * aggregators.ts — data transformation helpers for advanced charts.
 *
 * Used by FlowSankey and any future complex visualisations.
 * Pure functions: no React, no side effects.
 */

import type { SimulationResultsData } from '@/api'

// ── Sankey node/link types (Recharts Sankey format) ──────────────────────────
export interface SankeyNode {
  name: string
}

export interface SankeyLink {
  source: number  // index into nodes array
  target: number  // index into nodes array
  value:  number
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

/**
 * Build Sankey data: Age segment → Dominant Emotion → Approval Range
 *
 * Approximates flow by distributing persona counts across emotion and
 * approval buckets using the simulation's aggregate distributions.
 *
 * Because the API doesn't give us a full cross-tab, we synthesise plausible
 * flows using the available demographic data.
 */
export function buildSankeyData(results: SimulationResultsData): SankeyData {
  const { demographic_breakdown, emotion_profile, summary } = results

  // Layer 1 nodes: age groups
  const ageGroups = Object.entries(demographic_breakdown.by_age_group)
  // Layer 2 nodes: emotion buckets (top 3 by prevalence)
  const topEmotions = Object.entries(emotion_profile)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([e]) => e)
  // Layer 3 nodes: approval tiers
  const approvalTiers = [
    { label: 'Oppose (1–2)',  range: [1, 2] },
    { label: 'Neutral (3)',   range: [3, 3] },
    { label: 'Support (4–5)', range: [4, 5] },
  ]

  const nodes: SankeyNode[] = [
    ...ageGroups.map(([k]) => ({ name: k })),
    ...topEmotions.map((e) => ({ name: e.charAt(0).toUpperCase() + e.slice(1) })),
    ...approvalTiers.map((t) => ({ name: t.label })),
  ]

  const ageOffset     = 0
  const emotionOffset = ageGroups.length
  const approvalOffset = ageGroups.length + topEmotions.length

  const links: SankeyLink[] = []

  // Age → Emotion: distribute age group count proportionally to emotion percentages
  ageGroups.forEach(([, v], ai) => {
    const count = (v as { count: number }).count
    topEmotions.forEach((emotion, ei) => {
      const pct = (emotion_profile[emotion] ?? 0) / 100
      const val = Math.round(count * pct)
      if (val > 0) {
        links.push({ source: ageOffset + ai, target: emotionOffset + ei, value: val })
      }
    })
  })

  // Emotion → Approval: distribute by approval distribution
  const totalApproval = Object.values(summary.approval_distribution).reduce((s, v) => s + v, 0)
  topEmotions.forEach((_emotion, ei) => {
    // Get the total flowing into this emotion node
    const inflow = links
      .filter((l) => l.target === emotionOffset + ei)
      .reduce((s, l) => s + l.value, 0)

    approvalTiers.forEach((tier, ti) => {
      // Sum approval distribution for this tier's range
      const tierCount = Object.entries(summary.approval_distribution)
        .filter(([lvl]) => {
          const n = Number(lvl)
          return n >= tier.range[0] && n <= tier.range[1]
        })
        .reduce((s, [, c]) => s + c, 0)

      const tierPct = totalApproval > 0 ? tierCount / totalApproval : 0
      const val = Math.round(inflow * tierPct)
      if (val > 0) {
        links.push({ source: emotionOffset + ei, target: approvalOffset + ti, value: val })
      }
    })
  })

  // Guard: skip sankey if any node has no links (Recharts crashes)
  const usedSources = new Set(links.map((l) => l.source))
  const usedTargets = new Set(links.map((l) => l.target))
  const allUsed = nodes.every((_, i) => usedSources.has(i) || usedTargets.has(i))
  if (!allUsed || links.length < 2) return { nodes: [], links: [] }

  return { nodes, links }
}

/**
 * Quick summary: how many personas oppose / neutral / support.
 */
export function approvalSplit(distribution: Record<string, number>): {
  oppose: number
  neutral: number
  support: number
} {
  const get = (k: string) => distribution[k] ?? 0
  return {
    oppose:  get('1') + get('2'),
    neutral: get('3'),
    support: get('4') + get('5'),
  }
}
