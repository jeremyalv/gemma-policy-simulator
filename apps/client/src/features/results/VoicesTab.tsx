/**
 * VoicesTab — masonry grid of representative persona quotes.
 * Filter by emotion and approval level. "Show more" pagination.
 * Includes a word cloud derived from quote text.
 */

import { useState, useMemo } from 'react'
import {
  Stack, Group, Select, Box, Button, Text, Badge, Card,
} from '@mantine/core'
import { ChevronDown, MessageSquareQuote } from 'lucide-react'
import { QuoteCard } from './charts/QuoteCard'
import { emotionColor } from '@/lib/format'
import type { RepresentativeQuote } from '@/api'

const PAGE_SIZE = 9

const APPROVAL_LABELS: Record<string, string> = {
  all: 'All Approval Levels',
  '1': 'Strongly Oppose (1)',
  '2': 'Oppose (2)',
  '3': 'Neutral (3)',
  '4': 'Support (4)',
  '5': 'Strongly Support (5)',
}

const EMOTIONS = ['all', 'anger', 'concern', 'neutral', 'hope', 'joy']

// Stop words to exclude from word cloud
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','is','it',
  'this','that','i','my','me','we','our','they','their','be','have','do','will',
  'not','would','could','should','can','about','from','by','as','are','was','were',
  'has','had','he','she','his','her','its','if','so','all','more','also','there',
  'been','been','what','which','who','how','when','than','your','us','very','just',
  'no','any','up','into','out','other','like','may','policy','people','need',
])

function buildWordCloud(quotes: RepresentativeQuote[]): { word: string; size: number }[] {
  const freq: Record<string, number> = {}
  quotes.forEach((q) => {
    const words = q.rationale
      .toLowerCase()
      .replace(/[^a-z\s'-]/g, '')
      .split(/\s+/)
      .filter((w: string) => w.length > 3 && !STOP_WORDS.has(w))
    words.forEach((w: string) => { freq[w] = (freq[w] ?? 0) + 1 })
  })
  const entries = Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 36)
  const max = entries[0]?.[1] ?? 1
  return entries.map(([word, count]) => ({
    word,
    size: 11 + Math.round((count / max) * 18),
  }))
}

// ── Word cloud color tiers ────────────────────────────────────────────────────
// Index 0 = biggest/most frequent words
const TIER_COLORS = ['#0D9488', '#0369A1', '#7C3AED', '#B45309', '#78716C']

function wordTier(size: number): number {
  // size range is 11–29; split into 5 equal buckets, clamp to 0–4
  // Higher size = more frequent = lower tier index (more prominent color)
  const raw = Math.floor((size - 11) / ((29 - 11) / 5))
  const bucket = Math.min(4, Math.max(0, raw))
  // Invert: biggest size → tier index 0
  return 4 - bucket
}

// ── Word cloud component ─────────────────────────────────────────────────────

function QuoteWordCloud({ quotes }: { quotes: RepresentativeQuote[] }) {
  const words = useMemo(() => buildWordCloud(quotes), [quotes])
  if (words.length === 0) return null
  return (
    <Card withBorder radius="md" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
      <Group gap={8} mb={12} align="center">
        <MessageSquareQuote size={14} color="var(--color-text-tertiary)" />
        <Text size="xs" fw={600} c="var(--color-text-tertiary)" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Most frequent terms in persona voices
        </Text>
      </Group>
      <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
        {words.map(({ word, size }) => {
          const color = TIER_COLORS[wordTier(size)]
          const fw = size >= 22 ? 700 : size >= 18 ? 600 : 400
          return (
            <span
              key={word}
              style={{
                fontSize: size,
                color,
                fontWeight: fw,
                lineHeight: 1.3,
                cursor: 'default',
                userSelect: 'none',
                padding: '2px 4px',
                borderRadius: 4,
                background: `${color}12`,
                transition: 'transform 150ms',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.transform = ''
              }}
            >
              {word}
            </span>
          )
        })}
      </Box>
    </Card>
  )
}

interface VoicesTabProps {
  quotes: RepresentativeQuote[]
}

export function VoicesTab({ quotes }: VoicesTabProps) {
  const [filterEmotion,  setFilterEmotion]  = useState<string>('all')
  const [filterApproval, setFilterApproval] = useState<string>('all')
  const [shown, setShown] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      const okEmotion  = filterEmotion  === 'all' || q.emotion === filterEmotion
      const okApproval = filterApproval === 'all' || q.approval === Number(filterApproval)
      return okEmotion && okApproval
    })
  }, [quotes, filterEmotion, filterApproval])

  const visible   = filtered.slice(0, shown)
  const hasMore   = shown < filtered.length

  return (
    <Stack gap="lg">
      {/* Word cloud */}
      <QuoteWordCloud quotes={quotes} />

      {/* Filter bar */}
      <Group gap="sm" wrap="wrap" align="center">
        <Text size="sm" fw={500} c="var(--color-text-secondary)">Filter:</Text>

        {/* Emotion chips */}
        <Group gap={6}>
          {EMOTIONS.map((e) => {
            const active  = filterEmotion === e
            const color   = e === 'all' ? 'var(--color-text-secondary)' : emotionColor(e)
            return (
              <Badge
                key={e}
                size="sm"
                variant="light"
                component="button"
                aria-pressed={active}
                aria-label={`Filter by ${e === 'all' ? 'all emotions' : e}`}
                onClick={() => { setFilterEmotion(e); setShown(PAGE_SIZE) }}
                style={{
                  cursor: 'pointer',
                  backgroundColor: active ? `${color}20` : 'var(--color-bg-subtle)',
                  color: active ? color : 'var(--color-text-tertiary)',
                  border: `1px solid ${active ? color + '50' : 'var(--color-border-subtle)'}`,
                  textTransform: 'capitalize',
                  fontWeight: active ? 600 : 400,
                  transition: 'all 120ms',
                }}
              >
                {e === 'all' ? 'All emotions' : e}
              </Badge>
            )
          })}
        </Group>

        {/* Approval dropdown */}
        <Select
          data={Object.entries(APPROVAL_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          value={filterApproval}
          onChange={(v) => { setFilterApproval(v ?? 'all'); setShown(PAGE_SIZE) }}
          w={200}
          size="xs"
          styles={{
            input: {
              backgroundColor: 'var(--color-bg-subtle)',
              borderColor: 'var(--color-border-default)',
            },
          }}
        />

        {(filterEmotion !== 'all' || filterApproval !== 'all') && (
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            onClick={() => { setFilterEmotion('all'); setFilterApproval('all'); setShown(PAGE_SIZE) }}
          >
            Clear filters
          </Button>
        )}

        <Text size="xs" c="var(--color-text-tertiary)" ml="auto">
          {filtered.length} quote{filtered.length !== 1 ? 's' : ''}
        </Text>
      </Group>

      {/* Masonry grid */}
      {filtered.length === 0 ? (
        <Box style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text c="var(--color-text-tertiary)">No quotes match the current filters.</Text>
        </Box>
      ) : (
        <Box
          style={{
            columnCount: 2,
            columnGap: 16,
            // Fallback to single column on narrow viewports handled via CSS
          }}
        >
          {visible.map((quote) => (
            <Box key={quote.persona_id} style={{ marginBottom: 16 }}>
              <QuoteCard quote={quote} />
            </Box>
          ))}
        </Box>
      )}

      {/* Show more */}
      {hasMore && (
        <Group justify="center">
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            leftSection={<ChevronDown size={14} />}
            onClick={() => setShown((s) => s + PAGE_SIZE)}
          >
            Show more ({filtered.length - shown} remaining)
          </Button>
        </Group>
      )}
    </Stack>
  )
}
