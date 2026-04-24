/**
 * useSimulations — TanStack Query hook for GET /simulations
 *
 * Returns the full list (up to 20 per page, V1) plus derived helpers.
 * Refetches automatically when window is re-focused.
 */

import { useQuery } from '@tanstack/react-query'
import { listSimulations, type SimulationListItem } from '@/api'

export const SIMULATIONS_QUERY_KEY = ['simulations'] as const

export function useSimulations() {
  const query = useQuery({
    queryKey: SIMULATIONS_QUERY_KEY,
    queryFn: () => listSimulations({ page: 1, limit: 50 }),
    staleTime: 15_000,
  })

  return {
    simulations: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export type { SimulationListItem }
