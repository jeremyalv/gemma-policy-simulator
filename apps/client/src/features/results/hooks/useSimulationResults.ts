/**
 * useSimulationResults -- TanStack Query for GET /simulations/:id/results
 * Only valid when simulation status === 'completed'.
 *
 * Error handling per lifecycle contract:
 *   409 + code=SIMULATION_FAILED    -> simulation failed; user must retry from status page
 *   409 + other code (NOT_COMPLETE) -> simulation is still running or pending
 *   404                             -> simulation not found (NOT_FOUND)
 *   other                           -> generic error
 */

import { useQuery } from '@tanstack/react-query'
import { getSimulationResults, type SimulationResultsData } from '@/api'
import { ApiError } from '@/lib/envelope'

export const resultsQueryKey = (id: string) => ['simulation-results', id] as const

/**
 * Classified error kinds for lifecycle-gated result states.
 *
 * - simulation_failed: 409 + SIMULATION_FAILED — run errored; must retry from status page
 * - lifecycle_conflict: 409 + other — still running or not yet started
 * - not_found: 404 — simulation deleted or never existed
 * - other: generic network / server error
 */
export type ResultsErrorKind =
  | 'simulation_failed'
  | 'lifecycle_conflict'
  | 'not_found'
  | 'other'

export function classifyResultsError(error: unknown): ResultsErrorKind {
  if (error instanceof ApiError) {
    if (error.httpStatus === 404) return 'not_found'
    if (error.httpStatus === 409) {
      return error.code === 'SIMULATION_FAILED'
        ? 'simulation_failed'
        : 'lifecycle_conflict'
    }
  }
  return 'other'
}

export function useSimulationResults(simulationId: string) {
  const query = useQuery<SimulationResultsData>({
    queryKey: resultsQueryKey(simulationId),
    queryFn:  () => getSimulationResults(simulationId),
    staleTime: 5 * 60_000, // results are immutable -- cache 5 min
    refetchOnWindowFocus: false,
    // Do not auto-retry lifecycle or not-found errors -- they need user action
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.httpStatus === 409 || error.httpStatus === 404)) {
        return false
      }
      return failureCount < 2
    },
  })

  return {
    results:   query.data ?? null,
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
    errorKind: query.isError ? classifyResultsError(query.error) : null,
  }
}
