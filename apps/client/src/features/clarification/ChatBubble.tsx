/**
 * ChatBubble — renders a single message in the clarification chat.
 * Two variants: 'gemma' (left-aligned, green) and 'user' (right-aligned, neutral).
 */

import { Box, Text, Group, Stack } from '@mantine/core'
import { Bot, User } from 'lucide-react'

// Inject keyframes once via a <style> element — avoids any build-tool dependency.
const TYPING_KEYFRAMES = `
  @keyframes chatBubbleBounce {
    0%, 80%, 100% { transform: translateY(0); }
    40%           { transform: translateY(-6px); }
  }
`

function TypingDots() {
  return (
    <>
      <style>{TYPING_KEYFRAMES}</style>
      <Group gap={4} align="center" style={{ height: 20, padding: '0 2px' }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent-primary)',
              animation: 'chatBubbleBounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </Group>
    </>
  )
}

type BubbleRole = 'gemma' | 'user'

interface ChatBubbleProps {
  role: BubbleRole
  children?: React.ReactNode
  /** Small caption shown below the bubble (e.g. rationale text) */
  caption?: string
  isLoading?: boolean
}

function Avatar({ role }: { role: BubbleRole }) {
  return (
    <Box
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          role === 'gemma'
            ? 'var(--color-accent-primary-subtle)'
            : 'var(--color-bg-subtle)',
        border: `1px solid ${
          role === 'gemma'
            ? 'var(--color-accent-primary)'
            : 'var(--color-border-default)'
        }`,
      }}
    >
      {role === 'gemma' ? (
        <Bot size={15} color="var(--color-accent-primary)" />
      ) : (
        <User size={15} color="var(--color-text-tertiary)" />
      )}
    </Box>
  )
}

export function ChatBubble({ role, children, caption, isLoading }: ChatBubbleProps) {
  const isGemma = role === 'gemma'

  if (isLoading) {
    return (
      <Group align="flex-start" gap="sm" justify={isGemma ? 'flex-start' : 'flex-end'}>
        {isGemma && <Avatar role="gemma" />}
        <Box
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '2px 12px 12px 12px',
            padding: '8px 14px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <TypingDots />
        </Box>
        {!isGemma && <Avatar role="user" />}
      </Group>
    )
  }

  return (
    <Group
      align="flex-start"
      gap="sm"
      justify={isGemma ? 'flex-start' : 'flex-end'}
    >
      {isGemma && <Avatar role="gemma" />}

      <Stack gap={4} style={{ maxWidth: '72%' }}>
        <Box
          style={{
            backgroundColor: isGemma
              ? 'var(--color-bg-surface)'
              : 'var(--color-accent-primary)',
            border: isGemma
              ? '1px solid var(--color-border-subtle)'
              : 'none',
            borderRadius: isGemma ? '2px 12px 12px 12px' : '12px 2px 12px 12px',
            padding: '10px 14px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Text
            size="sm"
            lh={1.65}
            style={{
              color: isGemma ? 'var(--color-text-primary)' : '#fff',
              whiteSpace: 'pre-wrap',
            }}
          >
            {children}
          </Text>
        </Box>

        {caption && (
          <Text
            size="xs"
            c="var(--color-text-tertiary)"
            lh={1.5}
            style={{
              paddingLeft: isGemma ? 2 : 0,
              paddingRight: isGemma ? 0 : 2,
              textAlign: isGemma ? 'left' : 'right',
              fontStyle: 'italic',
            }}
          >
            {caption}
          </Text>
        )}
      </Stack>

      {!isGemma && <Avatar role="user" />}
    </Group>
  )
}
