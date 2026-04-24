/**
 * App footer — institutional disclaimer + dataset attribution.
 */

import { Box, Group, Text } from '@mantine/core'
import { useInstitution } from '@/theme/ThemeProvider'

export function AppFooter() {
  const config = useInstitution() as { footer_note?: string; name: string }

  return (
    <Box
      component="footer"
      style={{
        borderTop: '1px solid var(--color-border-subtle)',
        backgroundColor: 'var(--color-bg-subtle)',
        padding: '10px 32px',
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Text size="xs" c="var(--color-text-tertiary)">
          {config.footer_note ?? `${config.name} · Simulation results are based on synthetic personas and do not represent real individuals.`}
        </Text>
        <Text size="xs" c="var(--color-text-tertiary)" style={{ whiteSpace: 'nowrap' }}>
          InfiniPol v0.1
        </Text>
      </Group>
    </Box>
  )
}
