/**
 * useSimulationResults — TanStack Query for GET /simulations/:id/results
 * Only valid when simulation status === 'completed'.
 */

import { useQuery } from '@tanstack/react-query'
import { getSimulationResults, type SimulationResultsData } from '@/api'

export const resultsQueryKey = (id: string) => ['simulation-results', id] as const

export function useSimulationResults(simulationId: string) {
  const query = useQuery<SimulationResultsData>({
    queryKey: resultsQueryKey(simulationId),
    queryFn:  () => getSimulationResults(simulationId),
    staleTime: 5 * 60_000, // results are immutable — cache 5 min
    refetchOnWindowFocus: false,
  })

  return {
    results:   query.data ?? null,
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
  }
}
