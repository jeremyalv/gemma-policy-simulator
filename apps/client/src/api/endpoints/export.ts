/**
 * Export API endpoint
 * Contract ref: docs/contracts/frontend-backend-v1.md — "Export"
 *
 * IMPORTANT: This endpoint returns text/csv, NOT a JSON envelope.
 * It is the ONLY endpoint that does not use the { data, error, meta } envelope.
 * Handle with window.open() or a download <a> tag — do NOT call .json() on it.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/v1'

/**
 * Trigger CSV download in the browser.
 * Opens the export URL in a new tab — browser handles the download.
 */
export function downloadSimulationCsv(simulationId: string): void {
  const url = `${API_BASE}/simulations/${simulationId}/export`
  const a = document.createElement('a')
  a.href = url
  a.download = `infinipol-${simulationId}-results.csv`
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Get the raw export URL (useful for <a href> links).
 */
export function getExportUrl(simulationId: string): string {
  return `${API_BASE}/simulations/${simulationId}/export`
}
