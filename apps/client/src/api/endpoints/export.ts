/**
 * Export API endpoint
 * Contract ref: docs/contracts/frontend-backend-v1.md -- "Export"
 *
 * IMPORTANT: This endpoint returns text/csv, NOT a JSON envelope.
 * It is the ONLY endpoint that does not use the { data, error, meta } envelope.
 * Handle with window.open() or a download <a> tag -- do NOT call .json() on it.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/v1'

/**
 * Fetch the CSV export and trigger a browser download.
 *
 * Unlike a plain <a href> approach, this lets us inspect the HTTP status
 * before initiating the download, enabling proper error feedback for
 * lifecycle-gated 409 and 404 responses.
 *
 * Throws ApiError on non-OK responses so the caller can show a toast.
 */
export async function fetchSimulationCsv(simulationId: string): Promise<void> {
  const url = `${API_BASE}/simulations/${simulationId}/export`

  let response: Response
  try {
    response = await fetch(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Lazy import to avoid circular deps with the main api client
    const { ApiError } = await import('@/lib/envelope')
    throw new ApiError('NETWORK_ERROR', `Export request failed: ${msg}`, 0)
  }

  if (!response.ok) {
    const { ApiError } = await import('@/lib/envelope')
    let code = 'EXPORT_ERROR'
    let message = `Export failed: HTTP ${response.status}`
    try {
      const body = await response.json() as { error?: { code?: string; message?: string } }
      if (body.error) {
        code    = body.error.code    ?? code
        message = body.error.message ?? message
      }
    } catch {
      // Body was not JSON -- use the status-based message above
    }
    throw new ApiError(code, message, response.status)
  }

  // Trigger browser download from blob
  const blob   = await response.blob()
  const objUrl = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href       = objUrl
  a.download   = `infinipol-${simulationId}-results.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after a tick so the download can start
  setTimeout(() => URL.revokeObjectURL(objUrl), 1000)
}
