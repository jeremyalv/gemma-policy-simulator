/**
 * ApprovalDisplay — renders mean_approval correctly as "X.X / 5".
 * NEVER as a percentage. Contract: approval is 1–5 float.
 */

import { Text, type TextProps } from '@mantine/core'
import { formatApproval, approvalColor } from '@/lib/format'

interface ApprovalDisplayProps extends Omit<TextProps, 'children'> {
  value: number | null | undefined
  /** Show colored dot indicator */
  dot?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

export function ApprovalDisplay({
  value,
  dot = false,
  size = 'md',
  ...rest
}: ApprovalDisplayProps) {
  const color = value != null ? approvalColor(value) : 'var(--color-text-tertiary)'
  const textSizes = { sm: 'xs', md: 'sm', lg: 'md' } as const

  return (
    <Text
      size={textSizes[size]}
      fw={600}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color }}
      {...rest}
    >
      {dot && value != null && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
      )}
      {formatApproval(value)}
    </Text>
  )
}
