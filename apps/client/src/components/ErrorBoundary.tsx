/**
 * ErrorBoundary — catches unhandled React render/lifecycle errors.
 *
 * Usage:
 *   <ErrorBoundary>          ← global (wraps the whole app)
 *   <ErrorBoundary inline>   ← per-section fallback (shows inline card, not full page)
 *
 * Reset: ErrorBoundary resets when `resetKey` prop changes.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Box, Button, Stack, Text, Title, Center } from '@mantine/core'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children:   ReactNode
  /** When true, renders a compact inline card instead of a full-page fallback */
  inline?:    boolean
  /** Change this value to programmatically reset the boundary */
  resetKey?:  string | number
  /** Custom fallback (overrides built-in UI entirely) */
  fallback?:  (reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError:  boolean
  error:     Error | null
  eventId:   string | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, eventId: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console (swap for Sentry/LogRocket in production)
    console.error('[InfiniPol] Unhandled render error:', error, info.componentStack)
    this.setState({ eventId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` })
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.reset()
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, eventId: null })
  }

  render() {
    const { hasError, error, eventId } = this.state
    const { children, inline, fallback } = this.props

    if (!hasError) return children

    // ── Custom fallback ──────────────────────────────────────────────────────
    if (fallback) return fallback(this.reset)

    const message = error?.message ?? 'An unexpected error occurred.'

    // ── Inline card fallback ─────────────────────────────────────────────────
    if (inline) {
      return (
        <Box
          style={{
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 10,
            padding: '20px 24px',
            backgroundColor: 'var(--color-bg-surface)',
          }}
        >
          <Stack gap="sm">
            <Box style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <AlertTriangle size={16} color="var(--color-status-warning)" />
              <Text fw={600} size="sm" c="var(--color-text-primary)">
                Something went wrong
              </Text>
            </Box>
            <Text size="xs" c="var(--color-text-secondary)" lh={1.5}>
              {message}
            </Text>
            {eventId && (
              <Text size="10px" c="var(--color-text-tertiary)" style={{ fontFamily: 'monospace' }}>
                ref: {eventId}
              </Text>
            )}
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<RefreshCw size={12} />}
              onClick={this.reset}
              style={{ alignSelf: 'flex-start' }}
            >
              Retry
            </Button>
          </Stack>
        </Box>
      )
    }

    // ── Full-page fallback ───────────────────────────────────────────────────
    return (
      <Center
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg-base)',
          padding: 32,
        }}
      >
        <Stack align="center" gap="lg" maw={480}>
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: 'var(--color-status-warning-subtle, #FEF3C7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={28} color="var(--color-status-warning)" />
          </Box>

          <Stack align="center" gap="xs">
            <Title
              order={3}
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: 'Source Serif 4, serif',
                textAlign: 'center',
              }}
            >
              Something went wrong
            </Title>
            <Text
              size="sm"
              c="var(--color-text-secondary)"
              lh={1.6}
              style={{ textAlign: 'center' }}
            >
              {message}
            </Text>
          </Stack>

          {eventId && (
            <Text
              size="xs"
              c="var(--color-text-tertiary)"
              style={{ fontFamily: 'monospace', textAlign: 'center' }}
            >
              Error ref: {eventId}
            </Text>
          )}

          <Box style={{ display: 'flex', gap: 12 }}>
            <Button
              leftSection={<RefreshCw size={14} />}
              onClick={this.reset}
              style={{
                backgroundColor: 'var(--color-accent-primary)',
                color: '#fff',
              }}
            >
              Try again
            </Button>
            <Button
              variant="subtle"
              color="gray"
              onClick={() => { window.location.href = '/' }}
            >
              Go to dashboard
            </Button>
          </Box>
        </Stack>
      </Center>
    )
  }
}
