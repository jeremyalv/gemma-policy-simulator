/**
 * useSimulationResults -- TanStack Query for GET /simulations/:id/results
 * Only valid when simulation status === 'completed'.
 *
 * Error handling per lifecycle contract:
 *   409 -> simulation is still running or failed (LIFECYCLE_CONFLICT)
 *   404 -> simulation not found (NOT_FOUND)
 *   other -> generic error
 */

import { useQuery } from '@tanstack/react-query'
import { getSimulationResults, type SimulationResultsData } from '@/api'
import { ApiError } from '@/lib/envelope'

export const resultsQueryKey = (id: string) => ['simulation-results', id] as const

/** Classified error type for lifecycle-gated result states. */
export type ResultsErrorKind = 'lifecycle_conflict' | 'not_found' | 'other'

export function classifyResultsError(error: unknown): ResultsErrorKind {
  if (error instanceof ApiError) {
    if (error.httpStatus === 409) return 'lifecycle_conflict'
    if (error.httpStatus === 404) return 'not_found'
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
