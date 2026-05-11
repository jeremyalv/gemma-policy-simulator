/**
 * Simulations API endpoints
 * Contract ref: docs/contracts/frontend-backend-v1.md
 */

import { api } from '@/api/client'
import { generateIdempotencyKey } from '@/lib/idempotency'
import type { components } from '@/api/types.gen'

// ── Convenience type aliases from generated types ────────────────────────────
export type SimulationStatus   = components['schemas']['SimulationStatus']
export type RuntimeProfile     = components['schemas']['RuntimeProfile']
export type FilterSet          = components['schemas']['FilterSet']
export type SimulationDraft    = components['schemas']['SimulationDraft']
export type SimulationListItem = components['schemas']['SimulationListItem']
export type SimulationStatusData  = components['schemas']['SimulationStatusData']
export type RunTelemetry          = components['schemas']['RunTelemetry']
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
 * Uses api.getWithMeta so envelope.meta (total, page, limit) is accessible
 * alongside the response data — going through the same shared client as every
 * other endpoint (auth headers, error normalization, request logging all apply).
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

  const { data, meta } = await api.getWithMeta<SimulationListItem[]>(`/simulations${qs}`)

  return {
    items: data ?? [],
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
