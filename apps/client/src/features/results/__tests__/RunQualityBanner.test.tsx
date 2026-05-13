/**
 * Tests for RunQualityBanner.
 *
 * Covers:
 *   - Banner visible when is_partial=true (partial run)
 *   - Banner hidden when is_partial=false (full-quality run)
 *   - Banner shows success rate and counts
 *   - Banner can be dismissed
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { RunQualityBanner, type RunTelemetry } from '../RunQualityBanner'

// ── helpers ──────────────────────────────────────────────────────────────────

/** Wrap with MantineProvider — required for any Mantine component. */
function renderBanner(telemetry: RunTelemetry) {
  return render(
    <MantineProvider>
      <RunQualityBanner telemetry={telemetry} />
    </MantineProvider>,
  )
}

function makeTelemetry(overrides: Partial<RunTelemetry> = {}): RunTelemetry {
  return {
    retry_count:          0,
    invalid_output_count: 0,
    failure_code:         null,
    failure_message:      null,
    failed_persona_id:    null,
    attempted_count:      100,
    success_count:        100,
    failed_count:         0,
    success_rate:         1.0,
    is_partial:           false,
    failure_breakdown:    {},
    ...overrides,
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('RunQualityBanner', () => {
  it('renders nothing when is_partial is false', () => {
    const { container } = renderBanner(makeTelemetry({ is_partial: false }))
    expect(screen.queryByTestId('run-quality-banner')).not.toBeInTheDocument()
    // Only the MantineProvider wrapper div — banner itself should be absent
    expect(container.querySelector('[data-testid="run-quality-banner"]')).toBeNull()
  })

  it('renders the banner when is_partial is true', () => {
    renderBanner(makeTelemetry({ is_partial: true, success_rate: 0.92, failed_count: 8 }))
    expect(screen.getByTestId('run-quality-banner')).toBeInTheDocument()
    expect(screen.getByText(/Partial-quality results/i)).toBeInTheDocument()
  })

  it('shows the success percentage', () => {
    renderBanner(makeTelemetry({ is_partial: true, success_rate: 0.87 }))
    expect(screen.getByText(/87%/)).toBeInTheDocument()
  })

  it('shows failed and retry counts when present', () => {
    renderBanner(
      makeTelemetry({
        is_partial:   true,
        success_rate: 0.9,
        failed_count: 10,
        retry_count:  3,
      }),
    )
    expect(screen.getByText(/10 failed/)).toBeInTheDocument()
    expect(screen.getByText(/3 retried/)).toBeInTheDocument()
  })

  it('dismisses the banner when the X button is clicked', () => {
    renderBanner(makeTelemetry({ is_partial: true, success_rate: 0.8 }))

    // Banner initially visible
    expect(screen.getByTestId('run-quality-banner')).toBeInTheDocument()

    // Click dismiss
    fireEvent.click(screen.getByRole('button', { name: /dismiss quality warning/i }))

    // Banner gone
    expect(screen.queryByTestId('run-quality-banner')).not.toBeInTheDocument()
  })

  it('does not show failed/retry counts when both are zero', () => {
    renderBanner(
      makeTelemetry({
        is_partial:   true,
        success_rate: 0.95,
        failed_count: 0,
        retry_count:  0,
      }),
    )
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/retried/i)).not.toBeInTheDocument()
  })
})
