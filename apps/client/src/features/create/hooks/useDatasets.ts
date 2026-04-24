/**
 * useDatasets — TanStack Query hook for GET /datasets
 * Returns list of available synthetic persona datasets.
 */

import { useQuery } from '@tanstack/react-query'
import { listDatasets, type DatasetItem } from '@/api'

export const DATASETS_QUERY_KEY = ['datasets'] as const

export function useDatasets() {
  const query = useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: listDatasets,
    staleTime: 5 * 60_000, // datasets rarely change
  })

  return {
    datasets: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

export type { DatasetItem }
