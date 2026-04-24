/**
 * USChoropleth — US state-level approval heatmap.
 * Uses react-simple-maps + US TopoJSON bundled at public/maps/us-states-10m.json.
 *
 * CONTRACT: by_state is { [stateCode: string]: number } — flat mean_approval (1–5).
 * States not in the dataset are shown in a neutral grey.
 *
 * Color scale: diverging from approval-1 (red) → approval-3 (grey) → approval-5 (green).
 */

import React, { useState } from 'react'
import {
  ComposableMap, Geographies, Geography, ZoomableGroup,
  type GeographyRecord,
} from 'react-simple-maps'
import { Box, Text, Group } from '@mantine/core'
import { formatApproval } from '@/lib/format'

// Map of FIPS numeric state ID → 2-letter state code
// (US TopoJSON uses FIPS IDs; by_state uses alpha-2 codes)
const FIPS_TO_STATE: Record<string, string> = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT',
  '10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL',
  '18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD',
  '25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE',
  '32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND',
  '39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD',
  '47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV',
  '55':'WI','56':'WY',
}

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California',
  CO:'Colorado', CT:'Connecticut', DE:'Delaware', DC:'D.C.', FL:'Florida',
  GA:'Georgia', HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana',
  IA:'Iowa', KS:'Kansas', KY:'Kentucky', LA:'Louisiana', ME:'Maine',
  MD:'Maryland', MA:'Massachusetts', MI:'Michigan', MN:'Minnesota',
  MS:'Mississippi', MO:'Missouri', MT:'Montana', NE:'Nebraska', NV:'Nevada',
  NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico', NY:'New York',
  NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma',
  OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
  SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont',
  VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin',
  WY:'Wyoming',
}

// Approval → hex color (resolved from CSS var at component level)
const APPROVAL_HEX: Record<number, string> = {
  1: '#B91C1C',
  2: '#EA580C',
  3: '#A8A29E',
  4: '#65A30D',
  5: '#15803D',
}

function approvalToHex(value: number): string {
  const bucket = Math.max(1, Math.min(5, Math.round(value)))
  return APPROVAL_HEX[bucket] ?? '#A8A29E'
}

interface USChoroplethProps {
  byState: Record<string, number>
}

interface TooltipState {
  stateCode: string
  approval: number
  x: number
  y: number
}

export function USChoropleth({ byState }: USChoroplethProps) {
  const [tooltipData, setTooltipData] = useState<TooltipState | null>(null)

  const minApproval = Math.min(...Object.values(byState))
  const maxApproval = Math.max(...Object.values(byState))

  return (
    <Box style={{ position: 'relative' }}>
      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: '100%', height: 'auto' }}
        width={800}
        height={500}
      >
        <ZoomableGroup zoom={1} center={[0, 0]}>
          <Geographies geography="/maps/us-states-10m.json">
            {({ geographies }: { geographies: GeographyRecord[] }) =>
              geographies.map((geo: GeographyRecord) => {
                const fips      = geo.id as string
                const stateCode = FIPS_TO_STATE[fips]
                const approval  = stateCode ? byState[stateCode] : undefined
                const fill      = approval != null
                  ? approvalToHex(approval)
                  : 'var(--color-bg-muted)'

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    fillOpacity={approval != null ? 0.8 : 0.4}
                    stroke="var(--color-bg-surface)"
                    strokeWidth={0.8}
                    style={{
                      default: { outline: 'none' },
                      hover:   { outline: 'none', fillOpacity: 1, cursor: 'pointer' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e: React.MouseEvent<SVGPathElement>) => {
                      if (stateCode && approval != null) {
                        setTooltipData({
                          stateCode,
                          approval,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }
                    }}
                    onMouseLeave={() => setTooltipData(null)}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Floating tooltip */}
      {tooltipData && (
        <Box
          style={{
            position: 'fixed',
            left: tooltipData.x + 12,
            top:  tooltipData.y - 48,
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-default)',
            borderRadius: 8,
            padding: '6px 12px',
            boxShadow: 'var(--shadow-md)',
            pointerEvents: 'none',
            zIndex: 200,
          }}
        >
          <Text size="sm" fw={600} c="var(--color-text-primary)">
            {STATE_NAMES[tooltipData.stateCode] ?? tooltipData.stateCode}
          </Text>
          <Text size="xs" c="var(--color-text-secondary)">
            Approval: <b style={{ color: approvalToHex(tooltipData.approval) }}>
              {formatApproval(tooltipData.approval)}
            </b>
          </Text>
        </Box>
      )}

      {/* Legend */}
      <Group justify="center" gap={4} mt={8} wrap="nowrap">
        <Text size="xs" c="var(--color-text-tertiary)">1</Text>
        {[1, 2, 3, 4, 5].map((level) => (
          <Box
            key={level}
            style={{
              width: 28,
              height: 12,
              borderRadius: 3,
              backgroundColor: APPROVAL_HEX[level],
              opacity: 0.8,
            }}
          />
        ))}
        <Text size="xs" c="var(--color-text-tertiary)">5</Text>
        <Text size="xs" c="var(--color-text-tertiary)" ml={8}>
          (grey = no data)
        </Text>
      </Group>

      {/* Min/max annotation */}
      {Object.keys(byState).length > 0 && (
        <Text size="xs" c="var(--color-text-tertiary)" style={{ textAlign: 'center' }} mt={4}>
          Range: {formatApproval(minApproval)} – {formatApproval(maxApproval)}
        </Text>
      )}
    </Box>
  )
}
