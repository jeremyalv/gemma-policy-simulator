/**
 * ClarificationPage — pre-run Q&A chat with Gemma.
 *
 * Route: /simulations/:id/clarify
 * Layout: full-height, no Layout shell (custom chrome for focus mode)
 *   ┌─────────────────┬────────────────────────────┐
 *   │ Policy panel    │ Chat area                  │
 *   │ (collapsible)   │  [turn counter]            │
 *   │                 │  [bubbles]                 │
 *   │                 │  [text input + submit]     │
 *   └─────────────────┴────────────────────────────┘
 */

import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Text, Group, Button, Textarea, Stack,
  Alert, ActionIcon, Tooltip, Progress,
} from '@mantine/core'
import {
  AlertCircle, SkipForward, Send, ArrowLeft, RefreshCw,
} from 'lucide-react'
import { runSimulation } from '@/api'
import { generateIdempotencyKey } from '@/lib/idempotency'
import { isBackendDownError, BACKEND_DOWN_MESSAGE } from '@/lib/api-errors'
import { notifications } from '@mantine/notifications'
import { PolicyPanel }  from './PolicyPanel'
import { ChatBubble }   from './ChatBubble'
import { useClarificationFlow } from './hooks/useClarificationFlow'

const MAX_TURNS = 3
// Focus hint sent to generate endpoint
const GENERATE_FOCUS = 'policy eligibility, mechanism, and expected outcomes'

export default function ClarificationPage() {
  const { id: simulationId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [answer, setAnswer] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Placeholder policy data (real data from store/location state in future) ─
  // In practice this should come from the simulation draft — for now we use
  // location state or fall back to generic placeholder.
  const locationState = (window.history.state?.usr ?? {}) as {
    title?: string
    policy_text?: string
    runtime_profile?: string
  }
  const policyTitle   = locationState.title ?? 'Policy Simulation'
  const policyText    = locationState.policy_text ?? 'Policy description not available.'
  const runtimeProfile = (locationState.runtime_profile ?? 'auto') as 'interactive' | 'balanced' | 'thorough' | 'auto'

  // ── Clarification flow ────────────────────────────────────────────────────
  async function handleComplete(refinedText: string | null) {
    await triggerRun(refinedText != null)
  }

  const flow = useClarificationFlow({
    simulationId: simulationId!,
    onComplete: handleComplete,
  })

  // Start flow on mount.
  // Guard against React.StrictMode double-invocation (which would waste an
  // API call and reset the chat to a blank state for a moment).
  const startedRef = useRef(false)
  useEffect(() => {
    if (simulationId && !startedRef.current) {
      startedRef.current = true
      flow.start(GENERATE_FOCUS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [flow.turns, flow.state])

  // ── Trigger run ───────────────────────────────────────────────────────────
  async function triggerRun(useRefined = false) {
    if (!simulationId) return
    setIsRunning(true)
    try {
      await runSimulation(
        simulationId,
        { use_refined_prompt: useRefined, profile: runtimeProfile },
        generateIdempotencyKey(),
      )
      navigate(`/simulations/${simulationId}`)
    } catch (err) {
      notifications.show({
        title: 'Run failed',
        message: isBackendDownError(err)
          ? BACKEND_DOWN_MESSAGE
          : 'Could not start simulation. Please try again.',
        color: 'red',
      })
      setIsRunning(false)
    }
  }

  // ── Submit answer ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!answer.trim()) return
    const text = answer.trim()
    setAnswer('')
    await flow.submitAnswer(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isBusy    = flow.state === 'generating' || flow.state === 'submitting' || isRunning
  const isDone    = flow.state === 'done'
  const isError   = flow.state === 'error'
  const turnPct   = ((flow.currentTurn - 1) / MAX_TURNS) * 100

  return (
    <Box
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <Box
        style={{
          height: 52,
          borderBottom: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <Group gap="sm">
          <Tooltip label="Back to simulations">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => navigate('/simulations')}
            >
              <ArrowLeft size={16} />
            </ActionIcon>
          </Tooltip>
          <Text fw={600} size="sm" c="var(--color-text-primary)">
            Quick Policy Chat
          </Text>
          <Text size="xs" c="var(--color-text-tertiary)">
            {isDone
              ? 'All done, starting simulation'
              : `Question ${Math.min(flow.currentTurn, MAX_TURNS)} of ${MAX_TURNS}`}
          </Text>
        </Group>

        <Group gap="sm">
          {/* Turn progress bar */}
          <Box style={{ width: 100 }}>
            <Progress
              value={isDone ? 100 : turnPct}
              size="xs"
              color="var(--color-accent-primary)"
              style={{ borderRadius: 4 }}
            />
          </Box>

          {/* Skip */}
          {!isDone && (
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              leftSection={<SkipForward size={13} />}
              onClick={() => flow.skip()}
              disabled={isBusy}
            >
              Skip & Run
            </Button>
          )}
        </Group>
      </Box>

      {/* ── Main split layout ─────────────────────────────────────────────── */}
      <Box style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: policy panel */}
        <PolicyPanel
          title={policyTitle}
          policyText={policyText}
          refinedPolicyText={flow.refinedPolicyText}
        />

        {/* Right: chat */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Messages */}
          <Box
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Intro message */}
            <ChatBubble role="gemma">
              Hey there! 👋 Before we run the simulation, I'd love to ask a couple of quick questions
              about your policy. Your answers help me build a sharper, more accurate picture of how
              people will actually react to this.{'\n\n'}
              Don't worry, it's just 1–3 short questions. You can skip any time if you'd rather jump
              straight in.
            </ChatBubble>

            {/* Completed turns */}
            {flow.turns.map((turn, i) => (
              <Stack key={i} gap={16}>
                <ChatBubble
                  role="gemma"
                  caption={turn.question.rationale || undefined}
                >
                  {turn.question.question_text}
                </ChatBubble>
                {turn.answer && (
                  <ChatBubble role="user">{turn.answer}</ChatBubble>
                )}
              </Stack>
            ))}

            {/* Current question */}
            {flow.currentQuestion && (
              <ChatBubble
                role="gemma"
                caption={flow.currentQuestion.rationale || undefined}
              >
                {flow.currentQuestion.question_text}
              </ChatBubble>
            )}

            {/* Loading bubble */}
            {(flow.state === 'generating' || flow.state === 'submitting') && (
              <ChatBubble role="gemma" isLoading />
            )}

            {/* Error */}
            {isError && (
              <Alert
                icon={<AlertCircle size={16} />}
                color="red"
                title="Could not connect to the AI"
                style={{ borderColor: 'var(--color-status-error)' }}
              >
                <Stack gap={10}>
                  <Text size="sm">
                    {flow.error?.includes('non-JSON') || flow.error?.includes('backend')
                      ? 'The backend is not responding. Make sure the server is running, then retry.'
                      : (flow.error ?? 'Something went wrong generating the clarification question.')}
                  </Text>
                  <Group gap={8} wrap="wrap">
                    <Button
                      size="xs"
                      variant="outline"
                      color="red"
                      leftSection={<RefreshCw size={12} />}
                      onClick={flow.retry}
                    >
                      Retry
                    </Button>
                    <Button
                      size="xs"
                      variant="filled"
                      color="gray"
                      leftSection={<SkipForward size={12} />}
                      loading={isRunning}
                      onClick={() => triggerRun(false)}
                    >
                      Skip clarification, run directly
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            )}

            {/* Done state */}
            {isDone && (
              <ChatBubble role="gemma">
                {flow.refinedPolicyText
                  ? "Perfect — that's really helpful! 🎯 I've taken your answers and refined the policy description to be more precise. Kicking off the simulation now — shouldn't take long!"
                  : "Thanks for your time! 🚀 I have everything I need. Running the simulation with your policy as-is — results coming up shortly!"}
              </ChatBubble>
            )}
          </Box>

          {/* Input area */}
          {!isDone && !isError && (
            <Box
              style={{
                borderTop: '1px solid var(--color-border-subtle)',
                padding: '14px 20px',
                backgroundColor: 'var(--color-bg-surface)',
                flexShrink: 0,
              }}
            >
              <Group align="flex-end" gap="sm">
                <Textarea
                  placeholder="Type your answer here… (Ctrl+Enter to send)"
                  value={answer}
                  onChange={(e) => setAnswer(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isBusy || flow.state !== 'waiting_answer'}
                  minRows={2}
                  maxRows={5}
                  autosize
                  style={{ flex: 1 }}
                  styles={{
                    input: {
                      backgroundColor: 'var(--color-bg-subtle)',
                      borderColor: 'var(--color-border-default)',
                      resize: 'none',
                    },
                  }}
                />
                <ActionIcon
                  size="lg"
                  radius="md"
                  disabled={!answer.trim() || isBusy || flow.state !== 'waiting_answer'}
                  loading={flow.state === 'submitting'}
                  onClick={handleSubmit}
                  style={{
                    backgroundColor: answer.trim() && !isBusy
                      ? 'var(--color-accent-primary)'
                      : undefined,
                    color: answer.trim() && !isBusy ? '#fff' : undefined,
                    flexShrink: 0,
                  }}
                  aria-label="Submit answer"
                >
                  <Send size={16} />
                </ActionIcon>
              </Group>
              <Text size="xs" c="var(--color-text-tertiary)" mt={6}>
                Ctrl+Enter to send · Shift+Enter for new line · No right or wrong answers here!
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
