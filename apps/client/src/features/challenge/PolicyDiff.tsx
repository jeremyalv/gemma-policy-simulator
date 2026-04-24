/**
 * PolicyDiff — shows diff between original policy_text and suggested refinement.
 * Uses diff-match-patch to compute word-level diffs.
 * Deletions shown in red strikethrough, insertions in green.
 */

import { useMemo } from 'react'
import { Box } from '@mantine/core'
import diff_match_patch from 'diff-match-patch'

type Diff = diff_match_patch.Diff

const DIFF_DELETE = -1
const DIFF_INSERT = 1
const DIFF_EQUAL  = 0

interface PolicyDiffProps {
  original: string
  revised:  string
}

export function PolicyDiff({ original, revised }: PolicyDiffProps) {
  const diffs: Diff[] = useMemo(() => {
    const dmp    = new diff_match_patch()
    const result = dmp.diff_main(original, revised)
    dmp.diff_cleanupSemantic(result)
    return result
  }, [original, revised])

  return (
    <Box
      style={{
        backgroundColor: 'var(--color-bg-subtle)',
        borderRadius: 8,
        padding: '14px 16px',
        fontFamily: 'IBM Plex Sans, sans-serif',
        fontSize: 13,
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        overflowY: 'auto',
        maxHeight: 280,
      }}
    >
      {diffs.map(([op, text], i) => {
        if (op === DIFF_EQUAL) {
          return (
            <span key={i} style={{ color: 'var(--color-text-secondary)' }}>
              {text}
            </span>
          )
        }
        if (op === DIFF_DELETE) {
          return (
            <span
              key={i}
              style={{
                color: 'var(--color-status-error)',
                textDecoration: 'line-through',
                backgroundColor: '#FEE2E2',
                borderRadius: 2,
                padding: '0 2px',
              }}
            >
              {text}
            </span>
          )
        }
        if (op === DIFF_INSERT) {
          return (
            <span
              key={i}
              style={{
                color: 'var(--color-status-success)',
                backgroundColor: '#DCFCE7',
                borderRadius: 2,
                padding: '0 2px',
                fontWeight: 600,
              }}
            >
              {text}
            </span>
          )
        }
        return null
      })}
    </Box>
  )
}
