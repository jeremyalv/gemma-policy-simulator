/**
 * EmptyState — zero-data placeholder with optional CTA.
 */

import { Stack, Text, Title, Button, Box } from '@mantine/core'
import type { ReactNode } from 'react'
import { BarChart2 } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '80px 24px',
      }}
    >
      <Stack align="center" gap="md" maw={400} style={{ textAlign: 'center' }}>
        <Box
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent-primary-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon ?? <BarChart2 size={28} color="var(--color-accent-primary)" />}
        </Box>

        <Title order={4} c="var(--color-text-primary)">{title}</Title>

        {description && (
          <Text size="sm" c="var(--color-text-secondary)" lh={1.6}>
            {description}
          </Text>
        )}

        {action && (
          <Button
            mt="xs"
            onClick={action.onClick}
            style={{
              backgroundColor: 'var(--color-accent-primary)',
              color: '#fff',
            }}
          >
            {action.label}
          </Button>
        )}
      </Stack>
    </Box>
  )
}
