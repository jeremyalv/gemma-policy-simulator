/**
 * PolicyPanel — collapsible left panel showing original policy text.
 * Read-only reference while the user answers clarifying questions.
 */

import { useState } from 'react'
import { Box, Text, ActionIcon, Tooltip } from '@mantine/core'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'

interface PolicyPanelProps {
  title: string
  policyText: string
  refinedPolicyText?: string | null
}

export function PolicyPanel({ title, policyText, refinedPolicyText }: PolicyPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <Box
        style={{
          width: 36,
          borderRight: '1px solid var(--color-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 16,
          gap: 8,
          backgroundColor: 'var(--color-bg-subtle)',
          flexShrink: 0,
        }}
      >
        <Tooltip label="Expand policy" position="right">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => setCollapsed(false)}
          >
            <ChevronRight size={16} />
          </ActionIcon>
        </Tooltip>
        <Box
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            marginTop: 8,
          }}
        >
          <Text size="xs" c="var(--color-text-tertiary)" style={{ whiteSpace: 'nowrap' }}>
            Policy text
          </Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      style={{
        width: 300,
        flexShrink: 0,
        borderRight: '1px solid var(--color-border-subtle)',
        backgroundColor: 'var(--color-bg-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--color-border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={14} color="var(--color-text-tertiary)" />
          <Text size="xs" fw={600} c="var(--color-text-secondary)" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Policy
          </Text>
        </Box>
        <Tooltip label="Collapse" position="right">
          <ActionIcon
            variant="subtle"
            size="sm"
            color="gray"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft size={14} />
          </ActionIcon>
        </Tooltip>
      </Box>

      {/* Content */}
      <Box style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <Text
          size="sm"
          fw={600}
          c="var(--color-text-primary)"
          mb={10}
          lh={1.4}
          style={{ fontFamily: 'Source Serif 4, serif' }}
        >
          {title}
        </Text>

        <Text
          size="xs"
          c="var(--color-text-secondary)"
          lh={1.7}
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {policyText}
        </Text>

        {/* Refined policy text (shows after first answer) */}
        {refinedPolicyText && refinedPolicyText !== policyText && (
          <Box
            mt={16}
            style={{
              borderTop: '1px dashed var(--color-border-default)',
              paddingTop: 12,
            }}
          >
            <Text
              size="xs"
              fw={600}
              c="var(--color-accent-primary)"
              mb={6}
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Refined ↑
            </Text>
            <Text
              size="xs"
              c="var(--color-text-secondary)"
              lh={1.7}
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {refinedPolicyText}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}
