/**
 * Formatting utilities for SIMS data.
 * All approval scores, dates, and percentages go through here.
 */

/**
 * Format approval score (1–5 scale) for display.
 * NEVER show as percentage — always "X.X / 5"
 */
export function formatApproval(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${value.toFixed(1)} / 5`
}

/**
 * Return CSS class for approval score coloring.
 */
export function approvalColorClass(score: number): string {
  if (score < 2) return 'approval-1'
  if (score < 3) return 'approval-2'
  if (score < 3.5) return 'approval-3'
  if (score < 4.5) return 'approval-4'
  return 'approval-5'
}

/**
 * Return hex color for approval score (for use in charts).
 */
export function approvalColor(score: number): string {
  if (score < 2)   return 'var(--color-data-approval-1)'
  if (score < 3)   return 'var(--color-data-approval-2)'
  if (score < 3.5) return 'var(--color-data-approval-3)'
  if (score < 4.5) return 'var(--color-data-approval-4)'
  return 'var(--color-data-approval-5)'
}

/**
 * Return CSS class for emotion.
 */
export type Emotion = 'anger' | 'concern' | 'neutral' | 'hope' | 'joy'

export function emotionColorClass(emotion: Emotion | string): string {
  return `emotion-${emotion}`
}

export function emotionColor(emotion: Emotion | string): string {
  const map: Record<string, string> = {
    anger:   'var(--color-data-emotion-anger)',
    concern: 'var(--color-data-emotion-concern)',
    neutral: 'var(--color-data-emotion-neutral)',
    hope:    'var(--color-data-emotion-hope)',
    joy:     'var(--color-data-emotion-joy)',
  }
  return map[emotion] ?? 'var(--color-text-tertiary)'
}

/**
 * Format percentage value.
 */
export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format ISO 8601 date string to readable form.
 */
export function formatDate(iso: string | null | undefined, locale = 'en-US'): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

/**
 * Format ISO 8601 datetime to relative form (e.g. "2 minutes ago").
 */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60)  return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return formatDate(iso)
}

/**
 * Format seconds into human-readable duration.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60)  return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

/**
 * Format large numbers with locale-aware thousands separators.
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}
