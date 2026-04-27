/**
 * Simulations API endpoints
 * Contract ref: docs/contracts/frontend-backend-v1.md
 */

import { api } from '@/api/client'
import { ApiError } from '@/lib/envelope'
import { generateIdempotencyKey } from '@/lib/idempotency'
import type { components } from '@/api/types.gen'

// ── Convenience type aliases from generated types ────────────────────────────
export type SimulationStatus   = components['schemas']['SimulationStatus']
export type RuntimeProfile     = components['schemas']['RuntimeProfile']
export type FilterSet          = components['schemas']['FilterSet']
export type SimulationDraft    = components['schemas']['SimulationDraft']
export type SimulationListItem = components['schemas']['SimulationListItem']
export type SimulationStatusData  = components['schemas']['SimulationStatusData']
export type SimulationResultsData = components['schemas']['SimulationResultsData']
export type RunAcceptedData    = components['schemas']['RunAcceptedData']
export type DeleteSimulationData = components['schemas']['DeleteSimulationData']

// ── Request types ────────────────────────────────────────────────────────────
export interface CreateSimulationParams {
  title: string
  policy_text: string
  dataset: string
  sample_size: number
  filters?: FilterSet
}

export interface RunSimulationParams {
  profile?: RuntimeProfile
  max_duration_seconds?: number
  allow_sample_clamp?: boolean
  use_refined_prompt?: boolean
}

export interface ListSimulationsParams {
  page?: number
  limit?: number
  status?: SimulationStatus
  sort?: string
}

export interface ListSimulationsResponse {
  items: SimulationListItem[]
  total: number
  page: number
  limit: number
}

// ── Endpoint functions ───────────────────────────────────────────────────────

/**
 * POST /simulations → 201
 * Create a simulation draft. Does NOT trigger inference.
 */
export async function createSimulation(
  params: CreateSimulationParams,
  idempotencyKey?: string,
): Promise<SimulationDraft> {
  return api.post<SimulationDraft>(
    '/simulations',
    params,
    { idempotencyKey: idempotencyKey ?? generateIdempotencyKey() },
  )
}

/**
 * GET /simulations → 200
 * List simulations with pagination and filtering.
 *
 * NOTE: Uses raw fetch() instead of the shared `api` client (apiFetch) because
 * it needs direct access to envelope.meta (total, page, limit) for pagination,
 * which apiFetch currently unwraps away. Consequences:
 *   - Bypasses any middleware added to apiFetch (auth injection, request logging, etc.)
 *   - Has its own error handling path — errors here throw differently from other endpoints
 *   - If apiFetch gains auth headers, this function silently omits them
 * TODO: refactor apiFetch to return { data, meta } instead of unwrapping to data only,
 * then migrate listSimulations to use the shared client like every other endpoint.
 */
export async function listSimulations(
  params: ListSimulationsParams = {},
): Promise<ListSimulationsResponse> {
  const query = new URLSearchParams()
  if (params.page)   query.set('page', String(params.page))
  if (params.limit)  query.set('limit', String(params.limit))
  if (params.status) query.set('status', params.status)
  if (params.sort)   query.set('sort', params.sort)

  const qs = query.toString() ? `?${query.toString()}` : ''

  // The backend wraps list in envelope; meta contains pagination
  // We need to return both data and meta — use apiFetch with raw access

  // Direct fetch (instead of apiFetch) so we can read envelope.meta for pagination.
  const url = `${(import.meta.env.VITE_API_BASE_URL ?? '') + '/api/v1'}/simulations${qs}`

  let response: Response
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch (err) {
    throw new ApiError('NETWORK_ERROR', `Network request failed: ${(err as Error).message}`, 0)
  }

  // Parse JSON — guard against empty bodies (e.g. 502/503 HTML pages, MSW not ready)
  let envelope: Record<string, unknown>
  try {
    envelope = await response.json() as Record<string, unknown>
  } catch {
    throw new ApiError(
      'PARSE_ERROR',
      `Server returned a non-JSON response (HTTP ${response.status}). Is the backend running?`,
      response.status,
    )
  }

  // Application-level error from envelope
  if (envelope.error) {
    const errorBody = envelope.error as { code: string; message: string }
    throw new ApiError(errorBody.code ?? 'API_ERROR', errorBody.message ?? 'Unknown error', response.status)
  }

  // HTTP-level error with no envelope.error field
  if (!response.ok) {
    throw new ApiError('HTTP_ERROR', `Unexpected HTTP ${response.status}`, response.status)
  }

  const meta = (envelope.meta ?? {}) as Record<string, number>
  return {
    items: (envelope.data as SimulationListItem[]) ?? [],
    total: meta.total ?? 0,
    page:  meta.page  ?? 1,
    limit: meta.limit ?? 20,
  }
}

/**
 * DELETE /simulations/{id} → 200
 */
export async function deleteSimulation(id: string): Promise<DeleteSimulationData> {
  return api.delete<DeleteSimulationData>(`/simulations/${id}`)
}

/**
 * POST /simulations/{id}/run → 202
 * Trigger async inference. Non-blocking.
 */
export async function runSimulation(
  id: string,
  params: RunSimulationParams = {},
  idempotencyKey?: string,
): Promise<RunAcceptedData> {
  return api.post<RunAcceptedData>(
    `/simulations/${id}/run`,
    Object.keys(params).length > 0 ? params : undefined,
    { idempotencyKey: idempotencyKey ?? generateIdempotencyKey() },
  )
}

/**
 * GET /simulations/{id}/status → 200
 * Poll progress. Call every 2–3 seconds while status = "running".
 */
export async function getSimulationStatus(id: string): Promise<SimulationStatusData> {
  return api.get<SimulationStatusData>(`/simulations/${id}/status`)
}

/**
 * GET /simulations/{id}/results → 200
 * Only valid when status = "completed".
 */
export async function getSimulationResults(id: string): Promise<SimulationResultsData> {
  return api.get<SimulationResultsData>(`/simulations/${id}/results`)
}
