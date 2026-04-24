/**
 * ApprovalGauge — custom SVG arc gauge for mean_approval (1–5 scale).
 *
 * Contract: value is always 1–5 float. Never display as percentage.
 * The gauge arc spans from 1 (far left) to 5 (far right).
 */

import { formatApproval } from '@/lib/format'

interface ApprovalGaugeProps {
  value: number | null
  size?: number
}

// Map approval 1-5 to arc angle (180° sweep, left to right)
function valueToAngle(v: number): number {
  // 1 → 0°, 5 → 180°
  return ((v - 1) / 4) * 180
}

// Color zones on the arc
const ZONE_COLORS = [
  'var(--color-data-approval-1)', // 1–1.8
  'var(--color-data-approval-2)', // 1.8–2.6
  'var(--color-data-approval-3)', // 2.6–3.4
  'var(--color-data-approval-4)', // 3.4–4.2
  'var(--color-data-approval-5)', // 4.2–5
]

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg)
  const end   = polarToCartesian(cx, cy, r, startDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`
}

export function ApprovalGauge({ value, size = 200 }: ApprovalGaugeProps) {
  const cx = size / 2
  const cy = size * 0.62
  const outerR = size * 0.42
  const innerR = size * 0.28
  const needleR = size * 0.38

  // Zone arcs (5 equal segments over 180°)
  const zones = ZONE_COLORS.map((color, i) => ({
    color,
    start: i * 36,
    end:   (i + 1) * 36,
  }))

  // Needle angle
  const needleAngle = value != null ? valueToAngle(value) : 0
  const needlePt    = polarToCartesian(cx, cy, needleR, needleAngle)

  // Needle color = zone color of current value
  const needleColor = value != null
    ? ZONE_COLORS[Math.min(4, Math.floor((value - 1) / 0.8))]
    : 'var(--color-border-default)'

  return (
    <svg
      width={size}
      height={size * 0.65}
      viewBox={`0 0 ${size} ${size * 0.65}`}
      aria-label={`Approval gauge: ${formatApproval(value)}`}
    >
      {/* Background track */}
      <path
        d={arcPath(cx, cy, (outerR + innerR) / 2, 0, 180)}
        fill="none"
        stroke="var(--color-bg-muted)"
        strokeWidth={outerR - innerR}
        strokeLinecap="butt"
      />

      {/* Colored zone segments */}
      {zones.map((z) => (
        <path
          key={z.start}
          d={arcPath(cx, cy, (outerR + innerR) / 2, z.start, z.end)}
          fill="none"
          stroke={z.color}
          strokeWidth={outerR - innerR}
          strokeLinecap="butt"
          opacity={0.85}
        />
      ))}

      {/* Needle */}
      {value != null && (
        <>
          <line
            x1={cx}
            y1={cy}
            x2={needlePt.x}
            y2={needlePt.y}
            stroke={needleColor}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r={5} fill={needleColor} />
        </>
      )}

      {/* Scale labels */}
      {[1, 2, 3, 4, 5].map((label) => {
        const pt = polarToCartesian(cx, cy, outerR + 10, valueToAngle(label))
        return (
          <text
            key={label}
            x={pt.x}
            y={pt.y + 4}
            textAnchor="middle"
            fontSize={size * 0.065}
            fill="var(--color-text-tertiary)"
            fontFamily="IBM Plex Sans, sans-serif"
          >
            {label}
          </text>
        )
      })}

      {/* Central value */}
      <text
        x={cx}
        y={cy + size * 0.04}
        textAnchor="middle"
        fontSize={size * 0.16}
        fontWeight={700}
        fill={needleColor}
        fontFamily="IBM Plex Sans, sans-serif"
      >
        {value != null ? value.toFixed(1) : '—'}
      </text>
      <text
        x={cx}
        y={cy + size * 0.13}
        textAnchor="middle"
        fontSize={size * 0.065}
        fill="var(--color-text-tertiary)"
        fontFamily="IBM Plex Sans, sans-serif"
      >
        out of 5
      </text>
    </svg>
  )
}
